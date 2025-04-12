'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { api, type RouterOutputs } from '@/utils/trpc';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Infer type for a single word from the listByBank query output
type WordItem = RouterOutputs['vocab']['listByBank'][number];

interface WordListProps {
  initialWords: WordItem[];
  bankId: string; // Needed for query invalidation
}

export function WordList({ initialWords, bankId }: WordListProps) {
  const [words, setWords] = useState<WordItem[]>(initialWords);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const { toast } = useToast();
  const utils = api.useUtils();

  // --- Update Mutation ---
  const updateMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      // Update local state optimistically or after success
      setWords(currentWords =>
        currentWords.map(w => w.id === updatedWord.id ? updatedWord : w)
      );
      setEditingWordId(null); // Exit edit mode
      toast({ title: 'Success', description: 'Word updated.' });
      // Invalidate queries if needed (e.g., if counts change)
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => {
      toast({ title: 'Error', description: `Failed to update word: ${error.message}`, variant: 'destructive' });
      // Optionally revert optimistic update here
    }
  });

  // --- Delete Mutation ---
  const deleteMutation = api.vocab.deleteWord.useMutation({
     onSuccess: (data) => {
       // Remove word from local state optimistically or after success
       setWords(currentWords => currentWords.filter(w => w.id !== data.deletedWordId));
       toast({ title: 'Success', description: 'Word deleted.' });
       // Invalidate queries
       utils.vocab.listByBank.invalidate({ wordBankId: bankId });
       utils.vocab.listWordBanks.invalidate(); // Invalidate bank list to update count
     },
     onError: (error) => {
       toast({ title: 'Error', description: `Failed to delete word: ${error.message}`, variant: 'destructive' });
     }
   });

  // --- Handlers ---
  const handleEditClick = (word: WordItem) => {
    setEditingWordId(word.id);
    setEditValue(word.text);
  };

  const handleSaveEdit = (wordId: string) => {
    if (editValue.trim() === '') {
      toast({ title: 'Error', description: 'Word cannot be empty.', variant: 'destructive' });
      return;
    }
    updateMutation.mutate({ wordId, text: editValue.trim() });
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditValue('');
  };

  const handleDeleteConfirm = (wordId: string) => {
    deleteMutation.mutate({ wordId });
  };

  // --- Render Logic ---
  return (
    <div className="space-y-3">
      {words.map((word) => (
        <div key={word.id} className="flex items-center justify-between gap-2 p-3 border rounded-md bg-background hover:bg-muted/50 group">
          {editingWordId === word.id ? (
            // Edit Mode
            <div className="flex-grow flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSaveEdit(word.id)} // Save on blur
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(word.id)} // Save on Enter
                className="h-8 text-sm"
                autoFocus
                disabled={updateMutation.isPending}
              />
              {updateMutation.isPending && updateMutation.variables?.wordId === word.id && (
                 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {/* <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={updateMutation.isPending}>Cancel</Button> */}
            </div>
          ) : (
            // View Mode
            <span
              className="flex-grow cursor-pointer text-sm"
              onClick={() => handleEditClick(word)}
              title="Click to edit"
            >
              {word.text}
            </span>
          )}

          {/* Delete Button */}
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
                   This action cannot be undone. This will permanently delete the word "{word.text}".
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={() => handleDeleteConfirm(word.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                   Delete
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
        </div>
      ))}
    </div>
  );
}
