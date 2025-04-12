'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { AppRouter } from '@/server/api/root';
import { api, type RouterOutputs } from '@/utils/trpc';
import type { TRPCClientErrorLike } from '@trpc/client';
import { CheckCircle2, LogOut, XCircle } from 'lucide-react'; // Import icons
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define types for clarity
type VocabWord = RouterOutputs['vocab']['getNextVocabWord'];
type EaseLevel = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'; // Corresponds to SRS logic

export default function VocabularyPracticeSessionPage () {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const sessionId = params.sessionId as string // Get session ID from URL

  const [userSentence, setUserSentence] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState<{ isCorrect: boolean, feedback: string } | null>(null)
  const [isSessionComplete, setIsSessionComplete] = useState(false) // State to track completion
  const [wordsAnsweredCount, setWordsAnsweredCount] = useState(0); // State for word counter

  // Fetch the next word for the session
  const {
    data: currentWord,
    isLoading: isLoadingWord,
    error: wordError,
    refetch: refetchNextWord
  } = api.vocab.getNextVocabWord.useQuery(
    { practiceSessionId: sessionId },
    {
      enabled: status === 'authenticated' && !!sessionId && !showFeedback, // Only fetch if authenticated, session ID exists, and not showing feedback
      refetchOnWindowFocus: false, // Prevent refetching on window focus
      retry: false // Don't retry automatically if fetching fails (e.g., session complete)
      // Remove invalid onSuccess/onError from useQuery
    }
  )

  // Effect to check for session completion based on query result
  useEffect(() => {
    // Check after the query has potentially finished (isLoading is false)
    if (!isLoadingWord) {
      if (currentWord === null || wordError?.data?.code === 'NOT_FOUND') {
        setIsSessionComplete(true);
      }
    }
  }, [currentWord, wordError, isLoadingWord]); // Depend on query state

  // Fetch session summary when session is marked as complete
  const {
    data: sessionSummary,
    isLoading: isLoadingSummary,
    error: summaryError
  } = api.vocab.getVocabSessionSummary.useQuery(
    { practiceSessionId: sessionId },
    {
      enabled: isSessionComplete // Only fetch summary when session is complete
    }
  )

  // Mutation for submitting the answer
  const submitAnswerMutation = api.vocab.submitVocabAnswer.useMutation({
    onSuccess: (data) => {
      setFeedbackData({ isCorrect: data.isCorrect, feedback: data.feedback })
      setShowFeedback(true)
      setWordsAnsweredCount(prev => prev + 1); // Increment counter on success
      // Don't refetch next word immediately, wait for user to click "Next"
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(`Failed to submit answer: ${error.message}`)
    }
  })

  const handleSentenceSubmit = (ease: EaseLevel) => {
    if (!currentWord) {
      toast.error('No current word to practice.')
      return
    }
    if (!userSentence.trim()) {
      toast.warning('Please enter a sentence.')
      return
    }

    // Map EaseLevel string to number based on schema
    const easeMap: Record<EaseLevel, number> = {
      AGAIN: 1,
      HARD: 2,
      GOOD: 3,
      EASY: 4
    };
    const easeNumber = easeMap[ease];

    submitAnswerMutation.mutate({
      practiceSessionId: sessionId,
      wordId: currentWord.id,
      userSentence: userSentence.trim(),
      easeChosen: easeNumber // Pass the mapped number
    })
  }

  const handleNextWord = () => {
    setUserSentence('') // Clear textarea
    setShowFeedback(false) // Hide feedback
    setFeedbackData(null) // Clear feedback data
    refetchNextWord() // Fetch the next word
  }

  // --- Render Logic ---

  if (status === 'loading') {
    return <div className="container mx-auto p-4"><Skeleton className="h-64 w-full" /></div>
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to practice.</div>
  }

  // Handle Session Completion display
  if (isSessionComplete) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Practice Complete!</CardTitle>
            <CardDescription>Here's how you did in this session.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            {summaryError && (
              <p className="text-red-500">Error loading summary: {summaryError.message}</p>
            )}
            {sessionSummary && !isLoadingSummary && (
              <div className="space-y-1 text-sm">
                <p><strong>Total Words Reviewed:</strong> {sessionSummary.totalWords}</p>
                <p><strong>Correct Answers:</strong> {sessionSummary.correctCount}</p>
                <p><strong>Accuracy:</strong> {sessionSummary.accuracy}%</p>
                {/* Optionally display logs: sessionSummary.logs */}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/vocabulary')}>Back to Vocabulary</Button>
            </CardFooter>
        </Card>
      </div>
    )
  }

  // Handle other word loading errors after checking for completion
  if (wordError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading next word: {wordError.message}</div>
  }

  // Show skeleton only on initial word load
  if (isLoadingWord && !currentWord) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  // --- Main Practice UI ---
  return (
    <div className="container mx-auto p-4">
      {/* Top Bar: Counter and End Button */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          Words Answered: {wordsAnsweredCount}
        </span>
        <Button variant="outline" size="sm" onClick={() => router.push('/vocabulary')}>
          <LogOut className="mr-2 h-4 w-4" />
          End Session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{currentWord?.text}</CardTitle>
          {/* Optionally show definition/translation later */}
          <CardDescription>Write a sentence using the word above.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Textarea
            placeholder="Type your sentence here..."
            value={userSentence}
            onChange={(e) => setUserSentence(e.target.value)}
            rows={4}
            disabled={showFeedback || submitAnswerMutation.isPending}
            className="text-base" // Increase text size
          />

          {/* Use Alert component for feedback */}
          {showFeedback && feedbackData && (
            <Alert> {/* Remove variant */}
              <div className="flex items-center gap-2"> {/* Flex container for icon and title */}
                {feedbackData.isCorrect
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <XCircle className="h-5 w-5 text-red-600" />
                }
                <AlertTitle className="font-bold">
                  {feedbackData.isCorrect ? 'Correct!' : 'Needs Improvement'}
                </AlertTitle>
              </div>
              <AlertDescription className="mt-1 pl-7 text-base"> {/* Indent description, increase size */}
                {feedbackData.feedback}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {showFeedback
            ? (
            <Button onClick={handleNextWord} className="w-full sm:w-auto">Next Word</Button>
              )
            : (
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full">
              <Button variant="destructive" onClick={() => handleSentenceSubmit('AGAIN')} disabled={submitAnswerMutation.isPending}>Again</Button>
              <Button variant="secondary" onClick={() => handleSentenceSubmit('HARD')} disabled={submitAnswerMutation.isPending}>Hard</Button>
              <Button variant="secondary" onClick={() => handleSentenceSubmit('GOOD')} disabled={submitAnswerMutation.isPending}>Good</Button>
              <Button variant="default" onClick={() => handleSentenceSubmit('EASY')} disabled={submitAnswerMutation.isPending}>Easy</Button>
            </div>
              )}
        </CardFooter>
      </Card>
    </div>
  )
}
