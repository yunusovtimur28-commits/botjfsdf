import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  PlayCircle,
  CheckCircle,
  ExternalLink,
  X,
  User,
  Download,
} from 'lucide-react';
import { Lesson } from '../types';
import { triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';

interface LessonsViewProps {
  lessons: Lesson[];
  selectedLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson | null) => void;
  onGoToHomework?: (homeworkId: string) => void;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  lessons,
  selectedLesson,
  onSelectLesson,
  onGoToHomework,
}) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [checkedInLessons, setCheckedInLessons] = useState<string[]>([]);

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === 'upcoming') return lesson.status === 'upcoming' || lesson.status === 'live';
    if (filter === 'completed') return lesson.status === 'completed';
    return true;
  });

  const handleCheckIn = (lessonId: string) => {
    triggerHapticFeedback('medium');
    if (!checkedInLessons.includes(lessonId)) {
      setCheckedInLessons((prev) => [...prev, lessonId]);
      triggerNotificationFeedback('success');
    }
  };

  return (
    <div className="space-y-4 pb-24 px-4 pt-4 max-w-xl mx-auto text-slate-100">
      {/* Header & Filter Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Учебное расписание
          </h2>
          <p className="text-xs text-slate-400">Курс: Python & AI разработчик</p>
        </div>

        {/* Filter Pill */}
        <div className="flex bg-[#121216] border border-white/5 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('upcoming');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'upcoming' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Предстоящие
          </button>
          <button
            onClick={() => {
              triggerHapticFeedback('light');
              setFilter('completed');
            }}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              filter === 'completed' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400'
            }`}
          >
            Записи
          </button>
        </div>
      </div>

      {/* Lesson List */}
      <div className="space-y-3">
        {filteredLessons.map((lesson) => {
          const isCheckedIn = checkedInLessons.includes(lesson.id);

          return (
            <div
              key={lesson.id}
              onClick={() => {
                triggerHapticFeedback('light');
                onSelectLesson(lesson);
              }}
              className="bg-[#121216] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4 shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    lesson.status === 'upcoming'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : lesson.status === 'live'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                      : 'bg-[#18181e] text-slate-400 border-white/5'
                  }`}
                >
                  {lesson.status === 'upcoming'
                    ? 'Предстоящий'
                    : lesson.status === 'live'
                    ? '🔴 Идёт трансляция'
                    : 'Завершен'}
                </span>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lesson.date}, {lesson.time}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mb-1">
                {lesson.title}
              </h3>

              <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                {lesson.description}
              </p>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <img
                    src={lesson.tutorAvatar}
                    alt={lesson.tutorName}
                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                  />
                  <span className="text-slate-300 font-medium text-[11px]">{lesson.tutorName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {lesson.materialsCount} мат.
                  </span>
                  {lesson.status === 'completed' ? (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <PlayCircle className="w-3.5 h-3.5" /> Смотреть
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> Войти
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lesson Details Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#121216] border border-white/10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 text-slate-100 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/30">
                {selectedLesson.subject}
              </span>
              <button
                onClick={() => onSelectLesson(null)}
                className="p-1 rounded-lg bg-[#18181e] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-base font-bold text-white">{selectedLesson.title}</h2>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {selectedLesson.date}, {selectedLesson.time} ({selectedLesson.duration})
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-purple-400" />
                {selectedLesson.tutorName}
              </span>
            </div>

            {/* Video Player Preview if completed */}
            {selectedLesson.videoRecordUrl ? (
              <div className="rounded-2xl overflow-hidden bg-[#0a0a0c] border border-white/5">
                <video
                  controls
                  className="w-full aspect-video object-cover"
                  poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"
                >
                  <source src={selectedLesson.videoRecordUrl} type="video/mp4" />
                  Ваш браузер не поддерживает видео.
                </video>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#181826] to-[#121218] border border-indigo-500/20 rounded-2xl p-4 text-center space-y-2">
                <Video className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
                <h4 className="text-sm font-bold text-white">Урок пройдёт в формате живого вебинара</h4>
                <p className="text-xs text-slate-300">
                  Подключение откроется за 10 минут до начала трансляции.
                </p>
                <a
                  href={selectedLesson.zoomUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => triggerHapticFeedback('medium')}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Подключиться к Zoom трансляции</span>
                </a>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-1">Программа урока:</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#0a0a0c] p-3 rounded-xl border border-white/5">
                {selectedLesson.description}
              </p>
            </div>

            {/* Materials & Downloads */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Материалы урока:</h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    alert('Загрузка презентации урока (PDF)...');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181e] hover:bg-[#202028] text-xs text-slate-200 transition-colors border border-white/5"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Презентация_урока_Делай.pdf
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => {
                    triggerHapticFeedback('light');
                    alert('Загрузка исходников кода (ZIP)...');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#18181e] hover:bg-[#202028] text-xs text-slate-200 transition-colors border border-white/5"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Исходный_код_проекта.zip
                  </span>
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Check-in & Homework Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                id="lesson-checkin-btn"
                onClick={() => handleCheckIn(selectedLesson.id)}
                disabled={checkedInLessons.includes(selectedLesson.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  checkedInLessons.includes(selectedLesson.id)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#18181e] hover:bg-[#202028] text-slate-200 border border-white/5'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {checkedInLessons.includes(selectedLesson.id)
                    ? 'Отметка о посещении принята (+20 XP)'
                    : 'Отметиться на уроке (+20 XP)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
