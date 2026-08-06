import React from 'react';
import { Flame, Coins, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { StudentProfile, BotInfo } from '../types';
import { triggerHapticFeedback } from '../lib/telegram';

interface HeaderProps {
  profile: StudentProfile;
  botInfo: BotInfo | null;
  onOpenProfile: () => void;
  onOpenShop: () => void;
  onOpenBotInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  botInfo,
  onOpenProfile,
  onOpenShop,
  onOpenBotInfo,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#121214]/90 backdrop-blur-md border-b border-white/5 text-white px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
        {/* Profile Info */}
        <button
          id="header-profile-btn"
          onClick={() => {
            triggerHapticFeedback('light');
            onOpenProfile();
          }}
          className="flex items-center gap-3 group text-left focus:outline-none"
        >
          <div className="relative">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/80 group-hover:scale-105 transition-transform"
            />
            <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-[#0a0a0c] text-white">
              Lvl {profile.level}
            </span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 leading-tight">
              {profile.name}
              <span className="text-xs font-normal text-slate-500">({profile.username})</span>
            </h1>
            <p className="text-[11px] text-indigo-400 font-medium">
              {profile.courseName}
            </p>
          </div>
        </button>

        {/* Status Indicators & Counters */}
        <div className="flex items-center gap-2">
          {/* Streak badge */}
          <div className="flex items-center gap-1 bg-[#16161a] border border-white/5 px-2.5 py-1 rounded-full text-xs font-semibold text-orange-400">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 animate-pulse" />
            <span>{profile.streakDays} дн</span>
          </div>

          {/* Delay Coins */}
          <button
            id="header-coins-btn"
            onClick={() => {
              triggerHapticFeedback('light');
              onOpenShop();
            }}
            className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-full text-xs font-bold text-purple-300 transition-colors"
          >
            <Coins className="w-3.5 h-3.5 text-purple-400" />
            <span>{profile.coins} 🪙</span>
          </button>

          {/* Bot Status Indicator */}
          <button
            id="header-bot-btn"
            onClick={() => {
              triggerHapticFeedback('medium');
              onOpenBotInfo();
            }}
            className={`p-1.5 rounded-full border transition-all ${
              botInfo?.online
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Статус Telegram Бота @Delayschool_bot"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
