import { authorizedX, syncX, xStatus } from "./x-source.js";
import { allowReport } from "./rate-limit.js";
import {
  cities,
  categories,
  classify,
  validateReport,
  demoRecord,
  csvCell,
} from "./domain.js";
import { rows, insert, snapshot, filters } from "./store.js";
const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function readBody(request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("Send application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A request body is required.");
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12000) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(joined));
  } catch {
    throw new Error("Invalid JSON.");
  }
}
export function eventStream(request, db, demo) {
  const encoder = new TextEncoder();
  let stopped = false;
  let timer;
  let cancelWait;
  const last =
    request.headers.get("last-event-id") ||
    new URL(request.url).searchParams.get("cursor") ||
    "0";
  let cursor = /^\d+$/.test(last) ? Number(last) : 0;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    cancelWait?.();
  };
  request.signal.addEventListener("abort", stop, { once: true });
  const stream = new ReadableStream({
    async start(controller) {
      const send = (text) => {
        if (!stopped) controller.enqueue(encoder.encode(text));
      };
      try {
        send("retry: 2000\n\n");
        for (let i = 0; i < 12 && !stopped; i++) {
          const events = await rows(
            db,
            "SELECT seq, id FROM events WHERE demo = ? AND seq > ? ORDER BY seq LIMIT 100",
            [demo, cursor],
          );
          if (events.length) {
            cursor = events.at(-1).seq;
            send(
              `id: ${cursor}\nevent: signals\ndata: ${JSON.stringify({ cursor, count: events.length })}\n\n`,
            );
          }
          send(
            `event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`,
          );
          await new Promise((resolve) => {
            cancelWait = resolve;
            timer = setTimeout(resolve, 2000);
          });
        }
      } catch (error) {
        console.error("Stream interrupted", error);
        send("event: unavailable\ndata: {}\n\n");
      } finally {
        request.signal.removeEventListener("abort", stop);
        if (!stopped) controller.close();
        stop();
      }
    },
    cancel: stop,
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) {
      if (!env.ASSETS)
        return new Response("Build the frontend first.", { status: 503 });
      let response = await env.ASSETS.fetch(request);
      if (
        response.status === 404 &&
        request.method === "GET" &&
        !path.split("/").at(-1).includes(".")
      )
        response = await env.ASSETS.fetch(
          new Request(new URL("/index.html", url), request),
        );
      return response;
    }
    if (!env.DB)
      return json(
        { error: "Report storage is unavailable. Please retry shortly." },
        503,
      );
    try {
      if (request.method === "POST") {
        const origin = request.headers.get("origin");
        if (origin && origin !== url.origin)
          return json({ error: "Cross-origin writes are not allowed." }, 403);
      }
      if (path === "/api/sources" && request.method === "GET")
        return json({ x: await xStatus(env) });
      if (path === "/api/sources/x/sync" && request.method === "POST") {
        if (!(await authorizedX(request, env))) return json({ error: "Owner ingestion authorization required." }, 401);
        const result = await syncX(env);
        return json(result.body, result.status);
      }
      if (path === "/api/sources/x/remove" && request.method === "POST") {
        if (!(await authorizedX(request, env))) return json({ error: "Owner ingestion authorization required." }, 401);
        const body = await readBody(request);
        if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some(id => typeof id !== "string" || !/^\d{1,30}$/.test(id)))
          return json({ error: "Supply 1 to 100 X post IDs as strings." }, 400);
        const result = await env.DB.batch(body.ids.map(id => env.DB.prepare("DELETE FROM events WHERE source = 'X' AND id = ?").bind(`x-${id}`)));
        return json({ removed: result.reduce((sum, row) => sum + Number(row.meta?.changes || 0), 0) });
      }
      if (path === "/api/health" && request.method === "GET") {
        await env.DB.prepare("SELECT 1 FROM events LIMIT 1").all();
        return json({
          status: "ok",
          storage: "connected",
          transport: "server-sent events",
          classifier: "English keyword heuristic",
          cities,
          categories,
        });
      }
      if (path === "/api/snapshot" && request.method === "GET")
        return json(await snapshot(env.DB, url));
      if (path === "/api/stream" && request.method === "GET")
        return eventStream(
          request,
          env.DB,
          url.searchParams.get("mode") === "demo" ? 1 : 0,
        );
      if (path === "/api/reports" && request.method === "POST") {
        const body = validateReport(await readBody(request));
        const existing = await env.DB.prepare(
          "SELECT id FROM events WHERE id = ?",
        )
          .bind(body.id)
          .first();
        if (!existing && !(await allowReport(request, env)))
          return json(
            {
              error:
                "Too many reports. Please wait up to 10 minutes before submitting again.",
            },
            429,
          );
        const now = new Date().toISOString();
        const event = {
          ...body,
          sentiment: classify(body.content),
          source: "Citizen report",
          demo: 0,
          created_at: now,
          received_at: now,
        };
        const result = await insert(env.DB, event).run();
        const saved = await env.DB.prepare("SELECT * FROM events WHERE id = ?")
          .bind(body.id)
          .first();
        if (
          ["content", "city", "area", "category"].some(
            (key) => saved[key] !== body[key],
          ) ||
          saved.demo !== 0 || saved.source !== "Citizen report"
        )
          return json(
            {
              error:
                "Submission ID already belongs to a different report. Start a new report.",
            },
            409,
          );
        return json(
          { event: saved, duplicate: result.meta.changes === 0 },
          result.meta.changes ? 201 : 200,
        );
      }
      if (path === "/api/demo" && request.method === "POST") {
        // Shared time-slot IDs make concurrent viewers and retries duplicate-safe.
        const slot = Math.floor(Date.now() / 5000);
        const current = await env.DB.prepare(
          "SELECT id FROM events WHERE demo = 1 LIMIT 1",
        ).first();
        const records = [];
        if (!current)
          for (let i = 48; i > 0; i--)
            records.push(
              demoRecord(
                slot - i * 121,
                new Date((slot - i * 121) * 5000).toISOString(),
              ),
            );
        records.push(demoRecord(slot, new Date(slot * 5000).toISOString()));
        await env.DB.batch([
          ...records.map((event) => insert(env.DB, event)),
          env.DB.prepare(
            "DELETE FROM events WHERE demo = 1 AND created_at < ?",
          ).bind(new Date(Date.now() - 86400000).toISOString()),
        ]);
        return json({
          inserted: records.length,
          mode: "demo",
          cadenceSeconds: 5,
        });
      }
      if (path === "/api/export" && request.method === "GET") {
        const { where, args } = filters(url);
        const data = await rows(
          env.DB,
          `SELECT * FROM events WHERE ${where} ORDER BY seq DESC LIMIT 10000`,
          args,
        );
        const columns = [
          "id",
          "created_at",
          "city",
          "area",
          "category",
          "sentiment",
          "source",
          "source_url",
          "author_username",
          "content",
        ];
        const csv = [
          columns.join(","),
          // X content exports contain references only; citizen text remains exportable.
          ...data.map((row) => columns.map((k) => csvCell(row.source === "X" && ["content", "author_username"].includes(k) ? "" : row[k])).join(",")),
        ].join("\r\n");
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="citypulse-reports.csv"',
            "Cache-Control": "no-store",
            "X-Export-Limit": "10000",
          },
        });
      }
      return json({ error: "Endpoint not found." }, 404);
    } catch (error) {
      if (
        error instanceof Error &&
        /^(Describe|Enter|Choose|A valid|A report|Send|Invalid JSON|Request is|A request|Unsupported)/.test(
          error.message,
        )
      )
        return json({ error: error.message }, 400);
      console.error("API failure", error);
      return json(
        {
          error:
            "Storage is temporarily unavailable. Your report has not been confirmed; retry with the same submission.",
        },
        503,
      );
    }
  },
};
