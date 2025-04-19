'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading state
import { api } from '@/utils/trpc';

export function UserDashboard() {
  const { data: wordBankCountData, isLoading: isLoadingWordBankCount, error: wordBankCountError } = api.user.getWordBankCount.useQuery();
  const { data: progressSummaryData, isLoading: isLoadingProgressSummary, error: progressSummaryError } = api.user.getUserProgressSummary.useQuery();

  if (isLoadingWordBankCount || isLoadingProgressSummary) {
    return (
      <div className="mt-12 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/4" /> {/* Skeleton for title */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-1/3" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-2/3" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (wordBankCountError || progressSummaryError) {
    return (
      <div className="mt-12 max-w-4xl mx-auto text-red-500">
        <h2 className="text-2xl font-semibold mb-4">Error Loading Dashboard</h2>
        <p>An error occurred while fetching dashboard data.</p>
        {wordBankCountError && <p>Word Bank Count Error: {wordBankCountError.message}</p>}
        {progressSummaryError && <p>Progress Summary Error: {progressSummaryError.message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Your Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Word Banks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{wordBankCountData?.count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Progress Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{progressSummaryData?.message}</p>
            {/* Display other progress summary details here when implemented */}
          </CardContent>
        </Card>
      </div>
      {/* Add other dashboard sections here */}
    </div>
  );
}