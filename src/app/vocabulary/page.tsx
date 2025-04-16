'use client'

import { AddWordsModal } from "@/components/features/vocab/AddWordsModal";
import { PracticeHistoryTabContent } from "@/components/features/vocab/PracticeHistoryTabContent";
import { WordBankListItem as WordBankListItemComponent } from "@/components/features/vocab/WordBankListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useWordBanks } from '@/hooks/useWordBanks';
import { api } from '@/utils/trpc';
import { format } from 'date-fns';
import { AlertCircle, BookText, Grid, History, List, Pencil, Play, Plus, Settings, SortAsc, SortDesc } from "lucide-react";
import { useSession } from 'next-auth/react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, useMemo, useState } from "react"; // Import CSSProperties
import { FixedSizeGrid as GridWindow, FixedSizeList as ListWindow } from 'react-window'; // Import react-window components
import { toast } from "sonner";

// Type alias for clarity
type WordBankItem = NonNullable<ReturnType<typeof useWordBanks>['wordBanks']>[number];

type SortKey = 'name' | 'createdAt' | 'masteryPercentage';
type SortDirection = 'asc' | 'desc';

export default function VocabularyPage() {
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('vocabViewMode', 'grid');
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { wordBanks, isLoading, error } = useWordBanks(userId || '');

  // Client-side filtering and sorting
  const filteredAndSortedBanks = useMemo(() => {
    if (!wordBanks) return [];
    let banks = [...wordBanks].map(bank => ({
      ...bank,
      wordCount: bank.wordCount ?? 0,
      masteryPercentage: bank.masteryPercentage ?? 0,
      lastPracticedAt: bank.lastPracticedAt ?? null,
      reviewCount: (bank as any).reviewCount ?? 0,
    }));

    if (filterText) {
      banks = banks.filter(bank =>
        bank.name.toLowerCase().includes(filterText.toLowerCase()) ||
        (bank.description && bank.description.toLowerCase().includes(filterText.toLowerCase()))
      );
    }

    banks.sort((a, b) => {
      let compareA = a[sortKey as keyof typeof a] as string | number | Date | null | undefined;
      let compareB = b[sortKey as keyof typeof b] as string | number | Date | null | undefined;
      const valA = compareA === null || compareA === undefined ? -Infinity : compareA;
      const valB = compareB === null || compareB === undefined ? -Infinity : compareB;

      if (sortKey === 'createdAt') {
         const dateA = valA instanceof Date ? valA : (typeof valA === 'string' ? new Date(valA) : new Date(0));
         const dateB = valB instanceof Date ? valB : (typeof valB === 'string' ? new Date(valB) : new Date(0));
         compareA = dateA.getTime();
         compareB = dateB.getTime();
      } else if (sortKey === 'masteryPercentage') {
         compareA = typeof valA === 'number' ? valA : 0;
         compareB = typeof valB === 'number' ? valB : 0;
      } else if (sortKey === 'name') {
         compareA = String(valA).toLowerCase();
         compareB = String(valB).toLowerCase();
      } else {
         compareA = valA;
         compareB = valB;
      }

      let comparison = 0;
      if (compareA > compareB) comparison = 1;
      else if (compareA < compareB) comparison = -1;
      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

    return banks;
  }, [wordBanks, filterText, sortKey, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }

  // --- Virtualization Renderers ---
  const GridItem = ({ columnIndex, rowIndex, style, data }: { columnIndex: number; rowIndex: number; style: CSSProperties; data: typeof filteredAndSortedBanks }) => {
    const index = rowIndex * 3 + columnIndex; // Assuming 3 columns
    if (index >= data.length) return null;
    const bank = data[index];
    return (
      <div style={style} className="p-3"> {/* Apply style and padding */}
        <WordBankCard
          key={bank.id}
          id={bank.id}
          title={bank.name}
          description={bank.description}
          wordCount={bank.wordCount}
          masteryPercentage={bank.masteryPercentage}
          lastPracticedAt={bank.lastPracticedAt ? new Date(bank.lastPracticedAt) : null}
        />
      </div>
    );
  };

  const ListItem = ({ index, style, data }: { index: number; style: CSSProperties, data: typeof filteredAndSortedBanks }) => {
    const bank = data[index];
    return (
      <div style={style}> {/* Apply style */}
        <WordBankListItemComponent
          key={bank.id}
          {...bank}
          reviewCount={bank.reviewCount}
          wordCount={bank.wordCount}
          masteryPercentage={bank.masteryPercentage}
          lastPracticedAt={bank.lastPracticedAt ? new Date(bank.lastPracticedAt) : new Date(0)}
          createdAt={bank.createdAt ? new Date(bank.createdAt) : new Date()}
          updatedAt={bank.updatedAt ? new Date(bank.updatedAt) : new Date()}
          description={bank.description ?? null}
        />
      </div>
    );
  };
  // --- End Virtualization Renderers ---


  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your word banks and track your progress.</p>
        </div>
      </div>

      {/* Word Banks Section */}
      <div className="mt-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Your Word Banks</h2>
          {/* Filter, Sort, View Toggle */}
          <div className="flex items-center gap-2 w-full md:w-auto">
             <Input
               placeholder="Filter banks..."
               value={filterText}
               onChange={(e) => setFilterText(e.target.value)}
               className="h-9 max-w-xs"
             />
             <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
               <SelectTrigger className="h-9 w-[150px]">
                 <SelectValue placeholder="Sort by" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="name">Name</SelectItem>
                 <SelectItem value="createdAt">Date Created</SelectItem>
                 <SelectItem value="masteryPercentage">Mastery</SelectItem>
               </SelectContent>
             </Select>
             <Button variant="ghost" size="icon" onClick={toggleSortDirection} className="h-9 w-9">
               {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
             </Button>
             <div className="flex items-center gap-1 rounded-md bg-muted p-1 ml-2">
               <Button
                 variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('grid')} className="h-7 px-2" aria-label="Grid view">
                 <Grid className="h-4 w-4" />
               </Button>
               <Button
                 variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                 size="sm" onClick={() => setViewMode('list')} className="h-7 px-2" aria-label="List view">
                 <List className="h-4 w-4" />
               </Button>
             </div>
           </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-2"}>
            {viewMode === 'grid' ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[200px] w-full" />)
             : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[60px] w-full" />)}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading word banks: {error}</span>
          </div>
        )}

        {/* Content Area - Virtualized */}
        {!isLoading && !error && (
          <>
            {filteredAndSortedBanks.length === 0 && !filterText && (
               <p className="text-muted-foreground text-center py-8">No word banks created yet. Create one below!</p>
            )}
             {filteredAndSortedBanks.length === 0 && filterText && (
               <p className="text-muted-foreground text-center py-8">No word banks match your filter.</p>
            )}

            {/* Grid View - Virtualized */}
            {viewMode === 'grid' && filteredAndSortedBanks.length > 0 && (
              <GridWindow
                className="grid-container"
                columnCount={3} // TODO: Make responsive
                columnWidth={300} // TODO: Adjust based on actual card size + gap
                height={600} // TODO: Make responsive or use AutoSizer
                rowCount={Math.ceil(filteredAndSortedBanks.length / 3)}
                rowHeight={240} // TODO: Adjust based on actual card size + gap
                width={920} // TODO: Make responsive or use AutoSizer
                itemData={filteredAndSortedBanks}
              >
                {GridItem}
              </GridWindow>
            )}
            {/* Render Create New Bank Card separately below the grid */}
            {viewMode === 'grid' && (
                <Card className="flex flex-col items-center justify-center border-dashed min-h-[200px] mt-6">
                  <CardContent className="pt-6 text-center">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Create a new word bank</p>
                    <Link href="/vocabulary/create-bank" className="block mt-4">
                      <Button variant="outline">Create Word Bank</Button>
                    </Link>
                  </CardContent>
                </Card>
            )}

            {/* List View - Virtualized */}
            {viewMode === 'list' && filteredAndSortedBanks.length > 0 && (
              <div className="border rounded-md overflow-hidden"> {/* Container for list + button */}
                <ListWindow
                  height={600} // TODO: Make responsive or use AutoSizer
                  itemCount={filteredAndSortedBanks.length}
                  itemSize={75} // TODO: Adjust based on actual item height
                  width="100%"
                  itemData={filteredAndSortedBanks}
                >
                  {ListItem}
                </ListWindow>
              </div>
            )}
             {/* Render Create New Bank Button separately below the list */}
             {viewMode === 'list' && (
                 <div className="pt-2">
                   <Link href="/vocabulary/create-bank" className="block">
                      <Button variant="outline" className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Create New Bank
                      </Button>
                   </Link>
                 </div>
             )}
          </>
        )}
      </div>

      {/* Practice History Section */}
      <div className="mt-12">
         <div className="flex justify-between items-center mb-4">
           <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
             <History className="h-6 w-6" /> Practice History
           </h2>
         </div>
         <PracticeHistoryTabContent />
       </div>
    </main>
  )
}

// WordBankCard Component (Refactored) - Keep as is
function WordBankCard({
  id,
  title,
  description,
  wordCount,
  lastPracticedAt,
  masteryPercentage,
}: {
  id: string
  title: string
  description?: string | null
  wordCount: number
  lastPracticedAt?: Date | null
  masteryPercentage: number
}) {
  const router = useRouter();
  const startSessionMutation = api.vocab.startVocabSession.useMutation({
    onSuccess: (data: any) => {
      toast.success('Practice session started!');
      router.push(`/vocabulary/practice/${data.practiceSessionId}`);
    },
    onError: (error) => {
      console.error("startSessionMutation Error:", error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const handleStartPractice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startSessionMutation.mutate({ wordBankId: id });
  };

  return (
    <Card className="flex flex-col h-full">
     <Link href={`/vocabulary/banks/${id}`} className="flex flex-col flex-grow hover:bg-muted/50 rounded-t-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <BookText className="h-5 w-5" />
            {title}
          </span>
          <span className="text-2xl font-bold text-muted-foreground">{wordCount}</span>
        </CardTitle>
        <CardDescription className="line-clamp-3 h-[3.75rem] mt-1">
          {description || `Last practiced: ${lastPracticedAt ? format(lastPracticedAt, 'PP') : 'Never'}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2">
        <div className="space-y-1">
          <div className="flex justify-between text-sm font-medium">
            <span>Mastery</span>
            <span>{masteryPercentage}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${masteryPercentage}%` }} />
          </div>
        </div>
      </CardContent>
     </Link>
      <CardFooter className="flex justify-between items-center pt-4">
        {wordCount === 0 ? (
          <AddWordsModal bankId={id}>
            <Button variant="outline" className="w-full border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-600 flex-grow mr-2">
              <Plus className="mr-2 h-4 w-4" /> Add Words
            </Button>
          </AddWordsModal>
        ) : (
          <Button
            variant="default"
            className="w-full flex-grow mr-2 bg-cyan-500 hover:bg-cyan-600 text-white"
            onClick={handleStartPractice}
            disabled={startSessionMutation.isPending}
          >
            {startSessionMutation.isPending
              ? 'Starting...'
              : <><Play className="mr-2 h-4 w-4" /> Practice</>
            }
          </Button>
        )}
        <Link href={`/vocabulary/banks/${id}`} passHref>
          <Button variant="outline" size="sm" title="Manage Words">
             <Settings className="h-4 w-4" />
             <span className="sr-only">Manage Words</span>
          </Button>
        </Link>
        <Link href={`/vocabulary/edit/${id}`} className="ml-1">
          <Button variant="ghost" size="icon" title="Edit Bank">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit Bank</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
