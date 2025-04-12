"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Import Label
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Textarea } from "@/components/ui/textarea";
import type { AppRouter } from "@/server/api/root";
import { api, type RouterInputs, type RouterOutputs } from "@/utils/trpc";
import type { TRPCClientErrorLike } from "@trpc/client";
import { AlertCircle, ArrowRight, Check, Loader2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react"; // Import useEffect

// Define types for mutation/query results and errors
type NextWordOutput = RouterOutputs["vocab"]["getNextVocabWord"];
type SubmitAnswerOutput = RouterOutputs["vocab"]["submitVocabAnswer"];
type SubmitAnswerInput = RouterInputs["vocab"]["submitVocabAnswer"];
type VocabApiError = TRPCClientErrorLike<AppRouter>;

export default function VocabularyPracticeSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string; // Assume sessionId is always present

  const [userSentence, setUserSentence] = useState("");
  const [selectedEase, setSelectedEase] = useState<number | null>(null); // 1=Again, 2=Hard, 3=Good, 4=Easy
  const [showFeedback, setShowFeedback] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- tRPC Hooks ---

  // Query to get the next word
  const {
    data: currentWord,
    isLoading: isLoadingWord,
    error: wordError,
    refetch: refetchWord,
  } = api.vocab.getNextVocabWord.useQuery(
    { practiceSessionId: sessionId },
    {
      enabled: !!sessionId && !isComplete, // Only run if sessionId is available and session not complete
      refetchOnWindowFocus: false, // Prevent refetching on window focus
      retry: 1, // Retry once on error
      // onSuccess callback removed as it's not a valid option here
    }
  );

  // Effect to check for session completion when data changes
  useEffect(() => {
    // Check if loading is finished and data is explicitly null
    if (!isLoadingWord && currentWord === null) {
      setIsComplete(true);
    }
  }, [currentWord, isLoadingWord]);

  // Mutation to submit the answer
  const submitAnswerMutation = api.vocab.submitVocabAnswer.useMutation({
    onSuccess: (data) => {
      setShowFeedback(true); // Show feedback panel
      setSubmitError(null);
      // Optionally trigger refetch for the next word automatically after a delay,
      // or wait for user to click "Next"
    },
    onError: (error: VocabApiError) => {
      console.error("Failed to submit answer:", error);
      setSubmitError(error.message || "Failed to submit answer. Please try again.");
      setShowFeedback(false); // Hide feedback panel on error
    },
  });

  // --- Event Handlers ---

  const handleSubmit = () => {
    if (!currentWord || !userSentence.trim() || selectedEase === null) {
      setSubmitError("Please enter a sentence and select how easy it was.");
      return;
    }
    setSubmitError(null);
    setShowFeedback(false); // Hide previous feedback

    submitAnswerMutation.mutate({
      practiceSessionId: sessionId,
      wordId: currentWord.id,
      userSentence: userSentence,
      easeChosen: selectedEase,
    });
  };

  const handleNextWord = () => {
    setShowFeedback(false);
    setUserSentence("");
    setSelectedEase(null);
    setSubmitError(null);
    refetchWord(); // Fetch the next word
  };

  // --- UI Rendering ---

  // Loading state for the word
  if (isLoadingWord) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-1/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  // Error state for fetching word
  if (wordError) {
    return (
       <main className="container mx-auto px-4 py-8">
         <div className="max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Word</AlertTitle>
              <AlertDescription>{wordError.message || "Could not load the next word. Please try again later."}</AlertDescription>
            </Alert>
             <Button onClick={() => router.push('/vocabulary')} className="mt-4">Return to Vocabulary</Button>
         </div>
       </main>
    );
  }

  // Session Complete State
  if (isComplete || !currentWord) {
     // TODO: Implement summary view using getVocabSessionSummary query
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Practice Complete!</CardTitle>
              <CardDescription>You've reviewed all due words for this session.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Loading summary...</p> {/* Placeholder */}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={() => router.push('/vocabulary')}>Return to Vocabulary</Button>
              {/* Optionally add a button to restart */}
            </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  // Main Practice UI
  const feedbackData = submitAnswerMutation.data;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
         {/* TODO: Add progress indicator if desired */}
         {/* <div className="flex justify-between items-center mb-8"> ... </div> */}

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{currentWord.text}</CardTitle>
            <CardDescription>Write a sentence using this word.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Word Details */}
            <div className="space-y-4 rounded-md border bg-muted p-4">
               <div className="space-y-1">
                 <p className="text-sm font-medium text-muted-foreground">Definition</p>
                 <p>{currentWord.definition || "N/A"}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-sm font-medium text-muted-foreground">Translation (Chinese)</p>
                 <p>{currentWord.translation || "N/A"}</p>
               </div>
            </div>

            {/* Sentence Input */}
            <div className="space-y-2">
              <Label htmlFor="sentence" className="font-medium">
                Your Sentence
              </Label>
              <Textarea
                id="sentence"
                placeholder="Type your sentence here..."
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                disabled={showFeedback || submitAnswerMutation.isPending}
                className="min-h-[100px]"
              />
            </div>

             {/* Ease Selection */}
             {!showFeedback && (
                <div className="space-y-2">
                   <Label className="font-medium">How easy was this word?</Label>
                   <div className="flex flex-wrap gap-2">
                      {[
                         { label: "Again", value: 1 },
                         { label: "Hard", value: 2 },
                         { label: "Good", value: 3 },
                         { label: "Easy", value: 4 },
                      ].map((ease) => (
                         <Button
                            key={ease.value}
                            variant={selectedEase === ease.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedEase(ease.value)}
                            disabled={submitAnswerMutation.isPending}
                         >
                            {ease.label}
                         </Button>
                      ))}
                   </div>
                </div>
             )}


            {/* Submission Error */}
            {submitError && !showFeedback && (
               <Alert variant="destructive" className="mt-4">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Submission Error</AlertTitle>
                 <AlertDescription>{submitError}</AlertDescription>
               </Alert>
            )}

            {/* Feedback Panel */}
            {showFeedback && feedbackData && (
              <div
                className={`p-4 rounded-md ${feedbackData.isCorrect ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}
              >
                <div className="flex items-start gap-3">
                  {feedbackData.isCorrect ? (
                    <Check className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{feedbackData.isCorrect ? "Correct!" : "Needs Review"}</p>
                    <p className="text-sm mt-1">{feedbackData.feedback}</p>
                    {!feedbackData.isCorrect && currentWord.sampleSentence && (
                      <div className="mt-3 pt-3 border-t border-current/30">
                        <p className="text-xs font-medium text-muted-foreground">Example Sentence:</p>
                        <p className="text-sm mt-1 italic">{currentWord.sampleSentence}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {!showFeedback ? (
              <Button
                 onClick={handleSubmit}
                 disabled={!userSentence.trim() || selectedEase === null || submitAnswerMutation.isPending}
              >
                {submitAnswerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Answer"
                )}
              </Button>
            ) : (
              <Button onClick={handleNextWord}>
                Next Word
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
