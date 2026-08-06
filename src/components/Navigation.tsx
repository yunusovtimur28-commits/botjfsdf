import React from 'react';
import { UserRole } from '../types';
import {
  BookOpen,
  FileCheck2,
  Timer,
  User,
  GraduationCap,
} from 'lucide-react';

export type NavTab = 'webinars' | 'homeworks' | 'simulator' | 'profile' | 'teacher';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingCount: number;
  currentRole: UserRole;
  isDarkMode: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  pendingCount,
  currentRole,
  isDarkMode,
}) => {
  const navItems = currentRole === 'teacher' ? [
    {
      id: 'teacher' as NavTab,
      label: 'Кабинет',
      icon: GraduationCap,
      badge: null,
    },
    {
      id: 'profile' as NavTab,
      label: 'Профиль',
      icon: User,
      badge: null,
    },
  ] : [
    {
      id: 'webinars' as NavTab,
      label: 'База знаний',
      icon: BookOpen,
      badge: null,
    },
    {
      id: 'homeworks' as NavTab,
      label: 'ДЗ',
      icon: FileCheck2,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'simulator' as NavTab,
      label: 'Тренажёр',
      icon: Timer,
      badge: null,
    },
    {
      id: 'profile' as NavTab,
      label: 'Профиль',
      icon: User,
      badge: null,
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t transition-colors ${
      isDarkMode
        ? 'bg-[#17212b]/95 border-[#0b141d] text-slate-300'
        : 'bg-white/95 border-slate-200 text-slate-600'
    } backdrop-blur-lg`}>
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? isDarkMode
                    ? 'text-sky-400 font-bold scale-105'
                    : 'text-sky-600 font-bold scale-105'
                  : 'hover:opacity-80 font-medium text-xs'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-white dark:border-[#17212b]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
