'use client'

import { WordCardLargeGrid } from '@/components/features/vocab/WordCardLargeGrid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type RouterOutputs } from '@/utils/trpc';
import type { JsonValue } from '@prisma/client/runtime/library';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

type SharedWord = RouterOutputs['wordBank']['getSharedWordBank']['wordBank']['words'][number] & {
  _count: {
    practiceLogs: number;
  };
};

type WordListItem = {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  isStarred: boolean;
  notes: string | null;
  wordBankId: string;
  practiceCount: number;
  wordMaster: {
    id: string;
    baseWord: string;
    wordType: string | null;
    definition: string | null;
    sampleSentences: JsonValue;
    translations: JsonValue;
    isDictionaryWord: boolean;
  };
};

export default function SharedWordBankPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const shareLink = params.shareLink as string;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/share/${shareLink}`);
    }
  }, [status, shareLink, router]);

  const { data: sharedWordBank, isLoading, error } = api.wordBank.getSharedWordBank.useQuery(
    { shareLink },
    { enabled: !!shareLink && status === 'authenticated' }
  );

  useEffect(() => {
    if (error) {
      toast.error(`Failed to load shared word bank: ${error.message}`);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error loading shared word bank.</div>;
  }

  if (!sharedWordBank || !sharedWordBank.wordBank) {
    return <div className="container mx-auto p-4 text-red-500">Shared word bank not found or access denied.</div>;
  }

  const { wordBank } = sharedWordBank;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{wordBank.name}</CardTitle>
          {wordBank.description && <CardDescription>{wordBank.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {wordBank.words && wordBank.words.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wordBank.words.map((word: SharedWord) => {
                const wordListItem: WordListItem = {
                  ...word,
                  practiceCount: word._count.practiceLogs,
                  wordMaster: {
                    ...word.wordMaster,
                    sampleSentences: word.wordMaster?.sampleSentences || [],
                    translations: word.wordMaster?.translations || []
                  }
                };
                return (
                  <WordCardLargeGrid
                    key={word.id}
                    word={wordListItem}
                    bankId={wordBank.id}
                  />
                );
              })}
            </div>
          ) : (
            <div>No words in this shared word bank yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}