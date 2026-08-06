import WebApp from '@twa-dev/sdk';
import { TelegramUser } from '../types';

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).Telegram?.WebApp?.initData);
}

export function getTelegramUser(): TelegramUser | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  return null;
}

export function initTelegramApp() {
  if (typeof window === 'undefined') return;
  try {
    const tg = (window as any).Telegram?.WebApp || WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.enableClosingConfirmation) {
        tg.enableClosingConfirmation();
      }
    }
  } catch (e) {
    console.warn('Telegram WebApp init warning:', e);
  }
}

export function triggerHapticFeedback(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  } catch (e) {
    // Ignore if not in Telegram
  }
}

export function triggerNotificationFeedback(type: 'error' | 'success' | 'warning') {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred(type);
    }
  } catch (e) {
    // Ignore if not in Telegram
  }
}

export function openTelegramLink(url: string) {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  } catch (e) {
    window.open(url, '_blank');
  }
}
