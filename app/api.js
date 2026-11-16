// make.fun's public API, read-only GETs, open to any origin (CORS).
// Every answer is cached and revalidated with its ETag: the API sends ETags
// bound to the minute, so an If-None-Match inside the same minute answers 304
// and costs no body. A fresh answer (under 60 s old) is served without any
// request at all; a stale one is revalidated, and a failed revalidation falls
// back to the cached body. Counters feed the footer: requests sent, 304s, bytes.

const API = 'https://make.fun/api';
const TTL_MS = 60_000;

const memory = new Map(); // path -> { etag, body, at }
let sent = 0;
let served = 0;
let notModified = 0;
let bytesSaved = 0;

function readStore(path) {
  try {
    const raw = localStorage.getItem(`mf:${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStore(path, entry) {
  try {
    localStorage.setItem(`mf:${path}`, JSON.stringify(entry));
  } catch {
    // storage full or unavailable: memory cache still works
  }
}

function cached(path) {
  return memory.get(path) ?? readStore(path);
}

export function netStats() {
  return { sent, served, notModified, bytesSaved };
}

async function get(path) {
  const hit = cached(path);
  if (hit && Date.now() - hit.at < TTL_MS) {
    served += 1;
    return hit.body;
  }

  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  sent += 1;
  let res;
  try {
    res = await fetch(API + path, { headers });
  } catch (err) {
    if (hit) {
      served += 1;
      return hit.body; // offline: show the last good answer
    }
    throw err;
  }
  if (res.status === 304 && hit) {
    notModified += 1;
    served += 1;
    const fresh = { ...hit, at: Date.now() };
    memory.set(path, fresh);
    writeStore(path, fresh);
    return hit.body;
  }
  if (!res.ok) {
    if (hit) {
      served += 1;
      return hit.body;
    }
    const err = new Error(`make.fun answered ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('etag');
  const entry = { etag, body, at: Date.now() };
  if (hit?.body) bytesSaved += JSON.stringify(hit.body).length;
  memory.set(path, entry);
  writeStore(path, entry);
  return body;
}

/** The open bounties, newest activity first. */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard (ranked entries with win rates). */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
