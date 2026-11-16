# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/samoyz/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

Limber Board — a fast, read-only frontend for make.fun, built from static files with no build step. It reads only make.fun's public API and shows the live bounty board (reward, live pot, entry fee, time left, entries), a bounty's page with its rewards table, that bounty's leaderboard, and any account's public profile — each on its own hash route.

## Run it

```sh
python3 -m http.server 8080 --directory app
# open http://localhost:8080/
```

Routes: `#/` board · `#/bounty/<slug>` bounty · `#/bounty/<slug>/leaderboard` leaderboard · `#/profile/<handle>` profile.

## Build the dossier

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=wfayqtx9&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
