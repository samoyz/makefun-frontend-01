# make.fun — lean board

[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun), built from
static files with no build step and no framework. It reads only the public
make.fun API (`https://make.fun/api`, CORS open) and shows the four surfaces
a visitor needs — each reachable by a link and by its own URL:

| Route | Surface |
| --- | --- |
| `#/` | Live bounty board — every open bounty with its live pot, entry fee, time left and entry count |
| `#/bounty/<slug>` | One bounty's page — summary, rules, live rewards table with the pot split, dates and status |
| `#/leaderboard/<slug>` | That bounty's leaderboard — rank, entrant, entry, judge win rate, validity, size |
| `#/u/<handle>` | An account's public profile — bio, links, record and entries |

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
```

Any static file server works: `app/` at the server root, open `index.html`.

## Why it is fast

- **Tiny first load:** one HTML file, one stylesheet and four small ES
  modules — no framework, no webfont, no bundler.
- **Cached API answers:** responses are revalidated with `If-None-Match`.
  The API's ETags are bound to the minute, so a revisit inside the minute
  answers `304` and costs no body; fresh answers are reused for 60 s.
- **Few requests per view:** one API call per surface; the board paginates
  with the API's cursor, the leaderboard pages client-side.
- **No rebuilds:** views update by swapping the `<main>` content; the
  header, search and footer stay put.

## Ease of use

- Filter the board by text and sort by pot, closing time, entries or base
  reward.
- A bounty past its deadline is shown closed by its **deadline**, not its
  status (the API may still read `open` until results publish).
- Responsive down to a phone, keyboard navigable, skip link, `aria-live`
  status, focus moved to each page heading, labelled controls.
- API text is rendered with `textContent` only — never as HTML.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to the output directory and writes `dossier.json` with
`buildDossier` from `vendor/makefun-frontend.ts` (the kit's copy,
unchanged). See `shots.json` for the three screenshots and their routes.

## License

MIT — see [LICENSE](LICENSE).
