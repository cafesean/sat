'use client'

import { AddWordsModal } from '@/components/features/vocab/AddWordsModal';
import { ViewNotesDialog } from '@/components/features/vocab/ViewNotesDialog';
import { WordCardLargeGrid } from '@/components/features/vocab/WordCardLargeGrid';
import { WordCardSmallGrid } from '@/components/features/vocab/WordCardSmallGrid';
import { WordListItemView } from '@/components/features/vocab/WordListItemView';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import useLocalStorage from '@/hooks/useLocalStorage';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ArrowLeft, Grid, List, NotebookText, Plus, SortAsc, SortDesc, Star, View } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { CSSProperties, useMemo, useState } from 'react'; // Import CSSProperties
import { FixedSizeGrid as GridWindow, FixedSizeList as ListWindow } from 'react-window'; // Import react-window

import { usePracticeLogs } from '@/hooks/usePracticeLogs';
import { useWords } from '@/hooks/useWords';

// Define types
type WordBank = RouterOutputs['vocab']['getById'] & {
  _count?: {
    notes: number;
    words?: number;
  };
};

export type WordListItem = {
  id: string;
  text: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  isStarred: boolean;
  notes: string | null;
  wordBankId: string;
  wordMaster: {
    id: string;
    baseWord: string;
    wordType: string | null;
    definition: string | null;
    sampleSentences: Record<string, string> | null;
    translations: Record<string, string> | null;
    isDictionaryWord: boolean;
  };
  practiceCount: number;
  _count?: {
    practiceLogs: number;
  };
};

type WordSortKey = 'baseWord' | 'interval' | 'id';
type SortDirection = 'asc' | 'desc';

const getMasteryInfo = (interval: number): { level: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } => {
  if (interval <= 2) return { level: 'Beginner', variant: 'destructive' };
  if (interval <= 7) return { level: 'Learning', variant: 'secondary' };
  if (interval <= 30) return { level: 'Consolidating', variant: 'outline' };
  return { level: 'Mastered', variant: 'default' };
};

export default function WordBankDetailPage () {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const bankId = params.bankId as string

  const { data: wordBank, isLoading: isLoadingBank, error: bankError } = api.vocab.getById.useQuery(
    { id: bankId },
    { enabled: status === 'authenticated' && !!bankId }
  )
  const { words, isLoading: isLoadingWords, error: wordsError, remove: removeWord } = useWords(bankId);
  const { logs: practiceLogs, isLoading: isLoadingLogs, error: logsError } = usePracticeLogs(bankId);

  const [wordFilterText, setWordFilterText] = useState('');
  const [wordSortKey, setWordSortKey] = useState<WordSortKey>('id');
  const [wordSortDirection, setWordSortDirection] = useState<SortDirection>('asc');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<WordListItem | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<'large-grid' | 'small-grid' | 'list'>('wordBankDetailViewMode', 'large-grid');

  const handleDeleteRequest = (word: WordListItem) => {
    setWordToDelete(word);
  };

  const filteredAndSortedWords = useMemo(() => {
    if (!words) return [];
    let processedWords = words.map((w: any) => ({
      ...w,
      interval: w.interval ?? 0,
      easeFactor: w.easeFactor ?? 0,
      repetitions: w.repetitions ?? 0,
      nextReviewDate: w.nextReviewDate,
      isStarred: w.isStarred ?? false,
      notes: w.notes ?? null,
      wordMaster: w.wordMaster ?? { id: '', baseWord: w.text, wordType: null, definition: null, sampleSentences: null, translations: null, isDictionaryWord: false },
      practiceCount: w.practiceCount ?? 0,
      _count: w._count ?? { practiceLogs: 0 },
    }));

    if (showStarredOnly) {
      processedWords = processedWords.filter(word => word.isStarred);
    }
    if (wordFilterText) {
      const filterLower = wordFilterText.toLowerCase();
      processedWords = processedWords.filter(word =>
        (word.wordMaster?.baseWord || word.text || '').toLowerCase().includes(filterLower) ||
        (word.wordMaster?.definition || '').toLowerCase().includes(filterLower)
      );
    }

    processedWords.sort((a, b) => {
      let compareA: string | number | undefined;
      let compareB: string | number | undefined;
      const key = wordSortKey;
      switch (key) {
        case 'baseWord':
          compareA = (a.wordMaster?.baseWord || a.text || '').toLowerCase();
          compareB = (b.wordMaster?.baseWord || b.text || '').toLowerCase();
          break;
        case 'interval':
          compareA = a.interval;
          compareB = b.interval;
          break;
        case 'id': default:
          compareA = a.id;
          compareB = b.id;
          break;
      }
      compareA = compareA ?? '';
      compareB = compareB ?? '';
      let comparison = 0;
      if (compareA > compareB) comparison = 1;
      else if (compareA < compareB) comparison = -1;
      return wordSortDirection === 'desc' ? comparison * -1 : comparison;
    });
    return processedWords;
  }, [words, wordFilterText, wordSortKey, wordSortDirection, showStarredOnly]);

  const toggleWordSortDirection = () => {
    setWordSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  // --- Virtualization Renderers ---
  const LargeGridItem = ({ columnIndex, rowIndex, style, data }: { columnIndex: number; rowIndex: number; style: CSSProperties; data: typeof filteredAndSortedWords }) => {
    const index = rowIndex * 3 + columnIndex; // Assuming 3 columns
    if (index >= data.length) return null;
    const word = data[index];
    return (
      <div style={style} className="p-2">
        <WordCardLargeGrid key={word.id} word={word} bankId={bankId} onDeleteRequest={handleDeleteRequest} />
      </div>
    );
  };

  const SmallGridItem = ({ columnIndex, rowIndex, style, data }: { columnIndex: number; rowIndex: number; style: CSSProperties; data: typeof filteredAndSortedWords }) => {
    const index = rowIndex * 5 + columnIndex; // Assuming 5 columns
    if (index >= data.length) return null;
    const word = data[index];
    return (
      <div style={style} className="p-1">
        <WordCardSmallGrid key={word.id} word={word} bankId={bankId} />
      </div>
    );
  };

  const ListItem = ({ index, style, data }: { index: number; style: CSSProperties, data: typeof filteredAndSortedWords }) => {
    const word = data[index];
    return (
      <div style={style}>
        <WordListItemView key={word.id} word={word} bankId={bankId} />
      </div>
    );
  };
  // --- End Virtualization Renderers ---


  if (status === 'loading' || (isLoadingBank && !wordBank)) {
     return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
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
  if (status === 'unauthenticated') return <div className="container mx-auto p-4">Please sign in.</div>
  if (bankError) return <div className="container mx-auto p-4 text-red-500">Error: {bankError.message}</div>
  if (!wordBank) return <div className="container mx-auto p-4 text-red-500">Bank not found.</div>

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header and Bank Info remain the same */}
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
          <div className="flex gap-2">
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
                <Plus className="mr-2 h-4 w-4" /> Add Words
              </Button>
            ) : (
              <Button onClick={() => router.push(`/vocabulary/learn/${bankId}`)}>
                Practice
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter/Sort Controls remain the same */}
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
                  <SelectItem value="baseWord">Word</SelectItem>
                  <SelectItem value="id">Date Added</SelectItem>
                  <SelectItem value="interval">Mastery</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={toggleWordSortDirection} className="h-9 w-9">
                {wordSortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
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
            <div className="flex items-center gap-1 rounded-md bg-muted p-1 ml-2">
               <Button
                 variant={viewMode === 'large-grid' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('large-grid')} className="h-7 px-2" aria-label="Large grid view">
                 <View className="h-4 w-4" />
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

          {/* Word List - Virtualized */}
          {isLoadingWords ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : wordsError ? (
             <p className="text-destructive text-center py-6">Error loading words: {wordsError}</p>
          ) : filteredAndSortedWords.length > 0 ? (
            <>
              {viewMode === 'large-grid' && (
                <GridWindow
                  columnCount={3} // TODO: Responsive
                  columnWidth={300} // TODO: Adjust
                  height={600} // TODO: Responsive
                  rowCount={Math.ceil(filteredAndSortedWords.length / 3)}
                  rowHeight={150} // Adjust based on WordCardLargeGrid height
                  width={920} // TODO: Responsive
                  itemData={filteredAndSortedWords}
                >
                  {LargeGridItem}
                </GridWindow>
              )}
              {viewMode === 'small-grid' && (
                 <GridWindow
                   columnCount={5} // TODO: Responsive
                   columnWidth={180} // TODO: Adjust
                   height={600} // TODO: Responsive
                   rowCount={Math.ceil(filteredAndSortedWords.length / 5)}
                   rowHeight={60} // Adjust based on WordCardSmallGrid height
                   width={920} // TODO: Responsive
                   itemData={filteredAndSortedWords}
                 >
                   {SmallGridItem}
                 </GridWindow>
               )}
              {viewMode === 'list' && (
                 <div className="border rounded-md overflow-hidden">
                   <ListWindow
                     height={600} // TODO: Responsive
                     itemCount={filteredAndSortedWords.length}
                     itemSize={50} // Adjust based on WordListItemView height
                     width="100%"
                     itemData={filteredAndSortedWords}
                   >
                     {ListItem}
                   </ListWindow>
                 </div>
               )}
            </>
          ) : (
             <p className="text-muted-foreground text-center py-6">
               {wordFilterText ? 'No words match your filter.' : 'No words added to this bank yet.'}
             </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
       <AlertDialog open={!!wordToDelete} onOpenChange={(open) => !open && setWordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the word
              <span className="font-semibold"> "{wordToDelete?.wordMaster?.baseWord || wordToDelete?.text}"</span> and its practice history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (wordToDelete) {
                  removeWord(wordToDelete.id);
                  setWordToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
