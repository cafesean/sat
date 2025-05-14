'use client'

import { Button } from '@/components/ui/button'; // Re-add Button import
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'; // Import Dialog components
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Skeleton } from '@/components/ui/skeleton';
import { api, type RouterOutputs } from '@/utils/trpc';
import { format } from 'date-fns';
import { AlertCircle, BookText } from 'lucide-react'; // Import Loader2
import { useState } from 'react'; // Import useState

// Infer types
// Infer types
type PracticeSessionItem = RouterOutputs['vocab']['listPracticeSessions']['items'][number]; // Use 'items' instead of 'sessions'
type SessionSummary = RouterOutputs['vocab']['getVocabSessionSummary'];

// Helper component to display individual history item
function PracticeHistoryItem ({ session, onReviewClick }: { session: PracticeSessionItem, onReviewClick: (sessionId: string) => void }) {
  // Determine bank name - assuming wordBankName is not directly available
  const bankName = session.wordBankId ? `Bank ID: ${session.wordBankId}` : 'Quick Practice'; // Use wordBankId if available, otherwise Quick Practice

  return (
    <Card>
      {/* More compact layout */}
      <CardContent className="p-3 flex items-center justify-between gap-3">
        {/* Session Info */}
        <div className="flex-grow overflow-hidden"> {/* Prevent text overflow */}
          <p className="font-medium text-sm truncate" title={format(new Date(session.startTime), 'PPpp')}>
            {format(new Date(session.startTime), 'PPp')} {/* Shorter date format */}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate" title={bankName}>
            <BookText className="h-3 w-3 flex-shrink-0" />
            {bankName}
          </p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4 text-center flex-shrink-0">
          <div>
            <p className="text-xs text-muted-foreground">Words</p>
            {/* Use _count.vocabLogs for words studied */}
            <p className="font-medium text-sm">{session._count?.vocabLogs ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Acc.</p>
            {/* Accuracy data is not directly available in this query result, display placeholder */}
            <p className="font-medium text-sm">N/A</p>
          </div>
        </div>
        {/* Review Button */}
        <div className="flex-shrink-0">
          {/* Trigger the modal instead of linking */}
          <Button variant="outline" size="sm" onClick={() => onReviewClick(session.id)}>
            Review
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Component to display session summary inside the dialog
function SessionReviewContent({ sessionId }: { sessionId: string }) {
  const { data: summary, isLoading, error } = api.vocab.getVocabSessionSummary.useQuery({ sessionId: sessionId }); // Use 'sessionId'

  if (isLoading) {
    return <div className="py-4"><Skeleton className="h-20 w-full" /></div>;
  }
  if (error) {
    return <p className="text-red-500 py-4">Error loading summary: {error.message}</p>;
  }
  if (!summary) {
    return <p className="text-muted-foreground py-4">Session summary not found.</p>;
  }

  // Helper to map ease number to string
  const easeLevelMap: { [key: number]: string } = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

  return (
    <ScrollArea className="h-[450px] pr-4">
      <div className="space-y-3 py-2">
        {/* Map over wordSummaries instead of logs */}
        {summary.wordSummaries.map((wordSummary) => (
          <div key={wordSummary.word.id} className="p-3 border rounded-md text-sm">
            <p className="mb-1"><strong>Word:</strong> {wordSummary.word?.text ?? 'N/A'}</p>
            {/* Display details for each attempt for this word */}
            {wordSummary.attempts.map((attempt, index) => (
              <div key={index} className="ml-2 mt-2 border-l-2 pl-2">
                 <p className="mb-1"><strong>Attempt {index + 1}:</strong> {attempt.userSentences?.[0] ?? 'N/A'}</p> {/* Assuming userSentences is an array */}
                 <p className={`font-medium ${attempt.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                   <strong>Result:</strong> {attempt.isCorrect ? 'Correct' : 'Incorrect'}
                 </p>
                 {attempt.aiFeedback && <p className="text-xs italic text-muted-foreground mt-1"><strong>Feedback:</strong> {attempt.aiFeedback}</p>}
                 <p className="text-xs mt-1"><strong>Ease:</strong> {easeLevelMap[attempt.easeChosen] ?? 'N/A'}</p>
              </div>
            ))}
             {/* Display overall accuracy for the word */}
             <p className="text-sm mt-2"><strong>Overall Accuracy for Word:</strong> {Math.round((wordSummary.correctCount / wordSummary.attempts.length) * 100)}%</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}


// Main component to fetch and display history
export function PracticeHistoryTabContent() {
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null); // State for review dialog

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

  const sessions = data?.pages.flatMap((page) => page.items) ?? []; // Use 'items' instead of 'sessions'

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

  const handleReviewClick = (sessionId: string) => {
    setReviewSessionId(sessionId);
  };

  return (
    <>
      <div className="space-y-3"> {/* Reduced spacing */}
        {sessions.length > 0 ? (
          sessions.map((session) => (
            // Add a check to ensure session is not null or undefined
            session ? (
              <PracticeHistoryItem key={session.id} session={session} onReviewClick={handleReviewClick} />
            ) : null
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

      {/* Review Dialog */}
      <Dialog open={!!reviewSessionId} onOpenChange={(open) => !open && setReviewSessionId(null)}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Session Review</DialogTitle>
            <DialogDescription>
              Detailed review of your practice session.
            </DialogDescription>
          </DialogHeader>
          {reviewSessionId && <SessionReviewContent sessionId={reviewSessionId} />}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button> {/* Changed variant to outline */}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
