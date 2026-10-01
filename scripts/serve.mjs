import { createServer } from "node:http";
import { Readable } from "node:stream";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { database } from "./local-db.mjs";
import worker from "../worker/index.js";
const dataDir = process.env.DATA_DIR || ".data";
mkdirSync(dataDir, { recursive: true });
const db = database(resolve(dataDir, "citypulse.sqlite"));
const root = resolve("dist/client");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
const ASSETS = {
  async fetch(request) {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("Method not allowed", { status: 405 });
    let path;
    try {
      path = resolve(
        root,
        "." + decodeURIComponent(new URL(request.url).pathname),
      );
    } catch {
      return new Response("Invalid URL", { status: 400 });
    }
    if (path !== root && !path.startsWith(root + sep))
      return new Response("Not found", { status: 404 });
    try {
      if (!statSync(path).isFile())
        return new Response("Not found", { status: 404 });
      return new Response(
        request.method === "HEAD" ? null : readFileSync(path),
        {
          headers: {
            "Content-Type": mime[extname(path)] || "application/octet-stream",
          },
        },
      );
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
};
const server = createServer(async (req, res) => {
  const abort = new AbortController();
  res.on("close", () => abort.abort());
  // An upstream HTTPS proxy may set X-Forwarded-Proto; never trust it for authorization.
  const host = req.headers.host;
  const protocol = process.env.PUBLIC_ORIGIN
    ? new URL(process.env.PUBLIC_ORIGIN).protocol
    : "http:";
  const request = new Request(`${protocol}//${host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : Readable.toWeb(req),
    duplex: "half",
    signal: abort.signal,
  });
  try {
    const response = await worker.fetch(request, {
      DB: db,
      ASSETS,
      CLIENT_IP: req.socket.remoteAddress,
    });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body)
      Readable.fromWeb(response.body)
        .on("error", () => res.end())
        .pipe(res);
    else res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Service unavailable");
  }
});
server.listen(
  Number(process.env.PORT || 8787),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `CityPulse listening on ${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 8787}`,
    ),
);
process.on("SIGTERM", () =>
  server.close(() => {
    db.close();
    process.exit(0);
  }),
);
