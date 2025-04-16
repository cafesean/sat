'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, queueMutation } from '@/lib/storage'; // Import db and queueMutation
// Remove Textarea import
import { api } from '@/utils/trpc';
import { Loader2, Save, Star, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react'; // Import useSession
import React, { useState } from 'react';
import { toast } from 'sonner';
import { WordInteractionModal } from './WordInteractionModal'; // Import modal

// Helper function (can be moved to utils)
const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) return { level: 'Beginner', variant: 'destructive' };
  if (interval <= 7) return { level: 'Learning', variant: 'secondary' };
  if (interval <= 30) return { level: 'Consolidating', variant: 'outline' };
  return { level: 'Mastered', variant: 'default' };
};

import { Word } from '@/lib/storage';

interface WordCardLargeGridProps {
  word: WordListItem;
  bankId: string;
  onDeleteRequest: (word: WordListItem) => void;
  updateWord: (word: Word) => Promise<void>;
}

export function WordCardLargeGrid({ word, bankId, onDeleteRequest, updateWord }: WordCardLargeGridProps) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWordText, setEditingWordText] = useState<string>('');
  // Remove note state, handled in modal
  // const [note, setNote] = useState('');
  // Remove note saved state
  // const [isNoteSaved, setIsNoteSaved] = useState(true);
  const utils = api.useUtils();
  const { data: session } = useSession(); // Get session
  const userId = session?.user?.id; // Get userId

  // Removed effect for note state

  // --- Mutations ---
  const toggleStarMutation = api.vocab.toggleStar.useMutation({
     onSuccess: (updatedWord) => {
       toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
       utils.vocab.listByBank.invalidate({ wordBankId: bankId });
     },
     onError: (error) => toast.error(`Failed to update star status: ${error.message}`)
   });

  const updateWordMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      const displayWord = updatedWord.wordMaster?.baseWord || updatedWord.text;
      toast.success(`Word "${displayWord}" updated.`);
      setEditingWordId(null);
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => toast.error(`Failed to update word: ${error.message}`)
  });

  // Remove save note mutation, handled in modal
  // const saveNoteMutation = ...

  // --- Handlers ---
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
    updateWordMutation.mutate({ wordId: editingWordId, text: editingWordText.trim() });
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleSaveEdit();
    else if (event.key === 'Escape') handleCancelEdit();
  };

  // Remove note handlers, handled in modal
  // const handleNoteChange = ...
  // const handleSaveNote = ...

  // --- Rendering Logic ---
  const mastery = getMasteryInfo(word.interval);
  const isEditing = editingWordId === word.id;

  return (
    // Wrap the main content div (excluding icons) with the modal trigger
    <div className="border rounded-md flex flex-col relative h-full"> {/* Remove padding here, apply below */}
      {/* Mastery Bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
        mastery.variant === 'destructive' ? 'bg-red-500' :
        mastery.variant === 'secondary' ? 'bg-yellow-400' :
        mastery.variant === 'outline' ? 'bg-green-400' :
        'bg-blue-500'
      }`}></div>

      {/* Top Section: Word/Input and Icons (Keep padding here) */}
      <div className="flex items-center justify-between w-full gap-2 mb-2 px-4 pt-3"> {/* Adjust padding/margin */}
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
           <button
             className="flex items-center gap-2 flex-grow text-left mr-2 overflow-hidden"
             onClick={() => handleEditClick(word)}
             title={`Edit "${word.wordMaster?.baseWord || word.text}"`}
           >
             <span className="font-medium truncate">{word.wordMaster?.baseWord || word.text}</span>
             {/* Maybe add an edit icon here? */}
           </button>
        )}

        {!isEditing && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
            <Button
              variant="ghost" size="icon"
              className={`h-6 w-6 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
              onClick={async (e) => {
                e.stopPropagation();
                if (!userId) {
                  toast.error("Cannot toggle star: User not logged in.");
                  return;
                }
                const newStarStatus = !word.isStarred;
                try {
                  // 1. Optimistic local DB update
                  await db.words.update(word.id, { isStarred: newStarStatus });
                  // 2. Optimistic React state update
                  await updateWord({
                    ...word,
                    isStarred: newStarStatus,
                    mastery: (word as any).mastery ?? 0,
                    nextDueAtReviewCount: (word as any).nextDueAtReviewCount ?? 0,
                    timesSeen: (word as any).timesSeen ?? 0,
                    successRate: (word as any).successRate ?? 0,
                    wordMasterId: (word as any).wordMasterId ?? (word.wordMaster?.id ?? ''),
                  });
                  console.log("Locally updated star status in IndexedDB and React state (Large Grid).");

                  // 3. Invalidate list query to update UI
                  await utils.vocab.listByBank.invalidate({ wordBankId: bankId });

                  // 4. Check online status and act
                  if (navigator.onLine) {
                    toggleStarMutation.mutate({ wordId: word.id });
                  } else {
                    await queueMutation({
                      type: 'word/toggleStar',
                      payload: { wordId: word.id },
                      userId
                    });
                    toast.info("Offline: Star toggle queued.");
                  }
                } catch (localError: any) {
                  console.error("Failed to update star status locally (Large Grid):", localError);
                  toast.error(`Local star update failed: ${localError.message}`);
                  // Attempt to invalidate again to potentially revert UI if cache holds old state
                  await utils.vocab.listByBank.invalidate({ wordBankId: bankId });
                }
              }}
              title={word.isStarred ? 'Unstar word' : 'Star word'}
              // Disable only during the online mutation call
              disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
            >
              {toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id
                ? <Loader2 className="h-3 w-3 animate-spin" /> // Show loader only for online mutation
                : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
              }
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-destructive/70 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDeleteRequest(word); }}
              title="Delete word"
            >
               <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Middle Section: Word Details (Wrapped in Modal Trigger) */}
      <WordInteractionModal wordId={word.id} bankId={bankId}>
        {/* This div acts as the trigger */}
        <div className="space-y-1.5 text-xs px-4 pb-3 flex-grow cursor-pointer hover:bg-muted/50">
          {word.wordMaster ? (
            <>
              {/* Keep Word Type */}
              {word.wordMaster.wordType && <p><strong>Type:</strong> {word.wordMaster.wordType}</p>}
              {/* Keep Definition */}
              {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
              {/* Show placeholder if no details */}
              {!word.wordMaster.wordType && !word.wordMaster.definition && (
                 <p className="text-muted-foreground italic">No details available.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground italic">Word details not available.</p>
          )}
        </div>
      </WordInteractionModal>
      {/* Remove Bottom Section (Notes) */}
    </div>
  );
}
