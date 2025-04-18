import { create } from 'zustand'
import { db, type Word } from '@/lib/storage'
import { api } from '@/utils/trpc'
import { WordListItem } from '@/app/vocabulary/banks/[bankId]/page'

// Define the enrichment status enum
export enum WordEnrichmentStatus {
  INITIAL = 'initial',    // Just added, not yet sent for enrichment
  PENDING = 'pending',    // Sent for enrichment, waiting for results
  ENRICHED = 'enriched',  // Successfully enriched
  FAILED = 'failed'       // Enrichment failed
}

// Define the store state and actions
interface WordEnrichmentState {
  // State - track enrichment status by word ID
  enrichmentStatus: Record<string, WordEnrichmentStatus>;
  
  // Actions
  updateEnrichmentStatus: (wordId: string, status: WordEnrichmentStatus, error?: string) => void;
  markAsPending: (wordId: string) => void;
  markAsEnriched: (wordId: string) => void;
  markAsFailed: (wordId: string, error: string) => void;
  getStatus: (wordId: string) => WordEnrichmentStatus;
  checkIfWordIsEnriched: (word: Word | WordListItem) => boolean;
  
  // Modified to accept utils as parameter rather than calling hook
  pollPendingWords: (bankId: string, utils: ReturnType<typeof api.useUtils>) => Promise<void>;
}

// Create the store
export const useWordEnrichmentStore = create<WordEnrichmentState>((set, get) => ({
  // Initial state
  enrichmentStatus: {},
  
  // Update the enrichment status for a word
  updateEnrichmentStatus: (wordId, status, error) => {
    set(state => ({
      enrichmentStatus: {
        ...state.enrichmentStatus,
        [wordId]: status
      }
    }));
    
    // Also update in IndexedDB - use custom property approach to avoid type errors
    // We'll manually handle these fields in the DB schema
    try {
      db.transaction('rw', db.words, async () => {
        const word = await db.words.get(wordId);
        if (word) {
          // Use any to bypass strict typing for these custom properties
          const updatedWord = word as any;
          updatedWord.enrichmentStatus = status;
          if (error) updatedWord.enrichmentError = error;
          await db.words.put(updatedWord);
        }
      });
    } catch (err) {
      console.error(`Failed to update word enrichment status in IndexedDB:`, err);
    }
  },
  
  // Helper to mark a word as pending enrichment
  markAsPending: (wordId) => {
    get().updateEnrichmentStatus(wordId, WordEnrichmentStatus.PENDING);
  },
  
  // Helper to mark a word as enriched
  markAsEnriched: (wordId) => {
    get().updateEnrichmentStatus(wordId, WordEnrichmentStatus.ENRICHED);
  },
  
  // Helper to mark a word as failed
  markAsFailed: (wordId, error) => {
    get().updateEnrichmentStatus(wordId, WordEnrichmentStatus.FAILED, error);
  },
  
  // Get the current status for a word
  getStatus: (wordId) => {
    return get().enrichmentStatus[wordId] || WordEnrichmentStatus.INITIAL;
  },
  
  // Helper to check if a word is fully enriched based on its data
  checkIfWordIsEnriched: (word: Word | WordListItem) => {
    return !!word.wordMaster && 
           !!word.wordMaster.definition && 
           !!word.wordMaster.wordType;
  },
  
  // Poll for updates to pending words - accepts utils as a parameter
  pollPendingWords: async (bankId, utils) => {
    const state = get();
    
    // Get all pending word IDs
    const pendingWordIds = Object.entries(state.enrichmentStatus)
      .filter(([_, status]) => status === WordEnrichmentStatus.PENDING)
      .map(([id]) => id);
    
    if (pendingWordIds.length === 0) return;
    
    console.log(`Polling for ${pendingWordIds.length} pending words`);
    
    try {
      // Invalidate the list query to get fresh data
      utils.vocab.listByBank.invalidate({ wordBankId: bankId });
      
      // Check each pending word individually
      for (const wordId of pendingWordIds) {
        try {
          // Invalidate the specific word query
          utils.vocab.getWordById.invalidate({ id: wordId });
          
          // We need to refetch via the query hooks rather than directly calling fetch
          // This will be triggered via the invalidation above
          // The UI components will handle the rest based on the store state
        } catch (err) {
          console.error(`Failed to check word ${wordId}:`, err);
        }
      }
    } catch (err) {
      console.error('Error polling for pending words:', err);
    }
  }
})); 