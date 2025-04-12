'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type RouterOutputs } from "@/utils/trpc"; // Import tRPC client and types
import { AlertCircle, BookText, Play, Plus } from "lucide-react"; // Import AlertCircle
import Link from "next/link";

// Infer type for word bank list item
type WordBankListItem = RouterOutputs['vocab']['listWordBanks'][number]

export default function VocabularyPage() {
  // Fetch word banks
  const { data: wordBanks, isLoading, error } = api.vocab.listWordBanks.useQuery()
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary Practice</h1>
          <p className="text-muted-foreground mt-1">Build your vocabulary with AI-powered spaced repetition</p>
        </div>
        <div className="flex gap-2">
          {/* Add Words button removed from here */}
          <Link href="/vocabulary/practice">
            <Button variant="secondary">
              <Play className="h-4 w-4 mr-2" />
              Practice
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="word-banks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="word-banks">Word Banks</TabsTrigger>
          <TabsTrigger value="practice-history">Practice History</TabsTrigger>
        </TabsList>

        <TabsContent value="word-banks">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[250px] w-full" />
              <Skeleton className="h-[250px] w-full" />
              <Skeleton className="h-[250px] w-full" />
            </div>
          )}
          {error && (
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading word banks: {error.message}</span>
            </div>
          )}
          {/* Render content when not loading and no error */}
          {!isLoading && !error && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {/* Existing Word Banks (Only if they exist) */}
               {wordBanks && wordBanks.length > 0 && wordBanks.map((bank: WordBankListItem) => ( // Add explicit type here
                 <WordBankCard
                  key={bank.id}
                  id={bank.id} // Pass ID for links
                  title={bank.name}
                  description={bank.description}
                  wordCount={bank.wordCount}
                  masteryPercentage={bank.masteryPercentage} // Pass the mastery percentage
                  // Placeholder for lastPracticed:
                  lastPracticed="Never"
                />
               ))}
               {/* "Add Words" Card (Always show if not loading/error) */}
               <Card className="flex flex-col items-center justify-center h-full border-dashed min-h-[250px]">
                <CardContent className="pt-6 text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Add words to an existing bank</p>
                  <Link href="/vocabulary/add-words" className="block mt-4">
                    <Button variant="outline">Add Words</Button>
                  </Link>
                </CardContent>
              </Card>
              {/* "Create New Bank" Card */}
              <Card className="flex flex-col items-center justify-center h-full border-dashed min-h-[250px]">
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
           {/* Empty state removed, cards above serve as the call to action */}
         </TabsContent>

        <TabsContent value="practice-history">
          {/* Placeholder content for practice history */}
          <div className="space-y-4">
             <PracticeHistoryItem date="Today, 2:30 PM" wordBank="SAT Common Words" wordsStudied={25} accuracy={92} />
             <PracticeHistoryItem
               date="Yesterday, 10:15 AM"
               wordBank="Advanced Vocabulary"
               wordsStudied={15}
               accuracy={78}
             />
             <PracticeHistoryItem
               date="Apr 10, 2025, 4:45 PM"
               wordBank="SAT Common Words"
               wordsStudied={30}
               accuracy={85}
             />
           </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

// Update WordBankCard props to include id and optional description
function WordBankCard({
  id,
  title,
  description,
  wordCount,
  lastPracticed,
  masteryPercentage, // Use masteryPercentage prop
}: {
  id: string
  title: string
  description?: string | null
  wordCount: number
  lastPracticed: string // Keep placeholder type for now
  masteryPercentage: number // Use masteryPercentage prop type
}) {
  // Wrap CardHeader content in a Link to the detail page
  return (
    <Card className="flex flex-col h-full">
     <Link href={`/vocabulary/banks/${id}`} className="flex flex-col flex-grow hover:bg-muted/50 rounded-t-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookText className="h-5 w-5" />
           {title}
        </CardTitle>
        <CardDescription>
          {/* Use wordCount and keep placeholder for lastPracticed */}
          {description || `${wordCount} words • Last practiced: ${lastPracticed}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-4"> {/* Add padding top */}
        {/* Display actual mastery */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm font-medium">
            <span>Mastery</span>
            <span>{masteryPercentage}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            {/* Use masteryPercentage for the progress bar width */}
            <div className="h-full bg-primary rounded-full" style={{ width: `${masteryPercentage}%` }} />
          </div>
        </div>
      </CardContent>
     </Link> {/* Close Link wrapping CardHeader and CardContent */}
      <CardFooter className="flex gap-2 pt-4"> {/* Add padding top to separate footer */}
        {/* Update links to use bank ID */}
        <Link href={`/vocabulary/practice?bankId=${id}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Practice
          </Button>
        </Link>
        {/* Update link to use dynamic route */}
        <Link href={`/vocabulary/edit/${id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Edit
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

// Placeholder component for practice history items
function PracticeHistoryItem({
  date,
  wordBank,
  wordsStudied,
  accuracy,
}: {
  date: string
  wordBank: string
  wordsStudied: number
  accuracy: number
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-medium">{date}</p>
            <p className="text-sm text-muted-foreground">{wordBank}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Words Studied</p>
              <p className="font-medium">{wordsStudied}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="font-medium">{accuracy}%</p>
            </div>
            <Link href={`/vocabulary/review?session=${date}`}> {/* Placeholder link */}
              <Button variant="outline" size="sm">
                Review
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
