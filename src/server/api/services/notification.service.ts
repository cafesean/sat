import { prisma } from '@/lib/db/prisma';
import type { Notification, NotificationType } from '@prisma/client';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<Notification> => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
    },
  });
};

export const getUserNotifications = async (
  userId: string,
  limit?: number,
  unreadOnly = false
): Promise<Notification[]> => {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
};

export const markNotificationAsRead = async (
  notificationId: string
): Promise<Notification> => {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ count: number }> => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

// Notification triggers for group activities
export const notifyNewGroupMember = async (
  groupId: string,
  newMemberId: string
) => {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) return;

  const newMember = await prisma.user.findUnique({
    where: { id: newMemberId },
  });

  if (!newMember) return;

  // Notify all group members except the new member
  const recipients = group.members
    .filter((member: { userId: string }) => member.userId !== newMemberId)
    .map((member: { userId: string }) => member.userId);

  await Promise.all(
    recipients.map((userId: string) =>
      createNotification(
        userId,
        'MEMBER_JOINED',
        `${newMember.name || 'A new member'} joined ${group.name}`,
        { groupId, newMemberId }
      )
    )
  );
};

export const notifyWordBankShared = async (
  wordBankId: string,
  sharedById: string,
  sharedWith: { groupId?: string; userId?: string }
) => {
  const wordBank = await prisma.wordBank.findUnique({
    where: { id: wordBankId },
  });

  const sharedBy = await prisma.user.findUnique({
    where: { id: sharedById },
  });

  if (!wordBank || !sharedBy) return;

  let recipientId: string | undefined;
  let message = '';

  if (sharedWith.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: sharedWith.groupId },
    });
    message = `${sharedBy.name || 'A user'} shared the word bank "${
      wordBank.name
    }" with your group ${group?.name || ''}`;
    recipientId = sharedWith.groupId;
  } else if (sharedWith.userId) {
    message = `${sharedBy.name || 'A user'} shared the word bank "${
      wordBank.name
    }" with you`;
    recipientId = sharedWith.userId;
  }

  if (recipientId) {
    await createNotification(
      recipientId,
      'WORD_BANK_SHARED',
      message,
      { wordBankId, sharedById }
    );
  }
};