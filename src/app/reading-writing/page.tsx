import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play } from "lucide-react";
import Link from "next/link";

export default function ReadingWritingPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reading & Writing Practice</h1>
          <p className="text-muted-foreground mt-1">Practice with AI-generated SAT-style questions</p>
        </div>
        <Link href="/reading-writing/practice">
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Start Practice Session
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="history">Practice History</TabsTrigger>
          <TabsTrigger value="stats">Performance Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <div className="space-y-4">
            <PracticeHistoryItem
              date="Today, 3:45 PM"
              difficulty={4}
              questionsCount={10}
              score={8}
              duration="18 minutes"
            />
            <PracticeHistoryItem
              date="Yesterday, 5:20 PM"
              difficulty={3}
              questionsCount={15}
              score={12}
              duration="25 minutes"
            />
            <PracticeHistoryItem
              date="Apr 10, 2025, 2:15 PM"
              difficulty={5}
              questionsCount={8}
              score={5}
              duration="22 minutes"
            />
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">76%</div>
                <p className="text-xs text-muted-foreground mt-1">+5% from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Questions Answered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">124</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Practice Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">12</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Performance by Question Type</CardTitle>
              <CardDescription>Your accuracy across different question types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reading Comprehension</span>
                    <span className="font-medium">82%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Vocabulary in Context</span>
                    <span className="font-medium">75%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Grammar & Usage</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "68%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Evidence-Based Reading</span>
                    <span className="font-medium">79%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "79%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function PracticeHistoryItem({
  date,
  difficulty,
  questionsCount,
  score,
  duration,
}: {
  date: string
  difficulty: number
  questionsCount: number
  score: number
  duration: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-medium">{date}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Difficulty</p>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full mr-1 ${i < difficulty ? "bg-primary" : "bg-secondary"}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="font-medium">
                {score}/{questionsCount} ({Math.round((score / questionsCount) * 100)}%)
              </p>
            </div>
            <Link href={`/reading-writing/review?session=${date}`}>
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
