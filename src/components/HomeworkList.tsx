import React, { useState } from 'react';
import { Homework, Submission, HomeworkStatus } from '../types';
import { HomeworkSubmissionModal } from './HomeworkSubmissionModal';
import { getCurrentMonthLabel } from '../lib/dateUtils';
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

  // Map homework ID to submission belonging to current student or fallback
  const getSubmissionForHomework = (hwId: string): Submission | undefined => {
    if (currentUserName) {
      const normName = currentUserName.trim().toLowerCase();
      const userSub = submissions.find(
        (s) => s.homeworkId === hwId && s.studentName && s.studentName.trim().toLowerCase() === normName
      );
      if (userSub) return userSub;
    }
    return submissions.find((s) => s.homeworkId === hwId);
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

  const tabs: {
    id: HomeworkStatus;
    label: string;
    activeClass: string;
    badgeClass: string;
  }[] = [
    {
      id: 'todo',
      label: '🟡 на выполнение',
      activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-950/40',
      badgeClass: 'bg-amber-500/30 text-amber-200 border-amber-500/40',
    },
    {
      id: 'pending',
      label: '🔵 на проверку',
      activeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-lg shadow-sky-950/40',
      badgeClass: 'bg-sky-500/30 text-sky-200 border-sky-500/40',
    },
    {
      id: 'graded',
      label: '🟢 проверенно учителем',
      activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950/40',
      badgeClass: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/40',
    },
    {
      id: 'overdue',
      label: '🔴 просроченно по времени',
      activeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-950/40',
      badgeClass: 'bg-rose-500/30 text-rose-200 border-rose-500/40',
    },
  ];

  const filteredHomeworks = homeworks.filter(
    (hw) =>
      getHomeworkStatus(hw) === activeTab &&
      (selectedMonth === 'all' || (hw.month || getCurrentMonthLabel()) === selectedMonth)
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

      {/* Status Filter Tabs (Strict 2x2 Grid: Row 1 = todo & pending, Row 2 = graded & overdue) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 p-2 rounded-2xl bg-black/20 dark:bg-[#17212b] border border-slate-700/50">
        {tabs.map((tab) => {
          const count = homeworks.filter((hw) => getHomeworkStatus(hw) === tab.id).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-between border ${
                isActive
                  ? tab.activeClass
                  : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-700/40'
              }`}
            >
              <span className="truncate tracking-tight font-extrabold">{tab.label}</span>
              <span
                className={`ml-1.5 text-[11px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                  isActive ? tab.badgeClass : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
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
                        📅 {hw.month || getCurrentMonthLabel()}
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
