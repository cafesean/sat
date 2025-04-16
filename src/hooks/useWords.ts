import { db, deleteWord, getWordsByBank, queueMutation, updateWord, Word, WordMasterData } from '@/lib/storage'; // Import db and queueMutation
import { api, type RouterOutputs } from '@/utils/trpc'; // Import RouterOutputs
import { useSession } from 'next-auth/react'; // Import useSession
import { useCallback, useEffect, useRef, useState } from 'react'; // Combined imports + useRef
import { toast } from 'sonner'; // Import toast for error handling

const STALE_MS = 5 * 60 * 1000;

// Type for the remote word data from tRPC
type RemoteWord = RouterOutputs['vocab']['listByBank'][number];

// Updated normalization function to match the new Word interface in storage.ts
function normalizeWord(remote: RemoteWord): Word {
  // Ensure wordMaster is handled correctly (null or the expected structure)
  const wordMaster: WordMasterData | null = remote.wordMaster ? {
    id: remote.wordMaster.id,
    baseWord: remote.wordMaster.baseWord,
    wordType: remote.wordMaster.wordType,
    definition: remote.wordMaster.definition,
    sampleSentences: remote.wordMaster.sampleSentences as Record<string, string> | null, // Cast if necessary
    translations: remote.wordMaster.translations as Record<string, string> | null, // Cast if necessary
    isDictionaryWord: remote.wordMaster.isDictionaryWord,
  } : null;

  return {
    id: remote.id,
    text: remote.text,
    interval: remote.interval,
    easeFactor: remote.easeFactor,
    repetitions: remote.repetitions,
    nextReviewDate: remote.nextReviewDate, // Already a string from tRPC
    isStarred: remote.isStarred,
    notes: remote.notes, // Already correct type (string | null)
    mastery: remote.mastery,
    nextDueAtReviewCount: remote.nextDueAtReviewCount,
    timesSeen: remote.timesSeen,
    successRate: remote.successRate,
    wordMasterId: remote.wordMasterId,
    wordMaster: wordMaster, // Assign the processed wordMaster object
    wordBankId: remote.wordBankId, // Use wordBankId from remote data
    practiceCount: remote.practiceCount,
    // createdAt/updatedAt are not returned by listByBank, handle locally if needed
  };
}


export function useWords(wordBankId: string) { // Renamed bankId to wordBankId for clarity
  const [words, setWords] = useState<Word[] | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0); // Track timestamp
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession(); // Get session at the top level
  const userId = session?.user?.id; // Get userId at the top level

  // tRPC query - pass wordBankId correctly
  const trpcQuery = api.vocab.listByBank.useQuery({ wordBankId: wordBankId }, {
    enabled: !!wordBankId, // Only enable if wordBankId is present
    staleTime: STALE_MS,
  });
  const { refetch: refetchWords } = trpcQuery; // Destructure for stable reference
  const wordsRef = useRef(words); // Add ref for comparison

  // Keep ref updated
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Function to fetch remote and sync
  const fetchAndSyncRemote = useCallback(async (currentLocalData: Word[] | null) => {
    // userId is now available from the hook's scope
    if (!userId) {
        console.error("Cannot sync words: User ID not found in scope.");
        return;
    }
    if (!wordBankId) return;
    console.log(`Attempting to fetch remote words for bank ${wordBankId}...`);
    setError(null);
    try {
      // Use stable refetch function
      const { data: remoteData, isError, error: remoteError } = await refetchWords();
      let finalRemoteData = remoteData; // Assign remoteData to finalRemoteData

      if (isError) { // Check isError after refetch attempt
        throw remoteError || new Error('Unknown error fetching remote words');
      }

      if (finalRemoteData) { // Use finalRemoteData which holds the result of refetch
        console.log(`Fetched ${finalRemoteData.length} words from server for bank ${wordBankId}.`);
        const normalizedWords = finalRemoteData.map(normalizeWord);

        // Use bulkPut for efficient upsert
        await db.words.bulkPut(normalizedWords);
        console.log(`Synced remote words to IndexedDB for bank ${wordBankId}.`);

        // Re-fetch from local DB to ensure state reflects the actual stored data
        const updatedLocalData = await getWordsByBank(wordBankId);

        // Compare lengths and sorted IDs before updating state
        const currentIds = wordsRef.current?.map((w: Word) => w.id).sort().join(',') ?? ''; // Add type to 'w'
        const updatedIds = updatedLocalData?.map((w: Word) => w.id).sort().join(',') ?? ''; // Add type to 'w'

        if (wordsRef.current?.length !== updatedLocalData?.length || currentIds !== updatedIds) {
          setWords(updatedLocalData);
          console.log(`Refreshed words state from updated IndexedDB for bank ${wordBankId} (data changed).`);
        } else {
          console.log(`Skipping words state update for bank ${wordBankId}, data identical.`);
        }

        setLastFetched(Date.now());
      }
    } catch (e: any) {
      console.error(`Failed to fetch or sync remote words for bank ${wordBankId}:`, e);
      // Need toast import here
      const { toast } = await import('sonner');
      if (!currentLocalData || currentLocalData.length === 0) {
        setError(`Failed to fetch words: ${e.message || 'Unknown error'}`);
        toast.error(`Failed to fetch words: ${e.message || 'Unknown error'}`);
      } else {
        console.warn(`Remote word fetch failed for bank ${wordBankId}, continuing with local data.`);
        // toast.warning(`Couldn't sync words for this bank.`);
      }
    }
    // Use stable refetchWords instead of trpcQuery, add userId dependency
  }, [wordBankId, refetchWords, userId]);

  // Initial load effect
  // Update dependencies for initial load effect
  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      // Also check userId here
      if (!wordBankId || !userId) {
        setIsLoading(false);
        setWords([]); // Set empty if no bank ID or user ID
        return;
      }

      setIsLoading(true); // Set loading true at the start
      setError(null);
      let localData: Word[] | null = null;

      try {
        console.log(`Fetching local words for bank ${wordBankId}...`);
        localData = await getWordsByBank(wordBankId);
        if (!cancelled) {
          setWords(localData);
          console.log(`Found ${localData?.length ?? 0} words locally for bank ${wordBankId}.`);

          const shouldFetchRemote = !localData || localData.length === 0 || Date.now() - lastFetched > STALE_MS;

          if (shouldFetchRemote) {
            // Use the stable fetchAndSyncRemote callback
            fetchAndSyncRemote(localData).catch(fetchErr => {
              console.error(`Background remote word fetch failed for bank ${wordBankId}:`, fetchErr);
            });
          }
          // Set loading false *after* attempting local load
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error(`Failed to load local words for bank ${wordBankId}:`, e);
        setError(`Failed to load local words: ${e.message || 'Unknown error'}`);
        // Use the stable fetchAndSyncRemote callback
        fetchAndSyncRemote(null).catch(fetchErr => {
           console.error(`Background remote word fetch also failed after local failure for bank ${wordBankId}:`, fetchErr);
        });
        // Set loading false even on error
        setIsLoading(false);
      }
    }

    loadInitialData();

    return () => { cancelled = true; };
    // Rerun only when userId or wordBankId changes
  }, [userId, wordBankId, fetchAndSyncRemote, lastFetched]); // Restore dependencies

  // userId is already declared at the top level of the hook
  // const userId = session?.user?.id;

  // --- tRPC Mutations ---
  // Note: These are defined here but called within the update/remove functions below
  const updateWordMutation = api.vocab.updateWord.useMutation({
    // onSuccess/onError could be added for online-specific feedback if needed
    // but the primary update is optimistic via local state/DB
    onError: (error, variables) => {
      toast.error(`Online update failed for word ID ${variables.wordId}: ${error.message}`);
      // TODO: Consider reverting optimistic update here if online update fails
    }
  });
  const deleteWordMutation = api.vocab.deleteWord.useMutation({
    onError: (error, variables) => {
      toast.error(`Online delete failed for word ID ${variables.wordId}: ${error.message}`);
      // TODO: Consider reverting optimistic update here if online delete fails
    }
  });

  // --- Hook Mutations (with Offline Queueing) ---

  // Add Word (Placeholder - needs corresponding tRPC mutation like addSingleWord or use addBatch)
  const add = useCallback(async (word: Word) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    console.warn("useWords 'add' function needs implementation with a suitable tRPC mutation and offline queueing.");
    // Example structure:
    // 1. Optimistic local update
    // await addWord(word);
    // setWords((prev) => (prev ? [...prev, word] : [word]));
    // 2. Check online status
    // if (navigator.onLine) {
    //   // Call tRPC addSingleWordMutation.mutate(word);
    // } else {
    //   await queueMutation({ type: 'word/add', payload: word, userId });
    //   toast.info("Offline: Word add queued.");
    // }
  }, [userId]);

  // Update Word
  const update = useCallback(async (word: Word) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    // 1. Optimistic local update
    const previousWords = words; // Store previous state for potential revert
    setWords((prev) => (prev ? prev.map(w => w.id === word.id ? word : w) : [word]));
    try {
      await updateWord(word); // Update local DB

      // 2. Check online status and act
      if (navigator.onLine) {
        // Attempt online update
        updateWordMutation.mutate({
          wordId: word.id,
          // Pass only fields allowed by updateWordSchema (e.g., text, wordMasterId)
          // Assuming updateWordSchema takes text for now. Adjust if needed.
          text: word.text,
          // wordMasterId: word.wordMasterId, // Add if schema allows
        });
      } else {
        // Queue if offline
        await queueMutation({ type: 'word/update', payload: word, userId });
        toast.info("Offline: Word update queued.");
      }
    } catch (localError: any) {
      console.error("Failed to update word locally:", localError);
      toast.error(`Local update failed: ${localError.message}`);
      setWords(previousWords); // Revert optimistic UI update on local failure
    }
  }, [userId, words, updateWordMutation]); // Add dependencies

  // Remove Word
  const remove = useCallback(async (wordId: string) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
     // 1. Optimistic local update
    const previousWords = words; // Store previous state
    setWords((prev) => (prev ? prev.filter(w => w.id !== wordId) : null));
    try {
      await deleteWord(wordId); // Update local DB

      // 2. Check online status and act
      if (navigator.onLine) {
        // Attempt online delete
        deleteWordMutation.mutate({ wordId });
      } else {
        // Queue if offline
        await queueMutation({ type: 'word/delete', payload: { wordId }, userId });
        toast.info("Offline: Word delete queued.");
      }
    } catch (localError: any) {
       console.error("Failed to delete word locally:", localError);
       toast.error(`Local delete failed: ${localError.message}`);
       setWords(previousWords); // Revert optimistic UI update on local failure
    }
  }, [userId, words, deleteWordMutation]); // Add dependencies

  return { words, isLoading, error, add, update, remove };
}
