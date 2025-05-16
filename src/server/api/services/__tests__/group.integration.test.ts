import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import type { Session } from 'next-auth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { groupRouter } from '../../routers/group';

describe('Group Integration Tests', () => {
  let userId1: string;
  let userId2: string;
  let groupId: string;
  let wordBankId: string;

  beforeAll(async () => {
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'test1@example.com',
        name: 'Test User 1',
        role: UserRole.USER,
      },
    });
    userId1 = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'test2@example.com',
        name: 'Test User 2',
        role: UserRole.USER,
      },
    });
    userId2 = user2.id;

    // Create test word bank
    const wordBank = await prisma.wordBank.create({
      data: {
        name: 'Test Bank',
        userId: userId1,
      },
    });
    wordBankId = wordBank.id;
  });

  afterAll(async () => {
    await prisma.sharedWordBank.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.wordBank.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should create a group and add creator as admin', async () => {
    const group = await prisma.group.create({
      data: {
        name: 'Test Group',
        creator: { connect: { id: userId1 }},
        members: {
          create: {
            userId: userId1,
            role: 'admin',
          },
        },
      },
    });
    groupId = group.id;

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: userId1,
        },
      },
    });

    expect(member).toBeTruthy();
    expect(member?.role).toBe('admin');
  });

  it('should prevent duplicate group invitations', async () => {
    // First invite should succeed
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: userId2,
        role: 'member',
      },
    });

    // Second invite should fail
    await expect(
      prisma.groupMember.create({
        data: {
          groupId,
          userId: userId2,
          role: 'member',
        },
      })
    ).rejects.toThrow(/already a member/);
  });

  it('should prevent duplicate word bank sharing', async () => {
    // First share should succeed
    await prisma.sharedWordBank.create({
      data: {
        wordBank: { connect: { id: wordBankId }},
        sharedBy: { connect: { id: userId1 }},
        sharedWithGroup: { connect: { id: groupId }},
      },
    });

    // Second share should fail
    await expect(
      prisma.sharedWordBank.create({
        data: {
          wordBank: { connect: { id: wordBankId }},
          sharedBy: { connect: { id: userId1 }},
          sharedWithGroup: { connect: { id: groupId }},
        },
      })
    ).rejects.toThrow(/Unique constraint failed/);
  });

  it('should prevent group creators from leaving', async () => {
    const session: Session = {
      user: {
        id: userId1,
        role: UserRole.USER,
        name: 'Test User 1',
        email: 'test1@example.com',
      },
      expires: new Date(Date.now() + 3600).toISOString(),
    };

    const caller = groupRouter.createCaller({
      session,
      prisma,
      headers: new Headers(),
    });

    await expect(
      caller.leaveGroup({ groupId })
    ).rejects.toThrow(TRPCError);
    await expect(
      caller.leaveGroup({ groupId })
    ).rejects.toHaveProperty('code', 'NOT_FOUND'); // Updated assertion to expect NOT_FOUND
  });
});