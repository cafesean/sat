# Implementation Guide: Practice Session

This document outlines the technical details for implementing the practice session functionality for the Reading & Writing module.

## 1. Backend API Implementation

### 1.1 Start Practice Session API

Modify the existing `startReadingWritingSession` procedure in `readingWriting.ts`:

```typescript
startReadingWritingSession: protectedProcedure
  .input(z.object({
    questionSetId: z.string(),
    passageId: z.string() // Add passageId parameter to specify which passage to practice
  }))
  .mutation(async ({ ctx, input }) => {
    const { questionSetId, passageId } = input;
    const userId = ctx.session.user.id;

    // Verify question set exists and belongs to user
    const questionSet = await ctx.prisma.questionSet.findUnique({
      where: { id: questionSetId },
      include: { passages: true }
    });

    if (!questionSet || questionSet.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Question Set not found" });
    }

    // Verify passageId exists and belongs to this question set
    const passage = await ctx.prisma.passage.findUnique({
      where: { id: passageId },
      include: { questions: true }
    });

    if (!passage || passage.questionSetId !== questionSetId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Passage not found in this question set" });
    }

    // Create new practice session
    const session = await ctx.prisma.practiceSession.create({
      data: {
        userId,
        type: "READING_WRITING",
        questionSetId,
        passage: {
          connect: { id: passageId }
        },
        // Initialize empty userAnswers
        userAnswers: JSON.stringify({
          answers: [],
          score: 0,
          totalAnswered: 0,
          totalCorrect: 0
        })
      },
      include: {
        passage: {
          include: {
            questions: true
          }
        }
      }
    });

    return { session };
  }),
```

### 1.2 Answer Submission API

Update the `submitAnswerAttempt` procedure:

```typescript
submitAnswerAttempt: protectedProcedure
  .input(z.object({
    sessionId: z.string(),
    questionId: z.string(),
    selectedAnswer: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    const { sessionId, questionId, selectedAnswer } = input;
    const userId = ctx.session.user.id;

    // Verify session exists and belongs to user
    const session = await ctx.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        passage: {
          include: { questions: true }
        }
      }
    });

    if (!session || session.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
    }

    // Get question from session to check answer
    const question = session.passage?.questions.find(q => q.id === questionId);
    
    if (!question) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Question not found in session" });
    }

    // Check if answer is correct
    const isCorrect = selectedAnswer === question.correctAnswer;

    // Create answer attempt
    const attempt = await ctx.prisma.answerAttempt.create({
      data: {
        practiceSessionId: sessionId,
        questionId,
        userId,
        selectedAnswer,
        isCorrect
      }
    });

    // Get existing answers from session
    let userAnswers;
    try {
      userAnswers = session.userAnswers ? JSON.parse(session.userAnswers as string) : { answers: [], score: 0, totalAnswered: 0, totalCorrect: 0 };
    } catch (e) {
      userAnswers = { answers: [], score: 0, totalAnswered: 0, totalCorrect: 0 };
    }

    // Add new answer
    userAnswers.answers.push({
      questionId,
      selectedAnswer,
      isCorrect,
      timestamp: new Date().toISOString()
    });

    // Update stats
    userAnswers.totalAnswered = userAnswers.answers.length;
    userAnswers.totalCorrect = userAnswers.answers.filter(a => a.isCorrect).length;
    userAnswers.score = Math.round((userAnswers.totalCorrect / userAnswers.totalAnswered) * 100);

    // Update session
    await ctx.prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        userAnswers: JSON.stringify(userAnswers),
        score: userAnswers.score,
        // If all questions are answered, set endTime
        endTime: userAnswers.totalAnswered === session.passage?.questions.length 
          ? new Date() 
          : undefined
      }
    });

    // Return detailed response with feedback
    return { 
      attempt, 
      isCorrect, 
      explanation: question.explanation,
      correctAnswer: question.correctAnswer,
      score: userAnswers.score,
      totalAnswered: userAnswers.totalAnswered,
      totalCorrect: userAnswers.totalCorrect,
      isComplete: userAnswers.totalAnswered === session.passage?.questions.length
    };
  }),
```

### 1.3 Get Practice Session API

Use the existing `getReadingWritingSession` procedure:

```typescript
getReadingWritingSession: protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { sessionId } = input;
    const userId = ctx.session.user.id;

    const session = await ctx.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        passage: {
          include: { questions: true }
        },
        answerAttempts: true
      }
    });

    if (!session || session.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
    }

    return session;
  }),
```

## 2. Frontend Implementation

### 2.1 Practice Session Page

Create a new file: `src/app/reading-writing-landing/[questionSetId]/[passageId]/practice/page.tsx`

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/utils/trpc';
import { useToast } from '@/hooks/use-toast';

export default function PracticeSessionPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const questionSetId = params.questionSetId as string;
  const passageId = params.passageId as string;
  const [practiceSessionId, setPracticeSessionId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  // Start session mutation
  const startSessionMutation = api.readingWriting.startReadingWritingSession.useMutation({
    onSuccess: (data) => {
      setPracticeSessionId(data.session.id);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start practice session',
        variant: 'destructive',
      });
      router.push(`/reading-writing-landing/${questionSetId}`);
    }
  });

  // Answer submission mutation
  const submitAnswerMutation = api.readingWriting.submitAnswerAttempt.useMutation({
    onSuccess: (result) => {
      setSubmissionResult(result);
      setSubmitted(true);
      
      if (result.isComplete) {
        setIsComplete(true);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit answer',
        variant: 'destructive',
      });
    }
  });

  // Fetch session data
  const { data: practiceSession, isLoading: isLoadingSession } = api.readingWriting.getReadingWritingSession.useQuery(
    { sessionId: practiceSessionId! },
    { 
      enabled: !!practiceSessionId,
      refetchInterval: false,
      refetchOnWindowFocus: false
    }
  );

  // Start session when page loads
  useEffect(() => {
    if (status === 'authenticated' && questionSetId && passageId) {
      startSessionMutation.mutate({ questionSetId, passageId });
    }
  }, [status, questionSetId, passageId]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  // Handle answer submission
  const handleSubmit = () => {
    if (!selectedAnswer || !practiceSessionId) return;
    
    const currentQuestion = practiceSession?.passage?.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    submitAnswerMutation.mutate({
      sessionId: practiceSessionId,
      questionId: currentQuestion.id,
      selectedAnswer
    });
  };

  // Move to next question
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setSubmitted(false);
    setSubmissionResult(null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  // Complete session
  const handleFinish = () => {
    router.push(`/reading-writing-landing/${questionSetId}`);
  };

  // Auth check
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/reading-writing-landing');
    return null;
  }

  // Loading states
  if (status === 'loading' || startSessionMutation.isLoading || isLoadingSession) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[70vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading practice session...</p>
        </div>
      </div>
    );
  }

  // If session failed to load
  if (!practiceSession && practiceSessionId) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500 mb-4">Failed to load practice session</p>
        <Button 
          variant="outline" 
          onClick={() => router.push(`/reading-writing-landing/${questionSetId}`)}
        >
          Return to Question Set
        </Button>
      </div>
    );
  }

  const currentQuestion = practiceSession?.passage?.questions[currentQuestionIndex];
  const totalQuestions = practiceSession?.passage?.questions.length || 0;

  // Practice session complete view
  if (isComplete) {
    return (
      <div className="container mx-auto p-4">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Practice Session Complete!</CardTitle>
            <CardDescription>
              You've completed all {totalQuestions} questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <p className="text-4xl font-bold mb-2">{submissionResult?.score}%</p>
              <p>Score</p>
              
              <div className="flex justify-center gap-8 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold">{submissionResult?.totalCorrect}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold">{totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleFinish}>
              Return to Question Set
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/reading-writing-landing/${questionSetId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit Practice
        </Button>
        <div className="text-sm">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
      </div>

      {/* Passage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Passage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none dark:prose-invert">
            {practiceSession?.passage?.content}
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
            <CardDescription>{currentQuestion.questionText}</CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <RadioGroup 
                value={selectedAnswer || ""} 
                onValueChange={handleAnswerSelect}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="cursor-pointer">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = option === selectedAnswer;
                  const isCorrect = option === currentQuestion.correctAnswer;
                  
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center p-2 rounded-md ${
                        isSelected && isCorrect ? "bg-green-100 dark:bg-green-900/20" : 
                        isSelected && !isCorrect ? "bg-red-100 dark:bg-red-900/20" : 
                        isCorrect ? "bg-green-50 dark:bg-green-900/10" : ""
                      }`}
                    >
                      <div className="mr-2">
                        {isSelected && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                        {!isSelected && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                      </div>
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          <Separator className="my-2" />
          <CardFooter className="flex flex-col items-start pt-4">
            {submitted ? (
              <>
                <div className={`mb-4 p-3 rounded-md w-full ${
                  submissionResult?.isCorrect ? "bg-green-50 dark:bg-green-900/10" : "bg-red-50 dark:bg-red-900/10"
                }`}>
                  <p className={`font-semibold mb-1 ${
                    submissionResult?.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}>
                    {submissionResult?.isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  <p>{currentQuestion.explanation}</p>
                </div>
                <Button 
                  onClick={
                    currentQuestionIndex < totalQuestions - 1 
                      ? handleNextQuestion 
                      : handleFinish
                  }
                >
                  {currentQuestionIndex < totalQuestions - 1 
                    ? "Next Question" 
                    : "Complete Session"
                  }
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!selectedAnswer || submitAnswerMutation.isLoading}
              >
                {submitAnswerMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Answer"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
```

### 2.2 Update Question Set Detail Page

Add a clear link to start practice sessions with specific passages:

```tsx
// Inside the passage mapping function in the Question Set detail page
<Button 
  variant="primary"
  onClick={() => router.push(`/reading-writing-landing/${questionSetId}/${passage.id}/practice`)}
>
  Practice with this Passage
</Button>
```

## 3. Testing Steps

1. Create a Question Set
2. Add a Passage to the Question Set
3. Navigate to the Question Set detail page
4. Click "Practice with this Passage" for a passage
5. Verify the passage and first question appear
6. Test answer submission:
   - Select an answer and submit
   - Verify feedback (correct/incorrect) is shown
   - Verify explanation is displayed
   - Navigate to next question
7. Complete all questions
8. Verify session completion screen shows score
9. Return to Question Set detail page

## 4. Error Handling

- Handle authentication errors and redirect to login
- Manage session state properly if user refreshes or navigates away
- Provide proper loading states during API calls
- Show meaningful error messages for API failures 