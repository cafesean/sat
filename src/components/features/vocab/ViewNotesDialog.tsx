'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api, type RouterOutputs } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

type WordItem = RouterOutputs['vocab']['listByBank'][number];

interface ViewNotesDialogProps {
  bankId: string;
  children: React.ReactNode; // Trigger element
}

export function ViewNotesDialog({ bankId, children }: ViewNotesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch words, assuming listByBank now correctly includes 'notes'
  const { data: wordsWithNotes, isLoading, error } = api.vocab.listByBank.useQuery(
    { wordBankId: bankId },
    {
      enabled: isOpen, // Only fetch when dialog is open
      staleTime: 1 * 60 * 1000, // Cache for 1 minute
    }
  );

  // Filter words that actually have notes
  const wordsHavingNotes = wordsWithNotes?.filter(word => word.notes && word.notes.trim() !== '');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consolidated Notes</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading notes...</span>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive text-center">Error loading notes: {error.message}</p>
          )}
          {!isLoading && !error && (!wordsHavingNotes || wordsHavingNotes.length === 0) && (
            <p className="text-sm text-muted-foreground text-center">No notes found for words in this bank.</p>
          )}
          {!isLoading && !error && wordsHavingNotes && wordsHavingNotes.length > 0 && (
            <ul className="space-y-3">
              {wordsHavingNotes.map((word) => (
                <li key={word.id} className="border-b pb-3 last:border-b-0">
                  <p className="font-semibold">{word.text}</p>
                  {/* Ensure notes are displayed correctly, handling potential null/undefined */}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{word.notes ?? ''}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
