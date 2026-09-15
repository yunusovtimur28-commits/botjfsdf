import React, { useState } from 'react';
import { UserRole, TGNotification } from '../types';
import { AuthUser } from './AuthModal';
import { NavTab } from './Navigation';
import { getFormattedDateTime } from '../lib/dateUtils';
import {
  Bell,
  Sparkles,
  Flame,
  UserCheck,
  GraduationCap,
  Moon,
  Sun,
  X,
  CheckCircle,
  Clock,
  Send,
  LogOut,
  Shield,
  KeyRound,
  User,
  Trash2,
} from 'lucide-react';

interface HeaderTelegramProps {
  currentUser: AuthUser;
  isLoggedIn: boolean;
  onOpenAuthModal: () => void;
  onSelectTab?: (tab: NavTab) => void;
  onLogout?: () => void;
  streakDays: number;
  notifications: TGNotification[];
  onNotificationRead: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const HeaderTelegram: React.FC<HeaderTelegramProps> = ({
  currentUser,
  isLoggedIn,
  onOpenAuthModal,
  onSelectTab,
  onLogout,
  streakDays,
  notifications,
  onNotificationRead,
  onDeleteNotification,
  onClearAllNotifications,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      if (currentUser.role === 'student' && onSelectTab) {
        onSelectTab('profile');
      } else if (currentUser.role === 'teacher' && onSelectTab) {
        onSelectTab('teacher');
      }
    } else {
      onOpenAuthModal();
    }
  };

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
      isDarkMode
        ? 'bg-[#17212b]/95 border-[#0b141d] text-white'
        : 'bg-[#517da2]/95 border-[#426a8c] text-white'
    }`}>
      {/* Top Telegram Header Bar */}
      <div className="max-w-md mx-auto px-3.5 py-2 flex items-center justify-between">
        {/* User Profile Summary & Auth / Stats Trigger */}
        <button
          onClick={handleAvatarClick}
          className="flex items-center space-x-2.5 text-left group hover:opacity-90 transition-opacity"
        >
          {isLoggedIn ? (
            <>
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 shadow-sm bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4] flex items-center justify-center font-bold text-lg">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-[#17212b]" />
              </div>

              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-bold text-xs sm:text-sm tracking-tight leading-tight line-clamp-1">
                    {currentUser.name}
                  </h1>
                </div>
                <div className="text-[10px] text-white/80 flex items-center space-x-1 mt-0.5">
                  <span className="font-semibold text-amber-300 flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {streakDays} дн
                  </span>
                  <span>•</span>
                  <span className="text-white/90">«Делай и Точка»</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-white shrink-0">
                <User className="w-5 h-5 text-white/90" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h1 className="font-bold text-xs sm:text-sm tracking-tight leading-tight">
                    «Делай и Точка»
                  </h1>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 shadow-sm">
                    ЕГЭ 2026
                  </span>
                </div>
                <div className="text-[10px] text-white/80 flex items-center space-x-1 mt-0.5">
                  <span className="text-amber-200 underline font-semibold flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-300" />
                    Нажмите, чтобы войти
                  </span>
                </div>
              </div>
            </>
          )}
        </button>

        {/* Action icons */}
        <div className="flex items-center space-x-1.5">
          {/* Auth / Switch Account button */}
          <button
            onClick={onOpenAuthModal}
            title={isLoggedIn ? "Сменить аккаунт" : "Войти"}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-[11px] font-bold flex items-center space-x-1"
          >
            {!isLoggedIn ? (
              <>
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Войти</span>
              </>
            ) : currentUser.role === 'teacher' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span className="hidden sm:inline">Админ</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden sm:inline">Ученик</span>
              </>
            )}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Переключить тему"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-100" />}
          </button>

          {/* Notifications button (only when logged in) */}
          {isLoggedIn && (
            <button
              onClick={() => {
                setShowNotifications(true);
                notifications.filter((n) => !n.isRead).forEach((n) => onNotificationRead(n.id));
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
              aria-label="Уведомления"
            >
              <Bell className="w-4 h-4 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Notifications Drawer / Slide-over */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-start pt-12 p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-4 transition-all ${
            isDarkMode ? 'bg-[#1e2c3a] text-white border border-slate-700' : 'bg-white text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {currentUser.role === 'teacher' ? 'Уведомления' : 'Сообщения от Ангелины'}
                  </h3>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && onClearAllNotifications && (
                  <button
                    onClick={onClearAllNotifications}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center space-x-1 px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20"
                    title="Очистить все"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Очистить всё</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Bell className="w-8 h-8 text-slate-500 mx-auto opacity-40" />
                  <p className="text-xs text-slate-400">Уведомлений пока нет</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNotificationRead(item.id)}
                    className={`p-3 rounded-xl transition-all border group relative ${
                      !item.isRead
                        ? isDarkMode
                          ? 'bg-sky-950/40 border-sky-500/40'
                          : 'bg-sky-50 border-sky-200'
                        : isDarkMode
                          ? 'bg-[#17212b] border-slate-800'
                          : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 pr-6">
                        {item.type === 'check' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {item.type === 'deadline' && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                        {item.type === 'streak' && <Flame className="w-4 h-4 text-rose-500 shrink-0" />}
                        {item.type === 'webinar' && <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />}
                        <h4 className="font-semibold text-xs leading-tight">{item.title}</h4>
                      </div>
                      
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400">
                          {item.time && item.time !== 'Только что' && item.time !== 'Недавно' && item.time !== 'Сегодня'
                            ? item.time
                            : getFormattedDateTime()}
                        </span>
                        {onDeleteNotification && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNotification(item.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Удалить уведомление"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed pl-6">
                      {item.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <button
                onClick={() => setShowNotifications(false)}
                className="text-xs font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-400"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
