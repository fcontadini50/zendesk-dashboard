import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

// In-memory state for URA (Virtual Agent) status
let currentUraStatus: {
  message: string;
  timestamp: number;
} = {
  message: "",
  timestamp: 0,
};

export const uraStatusRouter = router({
  // Webhook to receive URA status updates
  updateStatus: publicProcedure
    .input(
      z.object({
        status: z.string().min(1, "Status não pode estar vazio"),
      })
    )
    .mutation(async ({ input }) => {
      currentUraStatus = {
        message: input.status,
        timestamp: Date.now(),
      };

      console.log(`[URA Status] Updated: ${input.status}`);

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
    currentUraStatus = {
      message: "",
      timestamp: 0,
    };

    console.log("[URA Status] Cleared");

    return {
      success: true,
      message: "Status limpo com sucesso",
    };
  }),
});
