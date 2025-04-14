'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page'; // Assuming type is exported
import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { api } from '@/utils/trpc';
import { ChevronsUpDown, Loader2, Save, Star, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

// Helper function (can be moved to utils if used elsewhere)
const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) return { level: 'Beginner', variant: 'destructive' };
  if (interval <= 7) return { level: 'Learning', variant: 'secondary' };
  if (interval <= 30) return { level: 'Consolidating', variant: 'outline' };
  return { level: 'Mastered', variant: 'default' };
};

interface WordCardCollapsibleProps {
  word: WordListItem;
  bankId: string;
  onDeleteRequest: (word: WordListItem) => void; // Callback to parent to initiate delete
}

export function WordCardCollapsible({ word, bankId, onDeleteRequest }: WordCardCollapsibleProps) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWordText, setEditingWordText] = useState<string>('');
  const utils = api.useUtils();

  // --- Mutations (moved from parent) ---
  const toggleStarMutation = api.vocab.toggleStar.useMutation({
     onSuccess: (updatedWord) => {
       toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
       utils.vocab.listByBank.invalidate({ wordBankId: bankId });
     },
     onError: (error) => {
       toast.error(`Failed to update star status: ${error.message}`);
     }
   });

  const updateWordMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      const displayWord = updatedWord.wordMaster?.baseWord || updatedWord.text;
      toast.success(`Word "${displayWord}" updated.`);
      setEditingWordId(null);
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => {
      toast.error(`Failed to update word: ${error.message}`);
    }
  });

  // --- Handlers (moved from parent) ---
  const handleEditClick = (wordToEdit: WordListItem) => {
    setEditingWordId(wordToEdit.id);
    setEditingWordText(wordToEdit.wordMaster?.baseWord || wordToEdit.text || '');
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditingWordText('');
  };

  const handleSaveEdit = () => {
    if (!editingWordId || !editingWordText.trim()) return;
    const originalValue = word.wordMaster?.baseWord ?? word.text ?? '';
    if (editingWordText === originalValue) {
      handleCancelEdit();
      return;
    }
    updateWordMutation.mutate({
      wordId: editingWordId,
      text: editingWordText.trim(),
    });
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleSaveEdit();
    else if (event.key === 'Escape') handleCancelEdit();
  };

  // --- Rendering Logic ---
  const mastery = getMasteryInfo(word.interval);
  const isEditing = editingWordId === word.id;

  return (
    <Collapsible key={word.id} asChild>
      <div className="border rounded-md px-4 py-3 flex flex-col relative pl-6">
        {/* Mastery Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
          mastery.variant === 'destructive' ? 'bg-red-500' :
          mastery.variant === 'secondary' ? 'bg-yellow-400' :
          mastery.variant === 'outline' ? 'bg-green-400' :
          'bg-blue-500' // default for Mastered
        }`}></div>
        <div className="flex items-center justify-between w-full gap-2">
          {/* Word Text or Input */}
          {isEditing ? (
            <div className="flex-grow flex items-center gap-1">
              <Input
                value={editingWordText}
                onChange={(e) => setEditingWordText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleSaveEdit}
                autoFocus
                className="h-7 px-1.5 text-sm flex-grow"
                disabled={updateWordMutation.isPending}
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveEdit} disabled={updateWordMutation.isPending} title="Save">
                {updateWordMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin"/> : <Save className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit} disabled={updateWordMutation.isPending} title="Cancel">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <CollapsibleTrigger asChild>
              <button
                className="flex items-center gap-2 flex-grow text-left mr-2 overflow-hidden"
                onClick={() => handleEditClick(word)}
                title={`Edit "${word.wordMaster?.baseWord || word.text}"`}
              >
                <span className="font-medium truncate">{word.wordMaster?.baseWord || word.text}</span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            </CollapsibleTrigger>
          )}

          {/* Right side icons (only show when not editing) */}
          {!isEditing && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStarMutation.mutate({ wordId: word.id });
                }}
                title={word.isStarred ? 'Unstar word' : 'Star word'}
                disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
              >
                {toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
                }
              </Button>
              {/* Delete Button - Calls parent handler */}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive/70 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsible trigger
                  onDeleteRequest(word); // Call parent to handle delete dialog
                }}
                title="Delete word"
              >
                 <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <CollapsibleContent className="pt-3 mt-2 border-t w-full">
          {word.wordMaster ? (
            <div className="space-y-1.5 text-xs">
              {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
              {(word.wordMaster.sampleSentences as any)?.default && <p><strong>Ex:</strong> <em>{(word.wordMaster.sampleSentences as any).default}</em></p>}
              {(word.wordMaster.translations as any)?.default && <p><strong>Trans:</strong> {(word.wordMaster.translations as any).default}</p>}
              {!word.wordMaster.definition && !(word.wordMaster.sampleSentences as any)?.default && !(word.wordMaster.translations as any)?.default && (
                <p className="text-muted-foreground italic">No details available.</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-xs">Word details not available.</p>
          )}
          {/* Note editing will be added here for the Large Grid view component */}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}