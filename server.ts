import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Uploads directory configuration for storing files (PDFs, docs, homework materials)
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Firestore for persistent media storage and auto-recovery across container restarts
let dbFirestore: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const fbApp = !getApps().length
      ? initializeApp({
          apiKey: fbConfig.apiKey,
          authDomain: fbConfig.authDomain,
          projectId: fbConfig.projectId,
          storageBucket: fbConfig.storageBucket,
          messagingSenderId: fbConfig.messagingSenderId,
          appId: fbConfig.appId,
        })
      : getApps()[0];

    dbFirestore = initializeFirestore(
      fbApp,
      {
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      fbConfig.firestoreDatabaseId || "(default)"
    );
    console.log("[Storage] Firestore initialized for permanent media backup.");
  }
} catch (fbInitErr) {
  console.warn("[Storage] Could not initialize Firestore for backup:", fbInitErr);
}

// Helper to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp3": "audio/mp3",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return map[ext] || "application/octet-stream";
}

// Stream local file with HTTP 206 Partial Content (Range header) for audio seeking and fast playback
function serveLocalFile(filePath: string, req: express.Request, res: express.Response) {
  try {
    const stat = fs.statSync(filePath);
    const total = stat.size;
    const contentType = getMimeType(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const partialStart = parts[0];
      const partialEnd = parts[1];

      const start = parseInt(partialStart, 10);
      const end = partialEnd ? parseInt(partialEnd, 10) : total - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      });

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": total,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error("Error serving local file:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Ошибка отдачи файла" });
    }
  }
}

// Persist uploaded file to Firestore (single doc or chunked if > 700KB)
async function persistFileToFirestore(uniqueFileName: string, originalName: string, base64Data: string, bufferLength: number) {
  if (!dbFirestore) return;
  try {
    const sanitizedId = uniqueFileName.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const mimeType = getMimeType(uniqueFileName);
    const CHUNK_SIZE = 500000; // ~375 KB chunk

    if (base64Data.length <= CHUNK_SIZE) {
      // Single document
      await setDoc(doc(dbFirestore, "uploaded_files", sanitizedId), {
        fileName: uniqueFileName,
        originalName,
        mimeType,
        sizeBytes: bufferLength,
        isChunked: false,
        base64: base64Data,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Chunked documents
      const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
      await setDoc(doc(dbFirestore, "uploaded_files", sanitizedId), {
        fileName: uniqueFileName,
        originalName,
        mimeType,
        sizeBytes: bufferLength,
        isChunked: true,
        totalChunks,
        createdAt: new Date().toISOString(),
      });

      const chunkPromises = [];
      for (let i = 0; i < totalChunks; i++) {
        const slice = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        chunkPromises.push(
          setDoc(doc(dbFirestore, "uploaded_files", `${sanitizedId}_chk_${i}`), {
            chunkIndex: i,
            data: slice,
          })
        );
      }
      await Promise.all(chunkPromises);
    }
    console.log(`[Storage] Persisted ${uniqueFileName} (${bufferLength} bytes) to Firestore successfully.`);
  } catch (persistErr) {
    console.warn(`[Storage] Failed to persist ${uniqueFileName} to Firestore:`, persistErr);
  }
}

// Auto-recover file from Firestore if missing from disk
async function recoverFileFromFirestore(uniqueFileName: string, targetPath: string): Promise<boolean> {
  if (!dbFirestore) return false;
  try {
    const sanitizedId = uniqueFileName.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const docSnap = await getDoc(doc(dbFirestore, "uploaded_files", sanitizedId));
    if (!docSnap.exists()) {
      return false;
    }

    const fileData = docSnap.data();
    let fullBase64 = "";

    if (fileData.isChunked && fileData.totalChunks) {
      const chunkPromises = [];
      for (let i = 0; i < fileData.totalChunks; i++) {
        chunkPromises.push(getDoc(doc(dbFirestore, "uploaded_files", `${sanitizedId}_chk_${i}`)));
      }
      const chunkDocs = await Promise.all(chunkPromises);
      fullBase64 = chunkDocs.map((c) => (c.exists() ? c.data().data : "")).join("");
    } else {
      fullBase64 = fileData.base64 || "";
    }

    if (!fullBase64) return false;

    const buffer = Buffer.from(fullBase64, "base64");
    await fs.promises.writeFile(targetPath, buffer);
    console.log(`[Auto-Recovery] Successfully restored missing file ${uniqueFileName} (${buffer.length} bytes) from Firestore to disk!`);
    return true;
  } catch (recErr) {
    console.warn(`[Auto-Recovery] Error recovering ${uniqueFileName} from Firestore:`, recErr);
    return false;
  }
}

// Pre-warm local uploads cache from Firestore on boot
async function restoreAllFilesOnBoot() {
  if (!dbFirestore) return;
  try {
    const snap = await getDocs(collection(dbFirestore, "uploaded_files"));
    for (const docSnap of snap.docs) {
      if (docSnap.id.includes("_chk_")) continue;
      const data = docSnap.data();
      const fileName = data.fileName;
      if (!fileName) continue;
      const filePath = path.join(uploadsDir, fileName);
      if (!fs.existsSync(filePath)) {
        await recoverFileFromFirestore(fileName, filePath);
      }
    }
    console.log("[Storage] Pre-warmed uploads cache from Firestore.");
  } catch (e) {
    console.warn("[Storage] Pre-warm uploads error:", e);
  }
}

// Serve uploaded files with auto-recovery from Firestore & audio Range streaming
app.get("/uploads/:fileName", async (req, res, next) => {
  const fileName = decodeURIComponent(req.params.fileName);
  const filePath = path.join(uploadsDir, fileName);

  if (fs.existsSync(filePath)) {
    return serveLocalFile(filePath, req, res);
  }

  // Attempt auto-recovery from Firestore
  const recovered = await recoverFileFromFirestore(fileName, filePath);
  if (recovered && fs.existsSync(filePath)) {
    return serveLocalFile(filePath, req, res);
  }

  // File not found in uploads nor Firestore - return 404 JSON (NOT HTML fallback)
  return res.status(404).json({ error: "File not found", fileName });
});

// File Upload Endpoint: Saves locally AND permanently into Firestore
app.post("/api/upload-file", async (req, res) => {
  try {
    const { fileName, base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ success: false, error: "Нет данных файла" });
    }

    const safeName = (fileName || "material.pdf").replace(/[^a-zA-Z0-9._\-а-яА-ЯёЁ]/g, "_");
    const ext = path.extname(safeName) || ".bin";
    const baseWithoutExt = path.basename(safeName, ext);
    const uniqueFileName = `${Date.now()}_${baseWithoutExt.slice(0, 40)}${ext}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    const base64Data = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
    const buffer = Buffer.from(base64Data, "base64");

    let finalBuffer = buffer;
    let finalBase64 = base64Data;

    // 1. Write to local disk cache
    await fs.promises.writeFile(filePath, finalBuffer);

    // If webm audio, fix missing Duration metadata via ffmpeg remux
    if (ext.toLowerCase() === ".webm") {
      try {
        const tmpPath = `${filePath}_fixed.webm`;
        const { execSync } = await import("child_process");
        execSync(`ffmpeg -y -i "${filePath}" -c copy "${tmpPath}" 2>/dev/null`);
        if (fs.existsSync(tmpPath)) {
          finalBuffer = await fs.promises.readFile(tmpPath);
          await fs.promises.writeFile(filePath, finalBuffer);
          fs.unlinkSync(tmpPath);
          finalBase64 = finalBuffer.toString("base64");
          console.log(`[Upload] Remuxed webm audio ${uniqueFileName} with proper duration metadata.`);
        }
      } catch (remuxErr) {
        console.warn("[Upload] Could not remux webm file:", remuxErr);
      }
    }

    // 2. Persist to Firestore for 100% durability across restarts
    persistFileToFirestore(uniqueFileName, fileName || uniqueFileName, finalBase64, finalBuffer.length);

    const publicUrl = `/uploads/${encodeURIComponent(uniqueFileName)}`;
    return res.json({
      success: true,
      url: publicUrl,
      fileName: fileName || uniqueFileName,
      sizeBytes: finalBuffer.length,
      size: (finalBuffer.length / (1024 * 1024)).toFixed(1) + " МБ",
    });
  } catch (err: any) {
    console.error("Upload file error:", err);
    return res.status(500).json({ success: false, error: "Ошибка сохранения файла", details: err.message });
  }
});

// Explicit download endpoint with auto-recovery
app.get("/api/download/:fileName", async (req, res) => {
  const decodedFileName = decodeURIComponent(req.params.fileName);
  const filePath = path.join(uploadsDir, decodedFileName);

  if (!fs.existsSync(filePath)) {
    await recoverFileFromFirestore(decodedFileName, filePath);
  }

  if (fs.existsSync(filePath)) {
    const downloadName = (req.query.name as string) || decodedFileName;
    res.download(filePath, downloadName);
  } else {
    res.status(404).json({ error: "Файл не найден" });
  }
});

// Initialize Gemini client server-side lazily / safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// PIN Verification Endpoint for Admin
app.post("/api/verify-pin", (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN || "qwerty12345";
  if (pin && pin === adminPin) {
    return res.json({ success: true });
  }
  return res.json({ success: false, error: "Неверный ПИН-код" });
});

// AI Essay Pre-check endpoint for students
app.post("/api/ai-essay-review", async (req, res) => {
  try {
    const { topic, essayText } = req.body;
    if (!essayText) {
      return res.status(400).json({ error: "Текст эссе не предоставлен" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        aiGenerated: false,
        feedback: "ИИ готов к работе при наличии GEMINI_API_KEY. Работа отправлена Ангелине на личную проверку!",
      });
    }

    const prompt = `Ты — опытный эксперт ЕГЭ по английскому/русскому языку на платформе «Делай и Точка».
Проведи быстрый предварительный экспресс-анализ письменной работы ученика перед финальной проверкой преподавателем Ангелиной.

Тема/Задание: "${topic || "Эссе/Письмо ФИПИ"}"
Текст работы ученика:
"""
${essayText}
"""

Дай конструктивную, подбадривающую обратную связь по 3 пунктам на русском языке:
1. Сильные стороны работы (2-3 пункта)
2. На что обратить внимание (структура, вводные слова, грамматика/лексика)
3. Ориентировочный предварительный прогноз балла (из 14 баллов) с отметкой, что окончательный вердикт вынесет Ангелина.

Форматируй ответ понятно и доброжелательно, используй эмодзи.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      aiGenerated: true,
      feedback: response.text || "Предварительная ИИ-проверка завершена.",
    });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Ошибка при вызове ИИ-проверки", details: err.message });
  }
});

// AI Assistant for Angelina (Teacher) to draft criteria comments
app.post("/api/ai-teacher-assistant", async (req, res) => {
  try {
    const { hwTitle, studentSubmission, criteriaScores } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        aiGenerated: false,
        suggestedComment: "Отличная работа! Все критерии ФИПИ учтены. Продолжай в том же духе!",
      });
    }

    const prompt = `Ты — ассистент преподавателя Ангелины в онлайн-школе «Делай и Точка».
Сформируй профессиональный, вежливый и детальный разбор работы ученика для отправки в Telegram Mini App.

Задание: "${hwTitle}"
Работа ученика: "${studentSubmission || "Письменный текст / Голосовой ответ"}"
Баллы по критериям: ${JSON.stringify(criteriaScores || { K1: 3, K2: 3, K3: 2, K4: 2 })}

Напиши персональный комментарий от лица Ангелины:
- Похвали за успехи
- Точечно укажи на ошибки (если есть)
- Дай конкретный совет по улучшению к следующему уроку.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      aiGenerated: true,
      suggestedComment: response.text || "Черновик комментария сформирован.",
    });
  } catch (err: any) {
    console.error("Gemini Assistant Error:", err);
    res.status(500).json({ error: "Ошибка формирования ответа ИИ", details: err.message });
  }
});

// Helper to extract duration and raw HTML from YouTube
async function getYouTubeDuration(url: string): Promise<{ durationStr: string; totalSeconds: number; html: string } | null> {
  if (!url || !url.includes('youtu')) return null;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      }
    });
    const html = await response.text();
    const match = html.match(/"lengthSeconds":"(\d+)"/);
    if (match && match[1]) {
      const totalSeconds = parseInt(match[1], 10);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const durationStr = h > 0 
        ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
        : `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      return { durationStr, totalSeconds, html };
    }
    return { durationStr: '', totalSeconds: 0, html };
  } catch {
    return null;
  }
}

// YouTube duration info parser
app.post("/api/yt-info", async (req, res) => {
  try {
    const { url } = req.body;
    const info = await getYouTubeDuration(url);
    if (info && info.durationStr) {
      return res.json({ success: true, duration: info.durationStr, seconds: info.totalSeconds });
    }
    res.json({ success: false });
  } catch (err) {
    res.json({ success: false });
  }
});

// AI Timecodes generator endpoint (Smart YouTube Subtitles & Duration Parsing with Browser Spoofing)
app.post("/api/ai-timecodes", async (req, res) => {
  try {
    const { title, description, duration, videoUrl } = req.body;
    const videoTitle = title || "Без названия";
    const videoDesc = description || "";
    const videoDuration = duration || "45:00";

    let transcriptContext = "";
    let exactDuration = "";

    // 1. Попытка вытянуть данные напрямую с YouTube
    if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
      try {
        const ytData = await getYouTubeDuration(videoUrl);
        if (ytData) {
          if (ytData.durationStr) {
            exactDuration = ytData.durationStr;
          }
          const html = ytData.html;
          // Ищем скрытый JSON с треками субтитров
          const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
          if (captionMatch) {
            const tracks = JSON.parse(captionMatch[1]);
            // Ищем русскую дорожку (автоматическую или загруженную)
            const track = tracks.find((t: any) => t.languageCode === 'ru' || t.vssId === 'a.ru') || tracks[0];
            
            if (track && track.baseUrl) {
              const xmlRes = await fetch(track.baseUrl);
              const xml = await xmlRes.text();
              
              const regex = /<text start="([\d.]+)"[^>]*>(.*?)<\/text>/g;
              let match;
              let lines = [];
              while ((match = regex.exec(xml)) !== null) {
                const startSeconds = parseFloat(match[1]);
                const mm = Math.floor(startSeconds / 60).toString().padStart(2, '0');
                const ss = Math.floor(startSeconds % 60).toString().padStart(2, '0');
                const text = match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                lines.push(`[${mm}:${ss}] ${text}`);
              }
              // Увеличили объем забираемого текста для часовых вебинаров
              transcriptContext = lines.join(' ').substring(0, 70000);
            }
          }
        }
      } catch (e) {
        console.error("Ошибка при получении данных YouTube:", e);
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        exactDuration,
        timecodes: [
          { timeStr: "00:00", label: `Введение: ${videoTitle}` },
          { timeStr: "05:00", label: "Начало лекции" },
        ]
      });
    }

    let prompt = `Сгенерируй таймкоды для образовательного видео.
Название: "${videoTitle}".
Описание: "${videoDesc}".`;

    if (transcriptContext) {
      prompt += `\n\nВот точная расшифровка слов спикера с таймингами (по секундам):\n${transcriptContext}\n\nЗАДАЧА: На основе этого ТОЧНОГО текста спикера, выдели 5-8 логических глав.
СТРОГИЕ ПРАВИЛА:
1. Укажи ТОЧНОЕ время начала каждой главы из предоставленных субтитров.
2. НЕ выдумывай темы (например, не пиши "Проверка ДЗ", если этого нет в тексте). Опирайся ТОЛЬКО на то, о чем реально говорит спикер.
3. Названия глав должны быть короткими, емкими и отражать суть отрезка.`;
    } else {
      prompt += `\nДлительность: ${videoDuration}.\n\nЗАДАЧА: Разбей видео на 5-8 логических частей. (Субтитры недоступны, сделай логичное предположение на основе названия).`;
    }

    prompt += `\nВерни ТОЛЬКО валидный JSON массив объектов (без маркдауна, без блоков \`\`\`json).
Формат: [{"timeStr": "MM:SS", "label": "Название главы"}].
Первый таймкод всегда должен быть "00:00".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "";
    try {
      const parsed = JSON.parse(rawText);
      return res.json({
        timecodes: parsed,
        exactDuration: exactDuration
      });
    } catch (parseErr) {
      console.error("JSON parse error from Gemini response:", rawText);
      return res.status(500).json({ error: "Ошибка парсинга JSON" });
    }

  } catch (err: any) {
    console.error("AI Timecodes Error:", err);
    res.status(500).json({ error: "Ошибка сервера", details: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    restoreAllFilesOnBoot();
  });
}

startServer();
