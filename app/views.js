// HTML for the four surfaces. Each function takes plain API data and
// returns an HTML string; main.js drops it into #view. All API text is
// escaped here, so nothing the API returns can run as markup.

import { esc, moneyUsd, whole, winRate, fullDate, timeLeft, shortText, paragraphs } from "./format.js";
import { avatarUrl } from "./api.js";

function statusChip(comp) {
  const left = timeLeft(comp.deadline);
  if (left.open && comp.status === "open") return '<span class="chip open">Open</span>';
  return '<span class="chip closed">Closed</span>';
}

export function bountyCard(comp) {
  const left = timeLeft(comp.deadline);
  const fee = comp.entryFeeUsd === null || comp.entryFeeUsd === undefined
    ? "Free"
    : moneyUsd(comp.entryFeeUsd);
  return "<article class=\"card\">"
    + "<div class=\"chip-row\">" + statusChip(comp)
    + (comp.category ? "<span class=\"chip\">" + esc(comp.category) + "</span>" : "")
    + "</div>"
    + "<h2><a href=\"#/bounty/" + esc(comp.slug) + "\">" + esc(comp.title) + "</a></h2>"
    + "<p>" + esc(shortText(comp.description, 180)) + "</p>"
    + "<div class=\"stats\">"
    + "<div class=\"stat\"><b>" + esc(moneyUsd(comp.potUsd ?? comp.rewardAmount)) + "</b><span>Live pot</span></div>"
    + "<div class=\"stat\"><b class=\"fee\">" + esc(fee) + "</b><span>Entry fee</span></div>"
    + "<div class=\"stat\"><b>" + esc(left.label) + "</b><span>Time left</span></div>"
    + "<div class=\"stat\"><b>" + esc(whole(comp.submissionCount)) + "</b><span>Entries</span></div>"
    + "</div></article>";
}

export function boardView(items, state) {
  const cards = items.map(bountyCard).join("");
  return "<h1 tabindex=\"-1\">Live bounties on make.fun</h1>"
    + "<p class=\"lede\">" + items.length + " open " + (items.length === 1 ? "bounty" : "bounties")
    + " — reward, live pot, entry fee, time left and entries, straight from the public API.</p>"
    + "<div class=\"toolbar\" role=\"search\">"
    + "<label>Search bounties<input id=\"board-q\" type=\"search\" placeholder=\"Search title or category…\" value=\""
    + esc(state.q) + "\" autocomplete=\"off\"></label>"
    + "<label>Sort by<select id=\"board-sort\">"
    + "<option value=\"deadline\"" + (state.sort === "deadline" ? " selected" : "") + ">Ending soonest</option>"
    + "<option value=\"pot\"" + (state.sort === "pot" ? " selected" : "") + ">Biggest pot</option>"
    + "<option value=\"entries\"" + (state.sort === "entries" ? " selected" : "") + ">Most entries</option>"
    + "</select></label>"
    + "<button class=\"btn ghost\" id=\"board-refresh\" type=\"button\">Refresh</button>"
    + "</div>"
    + "<p class=\"status-line\" id=\"board-count\"></p>"
    + "<div class=\"grid\" id=\"board-grid\">" + cards + "</div>";
}

export function filterBoard(items, q, sort) {
  const needle = q.trim().toLowerCase();
  let out = items;
  if (needle) {
    out = items.filter((c) =>
      (c.title + " " + (c.category || "") + " " + (c.description || "")).toLowerCase().includes(needle));
  }
  const copy = out.slice();
  const now = Date.now();
  if (sort === "pot") copy.sort((a, b) => Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0));
  else if (sort === "entries") copy.sort((a, b) => Number(b.submissionCount || 0) - Number(a.submissionCount || 0));
  // "Ending soonest": still-open bounties first by deadline, then the ones
  // past deadline (the API may still call them open) last, oldest first.
  else copy.sort((a, b) => {
    const pa = new Date(a.deadline).getTime() < now ? 1 : 0;
    const pb = new Date(b.deadline).getTime() < now ? 1 : 0;
    return (pa - pb) || (new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  });
  return copy;
}

function rewardRows(comp) {
  const rows = Array.isArray(comp.rewardsNow) ? comp.rewardsNow : [];
  if (!rows.length) return "<p>No reward table published yet.</p>";
  return "<div class=\"table-scroll\"><table><thead><tr>"
    + "<th scope=\"col\">Place</th><th scope=\"col\" class=\"num\">Base</th>"
    + "<th scope=\"col\" class=\"num\">Fee share</th><th scope=\"col\" class=\"num\">Total now</th>"
    + "</tr></thead><tbody>"
    + rows.map((r) => "<tr><td>" + esc(r.place) + "</td>"
      + "<td class=\"num\">" + esc(moneyUsd(r.baseUsd)) + "</td>"
      + "<td class=\"num\">" + esc(moneyUsd(r.feeShareUsd)) + "</td>"
      + "<td class=\"num\"><b>" + esc(moneyUsd(r.amountUsd)) + "</b></td></tr>").join("")
    + "</tbody></table></div>";
}

export function bountyView(comp, topEntries) {
  const left = timeLeft(comp.deadline);
  const fee = comp.entryFeeUsd === null || comp.entryFeeUsd === undefined
    ? "Free entry"
    : "Entry fee " + moneyUsd(comp.entryFeeUsd);
  const preview = (topEntries || []).slice(0, 5).map((e) =>
    "<tr><td class=\"rank\">" + esc(e.rank) + "</td>"
    + "<td><a href=\"#/profile/" + esc(e.handle) + "\">@" + esc(e.handle) + "</a></td>"
    + "<td>" + esc(shortText(e.title, 64)) + "</td>"
    + "<td class=\"num\">" + esc(winRate(e.values && e.values.judge)) + "</td></tr>").join("");
  return "<article><div class=\"detail-head\">"
    + "<div class=\"chip-row\">" + statusChip(comp)
    + (comp.category ? "<span class=\"chip\">" + esc(comp.category) + "</span>" : "")
    + (comp.sponsor && comp.sponsor.name ? "<span class=\"chip\">by " + esc(comp.sponsor.name) + "</span>" : "")
    + "</div>"
    + "<h1 tabindex=\"-1\">" + esc(comp.title) + "</h1>"
    + "<p class=\"meta\">" + esc(fee) + " · Entries close " + esc(fullDate(comp.deadline))
    + " · Published " + esc(fullDate(comp.publishedAt)) + "</p>"
    + "<div class=\"stats\">"
    + "<div class=\"stat\"><b>" + esc(moneyUsd(comp.potUsd ?? comp.rewardAmount)) + "</b><span>Live pot</span></div>"
    + "<div class=\"stat\"><b>" + esc(left.label) + "</b><span>Time left</span></div>"
    + "<div class=\"stat\"><b>" + esc(whole(comp.submissionCount)) + "</b><span>Entries</span></div>"
    + "<div class=\"stat\"><b>" + esc(whole(comp.entryFeePayers)) + "</b><span>Fee payers</span></div>"
    + "</div>"
    + "<div class=\"actions\">"
    + "<a class=\"btn\" href=\"#/bounty/" + esc(comp.slug) + "/leaderboard\">Full leaderboard</a>"
    + "<a class=\"btn ghost\" href=\"https://make.fun/bounty/" + esc(comp.slug) + "\">Open on make.fun</a>"
    + "</div></div>"
    + "<h2>Rewards</h2>" + rewardRows(comp)
    + "<h2>About this bounty</h2><div class=\"desc\">" + paragraphs(comp.description) + "</div>"
    + (preview
      ? "<h2>Top entries so far</h2><div class=\"table-scroll\"><table><thead><tr>"
        + "<th scope=\"col\">Rank</th><th scope=\"col\">Agent</th><th scope=\"col\">Entry</th>"
        + "<th scope=\"col\" class=\"num\">Win rate</th></tr></thead><tbody>" + preview
        + "</tbody></table></div>"
        + "<p><a href=\"#/bounty/" + esc(comp.slug) + "/leaderboard\">See the full leaderboard</a></p>"
      : "")
    + "</article>";
}

export function leaderboardView(lb) {
  const comp = lb.competition || {};
  const rows = (lb.entries || []).map((e) =>
    "<tr><td class=\"rank\">" + esc(e.rank) + "</td>"
    + "<td><a href=\"#/profile/" + esc(e.handle) + "\">@" + esc(e.handle) + "</a></td>"
    + "<td>" + esc(shortText(e.title, 72)) + "</td>"
    + "<td class=\"num\">" + esc(winRate(e.values && e.values.judge)) + "</td>"
    + "<td class=\"num\">" + esc(whole(e.values && e.values.bytes)) + "</td>"
    + "<td class=\"num\">" + esc(e.values && e.values.valid) + "</td></tr>").join("");
  return "<h1 tabindex=\"-1\">Leaderboard: " + esc(comp.title || "") + "</h1>"
    + "<p class=\"lede\">Judge win rates for the development phase. "
    + (lb.phase ? "Phase: " + esc(lb.phase.title || lb.phase.key) + ". " : "")
    + "Smaller dossier wins ties.</p>"
    + "<p><a href=\"#/bounty/" + esc(comp.slug) + "\">← Back to the bounty</a></p>"
    + (rows
      ? "<div class=\"table-scroll\"><table><thead><tr>"
        + "<th scope=\"col\">Rank</th><th scope=\"col\">Agent</th><th scope=\"col\">Entry</th>"
        + "<th scope=\"col\" class=\"num\">Win rate</th><th scope=\"col\" class=\"num\">Size (bytes)</th>"
        + "<th scope=\"col\" class=\"num\">Valid</th></tr></thead><tbody>" + rows
        + "</tbody></table></div>"
      : "<p class=\"notice\">No ranked entries yet for this bounty.</p>");
}

export function profileView(p) {
  const rec = p.record || {};
  const img = (p.avatar && p.avatar.url) || p.image;
  const entries = (p.solutions || []).map((s) => {
    const c = s.competition || {};
    return "<li><div class=\"row\"><a href=\"#/bounty/" + esc(c.slug) + "\">" + esc(s.title) + "</a>"
      + "<span>" + (s.prize_usd ? "<b>" + esc(moneyUsd(s.prize_usd)) + "</b>" : "")
      + (s.placement ? " · #" + esc(s.placement) : "") + "</span></div>"
      + "<small>" + esc(c.title || "") + " · entered " + esc(fullDate(s.entered_at))
      + (s.score ? " · score " + esc(s.score.display) : "") + "</small></li>";
  }).join("");
  return "<div class=\"profile-head\">"
    + (img ? "<img class=\"avatar\" crossorigin=\"anonymous\" src=\"" + esc(avatarUrl(img))
      + "\" alt=\"Avatar of " + esc(p.handle) + "\" width=\"96\" height=\"96\">" : "")
    + "<div><h1 tabindex=\"-1\">" + esc(p.display_name || ("@" + p.handle)) + "</h1>"
    + "<p class=\"handle\">@" + esc(p.handle)
    + (p.github_login ? " · GitHub " + esc(p.github_login) : "")
    + " · joined " + esc(fullDate(p.joined_at)) + "</p>"
    + (p.bio ? "<p class=\"bio\">" + esc(p.bio) + "</p>" : "")
    + "</div></div>"
    + "<div class=\"stat-grid\">"
    + "<div class=\"stat-box\"><b>" + esc(whole(rec.competitions_entered)) + "</b><span>Entered</span></div>"
    + "<div class=\"stat-box\"><b>" + esc(whole(rec.competitions_won)) + "</b><span>Won</span></div>"
    + "<div class=\"stat-box\"><b>" + esc(whole(rec.podium_finishes)) + "</b><span>Podiums</span></div>"
    + "<div class=\"stat-box\"><b>" + esc(moneyUsd(rec.prize_usd)) + "</b><span>Prize money</span></div>"
    + "</div>"
    + "<h2>Entries</h2>"
    + (entries ? "<ul class=\"entry-list\">" + entries + "</ul>"
      : "<p class=\"notice\">No entries on make.fun yet.</p>");
}

export function loadingView(what) {
  return "<p class=\"notice\" role=\"status\">Loading " + esc(what) + " from make.fun…</p>";
}

export function errorView(message) {
  return "<div class=\"error\" role=\"alert\"><h1 tabindex=\"-1\">Something went wrong</h1>"
    + "<p>" + esc(message) + "</p>"
    + "<p><a href=\"#/\">Back to the board</a></p></div>";
}

export function notFoundView(what) {
  return "<div class=\"notice\"><h1 tabindex=\"-1\">Not found</h1>"
    + "<p>" + esc(what) + " does not exist on make.fun, or it is no longer public.</p>"
    + "<p><a href=\"#/\">Back to the board</a></p></div>";
}
