import React, { useState } from 'react';
import { Homework, Submission, HomeworkStatus } from '../types';
import { HomeworkSubmissionModal } from './HomeworkSubmissionModal';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Mic,
  FileText,
  Zap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface HomeworkListProps {
  homeworks: Homework[];
  submissions: Submission[];
  onSubmitHomework: (submissionData: Partial<Submission>) => void;
  isDarkMode: boolean;
  currentUserName?: string;
}

export const HomeworkList: React.FC<HomeworkListProps> = ({
  homeworks,
  submissions,
  onSubmitHomework,
  isDarkMode,
  currentUserName,
}) => {
  const [activeTab, setActiveTab] = useState<HomeworkStatus>('todo');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);

  // Map homework ID to submission belonging to current student
  const getSubmissionForHomework = (hwId: string): Submission | undefined => {
    if (!currentUserName) return submissions.find((s) => s.homeworkId === hwId);
    return submissions.find((s) => s.homeworkId === hwId && s.studentName === currentUserName);
  };

  // Determine effective status for each homework
  const getHomeworkStatus = (hw: Homework): HomeworkStatus => {
    const sub = getSubmissionForHomework(hw.id);
    if (sub) {
      return sub.status;
    }
    if (hw.deadline === 'Просрочено') {
      return 'overdue';
    }
    return 'todo';
  };

  const tabs: { id: HomeworkStatus; label: string; icon: any; colorClass: string }[] = [
    { id: 'todo', label: '🟡 Надо сделать', icon: Clock, colorClass: 'text-amber-400' },
    { id: 'pending', label: '🔵 На проверке', icon: FileCheck2, colorClass: 'text-sky-400' },
    { id: 'graded', label: '🟢 Проверено', icon: CheckCircle2, colorClass: 'text-emerald-400' },
    { id: 'overdue', label: '🔴 Просрочено', icon: AlertCircle, colorClass: 'text-rose-400' },
  ];

  const filteredHomeworks = homeworks.filter(
    (hw) =>
      getHomeworkStatus(hw) === activeTab &&
      (selectedMonth === 'all' || (hw.month || 'Май 2026') === selectedMonth)
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">📝 Домашние задания</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            3 формата сдачи: Тесты, Устная часть (Speaking) и Письменные работы
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'Все месяцы' },
            { id: 'Январь 2026', label: 'Январь' },
            { id: 'Февраль 2026', label: 'Февраль' },
            { id: 'Март 2026', label: 'Март' },
            { id: 'Апрель 2026', label: 'Апрель' },
            { id: 'Май 2026', label: 'Май' },
            { id: 'Июнь 2026', label: 'Июнь' },
            { id: 'Июль 2026', label: 'Июль' },
            { id: 'Август 2026', label: 'Август' },
            { id: 'Сентябрь 2026', label: 'Сентябрь' },
            { id: 'Октябрь 2026', label: 'Октябрь' },
            { id: 'Ноябрь 2026', label: 'Ноябрь' },
            { id: 'Декабрь 2026', label: 'Декабрь' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMonth(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedMonth === m.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-black/10 dark:bg-[#1e2c3a] text-slate-400 hover:text-white border border-slate-700/50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-black/10 dark:bg-[#17212b]">
        {tabs.map((tab) => {
          const count = homeworks.filter((hw) => getHomeworkStatus(hw) === tab.id).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                isActive
                  ? isDarkMode
                    ? 'bg-[#1e2c3a] text-white shadow-md border border-slate-700'
                    : 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Homework List Items */}
      {filteredHomeworks.length === 0 ? (
        <div
          className={`text-center py-12 rounded-2xl border ${
            isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
          <p className="text-sm font-semibold">В этой категории нет ДЗ</p>
          <p className="text-xs text-slate-500 mt-1">Отличная работа! Все задания выполнены.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHomeworks.map((hw) => {
            const sub = getSubmissionForHomework(hw.id);
            const status = getHomeworkStatus(hw);

            return (
              <div
                key={hw.id}
                onClick={() => setSelectedHomework(hw)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  isDarkMode
                    ? 'bg-[#1e2c3a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-sky-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Badges - Line 1: Block & Month */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {hw.block === 'speaking'
                          ? '🗣 Раздел: Speaking'
                          : hw.block === 'grammar'
                          ? '⚡ Раздел: Грамматика'
                          : hw.block === 'writing'
                          ? '✍️ Раздел: Письмо / Эссе'
                          : '📚 Раздел: Лексика'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        📅 {hw.month || 'Май 2026'}
                      </span>
                    </div>

                    {/* Badges - Line 2: Format & Max Score */}
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1 pt-0.5">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          hw.type === 'test'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : hw.type === 'speaking'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {hw.type === 'test'
                          ? 'Формат: ⚡ Тест с автопроверкой'
                          : hw.type === 'speaking'
                          ? 'Формат: 🗣 Запись устного ответа'
                          : 'Формат: ✍️ Эссе / Ручной ввод'}
                      </span>

                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        🏆 До {hw.maxPoints} баллов
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm leading-snug">{hw.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {hw.description}
                    </p>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 self-center" />
                </div>

                {/* Bottom Row */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {/* Deadline Indicator */}
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-400">Дедлайн:</span>
                    <span
                      className={`font-semibold ${
                        hw.deadline === 'Просрочено' ? 'text-rose-400' : 'text-amber-300'
                      }`}
                    >
                      {hw.deadline}
                    </span>
                  </div>

                  {/* Status outcome */}
                  <div>
                    {status === 'graded' && sub?.totalScore !== undefined && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>
                          {sub.totalScore} / {hw.maxPoints} баллов
                        </span>
                      </span>
                    )}

                    {status === 'pending' && (
                      <span className="text-xs font-semibold text-sky-400 bg-sky-500/20 px-2.5 py-0.5 rounded-full">
                        На проверке у Ангелины
                      </span>
                    )}

                    {status === 'todo' && (
                      <span className="text-xs font-bold text-sky-500 hover:underline">
                        Сдать ДЗ →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {selectedHomework && (
        <HomeworkSubmissionModal
          homework={selectedHomework}
          existingSubmission={getSubmissionForHomework(selectedHomework.id)}
          onClose={() => setSelectedHomework(null)}
          onSubmit={onSubmitHomework}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
