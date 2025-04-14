'use client'

import { LearnWords } from '@/components/features/vocab/LearnWords';
import { Button } from '@/components/ui/button';
import { api } from '@/utils/trpc';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

export default function LearnWordsPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const bankId = params.bankId as string;

  // Fetch word bank details (optional, could just fetch words)
  const { data: wordBank, isLoading: isLoadingBank, error: bankError } = api.vocab.getById.useQuery(
    { id: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  );

  // Fetch words for learning
  const { data: words, isLoading: isLoadingWords, error: wordsError } = api.vocab.listByBank.useQuery(
    { wordBankId: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  );

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
    return <div className="container mx-auto p-4 text-red-500">Error loading data: {bankError?.message || wordsError?.message}</div>;
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
        <LearnWords words={words} />
      ) : (
        <Button onClick={() => router.push(`/vocabulary/edit/${bankId}`)}><Plus className="mr-2 h-4 w-4" />Add Words</Button>
      )}
    </div>
  );
}
