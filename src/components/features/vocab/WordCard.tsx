'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, queueMutation, Word } from '@/lib/storage';
import { api } from '@/utils/trpc';
import { Loader2, Save, Star, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { WordInteractionModal } from './WordInteractionModal';

type ViewMode = 'large-grid' | 'small-grid' | 'list'

interface WordCardProps {
  word: WordListItem
  bankId: string
  onDeleteRequest: (word: WordListItem) => void
  updateWord: (word: Word) => Promise<void>
  viewMode: ViewMode
}

export function WordCard({ word, bankId, onDeleteRequest, updateWord, viewMode }: WordCardProps) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [editingWordText, setEditingWordText] = useState<string>('')
  const utils = api.useUtils()
  const { data: session } = useSession()
  const userId = session?.user?.id

  const toggleStarMutation = api.vocab.toggleStar.useMutation({
    onSuccess: (updatedWord) => {
      toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`)
      utils.vocab.listByBank.invalidate({ wordBankId: bankId })
    },
    onError: (error) => toast.error(`Failed to update star status: ${error.message}`)
  })

  const updateWordMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      const displayWord = updatedWord.wordMaster?.baseWord || updatedWord.text
      toast.success(`Word "${displayWord}" updated.`)
      setEditingWordId(null)
      utils.vocab.listByBank.invalidate({ wordBankId: bankId })
    },
    onError: (error) => toast.error(`Failed to update word: ${error.message}`)
  })

  const handleEditClick = (wordToEdit: WordListItem) => {
    setEditingWordId(wordToEdit.id)
    setEditingWordText(wordToEdit.wordMaster?.baseWord || wordToEdit.text || '')
  }

  const handleCancelEdit = () => {
    setEditingWordId(null)
    setEditingWordText('')
  }

  const handleSaveEdit = () => {
    if (!editingWordId || !editingWordText.trim()) return
    const originalValue = word.wordMaster?.baseWord ?? word.text ?? ''
    if (editingWordText === originalValue) {
      handleCancelEdit()
      return
    }
    updateWordMutation.mutate({ wordId: editingWordId, text: editingWordText.trim() })
  }

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') handleSaveEdit()
    else if (event.key === 'Escape') handleCancelEdit()
  }

  // Helper for Word type conversion
  const toWord = (w: WordListItem, isStarred: boolean): Word => ({
    ...w,
    isStarred,
    mastery: (w as any).mastery ?? 0,
    nextDueAtReviewCount: (w as any).nextDueAtReviewCount ?? 0,
    timesSeen: (w as any).timesSeen ?? 0,
    successRate: (w as any).successRate ?? 0,
    wordMasterId: (w as any).wordMasterId ?? (w.wordMaster?.id ?? ''),
  })

  // --- UI by viewMode ---
  if (viewMode === 'small-grid') {
    // Minimal, horizontal, star only, modal on click, no delete/edit
    const mastery = (word as any).interval ?? 0
    return (
      <WordInteractionModal wordId={word.id} bankId={bankId}>
        <div className="border rounded-md px-3 py-2 flex items-center justify-between relative cursor-pointer hover:bg-muted/50 h-full">
          {/* Mastery Bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
            mastery <= 2 ? 'bg-red-500'
            : mastery <= 7 ? 'bg-yellow-400'
            : mastery <= 30 ? 'bg-green-400'
            : 'bg-blue-500'
          }`} />
          {/* Word Text */}
          <span className="font-medium truncate pl-3 flex-grow text-sm">
            {word.wordMaster?.baseWord || word.text}
          </span>
          {/* Star Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 flex-shrink-0 ml-1 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!userId) {
                toast.error("Cannot toggle star: User not logged in.")
                return
              }
              const newStarStatus = !word.isStarred
              try {
                await db.words.update(word.id, { isStarred: newStarStatus })
                await updateWord(toWord(word, newStarStatus))
                await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
                if (navigator.onLine) {
                  toggleStarMutation.mutate({ wordId: word.id })
                } else {
                  await queueMutation({
                    type: 'word/toggleStar',
                    payload: { wordId: word.id },
                    userId
                  })
                  toast.info("Offline: Star toggle queued.")
                }
              } catch (localError: any) {
                toast.error(`Local star update failed: ${localError.message}`)
                await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
              }
            }}
            title={word.isStarred ? 'Unstar word' : 'Star word'}
            disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
          >
            {toggleStarMutation.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
            }
          </Button>
        </div>
      </WordInteractionModal>
    )
  }

  if (viewMode === 'large-grid') {
    // Vertical, inline edit, star, delete, modal for details, mastery bar
    const mastery = (word as any).interval ?? 0
    const isEditing = editingWordId === word.id
    return (
      <div className="border rounded-md flex flex-col relative h-full">
        {/* Mastery Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
          mastery <= 2 ? 'bg-red-500'
          : mastery <= 7 ? 'bg-yellow-400'
          : mastery <= 30 ? 'bg-green-400'
          : 'bg-blue-500'
        }`} />
        {/* Top Section: Word/Input and Icons */}
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
              onClick={() => setEditingWordId(word.id)}
              title={`Edit "${word.wordMaster?.baseWord || word.text}"`}
            >
              <span className="font-medium truncate">{word.wordMaster?.baseWord || word.text}</span>
            </button>
          )}
          {!isEditing && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!userId) {
                    toast.error("Cannot toggle star: User not logged in.")
                    return
                  }
                  const newStarStatus = !word.isStarred
                  try {
                    await db.words.update(word.id, { isStarred: newStarStatus })
                    await updateWord(toWord(word, newStarStatus))
                    await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
                    if (navigator.onLine) {
                      toggleStarMutation.mutate({ wordId: word.id })
                    } else {
                      await queueMutation({
                        type: 'word/toggleStar',
                        payload: { wordId: word.id },
                        userId
                      })
                      toast.info("Offline: Star toggle queued.")
                    }
                  } catch (localError: any) {
                    toast.error(`Local star update failed: ${localError.message}`)
                    await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
                  }
                }}
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
                onClick={(e) => { e.stopPropagation(); onDeleteRequest(word); }}
                title="Delete word"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        {/* Details/Modal Section */}
        <WordInteractionModal wordId={word.id} bankId={bankId}>
          <div className="space-y-1.5 text-xs px-4 pb-3 flex-grow cursor-pointer hover:bg-muted/50">
            {word.wordMaster ? (
              <>
                {word.wordMaster.wordType && <p><strong>Type:</strong> {word.wordMaster.wordType}</p>}
                {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
                {!word.wordMaster.wordType && !word.wordMaster.definition && (
                  <p className="text-muted-foreground italic">No details available.</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic">Word details not available.</p>
            )}
          </div>
        </WordInteractionModal>
      </div>
    )
  }

  // Default/list: mimic small-grid for now
  return (
    <WordInteractionModal wordId={word.id} bankId={bankId}>
      <div className="border rounded-md px-3 py-2 flex items-center justify-between relative cursor-pointer hover:bg-muted/50 h-full">
        {/* Mastery Bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
          (word as any).interval <= 2 ? 'bg-red-500'
          : (word as any).interval <= 7 ? 'bg-yellow-400'
          : (word as any).interval <= 30 ? 'bg-green-400'
          : 'bg-blue-500'
        }`} />
        {/* Word Text */}
        <span className="font-medium truncate pl-3 flex-grow text-sm">
          {word.wordMaster?.baseWord || word.text}
        </span>
        {/* Star Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 flex-shrink-0 ml-1 ${word.isStarred ? 'text-yellow-400 hover:text-yellow-500' : 'text-muted-foreground hover:text-yellow-400'}`}
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!userId) {
              toast.error("Cannot toggle star: User not logged in.")
              return
            }
            const newStarStatus = !word.isStarred
            try {
              await db.words.update(word.id, { isStarred: newStarStatus })
              await updateWord(toWord(word, newStarStatus))
              await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
              if (navigator.onLine) {
                toggleStarMutation.mutate({ wordId: word.id })
              } else {
                await queueMutation({
                  type: 'word/toggleStar',
                  payload: { wordId: word.id },
                  userId
                })
                toast.info("Offline: Star toggle queued.")
              }
            } catch (localError: any) {
              toast.error(`Local star update failed: ${localError.message}`)
              await utils.vocab.listByBank.invalidate({ wordBankId: bankId })
            }
          }}
          title={word.isStarred ? 'Unstar word' : 'Star word'}
          disabled={toggleStarMutation.isPending && toggleStarMutation.variables?.wordId === word.id}
        >
          {toggleStarMutation.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Star className={`h-3 w-3 ${word.isStarred ? 'fill-current' : ''}`} />
          }
        </Button>
      </div>
    </WordInteractionModal>
  )
}
