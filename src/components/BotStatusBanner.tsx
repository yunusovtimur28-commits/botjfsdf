import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { BotInfo } from '../types';
import { openTelegramLink, triggerHapticFeedback, triggerNotificationFeedback } from '../lib/telegram';

interface BotStatusBannerProps {
  botInfo: BotInfo | null;
  onRefresh: () => void;
}

export const BotStatusBanner: React.FC<BotStatusBannerProps> = ({ botInfo, onRefresh }) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const tgLink = botInfo?.telegramLink || 'https://botjfsdf-production.up.railway.app';
  const botDirect = botInfo?.botDirectLink || 'https://t.me/Delayschool_bot';

  const handleCopyLink = () => {
    triggerHapticFeedback('light');
    navigator.clipboard.writeText(tgLink);
    setCopied(true);
    triggerNotificationFeedback('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSync = async () => {
    triggerHapticFeedback('medium');
    setIsSyncing(true);
    try {
      const currentUrl = window.location.href;
      await fetch('/api/bot-configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appUrl: currentUrl }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#121218] via-[#161624] to-[#121218] border border-white/5 rounded-2xl p-4 shadow-xl text-slate-100 mb-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Telegram Bot @Delayschool_bot
              </h3>
              {botInfo?.online ? (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Бот Активен
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                  <AlertCircle className="w-3 h-3" /> Проверка API
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Запуск по команде <code className="text-indigo-300 bg-[#0a0a0c] px-1.5 py-0.5 rounded border border-white/5">/start</code> или по ссылке mini app
            </p>
          </div>
        </div>

        <button
          id="bot-status-refresh-btn"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="p-2 rounded-lg bg-[#18181e] hover:bg-[#202028] text-slate-400 hover:text-white transition-colors border border-white/5"
          title="Синхронизировать WebApp URL с Telegram Bot Menu Button"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Direct Telegram mini app link info */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs mb-3">
        <div className="truncate font-mono text-indigo-300">
          {tgLink}
        </div>
        <button
          id="bot-copy-link-btn"
          onClick={handleCopyLink}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-100 font-medium transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
        </button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          id="bot-open-telegram-btn"
          onClick={() => {
            triggerHapticFeedback('medium');
            openTelegramLink(tgLink);
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-md transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Открыть в Telegram</span>
        </button>

        <button
          id="bot-start-command-btn"
          onClick={() => {
            triggerHapticFeedback('medium');
            openTelegramLink(botDirect);
          }}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#18181e] hover:bg-[#22222b] border border-white/5 text-slate-200 text-xs font-semibold transition-all"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Написать /start Боту</span>
        </button>
      </div>
    </div>
  );
};
