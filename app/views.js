// The four surfaces, rendered as DOM. API text is only ever put in
// with textContent, never parsed as HTML, so a bounty title or bio
// cannot inject markup.

import { apiImage } from "./api.js";
import {
  count,
  firstParagraph,
  isOpen,
  money,
  shortDate,
  timeLeft,
  winRate,
} from "./format.js";

export function el(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.href) node.href = options.href;
  if (options.id) node.id = options.id;
  return node;
}

function link(href, text) {
  const a = el("a", { href, text });
  return a;
}

function stat(label, value) {
  const wrap = el("div");
  wrap.append(el("dt", { text: label }), el("dd", { text: value }));
  return wrap;
}

function freshnessLine(label, info) {
  const p = el("p", { className: "freshness" });
  const stamp = info
    ? `Updated ${new Date(info.at).toLocaleTimeString()} · ${info.revalidated ? "revalidated with ETag (304)" : "fresh from the API"}`
    : "Live from the API";
  p.append(el("span", { className: "pill live", text: "● live" }), el("span", { text: `${label} — ${stamp}` }));
  return p;
}

// Cut text at a word boundary under n characters, for the bounty lede
// (the full description follows below in "About this bounty").
function shorten(text, n) {
  if (text.length <= n) return text;
  const cut = text.lastIndexOf(" ", n);
  return `${text.slice(0, cut > 40 ? cut : n).trimEnd()}…`;
}

function heading(text) {
  const h = el("h1", { text, id: "page-title" });
  h.tabIndex = -1;
  return h;
}

export function loadingView(text = "Loading live data from make.fun…") {
  const p = el("p", { className: "loading", text });
  p.setAttribute("role", "status");
  return p;
}

export function errorView(message, retry) {
  const wrap = el("div");
  wrap.append(heading("Something went wrong"));
  const p = el("p", { className: "error", text: message });
  wrap.append(p);
  if (retry) {
    const b = el("button", { text: "Try again", className: "ghost" });
    b.addEventListener("click", retry);
    wrap.append(b);
  }
  return wrap;
}

// --- Board -----------------------------------------------------------------

export function boardView(page, state, actions) {
  const wrap = el("div");
  wrap.append(heading("Live bounty board"));
  const lede = el("p", {
    className: "lede",
    text: "Every bounty taking entries on make.fun right now, with its live pot, its entry fee and its time left. Pick one to see its rules, rewards and leaderboard.",
  });
  wrap.append(lede);
  wrap.append(freshnessLine("Board", state.fresh));

  const toolbar = el("div", { className: "toolbar" });
  const filterField = el("div", { className: "field" });
  filterField.append(el("label", { text: "Filter bounties" }));
  const filter = el("input");
  filter.type = "search";
  filter.placeholder = "title, category or skill…";
  filter.value = state.filter;
  filter.setAttribute("aria-label", "Filter bounties by text");
  filter.addEventListener("input", () => actions.onFilter(filter.value));
  filterField.append(filter);
  toolbar.append(filterField);

  const sortField = el("div", { className: "field" });
  sortField.append(el("label", { text: "Sort by" }));
  const sort = el("select");
  sort.setAttribute("aria-label", "Sort bounties");
  for (const [value, label] of [
    ["pot", "Biggest pot"],
    ["deadline", "Closing soonest"],
    ["entries", "Most entries"],
    ["reward", "Biggest base reward"],
  ]) {
    const opt = el("option", { text: label });
    opt.value = value;
    if (state.sort === value) opt.selected = true;
    sort.append(opt);
  }
  sort.addEventListener("change", () => actions.onSort(sort.value));
  sortField.append(sort);
  toolbar.append(sortField);
  wrap.append(toolbar);

  const shown = page.items.filter((b) => {
    if (!state.filter) return true;
    const hay = `${b.title} ${b.category || ""} ${(b.skills || []).join(" ")}`.toLowerCase();
    return state.filter.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });
  const sorted = [...shown].sort((a, b) => {
    if (state.sort === "deadline") return new Date(a.deadline) - new Date(b.deadline);
    if (state.sort === "entries") return (b.submissionCount || 0) - (a.submissionCount || 0);
    if (state.sort === "reward") return (b.rewardAmount || 0) - (a.rewardAmount || 0);
    return Number(b.potUsd ?? b.rewardAmount ?? 0) - Number(a.potUsd ?? a.rewardAmount ?? 0);
  });

  const summary = el("p", {
    className: "muted",
    text: `${sorted.length} of ${page.items.length} bounties shown${page.nextCursor ? " (more on the next page)" : ""}.`,
  });
  wrap.append(summary);

  if (sorted.length === 0) {
    wrap.append(el("p", { className: "error", text: "No bounties match that filter." }));
    return wrap;
  }

  const grid = el("ul", { className: "grid" });
  for (const b of sorted) {
    const open = isOpen(b.deadline, b.status);
    const li = el("li", { className: "card" });
    li.append(el("span", { className: "cat", text: b.category || "Bounty" }));
    const h = el("h2");
    h.append(link(`#/bounty/${b.slug}`, b.title));
    li.append(h);
    const desc = firstParagraph(b.description);
    if (desc) li.append(el("p", { className: "desc", text: desc }));
    const stats = el("dl", { className: "stats" });
    stats.append(
      stat("Live pot", money(b.potUsd ?? b.rewardAmount)),
      stat("Entry fee", b.entryFeeUsd ? money(b.entryFeeUsd) : "Free"),
      stat("Time left", open ? timeLeft(b.deadline) : "Closed"),
      stat("Entries", count(b.submissionCount)),
    );
    li.append(stats);
    const links = el("p", { className: "links" });
    links.append(link(`#/bounty/${b.slug}`, "Bounty →"), link(`#/leaderboard/${b.slug}`, "Leaderboard →"));
    li.append(links);
    const pill = el("span", {
      className: `pill ${open ? "live" : "closed"}`,
      text: open ? "taking entries" : "entries closed",
    });
    li.append(pill);
    grid.append(li);
  }
  wrap.append(grid);

  if (page.nextCursor) {
    const row = el("p", { className: "more-row" });
    const more = el("button", { text: "Load more bounties", className: "ghost" });
    more.addEventListener("click", actions.onMore);
    row.append(more);
    wrap.append(row);
  }
  return wrap;
}

// --- Bounty page -----------------------------------------------------------

// The description is light markdown. Render it as plain text: headings,
// bullets and paragraphs only — links and code stay literal text.
function prose(text) {
  const wrap = el("div", { className: "prose" });
  if (!text) return wrap;
  let list = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      list = null;
      wrap.append(el("h3", { text: line.slice(3).trim() }));
    } else if (line.startsWith("- ")) {
      if (!list) {
        list = el("ul");
        wrap.append(list);
      }
      list.append(el("li", { text: line.slice(2).trim() }));
    } else if (line === "") {
      list = null;
    } else {
      list = null;
      wrap.append(el("p", { text: line }));
    }
  }
  return wrap;
}

export function bountyView(comp, info) {
  const wrap = el("div");
  const open = isOpen(comp.deadline, comp.status);
  wrap.append(heading(comp.title));
  const ledeText = firstParagraph(comp.description) || comp.title;
  wrap.append(el("p", { className: "lede", text: shorten(ledeText, 220) }));
  wrap.append(freshnessLine("Bounty", info));

  const pot = el("div", { className: "potline" });
  const potCell = el("div");
  potCell.append(el("div", { className: "lab", text: "Live pot (reward + entry fees)" }));
  potCell.append(el("div", { className: "big", text: money(comp.potUsd ?? comp.rewardAmount) }));
  pot.append(potCell);
  const feeCell = el("div");
  feeCell.append(el("div", { className: "lab", text: "Entry fee" }));
  feeCell.append(el("div", { className: "big", text: comp.entryFeeUsd ? money(comp.entryFeeUsd) : "Free to enter" }));
  pot.append(feeCell);
  const timeCell = el("div");
  timeCell.append(el("div", { className: "lab", text: "Entries close" }));
  timeCell.append(el("div", { className: "big", text: open ? timeLeft(comp.deadline) : "Closed" }));
  pot.append(timeCell);
  const entriesCell = el("div");
  entriesCell.append(el("div", { className: "lab", text: "Entries so far" }));
  entriesCell.append(el("div", { className: "big", text: count(comp.submissionCount) }));
  pot.append(entriesCell);
  wrap.append(pot);

  const meta = el("p", { className: "muted" });
  meta.append(
    el("span", { className: `pill ${open ? "live" : "closed"}`, text: open ? "taking entries" : "entries closed" }),
    document.createTextNode(`  ${comp.category || ""} · opens ${shortDate(comp.publishedAt || comp.opensAt)} · deadline ${shortDate(comp.deadline)} · ${count(comp.entryFeePayers)} fee payer${comp.entryFeePayers === 1 ? "" : "s"}`),
  );
  wrap.append(meta);

  const lbLink = el("p");
  lbLink.append(link(`#/leaderboard/${comp.slug}`, "See the leaderboard →"));
  wrap.append(lbLink);

  if (comp.rewardsNow && comp.rewardsNow.length) {
    wrap.append(el("h2", { text: "Rewards — live pot split" }));
    const tableWrap = el("div", { className: "table-wrap" });
    const table = el("table");
    const cap = el("caption", { text: "Each place's base prize plus its share of the entry fees paid so far." });
    table.append(cap);
    const thead = el("thead");
    const headRow = el("tr");
    for (const h of ["Place", "Base prize", "Fee share", "Total now"]) {
      const th = el("th", { text: h });
      if (h !== "Place") th.className = "num";
      headRow.append(th);
    }
    thead.append(headRow);
    table.append(thead);
    const tbody = el("tbody");
    for (const r of comp.rewardsNow) {
      const row = el("tr");
      row.append(el("td", { text: `#${r.place}` }));
      row.append(el("td", { className: "num", text: money(r.baseUsd) }));
      row.append(el("td", { className: "num", text: money(r.feeShareUsd) }));
      row.append(el("td", { className: "num", text: money(r.amountUsd) }));
      tbody.append(row);
    }
    table.append(tbody);
    tableWrap.append(table);
    wrap.append(tableWrap);
  }

  if (comp.skills && comp.skills.length) {
    wrap.append(el("h2", { text: "Skills" }));
    const p = el("p");
    p.append(el("span", { className: "muted", text: comp.skills.join(" · ") }));
    wrap.append(p);
  }

  wrap.append(el("h2", { text: "About this bounty" }));
  wrap.append(prose(comp.description));
  return wrap;
}

// --- Leaderboard -----------------------------------------------------------

export function leaderboardView(lb, state, actions) {
  const wrap = el("div");
  const comp = lb.competition || {};
  wrap.append(heading(`Leaderboard — ${comp.title || "bounty"}`));
  wrap.append(el("p", {
    className: "lede",
    text: `Ranked by ${lb.title || "judge win rate"}. ${lb.phase ? `${lb.phase.title} phase, ${shortDate(lb.phase.ends_at)} deadline.` : ""}`,
  }));
  wrap.append(freshnessLine("Leaderboard", state.fresh));

  const back = el("p");
  back.append(link(`#/bounty/${comp.slug || ""}`, "← Back to the bounty"));
  wrap.append(back);

  const entries = lb.entries || [];
  if (entries.length === 0) {
    wrap.append(el("p", { className: "error", text: "No entries on this leaderboard yet." }));
    return wrap;
  }
  const shown = entries.slice(0, state.limit);
  const tableWrap = el("div", { className: "table-wrap" });
  const table = el("table");
  table.append(el("caption", { text: `${entries.length} ranked entries · win rate is the judge's share of wins, size is the entry's dossier bytes (smaller breaks ties).` }));
  const thead = el("thead");
  const headRow = el("tr");
  for (const [label, num] of [["#", true], ["Entrant", false], ["Entry", false], ["Win rate", true], ["Valid", true], ["Size", true]]) {
    const th = el("th", { text: label });
    if (num) th.className = "num";
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);
  const tbody = el("tbody");
  for (const e of shown) {
    const row = el("tr");
    const rank = el("td", { className: "num rank-medal", text: String(e.rank) });
    row.append(rank);
    const who = el("td");
    const imgSrc = apiImage(e.image);
    if (imgSrc) {
      const img = el("img", { className: "avatar" });
      img.width = 28;
      img.height = 28;
      img.alt = "";
      img.loading = "lazy";
      img.crossOrigin = "anonymous";
      img.src = imgSrc;
      who.append(img, document.createTextNode(" "));
    }
    const handle = link(`#/u/${e.handle}`, `@${e.handle}`);
    handle.className = "handle";
    who.append(handle);
    row.append(who);
    row.append(el("td", { text: e.title || "—" }));
    row.append(el("td", { className: "num", text: winRate(e.values && e.values.judge) }));
    row.append(el("td", { className: "num", text: e.values && e.values.valid ? "✓" : "—" }));
    row.append(el("td", { className: "num", text: count(e.values && e.values.bytes) }));
    tbody.append(row);
  }
  table.append(tbody);
  tableWrap.append(table);
  wrap.append(tableWrap);

  if (entries.length > state.limit) {
    const row = el("p", { className: "more-row" });
    const more = el("button", {
      text: `Show more (${entries.length - state.limit} left)`,
      className: "ghost",
    });
    more.addEventListener("click", actions.onMore);
    row.append(more);
    wrap.append(row);
  }
  return wrap;
}

// --- Profile ---------------------------------------------------------------

export function profileView(prof, info) {
  const wrap = el("div");
  wrap.append(heading(`@${prof.handle}`));
  wrap.append(freshnessLine("Profile", info));

  const head = el("div", { className: "profile-head" });
  const imgSrc = apiImage(prof.avatar ? prof.avatar.url : prof.image);
  if (imgSrc) {
    const img = el("img", { className: "avatar" });
    img.alt = `Profile picture of @${prof.handle}`;
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    head.append(img);
  }
  const who = el("div", { className: "who" });
  if (prof.display_name) who.append(el("p", { text: prof.display_name }));
  if (prof.bio) who.append(el("p", { text: prof.bio }));
  const links = el("p", { className: "small" });
  const parts = [];
  if (prof.github_login) parts.push(["GitHub", `https://github.com/${prof.github_login}`]);
  if (prof.x) parts.push(["X", `https://x.com/${prof.x}`]);
  if (prof.wallet && prof.wallet.explorer_url) parts.push(["Wallet", prof.wallet.explorer_url]);
  if (prof.profile_url) parts.push(["make.fun", `https://make.fun${prof.profile_url}`]);
  parts.forEach(([label, href], i) => {
    if (i) links.append(document.createTextNode(" · "));
    links.append(link(href, label));
  });
  if (parts.length) who.append(links);
  who.append(el("p", { className: "muted", text: `Joined ${shortDate(prof.joined_at)}` }));
  head.append(who);
  wrap.append(head);

  const rec = prof.record || {};
  wrap.append(el("h2", { text: "Record" }));
  const record = el("ul", { className: "record" });
  const recordItems = [
    ["Entered", count(rec.competitions_entered)],
    ["Placed", count(rec.competitions_placed)],
    ["Won", count(rec.competitions_won)],
    ["Podiums", count(rec.podium_finishes)],
    ["Prize money", money(rec.prize_usd)],
  ];
  for (const [k, v] of recordItems) {
    const li = el("li");
    li.append(el("span", { className: "v", text: v }), el("span", { className: "k", text: k }));
    record.append(li);
  }
  wrap.append(record);

  const sols = prof.solutions || [];
  wrap.append(el("h2", { text: `Entries (${sols.length})` }));
  if (sols.length === 0) {
    wrap.append(el("p", { className: "muted", text: "No entries yet." }));
    return wrap;
  }
  const list = el("ul", { className: "solutions" });
  for (const s of sols) {
    const li = el("li");
    const title = el("span", { className: "t" });
    title.append(link(`#/bounty/${s.competition.slug}`, s.title || "Untitled entry"));
    li.append(title);
    const meta = el("p", { className: "meta" });
    meta.textContent = `${s.competition.title} · entered ${shortDate(s.entered_at)}` +
      (s.placement ? ` · placed #${s.placement}` : " · unplaced") +
      (s.prize_usd ? ` · won ${money(s.prize_usd)}` : "") +
      (s.score ? ` · judge ${winRate(s.score.value)}` : "");
    li.append(meta);
    list.append(li);
  }
  wrap.append(list);
  return wrap;
}
