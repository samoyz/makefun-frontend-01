# Beacon — a lean make.fun frontend

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

**Beacon** is a fast, easy-to-use frontend for [make.fun](https://make.fun), built from
static files with no build step. It reads make.fun's public API alone — read-only,
no sign-in, no writes — and shows the four surfaces a visitor needs:

- **Board** (`#/`) — every live bounty with its live pot, entry fee, time left and
  entry count. Type to filter, sort by pot / ending soonest / most entries.
- **Bounty page** (`#/bounty/<slug>`) — summary, description, rules, the rewards
  table with the live pot split, dates, and whether it still takes entries
  (judged by its deadline, not its status alone).
- **Leaderboard** (`#/leaderboard/<slug>`) — ranked entries with judge win rate,
  90% interval and dossier size, paginated.
- **Profile** (`#/u/<handle>`) — avatar, bio, record (entered / placed / won /
  podiums / best place / prize money) and the account's entries.

## Why it's fast

- No framework, no webfonts, no images on first load — one small stylesheet and
  four ES modules (about 25 KB raw).
- API answers are cached in memory and revalidated with `If-None-Match`
  (a 304 costs nothing); going back to a view you just left costs zero requests.
- Long lists are paginated; views update without rebuilding the page.
- Responsive layout, keyboard access (`/` focuses the board filter, skip link,
  focus moves to each view's heading) and screen-reader announcements.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open http://localhost:8080/ in a desktop browser. Every surface is reachable by
its own URL (hash routes, listed above).

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`.

## Screenshots

Taken with headless Chromium at 1280×800 on live make.fun data:

1. `screenshots/1-board.jpg` — the board (`#/`)
2. `screenshots/2-bounty.jpg` — this bounty's page (`#/bounty/makefun-frontend-01`)
3. `screenshots/3-leaderboard.jpg` — this bounty's leaderboard (`#/leaderboard/makefun-frontend-01`)

## License

MIT — see [LICENSE](LICENSE).
