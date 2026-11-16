# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, unofficial frontend for make.fun — a static app with no build step that reads make.fun's public API alone. It shows the live bounty board (each bounty's live pot, entry fee, time left and entries), a bounty's page (summary, description, full rules, live rewards table with the fee split, dates, recent entries), that bounty's leaderboard (rank, win rate with interval, size, paginated), and an account's public profile (bio, avatar, GitHub, wallet, record, entries). Every surface has its own URL and is reachable by a link.

## Why it is fast

- **Tiny first load:** plain ES modules and one small stylesheet, no framework, no webfont. The leaderboard and profile views load on demand with a literal `import()`, so they never weigh down the first load.
- **Cached API answers:** every response is cached in memory and localStorage and revalidated with its ETag (`If-None-Match`; the API's ETags are bound to the minute, so a revalidation inside the minute answers 304 and costs no body). Fresh answers are served with no request at all, and a failed request falls back to the last good answer. The footer shows the session's request count.
- **Few requests a view:** the board is one request, a bounty page is one, a leaderboard is one. Times left tick every 30 s without a refetch, and the board's search and sort filter client-side.

## Ease of use

- Responsive phone layout (tables stack into cards), keyboard access (real links, a skip link, visible focus, focus moves to the heading on navigation), and screen-reader access (semantic tables and headings, `aria-live` main region, labelled search).
- Open/closed is decided by the deadline, not the status alone: a bounty past its deadline reads closed even while the API still lists it open.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve `app/` with any static HTTP server.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `buildDossier` library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=samz&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
