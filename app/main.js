// Router and boot. Hash routes, one per surface:
//   #/                              the bounty board
//   #/bounty/<slug>                 a bounty's page
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/profile/<handle>              an account's public profile
// Each route sets window.__shotReady false while it loads and true once
// its data has rendered, so screenshots always catch finished content.

import { fetchJson, boardPath, bountyPath, leaderboardPath, profilePath } from "./api.js";
import { boardView, bountyCard, filterBoard, bountyView, leaderboardView, profileView, loadingView, errorView, notFoundView } from "./views.js";

const view = document.getElementById("view");
const boardState = { q: "", sort: "deadline" };
let boardItems = null;
let boardStamp = "";

function setReady(ready) {
  window.__shotReady = ready;
}

function setNav(route) {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const key = a.getAttribute("data-nav");
    if ((route === "board" && key === "board")
      || (route === "bounty" && key === "bounty")
      || (route === "leaderboard" && key === "leaderboard")) {
      a.setAttribute("aria-current", "page");
    } else {
      a.removeAttribute("aria-current");
    }
  });
}

function focusHeading() {
  const h1 = view.querySelector("h1");
  if (h1) h1.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function stamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function renderBoardCount(total, shown) {
  const el = document.getElementById("board-count");
  if (el) el.textContent = "Showing " + shown + " of " + total + " open bounties · updated " + boardStamp;
}

function paintBoard() {
  const shown = filterBoard(boardItems, boardState.q, boardState.sort);
  const grid = document.getElementById("board-grid");
  if (!grid) return;
  // Rebuild only the grid; the toolbar keeps its focus and text.
  grid.innerHTML = shown.map(bountyCard).join("");
  renderBoardCount(boardItems.length, shown.length);
}

async function showBoard() {
  setNav("board");
  document.title = "Live bounties — Limber Board";
  setReady(false);
  view.innerHTML = loadingView("the bounty board");
  try {
    const data = await fetchJson(boardPath(100));
    boardItems = data.items || [];
    boardStamp = stamp();
    view.innerHTML = boardView(boardItems, boardState);
    paintBoard();
    document.getElementById("board-q").addEventListener("input", (e) => {
      boardState.q = e.target.value;
      paintBoard();
    });
    document.getElementById("board-sort").addEventListener("change", (e) => {
      boardState.sort = e.target.value;
      paintBoard();
    });
    document.getElementById("board-refresh").addEventListener("click", () => {
      boardItems = null;
      showBoard();
    });
    focusHeading();
    setReady(true);
  } catch (err) {
    view.innerHTML = errorView(err.message);
    focusHeading();
    setReady(true);
  }
}

async function showBounty(slug) {
  setNav("bounty");
  setReady(false);
  view.innerHTML = loadingView("bounty " + slug);
  try {
    const comp = await fetchJson(bountyPath(slug));
    let top = [];
    try {
      const lb = await fetchJson(leaderboardPath(slug));
      top = lb.entries || [];
    } catch (e) {
      top = [];
    }
    document.title = comp.title + " — Limber Board";
    view.innerHTML = bountyView(comp, top);
    focusHeading();
    setReady(true);
  } catch (err) {
    view.innerHTML = String(err.message).includes("404") ? notFoundView("Bounty " + slug) : errorView(err.message);
    focusHeading();
    setReady(true);
  }
}

async function showLeaderboard(slug) {
  setNav("leaderboard");
  setReady(false);
  view.innerHTML = loadingView("the leaderboard");
  try {
    const lb = await fetchJson(leaderboardPath(slug));
    document.title = "Leaderboard: " + (lb.competition ? lb.competition.title : slug) + " — Limber Board";
    view.innerHTML = leaderboardView(lb);
    focusHeading();
    setReady(true);
  } catch (err) {
    view.innerHTML = String(err.message).includes("404") ? notFoundView("Leaderboard for " + slug) : errorView(err.message);
    focusHeading();
    setReady(true);
  }
}

async function showProfile(handle) {
  setNav("");
  setReady(false);
  view.innerHTML = loadingView("profile @" + handle);
  try {
    const p = await fetchJson(profilePath(handle));
    document.title = "@" + p.handle + " — Limber Board";
    view.innerHTML = profileView(p);
    focusHeading();
    setReady(true);
  } catch (err) {
    view.innerHTML = String(err.message).includes("404") ? notFoundView("Profile @" + handle) : errorView(err.message);
    focusHeading();
    setReady(true);
  }
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) return showBoard();
  if (parts[0] === "bounty" && parts[1] && parts[2] === "leaderboard") return showLeaderboard(parts[1]);
  if (parts[0] === "bounty" && parts[1]) return showBounty(parts[1]);
  if (parts[0] === "profile" && parts[1]) return showProfile(parts[1]);
  view.innerHTML = notFoundView("Page " + hash);
  setReady(true);
}

document.getElementById("profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const handle = document.getElementById("profile-handle").value.trim().replace(/^@/, "");
  if (handle) location.hash = "#/profile/" + encodeURIComponent(handle);
});

window.addEventListener("hashchange", route);
setReady(false);
route();
