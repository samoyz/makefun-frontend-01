// Router and bootstrap: one module, four hash routes, no framework.
//
//   #/                       the live bounty board
//   #/bounty/<slug>          one bounty's page
//   #/leaderboard/<slug>     that bounty's leaderboard
//   #/u/<handle>             an account's public profile
//
// Each route sets window.__shotReady false while it loads and true once
// its data has rendered, so a screenshot script can wait on it.

import { loadBoard, loadBounty, loadLeaderboard, loadProfile } from "./api.js";
import { cleanHandle, validHandle } from "./format.js";
import {
  boardView,
  bountyView,
  el,
  errorView,
  leaderboardView,
  loadingView,
  profileView,
} from "./views.js";

const view = document.getElementById("view");
const lookup = document.getElementById("profile-lookup");
const handleInput = document.getElementById("handle-input");

// The board keeps its pages in memory so "load more" never refetches.
const boardState = {
  items: [],
  nextCursor: null,
  filter: "",
  sort: "pot",
  fresh: null,
};

const lbState = { limit: 25 };

function setShotReady(ready) {
  window.__shotReady = ready;
}

function mount(node, title) {
  view.replaceChildren(node);
  document.title = title ? `${title} — make.fun lean board` : "make.fun — lean board";
  const h = document.getElementById("page-title");
  if (h) h.focus({ preventScroll: true });
  setShotReady(true);
}

function fail(err, retry) {
  const status = err && err.status;
  const msg =
    status === 404
      ? "make.fun says that does not exist (404). Check the slug or handle and try again."
      : status
        ? `The make.fun API answered ${status}. ${err.message}`
        : `Could not reach the make.fun API: ${err.message || err}`;
  mount(errorView(msg, retry), "Error");
}

function markNav(route) {
  for (const a of document.querySelectorAll("[data-nav]")) {
    if (a.dataset.nav === route) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

async function showBoard() {
  markNav("board");
  setShotReady(false);
  view.replaceChildren(loadingView());
  try {
    if (boardState.items.length === 0) {
      const { data, fromCache, at } = await loadBoard();
      boardState.items = data.items || [];
      boardState.nextCursor = data.next_cursor || null;
      boardState.fresh = { at, revalidated: fromCache };
    }
    const render = () => {
      mount(
        boardView(
          { items: boardState.items, nextCursor: boardState.nextCursor },
          boardState,
          {
            onFilter: (text) => {
              boardState.filter = text;
              render();
              const input = view.querySelector('input[type="search"]');
              if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
              }
            },
            onSort: (key) => {
              boardState.sort = key;
              render();
            },
            onMore: async () => {
              const btn = view.querySelector(".more-row button");
              if (btn) btn.disabled = true;
              try {
                const { data } = await loadBoard(boardState.nextCursor);
                boardState.items = boardState.items.concat(data.items || []);
                boardState.nextCursor = data.next_cursor || null;
                render();
              } catch (err) {
                fail(err, showBoard);
              }
            },
          },
        ),
        "Live bounty board",
      );
    };
    render();
  } catch (err) {
    fail(err, showBoard);
  }
}

async function showBounty(slug) {
  markNav(slug === "makefun-frontend-01" ? "bounty" : "");
  setShotReady(false);
  view.replaceChildren(loadingView("Loading the bounty…"));
  try {
    const { data, at, fromCache } = await loadBounty(slug);
    mount(bountyView(data, { at, revalidated: fromCache }), data.title);
  } catch (err) {
    fail(err, () => showBounty(slug));
  }
}

async function showLeaderboard(slug) {
  markNav("");
  setShotReady(false);
  view.replaceChildren(loadingView("Loading the leaderboard…"));
  try {
    const { data, at, fromCache } = await loadLeaderboard(slug);
    lbState.limit = 25;
    const render = () => {
      mount(
        leaderboardView(data, { fresh: { at, revalidated: fromCache }, limit: lbState.limit }, {
          onMore: () => {
            lbState.limit += 25;
            render();
          },
        }),
        `Leaderboard — ${data.competition ? data.competition.title : slug}`,
      );
    };
    render();
  } catch (err) {
    fail(err, () => showLeaderboard(slug));
  }
}

async function showProfile(handle) {
  markNav("");
  setShotReady(false);
  view.replaceChildren(loadingView(`Loading @${handle}…`));
  try {
    const { data, at, fromCache } = await loadProfile(handle);
    mount(profileView(data, { at, revalidated: fromCache }), `@${data.handle}`);
  } catch (err) {
    fail(err, () => showProfile(handle));
  }
}

function route() {
  const hash = window.location.hash || "#/";
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return showBoard();
  if (parts[0] === "bounty" && parts[1]) return showBounty(decodeURIComponent(parts[1]));
  if (parts[0] === "leaderboard" && parts[1]) return showLeaderboard(decodeURIComponent(parts[1]));
  if (parts[0] === "u" && parts[1]) return showProfile(decodeURIComponent(parts[1]));
  mount(
    errorView("That page does not exist here. The board, a bounty, its leaderboard and a profile are the four pages this client has.", () => {
      window.location.hash = "#/";
    }),
    "Not found",
  );
}

lookup.addEventListener("submit", (event) => {
  event.preventDefault();
  const handle = cleanHandle(handleInput.value);
  if (!validHandle(handle)) {
    handleInput.setAttribute("aria-invalid", "true");
    handleInput.focus();
    return;
  }
  handleInput.removeAttribute("aria-invalid");
  window.location.hash = `#/u/${handle}`;
  handleInput.value = "";
});

window.addEventListener("hashchange", route);
setShotReady(false);
route();
