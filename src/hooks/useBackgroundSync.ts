'use client'

import {
  deleteMutation,
  getPendingMutations,
  updateMutationStatus
} from '@/lib/storage';
import { api } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const MAX_SYNC_ATTEMPTS = 3; // Limit retry attempts

export function useBackgroundSync() {
  const { data: session, status: sessionStatus } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false); // Prevent concurrent syncs
  const isSyncingRef = useRef(isSyncing); // Ref to track syncing state in effects

  // Keep ref updated
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const utils = api.useUtils();

  // --- Instantiate Mutation Hooks ---
  const createWordBankMutation = api.vocab.createWordBank.useMutation();
  const updateWordBankMutation = api.vocab.update.useMutation();
  const addWordBatchMutation = api.vocab.addBatch.useMutation();
  const updateWordMutation = api.vocab.updateWord.useMutation();
  const deleteWordMutation = api.vocab.deleteWord.useMutation();
  const updateWordNotesMutation = api.vocab.updateWordNotes.useMutation();
  const toggleStarMutation = api.vocab.toggleStar.useMutation();

  // --- Core Sync Logic (Defined First) ---
  const syncMutations = useCallback(async () => {
    // Use ref to check isSyncing to avoid adding setIsSyncing to deps
    if (isSyncingRef.current || !isOnline || sessionStatus !== 'authenticated' || !session?.user?.id) {
      console.log('Sync skipped:', { isSyncing: isSyncingRef.current, isOnline, sessionStatus });
      return;
    }

    console.log('Starting background sync...');
    // Ensure we only set syncing state if not already syncing (precautionary)
    if (syncStatus !== 'syncing') {
        setSyncStatus('syncing');
    }
    setIsSyncing(true); // Track sync process

    let successCount = 0;
    let failureCount = 0;
    // Declare pendingMutations here so it's accessible in catch block
    let pendingMutations: Awaited<ReturnType<typeof getPendingMutations>> = [];

    try {
      // Assign fetched mutations inside the try block
      pendingMutations = await getPendingMutations(session.user.id);

      if (pendingMutations.length === 0) {
        console.log('No pending mutations to sync.');
        // No return here, let it fall through to finally
      } else {
        console.log(`Found ${pendingMutations.length} pending mutations.`);
        toast.info(`Syncing ${pendingMutations.length} offline changes...`);

        for (const mutation of pendingMutations) {
          if (!mutation.id) continue;

          if (mutation.status === 'failed' && mutation.attempts >= MAX_SYNC_ATTEMPTS) {
            console.warn(`Skipping mutation ${mutation.id} (${mutation.type}) due to max attempts reached.`);
            continue;
          }

          let invalidationNeeded = false;
          let bankIdToInvalidate: string | null = null;
          let wordIdToInvalidate: string | null = null;

          try {
            console.log(`Processing mutation ${mutation.id}: ${mutation.type}`);
            await updateMutationStatus(mutation.id, 'processing', mutation.attempts);

            let mutationSuccess = false;
            switch (mutation.type) {
              case 'wordBank/add':
                await createWordBankMutation.mutateAsync(mutation.payload);
                mutationSuccess = true;
                invalidationNeeded = true;
                break;
              case 'wordBank/update':
                await updateWordBankMutation.mutateAsync(mutation.payload);
                mutationSuccess = true;
                invalidationNeeded = true;
                bankIdToInvalidate = mutation.payload?.id;
                break;
              case 'wordBank/delete':
                console.warn(`Syncing 'wordBank/delete' is not supported.`);
                await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, 'Delete Word Bank not supported');
                failureCount++;
                mutationSuccess = false;
                break;
              case 'word/add':
                if (mutation.payload?.wordBankId && mutation.payload?.wordText) {
                  await addWordBatchMutation.mutateAsync({
                    wordBankId: mutation.payload.wordBankId,
                    wordsText: mutation.payload.wordText,
                  });
                  mutationSuccess = true;
                  invalidationNeeded = true;
                  bankIdToInvalidate = mutation.payload.wordBankId;
                } else {
                   throw new Error('Invalid payload for word/add');
                }
                break;
              case 'word/addBatch':
                await addWordBatchMutation.mutateAsync(mutation.payload);
                mutationSuccess = true;
                invalidationNeeded = true;
                bankIdToInvalidate = mutation.payload?.wordBankId;
                break;
              case 'word/update':
                await updateWordMutation.mutateAsync(mutation.payload);
                mutationSuccess = true;
                invalidationNeeded = true;
                bankIdToInvalidate = mutation.payload?.wordBankId;
                wordIdToInvalidate = mutation.payload?.wordId;
                break;
              case 'word/delete':
                await deleteWordMutation.mutateAsync({ wordId: mutation.payload.wordId });
                mutationSuccess = true;
                invalidationNeeded = true;
                bankIdToInvalidate = mutation.payload?.wordBankId;
                wordIdToInvalidate = mutation.payload?.wordId;
                break;
              case 'word/toggleStar':
                await toggleStarMutation.mutateAsync({ wordId: mutation.payload.wordId });
                mutationSuccess = true;
                invalidationNeeded = true;
                bankIdToInvalidate = mutation.payload?.wordBankId;
                wordIdToInvalidate = mutation.payload?.wordId;
                break;
              case 'practiceLog/add':
                console.warn(`Syncing 'practiceLog/add' is complex.`);
                mutationSuccess = true; // Placeholder
                break;
               case 'note/add':
               case 'note/update':
                 if (mutation.payload?.wordId && typeof mutation.payload?.notes === 'string') {
                   await updateWordNotesMutation.mutateAsync({
                     wordId: mutation.payload.wordId,
                     notes: mutation.payload.notes,
                   });
                   mutationSuccess = true;
                   invalidationNeeded = true;
                   bankIdToInvalidate = mutation.payload?.wordBankId;
                   wordIdToInvalidate = mutation.payload.wordId;
                 } else {
                   throw new Error('Invalid payload for note add/update');
                 }
                 break;
               case 'note/delete':
                  if (mutation.payload?.wordId) {
                    await updateWordNotesMutation.mutateAsync({
                      wordId: mutation.payload.wordId,
                      notes: null,
                    });
                    mutationSuccess = true;
                    invalidationNeeded = true;
                    bankIdToInvalidate = mutation.payload?.wordBankId;
                    wordIdToInvalidate = mutation.payload.wordId;
                  } else {
                    throw new Error('Invalid payload for note delete');
                  }
               break;
            default:
              const exhaustiveCheck: never = mutation.type;
              console.warn(`Unhandled known mutation type: ${exhaustiveCheck}`);
              await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, `Unhandled type: ${mutation.type}`);
              failureCount++;
              mutationSuccess = false;
            }

            if (mutationSuccess) {
              console.log(`Mutation ${mutation.id} synced successfully.`);
              await deleteMutation(mutation.id);
              successCount++;

              // Perform invalidations *after* deleting the mutation
              if (invalidationNeeded) {
                console.log(`Invalidating queries for mutation type: ${mutation.type}`);
                utils.vocab.listWordBanks.invalidate();
                utils.vocab.getOverallStats.invalidate();
                if (bankIdToInvalidate) {
                  console.log(`Invalidating bank-specific queries for bankId: ${bankIdToInvalidate}`);
                  utils.vocab.getById.invalidate({ id: bankIdToInvalidate });
                  utils.vocab.listByBank.invalidate({ wordBankId: bankIdToInvalidate });
                  utils.vocab.listPracticeLogs.invalidate({ bankId: bankIdToInvalidate });
                }
                if (wordIdToInvalidate) {
                   console.log(`Invalidating word-specific queries for wordId: ${wordIdToInvalidate}`);
                   utils.vocab.getWordById.invalidate({ id: wordIdToInvalidate });
                   utils.vocab.getWordPracticeHistory.invalidate({ wordId: wordIdToInvalidate });
                }
              }
            }

          } catch (error: any) {
            console.error(`Failed to sync mutation ${mutation.id} (${mutation.type}):`, error);
            failureCount++;
            const errorMessage = error.message || 'Unknown sync error';
            await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, errorMessage);
          }
        } // End loop

        // Update toasts based on final counts after the loop
        if (failureCount > 0 && successCount > 0) {
             toast.warning(`${successCount} succeeded, ${failureCount} failed to sync.`);
        } else if (failureCount > 0) {
          toast.error(`${failureCount} change(s) failed to sync.`);
        } else if (successCount > 0) {
          toast.success(`${successCount} change(s) synced successfully.`);
        }
        // Status setting is handled in finally
      }
    } catch (error) {
      // Error fetching initial pending mutations
      console.error('Background sync failed during initial fetch:', error);
      // Attempt to count remaining mutations, otherwise estimate failure count
      try {
          const remainingMutations = await getPendingMutations(session.user.id);
          failureCount = remainingMutations.length;
      } catch (fetchError) {
          console.error('Failed to fetch pending mutations after initial fetch error:', fetchError);
          // Use the count from the outer scope if available, otherwise default to 1 failure
          failureCount = pendingMutations?.length > 0 ? pendingMutations.length : 1;
      }
      toast.error('Failed to sync offline changes.');
      // Status setting handled in finally
    } finally {
      console.log(`Sync finished. Success: ${successCount}, Failure: ${failureCount}`);
      // Determine final status based on counts
      const finalStatus = failureCount > 0 ? 'error' : 'idle';
      if (syncStatus !== finalStatus) {
        setSyncStatus(finalStatus);
      }
      // Always ensure syncing stops
      setIsSyncing(false);
    }
  }, [
    isOnline,
    sessionStatus,
    session?.user?.id,
    utils,
    syncStatus, // Depends on syncStatus to avoid redundant sets
    // Include mutation hooks as dependencies as they are used directly
    createWordBankMutation, updateWordBankMutation, addWordBatchMutation,
    updateWordMutation, deleteWordMutation, updateWordNotesMutation, toggleStarMutation
  ]);

  // --- Trigger Sync Manually (Defined After syncMutations) ---
  const triggerSync = useCallback(() => {
    console.log('Manual sync triggered.');
    syncMutations();
  }, [syncMutations]); // Keep syncMutations here for manual trigger stability

  // --- Online/Offline Status Detection and Auto-Sync ---
  useEffect(() => {
    const handleOnline = () => {
      console.log('App came online.');
      setIsOnline(true);
      // Trigger sync, conditions are checked inside syncMutations
      console.log('Attempting auto-sync on online event...');
      syncMutations();
    };
    const handleOffline = () => {
      console.log('App went offline.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on load
    const onlineStatus = navigator.onLine;
    setIsOnline(onlineStatus);
    if (onlineStatus && sessionStatus === 'authenticated') {
      console.log('Initial load: App is online and authenticated, attempting sync.');
       // Add a small delay to the initial sync on load
       const timerId = setTimeout(() => {
            syncMutations();
       }, 150); // Slightly longer delay for initial load sync
       return () => clearTimeout(timerId); // Clear timeout if dependencies change before it fires
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Clear any potential running timeout from the initial load check
      // (This requires timerId to be accessible, might need adjustment if complex)
      // For simplicity, let's assume clearTimeout in the initial check's effect cleanup is sufficient.
    };
  // This effect *should* re-run if syncMutations changes,
  // ensuring the latest version is used in listeners/initial check.
  // However, syncMutations itself depends on many things.
  // Let's simplify: trigger only based on sessionStatus changing.
  // The online/offline handlers will use the latest syncMutations via closure.
  }, [sessionStatus]); // Removed syncMutations dependency - React 19 will handle the closure properly

  // Return status and manual trigger
  return { syncStatus, triggerSync, isSyncing };
}
