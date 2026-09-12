import React, { useState } from 'react';
import { Webinar, BlockCategory } from '../types';
import { WebinarModal } from './WebinarModal';
import {
  Search,
  Play,
  Clock,
  BookOpen,
  X,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface WebinarLibraryProps {
  webinars: Webinar[];
  isDarkMode: boolean;
  onSaveProgress?: (webinarId: string, positionSeconds: number) => void;
}

export const WebinarLibrary: React.FC<WebinarLibraryProps> = ({
  webinars,
  isDarkMode,
  onSaveProgress,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<BlockCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);

  const categories: { id: BlockCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Все блоки' },
    { id: 'listening', label: '🎧 Аудирование' },
    { id: 'reading', label: '📖 Чтение' },
    { id: 'grammar_vocabulary', label: '📚 Грамматика и лексика' },
    { id: 'writing', label: '✍️ Письмо и Эссе' },
    { id: 'speaking', label: '🗣 Speaking' },
  ];

  const filteredWebinars = webinars.filter((web) => {
    const matchesBlock = selectedBlock === 'all' || web.block === selectedBlock;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      web.title.toLowerCase().includes(query) ||
      web.description.toLowerCase().includes(query) ||
      web.timecodes.some((tc) => tc.label.toLowerCase().includes(query));
    return matchesBlock && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Header Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">📚 Видеотека и База знаний</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Записи вебинаров с ускорением 1.25x - 2.0x, таймкодами и конспектами
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск уроков («Задание 3», «Past Simple»)..."
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl text-xs border transition-all ${
              isDarkMode
                ? 'bg-[#1e2c3a] border-slate-700 text-white placeholder-slate-400 focus:border-sky-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedBlock(cat.id)}
              className={`whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border ${
                selectedBlock === cat.id
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                  : isDarkMode
                  ? 'bg-[#17212b] border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Webinars Cards Grid */}
      {filteredWebinars.length === 0 ? (
        <div className={`text-center py-12 rounded-2xl border ${
          isDarkMode ? 'bg-[#1e2c3a] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold">Уроки не найдены</p>
          <p className="text-xs text-slate-500 mt-1">Попробуйте изменить поисковый запрос или фильтр</p>
          {(searchQuery || selectedBlock !== 'all') && (
            <button 
              onClick={() => { setSearchQuery(''); setSelectedBlock('all'); }}
              className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWebinars.map((webinar) => {
            const watchedPercent =
              webinar.viewedPositionSeconds && webinar.durationSeconds
                ? Math.min(100, Math.floor((webinar.viewedPositionSeconds / webinar.durationSeconds) * 100))
                : 0;

            return (
              <div
                key={webinar.id}
                onClick={() => setSelectedWebinar(webinar)}
                className={`group rounded-2xl border overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                  isDarkMode
                    ? 'bg-[#1e2c3a] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-sky-200'
                }`}
              >
                {/* Thumbnail & Video Banner */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                  <img
                    src={webinar.thumbnailUrl}
                    alt={webinar.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-1 fill-white" />
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-sky-400 border border-sky-400/30">
                      {webinar.block === 'speaking'
                        ? '🗣 Speaking'
                        : webinar.block === 'writing'
                        ? '✍️ Письмо'
                        : webinar.block === 'grammar_vocabulary'
                        ? '📚 Грам. и лексика'
                        : webinar.block === 'listening'
                        ? '🎧 Аудирование'
                        : '📖 Чтение'}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{webinar.duration}</span>
                  </div>

                  {/* Progress Bar if watched */}
                  {watchedPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-sky-500 transition-all"
                        style={{ width: `${watchedPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Card Info */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xs leading-snug line-clamp-2 group-hover:text-sky-500 transition-colors">
                      {webinar.title}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {webinar.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3 text-sky-500" />
                      <span>{webinar.timecodes.length} таймкодов</span>
                    </span>

                    <span className="flex items-center space-x-1 text-slate-500 dark:text-slate-400">
                      <BookOpen className="w-3 h-3 text-emerald-500" />
                      <span>{webinar.materials.length} PDF файла</span>
                    </span>

                    {watchedPercent === 100 && (
                      <span className="flex items-center space-x-1 text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Просмотрено</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Video Player */}
      {selectedWebinar && (
        <WebinarModal
          webinar={selectedWebinar}
          onClose={() => setSelectedWebinar(null)}
          isDarkMode={isDarkMode}
          onSaveProgress={onSaveProgress}
        />
      )}
    </div>
  );
};
