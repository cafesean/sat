'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { api } from '@/utils/trpc';
import { Skeleton } from '@/components/ui/skeleton';

type AnswerAttempt = {
  id: string;
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  createdAt: Date;
  explanation: string | null;
};

type PracticeSession = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  score: number | null;
  answerAttempts: AnswerAttempt[];
};

type PaginationData = {
  totalCount: number;
  pageCount: number;
  currentPage: number;
  limit: number;
};

export default function PracticeSessionHistoryPage() {
  const params = useParams();
  const questionSetId = params.questionSetId as string;
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 5;

  // Fetch paginated session history
  const { data, isLoading } = api.practice.getPracticeSessionHistory.useQuery({
    questionSetId,
    page,
    limit,
    includeChatHistory: false
  });

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionId(expandedSessionId === sessionId ? null : sessionId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Safely handle the API response
  const sessions = data?.sessions as PracticeSession[] | undefined;
  const pagination = data?.pagination as PaginationData | undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Practice Session History</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : sessions?.length === 0 ? (
        <p className="text-muted-foreground">No practice sessions found</p>
      ) : (
        <div className="space-y-4">
          {sessions?.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    {format(session.startTime, 'MMM d, yyyy - h:mm a')}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleSessionExpand(session.id)}
                  >
                    {expandedSessionId === session.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {session.endTime 
                        ? formatDuration(
                            Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000)
                          )
                        : 'Incomplete'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Score:</span>
                    <span className="ml-1">
                      {session.score !== null ? `${session.score}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium">Questions:</span>
                    <span className="ml-1">
                      {session.answerAttempts.length}
                    </span>
                  </div>
                </div>
              </CardContent>

              {expandedSessionId === session.id && (
                <>
                  <Separator className="my-2" />
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {session.answerAttempts.map((attempt) => (
                        <div key={attempt.id} className="border rounded-lg p-3">
                          <p className="font-medium mb-2">{attempt.questionText}</p>
                          <div className="flex items-center">
                            {attempt.isCorrect ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mr-2" />
                            )}
                            <span className="mr-2">Your answer:</span>
                            <span className="font-medium">{attempt.selectedAnswer}</span>
                          </div>
                          {!attempt.isCorrect && (
                            <div className="mt-1 text-sm">
                              <span className="text-muted-foreground">Correct answer:</span>
                              <span className="ml-2 font-medium">{attempt.correctAnswer}</span>
                            </div>
                          )}
                          {attempt.explanation && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <p>{attempt.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalCount > limit && (
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(pagination.totalCount / limit)}
          </span>
          <Button
            variant="outline"
            disabled={page * limit >= pagination.totalCount}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}