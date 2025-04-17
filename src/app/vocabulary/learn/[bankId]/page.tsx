'use client'

import { LearnWords } from '@/components/features/vocab/LearnWords';
import { Button } from '@/components/ui/button';
import { useWords } from '@/hooks/useWords';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { WordMasterData } from '@/lib/storage';

interface WordForLearning {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  isStarred: boolean;
  notes: string | null;
  mastery: number;
  nextDueAtReviewCount: number;
  timesSeen: number;
  successRate: number;
  wordMasterId: string;
  wordMaster: WordMasterData;
  wordBankId: string;
  practiceCount: number;
}

export default function LearnWordsPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const bankId = params.bankId as string;

  const { data: wordBank, isLoading: isLoadingBank, error: bankError } = api.vocab.getById.useQuery(
    { id: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  );

  const { words, isLoading: isLoadingWords, error: wordsError } = useWords(bankId);

  if (status === 'loading' || isLoadingBank || isLoadingWords) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to learn words.</div>;
  }

  if (bankError || wordsError) {
    let errorMsg = "Unknown error";
    if (typeof bankError === 'string') {
      errorMsg = bankError;
    } else if (bankError && typeof bankError === 'object' && 'message' in bankError) {
      errorMsg = (bankError as any).message;
    } else if (typeof wordsError === 'string') {
      errorMsg = wordsError;
    } else if (wordsError && typeof wordsError === 'object' && 'message' in wordsError) {
      errorMsg = (wordsError as any).message;
    }
    
    return (
      <div className="container mx-auto p-4 text-red-500">
        Error loading data: {errorMsg}
      </div>
    );
  }

  if (!wordBank) {
    return <div className="container mx-auto p-4 text-red-500">Word bank not found.</div>;
  }

  const wordsForLearning: WordForLearning[] = (words || [])
    .filter(word => !!word.wordMasterId)
    .map(word => {
      const wordMasterData: WordMasterData = word.wordMaster ?? {
        id: word.wordMasterId!,
        baseWord: word.text,
        wordType: null,
        definition: null,
        sampleSentences: null,
        translations: null,
        isDictionaryWord: false,
      };

      return {
        id: word.id,
        text: word.text,
        interval: 0,
        easeFactor: 0,
        repetitions: 0,
        nextReviewDate: '',
        isStarred: word.isStarred,
        notes: word.notes,
        mastery: word.mastery,
        nextDueAtReviewCount: word.nextDueAtReviewCount,
        timesSeen: word.timesSeen,
        successRate: word.successRate,
        wordMasterId: word.wordMasterId!,
        wordMaster: wordMasterData,
        wordBankId: word.wordBankId,
        practiceCount: word.practiceCount,
      };
    });

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Button variant="outline" size="sm" onClick={() => router.push(`/vocabulary/banks/${bankId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Word Bank: {wordBank.name}
      </Button>
      <h1 className="text-2xl font-bold">Learn Words: {wordBank.name}</h1>
      {wordsForLearning.length > 0 ? (
        <LearnWords words={wordsForLearning} />
      ) : (
        <Button onClick={() => router.push(`/vocabulary/banks/${bankId}`)}><Plus className="mr-2 h-4 w-4" />Add Words</Button>
      )}
    </div>
  );
}
