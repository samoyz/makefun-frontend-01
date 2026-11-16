// Beacon router: hash routes for the four surfaces, one view at a time.
//   #/                        the live bounty board
//   #/bounty/<slug>           one bounty's page
//   #/leaderboard/<slug>      that bounty's leaderboard
//   #/u/<handle>              an account's public profile
//
// The app sets window.__shotReady false while a route loads and true once
// its data has rendered, so screenshots can wait for real content.

import { onNetStats } from './api.js';
import { renderBoard, renderBounty, renderLeaderboard, renderProfile } from './views.js';

const view = document.getElementById('view');
const netstat = document.getElementById('netstat');

onNetStats(({ requests, servedFromCache }) => {
  netstat.textContent = `${requests} request${requests === 1 ? '' : 's'} · ${servedFromCache} served from cache`;
});

function markNav(route) {
  for (const a of document.querySelectorAll('[data-nav]')) {
    const kind = a.getAttribute('data-nav');
    const current =
      (kind === 'board' && route === 'board') ||
      (kind === 'bounty' && route === 'bounty') ||
      (kind === 'leaderboard' && route === 'leaderboard') ||
      (kind === 'profile' && route === 'profile');
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [head, ...rest] = hash.split('/');
  const arg = rest.map(decodeURIComponent).join('/');
  if (!head) return { route: 'board' };
  if (head === 'bounty' && arg) return { route: 'bounty', arg };
  if (head === 'leaderboard' && arg) return { route: 'leaderboard', arg };
  if (head === 'u' && arg) return { route: 'profile', arg };
  return { route: 'board' };
}

async function route() {
  const { route: name, arg } = parseHash();
  window.__shotReady = false;
  markNav(name);
  const done = () => {
    window.__shotReady = true;
    const h = view.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  };
  try {
    if (name === 'bounty') await renderBounty(view, arg, { onReady: done });
    else if (name === 'leaderboard') await renderLeaderboard(view, arg, { onReady: done });
    else if (name === 'profile') await renderProfile(view, arg, { onReady: done });
    else await renderBoard(view, { onReady: done });
  } catch (err) {
    view.replaceChildren();
    const box = document.createElement('div');
    box.className = 'error';
    box.setAttribute('role', 'alert');
    box.textContent = 'Something went wrong rendering this view: ' + (err && err.message ? err.message : err);
    view.append(box);
    done();
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);

// "/" focuses the board filter when one is on screen.
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.target.matches('input, textarea, select')) return;
  const search = view.querySelector('input[type="search"]');
  if (search) {
    e.preventDefault();
    search.focus();
  }
});

route();
