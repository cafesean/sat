import { addWordBank, db, getWordBanks, queueMutation, WordBank } from '@/lib/storage'; // Import addWordBank and queueMutation
import { api, type RouterOutputs } from '@/utils/trpc';
import { useSession } from 'next-auth/react'; // Import useSession
import { useCallback, useEffect, useRef, useState } from 'react'; // Combined imports + useRef
import { toast } from 'sonner'; // Import toast

// Simple staleness check: 5 minutes
const STALE_MS = 5 * 60 * 1000; // Keep only one definition

// Type for the data returned by the listWordBanks tRPC query
type RemoteWordBank = RouterOutputs['vocab']['listWordBanks'][number];

// Updated normalization function to include all fields
function normalizeWordBank(remote: RemoteWordBank): WordBank {
  return {
    id: remote.id,
    name: remote.name,
    description: remote.description ?? undefined,
    createdAt: typeof remote.createdAt === 'string' ? remote.createdAt : new Date(remote.createdAt).toISOString(),
    updatedAt: typeof remote.updatedAt === 'string' ? remote.updatedAt : new Date(remote.updatedAt).toISOString(),
    userId: remote.userId,
    // Add the calculated fields
    wordCount: remote.wordCount,
    masteryPercentage: remote.masteryPercentage,
    lastPracticedAt: remote.lastPracticedAt ? (typeof remote.lastPracticedAt === 'string' ? remote.lastPracticedAt : new Date(remote.lastPracticedAt).toISOString()) : null,
  };
}

export function useWordBanks(userId: string) {
  const [wordBanks, setWordBanks] = useState<WordBank[] | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0); // Track timestamp of last successful fetch
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wordBanksRef = useRef(wordBanks); // Ref to hold current wordBanks state

  // Keep ref updated with the latest state
  useEffect(() => {
    wordBanksRef.current = wordBanks;
  }, [wordBanks]);

  // tRPC query for fetching remote data
  // Keep enabled: false initially, trigger manually via refetch
  const trpcQuery = api.vocab.listWordBanks.useQuery(undefined, {
    enabled: false,
    staleTime: STALE_MS, // Use tRPC's staleness concept
  });
  const { refetch: refetchWordBanks } = trpcQuery; // Destructure for stable reference

  // Function to fetch from remote and update local DB + state
  const fetchAndSyncRemote = useCallback(async (currentLocalData: WordBank[] | null) => {
    if (!userId) return; // Don't fetch if userId isn't available
    console.log('Attempting to fetch remote word banks...');
    setError(null); // Clear previous errors
    try {
      const { data: remoteData, isError, error: remoteError } = await refetchWordBanks();

      if (isError) {
        throw remoteError || new Error('Unknown error fetching remote data');
      }

      if (remoteData) {
        console.log(`Fetched ${remoteData.length} banks from server.`);
        const normalizedBanks = remoteData.map(normalizeWordBank);

        // Use bulkPut for efficient upsert
        await db.wordBanks.bulkPut(normalizedBanks);
        console.log('Synced remote banks to IndexedDB.');

        // Re-fetch from local DB to ensure state reflects the actual stored data
        const updatedLocalData = await getWordBanks(userId);

        // More robust check: compare lengths and sorted IDs
        const currentIds = wordBanksRef.current?.map(b => b.id).sort().join(',') ?? '';
        const updatedIds = updatedLocalData?.map(b => b.id).sort().join(',') ?? '';

        // Only update state if the list structure (length or IDs) has changed
        if (wordBanksRef.current?.length !== updatedLocalData?.length || currentIds !== updatedIds) {
          setWordBanks(updatedLocalData);
          console.log('Refreshed state from updated IndexedDB (list structure changed).');
        } else {
          console.log('Skipping state update, fetched data is identical to current state.');
        }

        setLastFetched(Date.now()); // Update timestamp
      }
    } catch (e: any) {
      console.error('Failed to fetch or sync remote word banks:', e);
      if (!currentLocalData || currentLocalData.length === 0) {
        setError(`Failed to fetch word banks: ${e.message || 'Unknown error'}`);
      } else {
        console.warn("Remote fetch failed, continuing with local data.");
      }
    }
  }, [userId, refetchWordBanks]); // Use stable refetch

  // Initial load effect
  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      if (!userId) {
        setIsLoading(false);
        setWordBanks([]); // Set empty if no user ID
        return;
      }

      setIsLoading(true);
      setError(null);
      let localData: WordBank[] | null = null;

      try {
        console.log('Fetching local word banks...');
        localData = await getWordBanks(userId);
        if (!cancelled) {
          setWordBanks(localData);
          console.log(`Found ${localData?.length ?? 0} banks locally.`);
          const shouldFetchRemote = !localData || localData.length === 0 || Date.now() - lastFetched > STALE_MS;

          if (shouldFetchRemote) {
            fetchAndSyncRemote(localData).catch(fetchErr => {
              console.error("Background remote fetch failed:", fetchErr);
            });
          }
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error('Failed to load local word banks:', e);
        setError(`Failed to load local data: ${e.message || 'Unknown error'}`);
        fetchAndSyncRemote(null).catch(fetchErr => {
          console.error("Background remote fetch also failed after local failure:", fetchErr);
        });
        setIsLoading(false);
      }
    }

    loadInitialData();

    return () => { cancelled = true; };
  }, [userId, fetchAndSyncRemote, lastFetched]); // Restore lastFetched dependency

  const { data: session } = useSession();

  // --- tRPC Mutation for Creating Word Bank ---
  const createWordBankMutation = api.vocab.createWordBank.useMutation({
    onError: (error, variables) => {
      toast.error(`Online create failed for bank "${variables.name}": ${error.message}`);
    },
    onSuccess: () => {
        // Invalidate list query after successful creation
        trpcQuery.refetch(); // Refetch the list query
    }
  });

  // --- Add Bank Function (with Offline Queueing) ---
  const addBank = useCallback(async (newBankData: Omit<WordBank, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const optimisticBank: WordBank = {
      ...newBankData,
      id: tempId,
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: 0, masteryPercentage: 0, lastPracticedAt: null,
    };

    const previousWordBanks = wordBanks;
    setWordBanks((prev) => [...(prev ?? []), optimisticBank]);

    try {
      await addWordBank(optimisticBank);

      if (navigator.onLine) {
        createWordBankMutation.mutate({
          name: newBankData.name,
          description: newBankData.description,
        });
      } else {
        await queueMutation({
          type: 'wordBank/add',
          payload: { name: newBankData.name, description: newBankData.description },
          userId
        });
        toast.info("Offline: Word bank creation queued.");
      }
    } catch (localError: any) {
      console.error("Failed to add word bank locally:", localError);
      toast.error(`Local add failed: ${localError.message}`);
      setWordBanks(previousWordBanks);
    }
  }, [userId, wordBanks, createWordBankMutation]);

  // Expose a refresh function to force sync with remote
  const refresh = useCallback(() => {
    fetchAndSyncRemote(wordBanksRef.current)
  }, [fetchAndSyncRemote])

  // Return the non-paginated data structure
  return { wordBanks, isLoading, error, addBank, refresh };
}
