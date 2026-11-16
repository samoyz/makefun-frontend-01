// Small pure formatters: money, countdowns, dates and numbers.
// Nothing here touches the network or the DOM.

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const whole = new Intl.NumberFormat("en-US");

const dayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  hour12: false,
});

// The API hands money back as a decimal string ("685.50") or a number.
export function money(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? usd.format(n) : "—";
}

export function count(value) {
  if (value === null || value === undefined) return "—";
  return whole.format(value);
}

// A judge win rate arrives as micro units (950587 = 95.0587%).
export function winRate(micro) {
  if (micro === null || micro === undefined) return "—";
  return `${(micro / 10_000).toFixed(2)}%`;
}

export function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${dayFmt.format(d)} ${timeFmt.format(d)} UTC`;
}

// "2d 5h left", "41m left", or "ended 3h ago". A bounty past its deadline
// may still read status open, so the deadline — not the status — decides.
export function timeLeft(iso, now = Date.now()) {
  if (!iso) return "—";
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return "—";
  let diff = end - now;
  const past = diff < 0;
  diff = Math.abs(diff);
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  let span;
  if (days >= 1) span = `${days}d ${hours % 24}h`;
  else if (hours >= 1) span = `${hours}h ${mins % 60}m`;
  else span = `${mins}m`;
  return past ? `ended ${span} ago` : `${span} left`;
}

export function isOpen(deadlineIso, status, now = Date.now()) {
  if (!deadlineIso) return status === "open";
  return new Date(deadlineIso).getTime() > now;
}

// First paragraph of a bounty description, for the board card.
export function firstParagraph(text) {
  if (!text) return "";
  const clean = text.replace(/^#+\s.*$/gm, "").trim();
  const para = clean.split(/\n\s*\n/)[0] || "";
  return para.replace(/\s+/g, " ").trim();
}

// Plain handle: letters, digits, dash, underscore; anything else is rejected
// before it ever reaches the API.
export function cleanHandle(raw) {
  return (raw || "").trim().replace(/^@/, "").toLowerCase();
}

export function validHandle(handle) {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(handle);
}
