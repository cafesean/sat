'use client'

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRouter } from '@/server/api/root'; // Import AppRouter for error type
import { api, type RouterOutputs } from '@/utils/trpc'; // Import api and RouterOutputs
import type { TRPCClientErrorLike } from '@trpc/client'; // Import error type
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function VocabularyPracticeSetupPage () {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([])

  // Type for individual word bank in the list
  type WordBankListItem = RouterOutputs['vocab']['listWordBanks'][number]; // Fix path

  const { data: wordBanks, isLoading: isLoadingBanks, error: banksError } = api.vocab.listWordBanks.useQuery( // Fix path
    undefined,
    {
      enabled: status === 'authenticated' // Only fetch if authenticated
    }
  )

  const startSessionMutation = api.vocab.startVocabSession.useMutation({ // Fix path
    onSuccess: (data: RouterOutputs['vocab']['startVocabSession']) => { // Fix path for type
      toast.success('Practice session started!')
      // The mutation returns { practiceSessionId: string }, adjust access accordingly
      router.push(`/vocabulary/practice/${data.practiceSessionId}`)
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(`Failed to start session: ${error.message}`)
    }
  })

  const handleCheckboxChange = (bankId: string, checked: boolean | 'indeterminate') => {
    setSelectedBankIds(prev =>
      checked === true
        ? [...prev, bankId]
        : prev.filter(id => id !== bankId)
    )
  }

  const handleStartPractice = () => {
    if (selectedBankIds.length === 0) {
      toast.warning('Please select at least one word bank to practice.')
      return
    }
    startSessionMutation.mutate({ wordBankIds: selectedBankIds })
  }

  if (status === 'loading' || isLoadingBanks) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="container mx-auto p-4">Please sign in to start practicing.</div>
  }

  if (banksError) {
    return <div className="container mx-auto p-4 text-red-500">Error loading word banks: {banksError.message}</div>
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Start Vocabulary Practice</CardTitle>
          <CardDescription>Select the word banks you want to include in this practice session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wordBanks && wordBanks.length > 0
            ? (
                wordBanks.map((bank: WordBankListItem) => ( // Add type for bank
              <div key={bank.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`bank-${bank.id}`}
                  checked={selectedBankIds.includes(bank.id)}
                  onCheckedChange={(checked) => handleCheckboxChange(bank.id, checked)}
                />
                <Label htmlFor={`bank-${bank.id}`} className="flex-grow cursor-pointer">
                  {bank.name} ({bank.wordCount} words) {/* Use wordCount directly */}
                  {bank.description && <p className="text-xs text-muted-foreground">{bank.description}</p>}
                </Label>
              </div>
                ))
              )
            : (
            <p>You haven't created any word banks yet. <a href="/vocabulary/create-bank" className="text-blue-600 hover:underline">Create one now!</a></p>
              )}
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleStartPractice}
            disabled={selectedBankIds.length === 0 || startSessionMutation.isPending} // Use isPending for mutations
          >
            {startSessionMutation.isPending ? 'Starting...' : 'Start Practice'} {/* Use isPending for mutations */}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
