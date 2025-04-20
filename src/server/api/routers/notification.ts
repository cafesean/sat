import { z } from "zod";
import * as notificationService from "../services/notification.service";
import { protectedProcedure, router } from "../trpc";

export const notificationRouter = router({
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().optional(), unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const limit = input?.limit;
      const unreadOnly = input?.unreadOnly ?? false;
      return notificationService.getUserNotifications(userId, limit, unreadOnly);
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      return notificationService.markNotificationAsRead(input.notificationId);
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      return notificationService.markAllNotificationsAsRead(ctx.session.user.id);
    }),
});