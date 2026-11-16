// Tiny static server for local testing: serves app/ on http://localhost:8080
// (or --port <n>). No build step, no dependencies — the app is static files.

import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("./app", import.meta.url)));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const portIndex = process.argv.indexOf("--port");
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) || 8080 : 8080;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${port}`);
    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`lean board at http://localhost:${port}/`);
});
