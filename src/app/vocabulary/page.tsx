import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Plus, BookText, Play } from "lucide-react"

export default function VocabularyPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vocabulary Practice</h1>
          <p className="text-muted-foreground mt-1">Build your vocabulary with AI-powered spaced repetition</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vocabulary/add-words">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Words
            </Button>
          </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Example word banks */}
            <WordBankCard title="SAT Common Words" count={150} lastPracticed="2 days ago" mastery={65} />
            <WordBankCard title="Advanced Vocabulary" count={75} lastPracticed="1 week ago" mastery={42} />
            <Card className="flex flex-col items-center justify-center h-full border-dashed">
              <CardContent className="pt-6 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Create a new word bank</p>
                <Link href="/vocabulary/create-bank" className="block mt-4">
                  <Button variant="outline">Create Word Bank</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="practice-history">
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

function WordBankCard({
  title,
  count,
  lastPracticed,
  mastery,
}: {
  title: string
  count: number
  lastPracticed: string
  mastery: number
}) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookText className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {count} words • Last practiced {lastPracticed}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mastery</span>
            <span className="font-medium">{mastery}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${mastery}%` }} />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Link href={`/vocabulary/practice?bank=${encodeURIComponent(title)}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            Practice
          </Button>
        </Link>
        <Link href={`/vocabulary/edit?bank=${encodeURIComponent(title)}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Edit
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

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
            <Link href={`/vocabulary/review?session=${date}`}>
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
