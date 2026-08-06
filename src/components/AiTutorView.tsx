import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, RefreshCw, Code, BookOpen, Lightbulb, HelpCircle } from 'lucide-react';
import { AiChatMessage } from '../types';
import { triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';

interface AiTutorViewProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

export const AiTutorView: React.FC<AiTutorViewProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'msg_0',
      sender: 'ai',
      text: 'Привет! Я твой ИИ-Тьютор «Делай» 🤖✨\n\nМогу помочь со всем по учёбе: разобрать синтаксис Python, объяснить формулы по математике, проверить решение или подсказать идею для проекта. О чём спросишь?',
      timestamp: 'Только что',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const presetPrompts = [
    { title: '🐍 Как настроить Telegram WebApp?', query: 'Объясни как настроить Telegram WebApp и кнопку меню через Bot API' },
    { title: '📐 Разбери задачу по математике', query: 'Объясни понятным языком, как решать квадратные уравнения через дискриминант' },
    { title: '💡 Подскажи идею для ИИ-проекта', query: 'Дай 3 интересные идеи веб-приложений с искусственным интеллектом для портфолио' },
    { title: '📝 Помоги составить конспект', query: 'Как правильно вести конспект лекции по программированию, чтобы быстро повторять материал?' },
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle initial prompt if passed from another view
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    triggerHapticFeedback('light');

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context: 'Студент курсов программирования и ИИ в Школе Делай',
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || 'Произошла ошибка при генерации ответа.';

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerNotificationFeedback('success');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: 'Извини, связь с ИИ-сервером прервалась. Попробуй ещё раз!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerNotificationFeedback('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-xl mx-auto px-4 pt-4 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              ИИ-Тьютор «Делай»
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </h2>
            <p className="text-[11px] text-purple-300 font-medium">Gemini 2.5 Flash • Учебный наставник</p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHapticFeedback('medium');
            setMessages([messages[0]]);
          }}
          className="p-1.5 rounded-lg bg-[#121216] border border-white/5 text-slate-400 hover:text-white"
          title="Очистить диалог"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1 ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-[#121216] border border-white/5 text-slate-100 rounded-tl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div
                className={`text-[9px] text-right font-mono ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/30 border border-purple-500/20 p-3 rounded-2xl w-max">
            <Bot className="w-4 h-4 animate-spin text-purple-400" />
            <span>ИИ-тьютор формулирует подробный ответ...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="py-2 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Быстрые вопросы:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.query)}
                className="text-left text-[11px] bg-[#121216] hover:bg-[#18181e] border border-white/5 p-2 rounded-xl text-slate-300 transition-colors truncate"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="py-3 border-t border-white/5 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Задай вопрос по математике, IT, дизайну..."
          className="flex-1 bg-[#121216] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white disabled:opacity-50 font-bold transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
