'use client'

import { type WordListItem } from '@/app/vocabulary/banks/[bankId]/page';
import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { db, queueMutation, Word } from '@/lib/storage';
import { api } from '@/utils/trpc';
import { Loader2, Save, Star, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { WordInteractionModal } from './WordInteractionModal';
import { useWordEnrichmentStore, WordEnrichmentStatus } from '@/store/wordEnrichmentStore'

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

  // Helper function to check if details are loaded
  const areDetailsLoaded = !!word.wordMaster && word.wordMaster.definition !== undefined;

  // Use the Zustand store for enrichment status
  const { checkIfWordIsEnriched, getStatus, markAsPending } = useWordEnrichmentStore();
  
  // Get the current enrichment status for this word
  const enrichmentStatus = getStatus(word.id);
  
  // If the word is new or missing details, mark it as pending
  useEffect(() => {
    // Only run this on first load
    if (!checkIfWordIsEnriched(word) && enrichmentStatus === WordEnrichmentStatus.INITIAL) {
      markAsPending(word.id);
      // No need to directly invalidate here - the poller will handle this
    }
  }, [word.id, word, checkIfWordIsEnriched, enrichmentStatus, markAsPending]);
  
  // Check if this is a newly added word waiting for AI enrichment
  const isAwaitingEnrichment = enrichmentStatus === WordEnrichmentStatus.PENDING;

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
            {isAwaitingEnrichment && (
              <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-semibold animate-pulse px-1.5 py-0.5 rounded">
                Processing...
              </span>
            )}
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
      <div className="border rounded-md flex flex-col relative h-full min-h-[120px]">
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
              onClick={() => handleEditClick(word)}
              title={`Edit "${word.wordMaster?.baseWord || word.text}"`}
            >
              <span className="font-medium truncate">
                {word.wordMaster?.baseWord || word.text}
                {isAwaitingEnrichment && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-semibold animate-pulse px-1.5 py-0.5 rounded">
                    Processing...
                  </span>
                )}
              </span>
            </button>
          )}
          {!isEditing && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <WordHistoryDialog 
                wordId={word.id} 
                wordText={word.wordMaster?.baseWord || word.text} 
                historyCount={(word._count?.practiceLogs ?? word.practiceCount ?? 0)} 
              />
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
          <div className="px-4 pb-3 pt-2 text-sm text-muted-foreground flex-grow cursor-pointer hover:bg-muted/10 rounded-b-md">
            {isAwaitingEnrichment ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ) : (
              <>
                {word.wordMaster?.wordType && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {word.wordMaster.wordType}
                  </p>
                )}
                {word.wordMaster?.definition && (
                  <p className="text-xs line-clamp-3 mb-1">
                    {word.wordMaster.definition}
                  </p>
                )}
              </>
            )}
          </div>
        </WordInteractionModal>
      </div>
    )
  }

  if (viewMode === 'list') {
    const isEditing = editingWordId === word.id;
    const mastery = (word as any).interval ?? 0; 
    return (
      <div className="border rounded-md flex items-center gap-4 p-2 pr-3 relative hover:bg-muted/50">
         {/* Mastery Bar */}
         <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
            mastery <= 2 ? 'bg-red-500'
            : mastery <= 7 ? 'bg-yellow-400'
            : mastery <= 30 ? 'bg-green-400'
            : 'bg-blue-500'
          }`} />
          
          {/* Word Text/Input (Left) */}
          <div className="flex-grow pl-3">
             {isEditing ? (
               <div className="flex items-center gap-1">
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
                 className="text-left w-full truncate"
                 onClick={() => handleEditClick(word)}
                 title={`Edit "${word.wordMaster?.baseWord || word.text}"`}
               >
                 <span className="font-medium">
                   {word.wordMaster?.baseWord || word.text}
                   {isAwaitingEnrichment && (
                     <span className="ml-2 text-xs bg-orange-100 text-orange-600 font-semibold animate-pulse px-1.5 py-0.5 rounded">
                       Processing...
                     </span>
                   )}
                 </span>
               </button>
             )}
          </div>

          {/* Details & Actions (Right) */}
          {!isEditing && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Definition/Skeleton */} 
              <div className="w-40 text-xs text-muted-foreground hidden md:block">
                 {isAwaitingEnrichment ? (
                   <Skeleton className="h-4 w-full" /> 
                 ) : (
                   <p className="truncate" title={word.wordMaster?.definition ?? undefined}>
                     {word.wordMaster?.definition || '-'}
                   </p>
                 )}
              </div>
              
              {/* History */} 
              <WordHistoryDialog 
                 wordId={word.id} 
                 wordText={word.wordMaster?.baseWord || word.text} 
                 historyCount={(word._count?.practiceLogs ?? word.practiceCount ?? 0)} 
               />

              {/* Star */}
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
               
               {/* Delete */} 
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
    )
  }

  // Default fallback or handle other view modes if necessary
  return <div>Unsupported view mode</div>;
}
