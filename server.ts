import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

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

// YouTube duration info parser
app.post("/api/yt-info", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('youtu')) return res.json({ success: false });
    const response = await fetch(url);
    const html = await response.text();
    const match = html.match(/"lengthSeconds":"(\d+)"/);
    if (match && match[1]) {
      const totalSeconds = parseInt(match[1], 10);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      let durationStr = h > 0 
        ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
        : `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      return res.json({ success: true, duration: durationStr, seconds: totalSeconds });
    }
    res.json({ success: false });
  } catch (err) {
    res.json({ success: false });
  }
});

// AI Timecodes generator endpoint
app.post("/api/ai-timecodes", async (req, res) => {
  try {
    const { title, description, duration } = req.body;
    const videoTitle = title || "Обучающее видео";
    const videoDesc = description || "Разбор темы урока";
    const videoDuration = duration || "45:00";

    const ai = getGeminiClient();
    if (!ai) {
      return res.json([
        { timeStr: "00:00", label: `🎬 Введение и план урока: ${videoTitle}` },
        { timeStr: "05:00", label: "📖 Разбор теории и критериев ФИПИ" },
        { timeStr: "15:00", label: "💡 Ключевые правила, структуры и шаблоны" },
        { timeStr: "25:00", label: "✍️ Практическое задание и разбор примера" },
        { timeStr: "38:00", label: "🚀 Лайфхаки для максимального балла на экзамене" },
        { timeStr: "43:00", label: "❓ Итоги урока и домашнее задание" },
      ]);
    }

    const prompt = `Ты методист образовательной платформы. У нас есть урок длительностью ${videoDuration}. Название видео: "${videoTitle}". Тезисный план урока: "${videoDesc}". Твоя задача: разбить этот план на 5-8 логичных таймкодов, равномерно распределив их по времени видео от 00:00 до конца. Верни СТРОГО массив JSON без markdown-разметки: [{"timeStr": "MM:SS", "label": "Название темы"}]. Первый таймкод строго 00:00.`;

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
      return res.json(parsed);
    } catch (parseErr) {
      console.error("JSON parse error from Gemini response:", rawText);
      return res.status(500).json({ error: "Ошибка парсинга" });
    }
  } catch (err: any) {
    console.error("AI Timecodes Error:", err);
    res.status(500).json({ error: "Ошибка генерации таймкодов", details: err.message });
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
  });
}

startServer();
