// Read-only client for make.fun's public API (https://make.fun/api/...).
// GET only, no sign-in, no writes. Answers are cached in memory for one
// minute so a route change back to a view you just saw costs no request.

const API_BASE = "https://make.fun/api";
const TTL_MS = 60_000;
const cache = new Map();

export async function fetchJson(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const res = await fetch(API_BASE + path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("make.fun API answered " + res.status + " for " + path);
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

export function boardPath(limit) {
  return "/competitions?status=open&limit=" + String(limit || 100);
}

export function bountyPath(slug) {
  return "/competitions/" + encodeURIComponent(slug);
}

export function leaderboardPath(slug) {
  return "/competitions/" + encodeURIComponent(slug) + "/leaderboard";
}

export function profilePath(handle) {
  return "/profiles/" + encodeURIComponent(handle.replace(/^@/, ""));
}

export function avatarUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return "https://make.fun" + path;
}
