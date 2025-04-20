'use client'

import type { WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/utils/trpc';
import { Loader2, Save, Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface WordInteractionModalProps {
  wordId: string;
  bankId: string;
  children: React.ReactNode;
  onModalClose?: () => void;
}

export function WordInteractionModal({
  wordId,
  bankId,
  children,
  onModalClose,
}: WordInteractionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(true);

  const utils = api.useContext();

  const {
    data: currentWord,
    isLoading: isLoadingWord,
    error: wordError,
  } = api.vocab.getWordById.useQuery(
    { id: wordId },
    {
      enabled: isOpen,
      onSuccess: (word: WordListItem) => {
        setNote(word?.notes || '');
        setIsNoteSaved(true);
      },
    }
  );

  const saveNoteMutation = api.vocab.updateWordNotes.useMutation({
    onSuccess: () => {
      toast.success('Note saved.');
      setIsNoteSaved(true);
      utils.vocab.getWordById.invalidate({ id: wordId });
    },
    onError: (error) => {
      toast.error(`Failed to save note: ${error.message}`);
    },
  });

  const toggleStarMutation = api.vocab.toggleStar.useMutation({
    onSuccess: (updatedWord) => {
      toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      utils.vocab.getWordById.invalidate({ id: wordId });
      utils.vocab.listWordBanks.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update star status: ${error.message}`);
    },
  });

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
      onModalClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>
              {isLoadingWord
                ? 'Loading...'
                : currentWord?.wordMaster?.baseWord || currentWord?.text || 'Word Details'}
            </DialogTitle>
            {currentWord && !isLoadingWord && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  currentWord.isStarred
                    ? 'text-yellow-400 hover:text-yellow-500'
                    : 'text-muted-foreground hover:text-yellow-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStarMutation.mutate({ wordId: currentWord.id });
                }}
                title={currentWord.isStarred ? 'Unstar word' : 'Star word'}
                disabled={toggleStarMutation.isPending}
              >
                {toggleStarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Star className={`h-4 w-4 ${currentWord.isStarred ? 'fill-current' : ''}`} />
                )}
              </Button>
            )}
          </div>
        </DialogHeader>

        {wordError ? (
          <div className="p-4 text-center text-red-600">
            {wordError.data?.code === 'NOT_FOUND' || wordError.data?.code === 'FORBIDDEN' ? (
              <p>Word not found or access denied.</p>
            ) : (
              <p>Error loading word details: {wordError.message}</p>
            )}
          </div>
        ) : isLoadingWord ? (
          <div className="p-4 text-center">Loading word details...</div>
        ) : currentWord ? (
          <>
            {children}
          </>
        ) : null}

        <DialogFooter>
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={note}
              onChange={handleNoteChange}
              placeholder="Add your notes here..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNote(currentWord?.notes || '');
                  setIsNoteSaved(true);
                }}
                disabled={isNoteSaved}
              >
                Reset
              </Button>
              <Button 
                variant="default" 
                onClick={handleSaveNote} 
                disabled={isNoteSaved || saveNoteMutation.isPending}
              >
                {saveNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}