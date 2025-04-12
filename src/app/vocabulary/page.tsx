'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RouterOutputs } from "@/utils/trpc";
import { AlertCircle, BookText, Grid, List, Pencil, Play, Plus, Settings } from "lucide-react"; // Added Grid, List, Pencil, Settings
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// Infer type for word bank list item
type WordBankListItem = RouterOutputs['vocab']['listWordBanks'][number]

export default function VocabularyPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // State for view mode
  // Fetch word banks
  const { data: wordBanks, isLoading, error } = api.vocab.listWordBanks.useQuery()

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your word banks and track your progress.</p>
        </div>
        {/* Top-level Practice button removed */}
      </div>

      {/* Progress Overview Section - Placeholder */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Progress metrics coming soon...</p>
          {/* TODO: Add charts or stats here */}
        </CardContent>
      </Card>

      {/* Word Banks Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold tracking-tight">Your Word Banks</h2>
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 rounded-md bg-muted p-1">
             <Button
               variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
               size="sm"
               onClick={() => setViewMode('grid')}
               className="h-7 px-2"
               aria-label="Grid view"
             >
               <Grid className="h-4 w-4" />
             </Button>
             <Button
               variant={viewMode === 'list' ? 'secondary' : 'ghost'}
               size="sm"
               onClick={() => setViewMode('list')}
               className="h-7 px-2"
               aria-label="List view"
             >
               <List className="h-4 w-4" />
             </Button>
           </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-2"}>
            {viewMode === 'grid' ? (
              <>
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
              </>
            ) : (
               <>
                 <Skeleton className="h-[60px] w-full" />
                 <Skeleton className="h-[60px] w-full" />
                 <Skeleton className="h-[60px] w-full" />
               </>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-destructive flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading word banks: {error.message}</span>
          </div>
        )}

        {/* Content Area */}
        {!isLoading && !error && wordBanks && (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wordBanks.length > 0 && wordBanks.map((bank) => (
                  <WordBankCard
                    key={bank.id}
                    id={bank.id}
                    title={bank.name}
                    description={bank.description}
                    wordCount={bank.wordCount}
                    masteryPercentage={bank.masteryPercentage}
                    lastPracticed="Never" // Placeholder
                  />
                ))}
                {/* Create New Bank Card (Grid) */}
                <Card className="flex flex-col items-center justify-center h-full border-dashed min-h-[200px]">
                  <CardContent className="pt-6 text-center">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Create a new word bank</p>
                    <Link href="/vocabulary/create-bank" className="block mt-4">
                      <Button variant="outline">Create Word Bank</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {wordBanks.length > 0
                  ? wordBanks.map((bank) => (
                      // TODO: Replace with WordBankListItem component
                      <div key={bank.id} className="p-4 border rounded-md flex justify-between items-center">
                        <div className="flex flex-col">
                           <span className="font-semibold">{bank.name}</span>
                           <span className="text-sm text-muted-foreground">{bank.wordCount} words</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium">Mastery: {bank.masteryPercentage}%</span>
                           {/* TODO: Add compact list view action buttons */}
                           <Button variant="ghost" size="icon"><Play className="h-4 w-4" /></Button>
                           <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
                           <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))
                  : <p className="text-muted-foreground text-center py-4">No word banks created yet.</p>
                }
                {/* Create New Bank Button (List) */}
                 <Link href="/vocabulary/create-bank" className="block pt-2">
                    <Button variant="outline" className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Create New Bank
                    </Button>
                 </Link>
              </div>
            )}
          </>
        )}
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
  lastPracticed,
  masteryPercentage,
}: {
  id: string
  title: string
  description?: string | null
  wordCount: number
  lastPracticed: string
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
    e.preventDefault(); // Prevent link navigation when clicking button
    e.stopPropagation();
    startSessionMutation.mutate({ wordBankId: id });
  };

  return (
    <Card className="flex flex-col h-full">
     <Link href={`/vocabulary/banks/${id}`} className="flex flex-col flex-grow hover:bg-muted/50 rounded-t-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookText className="h-5 w-5" />
           {title}
        </CardTitle>
        <CardDescription className="line-clamp-3 h-[3.75rem]"> {/* line-clamp for description */}
          {description || `${wordCount} words • Last practiced: ${lastPracticed}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-4">
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
        <Button
          variant="secondary" // Make practice button colored
          className="w-full flex-grow mr-2"
          onClick={handleStartPractice}
          disabled={startSessionMutation.isPending}
        >
          {startSessionMutation.isPending
            ? 'Starting...'
            : <><Play className="mr-2 h-4 w-4" /> Practice</>
          }
        </Button>
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

// Placeholder component for practice history items - REMOVED as Tabs are gone
// function PracticeHistoryItem(...) { ... }
