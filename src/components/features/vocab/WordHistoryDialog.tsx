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
import { api, type RouterOutputs } from '@/utils/trpc';
import { format } from 'date-fns'; // For formatting timestamps
import { History } from 'lucide-react'; // Icon for the trigger button
import { useState } from 'react';

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

export function WordHistoryDialog ({ wordId, wordText, historyCount }: WordHistoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Fetch history only when the dialog is open
  const { data: history, isLoading, error } = api.vocab.getWordPracticeHistory.useQuery(
    { wordId },
    { enabled: isOpen } // Only fetch when dialog is open
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Add relative positioning to the button for the badge */}
        <Button variant="ghost" size="icon" className="relative h-6 w-6" aria-label={`View history for ${wordText}`}>
          <History className="h-3 w-3" />
          {/* Display badge if count is greater than 0 */}
          {historyCount !== undefined && historyCount > 0 && (
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
          {error && (
            <p className="text-red-500 py-4">Error loading history: {error.message}</p>
          )}
          {!isLoading && !error && history && history.length > 0 && (
            <div className="space-y-3 py-2">
              {history.map((log: HistoryLog) => (
                <div key={log.id} className="p-3 border rounded-md text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(log.timestamp), 'PPpp')} {/* Format timestamp */}
                  </p>
                  <p className="mb-1"><strong>Sentence:</strong> {log.userSentence}</p>
                  <p className={`font-medium ${log.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    <strong>Result:</strong> {log.isCorrect ? 'Correct' : 'Incorrect'}
                  </p>
                  {log.aiFeedback && <p className="text-xs italic text-muted-foreground mt-1"><strong>Feedback:</strong> {log.aiFeedback}</p>}
                  <p className="text-xs mt-1"><strong>Ease:</strong> {easeLevelMap[log.easeChosen] ?? 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
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
