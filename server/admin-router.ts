import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getActiveZendeskConfig,
  saveZendeskConfig,
  getAllZendeskConfigs,
  deleteZendeskConfig,
} from "./db";
import { encrypt, decrypt, maskString } from "./crypto";

export const adminRouter = router({
  /**
   * Get the active Zendesk configuration (masked for security).
   * Available to authenticated users to check if config exists.
   */
  getActiveConfig: protectedProcedure.query(async () => {
    try {
      const config = await getActiveZendeskConfig();
      if (!config) {
        return { configured: false, config: null };
      }

      // Decrypt and mask for display
      const domain = decrypt(config.domain);
      const userEmail = decrypt(config.userEmail);

      return {
        configured: true,
        config: {
          id: config.id,
          domain: domain,
          userEmail: maskString(userEmail),
          apiToken: "••••••••••••",
          label: config.label,
          isActive: config.isActive === 1,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
        },
      };
    } catch (error) {
      console.error("[Admin] Error getting config:", error);
      return { configured: false, config: null };
    }
  }),

  /**
   * Save new Zendesk configuration (admin only).
   * Encrypts all sensitive fields before storing.
   */
  saveConfig: adminProcedure
    .input(
      z.object({
        domain: z
          .string()
          .min(1, "Domínio é obrigatório")
          .refine(
            (val) => val.includes(".zendesk.com") || val.includes("."),
            "Domínio deve ser válido (ex: empresa.zendesk.com)"
          ),
        userEmail: z.string().email("Email deve ser válido"),
        apiToken: z.string().min(1, "Token é obrigatório"),
        label: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Encrypt all sensitive fields
        const encryptedDomain = encrypt(input.domain);
        const encryptedEmail = encrypt(input.userEmail);
        const encryptedToken = encrypt(input.apiToken);

        await saveZendeskConfig({
          domain: encryptedDomain,
          userEmail: encryptedEmail,
          apiToken: encryptedToken,
          label: input.label,
          createdBy: ctx.user.id,
        });

        console.log("[Admin] Zendesk config saved by user:", ctx.user.id);

        return {
          success: true,
          message: "Configuração salva com sucesso",
        };
      } catch (error) {
        console.error("[Admin] Error saving config:", error);
        throw new Error(
          error instanceof Error ? error.message : "Erro ao salvar configuração"
        );
      }
    }),

  /**
   * Test Zendesk connection with provided credentials (admin only).
   */
  testConnection: adminProcedure
    .input(
      z.object({
        domain: z.string().min(1),
        userEmail: z.string().email(),
        apiToken: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const credentials = Buffer.from(
          `${input.userEmail}/token:${input.apiToken}`
        ).toString("base64");

        const response = await fetch(
          `https://${input.domain}/api/v2/tickets/count.json`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            success: true,
            message: `Conexão bem-sucedida! Total de tickets: ${data.count?.value || "N/A"}`,
          };
        } else {
          const errorText = await response.text();
          return {
            success: false,
            message: `Falha na conexão (${response.status}): ${errorText.substring(0, 200)}`,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Erro de conexão: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        };
      }
    }),

  /**
   * Get all configurations history (admin only).
   */
  getConfigHistory: adminProcedure.query(async () => {
    try {
      const configs = await getAllZendeskConfigs();
      return configs.map((c) => ({
        id: c.id,
        domain: maskString(decrypt(c.domain)),
        label: c.label,
        isActive: c.isActive === 1,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    } catch (error) {
      console.error("[Admin] Error getting config history:", error);
      return [];
    }
  }),

  /**
   * Delete a configuration (admin only).
   */
  deleteConfig: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await deleteZendeskConfig(input.id);
        return { success: true };
      } catch (error) {
        console.error("[Admin] Error deleting config:", error);
        throw new Error("Erro ao deletar configuração");
      }
    }),
});
