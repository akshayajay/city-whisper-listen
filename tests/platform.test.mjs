import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { database } from "../scripts/local-db.mjs";
import worker from "../worker/index.js";
import { insert } from "../worker/store.js";
const call = (db, path, options) =>
  worker.fetch(new Request(`http://localhost${path}`, options), { DB: db });
const report = (changes = {}) => ({
  id: crypto.randomUUID(),
  content: "Broken streetlights near the school make it unsafe at night.",
  city: "Chennai",
  area: "Adyar",
  category: "Safety",
  ...changes,
});
const post = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
test("submission persists after database reopen and retries are idempotent", async () => {
  const dir = mkdtempSync(join(tmpdir(), "citypulse-"));
  const path = join(dir, "test.sqlite");
  let db = database(path);
  try {
    const body = report();
    const first = await call(db, "/api/reports", post(body));
    assert.equal(first.status, 201);
    const saved = await first.json();
    assert.equal(saved.event.sentiment, "negative");
    assert.equal(saved.event.demo, 0);
    db.close();
    db = database(path);
    const duplicate = await call(db, "/api/reports", post(body));
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).duplicate, true);
    const data = await (await call(db, "/api/snapshot?mode=live")).json();
    assert.equal(data.summary.total, 1);
    assert.equal(data.events[0].id, body.id);
    const conflict = await call(
      db,
      "/api/reports",
      post({ ...body, content: "A different report with the same id." }),
    );
    assert.equal(conflict.status, 409);
  } finally {
    db.close();
    rmSync(dir, { recursive: true });
  }
});
test("demo and real datasets remain isolated, concurrent demo generation deduplicates", async () => {
  const db = database();
  try {
    await call(db, "/api/reports", post(report()));
    await Promise.all([
      call(db, "/api/demo", { method: "POST" }),
      call(db, "/api/demo", { method: "POST" }),
    ]);
    const live = await (await call(db, "/api/snapshot?mode=live")).json();
    const demo = await (await call(db, "/api/snapshot?mode=demo")).json();
    assert.equal(live.summary.total, 1);
    assert.ok(demo.summary.total >= 49 && demo.summary.total <= 50);
    assert.ok(demo.events.every((e) => e.demo === 1));
    assert.ok(live.events.every((e) => e.demo === 0));
    assert.equal(
      new Set(demo.events.map((e) => e.id)).size,
      demo.events.length,
    );
  } finally {
    db.close();
  }
});
test("all filters and aggregates reconcile with matching records; search is literal", async () => {
  const db = database();
  try {
    await call(db, "/api/reports", post(report()));
    await call(
      db,
      "/api/reports",
      post(
        report({
          city: "Madurai",
          content: "Great park, thanks for the clean public space.",
          area: "Park",
          category: "Parks",
        }),
      ),
    );
    await call(
      db,
      "/api/reports",
      post(
        report({
          content: "Water supply schedule requested for tomorrow.",
          category: "Water",
          area: "100% Avenue",
        }),
      ),
    );
    let data = await (await call(db, "/api/snapshot?mode=live")).json();
    assert.equal(data.summary.total, 3);
    for (const list of [data.categories, data.cities, data.trend])
      assert.equal(
        list.reduce((s, x) => s + x.total, 0),
        3,
      );
    assert.equal(
      data.summary.positive + data.summary.negative + data.summary.neutral,
      3,
    );
    data = await (
      await call(
        db,
        "/api/snapshot?mode=live&city=Chennai&category=Safety&sentiment=negative&q=school",
      )
    ).json();
    assert.equal(data.summary.total, 1);
    assert.equal(data.events[0].category, "Safety");
    data = await (await call(db, "/api/snapshot?mode=live&q=%25")).json();
    assert.equal(data.summary.total, 1);
    assert.equal(data.events[0].area, "100% Avenue");
    data = await (
      await call(db, "/api/snapshot?mode=live&q=%27%20OR%201=1--")
    ).json();
    assert.equal(data.summary.total, 0);
  } finally {
    db.close();
  }
});
test("rejects invalid, oversized and cross-origin writes without storing a record", async () => {
  const db = database();
  try {
    for (const body of [
      null,
      [],
      report({ content: "short" }),
      report({ city: "Atlantis" }),
      report({ category: "fake" }),
      report({ area: "x" }),
      report({ id: "x" }),
    ])
      assert.equal((await call(db, "/api/reports", post(body))).status, 400);
    assert.equal(
      (
        await call(
          db,
          "/api/reports",
          post(report({ content: "x".repeat(13000) })),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await call(db, "/api/reports", {
          ...post(report()),
          headers: {
            "content-type": "application/json",
            origin: "https://elsewhere.example",
          },
        })
      ).status,
      403,
    );
    assert.equal((await call(db, "/api/snapshot?hours=0")).status, 400);
    assert.equal(
      (await (await call(db, "/api/snapshot?mode=live")).json()).summary.total,
      0,
    );
  } finally {
    db.close();
  }
});
test("CSV obeys filters and protects spreadsheet formulas", async () => {
  const db = database();
  try {
    await call(
      db,
      "/api/reports",
      post(report({ content: '=HYPERLINK("bad", "click me")' })),
    );
    await call(db, "/api/reports", post(report({ city: "Salem" })));
    const response = await call(db, "/api/export?mode=live&city=Chennai");
    const csv = await response.text();
    assert.equal(
      response.headers.get("content-type"),
      "text/csv; charset=utf-8",
    );
    assert.equal(csv.split("\r\n").length, 2);
    assert.ok(csv.includes("\"'=HYPERLINK"));
    assert.ok(!csv.includes("Salem"));
  } finally {
    db.close();
  }
});
test("SSE replays only matching unseen events after cursor and closes on cancellation", async () => {
  const db = database();
  try {
    const first = await (await call(db, "/api/reports", post(report()))).json();
    const second = await (
      await call(db, "/api/reports", post(report()))
    ).json();
    await call(db, "/api/demo", { method: "POST" });
    const abort = new AbortController();
    const response = await call(
      db,
      `/api/stream?mode=live&cursor=${first.event.seq}`,
      { signal: abort.signal },
    );
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const reader = response.body.getReader();
    let text = "";
    while (!text.includes("event: heartbeat")) {
      const chunk = await reader.read();
      text += new TextDecoder().decode(chunk.value);
    }
    assert.ok(text.includes(`id: ${second.event.seq}`));
    assert.ok(text.includes('"count":1'));
    assert.ok(!text.includes("Demo"));
    await reader.cancel();
    abort.abort();
  } finally {
    db.close();
  }
});
test("time windows exclude old events while recent records remain", async () => {
  const db = database();
  try {
    const now = new Date().toISOString(),
      old = new Date(Date.now() - 3 * 86400000).toISOString();
    await insert(db, {
      ...report(),
      source: "Citizen report",
      demo: 0,
      sentiment: "negative",
      created_at: old,
      received_at: old,
    }).run();
    await call(db, "/api/reports", post(report()));
    assert.equal(
      (await (await call(db, "/api/snapshot?hours=24")).json()).summary.total,
      1,
    );
    assert.equal(
      (await (await call(db, "/api/snapshot?hours=168")).json()).summary.total,
      2,
    );
  } finally {
    db.close();
  }
});
test("missing storage is a visible error, not a successful mock response", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/snapshot"),
    {},
  );
  assert.equal(response.status, 503);
  assert.ok((await response.json()).error);
});
test("public intake limits new reports but permits an idempotent retry", async () => {
  const db = database();
  const body = report();
  const submit = (payload) =>
    worker.fetch(new Request("http://localhost/api/reports", post(payload)), {
      DB: db,
      CLIENT_IP: "192.0.2.8",
    });
  try {
    assert.equal((await submit(body)).status, 201);
    for (let i = 0; i < 9; i++)
      assert.equal((await submit(report())).status, 201);
    assert.equal((await submit(report())).status, 429);
    assert.equal((await submit(body)).status, 200);
    assert.equal(
      (await (await call(db, "/api/snapshot?mode=live")).json()).summary.total,
      10,
    );
  } finally {
    db.close();
  }
});
test("time series includes empty buckets rather than connecting across missing hours", async () => {
  const db = database();
  try {
    await call(db, "/api/reports", post(report()));
    const data = await (await call(db, "/api/snapshot?hours=24")).json();
    assert.equal(data.trend.length, 25);
    assert.equal(data.trend.filter((x) => x.total === 0).length, 24);
  } finally {
    db.close();
  }
});
test("frontend routes fall back to index, but missing assets and API endpoints stay 404", async () => {
  const db = database();
  const ASSETS = {
    async fetch(req) {
      return new URL(req.url).pathname === "/index.html"
        ? new Response("<html>CityPulse</html>")
        : new Response("Missing", { status: 404 });
    },
  };
  try {
    for (const route of [
      "/dashboard",
      "/map",
      "/analytics",
      "/reports",
      "/sources",
    ])
      assert.equal(
        (
          await worker.fetch(new Request(`https://example.test${route}`), {
            DB: db,
            ASSETS,
          })
        ).status,
        200,
      );
    assert.equal(
      (
        await worker.fetch(new Request("https://example.test/missing.js"), {
          DB: db,
          ASSETS,
        })
      ).status,
      404,
    );
    assert.equal((await call(db, "/api/missing")).status, 404);
  } finally {
    db.close();
  }
});
