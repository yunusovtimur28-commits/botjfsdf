/**
 * Utility functions for date formatting and timers in Russian locale.
 */

const RUSSIAN_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const SHORT_MONTHS_MAP: Record<string, string> = {
  янв: 'января',
  фев: 'февраля',
  мар: 'марта',
  апр: 'апреля',
  май: 'мая',
  мая: 'мая',
  июн: 'июня',
  июл: 'июля',
  авг: 'августа',
  сен: 'сентября',
  окт: 'октября',
  ноя: 'ноября',
  дек: 'декабря',
};

const COURSE_MONTH_NAMES = [
  'Январь 2026',
  'Февраль 2026',
  'Март 2026',
  'Апрель 2026',
  'Май 2026',
  'Июнь 2026',
  'Июль 2026',
  'Август 2026',
  'Сентябрь 2026',
  'Октябрь 2026',
  'Ноябрь 2026',
  'Декабрь 2026',
];

/**
 * Returns current month label like "Октябрь 2026"
 */
export function getCurrentMonthLabel(): string {
  const now = new Date();
  const m = now.getMonth();
  return COURSE_MONTH_NAMES[m] || 'Октябрь 2026';
}

/**
 * Returns formatted date and time for notifications / submissions, e.g. "8 окт., 14:30"
 */
export function getFormattedDateTime(inputDate?: Date | number | string): string {
  const d = inputDate ? new Date(inputDate) : new Date();
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Returns today's date in YYYY-MM-DD format based on local time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Formats seconds into mm:ss string (e.g. 125 -> "02:05")
 */
export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats dates (ISO YYYY-MM-DD, short Russian '03 Авг', '03 Авг 2026', DD.MM.YYYY, etc.)
 * into a human-friendly Russian string like "8 октября 2026" or "3 августа".
 */
export function formatRussianDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed.toLowerCase() === 'сегодня') return '';

  // 1. Matches "YYYY-MM-DD"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${RUSSIAN_MONTHS[monthIdx]} ${year}`;
    }
  }

  // 2. Matches "DD.MM.YYYY"
  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    const day = parseInt(dotMatch[1], 10);
    const monthIdx = parseInt(dotMatch[2], 10) - 1;
    const year = dotMatch[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${RUSSIAN_MONTHS[monthIdx]} ${year}`;
    }
  }

  // 3. Matches "03 Авг" or "03 Авг 2026"
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length >= 2) {
    const dayNum = parseInt(spaceParts[0], 10);
    const rawMon = spaceParts[1].toLowerCase().slice(0, 3);
    const fullMon = SHORT_MONTHS_MAP[rawMon];
    if (!isNaN(dayNum) && fullMon) {
      const year = spaceParts[2] ? ` ${spaceParts[2]}` : '';
      return `${dayNum} ${fullMon}${year}`;
    }
  }

  return trimmed;
}
