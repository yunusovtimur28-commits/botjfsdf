// Получаем платформу, если приложение открыто внутри Telegram
export const getTgPlatform = (): string => {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp.platform || 'unknown';
  }
  return 'unknown';
};

// Умная проверка на десктоп
export const isDesktopScreen = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const tgPlatform = getTgPlatform();
  
  // 1. Если открыто в Telegram на ПК (macOS, Windows, Web Telegram)
  if (['macos', 'tdesktop', 'weba', 'webk'].includes(tgPlatform)) {
    return true;
  }
  // 2. Если открыто в Telegram на телефоне
  if (['ios', 'android', 'android_x'].includes(tgPlatform)) {
    return false;
  }
  
  // 3. Если открыто в обычном браузере по ссылке (Safari, Chrome) — проверяем ширину экрана
  return window.innerWidth > 768;
};
