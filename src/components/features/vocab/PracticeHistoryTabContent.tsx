'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, type RouterOutputs } from '@/utils/trpc';
import { format } from 'date-fns';
import { AlertCircle, BookText } from 'lucide-react';
import Link from 'next/link';

// Infer type for a single session item
type PracticeSessionItem = RouterOutputs['vocab']['listPracticeSessions']['sessions'][number];

// Helper component to display individual history item
function PracticeHistoryItem ({ session }: { session: PracticeSessionItem }) {
  // Use the fetched bank name, or fallback for quick practice
  const bankName = session.wordBankName ?? 'Quick Practice';

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Session Info */}
          <div className="flex-grow">
            <p className="font-medium text-sm md:text-base">
              {format(new Date(session.startTime), 'PPpp')} {/* Format timestamp */}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <BookText className="h-3 w-3" />
              {bankName}
            </p>
          </div>
          {/* Stats */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-center sm:text-left">
            <div>
              <p className="text-xs text-muted-foreground">Words Studied</p>
              <p className="font-medium text-lg">{session.wordsStudied}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="font-medium text-lg">{session.accuracy}%</p>
            </div>
          </div>
          {/* Review Button */}
          <div className="mt-2 md:mt-0 flex-shrink-0">
            <Link href={`/vocabulary/practice/${session.id}`}> {/* Link to session page */}
              <Button variant="outline" size="sm">
                Review Session
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main component to fetch and display history
export function PracticeHistoryTabContent() {
  // Using useInfiniteQuery for potential pagination later
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.vocab.listPracticeSessions.useInfiniteQuery(
    { limit: 10 }, // Initial limit
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // refetchOnWindowFocus: false, // Optional: disable refetch on focus
    }
  );

  const sessions = data?.pages.flatMap((page) => page.sessions) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
        <AlertCircle className="h-5 w-5" />
        <span>Error loading practice history: {error.message}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.length > 0 ? (
        sessions.map((session) => (
          <PracticeHistoryItem key={session.id} session={session} />
        ))
      ) : (
        <p className="text-muted-foreground text-center py-8">No practice history found.</p>
      )}
      {hasNextPage && (
        <Button
          variant="outline"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full"
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </Button>
      )}
    </div>
  )
}
