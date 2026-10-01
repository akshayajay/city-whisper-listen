import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
export function database(file = ":memory:") {
  const sqlite = new DatabaseSync(file);
  sqlite.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);",
  );
  for (const name of readdirSync("drizzle")
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    if (sqlite.prepare("SELECT name FROM _migrations WHERE name=?").get(name))
      continue;
    sqlite.exec("BEGIN");
    try {
      sqlite.exec(readFileSync(`drizzle/${name}`, "utf8"));
      sqlite.prepare("INSERT INTO _migrations VALUES (?)").run(name);
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  function prepare(sql) {
    let params = [];
    const stmt = sqlite.prepare(sql);
    return {
      bind(...args) {
        params = args;
        return this;
      },
      async all() {
        return { results: stmt.all(...params) };
      },
      async first() {
        return stmt.get(...params) || null;
      },
      async run() {
        const meta = stmt.run(...params);
        return { meta };
      },
      execute() {
        return stmt.columns().length
          ? { results: stmt.all(...params) }
          : { results: [], meta: stmt.run(...params) };
      },
    };
  }
  return {
    prepare,
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((s) => s.execute());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      sqlite.close();
    },
  };
}
