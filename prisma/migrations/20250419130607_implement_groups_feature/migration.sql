-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "mastery" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextDueAtReviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "timesSeen" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WordBank" ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "WordPracticeLog" ADD COLUMN     "hintUsed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedWordBank" (
    "id" TEXT NOT NULL,
    "wordBankId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedWithGroupId" TEXT,
    "sharedWithUserId" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareLink" TEXT,

    CONSTRAINT "SharedWordBank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedWordBank_shareLink_key" ON "SharedWordBank"("shareLink");

-- CreateIndex
CREATE UNIQUE INDEX "SharedWordBank_wordBankId_sharedWithGroupId_key" ON "SharedWordBank"("wordBankId", "sharedWithGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedWordBank_wordBankId_sharedWithUserId_key" ON "SharedWordBank"("wordBankId", "sharedWithUserId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWordBank" ADD CONSTRAINT "SharedWordBank_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWordBank" ADD CONSTRAINT "SharedWordBank_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWordBank" ADD CONSTRAINT "SharedWordBank_sharedWithGroupId_fkey" FOREIGN KEY ("sharedWithGroupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedWordBank" ADD CONSTRAINT "SharedWordBank_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
