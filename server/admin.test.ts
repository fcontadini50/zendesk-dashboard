import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getActiveZendeskConfig: vi.fn().mockResolvedValue(null),
  saveZendeskConfig: vi.fn().mockResolvedValue(undefined),
  getAllZendeskConfigs: vi.fn().mockResolvedValue([]),
  deleteZendeskConfig: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

// Mock the crypto module
vi.mock("./crypto", () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted_", "")),
  maskString: vi.fn((val: string) => `***${val.slice(-3)}`),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("admin router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveConfig", () => {
    it("should return configured: false when no config exists", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.admin.getActiveConfig();
      expect(result.configured).toBe(false);
      expect(result.config).toBeNull();
    });
  });

  describe("saveConfig", () => {
    it("should save config for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.saveConfig({
        domain: "test.zendesk.com",
        userEmail: "test@test.com",
        apiToken: "test-token-123",
        label: "Test Config",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Configuração salva com sucesso");
    });

    it("should reject non-admin users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.admin.saveConfig({
          domain: "test.zendesk.com",
          userEmail: "test@test.com",
          apiToken: "test-token-123",
        })
      ).rejects.toThrow();
    });
  });

  describe("getConfigHistory", () => {
    it("should return empty array when no configs exist", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.admin.getConfigHistory();
      expect(result).toEqual([]);
    });

    it("should reject non-admin users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.getConfigHistory()).rejects.toThrow();
    });
  });

  describe("deleteConfig", () => {
    it("should delete config for admin users", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);
      const result = await caller.admin.deleteConfig({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("should reject non-admin users", async () => {
      const ctx = createRegularUserContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.deleteConfig({ id: 1 })).rejects.toThrow();
    });
  });
});
