import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// In-memory biometry state with timestamp
// Exported so REST webhook endpoints can also update it
let biometryState = {
  authenticated: false,
  timestamp: new Date(),
};

// Track last webhook time for auto-reset
let lastWebhookTime = 0;

export function getBiometryState() {
  const now = Date.now();
  const timeSinceLastWebhook = now - lastWebhookTime;
  const shouldReset = timeSinceLastWebhook > 20000; // 20 seconds

  // Reset if 20 seconds passed since last webhook
  if (shouldReset && biometryState.authenticated) {
    biometryState.authenticated = false;
  }

  return { isAuthenticated: biometryState.authenticated };
}

export function updateBiometryState(authenticated: boolean) {
  biometryState = {
    authenticated,
    timestamp: new Date(),
  };
  lastWebhookTime = Date.now();
  console.log(`[Biometry] Updated: authenticated=${authenticated}`);
}

export const biometryRouter = router({
  getBiometryStatus: publicProcedure.query(async () => {
    return getBiometryState();
  }),

  webhookBiometry: publicProcedure
    .input(z.object({ authenticated: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      try {
        const status = input.authenticated !== false;
        updateBiometryState(status);
        return { success: true, status };
      } catch (error) {
        console.error("[Biometry Webhook Error]", error);
        return { success: false, status: false };
      }
    }),
});
