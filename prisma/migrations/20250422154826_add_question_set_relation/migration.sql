/*
  Warnings:

  - You are about to drop the column `timestamp` on the `AnswerAttempt` table. All the data in the column will be lost.
  - You are about to alter the column `score` on the `PracticeSession` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `type` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `easeFactor` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `interval` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `mastery` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `nextDueAtReviewCount` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `nextReviewDate` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `repetitions` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sampleSentences` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `successRate` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `timesSeen` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `WordBank` table. All the data in the column will be lost.
  - You are about to drop the `WordBankWords` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `updatedAt` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';
ALTER TYPE "QuestionType" ADD VALUE 'ESSAY';

-- DropForeignKey
ALTER TABLE "Word" DROP CONSTRAINT "Word_wordMasterId_fkey";

-- DropForeignKey
ALTER TABLE "WordBankWords" DROP CONSTRAINT "WordBankWords_wordBankId_fkey";

-- DropIndex
DROP INDEX "WordMaster_baseWord_language_key";

-- AlterTable
ALTER TABLE "AnswerAttempt" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Passage" ADD COLUMN     "questionSetId" TEXT,
ALTER COLUMN "practiceSessionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "lastFetchedWordId" TEXT,
ADD COLUMN     "questionSetId" TEXT,
ALTER COLUMN "score" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "type",
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE';

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "easeFactor",
DROP COLUMN "interval",
DROP COLUMN "mastery",
DROP COLUMN "nextDueAtReviewCount",
DROP COLUMN "nextReviewDate",
DROP COLUMN "repetitions",
DROP COLUMN "sampleSentences",
DROP COLUMN "successRate",
DROP COLUMN "timesSeen",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "wordType" TEXT,
ALTER COLUMN "text" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WordBank" DROP COLUMN "reviewCount",
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WordMaster" ALTER COLUMN "language" DROP DEFAULT;

-- DropTable
DROP TABLE "WordBankWords";

-- CreateTable
CREATE TABLE "GroupWordBank" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "wordBankId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupWordBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedQuestionSet" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "sharedWithUserId" TEXT,
    "sharedWithGroupId" TEXT,
    "shareLink" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionChat" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSessionChat" (
    "id" TEXT NOT NULL,
    "practiceSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeSessionChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupWordBank_groupId_wordBankId_key" ON "GroupWordBank"("groupId", "wordBankId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedQuestionSet_shareLink_key" ON "SharedQuestionSet"("shareLink");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_wordMasterId_fkey" FOREIGN KEY ("wordMasterId") REFERENCES "WordMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWordBank" ADD CONSTRAINT "GroupWordBank_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWordBank" ADD CONSTRAINT "GroupWordBank_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedQuestionSet" ADD CONSTRAINT "SharedQuestionSet_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedQuestionSet" ADD CONSTRAINT "SharedQuestionSet_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedQuestionSet" ADD CONSTRAINT "SharedQuestionSet_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionChat" ADD CONSTRAINT "QuestionChat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionChat" ADD CONSTRAINT "QuestionChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSessionChat" ADD CONSTRAINT "PracticeSessionChat_practiceSessionId_fkey" FOREIGN KEY ("practiceSessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSessionChat" ADD CONSTRAINT "PracticeSessionChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
