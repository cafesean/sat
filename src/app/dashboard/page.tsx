import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookText, BookOpen, Clock, Calendar } from "lucide-react"

export default function DashboardPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Words Mastered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">87</div>
            <p className="text-xs text-muted-foreground mt-1">+12 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reading Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">76%</div>
            <p className="text-xs text-muted-foreground mt-1">+5% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Study Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">8.5h</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="schedule">Study Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <div className="space-y-4">
            <ActivityItem
              icon={<BookText className="h-5 w-5" />}
              title="Vocabulary Practice"
              description="Completed a practice session with 25 words"
              time="Today, 2:30 PM"
              score="92% accuracy"
            />
            <ActivityItem
              icon={<BookOpen className="h-5 w-5" />}
              title="Reading & Writing Practice"
              description="Completed a practice session with 10 questions"
              time="Today, 11:15 AM"
              score="8/10 correct"
            />
            <ActivityItem
              icon={<BookText className="h-5 w-5" />}
              title="Added New Words"
              description="Added 15 new words to Advanced Vocabulary bank"
              time="Yesterday, 4:45 PM"
              score=""
            />
            <ActivityItem
              icon={<BookOpen className="h-5 w-5" />}
              title="Reading & Writing Practice"
              description="Completed a practice session with 15 questions"
              time="Yesterday, 10:20 AM"
              score="12/15 correct"
            />
          </div>
        </TabsContent>

        <TabsContent value="progress">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vocabulary Progress</CardTitle>
                <CardDescription>Words mastered over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {[35, 42, 50, 65, 72, 80, 87].map((value, index) => (
                    <div key={index} className="relative flex-1">
                      <div className="bg-primary rounded-t-sm w-full" style={{ height: `${(value / 100) * 180}px` }} />
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        W{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-center text-sm text-muted-foreground">Last 7 weeks</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reading & Writing Progress</CardTitle>
                <CardDescription>Score percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {[62, 65, 70, 68, 72, 75, 76].map((value, index) => (
                    <div key={index} className="relative flex-1">
                      <div className="bg-primary rounded-t-sm w-full" style={{ height: `${(value / 100) * 180}px` }} />
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground">
                        W{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 text-center text-sm text-muted-foreground">Last 7 weeks</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Study Schedule</CardTitle>
              <CardDescription>Your upcoming study sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ScheduleItem
                  date="Today"
                  time="7:00 PM"
                  title="Vocabulary Review"
                  description="Review words from SAT Common Words bank"
                />
                <ScheduleItem
                  date="Tomorrow"
                  time="4:30 PM"
                  title="Reading & Writing Practice"
                  description="Focus on grammar and usage questions"
                />
                <ScheduleItem
                  date="Apr 14, 2025"
                  time="6:00 PM"
                  title="Vocabulary Practice"
                  description="Practice with Advanced Vocabulary bank"
                />
                <ScheduleItem
                  date="Apr 15, 2025"
                  time="5:30 PM"
                  title="Reading & Writing Practice"
                  description="Focus on reading comprehension"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function ActivityItem({
  icon,
  title,
  description,
  time,
  score,
}: {
  icon: React.ReactNode
  title: string
  description: string
  time: string
  score: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-secondary rounded-full p-2">{icon}</div>
          <div className="flex-grow">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {time}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            {score && <p className="text-sm font-medium mt-2">{score}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleItem({
  date,
  time,
  title,
  description,
}: {
  date: string
  time: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="bg-secondary rounded-md p-2 text-center min-w-[60px]">
        <Calendar className="h-4 w-4 mx-auto mb-1" />
        <p className="text-xs font-medium">{date}</p>
      </div>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <div className="text-sm text-muted-foreground">{time}</div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
