import { prisma } from "@/lib/db/prisma";
import type { AppRouter } from "@/server/api/root";
import { appRouter } from "@/server/api/root";
import { UserRole } from "@prisma/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

type TestUser = {
  id: string;
  email: string;
  role: UserRole;
};

// Simple headers mock if native Headers isn't available
const createHeaders = () => {
  if (typeof Headers !== 'undefined') {
    return new Headers();
  }
  return {
    get: () => null,
    has: () => false,
    set: () => {},
  } as unknown as Headers;
};

export const createTestCaller = (user: TestUser) => {
  return appRouter.createCaller({
    session: { 
      user: {
        ...user,
        name: "Test User",
        image: null,
        gradeLevel: null,
        languagePreference: "en"
      }, 
      expires: "1" 
    },
    prisma,
    headers: createHeaders(),
  });
};

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;