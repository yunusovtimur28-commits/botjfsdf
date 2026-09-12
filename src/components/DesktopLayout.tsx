import React, { useState } from 'react';
import { NavTab } from './Navigation';
import { AuthUser } from './AuthModal';
import { TGNotification } from '../types';
import { getFormattedDateTime } from '../lib/dateUtils';
import {
  BookOpen, FileCheck2, Timer, User, GraduationCap,
  Moon, Sun, LogOut, MonitorSmartphone,
  Flame, Bell, Send, X, Trash2, CheckCircle, Clock, Sparkles
} from 'lucide-react';

interface DesktopLayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onForceMobile: () => void;
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: AuthUser;
  isLoggedIn: boolean;
  onLogout: () => void;
  pendingCount: number;
  streakDays: number;
  notifications: TGNotification[];
  onNotificationRead: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onClearAllNotifications?: () => void;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  children, isDarkMode, onToggleDarkMode, onForceMobile,
  activeTab, onSelectTab, currentUser, isLoggedIn, onLogout, pendingCount,
  streakDays, notifications, onNotificationRead, onDeleteNotification, onClearAllNotifications
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navItems = currentUser.role === 'teacher' ? [
    { id: 'teacher' as NavTab, label: 'Кабинет учителя', icon: GraduationCap, badge: null },
    { id: 'profile' as NavTab, label: 'Профиль', icon: User, badge: null },
  ] : [
    { id: 'webinars' as NavTab, label: 'База знаний', icon: BookOpen, badge: null },
    { id: 'homeworks' as NavTab, label: 'Домашние задания', icon: FileCheck2, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'simulator' as NavTab, label: 'Тренажер ЕГЭ', icon: Timer, badge: null },
    { id: 'profile' as NavTab, label: 'Профиль', icon: User, badge: null },
  ];

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-[#0f1721] text-slate-200' : 'bg-slate-100 text-slate-800'}`}>
      {/* Левый Сайдбар */}
      {isLoggedIn && (
        <aside className={`w-72 flex flex-col border-r shadow-xl z-20 ${isDarkMode ? 'bg-[#17212b] border-[#0b141d]' : 'bg-white border-slate-200'}`}>
          <div className="p-6 border-b border-inherit flex items-center justify-start pb-8">
            <img 
              src="/logo.png" 
              alt="Делай и Точка" 
              className="h-12 w-auto object-contain" 
            />
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all text-sm font-bold ${
                    isActive
                      ? isDarkMode ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-600'
                      : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-sky-500' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-inherit space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500">Тема оформления:</span>
              <button onClick={onToggleDarkMode} className="p-2.5 rounded-xl hover:bg-slate-500/10 transition-colors bg-black/10 dark:bg-black/20">
                {isDarkMode ? <Moon className="w-4 h-4 text-sky-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>
            </div>
            <div className={`p-3 rounded-2xl flex items-center justify-between border shadow-sm ${isDarkMode ? 'bg-[#0f1721] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="relative shrink-0">
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border-2 border-sky-500/30" />
                </div>
                <div className="truncate text-left">
                  <p className="text-sm font-bold truncate leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{currentUser.role === 'teacher' ? 'Преподаватель' : 'Ученик'}</p>
                </div>
              </div>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Основная контентная область */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
         {isLoggedIn && (
           <header className={`px-8 py-5 border-b flex items-center justify-between sticky top-0 z-10 shadow-sm ${isDarkMode ? 'bg-[#17212b]/95 border-[#0b141d] backdrop-blur-md' : 'bg-white/95 border-slate-200 backdrop-blur-md'}`}>
             <h2 className="text-xl font-black capitalize tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label || 'Платформа'}
             </h2>
             <div className="flex items-center space-x-6">
               {/* 1. Колокольчик */}
               <button
                 onClick={() => {
                   setShowNotifications(true);
                   notifications.filter((n) => !n.isRead).forEach((n) => onNotificationRead(n.id));
                 }}
                 className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 transition-colors relative border border-sky-500/20 shrink-0"
               >
                 <Bell className="w-5 h-5 text-sky-500" />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                     {unreadCount}
                   </span>
                 )}
               </button>

               {/* 2. Стрик (Огонек) */}
               {currentUser.role === 'student' && (
                 <div className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-extrabold text-sm transition-all cursor-default shrink-0">
                   <Flame className="w-4 h-4 fill-amber-500" />
                   <span>{streakDays}</span>
                 </div>
               )}

               {/* 3. Кнопка Режим телефона */}
               <button onClick={onForceMobile} className="px-4 py-2.5 rounded-xl bg-sky-500/10 text-sky-500 text-xs font-bold hover:bg-sky-500/20 transition-colors flex items-center space-x-2 border border-sky-500/20 shrink-0">
                 <MonitorSmartphone className="w-4 h-4 shrink-0" />
                 <span className="hidden sm:inline">Режим телефона</span>
               </button>
             </div>
           </header>
         )}
         
         <div className="flex-1 overflow-y-auto p-4 sm:p-8">
           <div className="max-w-6xl mx-auto pb-12">
             {children}
           </div>
         </div>

         {/* Notifications Drawer */}
         {showNotifications && (
           <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-start pt-20 p-4 animate-in fade-in duration-200">
             <div className={`w-full max-w-md rounded-2xl shadow-2xl p-4 transition-all ${
               isDarkMode ? 'bg-[#1e2c3a] text-white border border-slate-700' : 'bg-white text-slate-900'
             }`}>
               <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                 <div className="flex items-center space-x-2">
                   <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center">
                     <Send className="w-4 h-4" />
                   </div>
                   <div>
                     <h3 className="font-bold text-sm">Уведомления Telegram-бота</h3>
                     <p className="text-[11px] text-slate-500 dark:text-slate-400">Симуляция сообщений</p>
                   </div>
                 </div>
                 <div className="flex items-center space-x-2">
                   {notifications.length > 0 && onClearAllNotifications && (
                     <button onClick={onClearAllNotifications} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20">
                       <Trash2 className="w-3 h-3 inline mr-1" /> Очистить
                     </button>
                   )}
                   <button onClick={() => setShowNotifications(false)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                     <X className="w-4 h-4" />
                   </button>
                 </div>
               </div>
               <div className="mt-3 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                 {notifications.length === 0 ? (
                   <div className="text-center py-8">
                     <Bell className="w-8 h-8 text-slate-500 mx-auto opacity-40 mb-2" />
                     <p className="text-xs text-slate-400">Новых уведомлений нет</p>
                   </div>
                 ) : (
                   notifications.map((item) => (
                     <div key={item.id} onClick={() => onNotificationRead(item.id)} className={`p-3 rounded-xl border ${!item.isRead ? (isDarkMode ? 'bg-sky-950/40 border-sky-500/40' : 'bg-sky-50 border-sky-200') : (isDarkMode ? 'bg-[#17212b] border-slate-800' : 'bg-slate-50 border-slate-100')}`}>
                       <div className="flex items-start justify-between">
                         <div className="flex items-center space-x-2 pr-6">
                           {item.type === 'check' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                           {item.type === 'deadline' && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                           {item.type === 'streak' && <Flame className="w-4 h-4 text-rose-500 shrink-0" />}
                           {item.type === 'webinar' && <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />}
                           <h4 className="font-semibold text-xs leading-tight">{item.title}</h4>
                         </div>
                         <div className="flex items-center space-x-2 shrink-0 ml-2">
                           <span className="text-[10px] text-slate-400">{item.time && item.time !== 'Вчера' ? item.time : getFormattedDateTime()}</span>
                           {onDeleteNotification && (
                             <button onClick={(e) => { e.stopPropagation(); onDeleteNotification(item.id); }} className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors">
                               <Trash2 className="w-3.5 h-3.5" />
                             </button>
                           )}
                         </div>
                       </div>
                       <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed pl-6">{item.text}</p>
                     </div>
                   ))
                 )}
               </div>
             </div>
           </div>
         )}
      </main>
    </div>
  );
};
