'use client'

import { Badge } from '@/components/ui/badge'; // Import Badge
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { getPracticeLogsByWord } from '@/lib/storage';
import { api, type RouterOutputs } from '@/utils/trpc';
import { format } from 'date-fns'; // For formatting timestamps
import { History } from 'lucide-react'; // Icon for the trigger button
import { useEffect, useState } from 'react';

// Define type for a single history log item
type HistoryLog = RouterOutputs['vocab']['getWordPracticeHistory'][number];

interface WordHistoryDialogProps {
  wordId: string;
  wordText: string;
  historyCount?: number; // Make count optional
}

// Helper to map ease number to string
const easeLevelMap: { [key: number]: string } = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy'
}

export function WordHistoryDialog({ wordId, wordText, historyCount }: WordHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryLog[] | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false); // Separate loading state for local fetch
  const [localError, setLocalError] = useState<string | null>(null);
  const [attemptedLocalFetch, setAttemptedLocalFetch] = useState(false); // Track if local fetch was done

  // tRPC query hook - called unconditionally at the top level
  const {
    data: remoteHistory,
    isLoading: isLoadingRemote,
    error: remoteError,
    isFetching: isFetchingRemote, // Use isFetching for background updates
  } = api.vocab.getWordPracticeHistory.useQuery(
    { wordId },
    {
      // Only enable the query if the dialog is open AND local fetch has been attempted but found nothing
      enabled: isOpen && attemptedLocalFetch && !history && !localError,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false, // Avoid unnecessary refetches
    }
  );

  // Effect to fetch local data when dialog opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setHistory(null);
      setIsLoadingLocal(false);
      setLocalError(null);
      setAttemptedLocalFetch(false);
      return;
    }

    let cancelled = false;
    async function fetchLocalHistory() {
      setIsLoadingLocal(true);
      setLocalError(null);
      setHistory(null); // Clear previous history
      setAttemptedLocalFetch(false); // Reset attempt flag

      try {
        console.log(`WordHistoryDialog: Fetching local history for wordId: ${wordId}`);
        const localData = await getPracticeLogsByWord(wordId);
        if (!cancelled) {
          if (localData && localData.length > 0) {
            console.log(`WordHistoryDialog: Found ${localData.length} logs locally.`);
            // Transform local PracticeLog[] to HistoryLog[]
            const transformedLocalData = localData.map(log => ({
              id: log.id,
              timestamp: new Date(log.practicedAt), // Convert string to Date
              isCorrect: log.result === 'correct', // Convert 'correct'/'incorrect' to boolean
              // Provide default/null values for fields missing in local PracticeLog
              userSentence: '', // Not available locally
              easeChosen: 0,    // Not available locally
              aiFeedback: null, // Not available locally
              // Include other fields if HistoryLog expects them and they exist on PracticeLog
              // e.g., wordId: log.wordId (if needed by HistoryLog type)
            })) as HistoryLog[]; // Assert type after transformation
            setHistory(transformedLocalData);
          } else {
            console.log(`WordHistoryDialog: No local history found.`);
            // No local data found, allow tRPC query to enable
          }
          setAttemptedLocalFetch(true); // Mark local fetch as attempted
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error(`WordHistoryDialog: Error fetching local history:`, e);
          setLocalError('Failed to load local history.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLocal(false);
        }
      }
    }

    fetchLocalHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, wordId]);

  // Effect to update history state from tRPC query result
  useEffect(() => {
    if (remoteHistory) {
      console.log(`WordHistoryDialog: Received ${remoteHistory.length} logs from remote.`);
      // Ensure data matches HistoryLog structure (basic check)
       const validatedRemoteData = remoteHistory.map(log => ({
        ...log,
        timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp), // Ensure Date object
        easeChosen: typeof log.easeChosen === 'number' ? log.easeChosen : 0,
        isCorrect: typeof log.isCorrect === 'boolean' ? log.isCorrect : false,
      })) as HistoryLog[];
      setHistory(validatedRemoteData);
      setLocalError(null); // Clear local error if remote fetch succeeds
    }
  }, [remoteHistory]);

  // Determine overall loading and error states
  const isLoading = isLoadingLocal || (attemptedLocalFetch && !history && !localError && (isLoadingRemote || isFetchingRemote));
  const error = localError || (remoteError ? `Failed to load history: ${remoteError.message}` : null);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Add relative positioning to the button for the badge */}
        <Button variant="ghost" size="icon" className="relative h-6 w-6" aria-label={`View history for ${wordText}`}>
          <History className="h-3 w-3" />
          {/* Display badge if count is greater than 0 */}
          {typeof historyCount === 'number' && historyCount > 0 && (
            <Badge
              variant="destructive" // Or another variant like "secondary"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {historyCount > 9 ? '9+' : historyCount} {/* Cap count display */}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]"> {/* Adjust max width as needed */}
        <DialogHeader>
          <DialogTitle>Practice History for "{wordText}"</DialogTitle>
          <DialogDescription>
            Review of past practice attempts for this word.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4"> {/* Make content scrollable */}
          {isLoading && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {/* Display error if any occurred */}
          {error && !isLoading && (
            <p className="text-red-500 py-4 text-center">{error}</p>
          )}
          {/* Display history if loaded and no error */}
          {!isLoading && !error && history && history.length > 0 && (
            <div className="space-y-3 py-2">
              {history.map((log) => ( // Use defined HistoryLog type
                <div key={log.id} className="p-3 border rounded-md text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {/* Ensure timestamp is a Date object before formatting */}
                    {log.timestamp instanceof Date ? format(log.timestamp, 'PPpp') : 'Invalid Date'}
                  </p>
                  <p className="mb-1"><strong>Sentence:</strong> {log.userSentence ?? ''}</p>
                  <p className={`font-medium ${log.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    <strong>Result:</strong> {log.isCorrect ? 'Correct' : 'Incorrect'}
                  </p>
                  {log.aiFeedback && <p className="text-xs italic text-muted-foreground mt-1"><strong>Feedback:</strong> {log.aiFeedback}</p>}
                  <p className="text-xs mt-1"><strong>Ease:</strong> {easeLevelMap[log.easeChosen] ?? 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
          {/* Display "No history" message only if not loading, no error, and history is empty or null */}
          {!isLoading && !error && (!history || history.length === 0) && (
             <p className="text-muted-foreground py-4 text-center">No practice history found for this word.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
