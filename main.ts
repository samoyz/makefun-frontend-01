// Beacon — entry program for the make.fun-frontend-01 bounty.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendored library. Standard library only, no network, deterministic:
// two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(name: string): void {
  const src = join(repoRoot, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) throw new Error(`missing ${name}/ in repository`);
  cpSync(src, dst, { recursive: true });
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

// Guard: the gate requires app/index.html to exist and be a regular file.
if (!existsSync(join(outDir, 'app', 'index.html'))) {
  throw new Error('app/index.html missing after copy');
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16 * 1024 * 1024,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
