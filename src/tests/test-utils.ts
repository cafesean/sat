import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

export async function createTestUser(email: string) {
  return await prisma.user.create({
    data: {
      email,
      name: "Test User",
      hashedPassword: await hash("password", 10),
      role: UserRole.USER,
    },
  });
}

export async function cleanupTestUsers(userIds: string[]) {
  await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
}