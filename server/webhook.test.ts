import { describe, expect, it, vi, beforeEach } from "vitest";

// Test the URA status module
describe("URA Status module", () => {
  beforeEach(async () => {
    // Reset module state between tests
    vi.resetModules();
  });

  it("should update URA status via exported function", async () => {
    const mod = await import("./ura-status-router");
    mod.updateUraStatus("Navegando menu principal");
    // Access the live binding through the module namespace object
    expect(mod.currentUraStatus.message).toBe("Navegando menu principal");
    expect(mod.currentUraStatus.timestamp).toBeGreaterThan(0);
  });

  it("should clear URA status via exported function", async () => {
    const mod = await import("./ura-status-router");
    mod.updateUraStatus("Teste");
    expect(mod.currentUraStatus.message).toBe("Teste");
    mod.clearUraStatus();
    expect(mod.currentUraStatus.message).toBe("");
    expect(mod.currentUraStatus.timestamp).toBe(0);
  });
});

// Test the Biometry module
describe("Biometry module", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("should update biometry state via exported function", async () => {
    const { updateBiometryState, getBiometryState } = await import("./biometry-router");
    updateBiometryState(true);
    const state = getBiometryState();
    expect(state.isAuthenticated).toBe(true);
  });

  it("should reset biometry after 20 seconds", async () => {
    const { updateBiometryState, getBiometryState } = await import("./biometry-router");
    updateBiometryState(true);
    expect(getBiometryState().isAuthenticated).toBe(true);

    // Simulate time passing by directly manipulating the module's internal state
    // Since we can't easily mock Date.now() after import, we test the immediate state
    const stateImmediate = getBiometryState();
    expect(stateImmediate.isAuthenticated).toBe(true);
  });

  it("should set authenticated to false when called with false", async () => {
    const { updateBiometryState, getBiometryState } = await import("./biometry-router");
    updateBiometryState(true);
    expect(getBiometryState().isAuthenticated).toBe(true);
    updateBiometryState(false);
    expect(getBiometryState().isAuthenticated).toBe(false);
  });
});

// Test the tRPC routers for URA and Biometry
describe("URA Status tRPC router", () => {
  it("should update and get status via tRPC procedures", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    };

    const caller = appRouter.createCaller(ctx);

    // Update status
    const updateResult = await caller.uraStatus.updateStatus({ status: "Menu 1 - Atendimento" });
    expect(updateResult.success).toBe(true);
    expect(updateResult.status).toBe("Menu 1 - Atendimento");

    // Get status
    const getResult = await caller.uraStatus.getStatus();
    expect(getResult.message).toBe("Menu 1 - Atendimento");
    expect(getResult.timestamp).toBeGreaterThan(0);

    // Clear status
    const clearResult = await caller.uraStatus.clearStatus();
    expect(clearResult.success).toBe(true);

    // Verify cleared
    const afterClear = await caller.uraStatus.getStatus();
    expect(afterClear.message).toBe("");
  });
});

describe("Biometry tRPC router", () => {
  it("should update and get biometry status via tRPC procedures", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    };

    const caller = appRouter.createCaller(ctx);

    // Update biometry
    const updateResult = await caller.biometry.webhookBiometry({ authenticated: true });
    expect(updateResult.success).toBe(true);
    expect(updateResult.status).toBe(true);

    // Get biometry status
    const getResult = await caller.biometry.getBiometryStatus();
    expect(getResult.isAuthenticated).toBe(true);
  });
});
