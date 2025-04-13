'use client'

import { ViewNotesDialog } from '@/components/features/vocab/ViewNotesDialog';
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
import { ArrowLeft, ChevronsUpDown, Loader2, NotebookText, Plus, Save, SortAsc, SortDesc, Star, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type JsonValue } from '@prisma/client/runtime/library';

// Define types
type WordBank = RouterOutputs['vocab']['getById'];

// Explicitly define WordListItem based on the select in listByBank query
type WordListItem = {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  isStarred: boolean;
  notes: string | null;
  wordBankId: string;
  wordMaster: {
    id: string;
    baseWord: string;
    wordType: string | null;
    definition: string | null;
    sampleSentences: JsonValue;
    translations: JsonValue;
    isDictionaryWord: boolean;
  };
  practiceCount: number;
  _count?: {
    practiceLogs: number;
  };
};

// Update sort keys: 'text' -> 'baseWord', 'createdAt' -> 'id'
type WordSortKey = 'baseWord' | 'interval' | 'id'; // Corrected sort keys
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
  // Correctly initialize state with the *corrected* WordSortKey type
  const [wordSortKey, setWordSortKey] = useState<WordSortKey>('id'); // 'id' is now a valid key
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

  // Mutation for updating a word (Note: Currently updates the temporary 'text' field)
  const updateWordMutation = api.vocab.updateWord.useMutation({
    onSuccess: (updatedWord) => {
      // Display the baseWord in the toast message if available
      const displayWord = updatedWord.wordMaster?.baseWord || updatedWord.text;
      toast.success(`Word "${displayWord}" updated.`);
      setEditingWordId(null); // Exit editing mode
      // Invalidate queries to refetch data
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
    },
    onError: (error) => {
      toast.error(`Failed to update word: ${error.message}`);
    }
  });

  const handleEditClick = (word: WordListItem) => {
    setEditingWordId(word.id);
    // Use baseWord for editing, fallback to text
    setEditingWordText(word.wordMaster?.baseWord || word.text || '');
  };

  const handleCancelEdit = () => {
    setEditingWordId(null);
    setEditingWordText('');
  };

  // TODO: Decide if editing should update WordMaster.baseWord or just Word.text
  // Currently, it updates Word.text via the updateWord mutation.
  // TODO: Decide if editing should update WordMaster.baseWord or just Word.text
  // Currently, it updates Word.text via the updateWord mutation.
  const handleSaveEdit = () => {
    if (!editingWordId || !editingWordText.trim()) return;
    const originalWord = words?.find(w => w.id === editingWordId);
    // Ensure originalWord exists before accessing properties
    const originalValue = originalWord?.wordMaster?.baseWord ?? originalWord?.text ?? '';
    // Compare with baseWord, fallback to text
    if (editingWordText === originalValue) {
      // No change, just cancel edit
      handleCancelEdit();
      return;
    }
    // For now, update the temporary text field.
    // If WordMaster needs update, a different mutation is required.
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

    // Filter by Text (check baseWord and definition)
    if (wordFilterText) {
      const filterLower = wordFilterText.toLowerCase();
      processedWords = processedWords.filter(word =>
        (word.wordMaster?.baseWord || word.text || '').toLowerCase().includes(filterLower) || // Check baseWord or fallback text
        (word.wordMaster?.definition || '').toLowerCase().includes(filterLower) // Check definition
        // Add other fields to filter if needed, e.g., sample sentence, translation
      );
    }

    // Sort
    processedWords.sort((a, b) => {
      let compareA: string | number | undefined;
      let compareB: string | number | undefined;

      // Use the corrected WordSortKey type here
      const key = wordSortKey; // No need to cast if type is correct

      switch (key) {
        case 'baseWord':
          compareA = (a.wordMaster?.baseWord || a.text || '').toLowerCase();
          compareB = (b.wordMaster?.baseWord || b.text || '').toLowerCase();
          break;
        case 'interval':
          compareA = a.interval;
          compareB = b.interval;
          break;
        case 'id': // Default sort (like date added)
        default:
          compareA = a.id;
          compareB = b.id;
          break;
      }

      // Handle potential undefined values if necessary
      compareA = compareA ?? '';
      compareB = compareB ?? '';

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{wordBank.name}</CardTitle>
            {wordBank.description && <CardDescription>{wordBank.description}</CardDescription>}
          </div>
          <div className="flex gap-2"> {/* Wrap buttons */}
            <ViewNotesDialog bankId={bankId}>
              <Button variant="secondary">
                <NotebookText className="mr-2 h-4 w-4" /> View Notes
              </Button>
            </ViewNotesDialog>
            <Button onClick={() => router.push(`/vocabulary/learn/${bankId}`)}>
              Learn Words
            </Button>
          </div>
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
              {/* Correct the Select component to use updated WordSortKey values */}
              <Select value={wordSortKey} onValueChange={(value) => setWordSortKey(value as WordSortKey)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {/* Use corrected values matching WordSortKey */}
                  <SelectItem value="baseWord">Word</SelectItem>
                  <SelectItem value="id">Date Added</SelectItem>
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
                              title={`Edit "${word.wordMaster?.baseWord || word.text}"`} // Use baseWord
                            >
                              {/* Display baseWord, fallback to text */}
                              <span className="font-medium truncate">{word.wordMaster?.baseWord || word.text}</span>
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </button>
                          </CollapsibleTrigger>
                        )}

                        {/* Right side icons (only show when not editing) */}
                        {!isEditing && (
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Pass baseWord and count safely */}
                            <WordHistoryDialog wordId={word.id} wordText={word.wordMaster?.baseWord || word.text} historyCount={word._count?.practiceLogs ?? 0} />
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
                              title={`Delete "${word.wordMaster?.baseWord || word.text}"`} // Use baseWord
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CollapsibleContent className="pt-3 mt-2 border-t w-full">
                        {/* Check if wordMaster exists before trying to display details */}
                        {word.wordMaster ? (
                          <div className="space-y-1.5 text-xs">
                            {/* Access details via wordMaster */}
                            {word.wordMaster.definition && <p><strong>Def:</strong> {word.wordMaster.definition}</p>}
                            {/* Assuming 'default' key for sample sentence */}
                            {(word.wordMaster.sampleSentences as any)?.default && <p><strong>Ex:</strong> <em>{(word.wordMaster.sampleSentences as any).default}</em></p>}
                            {/* Assuming 'default' key for translation */}
                            {(word.wordMaster.translations as any)?.default && <p><strong>Trans:</strong> {(word.wordMaster.translations as any).default}</p>}
                            {/* Check if any details exist in wordMaster */}
                            {!word.wordMaster.definition && !(word.wordMaster.sampleSentences as any)?.default && !(word.wordMaster.translations as any)?.default && (
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
              {/* Display baseWord, fallback to text */}
              <span className="font-semibold"> "{wordToDelete?.wordMaster?.baseWord || wordToDelete?.text}"</span> and its practice history.
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
