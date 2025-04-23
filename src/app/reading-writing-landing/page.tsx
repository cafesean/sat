'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/trpc';

export default function ReadingWritingLandingPage() {
  const router = useRouter();

  const { data: questionSetsData, isLoading, error } = api.readingWriting.listQuestionSets.useQuery();
  const startSessionMutation = api.readingWriting.startReadingWritingSession.useMutation();

  const handleSelectQuestionSet = async (questionSetId: string) => {
    try {
      const session = await startSessionMutation.mutateAsync({ questionSetId });
      router.push(`/reading-writing-landing/${session.session.id}`);
    } catch (error) {
      console.error('Error starting session:', error);
      // TODO: Display error message to user
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading Question Sets...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error loading Question Sets: {error.message}</div>;
  }

  const questionSets = questionSetsData?.questionSets || [];

  // Define the type for question sets
  interface QuestionSet {
    id: string;
    topic: string;
    createdAt: string | Date;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reading & Writing Practice</h1>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Available Question Sets:</h2>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => router.push('/reading-writing-create')}
          >
            Create New Question Set
          </button>
        </div>
        {questionSets.length === 0 ? (
          <p>No question sets available yet.</p>
        ) : (
          <ul>
            {questionSets.map((set: QuestionSet) => (
              <li key={set.id} className="mb-2 p-3 border rounded-md cursor-pointer hover:bg-gray-100" onClick={() => handleSelectQuestionSet(set.id)}>
                <h3 className="text-lg font-medium">{set.topic}</h3>
                <p className="text-sm text-gray-600">Created: {new Date(set.createdAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}