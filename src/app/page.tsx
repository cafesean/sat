import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, BookOpen, BookText } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">SAT Study Assistant</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your personalized AI-powered study companion for SAT vocabulary, reading, and writing practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookText className="h-5 w-5" />
              Vocabulary Practice
            </CardTitle>
            <CardDescription>Build your vocabulary with AI-powered spaced repetition</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">
              Upload words to your word bank, practice with AI-generated definitions, and track your progress with
              spaced repetition technology.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/vocabulary" className="w-full">
              <Button className="w-full">Start Vocabulary Practice</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Reading & Writing
            </CardTitle>
            <CardDescription>Practice with AI-generated SAT-style questions</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground mb-4">
              Generate custom SAT-style reading and writing questions at your preferred difficulty level, with instant
              feedback and explanations.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/reading-writing" className="w-full">
              <Button className="w-full">Start Reading & Writing Practice</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-12 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Your Progress
            </CardTitle>
            <CardDescription>Track your study progress and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">Start practicing to see your progress stats here!</p>
              <Link href="/dashboard">
                <Button variant="outline">View Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
