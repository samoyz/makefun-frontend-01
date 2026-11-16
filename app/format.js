// Small pure formatters. Every one of them is used by the views; none of
// them touches the network or the DOM.

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function moneyUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function whole(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("en-US") : "—";
}

// Win rates arrive as micro units: 950587 means a 95.0587% win rate.
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return "—";
  return (n / 10000).toFixed(1) + "%";
}

export function fullDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });
}

// How long until a deadline, or how long ago it passed. A bounty past its
// deadline takes no entries even when the API still calls it open.
export function timeLeft(iso, nowMs) {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return { label: "—", open: false };
  const now = nowMs || Date.now();
  const diff = end - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  let label;
  if (days > 0) label = days + "d " + hours + "h left";
  else if (hours > 0) label = hours + "h " + minutes + "m left";
  else label = minutes + "m left";
  if (diff < 0) label = "Ended " + (days > 0 ? days + "d " + hours + "h" : hours + "h " + minutes + "m") + " ago";
  return { label, open: diff > 0 };
}

export function shortText(text, max) {
  const t = String(text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// Turn a plain-text description into safe paragraphs. The API hands us
// markdown-ish text; we show it as text, never as HTML.
export function paragraphs(text) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => "<p>" + esc(chunk) + "</p>")
    .join("");
}
