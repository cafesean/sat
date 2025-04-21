'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { api } from '@/utils/trpc';
import { ChevronsUpDown, Loader2, Save, Star, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { WordInteractionModal } from './WordInteractionModal';

const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) return { level: 'Beginner', variant: 'destructive' };
  if (interval <= 7) return { level: 'Learning', variant: 'secondary' };
  if (interval <= 30) return { level: 'Consolidating', variant: 'outline' };
  return { level: 'Mastered', variant: 'default' };
};

interface WordCardProps {
  word: WordListItem;
  bankId: string;
  viewMode: 'collapsible' | 'large-grid' | 'small-grid';
  onDeleteRequest?: (word: WordListItem) => void;
  onStarToggle?: () => void;
}

export function WordCard({ word, bankId, viewMode, onDeleteRequest, onStarToggle }: WordCardProps) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWordText, setEditingWordText] = useState<string>('');
  const utils = api.useUtils();

  const toggleStarMutation = api.vocab.toggleStar.useMutation({
    onSuccess: (updatedWord) => {
      if (viewMode !== 'small-grid') {
        toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
      }
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      onStarToggle?.();
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

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarMutation.mutate({ wordId: word.id });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteRequest?.(word);
  };

  const mastery = getMasteryInfo(word.interval);
  const isEditing = editingWordId === word.id;
  const cardBaseClass = "border rounded-lg border-neutral-200 bg-white h-full cursor-pointer hover:shadow-md transition-shadow group";

  const masteryColorMap = {
    destructive: 'bg-destructive',
    secondary: 'bg-yellow-400',
    outline: 'bg-green-500',
    default: 'bg-primary'
  };
  const masteryBarClass = `absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${masteryColorMap[mastery.variant]}`;

  if (viewMode === 'collapsible') {
    return (
      <Collapsible key={word.id} asChild>
        <div className={`${cardBaseClass} px-4 py-3 flex flex-col relative pl-6`}>
          <div className={masteryBarClass}></div>
          <div className="flex items-center justify-between w-full gap-2">
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
                  <span className="font-serif font-semibold text-neutral-900 truncate text-sm md:text-base flex-grow">
                    {word.wordMaster?.baseWord || word.text}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </CollapsibleTrigger>
            )}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${word.isStarred ? 'text-accent hover:text-accent/90' : 'text-muted-foreground hover:text-accent/90'}`}
                onClick={handleStarClick}
                title={word.isStarred ? 'Unstar word' : 'Star word'}
                disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
              >
                {toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
                }
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive/70 hover:text-destructive"
                onClick={handleDeleteClick}
                title="Delete word"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CollapsibleContent className="pt-3 mt-2 border-t border-neutral-200 w-full">
            {word.wordMaster ? (
              <div className="space-y-1.5 text-xs text-neutral-600">
                {word.wordMaster.wordType && <p><strong>Type:</strong> {word.wordMaster.wordType}</p>}
                {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
                {(word.wordMaster.sampleSentences as any)?.default && <p><strong>Ex:</strong> <em>{(word.wordMaster.sampleSentences as any).default}</em></p>}
                {(word.wordMaster.translations as any)?.default && <p><strong>Trans:</strong> {(word.wordMaster.translations as any).default}</p>}
                {!word.wordMaster.wordType && !word.wordMaster.definition && !(word.wordMaster.sampleSentences as any)?.default && !(word.wordMaster.translations as any)?.default && (
                  <p className="text-muted-foreground italic">No details available.</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-xs">Word details not available.</p>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  if (viewMode === 'large-grid') {
    return (
      <div className={`${cardBaseClass} flex flex-col relative`}>
        <div className={masteryBarClass}></div>
        <div className="flex items-center justify-between w-full gap-2 mb-2 px-4 pt-3">
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
              <span className="font-serif font-semibold text-neutral-900 truncate text-sm md:text-base flex-grow">
                {word.wordMaster?.baseWord || word.text}
              </span>
            </button>
          )}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
            <Button
              variant="ghost"
              size="icon"
              className={`h-6 w-6 ${word.isStarred ? 'text-accent hover:text-accent/90' : 'text-muted-foreground hover:text-accent/90'}`}
              onClick={handleStarClick}
              title={word.isStarred ? 'Unstar word' : 'Star word'}
              disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
            >
              {toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
              }
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive/70 hover:text-destructive"
              onClick={handleDeleteClick}
              title="Delete word"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <WordInteractionModal wordId={word.id} bankId={bankId}>
          <div className="space-y-1.5 text-xs px-4 pb-3 flex-grow cursor-pointer hover:bg-muted/50">
            {word.wordMaster ? (
              <div className="space-y-1.5 text-xs text-neutral-600">
                {word.wordMaster.wordType && <p><strong>Type:</strong> {word.wordMaster.wordType}</p>}
                {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
                {(word.wordMaster.sampleSentences as any)?.default && <p><strong>Ex:</strong> <em>{(word.wordMaster.sampleSentences as any).default}</em></p>}
                {(word.wordMaster.translations as any)?.default && <p><strong>Trans:</strong> {(word.wordMaster.translations as any).default}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-xs">Word details not available.</p>
            )}
          </div>
        </WordInteractionModal>
      </div>
    );
  }

  if (viewMode === 'small-grid') {
    return (
      <WordInteractionModal wordId={word.id} bankId={bankId}>
        <div className={`${cardBaseClass} group`}>
          {/* Top Section: Text and Star with contrasting background */}
          <div className="bg-primary text-primary-foreground p-2 rounded-t-lg flex flex-col gap-1">
            <span className="font-serif font-semibold truncate text-sm md:text-base">
              {word.wordMaster?.baseWord || word.text}
            </span>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 text-primary-foreground/90 hover:text-primary-foreground ${word.isStarred ? 'text-accent-foreground' : ''}`}
                onClick={handleStarClick}
                title={word.isStarred ? 'Unstar word' : 'Star word'}
                disabled={toggleStarMutation.isPending}
              >
                {toggleStarMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
                }
              </Button>
            </div>
          </div>

          {/* Bottom Section: White background with hidden icons on desktop hover */}
          <div className="hidden md:flex items-center justify-end gap-1 p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive/70 hover:text-destructive"
              onClick={handleDeleteClick}
              title="Delete word"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </WordInteractionModal>
    );
  }

  return null;
}