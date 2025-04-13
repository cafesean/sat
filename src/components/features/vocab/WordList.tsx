'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/utils/trpc';
import { BookOpen, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { WordDetailDialog } from './WordDetailDialog';

import type { WordListItem } from '@/schemas/vocab.schema';

interface WordListProps {
  initialWords: WordListItem[];
  bankId: string;
}

export function WordList({ initialWords, bankId }: WordListProps) {
  const [words, setWords] = useState(initialWords);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();
  const utils = api.useUtils();

  const updateMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      // Update local state, preserving the _count field
      setWords(currentWords =>
        currentWords.map(w =>
          w.id === updatedWord.id
            ? {
                ...w,
                ...updatedWord,
                wordMaster: updatedWord.wordMaster ? {
                  ...w.wordMaster,
                  ...updatedWord.wordMaster,
                  wordType: updatedWord.wordMaster.wordType as "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB" | "PRONOUN" | "PREPOSITION" | "CONJUNCTION" | "INTERJECTION" | "ARTICLE" | null,
                  sampleSentences: updatedWord.wordMaster.sampleSentences as Record<string, string> | null,
                  translations: updatedWord.wordMaster.translations as Record<string, string> | null
                } : w.wordMaster
              }
            : w
        )
      );
      setEditingWordId(null);
      toast({ title: 'Success', description: 'Word updated.' });
      // No need to invalidate listByBank if we update locally correctly
      // utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update word: ${error.message}`, variant: 'destructive' });
    }
  });

  const deleteMutation = api.vocab.deleteWord.useMutation({
    onSuccess: (data) => {
      setWords(words.filter(w => w.id !== data.deletedWordId));
      toast({ title: 'Success', description: 'Word deleted.' });
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to delete word: ${error.message}`, variant: 'destructive' });
    }
  });

  const handleEditClick = (word: WordListItem) => {
    setEditingWordId(word.id);
    setEditValue(word.text);
  };

  const handleSaveEdit = (wordId: string) => {
    if (!editValue.trim()) {
      toast({ title: 'Error', description: 'Word cannot be empty.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ wordId, text: editValue.trim() });
  };

  const handleDeleteConfirm = (wordId: string) => {
    deleteMutation.mutate({ wordId });
  };

  return (
    <div className="space-y-3">
      {words.map((word) => (
        <div key={word.id} className="flex items-center justify-between gap-2 p-3 border rounded-md bg-background hover:bg-muted/50 group">
          <div className="flex items-center gap-2 flex-grow">
            <WordDetailDialog word={word} />
            {editingWordId === word.id ? (
              <div className="flex-grow flex items-center gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSaveEdit(word.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(word.id)}
                  className="h-8 text-sm"
                  autoFocus
                  disabled={updateMutation.isPending}
                />
                {updateMutation.isPending && updateMutation.variables?.wordId === word.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ) : (
              <span
                className="flex-grow cursor-pointer text-sm"
                onClick={() => handleEditClick(word)}
                title="Click to edit"
              >
                {word.text}
              </span>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              title="Learn this word"
              onClick={() => {/* Will implement learn functionality */}}
            >
              <BookOpen className="h-4 w-4" />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deleteMutation.isPending && deleteMutation.variables?.wordId === word.id}
                  title="Delete word"
                >
                  {deleteMutation.isPending && deleteMutation.variables?.wordId === word.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the word "{word.wordMaster?.baseWord || 'Unknown word'}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm(word.id)} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
