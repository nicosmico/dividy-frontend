const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Today's date as `YYYY-MM-DD` in the user's **local** time zone (not UTC:
 * `toISOString()` would return tomorrow's date in the evening in Chile).
 */
export function todayLocal(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formats a `YYYY-MM-DD` date (read as a local calendar day, so it never
 * shifts by time zone) or an ISO timestamp as, e.g., `5 may 2026`.
 */
export function formatDate(value: string): string {
  const match = DATE_ONLY.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date).replace(/\./g, '');
}
