// The router: four surfaces, each a link and its own URL (hash routes).
//
//   #/                                  the bounty board
//   #/bounty/<slug>                     one bounty
//   #/bounty/<slug>/leaderboard[/<n>]   that bounty's leaderboard, page n
//   #/u/<handle>                        an account's public profile
//
// window.__shotReady is false while a route loads and true once its data is on
// screen, so a screenshot script knows when to capture. The leaderboard and
// profile views live in extra.js and load on demand, so the first load stays
// small. Times left tick every 30 s without a refetch.

import { getBounties, getBounty, getLeaderboard, getProfile, netStats } from './api.js';
import { board, bounty } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');
const netstat = document.getElementById('netstat');
const state = { q: '', sort: 'deadline' };
let boardData = null;
let extraPromise = null;

const loadExtra = () => (extraPromise ??= import('./extra.js'));

function showNet() {
  const s = netStats();
  netstat.textContent = s.sent
    ? `${s.sent} request${s.sent === 1 ? '' : 's'} · ${s.served} served from cache · ${s.notModified} revalidated (304)`
    : 'no requests yet';
}

function parseRoute() {
  const parts = (location.hash || '#/').slice(1).split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1]) {
    if (parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1], page: Number(parts[3]) || 1 };
    if (parts.length === 2) return { name: 'bounty', slug: parts[1] };
  }
  if (parts[0] === 'u' && parts[1] && parts.length === 2) return { name: 'profile', handle: parts[1] };
  return { name: 'notfound' };
}

function errorView(err, what) {
  const notFound = err?.status === 404;
  return `<h1>${notFound ? 'Not found' : 'Something went wrong'}</h1>
  <p>${notFound ? `There is no ${what} by that name on make.fun.` : 'make.fun did not answer. Check your connection and try again.'}</p>
  <p><button id="retry" type="button">Try again</button> <a href="#/">Back to the board</a></p>`;
}

function notFoundView() {
  return `<h1>Page not found</h1><p>This address has no page here.</p><p><a href="#/">Back to the board</a></p>`;
}

function focusHeading() {
  const h = app.querySelector('h1');
  if (h) {
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
}

function bindTools() {
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  if (q) {
    q.addEventListener('input', () => {
      state.q = q.value;
      renderBoardOnly();
      const again = document.getElementById('q');
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    });
  }
  if (sort) {
    sort.addEventListener('change', () => {
      state.sort = sort.value;
      renderBoardOnly();
      document.getElementById('sort').focus();
    });
  }
}

function renderBoardOnly() {
  if (!boardData) return;
  app.innerHTML = board(boardData, state);
  bindTools();
}

async function render() {
  window.__shotReady = false;
  const route = parseRoute();
  try {
    if (route.name === 'board') {
      boardData ??= await getBounties();
      document.title = 'make.fun bounties';
      renderBoardOnly();
    } else if (route.name === 'bounty') {
      const b = await getBounty(route.slug);
      document.title = `${b.title} · make.fun bounties`;
      app.innerHTML = bounty(b);
    } else if (route.name === 'leaderboard') {
      const [lb, extra] = await Promise.all([getLeaderboard(route.slug), loadExtra()]);
      document.title = `${lb.competition.title} leaderboard · make.fun bounties`;
      app.innerHTML = extra.leaderboard(lb, route.page);
    } else if (route.name === 'profile') {
      const [p, extra] = await Promise.all([getProfile(route.handle), loadExtra()]);
      document.title = `@${p.handle} · make.fun bounties`;
      app.innerHTML = extra.profile(p);
    } else {
      document.title = 'Not found · make.fun bounties';
      app.innerHTML = notFoundView();
    }
    window.scrollTo(0, 0);
    focusHeading();
  } catch (err) {
    const what = route.name === 'profile' ? 'profile' : route.name === 'bounty' || route.name === 'leaderboard' ? 'bounty' : 'page';
    document.title = 'Error · make.fun bounties';
    app.innerHTML = errorView(err, what);
    document.getElementById('retry')?.addEventListener('click', render);
  }
  showNet();
  window.__shotReady = true;
}

// Times left tick without a refetch: every 30 s, recompute the text of each
// element that carries a deadline.
setInterval(() => {
  for (const el of document.querySelectorAll('[data-deadline]')) el.textContent = timeLeft(el.dataset.deadline);
  for (const el of document.querySelectorAll('[data-deadline-full]')) {
    const iso = el.dataset.deadlineFull;
    el.textContent = `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC (${timeLeft(iso)})`;
  }
}, 30_000);

// An avatar that fails to load (a removed image, an offline moment) is hidden
// instead of showing a broken-image icon.
document.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG') e.target.style.display = 'none';
  },
  true,
);

window.addEventListener('hashchange', render);
render();
