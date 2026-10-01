import { createServer } from "node:http";
import { Readable } from "node:stream";
import { mkdirSync } from "node:fs";
import { database } from "./local-db.mjs";
import worker from "../worker/index.js";
mkdirSync(".data", { recursive: true });
const db = database(".data/citypulse.sqlite");
createServer(async (req, res) => {
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  const origin = `http://${req.headers.host}`;
  // Vite preserves the browser Origin while proxying. Normalize only in this local adapter.
  const headers = { ...req.headers };
  if (
    headers.origin === "http://localhost:8080" ||
    headers.origin === "http://127.0.0.1:8080"
  )
    headers.origin = origin;
  const request = new Request(origin + req.url, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : Readable.toWeb(req),
    duplex: "half",
    signal: controller.signal,
  });
  try {
    const response = await worker.fetch(request, {
      DB: db,
      X_ENABLED: process.env.X_ENABLED,
      X_BEARER_TOKEN: process.env.X_BEARER_TOKEN,
      X_INGEST_TOKEN: process.env.X_INGEST_TOKEN,
      X_DAILY_POST_LIMIT: process.env.X_DAILY_POST_LIMIT,
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
    res.writeHead(500);
    res.end("Local API error");
  }
}).listen(8787, "127.0.0.1", () =>
  console.log("CityPulse API: http://127.0.0.1:8787"),
);
