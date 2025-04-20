import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const wordBankRouter = router({
  getWordBank: protectedProcedure
    .input(z.object({ wordBankId: z.string() }))
    .query(async ({ ctx, input }) => {
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: input.wordBankId },
        include: {
          words: {
            include: {
              wordMaster: true
            }
          }
        }
      });

      if (!wordBank) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found" });
      }

      if (wordBank.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this word bank" });
      }

      return wordBank;
    }),
  shareWordBank: protectedProcedure
    .input(z.object({
      wordBankId: z.string(),
      sharedWithUserId: z.string().optional(),
      sharedWithGroupId: z.string().optional(),
      generateShareLink: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { wordBankId, sharedWithUserId, sharedWithGroupId, generateShareLink } = input;
      const userId = ctx.session.user.id;

      // Validate the word bank exists and belongs to the user
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId },
      });

      if (!wordBank) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Word bank not found." });
      }

      if (wordBank.userId !== userId) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You can only share word banks you own." 
        });
      }

      if (sharedWithUserId) {
        // Check if already shared with this user
        const existingShare = await ctx.prisma.sharedWordBank.findFirst({
          where: {
            wordBankId,
            sharedWithUserId
          }
        });

        if (existingShare) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This word bank is already shared with the specified user."
          });
        }

        const sharedWordBank = await ctx.prisma.sharedWordBank.create({
          data: {
            wordBankId,
            sharedById: userId,
            sharedWithUserId
          }
        });

        return { success: true, sharedWordBank };
      } else if (sharedWithGroupId) {
        // Verify user is a member of the group
        const groupMember = await ctx.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: sharedWithGroupId,
              userId: userId
            }
          }
        });

        if (!groupMember) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only share with groups you're a member of."
          });
        }

        // Check if already shared with this group
        const existingShare = await ctx.prisma.sharedWordBank.findFirst({
          where: {
            wordBankId,
            sharedWithGroupId
          }
        });

        if (existingShare) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This word bank is already shared with the specified group."
          });
        }

        const sharedWordBank = await ctx.prisma.sharedWordBank.create({
          data: {
            wordBankId,
            sharedById: userId,
            sharedWithGroupId
          }
        });

        return { success: true, sharedWordBank };
      } else if (generateShareLink) {
        console.log(`Attempting to create shared word bank with share link for bankId: ${wordBankId}`);
        const sharedWordBank = await ctx.prisma.sharedWordBank.create({
          data: {
            wordBankId,
            sharedById: userId,
            shareLink: crypto.randomUUID(),
            // Store group invite info if sharing with a group
            ...(sharedWithGroupId ? { sharedWithGroupId } : {})
          }
        });

        return {
          success: true,
          shareLink: sharedWordBank.shareLink,
          isGroupInvite: !!sharedWithGroupId
        };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must specify either sharedWithUserId, sharedWithGroupId, or generateShareLink"
        });
      }
    }),

  getSharedWordBank: protectedProcedure
    .input(z.object({ 
      sharedWordBankId: z.string().optional(),
      shareLink: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { sharedWordBankId, shareLink } = input;
      const userId = ctx.session.user.id;

      if (!sharedWordBankId && !shareLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide either sharedWordBankId or shareLink"
        });
      }

      const sharedWordBank = await ctx.prisma.sharedWordBank.findUnique({
        where: sharedWordBankId ? { id: sharedWordBankId } : { shareLink },
        include: {
          wordBank: {
            include: {
              words: {
                include: {
                  wordMaster: true,
                  _count: {
                    select: {
                      practiceLogs: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!sharedWordBank) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared word bank not found." });
      }

      // Check access permissions
      // Allow access if shareLink is used, regardless of authentication
      // If sharedWithUserId or sharedWithGroupId is set, require authentication and membership/ownership
      if (sharedWordBank.shareLink) {
        // Access is allowed via share link for anyone
      } else if (sharedWordBank.sharedWithUserId) {
        // If shared with a specific user, require authentication and matching user ID
        if (!userId || sharedWordBank.sharedWithUserId !== userId) {
           throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this shared word bank." });
        }
      } else if (sharedWordBank.sharedWithGroupId) {
        // If shared with a group, require authentication and group membership
        if (!userId) {
           throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in to access this shared word bank." });
        }
        const groupMember = await ctx.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: sharedWordBank.sharedWithGroupId,
              userId: userId
            }
          }
        });

        if (!groupMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this shared word bank." });
        }
      } else {
         // Should not happen if sharedWordBank is found, but as a fallback
         throw new TRPCError({ code: "FORBIDDEN", message: "Access to this shared word bank is restricted." });
      }

      return sharedWordBank;
    }),

  copySharedWordBank: protectedProcedure
    .input(z.object({ 
      sharedWordBankId: z.string().optional(),
      shareLink: z.string().optional(),
      newBankName: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const { sharedWordBankId, shareLink, newBankName } = input;
      const userId = ctx.session.user.id;

      if (!sharedWordBankId && !shareLink) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide either sharedWordBankId or shareLink"
        });
      }

      // First verify access to the shared word bank
      const sharedWordBank = await ctx.prisma.sharedWordBank.findUnique({
        where: sharedWordBankId ? { id: sharedWordBankId } : { shareLink },
        include: {
          wordBank: {
            include: {
              words: {
                include: {
                  wordMaster: true
                }
              }
            }
          }
        }
      });

      if (!sharedWordBank) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared word bank not found." });
      }

      // Check access permissions
      if (sharedWordBank.sharedWithUserId && sharedWordBank.sharedWithUserId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this shared word bank." });
      }

      if (sharedWordBank.sharedWithGroupId) {
        const groupMember = await ctx.prisma.groupMember.findUnique({
          where: {
            groupId_userId: {
              groupId: sharedWordBank.sharedWithGroupId,
              userId: userId
            }
          }
        });

        if (!groupMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this shared word bank." });
        }
      }

      // Create new word bank
      const newWordBank = await ctx.prisma.wordBank.create({
        data: {
          name: newBankName,
          userId: userId,
          description: `Copied from ${sharedWordBank.wordBank.name}`
        }
      });

      // Copy all words
      const wordCreationPromises = sharedWordBank.wordBank.words.map((word: {
        wordMasterId: string;
        interval: number;
        easeFactor: number;
        repetitions: number;
        nextReviewDate: Date;
        isStarred: boolean;
        notes: string | null; // Corrected type to allow null
        text: string;
        mastery: number;
        nextDueAtReviewCount: number;
        timesSeen: number;
        successRate: number;
      }) => {
        return ctx.prisma.word.create({
          data: {
            wordBankId: newWordBank.id,
            wordMasterId: word.wordMasterId,
            interval: word.interval,
            easeFactor: word.easeFactor,
            repetitions: word.repetitions,
            nextReviewDate: word.nextReviewDate,
            isStarred: word.isStarred,
            notes: word.notes,
            text: word.text,
            mastery: word.mastery,
            nextDueAtReviewCount: word.nextDueAtReviewCount,
            timesSeen: word.timesSeen,
            successRate: word.successRate
          }
        });
      });

      await Promise.all(wordCreationPromises);

      return { success: true, newWordBank };
    }),

  getWordBanksSharedWithUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const sharedWordBanks = await ctx.prisma.sharedWordBank.findMany({
        where: {
          sharedWithUserId: userId
        },
        include: {
          wordBank: true,
          sharedBy: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      return sharedWordBanks;
    }),

  getWordBanksSharedWithGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { groupId } = input;
      const userId = ctx.session.user.id;

      // Verify user is a member of the group
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });

      if (!groupMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this group."
        });
      }

      const sharedWordBanks = await ctx.prisma.sharedWordBank.findMany({
        where: {
          sharedWithGroupId: groupId
        },
        include: {
          wordBank: true,
          sharedBy: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      });

      return sharedWordBanks;
    }),
  addWordsToGroupWordBank: protectedProcedure
    .input(z.object({
      wordBankId: z.string(),
      groupId: z.string(),
      words: z.array(z.object({
        wordMasterId: z.string(),
        text: z.string(),
        isStarred: z.boolean().optional(),
        notes: z.string().optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const { wordBankId, groupId, words } = input;
      const userId = ctx.session.user.id;

      // Verify user is a member of the group
      const groupMember = await ctx.prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });

      if (!groupMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this group."
        });
      }

      // Verify the word bank is shared with this group
      const sharedWordBank = await ctx.prisma.sharedWordBank.findFirst({
        where: {
          wordBankId,
          sharedWithGroupId: groupId
        }
      });

      if (!sharedWordBank) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This word bank is not shared with the specified group."
        });
      }

      // Verify the word bank exists
      const wordBank = await ctx.prisma.wordBank.findUnique({
        where: { id: wordBankId }
      });

      if (!wordBank) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Word bank not found."
        });
      }

      // Create all words in a transaction
      const createdWords = await ctx.prisma.$transaction(
        words.map(word =>
          ctx.prisma.word.create({
            data: {
              wordBankId,
              wordMasterId: word.wordMasterId,
              text: word.text,
              isStarred: word.isStarred || false,
              notes: word.notes || null,
              // Default SRS values
              interval: 1,
              easeFactor: 2.5,
              repetitions: 0,
              nextReviewDate: new Date(),
              mastery: 0,
              nextDueAtReviewCount: 0,
              timesSeen: 0,
              successRate: 0
            }
          })
        )
      );

      return { success: true, count: createdWords.length };
    })
});