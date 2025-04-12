'use client'

import { WordHistoryDialog } from '@/components/features/vocab/WordHistoryDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"; // Re-import Collapsible
import { Input } from '@/components/ui/input'; // Add Input back
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Add Select back
import { Skeleton } from '@/components/ui/skeleton';
import { api, type RouterOutputs } from '@/utils/trpc';
import { ArrowLeft, ChevronsUpDown, SortAsc, SortDesc } from 'lucide-react'; // Add Sort icons back
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

// Define types
type WordBank = RouterOutputs['vocab']['getById'];
type WordListItem = RouterOutputs['vocab']['listByBank'][number];
type WordSortKey = 'text' | 'createdAt' | 'interval'; // Add sort keys for words
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

  // Client-side filtering and sorting for words
  const filteredAndSortedWords = useMemo(() => {
    if (!words) return [];
    let processedWords = [...words];

    // Filter
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
  }, [words, wordFilterText, wordSortKey, wordSortDirection]);

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
            </div>
          </div>

          {/* Word List */}
          {filteredAndSortedWords && filteredAndSortedWords.length > 0
            ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAndSortedWords.map((word: WordListItem) => { // Use filteredAndSortedWords
                const mastery = getMasteryInfo(word.interval);
                return (
                  <Collapsible key={word.id} asChild>
                    <li className="border rounded-md px-4 py-3 flex flex-col"> {/* Use flex-col */}
                      <div className="flex items-center justify-between w-full"> {/* Ensure trigger takes full width */}
                        <CollapsibleTrigger asChild>
                          <button className="flex items-center gap-2 flex-grow text-left mr-2 overflow-hidden"> {/* Allow trigger to grow, hide overflow */}
                            <span className="font-medium truncate">{word.text}</span> {/* Truncate long words */}
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> {/* Prevent icon shrinking */}
                          </button>
                        </CollapsibleTrigger>
                        <div className="flex items-center space-x-1 flex-shrink-0"> {/* Reduced space */}
                          <Badge variant={mastery.variant} className="text-xs px-1.5 py-0.5"> {/* Smaller badge */}
                             {mastery.level.substring(0,1)} {/* Abbreviate mastery */}
                          </Badge>
                          <WordHistoryDialog wordId={word.id} wordText={word.text} />
                        </div>
                      </div>
                      <CollapsibleContent className="pt-3 mt-2 border-t w-full"> {/* Ensure content takes full width */}
                        <div className="space-y-1.5 text-xs"> {/* Reduced spacing and text size */}
                          {word.definition && <p><strong>Def:</strong> {word.definition}</p>}
                          {word.sampleSentence && <p><strong>Ex:</strong> <em>{word.sampleSentence}</em></p>}
                          {word.translation && <p><strong>Trans:</strong> {word.translation}</p>}
                          {!word.definition && !word.sampleSentence && !word.translation && (
                            <p className="text-muted-foreground italic">No details available.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </li>
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
           {/* TODO: Add input/button for adding new words here */}
        </CardContent>
      </Card>
    </div>
  )
}
