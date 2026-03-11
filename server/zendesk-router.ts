import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { getActiveZendeskConfig } from "./db";
import { decrypt } from "./crypto";
import { notifyOwner } from "./_core/notification";

// Cache for tracking already-notified urgent tickets to avoid duplicate notifications
const notifiedUrgentTickets = new Set<number>();

/**
 * Helper to get decrypted Zendesk credentials from the database.
 */
async function getZendeskCredentials() {
  const config = await getActiveZendeskConfig();
  if (!config) {
    throw new Error("Zendesk não configurado. Acesse a página de Administração para configurar.");
  }

  return {
    domain: decrypt(config.domain),
    user: decrypt(config.userEmail),
    token: decrypt(config.apiToken),
  };
}

/**
 * Build Basic Auth header for Zendesk API.
 */
function buildAuthHeader(user: string, token: string) {
  const credentials = Buffer.from(`${user}/token:${token}`).toString("base64");
  return `Basic ${credentials}`;
}

export const zendeskRouter = router({
  getTickets: publicProcedure.query(async () => {
    try {
      const { domain, user, token } = await getZendeskCredentials();
      const auth = buildAuthHeader(user, token);

      const response = await fetch(
        `https://${domain}/api/v2/tickets.json?sort_by=updated_at&sort_order=desc&per_page=100`,
        {
          method: "GET",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("[Zendesk Error]", response.status, errorData);
        throw new Error(`Zendesk API error: ${response.status}`);
      }

      const data = (await response.json()) as any;
      const tickets = data.tickets || [];

      // Check for new urgent tickets and send notifications
      for (const ticket of tickets) {
        if (
          ticket.priority === "urgent" &&
          (ticket.status === "new" || ticket.status === "open") &&
          !notifiedUrgentTickets.has(ticket.id)
        ) {
          notifiedUrgentTickets.add(ticket.id);
          // Send notification asynchronously (don't block the response)
          notifyOwner({
            title: `Ticket Urgente #${ticket.id}`,
            content: `Ticket urgente detectado: "${ticket.subject || "Sem título"}" - Status: ${ticket.status}. Acesse o dashboard para mais detalhes.`,
          }).catch((err) => console.warn("[Notification] Failed:", err));
        }
      }

      console.log("[Zendesk] Tickets fetched:", tickets.length);
      return { tickets, count: data.count || tickets.length };
    } catch (error) {
      console.error("[Zendesk Router Error]", error);
      throw new Error(
        error instanceof Error ? error.message : "Erro desconhecido"
      );
    }
  }),

  getUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const response = await fetch(
          `https://${domain}/api/v2/users/${input.userId}.json`,
          {
            method: "GET",
            headers: { Authorization: auth, "Content-Type": "application/json" },
          }
        );

        if (!response.ok) return { user: null };
        const data = (await response.json()) as any;
        return { user: data.user };
      } catch (error) {
        console.error("[Zendesk Get User Error]", error);
        return { user: null };
      }
    }),

  getUsers: publicProcedure.query(async () => {
    try {
      const { domain, user, token } = await getZendeskCredentials();
      const auth = buildAuthHeader(user, token);

      const response = await fetch(`https://${domain}/api/v2/users.json?per_page=100`, {
        method: "GET",
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`Zendesk API error: ${response.status}`);
      const data = (await response.json()) as any;
      console.log("[Zendesk] Users fetched:", data.users?.length || 0);
      return { users: data.users || [] };
    } catch (error) {
      console.error("[Zendesk Get Users Error]", error);
      throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
    }
  }),

  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.enum(["end-user", "agent", "admin"]).optional(),
        empresa_demo: z.string().optional(),
        agenteVirtual: z.string().optional(),
        tipoDemo: z.string().optional(),
        websiteDemo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const response = await fetch(`https://${domain}/api/v2/users.json`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            user: {
              name: input.name,
              email: input.email,
              phone: input.phone,
              role: input.role || "end-user",
              user_fields: {
                empresa_demo: input.empresa_demo || null,
                agenteVirtual: input.agenteVirtual || null,
                tipoDemo: input.tipoDemo || null,
                websiteDemo: input.websiteDemo || null,
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("[Zendesk Error]", errorData);
          throw new Error(`Zendesk API error: ${response.status}`);
        }

        const data = (await response.json()) as any;
        console.log("[Zendesk] User created:", data.user?.id);
        return { user: data.user };
      } catch (error) {
        console.error("[Zendesk Create User Error]", error);
        throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["end-user", "agent", "admin"]).optional(),
        empresa_demo: z.string().optional(),
        agenteVirtual: z.string().optional(),
        tipoDemo: z.string().optional(),
        websiteDemo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;
        if (input.phone) updateData.phone = input.phone;
        if (input.role) updateData.role = input.role;

        const user_fields: any = {};
        if (input.empresa_demo !== undefined) user_fields.empresa_demo = input.empresa_demo || null;
        if (input.agenteVirtual !== undefined) user_fields.agenteVirtual = input.agenteVirtual || null;
        if (input.tipoDemo !== undefined) user_fields.tipoDemo = input.tipoDemo || null;
        if (input.websiteDemo !== undefined) user_fields.websiteDemo = input.websiteDemo || null;

        if (Object.keys(user_fields).length > 0) {
          updateData.user_fields = user_fields;
        }

        const response = await fetch(
          `https://${domain}/api/v2/users/${input.userId}.json`,
          {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ user: updateData }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error("[Zendesk Error]", errorData);
          throw new Error(`Zendesk API error: ${response.status}`);
        }

        const data = (await response.json()) as any;
        console.log("[Zendesk] User updated:", input.userId);
        return { user: data.user };
      } catch (error) {
        console.error("[Zendesk Update User Error]", error);
        throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const response = await fetch(
          `https://${domain}/api/v2/users/${input.userId}.json`,
          {
            method: "DELETE",
            headers: { Authorization: auth, "Content-Type": "application/json" },
          }
        );

        if (!response.ok && response.status !== 204) {
          throw new Error(`Zendesk API error: ${response.status}`);
        }

        console.log("[Zendesk] User deleted:", input.userId);
        return { success: true };
      } catch (error) {
        console.error("[Zendesk Delete User Error]", error);
        throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }),

  updateTicket: protectedProcedure
    .input(
      z.object({
        ticketId: z.number(),
        status: z.string().optional(),
        priority: z.string().optional(),
        subject: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const updateData: any = {};
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.subject) updateData.subject = input.subject;
        if (input.description) updateData.description = input.description;

        const response = await fetch(
          `https://${domain}/api/v2/tickets/${input.ticketId}.json`,
          {
            method: "PUT",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify({ ticket: updateData }),
          }
        );

        if (!response.ok) throw new Error(`Zendesk API error: ${response.status}`);
        const data = (await response.json()) as any;
        return { success: true, ticket: data.ticket };
      } catch (error) {
        console.error("[Zendesk Update Error]", error);
        throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }),

  deleteTicket: protectedProcedure
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const { domain, user, token } = await getZendeskCredentials();
        const auth = buildAuthHeader(user, token);

        const response = await fetch(
          `https://${domain}/api/v2/tickets/${input.ticketId}.json`,
          {
            method: "DELETE",
            headers: { Authorization: auth, "Content-Type": "application/json" },
          }
        );

        if (!response.ok && response.status !== 204) {
          throw new Error(`Zendesk API error: ${response.status}`);
        }

        return { success: true };
      } catch (error) {
        console.error("[Zendesk Delete Error]", error);
        throw new Error(error instanceof Error ? error.message : "Erro desconhecido");
      }
    }),
});
