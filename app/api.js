// Live make.fun public API, read-only GETs with ETag revalidation.
//
// The API answers any origin (CORS open) and sends an ETag bound to the
// minute: an If-None-Match inside the same minute answers 304, so a
// revisit within the minute costs no body at all. We keep one small
// in-memory cache per URL: fresh answers (under 60 s old) are reused
// without a request, stale ones are revalidated with If-None-Match.

export const API_ORIGIN = "https://make.fun";
export const API_BASE = "https://make.fun/api";

const FRESH_MS = 60_000;

// url -> { etag: string | null, body: unknown, at: number, revalidated: boolean }
const cache = new Map();

export function cacheInfo(url) {
  const hit = cache.get(url);
  return hit ? { at: hit.at, revalidated: hit.revalidated } : null;
}

async function getJson(path) {
  const url = API_BASE + path;
  const hit = cache.get(url);
  const now = Date.now();
  if (hit && now - hit.at < FRESH_MS) return { data: hit.body, fromCache: true, at: hit.at };

  const headers = { Accept: "application/json" };
  if (hit && hit.etag) headers["If-None-Match"] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    hit.revalidated = true;
    return { data: hit.body, fromCache: true, at: hit.at };
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get("etag"), body, at: now, revalidated: false });
  return { data: body, fromCache: false, at: now };
}

// The board: open competitions, newest first from the API. One page holds
// up to `limit` items; `cursor` continues the page the API just gave.
export function loadBoard(cursor = null, limit = 50) {
  const q = new URLSearchParams({ status: "open", limit: String(limit) });
  if (cursor) q.set("cursor", cursor);
  return getJson(`/competitions?${q.toString()}`);
}

export function loadBounty(slug) {
  return getJson(`/competitions/${encodeURIComponent(slug)}`);
}

export function loadLeaderboard(slug, limit = 100) {
  return getJson(`/competitions/${encodeURIComponent(slug)}/leaderboard?limit=${limit}`);
}

export function loadProfile(handle) {
  return getJson(`/profiles/${encodeURIComponent(handle)}`);
}

// Avatars and entry images live on make.fun itself; the API answers them
// with Cross-Origin-Resource-Policy: same-origin, so callers must set
// crossorigin="anonymous" on the <img> before its src.
export function apiImage(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return API_ORIGIN + (path.startsWith("/") ? path : `/${path}`);
}
