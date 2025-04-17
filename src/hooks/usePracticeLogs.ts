import { addPracticeLog, db, getPracticeLogsByBank, PracticeLog, queueMutation } from '@/lib/storage';
import { api, type RouterOutputs } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Define type for remote log data item
type RemotePracticeLogItem = RouterOutputs['vocab']['listPracticeLogs']['logs'][number];

// Normalization function remains mostly the same
function normalizePracticeLog(remote: RemotePracticeLogItem): PracticeLog {
  const userId = remote.practiceSession?.userId;
  if (!userId) {
    console.error("Practice log missing userId via session relation:", remote.id);
  }
  return {
    id: remote.id,
    wordId: remote.wordId,
    bankId: remote.practiceSession?.wordBankId ?? '',
    userId: userId ?? 'unknown-user',
    practicedAt: typeof remote.timestamp === 'string' ? remote.timestamp : new Date(remote.timestamp).toISOString(),
    result: remote.isCorrect ? 'correct' : 'incorrect',
  };
}

// Hook refactored for infinite query
export function usePracticeLogs(bankId: string) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [localLogsLoaded, setLocalLogsLoaded] = useState(false);
  const [initialLocalLogs, setInitialLocalLogs] = useState<PracticeLog[] | null>(null);
  const [shouldFetchRemote, setShouldFetchRemote] = useState(false);
  
  // Don't proceed if no userId or bankId
  useEffect(() => {
    if (!userId || !bankId) {
      setInitialLocalLogs([]);
      setLocalLogsLoaded(true);
    }
  }, [userId, bankId]);

  // --- Infinite Query for fetching logs ---
  const infiniteQuery = api.vocab.listPracticeLogs.useInfiniteQuery(
    { bankId: bankId || undefined, limit: 20 }, // Fetch 20 per page
    {
      enabled: !!userId && localLogsLoaded && shouldFetchRemote, // Only enable when explicitly needed
      getNextPageParam: (lastPage) => lastPage.nextCursor, // Use the cursor returned by the API
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes staleness
    }
  );

  // --- Effect to load initial data from IndexedDB ---
  // This helps show *something* quickly while the network request happens.
  // We don't sync *back* from the infinite query for simplicity here.
  useEffect(() => {
    let cancelled = false;
    async function loadInitialLocalLogs() {
      if (!userId || !bankId || localLogsLoaded) return; // Only run once per user/bankId combo

      console.log(`Fetching initial local practice logs ${bankId ? `for bank ${bankId}` : 'for user'}...`);
      try {
        let localData: PracticeLog[];
        if (bankId) {
          localData = await getPracticeLogsByBank(bankId);
        } else {
          // Fetch recent logs locally, maybe limit this?
          localData = await db.practiceLogs.orderBy('practicedAt').reverse().limit(50).toArray();
        }
        if (!cancelled) {
          setInitialLocalLogs(localData);
          console.log(`Found ${localData?.length ?? 0} initial logs locally.`);
          
          // Only fetch remote if necessary (empty local data or has enough time passed)
          setShouldFetchRemote(!localData || localData.length === 0);
          setLocalLogsLoaded(true); // Mark local load attempt complete
        }
      } catch (e: any) {
        console.error('Failed to load initial local practice logs:', e);
        // Don't set global error, let infinite query handle network errors
        if (!cancelled) {
          setShouldFetchRemote(true); // Try to fetch remote on local error
          setLocalLogsLoaded(true); // Mark local load attempt complete
        }
      }
    }
    loadInitialLocalLogs();
    return () => { 
      console.log(`Cleaning up usePracticeLogs for bank ${bankId}`);
      cancelled = true; 
    };
  }, [userId, bankId]); // Remove localLogsLoaded from dependencies

  // --- Add Practice Log (Optimistic Update for Local State) ---
  // Note: This optimistically adds to the *local* state, but doesn't directly
  // interact with the infinite query's cache. The log will appear correctly
  // once the relevant query page is refetched or invalidated after sync.
  const add = useCallback(async (log: Omit<PracticeLog, 'id'>) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    const tempId = `temp-log-${Date.now()}`;
    const optimisticLog: PracticeLog = { ...log, id: tempId };

    // Optimistically update the initial local logs state if needed
    setInitialLocalLogs((prev) => [optimisticLog, ...(prev ?? [])]);

    try {
      await addPracticeLog(optimisticLog); // Add locally

      if (!navigator.onLine) {
        await queueMutation({
          type: 'practiceLog/add',
          payload: log,
          userId
        });
        toast.info("Offline: Practice log queued.");
      }
      // No direct tRPC call needed here as log creation is part of submitVocabAnswer
    } catch (localError: any) {
      console.error("Failed to add practice log locally:", localError);
      toast.error(`Local log add failed: ${localError.message}`);
      // Revert optimistic update to initialLocalLogs
      setInitialLocalLogs((prev) => prev?.filter(l => l.id !== tempId) ?? null);
    }
  }, [userId]);

  // Combine initial local logs with potentially fetched remote logs for display
  // Prioritize remote data once available to avoid showing stale local data indefinitely
  const combinedLogs = infiniteQuery.data?.pages.flatMap(page => page.logs.map(normalizePracticeLog)) ?? initialLocalLogs ?? [];

  return {
    logs: combinedLogs, // The combined list to display
    isLoading: infiniteQuery.isLoading || !localLogsLoaded, // Loading if query is loading OR local haven't loaded
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    error: infiniteQuery.error?.message ?? null, // Report error from infinite query
    add, // Keep the add function for optimistic local updates
  };
}
