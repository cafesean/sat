import { auth } from "@/auth";
import { ProgressStats } from "@/components/ProgressStats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, BookText } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {session ? `Welcome back, ${session.user?.name}` : 'SAT Study Assistant'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          {session ? 'Continue your SAT preparation journey' : 'Your personalized AI-powered study companion for SAT vocabulary, reading, and writing practice.'}
        </p>
      </div>

      {session ? (
        <>
          <div className="mt-12 max-w-4xl mx-auto">
            <ProgressStats userId={session.user.id} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
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
                  Continue practicing your words with AI-generated definitions and track your progress.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/vocabulary" className="w-full">
                  <Button className="w-full">Continue Vocabulary Practice</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </>
      ) : (
        <>
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
                  Sign up to access vocabulary practice with AI-generated definitions and progress tracking.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Link href="/signup" className="w-full">
                  <Button className="w-full">Sign Up to Get Started</Button>
                </Link>
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full">Already have an account? Login</Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col h-full opacity-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Reading & Writing
                </CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4">
                  SAT reading and writing practice modules will be available in a future update.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled>Coming Soon</Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}
    </main>
  )
}
