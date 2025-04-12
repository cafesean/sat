'use client'

import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog'; // Import the history dialog
import { Badge } from '@/components/ui/badge'; // Re-add Badge import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ArrowLeft } from 'lucide-react'; // Import an icon for back button
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

// Define types
type WordBank = RouterOutputs['vocab']['getById'];
type WordListItem = RouterOutputs['vocab']['listByBank'][number];

// Helper function to determine mastery level and badge variant
const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) {
    return { level: 'Beginner', variant: 'destructive' }; // Red
  } else if (interval <= 7) {
    return { level: 'Learning', variant: 'secondary' }; // Yellow/Orange-ish (default secondary)
  } else if (interval <= 30) {
    return { level: 'Consolidating', variant: 'outline' }; // Light Green (using outline for differentiation)
  } else {
    return { level: 'Mastered', variant: 'default' }; // Blue/Green (default primary)
  }
};

export default function WordBankDetailPage () {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const bankId = params.bankId as string

  // Fetch Word Bank Details
  const { data: wordBank, isLoading: isLoadingBank, error: bankError } = api.vocab.getById.useQuery(
    { id: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  )

  // Fetch Words in the Bank
  const { data: words, isLoading: isLoadingWords, error: wordsError } = api.vocab.listByBank.useQuery(
    { wordBankId: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  )

  // Loading state
  if (status === 'loading' || (isLoadingBank && !wordBank) || (isLoadingWords && !words)) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-1/4" /> {/* Back button */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auth check
  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to view word banks.</div>
  }

  // Error handling
  if (bankError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading word bank: {bankError.message}</div>
  }
  if (wordsError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading words: {wordsError.message}</div>
  }
  if (!wordBank) {
     return <div className="container mx-auto p-4 text-red-500">Word bank not found or access denied.</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Button variant="outline" size="sm" onClick={() => router.push('/vocabulary')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Word Banks
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{wordBank.name}</CardTitle>
          {wordBank.description && <CardDescription>{wordBank.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold mb-2">Words ({words?.length ?? 0})</h3>
          {words && words.length > 0
            ? (
            <ul className="space-y-2">
              {words.map((word: WordListItem) => {
                const mastery = getMasteryInfo(word.interval); // Calculate mastery
                return (
                  <li key={word.id} className="flex justify-between items-center p-2 border rounded-md">
                    <span>{word.text}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant={mastery.variant}>{mastery.level}</Badge> {/* Display Mastery Badge */}
                      <WordHistoryDialog wordId={word.id} wordText={word.text} /> {/* Add History Button/Dialog */}
                    </div>
                  </li>
                );
              })}
            </ul>
              )
            : (
            <p className="text-muted-foreground">No words added to this bank yet.</p>
              )}
           {/* TODO: Add input/button for adding new words here */}
        </CardContent>
      </Card>
    </div>
  )
}
