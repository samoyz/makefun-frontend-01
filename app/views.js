// The board and the bounty page: the two views in the first load. Each is a
// function from API data to HTML. The leaderboard and profile live in extra.js,
// loaded on demand, so they never weigh down the first load.

import { ago, date, esc, money, plural, timeLeft } from './format.js';
import { md } from './md.js';

/** The live pot: prize plus the entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Still taking entries? A bounty past its deadline may still read status open. */
export function isOpen(b) {
  return b.acceptingSubmissions !== false && new Date(b.deadline).getTime() > Date.now();
}

function statusBadge(b) {
  if (!isOpen(b)) return '<span class="badge closed">Closed</span>';
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms < 3600_000) return '<span class="badge soon">Closing soon</span>';
  return '<span class="badge open">Open</span>';
}

function sortItems(items, sort) {
  const list = [...items];
  if (sort === 'pot') list.sort((a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount));
  else if (sort === 'entries') list.sort((a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0));
  // Soonest deadline, but a bounty past its deadline sorts after the live ones.
  else list.sort((a, b) => (isOpen(a) ? 0 : 1) - (isOpen(b) ? 0 : 1) || new Date(a.deadline) - new Date(b.deadline));
  return list;
}

/** The board: every open bounty with its live pot, fee, time left and entries. */
export function board(data, state) {
  const q = (state.q || '').trim().toLowerCase();
  const total = data.items?.length ?? 0;
  const openCount = (data.items ?? []).filter(isOpen).length;
  const ended = total - openCount;
  const lede =
    ended > 0
      ? `${plural(total, 'bounty', 'bounties')} listed · ${openCount} still open, ${ended} ended · pots include the entry fees paid in · times are live`
      : `${plural(total, 'bounty', 'bounties')} open · pots include the entry fees paid in · times are live`;
  let items = data.items ?? [];
  if (q) items = items.filter((b) => `${b.title} ${b.category ?? ''} ${b.slug}`.toLowerCase().includes(q));
  items = sortItems(items, state.sort);
  const rows = items
    .map(
      (b) => `<tr>
        <td class="t"><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
          <span class="cat">${esc(b.category ?? '')}</span> ${statusBadge(b)}</td>
        <td class="num"><strong>${pot(b)}</strong></td>
        <td class="num">${b.entryFeeUsd ? money(b.entryFeeUsd) : 'free'}</td>
        <td class="num" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</td>
        <td class="num">${plural(b.submissionCount, 'entry', 'entries')}</td>
      </tr>`,
    )
    .join('');
  return `<h1>Open bounties</h1>
  <p class="lede">${lede}</p>
  <form class="tools" id="tools" role="search" onsubmit="return false">
    <label>Search <input type="search" id="q" value="${esc(state.q)}" placeholder="Filter by title…" autocomplete="off"></label>
    <label>Sort <select id="sort">
      <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Soonest deadline</option>
      <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Biggest pot</option>
      <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
    </select></label>
  </form>
  <div class="tablewrap"><table>
    <thead><tr><th>Bounty</th><th class="num">Pot</th><th class="num">Entry fee</th><th class="num">Time left</th><th class="num">Entries</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">No bounties match “${esc(state.q)}”.</td></tr>`}</tbody>
  </table></div>`;
}

/** One bounty's page: facts, live rewards table, description, rules, recent entries. */
export function bounty(b) {
  const open = isOpen(b);
  const rewards = (b.rewardsNow?.length ? b.rewardsNow : Object.entries(b.rewards ?? {}).map(([place, amount]) => ({ place: Number(place), baseUsd: String(amount), feeShareUsd: '0.00', amountUsd: String(amount) })))
    .map(
      (r) => `<tr><td class="num">${r.place}</td><td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td><td class="num"><strong>${money(r.amountUsd)}</strong></td></tr>`,
    )
    .join('');
  const recent = [...(b.submissions ?? [])]
    .sort((a, c) => new Date(c.createdAt) - new Date(a.createdAt))
    .slice(0, 8)
    .map(
      (s) => `<li><a href="#/u/${encodeURIComponent(s.hunter)}">${esc(s.hunter)}</a> — ${esc(s.title || 'Untitled')} <span class="muted">${ago(s.createdAt)} · ${esc(s.status ?? '')}</span></li>`,
    )
    .join('');
  return `<p class="crumb"><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="lede">${esc(b.summary ?? '')}</p>
  <p>${open ? '<span class="badge open">Entries open</span>' : '<span class="badge closed">Entries closed</span>'}
     <span class="muted"> · ${plural(b.submissionCount, 'entry', 'entries')} so far</span></p>
  <dl class="facts">
    <dt>Live pot</dt><dd><strong>${pot(b)}</strong>${b.entryFeesUsd ? ` <span class="muted">(${money(b.entryFeesUsd)} in entry fees from ${plural(b.entryFeePayers, 'payer', 'payers')})</span>` : ''}</dd>
    ${b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : ''}
    <dt>Deadline</dt><dd><span data-deadline-full="${esc(b.deadline)}">${date(b.deadline)} (${timeLeft(b.deadline)})</span></dd>
    <dt>Opened</dt><dd>${date(b.opensAt ?? b.publishedAt)}</dd>
    <dt>Category</dt><dd>${esc(b.category ?? '—')}</dd>
    <dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? '—')}</dd>
  </dl>
  <h2>Rewards</h2>
  <div class="tablewrap"><table>
    <thead><tr><th class="num">Place</th><th class="num">Prize</th><th class="num">Fee share</th><th class="num">Total now</th></tr></thead>
    <tbody>${rewards}</tbody>
  </table></div>
  <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard →</a></p>
  <h2>About this bounty</h2>
  <div class="prose">${md(b.description)}</div>
  <details class="rules"><summary>Rules (full text)</summary><div class="prose">${md(b.rules)}</div></details>
  <h2>Recent entries</h2>
  ${recent ? `<ul class="recent">${recent}</ul>` : '<p class="muted">No entries yet.</p>'}
  <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Full leaderboard →</a></p>`;
}
