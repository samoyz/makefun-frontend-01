// Beacon API client: GET-only reads of the make.fun public API, with
// ETag revalidation (a 304 costs nothing) and a short in-memory cache so
// going back to a view you just left costs zero requests.

const BASE = 'https://make.fun/api';
const TTL_MS = 60_000;

// url -> { etag, body, at }
const cache = new Map();

let requests = 0;
let servedFromCache = 0;
const listeners = new Set();

export function onNetStats(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function note() {
  const s = { requests, servedFromCache };
  for (const fn of listeners) fn(s);
}

/** Fetch JSON from a path like `/competitions?status=open`. */
export async function getJson(path) {
  const url = BASE + path;
  const hit = cache.get(url);
  const fresh = hit && Date.now() - hit.at < TTL_MS;
  if (fresh) {
    servedFromCache++;
    note();
    return hit.body;
  }
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  requests++;
  note();
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    servedFromCache++;
    note();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
  return body;
}

export function boardUrl(limit = 100) {
  return `/competitions?status=open&limit=${limit}`;
}

export function bountyUrl(slug) {
  return `/competitions/${encodeURIComponent(slug)}`;
}

export function leaderboardUrl(slug) {
  return `/competitions/${encodeURIComponent(slug)}/leaderboard`;
}

export function profileUrl(handle) {
  return `/profiles/${encodeURIComponent(handle)}`;
}
