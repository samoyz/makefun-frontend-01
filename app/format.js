// Small helpers for showing API values. All output is plain text; views escape
// it before putting it in HTML.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', '0.50' or 250) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** An ISO date as a short UTC date + time. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** The time until a deadline: '2d 4h left', '35m left', '12s left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${Math.floor(ms / 1000)}s left`;
}

/** How long ago an ISO time was: '3h ago', '2d ago', 'just now'. */
export function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || ms < 60_000) return 'just now';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** A win-rate in millionths (950587) as '95.1%'. */
export function pct(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10_000).toFixed(1)}%`;
}

/** A byte count as '645 KB' or '1.2 MB'. */
export function bytes(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(v < 10240 ? 1 : 0)} KB`;
  return `${(v / (1024 * 1024)).toFixed(1)} MB`;
}

/** '1 entry' / '351 entries'. */
export function plural(n, one, many) {
  return `${Number(n ?? 0).toLocaleString('en-US')} ${Number(n) === 1 ? one : many}`;
}

/**
 * An image URL the API points at, as an absolute URL. The API returns a mix:
 * relative paths ('/api/avatars/….webp'), absolute URLs
 * ('https://avatars.githubusercontent.com/…') and protocol-relative URLs
 * ('//avatars.githubusercontent.com/…'). Only a relative path is resolved
 * against make.fun.
 */
export function imgUrl(url) {
  const u = String(url ?? '');
  if (!u) return '';
  if (u.startsWith('https://') || u.startsWith('http://')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `https://make.fun${u}`;
  return `https://make.fun/${u}`;
}
