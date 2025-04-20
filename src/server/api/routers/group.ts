import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

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

      // Verify the current user is a member of the group
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be a group member to perform this action." });
      }

      if (email) {
        // For email invites, require admin role
        if (groupMember.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only group admins can invite users by email." });
        }
        const invitedUser = await ctx.prisma.user.findUnique({
          where: { email },
        });

        if (!invitedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User with this email not found." });
        }

        // Check if the user is already a member
        const existingMember = await ctx.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: groupId,
              userId: invitedUser.id,
            },
          },
        });

        if (existingMember) {
          throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this group." });
        }

        // Check for existing pending invitation
        const existingInvite = await ctx.prisma.groupInvite.findFirst({
          where: {
            groupId,
            invitedUserId: invitedUser.id,
            status: "pending"
          }
        });

        if (existingInvite) {
          return {
            success: true,
            inviteToken: existingInvite.inviteToken,
            isExisting: true
          };
        }

        const invite = await ctx.prisma.groupInvite.create({
          data: {
            groupId,
            invitedByUserId: userId,
            invitedUserId: invitedUser.id,
            inviteToken: crypto.randomUUID(),
          },
        });

        // Send email with invite link
        // TODO: Replace with actual email sending logic
        const inviteLink = `/groups/invite/${invite.inviteToken}`;
        console.log(`Invite link: ${inviteLink}`);
        // await emailService.sendInviteEmail({
        //   to: invitedUser.email,
        //   subject: "Group Invitation",
        //   body: `You have been invited to join a group. Click here to accept: ${inviteLink}`,
        // });

        return { success: true, inviteToken: invite.inviteToken };
      } else if (generateShareLink) {
        // Log for debugging BU-0011
        console.log(`Attempting to generate share link for group ${groupId} by user ${userId}`);
        
        // Require admin role for generating share links
        if (groupMember.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only group admins can generate share links." });
        }

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
      const { inviteToken } = input;
      const userId = ctx.session.user.id;

      const invitation = await ctx.prisma.groupInvite.findUnique({
        where: { inviteToken },
      });

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      }

      if (invitation.invitedUserId && invitation.invitedUserId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This invitation is not for you." });
      }

      // Check if the user is already a member
      const existingMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: invitation.groupId,
            userId: userId,
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

      // Get word banks shared with this group
      const groupSharedBanks = await ctx.prisma.sharedWordBank.findMany({
        where: { sharedWithGroupId: invitation.groupId }
      });

      // Create member record
      const newMember = await ctx.prisma.groupMember.create({
        data: {
          groupId: invitation.groupId,
          userId: userId,
        },
      });

      // Link shared word banks to user
      await Promise.all(groupSharedBanks.map(bank =>
        ctx.prisma.sharedWordBank.create({
          data: {
            wordBankId: bank.wordBankId,
            sharedById: bank.sharedById,
            sharedWithUserId: userId,
            shareLink: crypto.randomUUID(),
          }
        })
      ));

      await ctx.prisma.groupInvite.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return { success: true, member: newMember };
    }),

  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { groupId } = input;
      const userId = ctx.session.user.id;

      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not a member of this group." });
      }

      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true },
      });

      if (group?.creatorId === userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "As the group creator, you cannot leave this group. You can either transfer ownership to another member or delete the group entirely if you no longer need it.",
        });
      }

      await ctx.prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });
      return { success: true };
    }),

  getGroupDetails: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { groupId } = input;
      const userId = ctx.session.user.id;

      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this group." });
      }

      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          creator: { select: { id: true, name: true, image: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } }
            }
          },
          sharedWordBanks: {
            include: {
              wordBank: true,
              sharedBy: { select: { id: true, name: true, image: true } }
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
      const { groupId } = input;
      const userId = ctx.session.user.id;

      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: groupId,
            userId: userId,
          },
        },
      });

      if (!groupMember) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this group." });
      }

      const members = await ctx.prisma.groupMember.findMany({
        where: { groupId: groupId },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
      return members;
    }),

  getUsersGroups: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const memberships = await ctx.prisma.groupMember.findMany({
        where: { userId: userId },
        include: {
          group: {
            include: {
              creator: { select: { id: true, name: true, image: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, image: true } }
                }
              }
            }
          }
        },
      });
      return memberships.map(m => m.group);
    }),

  deleteGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { groupId } = input;
      const userId = ctx.session.user.id;

      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      }

      if (group.creatorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the group creator can delete the group." });
      }

      await ctx.prisma.group.delete({
        where: { id: groupId },
      });

      return { success: true };
    }),

  updateGroupName: protectedProcedure
    .input(z.object({ groupId: z.string(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { groupId, name } = input;
      const userId = ctx.session.user.id;

      // Verify caller is an admin of the group
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
          role: "admin",
        },
      });

      if (!groupMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only group admins can update the group name."
        });
      }

      await ctx.prisma.group.update({
        where: { id: groupId },
        data: { name },
      });

      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      targetUserId: z.string(),
      role: z.enum(['admin', 'member'])
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupId, targetUserId, role } = input;
      const userId = ctx.session.user.id;

      // Verify caller is an admin of the group
      const callerMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
          role: "admin",
        },
      });

      if (!callerMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only group admins can update member roles."
        });
      }

      // Verify target user is a member
      const targetMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      // Explicitly check if target user is a member (Defensive check for BU-0010)
      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user is not a member of this group."
        });
      }

      // Get group to check creator
      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      }

      // Verify target is not the creator
      if (group.creatorId === targetUserId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change the role of the group creator."
        });
      }

      // Update the role
      await ctx.prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
        data: { role },
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      targetUserId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupId, targetUserId } = input;
      const userId = ctx.session.user.id;

      // Verify caller is an admin of the group
      const callerMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
          role: "admin",
        },
      });

      if (!callerMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only group admins can remove members."
        });
      }

      // Verify target user is a member
      const targetMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target user is not a member of this group."
        });
      }

      // Get group to check creator
      const group = await ctx.prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      }

      // Verify target is not the creator
      if (group.creatorId === targetUserId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the group creator."
        });
      }

      // Remove the member
      await ctx.prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId: targetUserId,
          },
        },
      });

      return { success: true };
    }),

  shareWordBankWithGroup: protectedProcedure
    .input(z.object({
      groupId: z.string(),
      wordBankId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { groupId, wordBankId } = input;
      const userId = ctx.session.user.id;

      // Verify user is the creator of the group (TS-1001)
      const group = await ctx.prisma.group.findUnique({
          where: { id: groupId },
          select: { creatorId: true },
      });

      if (!group) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
      }

      if (group.creatorId !== userId) {
          throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the group creator can share word banks with the group."
          });
      }

      // Verify user is the direct owner of the word bank
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId },
      });

      if (!wordBank || wordBank.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only share word banks you directly own."
        });
      }

      // Check if already shared
      const existingShare = await ctx.prisma.sharedWordBank.findFirst({
        where: {
          wordBankId,
          sharedWithGroupId: groupId,
        },
      });

      if (existingShare) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This word bank is already shared with the group."
        });
      }

      // Create the share record
      const sharedWordBank = await ctx.prisma.sharedWordBank.create({
        data: {
          wordBankId,
          sharedById: userId,
          sharedWithGroupId: groupId,
          shareLink: crypto.randomUUID(),
        },
      });

      return { success: true, sharedWordBank };
    }),

  shareWordBankWithUser: protectedProcedure
    .input(z.object({
      userId: z.string(),
      wordBankId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId: targetUserId, wordBankId } = input;
      const userId = ctx.session.user.id;

      // Verify user owns the word bank
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId },
      });

      if (!wordBank || wordBank.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to share this word bank."
        });
      }

      // Check if already shared
      const existingShare = await ctx.prisma.sharedWordBank.findFirst({
        where: {
          wordBankId,
          sharedWithUserId: targetUserId,
        },
      });

      if (existingShare) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This word bank is already shared with this user."
        });
      }

      // Create the share record
      const sharedWordBank = await ctx.prisma.sharedWordBank.create({
        data: {
          wordBankId,
          sharedById: userId,
          sharedWithUserId: targetUserId,
          shareLink: crypto.randomUUID(),
        },
      });

      return { success: true, sharedWordBank };
    }),

  getSharedWordBanks: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      // Get word banks shared with user directly
      const individualShares = await ctx.prisma.sharedWordBank.findMany({
        where: { sharedWithUserId: userId },
        include: {
          wordBank: true,
          sharedBy: { select: { id: true, name: true, image: true } },
        },
      });

      // Get word banks shared with groups the user is in
      const groupShares = await ctx.prisma.sharedWordBank.findMany({
        where: {
          sharedWithGroupId: {
            in: (await ctx.prisma.groupMember.findMany({
              where: { userId },
              select: { groupId: true },
            })).map(m => m.groupId),
          },
        },
        include: {
          wordBank: true,
          sharedBy: { select: { id: true, name: true, image: true } },
          sharedWithGroup: { select: { id: true, name: true } },
        },
      });

      // Get public shares (excluding user's own word banks)
      const publicShares = await ctx.prisma.sharedWordBank.findMany({
        where: {
          shareLink: { not: null },
          wordBank: {
            userId: { not: userId },
            NOT: {
              OR: [
                { sharedWordBanks: { some: { sharedWithUserId: userId } } },
                { sharedWordBanks: { some: { sharedWithGroup: { members: { some: { userId } } } } } },
              ]
            }
          }
        },
        include: {
          wordBank: true,
          sharedBy: { select: { id: true, name: true, image: true } },
        },
      });

      return {
        individualShares,
        groupShares,
        publicShares,
      };
    }),

  getWordBankByShareLink: publicProcedure
    .input(z.object({ shareLink: z.string() }))
    .query(async ({ ctx, input }) => {
      const { shareLink } = input;

      const sharedWordBank = await ctx.prisma.sharedWordBank.findUnique({
        where: { shareLink },
        include: {
          wordBank: {
            include: {
              words: {
                include: {
                  wordMaster: true
                }
              }
            }
          },
          sharedBy: true
        }
      });

      if (!sharedWordBank) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared word bank not found"
        });
      }

      // For logged in users, check if they already have access via other means
      if (ctx.session?.user?.id) {
        const existingAccess = await ctx.prisma.sharedWordBank.findFirst({
          where: {
            wordBankId: sharedWordBank.wordBankId,
            OR: [
              { sharedWithUserId: ctx.session.user.id },
              { sharedWithGroup: { members: { some: { userId: ctx.session.user.id } } } }
            ]
          }
        });

        if (existingAccess) {
          return {
            ...sharedWordBank,
            accessType: existingAccess.sharedWithUserId ? "direct" : "group"
          };
        }
      }

      return {
        ...sharedWordBank,
        accessType: "public"
      };
    }),

  generateWordBankShareLink: protectedProcedure
    .input(z.object({ wordBankId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { wordBankId } = input;
      const userId = ctx.session.user.id;

      // Verify user has access to the word bank (owner, direct share, or group share) (TS-1002)
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId },
      });

      if (!wordBank) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found." });
      }

      let hasAccess = wordBank.userId === userId; // Check direct ownership

      if (!hasAccess) {
        // Check direct share or group share
        const shareAccess = await ctx.prisma.sharedWordBank.findFirst({
          where: {
            wordBankId: wordBankId,
            OR: [
              { sharedWithUserId: userId },
              { sharedWithGroup: { members: { some: { userId: userId } } } }
            ]
          }
        });
        hasAccess = !!shareAccess;
      }

      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to generate a share link for this word bank."
        });
      }

      // Check if already has a public share link
      const existingShare = await ctx.prisma.sharedWordBank.findFirst({
        where: {
          wordBankId,
          shareLink: { not: null },
          sharedWithGroupId: null,
          sharedWithUserId: null
        },
      });

      if (existingShare) {
        return { success: true, shareLink: existingShare.shareLink };
      }

      // Create new public share record
      const sharedWordBank = await ctx.prisma.sharedWordBank.create({
        data: {
          wordBankId,
          sharedById: userId,
          shareLink: crypto.randomUUID(),
        },
      });

      return { success: true, shareLink: sharedWordBank.shareLink };
    }),

  shareWordBankViaEmail: protectedProcedure
    .input(z.object({
      wordBankId: z.string(),
      email: z.string().email(),
      message: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { wordBankId, email, message } = input;
      const userId = ctx.session.user.id;

      // Verify user owns the word bank
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId },
      });

      if (!wordBank || wordBank.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to share this word bank."
        });
      }

      // Find recipient user
      const recipient = await ctx.prisma.user.findUnique({
        where: { email },
      });

      if (!recipient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User with this email not found."
        });
      }

      // Check if already shared with this user
      const existingShare = await ctx.prisma.sharedWordBank.findFirst({
        where: {
          wordBankId,
          sharedWithUserId: recipient.id,
        },
      });

      if (existingShare) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This word bank is already shared with this user."
        });
      }

      // Create the share record
      const sharedWordBank = await ctx.prisma.sharedWordBank.create({
        data: {
          wordBankId,
          sharedById: userId,
          sharedWithUserId: recipient.id,
          shareLink: crypto.randomUUID(),
        },
      });

      // TODO: Replace with actual email sending logic
      const shareLink = `/share/${sharedWordBank.shareLink}`;
      console.log(`Share link sent to ${email}: ${shareLink}`);
      // await emailService.sendShareEmail({
      //   to: email,
      //   subject: "Word Bank Shared With You",
      //   body: `${ctx.session.user.name} has shared a word bank with you. ${message ? `Message: ${message}` : ''} Click here to view: ${shareLink}`,
      // });

      return { success: true, sharedWordBank };
    }),

  revokeWordBankShare: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { shareId } = input;
      const userId = ctx.session.user.id;

      // Verify user is the one who shared it
      const sharedWordBank = await ctx.prisma.sharedWordBank.findUnique({
        where: { id: shareId },
      });

      if (!sharedWordBank || sharedWordBank.sharedById !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to revoke this share."
        });
      }

      await ctx.prisma.sharedWordBank.delete({
        where: { id: shareId },
      });

      return { success: true };
    }),
});