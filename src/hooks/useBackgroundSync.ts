'use client'

import {
  deleteMutation,
  getPendingMutations,
  updateMutationStatus
} from '@/lib/storage';
import { api } from '@/utils/trpc';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const MAX_SYNC_ATTEMPTS = 3; // Limit retry attempts

export function useBackgroundSync() {
  const { data: session, status: sessionStatus } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false); // Prevent concurrent syncs

  // Get tRPC utils context for invalidation if needed later
  const utils = api.useUtils();

  // --- Instantiate Mutation Hooks ---
  const createWordBankMutation = api.vocab.createWordBank.useMutation();
  const updateWordBankMutation = api.vocab.update.useMutation(); // Assuming 'update' is the correct name for word bank update
  // No deleteWordBank mutation exists in the router provided
  const addWordBatchMutation = api.vocab.addBatch.useMutation();
  const updateWordMutation = api.vocab.updateWord.useMutation();
  const deleteWordMutation = api.vocab.deleteWord.useMutation();
  const updateWordNotesMutation = api.vocab.updateWordNotes.useMutation();
  const toggleStarMutation = api.vocab.toggleStar.useMutation(); // Add toggleStar mutation hook
  // No specific practiceLog/add mutation exists, handled as placeholder

  // --- Online/Offline Status Detection ---
  useEffect(() => {
    const handleOnline = () => {
      console.log('App came online.');
      setIsOnline(true);
      // Optionally trigger sync immediately upon coming online
      triggerSync();
    };
    const handleOffline = () => {
      console.log('App went offline.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array ensures this runs once

  // --- Core Sync Logic ---
  const syncMutations = useCallback(async () => {
    if (isSyncing || !isOnline || sessionStatus !== 'authenticated' || !session?.user?.id) {
      console.log('Sync skipped:', { isSyncing, isOnline, sessionStatus });
      return;
    }

    console.log('Starting background sync...');
    setIsSyncing(true);
    setSyncStatus('syncing');
    let successCount = 0;
    let failureCount = 0;

    try {
      const pendingMutations = await getPendingMutations(session.user.id);
      if (pendingMutations.length === 0) {
        console.log('No pending mutations to sync.');
        setSyncStatus('idle');
        setIsSyncing(false);
        return;
      }

      console.log(`Found ${pendingMutations.length} pending mutations.`);
      toast.info(`Syncing ${pendingMutations.length} offline changes...`);

      for (const mutation of pendingMutations) {
        if (!mutation.id) continue; // Should not happen with auto-increment

        // Skip mutations that have failed too many times
        if (mutation.status === 'failed' && mutation.attempts >= MAX_SYNC_ATTEMPTS) {
          console.warn(`Skipping mutation ${mutation.id} (${mutation.type}) due to max attempts reached.`);
          continue;
        }

        try {
          console.log(`Processing mutation ${mutation.id}: ${mutation.type}`);
          await updateMutationStatus(mutation.id, 'processing', mutation.attempts);

          // --- Map MutationType to tRPC call ---
          let mutationSuccess = false;
          switch (mutation.type) {
            // --- Word Bank Mutations ---
            case 'wordBank/add':
              // Payload: { name: string, description?: string }
              await createWordBankMutation.mutateAsync(mutation.payload);
              mutationSuccess = true;
              break;
            case 'wordBank/update':
              // Payload: { id: string, name?: string, description?: string }
              await updateWordBankMutation.mutateAsync(mutation.payload);
              mutationSuccess = true;
              break;
            case 'wordBank/delete':
              // No direct delete procedure found in vocabRouter
              console.warn(`Syncing 'wordBank/delete' is not supported by the current API.`);
              // Mark as failed to avoid retrying indefinitely
              await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, 'Delete Word Bank not supported by API');
              failureCount++;
              mutationSuccess = false; // Ensure it's not marked as success
              break;

            // --- Word Mutations ---
            case 'word/add':
              // Payload: { wordBankId: string, wordText: string }
              // Uses addBatch for single word addition
              if (mutation.payload?.wordBankId && mutation.payload?.wordText) {
                await addWordBatchMutation.mutateAsync({
                  wordBankId: mutation.payload.wordBankId,
                  wordsText: mutation.payload.wordText, // Send single word as string
                });
                mutationSuccess = true;
              } else {
                 throw new Error('Invalid payload for word/add mutation.');
              }
              break;
            case 'word/addBatch':
              // Payload: { wordBankId: string, wordsText: string }
              await addWordBatchMutation.mutateAsync(mutation.payload);
              mutationSuccess = true;
              break;
            case 'word/update':
              // Payload: { wordId: string, text?: string, wordMasterId?: string }
              await updateWordMutation.mutateAsync(mutation.payload);
              mutationSuccess = true;
              break;
            case 'word/delete':
              // Payload: { wordId: string }
              await deleteWordMutation.mutateAsync({ wordId: mutation.payload.wordId });
              mutationSuccess = true;
              break;
            case 'word/toggleStar':
              // Payload: { wordId: string }
              await toggleStarMutation.mutateAsync({ wordId: mutation.payload.wordId });
              mutationSuccess = true;
              break;

            // --- Practice Log Mutations ---
            case 'practiceLog/add':
              // Payload: Full PracticeLog object (potentially)
              console.warn(`Syncing 'practiceLog/add' is complex and might require a specific endpoint or different handling.`);
              // For now, mark as success to remove from queue, but needs review/implementation.
              mutationSuccess = true; // Placeholder - REVIEW THIS LOGIC
              break;

            // --- Note Mutations (Using updateWordNotes) ---
             case 'note/add':
             case 'note/update':
               // Payload: { wordId: string, notes: string }
               if (mutation.payload?.wordId && typeof mutation.payload?.notes === 'string') {
                 await updateWordNotesMutation.mutateAsync({
                   wordId: mutation.payload.wordId,
                   notes: mutation.payload.notes,
                 });
                 mutationSuccess = true;
               } else {
                 throw new Error('Invalid payload for note/add or note/update mutation.');
               }
               break;
             case 'note/delete':
               // Payload: { wordId: string } - We set notes to null
                if (mutation.payload?.wordId) {
                  await updateWordNotesMutation.mutateAsync({
                    wordId: mutation.payload.wordId,
                    notes: null, // Set notes to null to delete
                  });
                  mutationSuccess = true;
                } else {
                  throw new Error('Invalid payload for note/delete mutation.');
                }
               break;

            default:
              // Ensure mutation.type is handled if it's a known type but has no case
              const exhaustiveCheck: never = mutation.type;
              console.warn(`Unhandled known mutation type: ${exhaustiveCheck}`);
              // Mark as failed for unhandled known types
              await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, `Unhandled mutation type: ${mutation.type}`);
              // Mark as failed to avoid infinite loops for unknown types
              await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, `Unknown mutation type: ${mutation.type}`);
              failureCount++;
          }

          // --- Handle Result ---
          if (mutationSuccess) {
            console.log(`Mutation ${mutation.id} synced successfully.`);
            await deleteMutation(mutation.id); // Remove from queue on success
            successCount++;
            // Optionally invalidate relevant tRPC queries here
            // e.g., utils.vocab.listWordBanks.invalidate();
          }
          // Failure is handled within the switch/case for specific errors

        } catch (error: any) {
          console.error(`Failed to sync mutation ${mutation.id} (${mutation.type}):`, error);
          failureCount++;
          const errorMessage = error.message || 'Unknown sync error';
          await updateMutationStatus(mutation.id, 'failed', mutation.attempts + 1, errorMessage);
          // Optionally break the loop on first error or continue processing others
        }
      } // End loop

      if (failureCount > 0) {
        toast.error(`${failureCount} offline change(s) failed to sync. Check console for details.`);
        setSyncStatus('error');
      } else {
        toast.success(`${successCount} offline change(s) synced successfully.`);
        setSyncStatus('success');
      }

    } catch (error) {
      console.error('Error fetching pending mutations:', error);
      setSyncStatus('error');
      toast.error('Failed to retrieve offline changes.');
    } finally {
      console.log('Background sync finished.');
      setIsSyncing(false);
      // Set status back to idle after a short delay?
      // setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [
      isOnline, sessionStatus, session, isSyncing, utils, // Existing deps
      createWordBankMutation, updateWordBankMutation, addWordBatchMutation, // Added mutation hooks
      updateWordMutation, deleteWordMutation, updateWordNotesMutation, toggleStarMutation // Add toggleStarMutation to deps
    ]);

  // --- Trigger Sync ---
  // Function to manually trigger sync if needed
  const triggerSync = useCallback(() => {
    if (isOnline && sessionStatus === 'authenticated' && !isSyncing) {
      syncMutations();
    }
  }, [isOnline, sessionStatus, isSyncing, syncMutations]);

  // Effect to trigger sync when dependencies change (e.g., coming online, logging in)
  useEffect(() => {
    if (isOnline && sessionStatus === 'authenticated') {
      console.log('Attempting initial sync check on load/auth.');
      triggerSync();
    }
  }, [isOnline, sessionStatus, triggerSync]); // triggerSync is memoized

  return { isOnline, syncStatus, triggerSync };
}
