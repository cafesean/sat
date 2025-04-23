import { type inferProcedureInput } from "@trpc/server";
import { type AppRouter } from "@/server/api/root";
import { prisma } from "@/lib/db/prisma";
import { mockDeep } from "vitest-mock-extended";

export function createTestContext() {
  return {
    session: {
      user: {
        id: "test-user",
        email: "test@example.com",
        name: "Test User"
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString()
    },
    prisma: mockDeep<typeof prisma>()
  };
}

export type TestContext = ReturnType<typeof createTestContext>;