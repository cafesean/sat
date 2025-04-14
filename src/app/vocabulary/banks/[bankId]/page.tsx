'use client'

import { AddWordsModal } from '@/components/features/vocab/AddWordsModal'; // Import the modal
import { ViewNotesDialog } from '@/components/features/vocab/ViewNotesDialog';
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
// Remove Collapsible imports, no longer used directly here
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@/components/ui/collapsible";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import useLocalStorage from '@/hooks/useLocalStorage'; // Import useLocalStorage
import { api, type RouterOutputs } from '@/utils/trpc';
// Import the new view components
import { WordCardLargeGrid } from '@/components/features/vocab/WordCardLargeGrid';
import { WordCardSmallGrid } from '@/components/features/vocab/WordCardSmallGrid';
import { WordListItemView } from '@/components/features/vocab/WordListItemView';
import { ArrowLeft, Grid, List, Loader2, NotebookText, Plus, SortAsc, SortDesc, Star, View } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { type JsonValue } from '@prisma/client/runtime/library';

// Define types
type WordBank = RouterOutputs['vocab']['getById'] & {
  _count?: {
    notes: number;
    words?: number; // Add words count
  };
};

// Explicitly define WordListItem based on the select in listByBank query
export type WordListItem = {
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
  // const [newWordsText, setNewWordsText] = useState(''); // Removed state for old add words UI
  // Remove state related to inline editing, now handled in WordCard components
  // const [editingWordId, setEditingWordId] = useState<string | null>(null);
  // const [editingWordText, setEditingWordText] = useState<string>('');
  const [wordToDelete, setWordToDelete] = useState<WordListItem | null>(null); // State for delete confirmation
  const [viewMode, setViewMode] = useLocalStorage<'large-grid' | 'small-grid' | 'list'>('wordBankDetailViewMode', 'large-grid'); // Add view mode state

  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Removed mutation for old add words UI
  // Removed handler for old add words UI
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

  // Remove mutations and handlers related to inline editing, now handled in WordCard components
  // const toggleStarMutation = ...
  // const updateWordMutation = ...
  // const handleEditClick = ...
  // const handleCancelEdit = ...
  // const handleSaveEdit = ...
  // const handleEditKeyDown = ...

  // Handler for delete request from child components
  const handleDeleteRequest = (word: WordListItem) => {
    setWordToDelete(word);
  };


  // Client-side filtering and sorting for words
  const filteredAndSortedWords = useMemo(() => {
    if (!words) return [];
    // Ensure words have the isStarred property (handle potential type mismatch)
    let processedWords = words.map((w: WordListItem) => ({ ...w, isStarred: w.isStarred ?? false })) as (WordListItem & { isStarred: boolean })[];


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
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.push('/vocabulary')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Word Banks
        </Button>
        <AddWordsModal bankId={bankId}>
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Words
          </Button>
        </AddWordsModal>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              {wordBank.name}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => router.push(`/vocabulary/edit/${bankId}`)}
                title="Edit word bank"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Button>
            </CardTitle>
            {wordBank.description && <CardDescription>{wordBank.description}</CardDescription>}
          </div>
          <div className="flex gap-2"> {/* Wrap buttons */}
            <ViewNotesDialog bankId={bankId}>
              <Button variant="secondary" className="relative">
                <NotebookText className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline">View Notes</span>
                {wordBank.noteCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                    {wordBank.noteCount}
                  </span>
                )}
              </Button>
            </ViewNotesDialog>
            {wordBank?._count?.words === 0 ? (
              <Button variant="secondary" onClick={() => router.push(`/vocabulary/edit/${bankId}`)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Words
              </Button>
            ) : (
              <Button onClick={() => router.push(`/vocabulary/learn/${bankId}`)}>
                Practice
              </Button>
            )}
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
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center gap-1 rounded-md bg-muted p-1 ml-2">
               <Button
                 variant={viewMode === 'large-grid' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('large-grid')} className="h-7 px-2" aria-label="Large grid view">
                 <View className="h-4 w-4" /> {/* Using View for large grid */}
               </Button>
               <Button
                 variant={viewMode === 'small-grid' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('small-grid')} className="h-7 px-2" aria-label="Small grid view">
                 <Grid className="h-4 w-4" />
               </Button>
               <Button
                 variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('list')} className="h-7 px-2" aria-label="List view">
                 <List className="h-4 w-4" />
               </Button>
             </div>
          </div>

          {/* Word List - Conditional Rendering based on viewMode */}
          {filteredAndSortedWords && filteredAndSortedWords.length > 0 ? (
            <>
              {/* Large Grid View */}
              {viewMode === 'large-grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedWords.map((word) => (
                    <WordCardLargeGrid
                      key={word.id}
                      word={word}
                      bankId={bankId}
                      onDeleteRequest={handleDeleteRequest} // Pass delete handler
                    />
                  ))}
                </div>
              )}

              {/* Small Grid View */}
              {viewMode === 'small-grid' && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                   {filteredAndSortedWords.map((word) => (
                     <WordCardSmallGrid
                       key={word.id}
                       word={word}
                       bankId={bankId}
                     />
                   ))}
                 </div>
               )}

              {/* List View */}
              {viewMode === 'list' && (
                 <div className="space-y-1 border rounded-md">
                   {filteredAndSortedWords.map((word) => (
                     <WordListItemView
                       key={word.id}
                       word={word}
                       bankId={bankId}
                     />
                   ))}
                 </div>
               )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              {wordFilterText ? 'No words match your filter.' : 'No words added to this bank yet.'}
            </p>
          )}
          {/* End Conditional Rendering */}

          {/* Old Add New Words Section Removed */}
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
