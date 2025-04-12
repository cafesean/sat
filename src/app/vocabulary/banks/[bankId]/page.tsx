'use client'

import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ArrowLeft, ChevronsUpDown, Loader2, Plus, Save, SortAsc, SortDesc, Star, Trash2, X } from 'lucide-react'; // Added Star icon
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

// Define types
type WordBank = RouterOutputs['vocab']['getById'];
// Ensure WordListItem type includes isStarred and _count (inferred from backend)
type WordListItem = RouterOutputs['vocab']['listByBank'][number];
type WordSortKey = 'text' | 'createdAt' | 'interval';
type SortDirection = 'asc' | 'desc';

// Helper function to determine mastery level and badge variant
const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) {
    return { level: 'Beginner', variant: 'destructive' }; // Red
  } else if (interval <= 7) {
    return { level: 'Learning', variant: 'secondary' }; // Yellow/Orange-ish (default secondary)
  } else if (interval <= 30) {
    return { level: 'Consolidating', variant: 'outline' }; // Light Green (using outline for differentiation)
  } else {
    return { level: 'Mastered', variant: 'default' }; // Blue/Green (default primary)
  }
};

export default function WordBankDetailPage () {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const bankId = params.bankId as string

  // Fetch Word Bank Details
  const { data: wordBank, isLoading: isLoadingBank, error: bankError } = api.vocab.getById.useQuery(
    { id: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  )

  // Fetch Words in the Bank
  const { data: words, isLoading: isLoadingWords, error: wordsError } = api.vocab.listByBank.useQuery(
    { wordBankId: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  )

  // State for filtering/sorting words
  const [wordFilterText, setWordFilterText] = useState('');
  const [wordSortKey, setWordSortKey] = useState<WordSortKey>('createdAt');
  const [wordSortDirection, setWordSortDirection] = useState<SortDirection>('asc');
  const [showStarredOnly, setShowStarredOnly] = useState(false); // State for starred filter
  const [newWordsText, setNewWordsText] = useState(''); // State for the new words textarea
  const [editingWordId, setEditingWordId] = useState<string | null>(null); // Track which word is being edited
  const [editingWordText, setEditingWordText] = useState<string>(''); // Track the temporary edit value
  const [wordToDelete, setWordToDelete] = useState<WordListItem | null>(null); // State for delete confirmation

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Mutation for adding words
  const addWordsMutation = api.vocab.addBatch.useMutation({
    onSuccess: () => {
      toast.success('Words added successfully!');
      setNewWordsText(''); // Clear textarea
      // Invalidate queries to refetch data
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      utils.vocab.getById.invalidate({ id: bankId }); // To update word count if displayed
      utils.vocab.listWordBanks.invalidate(); // To update mastery/count on dashboard
    },
    onError: (error) => {
      toast.error(`Failed to add words: ${error.message}`);
    }
  });

  const handleAddWords = () => {
    if (!newWordsText.trim()) {
      toast.warning('Please enter words to add.');
      return;
    }
    // Pass the raw text directly, backend handles splitting
    addWordsMutation.mutate({
      wordBankId: bankId,
      wordsText: newWordsText
    });
  };

  // Mutation for deleting a word
  const deleteWordMutation = api.vocab.deleteWord.useMutation({
    onSuccess: (data) => {
      toast.success(`Word deleted successfully.`);
      setWordToDelete(null); // Close confirmation dialog
      // Invalidate queries to refetch data
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      utils.vocab.getById.invalidate({ id: bankId }); // To update word count if displayed
      utils.vocab.listWordBanks.invalidate(); // To update mastery/count on dashboard
    },
    onError: (error) => {
      toast.error(`Failed to delete word: ${error.message}`);
      setWordToDelete(null); // Close confirmation dialog
    }
  });

  // Mutation for toggling star status
  const toggleStarMutation = api.vocab.toggleStar.useMutation({
     onSuccess: (updatedWord) => {
       toast.success(`Word ${updatedWord.isStarred ? 'starred' : 'unstarred'}.`);
       // Optimistic update or invalidate cache
       utils.vocab.listByBank.invalidate({ wordBankId: bankId });
     },
     onError: (error) => {
       toast.error(`Failed to update star status: ${error.message}`);
     }
   });

  // Mutation for updating a word
  const updateWordMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      toast.success(`Word "${updatedWord.text}" updated.`);
      setEditingWordId(null); // Exit editing mode
      // Invalidate queries to refetch data
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      // No need to invalidate getById or listWordBanks as only word text changed
    },
    onError: (error) => {
      toast.error(`Failed to update word: ${error.message}`);
      // Optionally revert the text change or keep editing mode active
    }
  });

  const handleEditClick = (word: WordListItem) => {
    setEditingWordId(word.id);
    setEditingWordText(word.text);
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditingWordText('');
  };

  const handleSaveEdit = () => {
    if (!editingWordId || !editingWordText.trim()) return;
    if (editingWordText === words?.find(w => w.id === editingWordId)?.text) {
      // No change, just cancel edit
      handleCancelEdit();
      return;
    }
    updateWordMutation.mutate({
      wordId: editingWordId,
      text: editingWordText.trim(),
    });
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };


  // Client-side filtering and sorting for words
  const filteredAndSortedWords = useMemo(() => {
    if (!words) return [];
    // Ensure words have the isStarred property (handle potential type mismatch)
    let processedWords = words.map(w => ({ ...w, isStarred: w.isStarred ?? false })) as (WordListItem & { isStarred: boolean })[];


    // Filter by Starred Status
    if (showStarredOnly) {
      processedWords = processedWords.filter(word => word.isStarred);
    }

    // Filter by Text
    if (wordFilterText) {
      processedWords = processedWords.filter(word =>
        word.text.toLowerCase().includes(wordFilterText.toLowerCase()) ||
        word.definition?.toLowerCase().includes(wordFilterText.toLowerCase()) ||
        word.sampleSentence?.toLowerCase().includes(wordFilterText.toLowerCase())
      );
    }

    // Sort
    processedWords.sort((a, b) => {
      let compareA: string | number | Date = a[wordSortKey];
      let compareB: string | number | Date = b[wordSortKey];

      if (wordSortKey === 'createdAt') { // Handle dates (assuming nextReviewDate isn't needed for sorting now)
        compareA = new Date(compareA);
        compareB = new Date(compareB);
      }
      if (wordSortKey === 'text') { // Case-insensitive text sort
         compareA = String(compareA).toLowerCase();
         compareB = String(compareB).toLowerCase();
      }
      // interval is already a number

      let comparison = 0;
      if (compareA > compareB) comparison = 1;
      else if (compareA < compareB) comparison = -1;

      return wordSortDirection === 'desc' ? comparison * -1 : comparison;
    });

    return processedWords;
  }, [words, wordFilterText, wordSortKey, wordSortDirection, showStarredOnly]); // Add showStarredOnly dependency

  const toggleWordSortDirection = () => {
    setWordSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  // Loading state
  if (status === 'loading' || (isLoadingBank && !wordBank) || (isLoadingWords && !words)) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-1/4" /> {/* Back button */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            {/* Adjust skeleton for grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Auth check
  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to view word banks.</div>
  }

  // Error handling
  if (bankError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading word bank: {bankError.message}</div>
  }
  if (wordsError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading words: {wordsError.message}</div>
  }
  if (!wordBank) {
     return <div className="container mx-auto p-4 text-red-500">Word bank not found or access denied.</div>
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Button variant="outline" size="sm" onClick={() => router.push('/vocabulary')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Word Banks
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{wordBank.name}</CardTitle>
          {wordBank.description && <CardDescription>{wordBank.description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {/* Filter/Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="Filter words..."
              value={wordFilterText}
              onChange={(e) => setWordFilterText(e.target.value)}
              className="h-9 flex-grow"
            />
            <div className="flex gap-2">
              <Select value={wordSortKey} onValueChange={(value) => setWordSortKey(value as WordSortKey)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Word</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                  <SelectItem value="interval">Mastery</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={toggleWordSortDirection} className="h-9 w-9">
                {wordSortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
              {/* Starred Filter Toggle Button */}
              <Button
                variant={showStarredOnly ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                className="h-9 w-9"
                title={showStarredOnly ? "Show all words" : "Show starred words only"}
              >
                <Star className={`h-4 w-4 ${showStarredOnly ? 'text-yellow-500 fill-yellow-400' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Word List */}
          {filteredAndSortedWords && filteredAndSortedWords.length > 0
            ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAndSortedWords.map((word) => { // Use inferred type now
                const mastery = getMasteryInfo(word.interval);
                const isEditing = editingWordId === word.id;
                return (
                  <Collapsible key={word.id} asChild>
                    {/* Use a div instead of li if direct child needed for Collapsible */}
                    {/* Add relative positioning and padding-left */}
                    <div className="border rounded-md px-4 py-3 flex flex-col relative pl-6">
                      {/* Mastery Bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${
                        mastery.variant === 'destructive' ? 'bg-red-500' :
                        mastery.variant === 'secondary' ? 'bg-yellow-400' :
                        mastery.variant === 'outline' ? 'bg-green-400' :
                        'bg-blue-500' // default for Mastered
                      }`}></div>
                      <div className="flex items-center justify-between w-full gap-2"> {/* Added gap */}
                        {/* Word Text or Input */}
                        {isEditing ? (
                          <div className="flex-grow flex items-center gap-1">
                            <Input
                              value={editingWordText}
                              onChange={(e) => setEditingWordText(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleSaveEdit} // Save on blur
                              autoFocus
                              className="h-7 px-1.5 text-sm flex-grow" // Smaller height, padding, text
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
                              onClick={() => handleEditClick(word)} // Enable editing on click
                              title={`Edit "${word.text}"`}
                            >
                              <span className="font-medium truncate">{word.text}</span>
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          </CollapsibleTrigger>
                        )}

                        {/* Right side icons (only show when not editing) */}
                        {!isEditing && (
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Removed Mastery Badge */}
                            <WordHistoryDialog wordId={word.id} wordText={word.text} historyCount={word._count.practiceLogs} />
                            {/* Star Button */}
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
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent collapsible trigger
                                setWordToDelete(word);
                              }}
                              title={`Delete "${word.text}"`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CollapsibleContent className="pt-3 mt-2 border-t w-full">
                        <div className="space-y-1.5 text-xs">
                          {word.definition && <p><strong>Def:</strong> {word.definition}</p>}
                          {word.sampleSentence && <p><strong>Ex:</strong> <em>{word.sampleSentence}</em></p>}
                          {word.translation && <p><strong>Trans:</strong> {word.translation}</p>}
                          {!word.definition && !word.sampleSentence && !word.translation && (
                            <p className="text-muted-foreground italic">No details available.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </ul>
              )
            : (
            <p className="text-muted-foreground text-center py-6">
              {wordFilterText ? 'No words match your filter.' : 'No words added to this bank yet.'}
            </p>
              )}

          {/* Add New Words Section */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-medium mb-2">Add New Words</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Enter words separated by commas or new lines. Definitions and examples will be generated automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Textarea
                placeholder="Enter words here..."
                value={newWordsText}
                onChange={(e) => setNewWordsText(e.target.value)}
                className="min-h-[60px] flex-grow"
                disabled={addWordsMutation.isPending}
              />
              <Button
                onClick={handleAddWords}
                disabled={addWordsMutation.isPending || !newWordsText.trim()}
                className="sm:self-end" // Align button nicely on larger screens
              >
                {addWordsMutation.isPending ? 'Adding...' : <><Plus className="mr-2 h-4 w-4" /> Add Word(s)</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!wordToDelete} onOpenChange={(open) => !open && setWordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the word
              <span className="font-semibold"> "{wordToDelete?.text}"</span> and its practice history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWordMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (wordToDelete) {
                  deleteWordMutation.mutate({ wordId: wordToDelete.id });
                }
              }}
              disabled={deleteWordMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
