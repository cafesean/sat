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
import { queueMutation } from '@/lib/storage'; // Import queueMutation
// Remove useWords import as we'll use addBatch directly
// import { useWords } from '@/hooks/useWords';
import { api } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react'; // Import useSession
import { useState } from 'react';
import { toast } from 'sonner';

interface AddWordsModalProps {
  bankId: string;
  children: React.ReactNode; // Trigger element
  onWordsAdded?: () => void; // Optional callback after adding words
}

export function AddWordsModal({ bankId, children, onWordsAdded }: AddWordsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wordsText, setWordsText] = useState('');
  const utils = api.useUtils();
  const { data: session } = useSession(); // Get session
  const userId = session?.user?.id; // Get userId
  // Remove useWords hook call
  // const { add: addWord } = useWords(bankId);

  const addWordsMutation = api.vocab.addBatch.useMutation({
    onSuccess: () => {
      toast.success('Words added successfully!');
      setWordsText(''); // Clear textarea
      setIsOpen(false); // Close dialog
      // Invalidate relevant queries to refetch data
      utils.vocab.listWordBanks.invalidate(); // Update dashboard list
      utils.vocab.getById.invalidate({ id: bankId }); // Update specific bank details if needed elsewhere
      utils.vocab.listByBank.invalidate({ wordBankId: bankId }); // Update word list if viewing bank details
      onWordsAdded?.(); // Call optional callback
    },
    onError: (error) => {
      toast.error(`Failed to add words: ${error.message}`);
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

    const payload = { wordBankId: bankId, wordsText: wordsText.trim() };

    // Check online status
    if (navigator.onLine) {
      // Call tRPC mutation directly if online
      addWordsMutation.mutate(payload);
    } else {
      // Queue if offline
      try {
        await queueMutation({
          type: 'word/addBatch', // Use a new type for batch add
          payload: payload,
          userId
        });
        toast.info("Offline: Adding words queued.");
        // Close modal and clear text optimistically for offline queueing
        setWordsText('');
        setIsOpen(false);
        onWordsAdded?.(); // Call callback
      } catch (error: any) {
        console.error("Failed to queue word batch add:", error);
        toast.error(`Failed to queue adding words: ${error.message}`);
      }
    }
    // Note: Local DB update for words happens on the backend via addBatch
    // and will be synced back via the useWords hook's fetch/sync logic.
    // No need for the manual loop calling useWords.add here.
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
              disabled={addWordsMutation.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
             <Button variant="outline" disabled={addWordsMutation.isPending}>Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={addWordsMutation.isPending || !wordsText.trim()}
          >
            {addWordsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Add Words
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
