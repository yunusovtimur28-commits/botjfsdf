import React, { useState } from 'react';
import {
  User,
  Send,
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  Flame,
  Copy,
  ExternalLink,
  CheckCircle2,
  Bell,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { StudentProfile, BotInfo } from '../types';
import { openTelegramLink, triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';

interface ProfileViewProps {
  profile: StudentProfile;
  botInfo: BotInfo | null;
  onRefreshBot: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, botInfo, onRefreshBot }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const miniAppUrl = botInfo?.telegramLink || 'https://t.me/Delayschool_bot/delaylk';
  const botToken = '8861478620:AAGa98oVaswBGv2u5DuwMIeyONdbCtEF2LQ';

  const copyToClipboard = (text: string, type: 'link' | 'token') => {
    triggerHapticFeedback('light');
    navigator.clipboard.writeText(text);
    if (type === 'link') setCopiedLink(true);
    if (type === 'token') setCopiedToken(true);
    triggerNotificationFeedback('success');
    setTimeout(() => {
      setCopiedLink(false);
      setCopiedToken(false);
    }, 2000);
  };

  return (
    <div className="space-y-5 pb-24 px-4 pt-4 max-w-xl mx-auto text-slate-100">
      {/* Student Profile Card */}
      <div className="bg-[#121216] border border-white/5 rounded-3xl p-5 shadow-xl text-center space-y-3">
        <div className="relative inline-block">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-20 h-20 rounded-full object-cover border-4 border-indigo-500 mx-auto shadow-md"
          />
          <span className="absolute bottom-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full border-2 border-[#0a0a0c]">
            {profile.level} Lvl
          </span>
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{profile.name}</h2>
          <p className="text-xs text-indigo-400 font-semibold mt-0.5">{profile.username}</p>
          <p className="text-xs text-slate-400 mt-1">{profile.courseName} • {profile.groupName}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
          <div className="bg-[#0a0a0c] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Сдано ДЗ</span>
            <span className="text-sm font-extrabold text-white">
              {profile.completedHomeworks} / {profile.totalHomeworks}
            </span>
          </div>

          <div className="bg-[#0a0a0c] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Серия заходов</span>
            <span className="text-sm font-extrabold text-orange-400 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-orange-500" /> {profile.streakDays} дн
            </span>
          </div>

          <div className="bg-[#0a0a0c] p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Посещаемость</span>
            <span className="text-sm font-extrabold text-emerald-400">{profile.attendanceRate}%</span>
          </div>
        </div>
      </div>

      {/* Telegram Bot Integration Details (Key Requirement) */}
      <div className="bg-[#121216] border border-white/5 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Telegram Bot & Mini App
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h3>
              <p className="text-[11px] text-slate-400">Настройки запуска и интеграции</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHapticFeedback('light');
              onRefreshBot();
            }}
            className="p-1.5 rounded-lg bg-[#18181e] text-slate-400 hover:text-white border border-white/5"
            title="Обновить статус бота"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Telegram Direct Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Прямая ссылка на Mini App (Telegram WebApp):
          </label>
          <div className="flex items-center gap-2 bg-[#0a0a0c] border border-white/10 rounded-xl p-2.5 text-xs">
            <span className="font-mono text-indigo-300 truncate flex-1">{miniAppUrl}</span>
            <button
              onClick={() => copyToClipboard(miniAppUrl, 'link')}
              className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedLink && (
            <span className="text-[11px] text-emerald-400 font-semibold block">
              ✓ Ссылка скопирована в буфер обмена!
            </span>
          )}
        </div>

        {/* Telegram Bot Token Info */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Telegram Bot API Token:
          </label>
          <div className="flex items-center gap-2 bg-[#0a0a0c] border border-white/10 rounded-xl p-2.5 text-xs">
            <span className="font-mono text-slate-400 truncate flex-1">
              8861478620:AAGa...EF2LQ
            </span>
            <button
              onClick={() => copyToClipboard(botToken, 'token')}
              className="p-1.5 rounded-lg bg-[#18181e] text-slate-300 hover:bg-[#202028] transition-colors border border-white/5"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {copiedToken && (
            <span className="text-[11px] text-emerald-400 font-semibold block">
              ✓ Токен скопирован!
            </span>
          )}
        </div>

        {/* Telegram Launch Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              triggerHapticFeedback('medium');
              openTelegramLink(miniAppUrl);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Запустить в Telegram (t.me/Delayschool_bot)</span>
          </button>
        </div>
      </div>

      {/* Settings & Support */}
      <div className="bg-[#121216] border border-white/5 rounded-3xl p-4 shadow-md space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Настройки аккаунта
        </h3>

        <button
          onClick={() => {
            triggerHapticFeedback('light');
            alert('Уведомления личного кабинета включены!');
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0a0a0c] hover:bg-[#16161c] text-xs text-slate-200 transition-colors border border-white/5"
        >
          <span className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-purple-400" /> Уведомления об уроках и ДЗ
          </span>
          <span className="text-emerald-400 font-bold">Включено</span>
        </button>

        <button
          onClick={() => {
            triggerHapticFeedback('light');
            openTelegramLink('https://t.me/delay_school_support');
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-[#0a0a0c] hover:bg-[#16161c] text-xs text-slate-200 transition-colors border border-white/5"
        >
          <span className="flex items-center gap-2.5">
            <Send className="w-4 h-4 text-indigo-400" /> Связаться с поддержкой / куратором
          </span>
          <span className="text-slate-400">@delay_support →</span>
        </button>
      </div>
    </div>
  );
};
