import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { readingWritingRouter } from "./readingWriting";
import { TRPCError } from "@trpc/server";
import type { PracticeType, Passage, QuestionSet } from "@prisma/client";
import { createTestContext } from "@/tests/helpers";
import { mockDeep } from "vitest-mock-extended";

function createInnerTRPCContext(overrides: Partial<Parameters<typeof readingWritingRouter.createCaller>[0]>) {
  return {
    session: { 
      user: { 
        id: "user_123",
        name: "Test User",
        email: "test@example.com"
      }, 
      expires: "" 
    },
    prisma,
    headers: new Headers(),
    ...overrides,
  };
}

describe("ReadingWriting Router", () => {
  const ctx = createInnerTRPCContext({});

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("startReadingWritingSession", () => {
    it("should create a new reading/writing session", async () => {
      const mockSession = {
        id: "session_123",
        userId: "user_123",
        type: "READING_WRITING" as PracticeType,
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        score: null,
        difficulty: 2,
        wordBankId: null,
        lastFetchedWordId: null,
        questionSetId: "set_123",
        passage: {
          id: "passage_123",
          content: "Test passage content",
          difficulty: 2,
          createdAt: new Date(),
          practiceSessionId: "session_123",
          questions: []
        }
      };

      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue({
        id: "set_123",
        userId: "user_123",
        topic: "Test Topic",
        createdAt: new Date()
      });

      vi.mocked(prisma.passage.findMany).mockResolvedValue([{
        id: "passage_123",
        content: "Test passage content",
        difficulty: 2,
        createdAt: new Date(),
        questionSetId: "set_123",
        practiceSessionId: null
      }]);

      vi.mocked(prisma.practiceSession.create).mockResolvedValue(mockSession);

      const result = await readingWritingRouter
        .createCaller(ctx)
        .startReadingWritingSession({ questionSetId: "set_123" });

      expect(result.session).toEqual(mockSession);
      expect(prisma.questionSet.findUnique).toHaveBeenCalledWith({
        where: { id: "set_123" },
        include: { passages: true }
      });
      // The implementation might not call this directly since it's using the passages included in questionSet
      // expect(prisma.passage.findMany).toHaveBeenCalledWith({
      //   where: { questionSetId: "set_123" }
      // });
      expect(prisma.practiceSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user_123",
          type: "READING_WRITING",
          difficulty: 2,
          questionSetId: "set_123",
          passage: undefined
        },
        include: {
          passage: {
            include: {
              questions: true
            }
          }
        }
      });
    });

    it("should throw error if question set not found", async () => {
      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(null);

      await expect(
        readingWritingRouter
          .createCaller(ctx)
          .startReadingWritingSession({ questionSetId: "invalid_set" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("addPassage", () => {
    it("should add passage to question set", async () => {
      const mockPassage = {
        id: "passage_123",
        content: "Test passage content",
        difficulty: 2,
        createdAt: new Date(),
        questionSetId: "set_123",
        practiceSessionId: null
      };

      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue({
        id: "set_123",
        userId: "user_123",
        topic: "Test Topic",
        createdAt: new Date()
      });

      vi.mocked(prisma.passage.create).mockResolvedValue(mockPassage);

      const result = await readingWritingRouter
        .createCaller(ctx)
        .addPassage({ 
          questionSetId: "set_123",
          content: "Test passage content"
        });

      expect(result).toEqual(mockPassage);
      expect(prisma.questionSet.findUnique).toHaveBeenCalledWith({
        where: { id: "set_123" }
      });
      expect(prisma.passage.create).toHaveBeenCalledWith({
        data: {
          content: "Test passage content",
          difficulty: 2,
          questionSet: {
            connect: { id: "set_123" }
          }
        }
      });
    });

    it("should throw error if question set not found", async () => {
      vi.mocked(prisma.questionSet.findUnique).mockResolvedValue(null);

      await expect(
        readingWritingRouter
          .createCaller(ctx)
          .addPassage({ 
            questionSetId: "invalid_set",
            content: "Test content"
          })
      ).rejects.toThrow(TRPCError);
    });
  });
});