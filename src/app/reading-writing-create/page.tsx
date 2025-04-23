'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QuestionSetCreationForm from '../../components/reading-writing/QuestionSetCreationForm';

export default function CreateQuestionSetPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/reading-writing-create');
    }
  }, [status, router]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[70vh]">
        <p>Loading...</p>
      </div>
    );
  }

  // If authenticated, show the form
  if (status === 'authenticated' && session?.user) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.back()} 
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Create Question Set</h1>
        </div>
        
        <QuestionSetCreationForm onSuccess={() => router.push('/reading-writing-landing')} />
      </div>
    );
  }

  // Fallback for any other state
  return null;
}