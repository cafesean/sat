/*
  Warnings:

  - You are about to drop the column `userSentence` on the `WordPracticeLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "sampleSentences" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "WordPracticeLog" DROP COLUMN "userSentence",
ADD COLUMN     "userSentences" TEXT[];
