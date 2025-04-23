# Implementation Guide: Add Passage to Question Set

This document outlines the technical details for implementing the "Add Passage" functionality for the Reading & Writing module.

## 1. Backend API Implementation

### Add New Procedure to `readingWriting.ts` Router

```typescript
addPassageToQuestionSet: protectedProcedure
  .input(z.object({ 
    questionSetId: z.string(), 
    topic: z.string().optional() 
  }))
  .mutation(async ({ ctx, input }) => {
    const { questionSetId, topic } = input;
    const userId = ctx.session.user.id;

    // Verify question set exists and belongs to user
    const questionSet = await ctx.prisma.questionSet.findUnique({
      where: { id: questionSetId }
    });

    if (!questionSet || questionSet.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Question Set not found" });
    }

    // Construct prompt for Gemini API
    const prompt = `
      Create an SAT-style reading passage and questions based on the following:
      - Topic: ${topic || questionSet.topic || "general academic subject"}
      
      Requirements:
      1. Passage should be 200-300 words
      2. Include 4-5 multiple choice questions
      3. Questions should test reading comprehension and analysis
      4. Provide correct answers and explanations
      5. Use academic vocabulary and formal tone
      
      Return in JSON format:
      {
        "passage": "The passage text...",
        "questions": [
          {
            "questionText": "Question 1",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "A",
            "explanation": "Explanation..."
          }
        ]
      }
    `;

    try {
      // Call Gemini API
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048
          }
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content"
        });
      }

      const { response: responseText } = await response.json();
      
      // Parse and validate response
      const { passage, questions } = JSON.parse(responseText);
      
      if (!passage || !Array.isArray(questions)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid response format"
        });
      }

      // Store generated content in database
      const createdPassage = await ctx.prisma.passage.create({
        data: {
          content: passage,
          questionSet: {
            connect: { id: questionSetId }
          },
          questions: {
            create: questions.map((q) => ({
              questionText: q.questionText,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              questionType: "MULTIPLE_CHOICE"
            }))
          }
        },
        include: {
          questions: true
        }
      });

      return { passage: createdPassage };
    } catch (error) {
      console.error('Error generating passage and questions:', error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate content"
      });
    }
  })
```

## 2. Frontend Implementation

### Create Add Passage Page

Create a new file: `src/app/reading-writing-landing/[questionSetId]/add-passage/page.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/utils/trpc';
import { useToast } from '@/hooks/use-toast';

export default function AddPassagePage() {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const questionSetId = params.questionSetId as string;
  const { toast } = useToast();

  // Fetch current Question Set for title display
  const { data: questionSets } = api.readingWriting.listQuestionSets.useQuery(
    undefined, 
    { enabled: status === 'authenticated' }
  );
  
  const currentSet = questionSets?.questionSets?.find(set => set.id === questionSetId);

  // Add Passage Mutation
  const addPassageMutation = api.readingWriting.addPassageToQuestionSet.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Passage added successfully',
        variant: 'default',
      });
      setIsLoading(false);
      router.push(`/reading-writing-landing/${questionSetId}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add passage',
        variant: 'destructive',
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    addPassageMutation.mutate({ 
      questionSetId,
      topic: topic.trim() || undefined // Use undefined if topic is empty
    });
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

  // Auth check
  if (status === 'unauthenticated') {
    router.push('/login?callbackUrl=/reading-writing-landing');
    return null;
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-[70vh]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push(`/reading-writing-landing/${questionSetId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Question Set
        </Button>
      </div>
      
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Add Passage to Question Set</CardTitle>
          <CardDescription>
            {currentSet?.topic ? `Adding to: ${currentSet.topic}` : 'Generate a new passage'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Passage Topic (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Leave empty to use question set topic"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateRandomTopic}
                  disabled={isLoading}
                >
                  Random
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Specify a topic for this passage or leave empty to use the question set topic
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Passage...
                </>
              ) : (
                'Generate Passage'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Update Question Set Detail Page

Modify `src/app/reading-writing-landing/[questionSetId]/page.tsx` to add a clearer "Add Passage" button link:

```tsx
// Inside the component render function, update the button
<Button 
  variant="outline"
  onClick={() => router.push(`/reading-writing-landing/${questionSetId}/add-passage`)}
>
  <Plus className="mr-2 h-4 w-4" /> Add Passage
</Button>
```

## 3. Testing Steps

1. Create a new Question Set from the Reading & Writing landing page
2. Navigate to the Question Set detail page
3. Click "Add Passage" button
4. Enter a topic or leave blank and click "Generate Passage"
5. Verify passage is created with questions and displayed on the Question Set detail page
6. Verify error handling works (try with network disconnected)
7. Verify proper loading states are shown during generation

## 4. Error Handling

- Ensure timeouts are handled for long AI generations
- Check for proper error messages from the AI service
- Validate AI response format before saving to database
- Handle network errors gracefully 