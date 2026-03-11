import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Zendesk configuration table - stores encrypted credentials.
 * Only one active config at a time (singleton pattern).
 */
export const zendeskConfig = mysqlTable("zendesk_config", {
  id: int("id").autoincrement().primaryKey(),
  /** Zendesk domain (e.g., company.zendesk.com) - encrypted */
  domain: text("domain").notNull(),
  /** Zendesk user email - encrypted */
  userEmail: text("userEmail").notNull(),
  /** Zendesk API token - encrypted */
  apiToken: text("apiToken").notNull(),
  /** Label for this configuration */
  label: varchar("label", { length: 255 }),
  /** Whether this is the active configuration */
  isActive: int("isActive").default(1).notNull(),
  /** Who created this config */
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZendeskConfig = typeof zendeskConfig.$inferSelect;
export type InsertZendeskConfig = typeof zendeskConfig.$inferInsert;
