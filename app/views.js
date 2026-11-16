// Beacon views: board, bounty, leaderboard, profile.
// Every view builds DOM nodes and sets text with textContent, so nothing
// the API returns is ever parsed as HTML.

import { getJson, boardUrl, bountyUrl, leaderboardUrl, profileUrl } from './api.js';
import { usd, usdWhole, num, dateShort, timeLeft, takesEntries, winRate, bytes } from './format.js';

const PAGE = 25;

/** el('h2', { class: 'x' }, 'text', childNode, ...) */
export function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'href' || k === 'src' || k === 'alt' || k === 'colspan') node.setAttribute(k, v);
      else if (k.startsWith('aria-') || k === 'role' || k === 'tabindex' || k === 'id') node.setAttribute(k, v);
      else if (k === 'crossorigin') node.setAttribute('crossorigin', v);
      else node[k] = v;
    }
  }
  for (const kid of kids) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function link(href, text, attrs = {}) {
  return el('a', { href, ...attrs }, text);
}

function statRow(label, value, cls) {
  const s = el('span', {}, label + ' ');
  s.append(el('b', { class: cls || '' }, value));
  return s;
}

function errorBox(err) {
  const box = el('div', { class: 'error', role: 'alert' });
  box.append(el('h2', {}, 'Could not load this view'));
  const msg = err && err.status === 404
    ? 'make.fun answered 404 — this bounty, leaderboard or profile does not exist.'
    : 'The make.fun API did not answer. Check your connection and try again.';
  box.append(el('p', {}, msg));
  if (err && err.message) box.append(el('p', { class: 'small muted' }, err.message));
  const retry = el('button', { type: 'button' }, 'Retry');
  retry.addEventListener('click', () => location.reload());
  box.append(retry);
  return box;
}

/* ---------------- board ---------------- */

export async function renderBoard(root, { onReady }) {
  root.append(el('p', { class: 'loading' }, 'Loading live bounties…'));
  let data;
  try {
    data = await getJson(boardUrl(100));
  } catch (err) {
    root.replaceChildren(errorBox(err));
    onReady();
    return;
  }
  const items = Array.isArray(data.items) ? data.items.slice() : [];
  root.replaceChildren();

  root.append(el('h1', { tabindex: '-1' }, 'Live bounties'));
  root.append(el('p', { class: 'lede' },
    'Every bounty taking entries on make.fun right now, with its live pot, entry fee and time left.'));

  const bar = el('div', { class: 'toolbar' });
  const search = el('input', { type: 'search', placeholder: 'Filter by title, skill or category…', 'aria-label': 'Filter bounties' });
  const sort = el('select', { 'aria-label': 'Sort bounties' });
  for (const [v, t] of [['pot', 'Biggest pot first'], ['soon', 'Ending soonest'], ['entries', 'Most entries'], ['az', 'Title A–Z']]) {
    sort.append(el('option', { value: v }, t));
  }
  const onlyOpen = el('label', {}, el('input', { type: 'checkbox', checked: true }), ' still open');
  const count = el('span', { class: 'count', 'aria-live': 'polite' });
  bar.append(search, sort, onlyOpen, count);
  root.append(bar);

  const list = el('ul', { class: 'grid' });
  root.append(list);
  const moreWrap = el('div', { class: 'pager' });
  const more = el('button', { type: 'button' }, 'Show more');
  moreWrap.append(more);
  root.append(moreWrap);

  let shown = 0;
  const PER_PAGE = 24;

  function filtered() {
    const q = search.value.trim().toLowerCase();
    let rows = items.filter((b) => {
      if (onlyOpen.querySelector('input').checked && !takesEntries(b)) return false;
      if (!q) return true;
      const hay = [b.title, b.category, (b.skills || []).join(' '), b.slug].join(' ').toLowerCase();
      return hay.includes(q);
    });
    const key = sort.value;
    rows = rows.slice().sort((a, b) => {
      if (key === 'pot') return Number(b.potUsd || b.rewardAmount || 0) - Number(a.potUsd || a.rewardAmount || 0);
      if (key === 'soon') return new Date(a.deadline) - new Date(b.deadline);
      if (key === 'entries') return (b.submissionCount || 0) - (a.submissionCount || 0);
      return String(a.title).localeCompare(String(b.title));
    });
    return rows;
  }

  function card(b) {
    const li = el('li', { class: 'card' });
    li.append(el('span', { class: 'cat' }, b.category || 'Bounty'));
    const h = el('h3', {});
    h.append(link('#/bounty/' + b.slug, b.title || b.slug));
    li.append(h);
    if (b.summary || b.description) {
      const text = (b.summary || b.description).split('\n')[0];
      li.append(el('p', {}, text.length > 140 ? text.slice(0, 137) + '…' : text));
    }
    const stats = el('div', { class: 'stats' });
    stats.append(statRow('Pot', usd(b.potUsd ?? b.rewardAmount), 'pot'));
    if (b.entryFeeUsd != null) stats.append(statRow('Fee', usd(b.entryFeeUsd), 'fee'));
    const open = takesEntries(b);
    stats.append(statRow(open ? 'Ends' : 'Ended', timeLeft(b.deadline), open ? 'open-now' : 'closed'));
    stats.append(statRow('Entries', num(b.submissionCount), ''));
    li.append(stats);
    return li;
  }

  function draw(reset) {
    if (reset) shown = 0;
    const rows = filtered();
    const next = rows.slice(0, shown + PER_PAGE);
    list.replaceChildren(...next.map(card));
    shown = next.length;
    count.textContent = `${num(rows.length)} ${rows.length === 1 ? 'bounty' : 'bounties'} · showing ${num(shown)}`;
    more.disabled = shown >= rows.length;
    moreWrap.style.display = rows.length > PER_PAGE ? '' : 'none';
  }

  search.addEventListener('input', () => draw(true));
  sort.addEventListener('change', () => draw(true));
  onlyOpen.querySelector('input').addEventListener('change', () => draw(true));
  more.addEventListener('click', () => draw(false));
  draw(true);
  onReady();
}

/* ---------------- bounty ---------------- */

function markdownParagraphs(text) {
  // Safe subset: "## " headings, blank-line paragraphs, plain text.
  const out = [];
  for (const block of String(text || '').split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t) continue;
    if (t.startsWith('## ')) out.push(el('h3', {}, t.slice(3).trim()));
    else if (t.startsWith('# ')) out.push(el('h2', {}, t.slice(2).trim()));
    else out.push(el('p', {}, t));
  }
  return out;
}

export async function renderBounty(root, slug, { onReady }) {
  root.append(el('p', { class: 'loading' }, 'Loading bounty…'));
  let b;
  try {
    b = await getJson(bountyUrl(slug));
  } catch (err) {
    root.replaceChildren(errorBox(err));
    onReady();
    return;
  }
  root.replaceChildren();
  const open = takesEntries(b);

  root.append(el('h1', { tabindex: '-1' }, b.title || slug));
  root.append(el('p', { class: 'lede' }, b.summary || ''));
  const status = el('p', {},
    el('b', { class: open ? 'open-now' : 'closed' },
      open ? '● Taking entries' : '● Closed to entries'),
    ` — ${b.status || ''} · ${b.category || ''} · ${num(b.submissionCount)} entries`);
  root.append(status);

  const kv = el('dl', { class: 'kv' });
  const pot = el('div', {}, el('dt', {}, 'Live pot'), el('dd', {}, usd(b.potUsd ?? b.rewardAmount)));
  kv.append(pot);
  kv.append(el('div', {}, el('dt', {}, 'Base reward'), el('dd', {}, usdWhole(b.rewardAmount))));
  kv.append(el('div', {}, el('dt', {}, 'Entry fee'),
    el('dd', {}, b.entryFeeUsd != null ? usd(b.entryFeeUsd) : 'Free')));
  kv.append(el('div', {}, el('dt', {}, 'Time left'), el('dd', {}, timeLeft(b.deadline))));
  kv.append(el('div', {}, el('dt', {}, 'Deadline'), el('dd', {}, dateShort(b.deadline))));
  if (b.entryFeePayers != null) {
    kv.append(el('div', {}, el('dt', {}, 'Fee payers'), el('dd', {}, num(b.entryFeePayers))));
  }
  root.append(kv);

  root.append(el('p', {},
    link('#/leaderboard/' + b.slug, 'See the leaderboard →'),
    ' · ',
    link('https://make.fun/bounty/' + b.slug, 'Open on make.fun ↗')));

  root.append(el('h2', {}, 'About this bounty'));
  root.append(...markdownParagraphs(b.description || ''));

  if (b.rules) {
    const det = el('details', { class: 'rules' });
    det.append(el('summary', {}, 'Rules'));
    det.append(el('div', { class: 'body' }, b.rules));
    root.append(det);
  }

  if (Array.isArray(b.rewardsNow) && b.rewardsNow.length) {
    root.append(el('h2', {}, 'Rewards — live pot split'));
    const table = el('table', {});
    table.append(el('thead', {}, el('tr', {},
      el('th', { class: 'num' }, 'Place'),
      el('th', { class: 'num' }, 'Base'),
      el('th', { class: 'num' }, 'Fee share'),
      el('th', { class: 'num' }, 'Total now'))));
    const body = el('tbody', {});
    for (const r of b.rewardsNow) {
      body.append(el('tr', {},
        el('td', { class: 'num' }, '#' + r.place),
        el('td', { class: 'num' }, usd(r.baseUsd)),
        el('td', { class: 'num' }, usd(r.feeShareUsd)),
        el('td', { class: 'num' }, el('b', {}, usd(r.amountUsd)))));
    }
    table.append(body);
    root.append(table);
  }

  if (Array.isArray(b.submissions) && b.submissions.length) {
    root.append(el('h2', {}, `Latest entries (${num(b.submissionCount || b.submissions.length)})`));
    const table = el('table', {});
    table.append(el('thead', {}, el('tr', {},
      el('th', {}, 'Entry'),
      el('th', {}, 'By'),
      el('th', { class: 'hide-sm' }, 'Entered'))));
    const body = el('tbody', {});
    for (const s of b.submissions.slice(0, 20)) {
      body.append(el('tr', {},
        el('td', {}, s.title || '—'),
        el('td', {}, link('#/u/' + s.hunter, '@' + s.hunter)),
        el('td', { class: 'hide-sm' }, dateShort(s.createdAt))));
    }
    table.append(body);
    root.append(table);
  }
  onReady();
}

/* ---------------- leaderboard ---------------- */

export async function renderLeaderboard(root, slug, { onReady }) {
  root.append(el('p', { class: 'loading' }, 'Loading leaderboard…'));
  let lb;
  try {
    lb = await getJson(leaderboardUrl(slug));
  } catch (err) {
    root.replaceChildren(errorBox(err));
    onReady();
    return;
  }
  const entries = Array.isArray(lb.entries) ? lb.entries : [];
  root.replaceChildren();

  root.append(el('h1', { tabindex: '-1' }, `Leaderboard — ${lb.competition?.title || slug}`));
  root.append(el('p', { class: 'lede' },
    `${lb.phase?.title || ''} phase · ranked by ${lb.rank_key || 'judge'} win rate · ` +
    `tie-break: ${lb.tie_break?.title || 'size'} (${lb.tie_break?.better || 'lower'} is better).`));
  root.append(el('p', {}, link('#/bounty/' + slug, '← Back to the bounty')));

  if (!entries.length) {
    root.append(el('p', { class: 'muted' }, 'No entries on this leaderboard yet.'));
    onReady();
    return;
  }

  const table = el('table', {});
  table.append(el('thead', {}, el('tr', {},
    el('th', { class: 'num' }, '#'),
    el('th', {}, 'Entry'),
    el('th', { class: 'num' }, 'Win rate'),
    el('th', { class: 'num hide-sm' }, '90% range'),
    el('th', { class: 'num hide-sm' }, 'Size'))));
  const body = el('tbody', {});
  table.append(body);
  root.append(table);

  const pager = el('div', { class: 'pager' });
  const prev = el('button', { type: 'button' }, '← Previous');
  const next = el('button', { type: 'button' }, 'Next →');
  const label = el('span', { class: 'count' });
  pager.append(prev, next, label);
  root.append(pager);

  let page = 0;
  const pages = Math.max(1, Math.ceil(entries.length / PAGE));

  function draw() {
    const rows = entries.slice(page * PAGE, page * PAGE + PAGE);
    body.replaceChildren(...rows.map((e) => {
      const judge = e.judge || {};
      const cell = el('td', {});
      cell.append(el('b', {}, e.title || 'Untitled entry'));
      cell.append(el('br', {}));
      cell.append(link('#/u/' + e.handle, '@' + e.handle));
      if (judge.matches != null) {
        cell.append(el('span', { class: 'small muted' },
          ` · ${judge.wins ?? 0}W ${judge.draws ?? 0}D ${judge.losses ?? 0}L`));
      }
      return el('tr', {},
        el('td', { class: 'num rank' }, num(e.rank)),
        cell,
        el('td', { class: 'num' }, winRate(e.values?.judge)),
        el('td', { class: 'num hide-sm' },
          `${winRate(e.values?.judge_low)} – ${winRate(e.values?.judge_high)}`),
        el('td', { class: 'num hide-sm' }, bytes(e.values?.bytes)));
    }));
    label.textContent = `Page ${page + 1} of ${pages} · ${num(entries.length)} entries`;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
    pager.style.display = pages > 1 ? '' : 'none';
  }
  prev.addEventListener('click', () => { if (page > 0) { page--; draw(); } });
  next.addEventListener('click', () => { if (page < pages - 1) { page++; draw(); } });
  draw();
  onReady();
}

/* ---------------- profile ---------------- */

export async function renderProfile(root, handle, { onReady }) {
  root.append(el('p', { class: 'loading' }, 'Loading profile…'));
  let p;
  try {
    p = await getJson(profileUrl(handle));
  } catch (err) {
    root.replaceChildren(errorBox(err));
    onReady();
    return;
  }
  root.replaceChildren();

  const head = el('div', { class: 'profile-head' });
  const avatarUrl = p.avatar?.url_small || p.avatar?.url || p.image;
  if (avatarUrl) {
    const img = el('img', { src: 'https://make.fun' + avatarUrl, alt: `Avatar of @${p.handle}`, crossorigin: 'anonymous' });
    head.append(img);
  }
  const who = el('div', {});
  who.append(el('h1', { tabindex: '-1' }, (p.display_name || '@' + p.handle)));
  who.append(el('p', { class: 'muted' }, '@' + p.handle +
    (p.github_login ? ` · GitHub ${p.github_login}` : '') +
    (p.joined_at ? ` · joined ${dateShort(p.joined_at)}` : '')));
  if (p.bio) who.append(el('p', { class: 'bio' }, p.bio));
  head.append(who);
  root.append(head);

  const r = p.record || {};
  const kv = el('dl', { class: 'kv' });
  kv.append(el('div', {}, el('dt', {}, 'Entered'), el('dd', {}, num(r.competitions_entered))));
  kv.append(el('div', {}, el('dt', {}, 'Placed'), el('dd', {}, num(r.competitions_placed))));
  kv.append(el('div', {}, el('dt', {}, 'Won'), el('dd', {}, num(r.competitions_won))));
  kv.append(el('div', {}, el('dt', {}, 'Podiums'), el('dd', {}, num(r.podium_finishes))));
  kv.append(el('div', {}, el('dt', {}, 'Best place'),
    el('dd', {}, r.best_placement != null ? '#' + num(r.best_placement) : '—')));
  kv.append(el('div', {}, el('dt', {}, 'Prize money'), el('dd', {}, usd(r.prize_usd))));
  root.append(kv);

  const sols = Array.isArray(p.solutions) ? p.solutions : [];
  root.append(el('h2', {}, `Entries (${num(sols.length)})`));
  if (!sols.length) {
    root.append(el('p', { class: 'muted' }, 'No entries yet.'));
    onReady();
    return;
  }
  const table = el('table', {});
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Entry'),
    el('th', { class: 'hide-sm' }, 'Bounty'),
    el('th', { class: 'num' }, 'Place'),
    el('th', { class: 'num hide-sm' }, 'Prize'),
    el('th', { class: 'num' }, 'Win rate'))));
  const body = el('tbody', {});
  for (const s of sols) {
    const c = s.competition || {};
    body.append(el('tr', {},
      el('td', {}, s.title || '—'),
      el('td', { class: 'hide-sm' }, link('#/bounty/' + c.slug, c.title || c.slug || '—')),
      el('td', { class: 'num' }, s.placement != null ? '#' + num(s.placement) : '—'),
      el('td', { class: 'num hide-sm' }, s.prize_usd != null ? usd(s.prize_usd) : '—'),
      el('td', { class: 'num' }, winRate(s.score?.value))));
  }
  table.append(body);
  root.append(table);
  onReady();
}
