'use client'

import { AddWordsModal } from "@/components/features/vocab/AddWordsModal"; // Import the new modal
import { GroupList } from "@/components/features/vocab/group/GroupList";
import { PracticeHistoryTabContent } from "@/components/features/vocab/PracticeHistoryTabContent";
import { WordBankListItem as WordBankListItemComponent } from "@/components/features/vocab/WordBankListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import useLocalStorage from "@/hooks/useLocalStorage"; // Import the custom hook
import { api, type RouterOutputs } from "@/utils/trpc";
import { format } from 'date-fns'; // Import format function
import { AlertCircle, BookText, Grid, History, List, Pencil, Play, Plus, Settings, SortAsc, SortDesc } from "lucide-react";
import { useSession } from "next-auth/react"; // Import useSession
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// Infer type for word bank list item
// Infer type for word bank list item - now includes lastPracticedAt
type WordBankListItem = RouterOutputs['vocab']['listWordBanks'][number] & { lastPracticedAt?: Date | null };
type SortKey = 'name' | 'createdAt' | 'masteryPercentage';
type SortDirection = 'asc' | 'desc';

// Define the session status type at the top of the file
type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

// New component for the Create Word Bank button with session check
function CreateWordBankButton({ isFullWidth = false }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  // Cast status to the correct type
  const sessionStatus = status as SessionStatus;

  // Add logging to debug session
  console.log(`CreateWordBankButton - Session status: ${sessionStatus}, Session exists: ${!!session}`);
  
  const handleCreateClick = () => {
    if (sessionStatus === 'loading') {
      toast.info('Loading session information...');
      return;
    }
    if (!session) {
      toast.warning('You need to be logged in to create a word bank.');
      router.push('/login?callbackUrl=/vocabulary/create-bank');
      return;
    }
    router.push('/vocabulary/create-bank');
  };

  // Don't render the button at all if not authenticated
  if (!session) {
    console.log('CreateWordBankButton - Not rendering button (no session)');
    return null;
  }
  
  return (
    <Button
      variant="outline"
      className={isFullWidth ? "w-full mt-4 md:mt-0" : "mt-4"}
      onClick={handleCreateClick}
      disabled={sessionStatus === 'loading'}
    >
      {sessionStatus === 'loading' ? (
        'Loading...'
      ) : (
        isFullWidth ? (
          <><Plus className="mr-2 h-4 w-4" /> Create New Bank</>
        ) : (
          'Create Word Bank'
        )
      )}
    </Button>
  );
}

export default function VocabularyPage() {
  // Use useLocalStorage for viewMode persistence
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('vocabViewMode', 'grid');
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Fetch word banks
  const { data: wordBanks, isLoading: isLoadingBanks, error: banksError } = api.vocab.listWordBanks.useQuery()

  // Client-side filtering and sorting
  const filteredAndSortedBanks = useMemo(() => {
    if (!wordBanks) return [];
    let banks = [...wordBanks];

    // Filter
    if (filterText) {
      banks = banks.filter(bank =>
        bank.name.toLowerCase().includes(filterText.toLowerCase()) ||
        bank.description?.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Sort
    banks.sort((a, b) => {
      let compareA: string | number | Date = a[sortKey];
      let compareB: string | number | Date = b[sortKey];

      if (sortKey === 'createdAt') {
        compareA = new Date(compareA);
        compareB = new Date(compareB);
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

  // Add this near the top of the component
  const { data: session, status: authStatus } = useSession();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your word banks and track your progress.</p>
        </div>
      </div>

      {/* Progress Overview Section - Placeholder */}
            {/*
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Progress metrics coming soon...</p>
              </CardContent>
            </Card>
            */}

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
        {isLoadingBanks && (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-2"}>
            {viewMode === 'grid' ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[200px] w-full" />)
             : Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[60px] w-full" />)}
          </div>
        )}

        {/* Error State */}
        {banksError && (
          <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading word banks: {banksError.message}</span>
          </div>
        )}

        {/* Content Area */}
        {!isLoadingBanks && !banksError && (
          <>
            {filteredAndSortedBanks.length === 0 && !filterText && (
               <p className="text-muted-foreground text-center py-8">No word banks created yet. Create one below!</p>
            )}
             {filteredAndSortedBanks.length === 0 && filterText && (
               <p className="text-muted-foreground text-center py-8">No word banks match your filter.</p>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedBanks.map((bank) => (
                  <WordBankCard
                    key={bank.id}
                    id={bank.id}
                    title={bank.name}
                    description={bank.description}
                    wordCount={bank.wordCount}
                    masteryPercentage={bank.masteryPercentage}
                    lastPracticedAt={bank.lastPracticedAt} // Pass the correct prop
                  />
                ))}
                {/* Create New Bank Card (Grid) - Only show if authenticated */}
                {session && (
                  <Card className="flex flex-col items-center justify-center h-full border-dashed min-h-[200px]">
                    <CardContent className="pt-6 text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Create a new word bank</p>
                      <CreateWordBankButton /> {/* Use the new component */}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredAndSortedBanks.map((bank) => (
                  <WordBankListItemComponent key={bank.id} {...bank} />
                ))}
                {/* Create New Bank Button (List) - Only show if authenticated */}
                {session && (
                  <CreateWordBankButton isFullWidth />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Groups Section */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Groups</h2>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/vocabulary/groups">
                View All
              </Link>
            </Button>
            <Button asChild>
              <Link href="/vocabulary/groups/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          </div>
        </div>
        <GroupList />
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

// WordBankCard Component (Refactored)
function WordBankCard({
  id,
  title,
  description,
  wordCount,
  lastPracticedAt, // Use the new prop name
  masteryPercentage,
}: {
  id: string
  title: string
  description?: string | null
  wordCount: number
  lastPracticedAt?: Date | null // Update prop type
  masteryPercentage: number
}) {
  const router = useRouter();
  const startSessionMutation = api.vocab.startVocabSession.useMutation({
    onSuccess: (data) => {
      toast.success('Practice session started!');
      router.push(`/vocabulary/practice/${data.practiceSessionId}`);
    },
    onError: (error) => {
      toast.error(`Failed to start session: ${error.message}`);
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
          {/* Larger Word Count */}
          <span className="text-2xl font-bold text-muted-foreground">{wordCount}</span>
        </CardTitle>
        <CardDescription className="line-clamp-3 h-[3.75rem] mt-1"> {/* Added margin-top */}
          {description || `Last practiced: ${lastPracticedAt ? format(new Date(lastPracticedAt), 'PP') : 'Never'}`} {/* Format date */}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2"> {/* Reduced padding-top */}
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
            // Apply bright color class - using cyan as an example
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
