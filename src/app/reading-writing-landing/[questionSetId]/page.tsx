'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/utils/trpc';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type QuestionSetWithPassages = {
  id: string;
  topic: string;
  description?: string | null;
  passages: {
    id: string;
    content: string;
    questions: {
      id: string;
      questionText: string;
      options: string[];
      correctAnswer: string;
      explanation: string | null;
    }[];
  }[];
};

export default function QuestionSetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const questionSetId = params.questionSetId as string;

  // Fetch Question Set Details
  const { data: questionSet, isLoading: isLoadingSet, error: setError } =
    api.readingWriting.getQuestionSet.useQuery(
      { questionSetId },
      { enabled: status === 'authenticated' && !!questionSetId }
    );

  // Fetch all question sets for the user
  const { data: questionSets, isLoading: isLoadingSets, error: setsError } = 
    api.readingWriting.listQuestionSets.useQuery(
      undefined,
      { enabled: status === 'authenticated' }
    );

  // Find current question set from the list
  const currentQuestionSet = questionSets?.questionSets?.find(
    (qs) => qs.id === questionSetId
  );

  // Loading state
  if (status === 'loading' || isLoadingSet || isLoadingSets) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2 mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Auth check
  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to view question sets.</div>;
  }

  // Error handling
  if (setError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading question set: {setError.message}</div>;
  }
  if (setsError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading question sets: {setsError.message}</div>;
  }
  if (!questionSet || !currentQuestionSet) {
    return <div className="container mx-auto p-4 text-red-500">Question set not found or access denied.</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.push('/reading-writing-landing')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Question Sets
        </Button>
        <Button 
          variant="outline"
          onClick={() => router.push(`/reading-writing-create/${questionSetId}`)}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Passage
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{currentQuestionSet.topic || 'Untitled Question Set'}</CardTitle>
        </CardHeader>
        <CardContent>
          {questionSet.passages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No passages found in this question set</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push(`/reading-writing-create/${questionSetId}`)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add First Passage
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {questionSet.passages.map((passage) => (
                <Card key={passage.id}>
                  <CardHeader>
                    <CardTitle>Passage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <WordClickable text={passage.content} bankId={questionSet.wordBankId} />
                    </div>
                    <div className="mt-4">
                      <Button 
                        variant="outline"
                        onClick={() => router.push(`/reading-writing-landing/${questionSetId}/${passage.id}`)}
                      >
                        Practice with this Passage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}