import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const groupRouter = router({
  createGroup: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const newGroup = await ctx.prisma.group.create({
        data: {
          name: input.name,
          creatorId: userId,
          members: {
            create: {
              userId: userId,
              role: "admin",
            },
          },
        },
      });

      return { success: true, group: newGroup };
    }),

  inviteUserToGroup: protectedProcedure
    .input(z.object({ 
      groupId: z.string(), 
      email: z.string().email().optional(), 
      generateShareLink: z.boolean().optional() 
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupId, email, generateShareLink } = input;
      const userId = ctx.session.user.id;

      // Verify the current user is an admin of the group
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
          role: "admin",
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only group admins can invite users." });
      }

      if (email) {
        // TODO: Implement email invitation logic
        const invitedUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (!invitedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User with this email not found." });
        }

        const invite = await ctx.prisma.groupInvite.create({
          data: {
            groupId,
            invitedByUserId: userId,
            invitedUserId: invitedUser.id,
            inviteToken: crypto.randomUUID(),
          },
        });

        // TODO: Send email with invite link
        return { success: true, inviteToken: invite.inviteToken };
      } else if (generateShareLink) {
        const invite = await ctx.prisma.groupInvite.create({
          data: {
            groupId,
            invitedByUserId: userId,
            inviteToken: crypto.randomUUID(),
          },
        });
        return { success: true, inviteToken: invite.inviteToken };
      } else {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invalid input. Provide either email or request to generate a share link." 
        });
      }
    }),

  acceptGroupInvite: protectedProcedure
    .input(z.object({ inviteToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.prisma.groupInvite.findUnique({
        where: { inviteToken: input.inviteToken },
      });
      
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      }

      // Check if the user is already a member
      const existingMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (existingMember) {
        await ctx.prisma.groupInvite.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        });
        return { success: true, member: existingMember };
      }

      const newMember = await ctx.prisma.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId: ctx.session.user.id,
        },
      });

      await ctx.prisma.groupInvite.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return { success: true, member: newMember };
    }),

  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not a member of this group." });
      }

      const group = await ctx.prisma.group.findUnique({
        where: { id: input.groupId },
        select: { creatorId: true },
      });

      if (group?.creatorId === ctx.session.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Group creators cannot leave their own group. Please delete the group instead." 
        });
      }

      await ctx.prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
      });
      return { success: true };
    }),

  getGroupDetails: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this group." });
      }

      const group = await ctx.prisma.group.findUnique({
        where: { id: input.groupId },
        include: {
          creator: { select: { id: true, name: true, image: true } },
          members: { 
            include: { 
              user: { select: { id: true, name: true, image: true } } 
            } 
          },
          sharedWordBanks: { 
            include: { 
              wordBank: true 
            } 
          },
        },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      }

      return group;
    }),

  getGroupMembers: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this group." });
      }

      const members = await ctx.prisma.groupMember.findMany({
        where: { groupId: input.groupId },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
      return members;
    }),

  getUsersGroups: protectedProcedure
    .query(async ({ ctx }) => {
      const memberships = await ctx.prisma.groupMember.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          group: {
            include: {
              members: true // Include members in the group object
            }
          }
        },
      });
      return memberships.map(m => m.group);
    }),
});