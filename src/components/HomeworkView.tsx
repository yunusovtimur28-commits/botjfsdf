import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Send,
  Sparkles,
  X,
  Bot,
  Award,
  MessageSquare,
} from 'lucide-react';
import { Homework } from '../types';
import { triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';
import confetti from 'canvas-confetti';

interface HomeworkViewProps {
  homeworks: Homework[];
  selectedHomework: Homework | null;
  onSelectHomework: (hw: Homework | null) => void;
  onSubmitHomework: (hwId: string, solutionText: string, fileName?: string) => void;
  onAskAiForHelp: (prompt: string) => void;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  homeworks,
  selectedHomework,
  onSelectHomework,
  onSubmitHomework,
  onAskAiForHelp,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all');
  const [solutionText, setSolutionText] = useState('');
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiFeedbackText, setAiFeedbackText] = useState<string | null>(null);

  const filtered = homeworks.filter((hw) => {
    if (filter === 'pending') return hw.status === 'pending';
    if (filter === 'submitted') return hw.status === 'submitted';
    if (filter === 'approved') return hw.status === 'approved';
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHomework) return;
    if (!solutionText.trim() && !attachedFileName) {
      alert('Пожалуйста, введите решение или прикрепите файл!');
      return;
    }

    triggerHapticFeedback('heavy');
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    triggerNotificationFeedback('success');

    onSubmitHomework(selectedHomework.id, solutionText, attachedFileName || undefined);
    setSolutionText('');
    setAttachedFileName(null);
    setAiFeedbackText(null);
    onSelectHomework(null);
  };

  const handleAiQuickCheck = async () => {
    if (!selectedHomework || !solutionText.trim()) {
      alert('Вложите или напишите текст вашей работы для быстрой проверки ИИ-тьютором!');
      return;
    }

    triggerHapticFeedback('medium');
    setIsAiChecking(true);
    setAiFeedbackText(null);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Проверь предварительное решение домашнего задания "${selectedHomework.title}". \nТекст решения ученика: "${solutionText}". Укажи плюсы, возможные ошибки и дай рекомендации перед отправкой на проверку преподавателю.`,
          context: `Домашнее задание: ${selectedHomework.description}`,
        }),
      });
      const data = await res.json();
      setAiFeedbackText(data.reply || 'Решение выглядит отлично! Можно отправлять преподавателю.');
    } catch (e) {
      setAiFeedbackText('Не удалось выполнить быструю проверку ИИ, попробуйте еще раз.');
    } finally {
      setIsAiChecking(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-4 max-w-xl mx-auto text-slate-100">
      {/* Header & Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-400" />
            Домашние задания
          </h2>
          <p className="text-xs text-slate-400">Сдавай ДЗ и получай XP + Delay Coins</p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-[#121216] border border-white/5 p-1 rounded-xl text-[11px] font-semibold">
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('all');
            }}
            className={`px-2 py-1 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('pending');
            }}
            className={`px-2 py-1 rounded-lg transition-colors ${
              filter === 'pending' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Нужно сдать
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('approved');
            }}
            className={`px-2 py-1 rounded-lg transition-colors ${
              filter === 'approved' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Проверено
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((hw) => (
          <div
            key={hw.id}
            onClick={() => {
              triggerHapticFeedback('light');
              onSelectHomework(hw);
            }}
            className="bg-[#121216] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4 shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-[#18181e] text-slate-300 border-white/5">
                {hw.subject}
              </span>

              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  hw.status === 'pending'
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : hw.status === 'submitted'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {hw.status === 'pending'
                  ? 'Ожидает сдачи'
                  : hw.status === 'submitted'
                  ? 'На проверке'
                  : `Проверено: ${hw.score}/${hw.maxScore} 🌟`}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
              {hw.title}
            </h3>

            <p className="text-xs text-slate-400 line-clamp-2 mb-3">
              {hw.description}
            </p>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <span className="text-indigo-300/90 font-medium text-[11px] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {hw.deadline}
              </span>

              <button className="text-xs font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                {hw.status === 'pending' ? 'Решить & Сдать' : 'Подробнее'} →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Submission Modal */}
      {selectedHomework && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#121216] border border-white/10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30">
                {selectedHomework.subject} • До {selectedHomework.deadline}
              </span>
              <button
                onClick={() => {
                  setAiFeedbackText(null);
                  onSelectHomework(null);
                }}
                className="p-1 rounded-lg bg-[#18181e] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-base font-bold text-white">{selectedHomework.title}</h2>

            <div className="bg-[#0a0a0c] border border-white/5 p-3.5 rounded-2xl text-xs space-y-2">
              <h4 className="font-bold text-slate-300 uppercase text-[11px]">Техническое задание:</h4>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedHomework.taskDetails}
              </p>
            </div>

            {/* If approved: show Feedback */}
            {selectedHomework.status === 'approved' && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Оценка преподавателя
                  </span>
                  <span>
                    {selectedHomework.score} / {selectedHomework.maxScore} баллов
                  </span>
                </div>
                {selectedHomework.tutorFeedback && (
                  <p className="text-xs text-slate-200 leading-relaxed bg-[#121216] p-3 rounded-xl border border-emerald-500/20">
                    "{selectedHomework.tutorFeedback}"
                  </p>
                )}
              </div>
            )}

            {/* Submission Form */}
            {selectedHomework.status === 'pending' && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Ваше решение (текст или ссылка на проект/код):
                  </label>
                  <textarea
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    rows={4}
                    placeholder="Вставьте код решения, описание или ссылку на GitHub/Figma..."
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Attach file simulation */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a0c] border border-dashed border-white/10 hover:border-indigo-500/60 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <FileUp className="w-4 h-4 text-indigo-400" />
                    <span className="truncate max-w-[200px]">
                      {attachedFileName || 'Прикрепить решение (файл/архив)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticFeedback('light');
                      setAttachedFileName('solution_hw_timur.py');
                    }}
                    className="text-xs font-bold text-indigo-400 hover:underline"
                  >
                    {attachedFileName ? 'Изменить' : 'Загрузить'}
                  </button>
                </div>

                {/* AI Pre-check Button */}
                <button
                  type="button"
                  onClick={handleAiQuickCheck}
                  disabled={isAiChecking}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-[#121216] border border-purple-500/30 hover:border-purple-400/60 text-purple-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Bot className={`w-4 h-4 text-purple-400 ${isAiChecking ? 'animate-spin' : ''}`} />
                  <span>
                    {isAiChecking ? 'ИИ проверяет ваше решение...' : '✨ Экспресс-проверка ИИ-тьютором перед сдачей'}
                  </span>
                </button>

                {/* AI feedback box if available */}
                {aiFeedbackText && (
                  <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-xl text-xs space-y-1 text-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-purple-400">
                      <Sparkles className="w-3.5 h-3.5" /> Рекомендации ИИ-тьютора «Делай»:
                    </div>
                    <p className="leading-relaxed whitespace-pre-line text-slate-300">
                      {aiFeedbackText}
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Отправить домашнее задание на проверку</span>
                </button>
              </form>
            )}

            {/* Ask Tutor directly button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onAskAiForHelp(`Помоги разобраться с домашним заданием: ${selectedHomework.title}`);
                  onSelectHomework(null);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#18181e] hover:bg-[#202028] border border-white/5 text-slate-300 text-xs font-medium flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Задать вопрос по этому ДЗ в ИИ-Чат</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
