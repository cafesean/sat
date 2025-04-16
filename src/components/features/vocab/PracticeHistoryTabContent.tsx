'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // Import Dialog components
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
// Remove usePracticeLogs import
import { api, type RouterOutputs } from '@/utils/trpc';
import { format, formatDistanceToNow } from 'date-fns'; // Import date-fns utils
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react'; // Import Fragment, useMemo

// Infer types
type PracticeSessionItem = RouterOutputs['vocab']['listPracticeSessions']['sessions'][number];
type SessionSummary = RouterOutputs['vocab']['getVocabSessionSummary'];

// Update PracticeHistoryItem to use PracticeSessionItem type
function PracticeHistoryItem ({ session, onReviewClick }: { session: PracticeSessionItem, onReviewClick: (sessionId: string) => void }) {
  const startTime = session.startTime ? new Date(session.startTime) : null;

  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex-grow overflow-hidden">
           <p className="font-medium text-sm truncate">
             {session.wordBankName ? `Bank: ${session.wordBankName}` : 'Quick Practice'}
           </p>
           {startTime && (
             <p className="text-xs text-muted-foreground" title={format(startTime, 'PPpp')}>
               {formatDistanceToNow(startTime, { addSuffix: true })}
             </p>
           )}
           <p className="text-xs text-muted-foreground">
             Words Studied: {session.wordsStudied ?? 0}
           </p>
           {/* Accuracy might not be directly available, calculate if needed or remove */}
           {/* {session.accuracy !== undefined && <p className="text-xs text-muted-foreground">Accuracy: {session.accuracy}%</p>} */}
        </div>
        <div className="flex-shrink-0">
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
  // Use the specific query hook for session summary
  const { data: summary, isLoading, error } = api.vocab.getVocabSessionSummary.useQuery(
    { practiceSessionId: sessionId },
    { enabled: !!sessionId } // Enable only when sessionId is present
  );

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
        {summary.logs.map((log: any) => ( // Use 'any' for log type if structure varies or use inferred type
          <div key={log.id} className="p-3 border rounded-md text-sm">
            <p className="mb-1"><strong>Word:</strong> {log.word?.text ?? 'N/A'}</p>
            <p className="mb-1"><strong>Your Sentence:</strong> {log.userSentence ?? ''}</p>
            <p className={`font-medium ${log.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              <strong>Result:</strong> {log.isCorrect ? 'Correct' : 'Incorrect'}
            </p>
            {log.aiFeedback && <p className="text-xs italic text-muted-foreground mt-1"><strong>Feedback:</strong> {log.aiFeedback}</p>}
            <p className="text-xs mt-1"><strong>Ease:</strong> {easeLevelMap[log.easeChosen] ?? 'N/A'}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// Main component to fetch and display practice SESSIONS
export function PracticeHistoryTabContent() {
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  // Use useInfiniteQuery for practice sessions
  const {
    data: sessionPages,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.vocab.listPracticeSessions.useInfiniteQuery(
    { limit: 15 }, // Fetch 15 sessions per page
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  );

  // Combine pages into a single list
  const sessions = useMemo(() => sessionPages?.pages.flatMap(page => page.sessions) ?? [], [sessionPages]);

  // Initial loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
    )
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
        <AlertCircle className="h-5 w-5" />
        <span>Error loading practice sessions: {error.message}</span>
      </div>
    )
  }

  // Render the list of sessions
  return (
    <>
      <div className="space-y-3">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            // Use the existing PracticeHistoryItem component, passing session data
            <PracticeHistoryItem
              key={session.id}
              session={session} // Pass the whole session object
              onReviewClick={() => setReviewSessionId(session.id)}
            />
          ))
        ) : (
          // Show message only if not loading initially
          !isLoading && <p className="text-muted-foreground text-center py-8">No practice sessions found.</p>
        )}
        {/* Load More Button - uses props from useInfiniteQuery */}
        {hasNextPage && (
          <div className="pt-4 text-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              size="sm"
            >
              {isFetchingNextPage ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load More
            </Button>
          </div>
        )}
      </div>
      {/* Session Review Dialog */}
      <Dialog open={!!reviewSessionId} onOpenChange={(open) => !open && setReviewSessionId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Session Review</DialogTitle>
          </DialogHeader>
          {reviewSessionId && <SessionReviewContent sessionId={reviewSessionId} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
