import { prisma } from '@/lib/db/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as notificationService from '../notification.service';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with given data', async () => {
      const mockNotification = { id: '1', userId: 'user1', type: 'MEMBER_JOINED', message: 'msg', metadata: null };
      (prisma.notification as any).create.mockResolvedValue(mockNotification);

      const result = await notificationService.createNotification('user1', 'MEMBER_JOINED', 'msg');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'MEMBER_JOINED',
          message: 'msg',
          metadata: null,
        },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for user with limit and unreadOnly filter', async () => {
      const mockNotifications = [{ id: '1' }, { id: '2' }];
      (prisma.notification as any).findMany.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications('user1', 2, true);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 2,
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockNotification = { id: '1', isRead: true };
      (prisma.notification as any).update.mockResolvedValue(mockNotification);

      const result = await notificationService.markNotificationAsRead('1');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const mockCount = { count: 5 };
      (prisma.notification as any).updateMany.mockResolvedValue(mockCount);

      const result = await notificationService.markAllNotificationsAsRead('user1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(result).toEqual(mockCount);
    });
  });

  describe('notifyNewGroupMember', () => {
    it('should notify all group members except the new member', async () => {
      const group = { id: 'g1', name: 'Group1', members: [{ userId: 'u1' }, { userId: 'u2' }] };
      const newMember = { id: 'u2', name: 'New Member' };
      (prisma.group.findUnique as any).mockResolvedValue(group);
      (prisma.user.findUnique as any).mockResolvedValue(newMember);
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification').mockResolvedValue({} as any);

      await notificationService.notifyNewGroupMember('g1', 'u2');

      expect(createNotificationSpy).toHaveBeenCalledTimes(1);
      expect(createNotificationSpy).toHaveBeenCalledWith(
        'u1',
        'MEMBER_JOINED',
        'New Member joined Group1',
        { groupId: 'g1', newMemberId: 'u2' }
      );
    });

    it('should return early if group or new member not found', async () => {
      (prisma.group.findUnique as any).mockResolvedValue(null);
      await expect(notificationService.notifyNewGroupMember('g1', 'u2')).resolves.toBeUndefined();

      (prisma.group.findUnique as any).mockResolvedValue({ id: 'g1', members: [] });
      (prisma.user.findUnique as any).mockResolvedValue(null);
      await expect(notificationService.notifyNewGroupMember('g1', 'u2')).resolves.toBeUndefined();
    });
  });

  describe('notifyWordBankShared', () => {
    it('should notify recipient when word bank is shared with group', async () => {
      const wordBank = { id: 'wb1', name: 'WordBank1' };
      const sharedBy = { id: 'u1', name: 'Sharer' };
      const group = { id: 'g1', name: 'Group1' };
      (prisma.wordBank.findUnique as any).mockResolvedValue(wordBank);
      (prisma.user.findUnique as any).mockResolvedValue(sharedBy);
      (prisma.group.findUnique as any).mockResolvedValue(group);
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification').mockResolvedValue({} as any);

      await notificationService.notifyWordBankShared('wb1', 'u1', { groupId: 'g1' });

      expect(createNotificationSpy).toHaveBeenCalledWith(
        'g1',
        'WORD_BANK_SHARED',
        'Sharer shared the word bank "WordBank1" with your group Group1',
        { wordBankId: 'wb1', sharedById: 'u1' }
      );
    });

    it('should notify recipient when word bank is shared with user', async () => {
      const wordBank = { id: 'wb1', name: 'WordBank1' };
      const sharedBy = { id: 'u1', name: 'Sharer' };
      (prisma.wordBank.findUnique as any).mockResolvedValue(wordBank);
      (prisma.user.findUnique as any).mockResolvedValue(sharedBy);
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification').mockResolvedValue({} as any);

      await notificationService.notifyWordBankShared('wb1', 'u1', { userId: 'u2' });

      expect(createNotificationSpy).toHaveBeenCalledWith(
        'u2',
        'WORD_BANK_SHARED',
        'Sharer shared the word bank "WordBank1" with you',
        { wordBankId: 'wb1', sharedById: 'u1' }
      );
    });

    it('should return early if word bank or sharedBy user not found', async () => {
      (prisma.wordBank.findUnique as any).mockResolvedValue(null);
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(notificationService.notifyWordBankShared('wb1', 'u1', { userId: 'u2' })).resolves.toBeUndefined();
    });
  });
});