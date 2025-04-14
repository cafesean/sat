'use client'

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent, // Keep if needed
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Import Label
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/utils/trpc';
// Remove VisuallyHidden import
import { Loader2, Save, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Assuming WordListItem is exported from the bank detail page
import type { WordListItem } from '@/app/vocabulary/banks/[bankId]/page';

interface WordInteractionModalProps {
  wordId: string;
  bankId: string; // Needed for invalidation
  children: React.ReactNode; // Trigger element
  onModalClose?: () => void; // Optional callback when modal closes
}

// Simplified type for the single word query result (adjust based on actual query)
type SingleWordItem = Omit<WordListItem, '_count'> & { // Omit _count if not needed here
    // Add any other specific fields returned by getWordById if different
};


export function WordInteractionModal({ wordId, bankId, children, onModalClose }: WordInteractionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(true);
  const utils = api.useUtils();

  // --- Query to fetch the specific word's data ---
  // NOTE: Assumes a `getWordById` query exists. If not, it needs to be created.
  // Alternatively, pass the full word object as a prop if already available.
  // For now, let's assume we fetch it.
  const { data: currentWord, isLoading: isLoadingWord, error: wordError } = api.vocab.getWordById.useQuery(
     { id: wordId },
     {
       enabled: isOpen && !!wordId, // Fetch only when modal is open and wordId is valid
       refetchOnWindowFocus: false // Prevent refetching just for starring/unstarring
     }
  );

  // --- Effect to update note state when word data loads ---
  useEffect(() => {
    if (currentWord) {
      setNote(currentWord.notes || '');
      setIsNoteSaved(true);
    }
  }, [currentWord]);

  // --- Mutation to save notes ---
  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: (updatedWord) => {
      toast.success('Note saved!');
      setIsNoteSaved(true);
      // Invalidate queries
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      utils.vocab.getWordById.invalidate({ id: wordId }); // Invalidate this specific word query
      utils.vocab.listWordBanks.invalidate(); // May need to update mastery on dashboard
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });

  // --- Mutation to toggle star ---
  const toggleStarMutation = api.vocab.toggleStar.useMutation({
     onSuccess: (updatedWord) => {
       toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
       // Invalidate queries to update UI elsewhere
       utils.vocab.listByBank.invalidate({ wordBankId: bankId });
       utils.vocab.getWordById.invalidate({ id: wordId }); // Update data for this modal
       utils.vocab.listWordBanks.invalidate(); // Update dashboard if needed
     },
     onError: (error) => {
       toast.error(`Failed to update star status: ${error.message}`);
     }
  });

  // --- Handlers ---
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setIsNoteSaved(false);
  };

  const handleSaveNote = () => {
    if (!currentWord || note === (currentWord.notes || '')) return;
    saveNoteMutation.mutate({ wordId: currentWord.id, notes: note });
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onModalClose?.(); // Call callback if provided
    }
  };

  // --- Rendering Logic ---
  // --- Rendering Logic ---
  // Always render Header, Title, Footer, Close button
  // Conditionally render the main content based on loading/error/success state


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
         {/* Always render Header and Title */}
         <DialogHeader>
           <div className="flex justify-between items-center">
             <DialogTitle>
               {isLoadingWord ? 'Loading...' : (currentWord?.wordMaster?.baseWord || currentWord?.text || 'Word Details')}
             </DialogTitle>
             {/* Star Button - Render only when word is loaded */}
             {currentWord && !isLoadingWord && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${currentWord.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStarMutation.mutate({ wordId: currentWord.id });
                  }}
                  title={currentWord.isStarred ? 'Unstar word' : 'Star word'}
                  disabled={toggleStarMutation.isPending}
                >
                  {toggleStarMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Star className={`h-4 w-4 ${currentWord.isStarred ? 'fill-current' : ''}`} />
                  }
                </Button>
             )}
           </div>
         </DialogHeader>

         {/* Conditionally render the main content */}
         {isLoadingWord ? (
           <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-1/2" /> {/* Type */}
              <Skeleton className="h-4 w-full" /> {/* Definition */}
              <Skeleton className="h-4 w-full" /> {/* Example */}
              <Skeleton className="h-4 w-1/2" /> {/* Translation */}
              <Skeleton className="h-20 w-full mt-4" /> {/* Notes Area */}
           </div>
         ) : wordError ? (
           <p className="text-destructive text-center py-4">Error loading word details: {wordError.message}</p>
         ) : !currentWord ? (
           <p className="text-muted-foreground text-center py-4">Word details not found.</p>
         ) : (
           // Actual content when loaded successfully
           <div className="py-4 space-y-4">
             {/* Word Details */}
             <div className="space-y-2 text-base text-center">
                <p><strong>Type:</strong> {currentWord.wordMaster?.wordType || 'N/A'}</p>
                <p><strong>Definition:</strong> {currentWord.wordMaster?.definition || 'N/A'}</p>
                <p><strong>Sample Sentence:</strong> {(currentWord.wordMaster?.sampleSentences as any)?.default || 'N/A'}</p>
                <p><strong>Translation:</strong> {(currentWord.wordMaster?.translations as any)?.default || 'N/A'}</p>
             </div>
             {/* Notes Section */}
             <div className="w-full space-y-2 pt-4 border-t">
               <Label htmlFor={`modal-notes-${currentWord.id}`} className="text-sm font-medium">My Notes</Label>
               <Textarea
                 id={`modal-notes-${currentWord.id}`}
                 placeholder="Add your personal notes here..."
                 value={note}
                 onChange={handleNoteChange}
                 rows={4}
                 className="w-full"
                 disabled={saveNoteMutation.isPending}
               />
               <Button
                 size="sm"
                 onClick={handleSaveNote}
                 disabled={saveNoteMutation.isPending || isNoteSaved}
                 className={`w-full ${isNoteSaved && !saveNoteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 {saveNoteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Note
               </Button>
             </div>
           </div>
         )}

         {/* Footer is always rendered */}
         <DialogFooter>
           <DialogClose asChild>
             <Button variant="outline">Close</Button>
           </DialogClose>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}