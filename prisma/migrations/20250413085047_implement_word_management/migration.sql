/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `definition` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `sampleSentence` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `translation` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Word` table. All the data in the column will be lost.
  - You are about to drop the column `wordType` on the `Word` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[wordBankId,wordMasterId]` on the table `Word` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `wordMasterId` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Word_wordBankId_text_key";

-- AlterTable
ALTER TABLE "Word" DROP COLUMN "createdAt",
DROP COLUMN "definition",
DROP COLUMN "sampleSentence",
DROP COLUMN "text",
DROP COLUMN "translation",
DROP COLUMN "updatedAt",
DROP COLUMN "wordType",
ADD COLUMN     "wordMasterId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "WordMaster" (
    "id" TEXT NOT NULL,
    "baseWord" TEXT NOT NULL,
    "variations" JSONB NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "wordType" TEXT,
    "definition" TEXT,
    "sampleSentences" JSONB NOT NULL,
    "translations" JSONB NOT NULL,
    "isDictionaryWord" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordBankWords" (
    "id" TEXT NOT NULL,
    "wordBankId" TEXT NOT NULL,
    "words" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordBankWords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WordMaster_baseWord_language_key" ON "WordMaster"("baseWord", "language");

-- CreateIndex
CREATE UNIQUE INDEX "Word_wordBankId_wordMasterId_key" ON "Word"("wordBankId", "wordMasterId");

-- AddForeignKey
ALTER TABLE "WordBankWords" ADD CONSTRAINT "WordBankWords_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_wordMasterId_fkey" FOREIGN KEY ("wordMasterId") REFERENCES "WordMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
