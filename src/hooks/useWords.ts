import { db, deleteWord, getWordsByBank, queueMutation, updateWord, Word, WordMasterData, addWord } from '@/lib/storage'; // Import db and queueMutation
import { api, type RouterOutputs } from '@/utils/trpc'; // Import RouterOutputs
import { useSession } from 'next-auth/react'; // Import useSession
import { useCallback, useEffect, useRef, useState } from 'react'; // Combined imports + useRef
import { toast } from 'sonner'; // Import toast for error handling
import { useWordEnrichmentStore, WordEnrichmentStatus } from '@/store/wordEnrichmentStore';

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
    practiceCount: remote._count?.practiceLogs ?? 0, // Map from _count object
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
  const wordsRef = useRef<Word[] | null>(null);
  
  // Keep track of words we've optimistically added locally
  const pendingLocalAddsRef = useRef<Set<string>>(new Set());
  
  // Track when we last checked for enrichment to prevent infinite loops
  const lastEnrichmentCheckRef = useRef<number>(0);

  // tRPC query - pass wordBankId correctly but disable automatic fetching
  const trpcQuery = api.vocab.listByBank.useQuery({ wordBankId: wordBankId }, {
    enabled: false, // Disable automatic fetching
    staleTime: STALE_MS,
  });
  const { refetch: refetchWords } = trpcQuery; // Destructure for stable reference

  // Get utils for invalidation
  const utils = api.useUtils();

  // Don't do anything if userId or wordBankId is empty
  useEffect(() => {
    if (!userId || !wordBankId) {
      setIsLoading(false);
      setWords([]);
      return;
    }
  }, [userId, wordBankId]);

  // Keep ref updated to avoid stale closures
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Monitor for words awaiting enrichment and trigger a one-time refetch when detected
  useEffect(() => {
    // No need to check if words aren't loaded yet
    if (!words || words.length === 0 || !wordBankId) return;
    
    // Add debounce to prevent excessive checks (only check every 3 seconds max)
    const now = Date.now();
    if (now - lastEnrichmentCheckRef.current < 3000) {
      console.log(`useWords: Skipping enrichment check - last check was ${(now - lastEnrichmentCheckRef.current)/1000}s ago`);
      return;
    }
    
    // Update the timestamp for this check
    lastEnrichmentCheckRef.current = now;
    
    // Check if any words are awaiting enrichment
    const wordsAwaitingEnrichment = words.filter(
      word => (!word.wordMaster || 
              !word.wordMaster.definition || 
              word.wordMaster.definition === null || 
              !word.wordMaster.wordType || 
              word.wordMaster.wordType === null)
    );
    
    // If we find words awaiting enrichment, do a one-time refetch
    if (wordsAwaitingEnrichment.length > 0) {
      console.log(`useWords: Found ${wordsAwaitingEnrichment.length} words awaiting enrichment in bank ${wordBankId}, triggering refresh`);
      console.log(`Word IDs awaiting enrichment:`, wordsAwaitingEnrichment.map(w => w.id));
      
      // Invalidate the specific word IDs that need refreshing AND the list query
      utils.vocab.listByBank.invalidate({ wordBankId });
      
      wordsAwaitingEnrichment.forEach(word => {
        utils.vocab.getWordById.invalidate({ id: word.id });
      });
      
      // Simple helper for no cancellation
      const noCancellation = () => false;
      
      // Trigger a single refresh without interval
      refetchWords().then(() => {
        // Refetch succeeded, now sync with local DB
        fetchAndSyncRemote(noCancellation).catch(e => {
          console.error(`useWords: Refresh after detecting enrichment pendency failed:`, e);
        });
      }).catch(e => {
        console.error(`useWords: Refetch for enrichment pendency failed:`, e);
      });
    }
  }, [words, wordBankId, refetchWords, utils.vocab]); // Include utils.vocab in dependencies

  // Fetch remote data and sync with local
  const fetchAndSyncRemote = useCallback(async (isCancelled: () => boolean) => {
    if (!userId || !wordBankId) return;
    console.log(`useWords.fetchAndSyncRemote: Starting for bank ${wordBankId}...`);
    
    try {
      // 1. Fetch remote data
      console.log(`useWords.fetchAndSyncRemote: Calling refetchWords()`);
      const result = await refetchWords();
      
      if (isCancelled()) {
        console.log(`useWords.fetchAndSyncRemote: Cancelled during fetch.`);
        return;
      }
      
      if (result.isError || !result.data) {
        throw result.error || new Error('Unknown error fetching remote words');
      }
      
      const remoteData = result.data;
      console.log(`useWords.fetchAndSyncRemote: Found ${remoteData.length} words remotely.`);
      
      // 2. Normalize remote data and get remote IDs
      const normalizedRemoteWords = remoteData.map(normalizeWord);
      const remoteIds = new Set(normalizedRemoteWords.map(w => w.id));

      // 3. Read all current words from the local DB for this bank
      console.log(`useWords.fetchAndSyncRemote: Reading all words from DB for bank ${wordBankId}`);
      const allLocalWordsFromDB = await getWordsByBank(wordBankId);
      console.log(`useWords.fetchAndSyncRemote: Found ${allLocalWordsFromDB.length} words in DB.`);
      console.log(`useWords.fetchAndSyncRemote: Current pending IDs in ref:`, Array.from(pendingLocalAddsRef.current));

      // 4. Identify pending local words from DB that are not yet on the server
      const pendingLocalWordsNotInRemote = allLocalWordsFromDB.filter(localWord => 
        pendingLocalAddsRef.current.has(localWord.id) && !remoteIds.has(localWord.id)
      );
      
      if (pendingLocalWordsNotInRemote.length > 0) {
        console.log(`useWords.fetchAndSyncRemote: Identified ${pendingLocalWordsNotInRemote.length} pending local words from DB to preserve. IDs:`, pendingLocalWordsNotInRemote.map(w => w.id));
      } else {
        console.log(`useWords.fetchAndSyncRemote: No pending local words from DB needed preserving.`);
      }
      
      // 5. Merge remote words with the identified pending local words
      const mergedWords = [...normalizedRemoteWords];
      
      // Only add local words that aren't already in the remote list
      if (pendingLocalWordsNotInRemote.length > 0) {
        console.log(`useWords.fetchAndSyncRemote: Adding ${pendingLocalWordsNotInRemote.length} pending local words`);
        mergedWords.push(...pendingLocalWordsNotInRemote);
      }
      
      // Log any words that were previously awaiting enrichment but are now enriched
      const enrichedWords = normalizedRemoteWords.filter(remoteWord => 
        remoteWord.wordMaster?.definition !== null && 
        remoteWord.wordMaster?.wordType !== null &&
        remoteWord.wordMaster?.sampleSentences !== null
      );
      
      if (enrichedWords.length > 0) {
        console.log(`useWords.fetchAndSyncRemote: Found ${enrichedWords.length} fully enriched words:`, 
          enrichedWords.map(w => w.text));
      }
      
      console.log(`useWords.fetchAndSyncRemote: Merged list contains ${mergedWords.length} words.`);
      
      // 6. Use bulkPut for efficient upsert into DB
      console.log(`useWords.fetchAndSyncRemote: Attempting db.words.bulkPut for ${mergedWords.length} words.`);
      await db.words.bulkPut(mergedWords);
      console.log(`useWords.fetchAndSyncRemote: Synced ${mergedWords.length} words to IndexedDB.`);
            
      if (isCancelled()) {
        console.log(`useWords.fetchAndSyncRemote: Cancelled after DB sync.`);
        return;
      }
      
      // 8. Update state directly with the merged data
      console.log(`useWords.fetchAndSyncRemote: Setting state with ${mergedWords.length} merged words.`);
      setWords(mergedWords); // Use the merged array directly
      setLastFetched(Date.now());
      
    } catch (e: any) {
      console.error(`useWords.fetchAndSyncRemote: Failed during fetch/sync for bank ${wordBankId}:`, e);
      
      if (isCancelled()) return;
      
      // Only set error if the state is currently null/empty
      // Check the ref here is okay, as it's just for deciding to show an error
      if (!wordsRef.current || wordsRef.current.length === 0) { 
         setError(`Failed to fetch words: ${e.message || 'Unknown error'}`);
         toast.error(`Failed to fetch words: ${e.message || 'Unknown error'}`);
      } else {
         // If we have data already, just log a warning
         console.warn(`Remote fetch/sync failed for bank ${wordBankId}, continuing with existing data.`);
      }
    }
  // Dependencies are correct
  }, [wordBankId, refetchWords, userId]);

  // Initial load effect
  useEffect(() => {
    // Move cancelled flag inside the effect where it belongs
    let cancelled = false;
    const isCancelled = () => cancelled;
    
    async function loadInitialData() {
      // If userId or wordBankId is missing, clear state and stop.
      if (!wordBankId || !userId) {
        console.log('useWords: Missing userId or wordBankId, resetting.');
        setIsLoading(false);
        setWords([]);
        setLastFetched(0); // Reset fetch time
        return;
      }

      // Proceed with loading only if userId and wordBankId are present.
      console.log(`useWords: Starting initial load for bank ${wordBankId}`);
      setIsLoading(true);
      setError(null);
      let localData: Word[] | null = null;

      try {
        console.log(`Fetching local words for bank ${wordBankId}...`);
        localData = await getWordsByBank(wordBankId);
        
        if (cancelled) {
            console.log(`useWords: Initial load cancelled for bank ${wordBankId}`);
            return;
        }
        
        setWords(localData);
        console.log(`Found ${localData?.length ?? 0} words locally for bank ${wordBankId}.`);

        // Fetch remote data if local is empty or stale
        const shouldFetchRemote = !localData || localData.length === 0 || Date.now() - lastFetched > STALE_MS;
        console.log(`useWords: Should fetch remote for bank ${wordBankId}?`, shouldFetchRemote);
        
        // Only run initial sync if we should fetch AND there are no pending local adds
        if (shouldFetchRemote && pendingLocalAddsRef.current.size === 0) { 
          console.log(`useWords: Triggering initial fetchAndSyncRemote because shouldFetchRemote is true and no pending adds.`);
          fetchAndSyncRemote(isCancelled).catch(fetchErr => {
            // Error logging handled within fetchAndSyncRemote
          });
        } else if (shouldFetchRemote && pendingLocalAddsRef.current.size > 0) {
          console.log(`useWords: Skipping initial fetchAndSyncRemote because there are ${pendingLocalAddsRef.current.size} pending local adds.`);
        }
        
        if (!cancelled) {
          setIsLoading(false);
          console.log(`useWords: Initial load complete for bank ${wordBankId}`);
        }
      } catch (e: any) {
        console.error(`Failed to load local words for bank ${wordBankId}:`, e);
        
        if (cancelled) return;
        
        setError(`Failed to load local words: ${e.message || 'Unknown error'}`);
        
        // Attempt remote fetch even if local fails, IF no pending adds
        if (pendingLocalAddsRef.current.size === 0) {
           console.log(`useWords: Triggering fetchAndSyncRemote after local load error because no pending adds.`);
           fetchAndSyncRemote(isCancelled).catch(fetchErr => {
             // Error logging handled within fetchAndSyncRemote
           });
        } else {
           console.log(`useWords: Skipping fetchAndSyncRemote after local load error because there are pending adds.`);
        }
        
        // Still set loading false after error + attempt to fetch remote
        if (!cancelled) {
          setIsLoading(false);
           console.log(`useWords: Initial load failed for bank ${wordBankId}, attempted remote fetch.`);
        }
      }
    }

    loadInitialData();

    // Cleanup function
    return () => { 
      console.log(`Cleaning up useWords effect for bank ${wordBankId}`);
      cancelled = true; 
    };
    // This effect should ONLY re-run if the user or the bank context changes.
    // The decision to fetch based on staleness happens *inside*.
  }, [userId, wordBankId]); 

  // tRPC Mutations
  const updateWordMutation = api.vocab.updateWord.useMutation({
    onError: (error, variables) => {
      toast.error(`Online update failed for word ID ${variables.wordId}: ${error.message}`);
    }
  });
  
  const deleteWordMutation = api.vocab.deleteWord.useMutation({
    onError: (error, variables) => {
      toast.error(`Online delete failed for word ID ${variables.wordId}: ${error.message}`);
    }
  });

  // Add a single word with optimistic updates
  const add = useCallback(async (word: Word) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }

    // Track this word as a pending local addition
    pendingLocalAddsRef.current.add(word.id);
    
    // Optimistic local update - add to UI immediately
    setWords((prev) => (prev ? [...prev, word] : [word]));
    
    try {
      // Update IndexedDB
      await addWord(word);
      console.log(`Word "${word.text}" added to local DB.`);
      
      // Queue for sync or send to server based on online status
      if (navigator.onLine) {
        toast.info("Word added locally. Online sync will happen in background.");
      } else {
        await queueMutation({ 
          type: 'word/add', 
          payload: word, 
          userId 
        });
        toast.info("Offline: Word add queued.");
      }
    } catch (localError: any) {
      console.error("Failed to add word locally:", localError);
      toast.error(`Local add failed: ${localError.message}`);
      
      // Revert optimistic UI update on local failure
      pendingLocalAddsRef.current.delete(word.id);
      setWords((prev) => prev ? prev.filter(w => w.id !== word.id) : null);
    }
  }, [userId]);

  // Add batch of words with optimistic updates
  const addBatch = useCallback(async (words: Word[]) => {
    if (!userId || !words.length) return;
    const wordIds = words.map(w => w.id);
    console.log(`useWords.addBatch: Starting for ${words.length} words. IDs:`, wordIds);
    console.log(`useWords.addBatch: Current pending IDs BEFORE add:`, Array.from(pendingLocalAddsRef.current));

    // Get the store to mark words as pending
    const enrichmentStore = useWordEnrichmentStore.getState();

    // Track these words as pending local additions
    words.forEach(word => {
      pendingLocalAddsRef.current.add(word.id);
      // Also mark as pending in the enrichment store
      enrichmentStore.markAsPending(word.id);
    });
    console.log(`useWords.addBatch: Pending IDs AFTER add:`, Array.from(pendingLocalAddsRef.current));
    
    // Optimistic local update - add all words to UI state
    // but avoid duplication by checking IDs
    setWords((prev) => {
      if (!prev) return words;
      
      // Get existing word IDs for duplication check
      const existingIds = new Set(prev.map(w => w.id));
      
      // Filter out any duplicate words that already exist in state
      const uniqueNewWords = words.filter(word => !existingIds.has(word.id));
      
      if (uniqueNewWords.length !== words.length) {
        console.log(`useWords.addBatch: Filtered out ${words.length - uniqueNewWords.length} duplicate words`);
      }
      
      const newWords = [...prev, ...uniqueNewWords];
      console.log(`useWords.addBatch: Optimistically added ${uniqueNewWords.length} unique words to UI state. New count: ${newWords.length}`);
      return newWords;
    });
    
    try {
      // Update IndexedDB with bulk operation - IndexedDB will handle uniqueness
      console.log(`useWords.addBatch: Attempting db.words.bulkAdd for IDs:`, wordIds);
      await db.words.bulkPut(words); // Using bulkPut instead of bulkAdd to handle existing records
      console.log(`useWords.addBatch: Successfully added ${words.length} words to local DB.`);
      
      // Reset the enrichment check timer to force an immediate check on next render
      lastEnrichmentCheckRef.current = 0;
      
      // Force an immediate invalidation and refresh
      utils.vocab.listByBank.invalidate({ wordBankId });
      
      // Trigger an immediate check for enrichment
      refetchWords().then(() => {
        // After refetch, also fetch and sync with local DB
        const noCancellation = () => false;
        fetchAndSyncRemote(noCancellation).catch(e => {
          console.error(`useWords.addBatch: Failed to sync after refetch:`, e);
        });
      }).catch(e => {
        console.error(`useWords.addBatch: Failed to refetch after add:`, e);
      });
    } catch (localError: any) {
      console.error("useWords.addBatch: Failed to add words locally:", localError);
      toast.error(`Local add failed: ${localError.message}`);
      
      // Revert optimistic UI update on local failure
      console.log(`useWords.addBatch: Reverting optimistic add for IDs:`, wordIds);
      const newWordIds = new Set(words.map(w => w.id));
      words.forEach(word => {
        pendingLocalAddsRef.current.delete(word.id);
        // Also clear from enrichment store
        enrichmentStore.updateEnrichmentStatus(word.id, WordEnrichmentStatus.FAILED, localError.message);
      });
      console.log(`useWords.addBatch: Pending IDs AFTER revert:`, Array.from(pendingLocalAddsRef.current));
      setWords((prev) => prev ? prev.filter(w => !newWordIds.has(w.id)) : null);
    }
  }, [userId, refetchWords, wordBankId, utils.vocab]);

  // Update Word (optimistic update)
  const update = useCallback(async (word: Word) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    
    // Optimistic local update
    const previousWords = wordsRef.current;
    setWords((prev) => (prev ? prev.map(w => w.id === word.id ? word : w) : [word]));
    
    try {
      await updateWord(word);

      if (navigator.onLine) {
        updateWordMutation.mutate({
          wordId: word.id,
          text: word.text,
        });
      } else {
        await queueMutation({ type: 'word/update', payload: word, userId });
        toast.info("Offline: Word update queued.");
      }
    } catch (localError: any) {
      console.error("Failed to update word locally:", localError);
      toast.error(`Local update failed: ${localError.message}`);
      setWords(previousWords);
    }
  }, [userId, updateWordMutation]);

  // Remove Word (optimistic update)
  const remove = useCallback(async (wordId: string) => {
    if (!userId) {
      toast.error("User not logged in.");
      return;
    }
    
    // Optimistic local update
    const previousWords = wordsRef.current;
    setWords((prev) => (prev ? prev.filter(w => w.id !== wordId) : null));
    
    try {
      await deleteWord(wordId);

      // Remove from pending local adds if it was there
      pendingLocalAddsRef.current.delete(wordId);

      if (navigator.onLine) {
        deleteWordMutation.mutate({ wordId });
      } else {
        await queueMutation({ type: 'word/delete', payload: { wordId }, userId });
        toast.info("Offline: Word delete queued.");
      }
    } catch (localError: any) {
       console.error("Failed to delete word locally:", localError);
       toast.error(`Local delete failed: ${localError.message}`);
       setWords(previousWords);
    }
  }, [userId, deleteWordMutation]);

  // Force refresh function (explicitly reloads from local DB and remote)
  const forceRefresh = useCallback(async () => {
    if (!userId || !wordBankId) return;
    setIsLoading(true);
    
    try {
      // Create a cancellation function that always returns false for this one-time refresh
      const noCancellation = () => false;
      
      // Get fresh local data first to update UI quickly if possible
      const localData = await getWordsByBank(wordBankId);
      setWords(localData);
      
      // Always fetch from remote for explicit refresh
      await fetchAndSyncRemote(noCancellation); // Don't pass localData
    } catch (e) {
      console.error("Force refresh failed:", e);
      // Consider setting an error state here
    } finally {
      setIsLoading(false);
    }
  // Add fetchAndSyncRemote to dependency array
  }, [userId, wordBankId, fetchAndSyncRemote]); 

  return { 
    words, 
    isLoading, 
    error, 
    add, 
    addBatch, 
    update, 
    remove, 
    refresh: forceRefresh
  };
}
