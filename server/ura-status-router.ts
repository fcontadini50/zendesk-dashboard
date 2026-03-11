import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// In-memory state for URA (Virtual Agent) status
// Exported so REST webhook endpoints can also update it
export let currentUraStatus: {
  message: string;
  timestamp: number;
} = {
  message: "",
  timestamp: 0,
};

export function updateUraStatus(message: string) {
  currentUraStatus = {
    message,
    timestamp: Date.now(),
  };
  console.log(`[URA Status] Updated: ${message}`);
}

export function clearUraStatus() {
  currentUraStatus = {
    message: "",
    timestamp: 0,
  };
  console.log("[URA Status] Cleared");
}

export const uraStatusRouter = router({
  // Webhook to receive URA status updates (via tRPC)
  updateStatus: publicProcedure
    .input(
      z.object({
        status: z.string().min(1, "Status não pode estar vazio"),
      })
    )
    .mutation(async ({ input }) => {
      updateUraStatus(input.status);
      return {
        success: true,
        message: "Status atualizado com sucesso",
        status: currentUraStatus.message,
      };
    }),

  // Query to get current status
  getStatus: publicProcedure.query(async () => {
    return {
      message: currentUraStatus.message,
      timestamp: currentUraStatus.timestamp,
    };
  }),

  // Clear the status
  clearStatus: publicProcedure.mutation(async () => {
    clearUraStatus();
    return {
      success: true,
      message: "Status limpo com sucesso",
    };
  }),
});
