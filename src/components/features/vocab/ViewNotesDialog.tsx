'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { useWords } from '@/hooks/useWords'; // Import useWords instead of useNotes
import { CSSProperties, useMemo, useState } from 'react'; // Import useMemo, CSSProperties
import { FixedSizeList as ListWindow } from 'react-window'; // Import react-window

// Define a type for the aggregated note structure
interface AggregatedNote {
  wordId: string;
  wordText: string; // Add word text for context
  noteId: string; // Use note content as key? Or generate one? Let's assume note content is unique enough for key for now, or use wordId+index
  content: string;
}

interface ViewNotesDialogProps {
  bankId: string; // Keep bankId to fetch words
  children: React.ReactNode; // Trigger element
}

export function ViewNotesDialog({ bankId, children }: ViewNotesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Fetch words for the bank using useWords hook
  const { words, isLoading: isLoadingWords, error: wordsError } = useWords(bankId);

  // Aggregate notes from the fetched words
  const aggregatedNotes = useMemo(() => {
    if (!words) return [];
    const notesList: AggregatedNote[] = [];
    words.forEach(word => {
      if (word.notes && word.notes.trim() !== '') {
        notesList.push({
          wordId: word.id,
          wordText: word.wordMaster?.baseWord || word.text, // Get word text
          noteId: `${word.id}-note`, // Create a unique key
          content: word.notes,
        });
      }
    });
    return notesList;
  }, [words]);

  // Check if there are any notes
  const hasNotes = useMemo(() => aggregatedNotes.length > 0, [aggregatedNotes]);

  // If no notes and not loading, don't render the dialog
  if (!hasNotes && !isLoadingWords && !wordsError) {
    return null;
  }

  // --- Virtualization Renderer ---
  const NoteItem = ({ index, style, data }: { index: number; style: CSSProperties, data: AggregatedNote[] }) => {
    const note = data[index];
    return (
      <div style={style} className="border-b pb-3 mb-3 last:border-b-0"> {/* Apply style and spacing */}
         <p className="font-semibold text-sm">{note.wordText}</p> {/* Show word */}
         <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
      </div>
    );
  };
  // --- End Virtualization Renderer ---


  return (
    <Dialog open={isOpen} onOpenChange={(open) => hasNotes && setIsOpen(open)}>
      <DialogTrigger asChild disabled={!hasNotes}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notes for Word Bank</DialogTitle> {/* Updated Title */}
        </DialogHeader>
        <div className="py-4"> {/* Remove space-y-4 */}
          {isLoadingWords && (
            <div className="space-y-2"> {/* Skeleton for loading words */}
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-8 w-full" />
               <Skeleton className="h-4 w-1/4 mt-2" />
               <Skeleton className="h-8 w-full" />
            </div>
          )}
          {wordsError && (
            <p className="text-sm text-destructive text-center">Error loading words: {typeof wordsError === 'string' ? wordsError : 'Unknown error'}</p>
          )}
          {!isLoadingWords && !wordsError && aggregatedNotes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No notes found for words in this bank.</p>
          )}
          {!isLoadingWords && !wordsError && aggregatedNotes.length > 0 && (
             <ListWindow
               height={450} // Adjust height as needed within the dialog
               itemCount={aggregatedNotes.length}
               itemSize={70} // Estimate height: word text + note text + padding/margin
               width="100%"
               itemData={aggregatedNotes}
             >
               {NoteItem}
             </ListWindow>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
