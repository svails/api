import { type InferSelectModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
  id: integer("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("passwordHash").notNull(),
});

export const sessionTable = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at", {
    mode: "timestamp",
  }).notNull(),
});

export const jobTable = sqliteTable("job", {
  id: integer("id").primaryKey(),
  type: text("type").notNull(),
  data: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
});

export type User = Omit<InferSelectModel<typeof userTable>, "passwordHash">;
export type Session = InferSelectModel<typeof sessionTable>;
export type Job = InferSelectModel<typeof jobTable>;