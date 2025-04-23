'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/utils/trpc';
import { useToast } from '@/hooks/use-toast';

interface AddPassageFormProps {
  questionSetId: string;
  onSuccess?: () => void;
}

export function AddPassageForm({ questionSetId, onSuccess }: AddPassageFormProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useContext();

  // Mutation to generate passage and questions via AI
  const generateMutation = api.readingWriting.generatePassageForQuestionSet.useMutation({
    onSuccess(data) {
      setContent(data.passage.content);
      toast({
        title: 'Passage generated',
        description: 'AI-generated passage and questions loaded into the form.',
        variant: 'success',
      });
    },
    onError(error) {
      toast({
        title: 'Error generating passage',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled() {
      setIsGenerating(false);
    },
  });

  // Mutation to add passage manually
  const addPassageMutation = api.readingWriting.addPassage.useMutation({
    onSuccess() {
      toast({
        title: 'Passage added',
        description: 'The passage was successfully added to the question set.',
        variant: 'success',
      });
      setContent('');
      utils.readingWriting.getQuestionSet.invalidate({ questionSetId });
      if (onSuccess) onSuccess();
    },
    onError(error) {
      toast({
        title: 'Error adding passage',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled() {
      setIsSubmitting(false);
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate({ questionSetId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: 'Validation error',
        description: 'Passage content cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    addPassageMutation.mutate({ questionSetId, content });
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Add Passage</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full rounded-md border border-gray-300 p-2 resize-y min-h-[120px]"
            placeholder="Enter passage content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isGenerating || isSubmitting}
            aria-label="Passage content"
            required
          />
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating || isSubmitting}
            >
              {isGenerating ? 'Generating...' : 'Generate via AI'}
            </Button>
            <Button type="submit" disabled={isGenerating || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Add Passage'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}