-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_wordBankId_fkey" FOREIGN KEY ("wordBankId") REFERENCES "WordBank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
