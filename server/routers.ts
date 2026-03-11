import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { zendeskRouter } from "./zendesk-router";
import { uraStatusRouter } from "./ura-status-router";
import { biometryRouter } from "./biometry-router";
import { adminRouter } from "./admin-router";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  zendesk: zendeskRouter,
  uraStatus: uraStatusRouter,
  biometry: biometryRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
