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
import { api } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
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

  const handleSubmit = () => {
    if (!wordsText.trim()) {
      toast.warning('Please enter words to add.');
      return;
    }
    addWordsMutation.mutate({
      wordBankId: bankId,
      wordsText: wordsText.trim(),
    });
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