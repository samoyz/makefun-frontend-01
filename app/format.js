// Small formatting helpers. Everything here is pure and unit-free.

/** "$685.00" from a pot string/number; falls back to the raw value. */
export function usd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '—');
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Whole dollars, e.g. "$500", for a reward amount. */
export function usdWhole(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '—');
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** "1,234" with grouping. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : String(value ?? '—');
}

/** Short date, e.g. "17 Nov 2026, 12:30 UTC". */
export function dateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  }) + ' UTC';
}

/** "2d 4h left", "3h 12m left", "41m left", "ended 2h ago", or "—". */
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return '—';
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return '—';
  let ms = end - now;
  const past = ms < 0;
  ms = Math.abs(ms);
  const mins = Math.floor(ms / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  let text;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${rest}m`;
  else text = `${rest}m`;
  return past ? `ended ${text} ago` : `${text} left`;
}

/** True while a bounty still takes entries: deadline ahead, whatever status says. */
export function takesEntries(bounty, now = Date.now()) {
  if (!bounty || !bounty.deadline) return false;
  return new Date(bounty.deadline).getTime() > now;
}

/** A judge win-rate micro value (e.g. 950587) as "95.06%". */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return (n / 10_000).toFixed(2) + '%';
}

/** Bytes as "12.4 KB" / "660.8 KB". */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return v + ' B';
  return (v / 1024).toFixed(1) + ' KB';
}
