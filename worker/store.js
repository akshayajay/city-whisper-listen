export const rows = async (db, sql, args = []) =>
  (
    await db
      .prepare(sql)
      .bind(...args)
      .all()
  ).results;
export function insert(db, event) {
  return db
    .prepare(
      `INSERT INTO events (id, content, city, area, category, sentiment, source, demo, created_at, received_at, source_url, author_username, author_name, author_avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    )
    .bind(
      event.id,
      event.content,
      event.city,
      event.area,
      event.category,
      event.sentiment,
      event.source,
      event.demo,
      event.created_at,
      event.received_at,
      event.source_url || null,
      event.author_username || null,
      event.author_name || null,
      event.author_avatar || null,
    );
}
export function filters(url) {
  const args = [url.searchParams.get("mode") === "demo" ? 1 : 0];
  const clauses = ["demo = ?"];
  for (const name of ["city", "category", "sentiment", "source"]) {
    const value = url.searchParams.get(name);
    if (value && value !== "all") {
      clauses.push(`${name} = ?`);
      args.push(value);
    }
  }
  const q = url.searchParams.get("q")?.trim().slice(0, 100);
  if (q) {
    clauses.push("(content LIKE ? ESCAPE '\\' OR area LIKE ? ESCAPE '\\')");
    const search = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    args.push(search, search);
  }
  const hours = Number(url.searchParams.get("hours") || "24");
  if (![1, 24, 168, 720].includes(hours))
    throw new Error("Unsupported time window.");
  clauses.push("created_at >= ?");
  args.push(new Date(Date.now() - hours * 3600000).toISOString());
  return { where: clauses.join(" AND "), args, hours };
}
export async function snapshot(db, url) {
  const { where, args, hours } = filters(url);
  // A batch gives all panels the same database snapshot, even during concurrent writes.
  const queries = [
    [
      `SELECT COUNT(*) AS total, COALESCE(SUM(sentiment='negative'),0) AS negative, COALESCE(SUM(sentiment='positive'),0) AS positive, COALESCE(SUM(sentiment='neutral'),0) AS neutral, COUNT(DISTINCT city) AS cities, MAX(received_at) AS latest FROM events WHERE ${where}`,
      args,
    ],
    [`SELECT * FROM events WHERE ${where} ORDER BY seq DESC LIMIT 100`, args],
    [
      `SELECT category AS name, COUNT(*) AS total, SUM(sentiment='negative') AS negative FROM events WHERE ${where} GROUP BY category ORDER BY total DESC`,
      args,
    ],
    [
      `SELECT city AS name, COUNT(*) AS total, SUM(sentiment='negative') AS negative FROM events WHERE ${where} GROUP BY city ORDER BY total DESC`,
      args,
    ],
    [
      `SELECT substr(created_at,1,${hours <= 24 ? 13 : 10}) AS bucket, COUNT(*) AS total, SUM(sentiment='negative') AS negative, SUM(sentiment='positive') AS positive, SUM(sentiment='neutral') AS neutral FROM events WHERE ${where} GROUP BY bucket ORDER BY bucket`,
      args,
    ],
    [
      `SELECT COUNT(*) AS total FROM events WHERE ${where} AND received_at >= ?`,
      [...args, new Date(Date.now() - 60000).toISOString()],
    ],
    [
      "SELECT COALESCE(MAX(seq),0) AS cursor FROM events WHERE demo = ?",
      [url.searchParams.get("mode") === "demo" ? 1 : 0],
    ],
  ];
  const data = await db.batch(
    queries.map(([sql, params]) => db.prepare(sql).bind(...params)),
  );
  const step = hours <= 24 ? 3600000 : 86400000;
  const start = Math.floor((Date.now() - hours * 3600000) / step) * step;
  const buckets = new Map(data[4].results.map((row) => [row.bucket, row]));
  const trend = [];
  for (let t = start; t <= Date.now(); t += step) {
    const bucket = new Date(t).toISOString().slice(0, hours <= 24 ? 13 : 10);
    trend.push(
      buckets.get(bucket) || {
        bucket,
        total: 0,
        negative: 0,
        positive: 0,
        neutral: 0,
      },
    );
  }
  return {
    summary: { ...data[0].results[0], perMinute: data[5].results[0].total },
    events: data[1].results,
    categories: data[2].results,
    cities: data[3].results,
    trend,
    cursor: data[6].results[0].cursor,
    serverTime: new Date().toISOString(),
    mode: url.searchParams.get("mode") === "demo" ? "demo" : "live",
  };
}
