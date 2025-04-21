import { prisma } from "@/lib/db/prisma";
import { PracticeType, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { practiceRouter } from "./practice";

function createInnerTRPCContext(overrides: Partial<Parameters<typeof practiceRouter.createCaller>[0]>) {
  return {
    session: { 
      user: { 
        id: "user_123",
        role: UserRole.USER,
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

describe("Practice Router", () => {
  const ctx = createInnerTRPCContext({});

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("startPracticeSession", () => {
    it("should create a new practice session", async () => {
      const mockSession = {
        id: "session_123",
        userId: "user_123",
        type: PracticeType.VOCABULARY,
        wordBankId: "bank_123",
        startTime: new Date(),
        endTime: null,
        createdAt: new Date(),
        score: null,
        difficulty: null
      };

      vi.mocked(prisma.practiceSession.create).mockResolvedValue(mockSession);

      const result = await practiceRouter
        .createCaller(ctx)
        .startPracticeSession({ userId: "user_123", wordBankId: "bank_123" });

      expect(result).toEqual(mockSession);
      expect(prisma.practiceSession.create).toHaveBeenCalledWith({
        data: {
          userId: "user_123",
          type: PracticeType.VOCABULARY,
          wordBankId: "bank_123",
        },
      });
    });
  });

  describe("endPracticeSession", () => {
    it("should mark a session as ended", async () => {
      const mockSession = {
        id: "session_123",
        userId: "user_123",
        endTime: new Date(),
        createdAt: new Date(),
        type: PracticeType.VOCABULARY,
        startTime: new Date(),
        score: null,
        difficulty: null,
        wordBankId: "bank_123"
      };

      vi.mocked(prisma.practiceSession.update).mockResolvedValue(mockSession);

      const result = await practiceRouter
        .createCaller(ctx)
        .endPracticeSession({ sessionId: "session_123" });

      expect(result).toEqual(mockSession);
      expect(prisma.practiceSession.update).toHaveBeenCalledWith({
        where: { id: "session_123" },
        data: { endTime: expect.any(Date) },
      });
    });
  });

  describe("getPrioritizedWords", () => {
    it("should return words due for review", async () => {
      const mockWords = [
        {
          id: "word_1",
          text: "test",
          interval: 1,
          nextReviewDate: new Date(Date.now() - 1000),
          wordMaster: { id: "master_1", baseWord: "test" },
          wordBankId: "bank_123",
          easeFactor: 2.5,
          repetitions: 1,
          isStarred: false,
          notes: null,
          wordMasterId: "master_1",
          createdAt: new Date(),
          updatedAt: new Date(),
          sampleSentences: [],
          mastery: 0,
          nextDueAtReviewCount: 0,
          timesSeen: 0,
          successRate: 0
        },
      ];

      vi.mocked(prisma.word.findMany).mockResolvedValue(mockWords);

      const result = await practiceRouter
        .createCaller(ctx)
        .getPrioritizedWords({ wordBankId: "bank_123", limit: 10 });

      expect(result).toEqual(mockWords);
      expect(prisma.word.findMany).toHaveBeenCalledWith({
        where: {
          wordBankId: "bank_123",
          nextReviewDate: { lte: expect.any(Date) },
        },
        orderBy: [
          { interval: "asc" },
          { nextReviewDate: "asc" },
        ],
        take: 10,
        include: {
          wordMaster: true,
        },
      });
    });
  });
});