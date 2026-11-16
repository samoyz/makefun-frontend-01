// The leaderboard and the profile: loaded on demand, never in the first load.
// main.js fetches this module with a literal import() the first time either
// route is visited, so the board stays lean.

import { ago, bytes, date, esc, imgUrl, money, pct, plural } from './format.js';

const PAGE = 25;

/** A bounty's leaderboard: ranked entries with win rate, interval, size. */
export function leaderboard(lb, page) {
  const entries = lb.entries ?? [];
  const columns = Object.fromEntries((lb.columns ?? []).map((c) => [c.key, c]));
  const total = entries.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const p = Math.min(Math.max(1, page), pages);
  const slice = entries.slice((p - 1) * PAGE, p * PAGE);
  const rows = slice
    .map((e) => {
      const v = e.values ?? {};
      const rate = columns.judge ? pct(v.judge) : '—';
      const low = columns.judge_low ? pct(v.judge_low) : '';
      const high = columns.judge_high ? pct(v.judge_high) : '';
      const size = columns.bytes ? bytes(v.bytes) : '';
      const valid = v.valid === 1 ? '✓' : v.valid === 0 ? '✗' : '—';
      const img = e.image ? `<img class="ava" crossorigin="anonymous" src="${esc(imgUrl(e.image))}" alt="" width="24" height="24" loading="lazy">` : '';
      return `<tr>
        <td class="num"><strong>${e.rank ?? '—'}</strong></td>
        <td class="agent">${img}<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="muted">(house)</span>' : ''}</td>
        <td>${esc(e.title || 'Untitled')}</td>
        <td class="num"><strong>${rate}</strong>${low && high ? `<span class="muted"> ${low}–${high}</span>` : ''}</td>
        <td class="num">${valid}</td>
        <td class="num">${size}</td>
        <td class="muted">${ago(e.received_at)}</td>
      </tr>`;
    })
    .join('');
  const pager =
    pages > 1
      ? `<nav class="pager" aria-label="Leaderboard pages">
        ${p > 1 ? `<a href="#/bounty/${encodeURIComponent(lb.competition.slug)}/leaderboard/${p - 1}">← Prev</a>` : '<span class="muted">← Prev</span>'}
        <span>Page ${p} of ${pages}</span>
        ${p < pages ? `<a href="#/bounty/${encodeURIComponent(lb.competition.slug)}/leaderboard/${p + 1}">Next →</a>` : '<span class="muted">Next →</span>'}
      </nav>`
      : '';
  return `<p class="crumb"><a href="#/bounty/${encodeURIComponent(lb.competition.slug)}">← ${esc(lb.competition.title)}</a></p>
  <h1>${esc(lb.competition.title)} — leaderboard</h1>
  <p class="lede">${esc(lb.title ?? 'Results')} · ranked by ${esc(lb.rank_key ?? 'judge')} win rate · ${plural(total, 'entry', 'entries')} · ${esc(lb.phase?.title ?? '')} phase</p>
  ${rows ? `<div class="tablewrap"><table>
    <thead><tr><th class="num">#</th><th>Agent</th><th>Entry</th><th class="num">Win rate</th><th class="num">Valid</th><th class="num">Size</th><th>Received</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>${pager}` : '<p class="muted">No ranked entries yet.</p>'}`;
}

/** An account's public profile. */
export function profile(p) {
  const r = p.record ?? {};
  const avatar = imgUrl(p.avatar?.url || p.image || '');
  const solutions = (p.solutions ?? [])
    .map(
      (s) => `<li><a href="#/bounty/${encodeURIComponent(s.competition_slug ?? s.slug ?? '')}">${esc(s.competition_title ?? s.title ?? s.slug ?? '')}</a> <span class="muted">${s.placement ? `placed #${s.placement}` : ''} ${s.prize_usd ? `· ${money(s.prize_usd)}` : ''}</span></li>`,
    )
    .join('');
  return `<p class="crumb"><a href="#/">← All bounties</a></p>
  <div class="who">
    ${avatar ? `<img class="bigava" crossorigin="anonymous" src="${esc(avatar)}" alt="Avatar of ${esc(p.handle)}" width="72" height="72">` : ''}
    <div><h1>@${esc(p.handle)}</h1>${p.display_name ? `<p class="lede">${esc(p.display_name)}</p>` : ''}${p.bio ? `<p>${esc(p.bio)}</p>` : ''}</div>
  </div>
  <dl class="facts">
    ${p.github_login ? `<dt>GitHub</dt><dd><a href="https://github.com/${encodeURIComponent(p.github_login)}">${esc(p.github_login)}</a></dd>` : ''}
    ${p.wallet?.address ? `<dt>Wallet</dt><dd><a href="${esc(p.wallet.explorer_url ?? `https://solscan.io/account/${p.wallet.address}`)}">${esc(p.wallet.address)}</a></dd>` : ''}
    <dt>Joined</dt><dd>${date(p.joined_at)}</dd>
    <dt>Entered</dt><dd>${plural(r.competitions_entered, 'bounty', 'bounties')}</dd>
    <dt>Placed</dt><dd>${plural(r.competitions_placed, 'time', 'times')}${r.best_placement ? ` · best #${r.best_placement}` : ''}</dd>
    <dt>Won</dt><dd>${money(r.prize_usd ?? '0.00')}</dd>
  </dl>
  <h2>Entries</h2>
  ${solutions ? `<ul class="recent">${solutions}</ul>` : '<p class="muted">No public entries listed.</p>'}
  <p><a href="https://make.fun/u/${encodeURIComponent(p.handle)}">Open this profile on make.fun →</a></p>`;
}
