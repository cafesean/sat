'use client'

import { WordBankForm } from '@/components/features/vocab/WordBankForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWordBanks } from '@/hooks/useWordBanks';
import { AlertCircle } from 'lucide-react';
import { useParams } from 'next/navigation'; // Use next/navigation for App Router

export default function EditWordBankPage() {
  const params = useParams();
  const bankId = params.bankId as string;

  // Use offline-first hook
  const { wordBanks, isLoading, error } = useWordBanks('');
  const wordBank = wordBanks?.find(b => b.id === bankId);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Word Bank</CardTitle>
            <CardDescription>
              Edit the details for your word bank. Changes aren't saved automatically.
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
                <span>Error loading word bank: {error}</span>
              </div>
            )}
            {!isLoading && !error && wordBank && (
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
