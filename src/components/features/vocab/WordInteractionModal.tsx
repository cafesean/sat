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
import { db, queueMutation } from '@/lib/storage'; // Import db, queueMutation AND updateWord
import { api } from '@/utils/trpc';
import { useSession } from 'next-auth/react'; // Import useSession
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
  const { data: session } = useSession(); // Get session data
  const userId = session?.user?.id; // Extract userId

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

  // Check if this is a newly added word waiting for AI enrichment
  const isAwaitingEnrichment = !!currentWord && 
    (!currentWord.wordMaster?.wordType && 
     !currentWord.wordMaster?.definition && 
     !currentWord.wordMaster?.sampleSentences);

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
       // Don't invalidate getWordById here, do it after local update below
       // utils.vocab.getWordById.invalidate({ id: wordId });
       utils.vocab.listWordBanks.invalidate(); // Update dashboard if needed
     },
     onError: (error, variables) => {
       toast.error(`Online star toggle failed: ${error.message}`);
       // TODO: Consider reverting optimistic update if online toggle fails
       // This requires more complex state management or refetching the original state.
     }
  });

  // --- Handlers ---
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    setIsNoteSaved(false);
  };

  const handleSaveNote = async () => { // Make async for queueing
    if (!currentWord || note === (currentWord.notes || '')) return;
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }

    // Optimistic UI update (mark as saved immediately)
    // Note: This doesn't update the underlying 'currentWord' data instantly,
    // relies on invalidation or refetch after online success/sync.
    setIsNoteSaved(true);

    try {
      if (navigator.onLine) {
        // Attempt online save
        saveNoteMutation.mutate({ wordId: currentWord.id, notes: note });
      } else {
        // Queue if offline
        await queueMutation({
          type: 'note/update', // Use a specific type for note updates
          payload: { wordId: currentWord.id, notes: note },
          userId
        });
        toast.info("Offline: Note update queued.");
        // Manually invalidate local query to reflect optimistic save?
        // Or rely on background sync to eventually invalidate.
        // For now, just queue it. The UI state 'note' already reflects the change.
      }
    } catch (error: any) {
      console.error("Failed to queue note update:", error);
      toast.error(`Failed to queue note update: ${error.message}`);
      setIsNoteSaved(false); // Revert optimistic save state on queueing error
    }
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
                  onClick={async (e) => { // Make async
                    e.stopPropagation();
                    if (!currentWord || !userId) {
                      toast.error("Cannot toggle star: Word data or user session missing.");
                      return;
                    }

                    // 1. Optimistic local update
                    const newStarStatus = !currentWord.isStarred;

                    try {
                      // Use Dexie's update method to modify only the isStarred field
                      await db.words.update(currentWord.id, { isStarred: newStarStatus });
                      console.log("Locally updated star status in IndexedDB.");

                      // Invalidate the query to refetch from local DB and update modal UI
                      await utils.vocab.getWordById.invalidate({ id: wordId });

                      // 2. Check online status and act
                      if (navigator.onLine) {
                        // Attempt online toggle
                        toggleStarMutation.mutate({ wordId: currentWord.id });
                      } else {
                        // Queue if offline
                        await queueMutation({
                          type: 'word/toggleStar', // Define a type for this action
                          payload: { wordId: currentWord.id }, // Only need ID for backend
                           userId
                         });
                         toast.info("Offline: Star toggle queued.");
                         // Invalidate after queueing too, to reflect local DB change
                         await utils.vocab.getWordById.invalidate({ id: wordId });
                       }
                     } catch (localError: any) {
                       console.error("Failed to update star status locally:", localError);
                      toast.error(`Local star update failed: ${localError.message}`);
                      // No easy UI revert here as we rely on query invalidation
                    }
                  }}
                  title={currentWord.isStarred ? 'Unstar word' : 'Star word'}
                  // Disable button only during the tRPC mutation call (online case)
                  disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === currentWord.id}
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
                {/* Check if this is a newly added word waiting for AI enrichment */}
                {isAwaitingEnrichment ? (
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-center text-muted-foreground animate-pulse">
                        AI is processing this word...
                      </p>
                      <Skeleton className="h-4 w-2/3 mx-auto" /> {/* Type */}
                      <Skeleton className="h-4 w-full" /> {/* Definition */}
                      <Skeleton className="h-4 w-5/6 mx-auto" /> {/* Example */}
                      <Skeleton className="h-4 w-2/3 mx-auto" /> {/* Translation */}
                    </div>
                ) : (
                  <>
                    <p><strong>Type:</strong> {currentWord.wordMaster?.wordType || 'N/A'}</p>
                    <p><strong>Definition:</strong> {currentWord.wordMaster?.definition || 'N/A'}</p>
                    <p><strong>Sample Sentence:</strong> {(currentWord.wordMaster?.sampleSentences as any)?.default || 'N/A'}</p>
                    <p><strong>Translation:</strong> {(currentWord.wordMaster?.translations as any)?.default || 'N/A'}</p>
                  </>
                )}
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
