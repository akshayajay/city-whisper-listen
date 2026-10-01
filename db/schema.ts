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
    sourceUrl: text("source_url"),
    authorUsername: text("author_username"),
    authorName: text("author_name"),
    authorAvatar: text("author_avatar"),
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

export const xIngestion = sqliteTable("x_ingestion", {
  id: text("id").primaryKey(),
  sinceId: text("since_id"),
  nextAllowed: integer("next_allowed").notNull().default(0),
  lastAttempt: text("last_attempt"),
  lastSuccess: text("last_success"),
  lastError: text("last_error"),
  day: text("day"),
  reservedPosts: integer("reserved_posts").notNull().default(0),
});
