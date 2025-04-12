'use client'

import { WordBankForm } from '@/components/features/vocab/WordBankForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/utils/trpc';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation'; // Use next/navigation for App Router

export default function EditWordBankPage() {
  const params = useParams();
  const bankId = params.bankId as string; // Get bankId from route params

  // Fetch the specific word bank data
  const { data: wordBank, isLoading, error } = api.vocab.getById.useQuery(
    { id: bankId },
    {
      enabled: !!bankId, // Only run query if bankId is available
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Word Bank</CardTitle>
            <CardDescription>
              Update the name or description for this word bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-1/4" />
              </div>
            )}
            {error && (
              <div className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Error loading word bank: {error.message}</span>
              </div>
            )}
            {!isLoading && !error && wordBank && (
              // Pass fetched data as initialData to the form
              <WordBankForm initialData={wordBank} />
            )}
             {!isLoading && !error && !wordBank && (
               <p className="text-muted-foreground">Word bank not found or you don't have permission to edit it.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
