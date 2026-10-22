// Locale-aware formatting. No hand-built plurals or dates.

const numberFormat = new Intl.NumberFormat();
const pluralRules = new Intl.PluralRules();

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

/** formatCount(1, 'row') -> "1 row", formatCount(1284, 'row') -> "1,284 rows" */
export function formatCount(n: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(n)} ${pluralRules.select(n) === 'one' ? singular : plural}`;
}

export function formatPercent(probability: number): string {
  return `${Math.round(Math.min(1, Math.max(0, probability)) * 100)}%`;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function formatDate(ts: number): string {
  return dateFormat.format(ts);
}

/** "just now", "5 minutes ago", "yesterday", then an absolute date after a week. */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = ts - now;
  const abs = Math.abs(diff);
  if (abs < 45_000) return 'just now';
  if (abs < 3_600_000) return relativeFormat.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return relativeFormat.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 7 * 86_400_000) return relativeFormat.format(Math.round(diff / 86_400_000), 'day');
  return `${formatDate(ts)}, ${timeFormat.format(ts)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
