import React from 'react';
import {
  Sparkles,
  Video,
  BookOpen,
  Bot,
  ShoppingBag,
  ArrowRight,
  Clock,
  CheckCircle2,
  Megaphone,
  Flame,
  Award,
} from 'lucide-react';
import { StudentProfile, Lesson, Homework, Announcement, BotInfo } from '../types';
import { BotStatusBanner } from './BotStatusBanner';
import { triggerHapticFeedback } from '../lib/telegram';

interface DashboardViewProps {
  profile: StudentProfile;
  lessons: Lesson[];
  homeworks: Homework[];
  announcements: Announcement[];
  botInfo: BotInfo | null;
  onRefreshBot: () => void;
  onNavigate: (tab: 'lessons' | 'homework' | 'ai_tutor' | 'shop' | 'profile') => void;
  onSelectLesson: (lesson: Lesson) => void;
  onSelectHomework: (homework: Homework) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  lessons,
  homeworks,
  announcements,
  botInfo,
  onRefreshBot,
  onNavigate,
  onSelectLesson,
  onSelectHomework,
}) => {
  const upcomingLesson = lessons.find((l) => l.status === 'upcoming') || lessons[0];
  const pendingHomeworks = homeworks.filter((h) => h.status === 'pending');
  const xpPercent = Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100));

  return (
    <div className="space-y-6 pb-24 px-4 pt-4 max-w-xl mx-auto">
      {/* Bot Status Banner */}
      <BotStatusBanner botInfo={botInfo} onRefresh={onRefreshBot} />

      {/* Level & XP Progress Card */}
      <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 shadow-xl text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Уровень ученика</span>
              <h2 className="text-sm font-bold text-slate-100">{profile.level} Уровень</h2>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30">
            {profile.xp} / {profile.nextLevelXp} XP
          </span>
        </div>
        <div className="w-full bg-[#1c1c22] h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span>{profile.groupName}</span>
          <span>До 5 уровня: {profile.nextLevelXp - profile.xp} XP</span>
        </div>
      </div>

      {/* Upcoming Class Card */}
      {upcomingLesson && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#181826] via-[#121218] to-[#0e0e12] border border-indigo-500/20 rounded-2xl p-5 shadow-xl text-white">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
              Ближайший урок • {upcomingLesson.date}
            </span>
            <span className="text-xs text-slate-400 font-medium">{upcomingLesson.time}</span>
          </div>

          <h3 className="text-base font-bold text-white mb-2 leading-snug">
            {upcomingLesson.title}
          </h3>

          <p className="text-xs text-slate-300 line-clamp-2 mb-4 leading-relaxed">
            {upcomingLesson.description}
          </p>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <img
                src={upcomingLesson.tutorAvatar}
                alt={upcomingLesson.tutorName}
                className="w-7 h-7 rounded-full object-cover border border-indigo-500/40"
              />
              <span className="text-xs font-medium text-slate-300">
                Преподаватель: {upcomingLesson.tutorName}
              </span>
            </div>

            <button
              id="dashboard-join-lesson-btn"
              onClick={() => {
                triggerHapticFeedback('medium');
                onSelectLesson(upcomingLesson);
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg transition-all"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Войти на урок</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Быстрые действия
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            id="quick-ai-tutor-btn"
            onClick={() => {
              triggerHapticFeedback('light');
              onNavigate('ai_tutor');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-[#121216] border border-purple-500/20 hover:border-purple-500/40 transition-all group text-left shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 mb-2.5 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white mb-0.5 flex items-center gap-1">
              ИИ-Тьютор «Делай»
              <Sparkles className="w-3 h-3 text-purple-400" />
            </span>
            <span className="text-[11px] text-slate-400">Спросить по учебе 24/7</span>
          </button>

          <button
            id="quick-homework-btn"
            onClick={() => {
              triggerHapticFeedback('light');
              onNavigate('homework');
            }}
            className="flex flex-col items-start p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-[#121216] border border-indigo-500/20 hover:border-indigo-500/40 transition-all group text-left shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-2.5 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white mb-0.5 flex items-center justify-between w-full">
              <span>Сдать ДЗ</span>
              {pendingHomeworks.length > 0 && (
                <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-full">
                  {pendingHomeworks.length}
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400">Проверка преподавателем</span>
          </button>
        </div>
      </div>

      {/* Homework Action Card */}
      {pendingHomeworks.length > 0 && (
        <div className="bg-[#121216] border border-white/5 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              Активные домашние задания ({pendingHomeworks.length})
            </h3>
            <button
              onClick={() => onNavigate('homework')}
              className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
            >
              Все ДЗ <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingHomeworks.slice(0, 2).map((hw) => (
              <div
                key={hw.id}
                onClick={() => {
                  triggerHapticFeedback('light');
                  onSelectHomework(hw);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-[#18181e] border border-white/5 hover:border-indigo-500/30 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{hw.title}</h4>
                  <p className="text-[11px] text-indigo-400/90 mt-0.5">{hw.deadline}</p>
                </div>
                <span className="text-[11px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-lg">
                  Сдать
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
            Объявления школы
          </h3>
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-[#121216] border border-white/5 rounded-2xl p-4 shadow-md"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
                    {ann.title}
                  </span>
                  <span className="text-[10px] text-slate-400">{ann.date}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {ann.content}
                </p>
                {ann.linkText && (
                  <button
                    onClick={() => {
                      triggerHapticFeedback('light');
                      alert(`Переход по акции: ${ann.title}`);
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>{ann.linkText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
