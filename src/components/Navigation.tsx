import React from 'react';
import { Home, Calendar, CheckSquare, Bot, ShoppingBag, User } from 'lucide-react';
import { triggerHapticFeedback } from '../lib/telegram';

export type TabType = 'dashboard' | 'lessons' | 'homework' | 'ai_tutor' | 'shop' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingHomeworkCount?: number;
}

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isAi?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onChangeTab,
  pendingHomeworkCount = 0,
}) => {
  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'Главная', icon: Home },
    { id: 'lessons', label: 'Уроки', icon: Calendar },
    { id: 'homework', label: 'ДЗ', icon: CheckSquare, badge: pendingHomeworkCount },
    { id: 'ai_tutor', label: 'ИИ Тьютор', icon: Bot, isAi: true },
    { id: 'shop', label: 'Магазин', icon: ShoppingBag },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#121214]/95 backdrop-blur-lg border-t border-white/5 py-2 px-3">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => {
                triggerHapticFeedback('light');
                onChangeTab(tab.id as TabType);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? tab.isAi
                    ? 'text-purple-400 font-semibold scale-105'
                    : 'text-indigo-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.5px]' : 'stroke-2'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-[#0a0a0c] animate-pulse">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 font-medium tracking-tight whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span
                  className={`absolute bottom-0 w-5 h-0.5 rounded-full ${
                    tab.isAi ? 'bg-purple-400' : 'bg-indigo-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
