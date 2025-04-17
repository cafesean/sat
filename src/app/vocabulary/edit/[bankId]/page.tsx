'use client'

import { WordBankForm } from '@/components/features/vocab/WordBankForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWordBanks } from '@/hooks/useWordBanks';
import { AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react'; // Import useSession
import { useParams } from 'next/navigation'; // Use next/navigation for App Router

export default function EditWordBankPage() {
  const params = useParams();
  const bankId = params.bankId as string;
  const { data: session, status } = useSession(); // Get session
  const userId = session?.user?.id; // Get user ID

  // Use offline-first hook with the actual userId
  // The hook handles the case where userId might be initially undefined
  const { wordBanks, isLoading, error } = useWordBanks(userId ?? '');
  const wordBank = wordBanks?.find(b => b.id === bankId);

  // Handle loading and unauthenticated states
  if (status === 'loading' || (status === 'authenticated' && isLoading && !wordBank)) {
     return (
       <main className="container mx-auto px-4 py-8">
         <div className="max-w-2xl mx-auto">
           <Card>
             <CardHeader>
               <Skeleton className="h-8 w-3/4" />
               <Skeleton className="h-4 w-1/2" />
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 <Skeleton className="h-10 w-1/3" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-20 w-full" />
                 <Skeleton className="h-10 w-1/4" />
               </div>
             </CardContent>
           </Card>
         </div>
       </main>
     );
   }

   if (status === 'unauthenticated') {
     return <p className="container mx-auto px-4 py-8 text-center">Please sign in to edit word banks.</p>;
   }

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
            {/* Remove the explicit isLoading check here as it's handled above */}
            {error && (
              <div className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>Error loading word bank: {error}</span>
              </div>
            )}
            {/* Render form only if authenticated, not loading, no error, and bank found */}
            {status === 'authenticated' && !isLoading && !error && wordBank && (
              <WordBankForm initialData={wordBank} />
            )}
            {/* Render not found message if authenticated, not loading, no error, but bank not found */}
            {status === 'authenticated' && !isLoading && !error && !wordBank && (
              <p className="text-muted-foreground text-center">Word bank not found or you don't have permission to edit it.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
