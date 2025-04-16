'use client'

import { LearnWords } from '@/components/features/vocab/LearnWords';
import { Button } from '@/components/ui/button';
import { useWordBanks } from '@/hooks/useWordBanks';
import { useWords } from '@/hooks/useWords';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

export default function LearnWordsPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const bankId = params.bankId as string;

  // Use offline-first hooks
  const { wordBanks, isLoading: isLoadingBanks, error: banksError } = useWordBanks('');
  const { words, isLoading: isLoadingWords, error: wordsError } = useWords(bankId);
  const wordBank = wordBanks?.find(b => b.id === bankId);

  if (status === 'loading' || isLoadingBanks || isLoadingWords) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to learn words.</div>;
  }

  // Only show error if there is truly no data to display
  if (((banksError && (!wordBanks || wordBanks.length === 0)) || (wordsError && (!words || words.length === 0)))) {
    return <div className="container mx-auto p-4 text-red-500">Error loading data: {banksError || wordsError}</div>;
  }

  if (!wordBank || !words) {
    return <div className="container mx-auto p-4 text-red-500">Word bank or words not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Button variant="outline" size="sm" onClick={() => router.push(`/vocabulary/banks/${bankId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Word Bank: {wordBank.name}
      </Button>
      <h1 className="text-2xl font-bold">Learn Words: {wordBank.name}</h1>
      {words.length > 0 ? (
        <LearnWords words={words.map(word => ({
          ...word,
          interval: 0,
          easeFactor: 0,
          repetitions: 0,
          nextReviewDate: '',
          isStarred: false,
          notes: null,
          mastery: 0,
          nextDueAtReviewCount: 0,
          practiceCount: 0,
        }))} />
      ) : (
        <Button onClick={() => router.push(`/vocabulary/edit/${bankId}`)}><Plus className="mr-2 h-4 w-4" />Add Words</Button>
      )}
    </div>
  );
}
