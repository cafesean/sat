'use client'

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queueMutation, Word } from '@/lib/storage'; // Import Word type
import { api } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react'; // Import useSession
import { useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid'; // Import UUID for generating IDs

interface AddWordsModalProps {
  bankId: string;
  children: React.ReactNode; // Trigger element
  onWordsAdded?: () => void; // Optional callback after adding words
  addBatch: (words: Word[]) => Promise<void>; // Add addBatch to props
}

export function AddWordsModal({ bankId, children, onWordsAdded, addBatch }: AddWordsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wordsText, setWordsText] = useState('');
  const utils = api.useUtils();
  const { data: session } = useSession(); // Get session
  const userId = session?.user?.id; // Get userId

  const addWordsMutation = api.vocab.addBatch.useMutation({
    onSuccess: () => {
      toast.success('Words added successfully!');
      setWordsText('');
      setIsOpen(false);
      // Invalidate queries to ensure consistent data across components
      utils.vocab.listWordBanks.invalidate();
      utils.vocab.getById.invalidate({ id: bankId });
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      onWordsAdded?.();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(`Failed to add words: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (!wordsText.trim()) {
      toast.warning('Please enter words to add.');
      return;
    }
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }

    setIsSubmitting(true);
    
    const payload = { wordBankId: bankId, wordsText: wordsText.trim() };

    // Parse words into proper Word objects for local storage
    const wordEntries = wordsText
      .split(/[\n,]+/)
      .map(text => text.trim())
      .filter(text => text.length > 0)
      .map(text => {
        // Create a Word object with a locally generated UUID
        const id = uuidv4();
        return {
          id,
          text,
          wordBankId: bankId,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          isStarred: false,
          notes: null,
          mastery: 0,
          nextDueAtReviewCount: 0,
          timesSeen: 0,
          successRate: 0,
          wordMasterId: null,
          wordMaster: null,
          practiceCount: 0,
        } as Word;
      });

    try {
      // First, optimistically add words to local state and IndexedDB via the prop
      if (wordEntries.length > 0) {
        console.log(`AddWordsModal: Calling addBatch prop with ${wordEntries.length} words`);
        await addBatch(wordEntries);
      }

      // Close the modal immediately after local update for better UX
      setWordsText('');
      setIsOpen(false);
      
      // Then handle server-side update
      if (navigator.onLine) {
        addWordsMutation.mutate(payload);
      } else {
        try {
          await queueMutation({
            type: 'word/addBatch',
            payload: payload,
            userId
          });
          toast.info("Offline: Adding words queued for sync when online.");
          onWordsAdded?.();
          setIsSubmitting(false);
        } catch (error: any) {
          console.error("Failed to queue word batch add:", error);
          toast.error(`Failed to queue adding words: ${error.message}`);
          setIsSubmitting(false);
        }
      }
    } catch (error: any) {
      console.error("Error in add words flow:", error);
      toast.error(`Failed to add words: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  // Reset text when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setWordsText('');
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Words</DialogTitle>
          <DialogDescription>
            Enter words separated by commas or new lines.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="words">Words</Label>
            <Textarea
              id="words"
              placeholder="e.g., apple, banana, cherry&#10;or&#10;dog&#10;cat&#10;mouse"
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              rows={5}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !wordsText.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add Words
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
