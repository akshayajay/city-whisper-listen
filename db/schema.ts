import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
export const events = sqliteTable(
  "events",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    id: text("id").notNull().unique(),
    content: text("content").notNull(),
    city: text("city").notNull(),
    area: text("area").notNull(),
    category: text("category").notNull(),
    sentiment: text("sentiment").notNull(),
    source: text("source").notNull(),
    demo: integer("demo").notNull().default(0),
    createdAt: text("created_at").notNull(),
    receivedAt: text("received_at").notNull(),
  },
  (t) => [
    index("idx_events_mode_time").on(t.demo, t.createdAt),
    index("idx_events_mode_city").on(t.demo, t.city),
  ],
);
export const intakeLimits = sqliteTable("intake_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
});
