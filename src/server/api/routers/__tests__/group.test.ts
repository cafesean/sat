import { prisma } from "@/lib/db/prisma";
import { cleanupTestUsers, createTestUser } from "@/tests/test-utils";
import { createTestCaller } from "@/tests/trpc-test-utils";
import { UserRole } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

describe("Group Router", () => {
  let testUser1: { id: string; email: string; role: UserRole };
  let testUser2: { id: string; email: string; role: UserRole };
  let testGroup: { id: string };

  beforeEach(async () => {
    testUser1 = await createTestUser("test1@example.com");
    testUser2 = await createTestUser("test2@example.com");
    testGroup = await prisma.group.create({
      data: {
        name: "Test Group",
        creatorId: testUser1.id,
        members: {
          create: {
            userId: testUser1.id,
            role: "admin",
          },
        },
      },
    });
  });

  afterEach(async () => {
    await cleanupTestUsers([testUser1.id, testUser2.id]);
    await prisma.group.deleteMany();
    await prisma.groupInvite.deleteMany();
  });

  describe("inviteUserToGroup", () => {
    test("should prevent duplicate pending invitations", async () => {
      const caller = createTestCaller(testUser1);

      // First invite should succeed
      await caller.group.inviteUserToGroup({
        groupId: testGroup.id,
        email: testUser2.email,
      });

      // Second invite should fail
      await expect(
        caller.group.inviteUserToGroup({
          groupId: testGroup.id,
          email: testUser2.email,
        })
      ).rejects.toThrowError("This user already has a pending invitation");
    });

    test("should allow new invite after previous one is accepted", async () => {
      const caller = createTestCaller(testUser1);

      // Create and accept first invite
      const { inviteToken } = await caller.group.inviteUserToGroup({
        groupId: testGroup.id,
        email: testUser2.email,
      });
      await prisma.groupInvite.update({
        where: { inviteToken },
        data: { status: "accepted" },
      });

      // Second invite should succeed since first was accepted
      await expect(
        caller.group.inviteUserToGroup({
          groupId: testGroup.id,
          email: testUser2.email,
        })
      ).resolves.toBeDefined();
    });
  });

  describe("leaveGroup", () => {
    test("should prevent group creator from leaving", async () => {
      const caller = createTestCaller(testUser1);

      await expect(
        caller.group.leaveGroup({ groupId: testGroup.id })
      ).rejects.toThrowError(
        "As the group creator, you cannot leave this group. You can either transfer ownership to another member or delete the group entirely if you no longer need it."
      );
    });

    test("should allow regular member to leave", async () => {
      // Add testUser2 as member
      await prisma.groupMember.create({
        data: {
          groupId: testGroup.id,
          userId: testUser2.id,
        },
      });

      const caller = createTestCaller(testUser2);

      await expect(
        caller.group.leaveGroup({ groupId: testGroup.id })
      ).resolves.toEqual({ success: true });
    });
  });
});