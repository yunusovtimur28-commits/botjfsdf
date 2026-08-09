/**
 * Utility functions for Russian dates and times
 */

export function getCurrentMonthLabel(date = new Date()): string {
  const monthName = date.toLocaleDateString('ru-RU', { month: 'long' });
  const year = date.getFullYear();
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capMonth} ${year}`;
}

export function getFormattedDateTime(date = new Date()): string {
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${dayMonth}, ${time}`;
}
