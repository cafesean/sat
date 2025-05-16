// Mock environment variables by mocking the env module
vi.mock('@/env.mjs', () => ({
  env: {
    DATABASE_URL: 'postgresql://testuser:testpassword@localhost:5432/testdb',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    NEXTAUTH_SECRET: 'test-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GEMINI_API_KEY: 'test-gemini-api-key',
    EMAIL_SERVER_HOST: 'test-smtp-host',
    EMAIL_SERVER_PORT: 587,
    EMAIL_SERVER_USER: 'test-smtp-user',
    EMAIL_SERVER_PASSWORD: 'test-smtp-password',
    EMAIL_FROM: 'test@example.com',
    JIRA_PROJECT_KEY: 'TEST',
  },
}));

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv'; // Import dotenv
import { beforeEach, vi } from 'vitest'; // Added beforeEach import

dotenv.config({ path: '.env' }); // Load environment variables from .env

let userIdCounter = 0; // Counter for generating unique user IDs
let groupIdCounter = 0; // Counter for generating unique group IDs
let groupMemberIdCounter = 0; // Counter for generating unique group member IDs
let groupInviteIdCounter = 0; // Counter for generating unique group invite IDs


// Mock data stores (in-memory)
const mockUsers: any[] = [];
const mockGroups: any[] = [];
const mockGroupMembers: any[] = [];
const mockGroupInvites: any[] = [];
const mockQuestionSets: any[] = [];
const mockPracticeSessions: any[] = [];
const mockWords: any[] = [];
const mockNotifications: any[] = [];
const mockSharedWordBanks: any[] = [];
const mockPassages: any[] = [];


// Mock the entire @prisma/client module
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    questionSet: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockQuestionSets.find(qs => qs.id === where.id) || null;
      }),
      findMany: vi.fn().mockImplementation(() => mockQuestionSets),
      create: vi.fn().mockImplementation(({ data }) => {
        const newQuestionSet = { id: `mock-qs-${mockQuestionSets.length + 1}`, ...data };
        mockQuestionSets.push(newQuestionSet);
        return newQuestionSet;
      }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    practiceSession: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockPracticeSessions.find(session => session.id === where.id) || null;
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const newSession = { id: `mock-session-${mockPracticeSessions.length + 1}`, ...data };
        mockPracticeSessions.push(newSession);
        return newSession;
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const sessionIndex = mockPracticeSessions.findIndex(session => session.id === where.id);
        if (sessionIndex === -1) return null;
        mockPracticeSessions[sessionIndex] = { ...mockPracticeSessions[sessionIndex], ...data };
        return mockPracticeSessions[sessionIndex];
      }),
    },
    word: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockWords.find(word => word.id === where.id) || null;
      }),
      findMany: vi.fn().mockImplementation(() => mockWords),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const wordIndex = mockWords.findIndex(word => word.id === where.id);
        if (wordIndex === -1) return null;
        mockWords[wordIndex] = { ...mockWords[wordIndex], ...data };
        return mockWords[wordIndex];
      }),
      createMany: vi.fn().mockImplementation(({ data }) => {
        const createdWords = data.map((wordData: any) => {
          const newWord = { id: `mock-word-${mockWords.length + 1}`, ...wordData };
          mockWords.push(newWord);
          return newWord;
        });
        return { count: createdWords.length };
      }),
    },
    group: {
      create: vi.fn().mockImplementation(({ data }) => {
        groupIdCounter++;
        const newGroup = { id: `mock-group-${groupIdCounter}`, ...data };
        mockGroups.push(newGroup);
        // Automatically add creator as admin member
        if (data.creator && data.creator.connect && data.creator.connect.id) {
           groupMemberIdCounter++;
           const newGroupMember = {
             id: `mock-group-member-${groupMemberIdCounter}`,
             groupId: newGroup.id,
             userId: data.creator.connect.id,
             role: 'admin',
           };
           mockGroupMembers.push(newGroupMember);
        } else if (data.members && data.members.create) {
           // Handle both single object and array for data.members.create
           const membersToCreate = Array.isArray(data.members.create) ? data.members.create : [data.members.create];
           membersToCreate.forEach((memberData: any) => {
             groupMemberIdCounter++;
             const newGroupMember = {
               id: `mock-group-member-${groupMemberIdCounter}`,
               groupId: newGroup.id,
               userId: memberData.userId,
               role: memberData.role || 'member',
             };
             mockGroupMembers.push(newGroupMember);
           });
         }
        return newGroup;
      }),
      findUnique: vi.fn().mockImplementation(({ where, include }) => {
        const group = mockGroups.find(group => group.id === where.id) || null;
        if (group && include && include.members) {
          group.members = mockGroupMembers.filter(member => member.groupId === group.id);
        }
        return group;
      }),
      findMany: vi.fn().mockImplementation(() => mockGroups),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const groupIndex = mockGroups.findIndex(group => group.id === where.id);
        if (groupIndex === -1) return null;
        mockGroups[groupIndex] = { ...mockGroups[groupIndex], ...data };
        return mockGroups[groupIndex];
      }),
      delete: vi.fn(),
      deleteMany: vi.fn().mockImplementation(() => { // Mock implementation for deleteMany
        mockGroups.length = 0; // Clear the mock groups array
        return { count: 0 }; // Return a count of deleted records
      }),
    },
    groupInvite: {
      create: vi.fn().mockImplementation(({ data }) => {
        groupInviteIdCounter++;
        const newInvite = { id: `mock-invite-${groupInviteIdCounter}`, status: 'pending', ...data }; // Explicitly set status
        mockGroupInvites.push(newInvite);
        return newInvite;
      }),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockGroupInvites.find(invite => invite.inviteToken === where.inviteToken || invite.id === where.id) || null;
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => { // Added findFirst mock
        return mockGroupInvites.find(invite => invite.groupId === where.groupId && invite.invitedUserId === where.invitedUserId && invite.status === where.status) || null;
      }),
      findMany: vi.fn().mockImplementation(() => mockGroupInvites),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const inviteIndex = mockGroupInvites.findIndex(invite => invite.inviteToken === where.inviteToken || invite.id === where.id);
        if (inviteIndex === -1) return null;
        mockGroupInvites[inviteIndex] = { ...mockGroupInvites[inviteIndex], ...data };
        return mockGroupInvites[inviteIndex];
      }),
      delete: vi.fn(),
      deleteMany: vi.fn().mockImplementation(() => { // Mock implementation for deleteMany
        mockGroupInvites.length = 0; // Clear the mock invites array
        return { count: 0 }; // Return a count of deleted records
      }),
    },
    user: {
      create: vi.fn().mockImplementation(({ data }) => { // Mock implementation for create
        userIdCounter++;
        const newUser = {
          id: `mock-user-${userIdCounter}`,
          email: data.email,
          name: data.name || null,
          hashedPassword: data.hashedPassword || null,
          role: data.role || 'USER',
          emailVerified: data.emailVerified || null,
          image: data.image || null,
          // Include relationships as empty arrays or null as needed by tests
          accounts: [],
          sessions: [],
          createdGroups: [],
          groupMemberships: [],
          createdWordBanks: [],
          sharedWordBanks: [],
          practiceSessions: [],
          wordMasters: [],
          notifications: [],
          groupInvites: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockUsers.push(newUser);
        return newUser;
      }),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockUsers.find(user => user.id === where.id || user.email === where.email) || null;
      }),
      findMany: vi.fn().mockImplementation(() => mockUsers),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const userIndex = mockUsers.findIndex(user => user.id === where.id);
        if (userIndex === -1) return null;
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
        return mockUsers[userIndex];
      }),
      delete: vi.fn(),
      deleteMany: vi.fn().mockImplementation((args = {}) => { // Mock implementation for deleteMany
        const initialCount = mockUsers.length;
        if (args.where?.id?.in) {
          const deletedUsers = mockUsers.filter(user => args.where.id.in.includes(user.id));
          mockUsers.length = 0; // Clear the array
          mockUsers.push(...mockUsers.filter(user => !args.where.id.in.includes(user.id))); // Add back users not in the delete list
          return { count: initialCount - mockUsers.length }; // Return a count of deleted records
        }
        mockUsers.length = 0; // If no where clause, clear all users
        return { count: initialCount };
      }),
    },
    notification: {
      create: vi.fn().mockImplementation(({ data }) => {
        const newNotification = { id: `mock-notification-${mockNotifications.length + 1}`, ...data };
        mockNotifications.push(newNotification);
        return newNotification;
      }),
      findMany: vi.fn().mockImplementation(() => mockNotifications),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    sharedWordBank: {
      create: vi.fn().mockImplementation(({ data }) => {
        // Check for unique constraint violation
        const existingSharedWordBank = mockSharedWordBanks.find(swb => 
          swb.wordBankId === data.wordBankId && 
          ((data.sharedWithGroupId && swb.sharedWithGroupId === data.sharedWithGroupId) ||
           (data.sharedWithUserId && swb.sharedWithUserId === data.sharedWithUserId))
        );
        if (existingSharedWordBank) {
          throw new Error('Unique constraint failed on the fields: (`wordBankId`,`sharedWithGroupId`)');
        }
        
        const newSharedWordBank = { id: `mock-shared-wb-${mockSharedWordBanks.length + 1}`, ...data };
        mockSharedWordBanks.push(newSharedWordBank);
        return newSharedWordBank;
      }),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        return mockSharedWordBanks.find(swb => swb.id === where.id) || null;
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => {
        return mockSharedWordBanks.find(swb => 
          swb.wordBankId === where.wordBankId && 
          ((where.sharedWithGroupId && swb.sharedWithGroupId === where.sharedWithGroupId) ||
           (where.sharedWithUserId && swb.sharedWithUserId === where.sharedWithUserId))
        ) || null;
      }),
      deleteMany: vi.fn().mockImplementation((args = {}) => {
        const initialCount = mockSharedWordBanks.length;
        mockSharedWordBanks.length = 0;
        return { count: initialCount };
      }),
    },
    groupMember: {
      create: vi.fn().mockImplementation(({ data }) => {
        // Check for unique constraint violation
        const existingMember = mockGroupMembers.find(gm => 
          gm.groupId === data.groupId && gm.userId === data.userId
        );
        if (existingMember) {
          throw new Error('Unique constraint failed on the fields: (`groupId`,`userId`)');
        }
        
        groupMemberIdCounter++;
        const newGroupMember = { id: `mock-group-member-${groupMemberIdCounter}`, ...data };
        mockGroupMembers.push(newGroupMember);
        return newGroupMember;
      }),
      findUnique: vi.fn().mockImplementation(({ where }) => {
        // Refined mock to filter by role if provided
        return mockGroupMembers.find(gm =>
          gm.groupId === where.groupId_userId.groupId &&
          gm.userId === where.groupId_userId.userId &&
          (where.role === undefined || gm.role === where.role) // Check role if provided
        ) || null;
      }),
      update: vi.fn().mockImplementation(({ where, data }) => { // Added update mock
        const memberIndex = mockGroupMembers.findIndex(gm => gm.groupId === where.groupId_userId.groupId && gm.userId === where.groupId_userId.userId);
        if (memberIndex === -1) return null;
        mockGroupMembers[memberIndex] = { ...mockGroupMembers[memberIndex], ...data };
        return mockGroupMembers[memberIndex];
      }),
      delete: vi.fn().mockImplementation(({ where }) => { // Added delete mock
        const memberIndex = mockGroupMembers.findIndex(gm => gm.groupId === where.groupId_userId.groupId && gm.userId === where.groupId_userId.userId);
        if (memberIndex === -1) return null;
        const deletedMember = mockGroupMembers.splice(memberIndex, 1)[0];
        return deletedMember;
      }),
      deleteMany: vi.fn().mockImplementation(() => { // Mock implementation for deleteMany
        mockGroupMembers.length = 0; // Clear the mock group members array
        return { count: 0 }; // Return a count of deleted records
      }),
    },
    passage: {
      findMany: vi.fn().mockImplementation(() => mockPassages),
      create: vi.fn().mockImplementation(({ data }) => {
        const newPassage = { id: `mock-passage-${mockPassages.length + 1}`, ...data };
        mockPassages.push(newPassage);
        return newPassage;
      }),
    },
    question: {
      findFirst: vi.fn().mockImplementation(({ where }) => {
        // Simple mock to return a question based on passageId
        return {
          id: `mock-question-${where.passageId || 'default'}`,
          questionText: 'Test question?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 'Option A',
          explanation: 'This is the explanation'
        };
      }),
    },
    answerAttempt: {
      create: vi.fn().mockImplementation(({ data }) => {
        return {
          id: `mock-attempt-${Date.now()}`,
          ...data,
          createdAt: new Date()
        };
      }),
    },
    wordBank: { // Added wordBank mock
      create: vi.fn().mockImplementation(({ data }) => {
        const newWordBank = { id: `mock-word-bank-${mockSharedWordBanks.length + 1}`, ...data };
        mockSharedWordBanks.push(newWordBank); // Using sharedWordBanks array for simplicity in mock
        return newWordBank;
      }),
      deleteMany: vi.fn().mockImplementation(() => { // Mock implementation for deleteMany
        mockSharedWordBanks.length = 0; // Clear the mock shared word banks array
        return { count: 0 }; // Return a count of deleted records
      }),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrismaClient),
    // Export other necessary things from @prisma/client
    UserRole: {
      ADMIN: 'ADMIN',
      USER: 'USER',
    },
    PracticeType: {
      VOCABULARY: 'VOCABULARY',
      READING_WRITING: 'READING_WRITING',
    },
  };
});

// Mock the prisma instance used in the application
vi.mock('@/lib/db/prisma', () => ({
  prisma: new PrismaClient(),
}));

// Reset mock data before each test
beforeEach(() => {
  mockUsers.length = 0;
  mockGroups.length = 0;
  mockGroupMembers.length = 0;
  mockGroupInvites.length = 0;
  mockQuestionSets.length = 0;
  mockPracticeSessions.length = 0;
  mockWords.length = 0;
  mockNotifications.length = 0;
  mockSharedWordBanks.length = 0;
  mockPassages.length = 0;
  userIdCounter = 0;
  groupIdCounter = 0;
  groupMemberIdCounter = 0;
  groupInviteIdCounter = 0;
});