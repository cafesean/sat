'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../utils/trpc';
import { useToast } from '../../hooks/use-toast';

interface QuestionSetCreationFormProps {
  onSuccess?: () => void;
}

export default function QuestionSetCreationForm({ onSuccess }: QuestionSetCreationFormProps) {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const createQuestionSetMutation = api.readingWriting.createQuestionSet.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Question set created successfully',
        variant: 'default',
      });
      setTopic('');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/reading-writing-landing');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create question set',
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a topic',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    createQuestionSetMutation.mutate({ topic });
  };

  const generateRandomTopic = () => {
    const topics = [
      'Climate Change',
      'Space Exploration',
      'Artificial Intelligence',
      'Renewable Energy',
      'Global Health',
      'Ocean Conservation',
      'Digital Privacy',
      'Cultural Diversity',
      'Sustainable Agriculture',
      'Future of Transportation',
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    setTopic(randomTopic);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
            Topic
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a topic for your question set"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={generateRandomTopic}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isLoading}
            >
              Random
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Question Set'}
        </button>
      </form>
    </div>
  );
}