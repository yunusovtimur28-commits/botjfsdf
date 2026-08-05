import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8861478620:AAGa98oVaswBGv2u5DuwMIeyONdbCtEF2LQ';
const BOT_USERNAME = 'Delayschool_bot';
const MINI_APP_SHORT_NAME = 'delaylk';

let bot: TelegramBot | null = null;
let botStatus: {
  online: boolean;
  username: string;
  appUrl: string;
  lastError: string | null;
  commandsCount: number;
} = {
  online: false,
  username: BOT_USERNAME,
  appUrl: process.env.APP_URL || '',
  lastError: null,
  commandsCount: 0,
};

// Function to initialize Telegram Bot safely
function initTelegramBot() {
  try {
    if (!BOT_TOKEN) {
      console.warn('Telegram Bot Token missing.');
      return;
    }

    bot = new TelegramBot(BOT_TOKEN, { polling: true });

    bot.on('polling_error', (err) => {
      console.error('Telegram Bot Polling Error:', err.message);
      botStatus.lastError = err.message;
    });

    bot.onText(/\/start|\/lk|\/app|\/help/, async (msg) => {
      botStatus.commandsCount++;
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Ученик';
      const currentAppUrl = process.env.APP_URL || `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`;

      const welcomeMessage = `👋 *Привет, ${firstName}!*

Добро пожаловать в *Школу Делай*! 🎓

В твоём личном кабинете доступно:
• 📅 *Расписание и уроки* — видео, материалы, онлайн-встречи
• 📝 *Домашние задания* — отправка решений и помощь ИИ
• 🤖 *ИИ-Тьютор «Делай»* — ответит на любые вопросы по учёбе
• 🪙 *Магазин наград* — зарабатывай Delay Coins за успехи!

Жми кнопку ниже, чтобы открыть Личный Кабинет 👇`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть Личный Кабинет',
              web_app: { url: currentAppUrl },
            },
          ],
          [
            {
              text: '🌐 Открыть в Telegram Web',
              url: `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`,
            },
          ],
        ],
      };

      try {
        await bot?.sendMessage(chatId, welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (e: any) {
        console.error('Error sending message:', e.message);
      }
    });

    botStatus.online = true;
    console.log(`Telegram Bot @${BOT_USERNAME} initialized successfully!`);

    // Configure Chat Menu Button if APP_URL is present
    updateBotMenuButton();
  } catch (error: any) {
    console.error('Failed to init Telegram Bot:', error.message);
    botStatus.lastError = error.message;
  }
}

async function updateBotMenuButton() {
  const targetUrl = process.env.APP_URL || '';
  if (!BOT_TOKEN || !targetUrl) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Личный Кабинет',
          web_app: { url: targetUrl },
        },
      }),
    });
    const data = await res.json();
    if (data.ok) {
      console.log('Telegram Bot Menu Button successfully updated to WebApp:', targetUrl);
      botStatus.appUrl = targetUrl;
    } else {
      console.warn('Telegram setChatMenuButton response:', data);
    }
  } catch (err: any) {
    console.error('Error updating menu button:', err.message);
  }
}

// Trigger initial bot setup
initTelegramBot();

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/bot-info', (req, res) => {
  const currentAppUrl = process.env.APP_URL || `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`;
  res.json({
    ...botStatus,
    botUsername: BOT_USERNAME,
    miniAppShortName: MINI_APP_SHORT_NAME,
    currentAppUrl,
    telegramLink: `https://t.me/${BOT_USERNAME}/${MINI_APP_SHORT_NAME}`,
    botDirectLink: `https://t.me/${BOT_USERNAME}`,
  });
});

app.post('/api/bot-configure', async (req, res) => {
  const { appUrl } = req.body;
  if (appUrl) {
    process.env.APP_URL = appUrl;
    await updateBotMenuButton();
  }
  res.json({ success: true, appUrl: process.env.APP_URL });
});

// Gemini AI Tutor Endpoint
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback friendly AI response when key is not set
      return res.json({
        reply: `Привет! Я ИИ-Тьютор «Делай». Для активации полного интеллекта Gemini добавьте ключ GEMINI_API_KEY в переменные окружения. \n\nПо твоему вопросу: "${prompt}" — рекомендуем повторить тему урока, составить конспект и обратиться к куратору при любых трудностях! 🚀`,
        fallback: true,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `Ты — дружелюбный ИИ-тьютор и наставник онлайн-школы «Школа Делай». Твоя цель — в понятной, доступной и мотивирующей форме помогать школьникам и студентам с учёбой, домашними заданиями, программированием, математикой, дизайном и мотивацией. 
Используй эмоциональный, современный русский язык, смайлы, выделяй ключевые мысли жирным шрифтом и форматируй формулы/код при необходимости. Относись к ученику с теплотой.
Контекст ученика: ${context || 'Личный Кабинет ученика «Школа Делай»'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemInstruction }, { text: prompt }] },
      ],
    });

    const reply = response.text || 'К сожалению, не удалось сгенерировать ответ. Попробуй ещё раз!';
    return res.json({ reply, fallback: false });
  } catch (error: any) {
    console.error('Gemini API error:', error.message);
    return res.status(500).json({
      error: 'Ошибка при обращении к ИИ',
      reply: 'Извини, возникли временные неполадки при вызове ИИ-тьютора. Попробуй задать вопрос ещё раз через минутку!',
    });
  }
});

async function startServer() {
  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
