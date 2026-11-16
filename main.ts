// Entry program for makefun-frontend-01 (Node 22, standard library only).
//
// Copies app/ and screenshots/ from this repository into the output
// directory, then writes /output/dossier.json with buildDossier from
// vendor/makefun-frontend.ts — the kit's copy, unchanged.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The program runs twice and both runs must write the same bytes, so
// the copy is deterministic: entries walked in code-unit path order,
// no timestamps written anywhere.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || "/output";

// Count the plain files under a directory, for the run summary.
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) n += countFiles(path);
    else if (entry.isFile()) n += 1;
  }
  return n;
}

function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const appSrc = join(REPO_ROOT, "app");
  const shotsSrc = join(REPO_ROOT, "screenshots");
  if (!existsSync(appSrc)) throw new Error("main.ts: no app/ directory in the repository");
  if (!existsSync(shotsSrc)) throw new Error("main.ts: no screenshots/ directory in the repository");

  cpSync(appSrc, join(OUT_DIR, "app"), { recursive: true });
  cpSync(shotsSrc, join(OUT_DIR, "screenshots"), { recursive: true });

  const dossier = buildDossier(OUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(OUT_DIR, "dossier.json"), dossier);

  const appFiles = countFiles(join(OUT_DIR, "app"));
  const shotFiles = countFiles(join(OUT_DIR, "screenshots"));
  console.log(
    `makefun-frontend-01: ${appFiles} app files, ${shotFiles} screenshots, ` +
      `dossier.json ${dossier.length} bytes -> ${OUT_DIR}`,
  );
}

main();
