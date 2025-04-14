'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'; // Import Popover
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { AppRouter } from '@/server/api/root';
import { api, type RouterOutputs } from '@/utils/trpc';
import type { TRPCClientErrorLike } from '@trpc/client';
import { CheckCircle2, Lightbulb, LogOut, XCircle } from 'lucide-react'; // Import Lightbulb, Loader2
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define types for clarity
type VocabWord = RouterOutputs['vocab']['getNextVocabWord'];
type EaseLevel = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'; // Corresponds to SRS logic
type HintData = RouterOutputs['vocab']['getWordHint'];

// Hint Component within Popover
function HintDisplay({ wordId }: { wordId: string }) {
  const { data: hint, isLoading, error } = api.vocab.getWordHint.useQuery(
    { wordId },
    // Keep enabled: true, let Popover control mounting/unmounting
  );

  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-16 w-full" /></div>;
  }
  if (error) {
    return <p className="p-4 text-sm text-destructive">Error loading hint: {error.message}</p>;
  }
  if (!hint) {
    // This case handles if the query itself returns null/undefined, e.g., word not found
    return <p className="p-4 text-sm text-muted-foreground">Hint data could not be loaded.</p>;
  }

  // Check if *any* hint data exists
  const hasAnyHint = hint.wordType || hint.definition || hint.sampleSentence || hint.translation;

  return (
    <div className="p-4 space-y-2 text-sm">
      {hasAnyHint ? (
        <>
          {hint.wordType ? <p><strong>Type:</strong> {hint.wordType}</p> : <p className="text-xs text-muted-foreground italic">Word type not available.</p>}
          {hint.definition ? <p><strong>Definition:</strong> {hint.definition}</p> : <p className="text-xs text-muted-foreground italic">Definition not available.</p>}
          {hint.sampleSentence ? <p><strong>Example:</strong> <em>{hint.sampleSentence}</em></p> : <p className="text-xs text-muted-foreground italic">Example sentence not available.</p>}
          {hint.translation ? <p><strong>Translation:</strong> {hint.translation}</p> : <p className="text-xs text-muted-foreground italic">Translation not available.</p>}
        </>
      ) : (
        // This case handles if the query succeeded but returned an object with all null/empty fields
        <p className="text-sm text-muted-foreground">No hint details found for this word.</p>
      )}
    </div>
  );
}


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
  const [isHintPopoverOpen, setIsHintPopoverOpen] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [isPracticeMode] = useState(true); // Always true for practice sessions

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
    }
  )

  // Effect to check for session completion based on query result
  useEffect(() => {
    if (!isLoadingWord) {
      if (currentWord === null || wordError?.data?.code === 'NOT_FOUND') {
        setIsSessionComplete(true);
      }
    }
  }, [currentWord, wordError, isLoadingWord]);

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
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(`Failed to submit answer: ${error.message}`)
    }
  })

  const handleSentenceSubmit = () => {
    if (!currentWord) {
      toast.error('No current word to practice.')
      return
    }
    if (!userSentence.trim()) {
      toast.warning('Please enter a sentence.')
      return
    }

    submitAnswerMutation.mutate({
      practiceSessionId: sessionId,
      wordId: currentWord.id,
      userSentence: userSentence.trim(),
      easeChosen: hintUsed ? 1 : 3 // Mark as AGAIN if hint was used, otherwise GOOD
    })
    setHintUsed(false); // Reset hint tracking
  }

  const handleNextWord = () => {
    setUserSentence('')
    setShowFeedback(false)
    setFeedbackData(null)
    setIsHintPopoverOpen(false); // Close hint popover on next word
    refetchNextWord()
  }

  // --- Render Logic ---

  if (status === 'loading') {
    return <div className="container mx-auto p-4"><Skeleton className="h-64 w-full" /></div>
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to practice.</div>
  }

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

  if (wordError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading next word: {wordError.message}</div>
  }

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
          <div className="flex justify-between items-start">
            <CardTitle className="text-3xl font-bold">{currentWord?.text}</CardTitle>
            {/* Hint Button & Popover */}
            {currentWord && (
              <Popover open={isHintPopoverOpen} onOpenChange={(open) => {
                setIsHintPopoverOpen(open);
                if (open) setHintUsed(true);
              }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Lightbulb className="mr-2 h-4 w-4" /> Hint
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  {/* Render HintDisplay only when popover is open */}
                  {isHintPopoverOpen && <HintDisplay wordId={currentWord.id} />}
                </PopoverContent>
              </Popover>
            )}
          </div>
          <CardDescription className="mt-2">Write a sentence using the word above.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Textarea
            placeholder="Type your sentence here..."
            value={userSentence}
            onChange={(e) => setUserSentence(e.target.value)}
            rows={4}
            disabled={showFeedback || submitAnswerMutation.isPending}
            className="text-base"
          />

          {showFeedback && feedbackData && (
            <Alert>
              <div className="flex items-center gap-2">
                {feedbackData.isCorrect
                  ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                  : <XCircle className="h-5 w-5 text-red-600" />
                }
                <AlertTitle className="font-bold">
                  {feedbackData.isCorrect ? 'Correct!' : 'Needs Improvement'}
                </AlertTitle>
              </div>
              <AlertDescription className="mt-1 pl-7 text-base">
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
              <Button
                onClick={handleSentenceSubmit}
                disabled={submitAnswerMutation.isPending}
                className="w-full"
              >
                Submit Answer
              </Button>
            </div>
              )}
        </CardFooter>
      </Card>
    </div>
  )
}
