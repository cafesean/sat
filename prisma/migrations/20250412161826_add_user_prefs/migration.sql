-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gradeLevel" INTEGER,
ADD COLUMN     "languagePreference" TEXT NOT NULL DEFAULT 'en';
