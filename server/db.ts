import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, zendeskConfig, InsertZendeskConfig } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Zendesk Config Helpers ───

/**
 * Get the currently active Zendesk configuration.
 * Returns null if no config is set.
 */
export async function getActiveZendeskConfig() {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(zendeskConfig)
    .where(eq(zendeskConfig.isActive, 1))
    .orderBy(desc(zendeskConfig.updatedAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Save or update Zendesk configuration.
 * Deactivates all existing configs and inserts the new one as active.
 */
export async function saveZendeskConfig(config: {
  domain: string;
  userEmail: string;
  apiToken: string;
  label?: string;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deactivate all existing configs
  await db.update(zendeskConfig).set({ isActive: 0 });

  // Insert new active config
  await db.insert(zendeskConfig).values({
    domain: config.domain,
    userEmail: config.userEmail,
    apiToken: config.apiToken,
    label: config.label || null,
    isActive: 1,
    createdBy: config.createdBy || null,
  });
}

/**
 * Get all Zendesk configurations (for history).
 */
export async function getAllZendeskConfigs() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(zendeskConfig)
    .orderBy(desc(zendeskConfig.updatedAt));
}

/**
 * Delete a Zendesk configuration by ID.
 */
export async function deleteZendeskConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(zendeskConfig).where(eq(zendeskConfig.id, id));
}
