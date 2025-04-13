'use client'

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { api, type RouterOutputs } from '@/utils/trpc';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

type WordItem = RouterOutputs['vocab']['listByBank'][number];
type HintData = RouterOutputs['vocab']['getWordHint'];

interface WordDetailDialogProps {
  word: WordItem;
}

export function WordDetailDialog({ word }: WordDetailDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Query to fetch hint data when the dialog opens
  const hintQuery = api.vocab.getWordHint.useQuery(
    { wordId: word.id },
    {
      enabled: isOpen, // Only fetch when the dialog is open
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      // TanStack Query v5 uses throwOnError or handles errors in the component
      // We'll handle the error state directly in the render logic below
    }
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Make the word text itself the trigger */}
        <Button variant="link" className="p-0 h-auto text-sm font-medium text-left flex-grow justify-start">
          {word.text}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{word.text}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {hintQuery.isLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading hint...</span>
            </div>
          )}
          {hintQuery.isError && (
            <p className="text-sm text-destructive">Error loading hint: {hintQuery.error.message}</p>
          )}
          {hintQuery.isSuccess && hintQuery.data && (
            <div className="space-y-2 text-sm">
              <p><strong>Type:</strong> {hintQuery.data.wordType || 'N/A'}</p>
              <p><strong>Definition:</strong> {hintQuery.data.definition || 'N/A'}</p>
              <p><strong>Sample Sentence:</strong> {hintQuery.data.sampleSentence || 'N/A'}</p>
              <p><strong>Translation:</strong> {hintQuery.data.translation || 'N/A'}</p>
            </div>
          )}
          {hintQuery.isSuccess && !hintQuery.data && (
             <p className="text-sm text-muted-foreground">No hint details found for this word.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
