'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/utils/trpc';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

interface AddWordInputProps {
  bankId: string;
}

export function AddWordInput({ bankId }: AddWordInputProps) {
  const [inputText, setInputText] = useState('');
  const { toast } = useToast();
  const utils = api.useUtils();

  const addMutation = api.vocab.addBatch.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Added ${data.count} word(s) successfully. AI enrichment is in progress.`,
        duration: 5000,
      });
      setInputText(''); // Clear input field
      // Invalidate queries to refresh word list and bank count
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      utils.vocab.listWordBanks.invalidate();
      
      // Show a second toast after a delay to remind user about the processing
      setTimeout(() => {
        toast({
          title: 'AI Processing',
          description: `Your words are being enriched with definitions and examples. They'll update automatically when ready.`,
          duration: 5000,
        });
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add words: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleAddWords = () => {
    if (inputText.trim() === '') {
      toast({ title: 'Info', description: 'Please enter words to add.' });
      return;
    }
    addMutation.mutate({ wordBankId: bankId, wordsText: inputText.trim() });
  };

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder="Enter new words (comma or newline separated)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddWords()} // Add on Enter key press
          disabled={addMutation.isPending}
          className="flex-grow"
        />
        <Button type="button" onClick={handleAddWords} disabled={addMutation.isPending}>
          {addMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Words will be automatically enriched with AI-generated definitions and examples.
      </p>
    </div>
  );
}
