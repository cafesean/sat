# Optimistic UI with Asynchronous Content Generation

## Problem Analysis

The current issues with words being "stuck" in processing state stem from several root causes:

1. **State Management Complexity**: Multiple components are trying to manage and react to the same state changes
2. **Async Content Generation**: Words are being enriched asynchronously by backend processes
3. **Synchronization Issues**: Local state, IndexedDB, and remote data aren't always in sync
4. **Reactive Loop Issues**: Multiple components triggering refreshes creates potential infinite loops
5. **Inconsistent Status Tracking**: No clear, centralized way to track a word's enrichment status

## Core Principles for Async Content Management

### 1. Single Source of Truth

- Designate one central state manager for enrichment status
- All components read from this state but don't manage it independently
- Clear ownership of state transitions

### 2. Proper Optimistic UI Pattern

- Immediately show optimistic UI for user actions
- Clearly distinguish between "confirmed" vs "pending" states
- Have a consistent visual language for various states
- Properly handle error cases and revert optimistic updates when needed

### 3. Appropriate Loading States

- Design explicit visual states for each stage:
  - Initial "Not started" state
  - "Processing" state with clear indication of background work
  - "Complete" state showing processed content
  - "Error" state with recovery options

### 4. Event-Driven Architecture

- Use events rather than polling for status changes
- Components subscribe to status changes instead of triggering checks
- Decouple data fetching from UI updates

## Implementation Plan

### 1. State Management Improvements

#### State Machine for Word Enrichment

```typescript
// Define explicit states for each word
enum WordEnrichmentStatus {
  INITIAL = 'initial',           // Just added, not yet sent for enrichment
  PENDING = 'pending',           // Sent for enrichment, waiting for results
  ENRICHED = 'enriched',         // Successfully enriched
  FAILED = 'failed'              // Enrichment failed
}

// Add this field to the word object structure
interface Word {
  // ... existing fields
  enrichmentStatus: WordEnrichmentStatus;
  enrichmentError?: string;      // Optional error message if failed
  lastEnrichmentAttempt?: number; // Timestamp of last attempt
}
```

#### Centralized Status Management in Hook

```typescript
// In useWords.ts
const updateEnrichmentStatus = (wordId: string, status: WordEnrichmentStatus, error?: string) => {
  setWords(prev => 
    prev?.map(word => 
      word.id === wordId 
        ? { ...word, enrichmentStatus: status, enrichmentError: error } 
        : word
    ) ?? []
  );
  
  // Also update IndexedDB
  db.words.update(wordId, { enrichmentStatus: status, enrichmentError: error });
}
```

### 2. ReactQuery / tRPC Optimization

#### Proper Cache Management

```typescript
// Configure proper staleTimes for different query types
const wordQuery = api.vocab.getWordById.useQuery(
  { id: wordId },
  {
    staleTime: 30000,        // Consider data fresh for 30 seconds
    cacheTime: 5 * 60 * 1000 // Keep in cache for 5 minutes
  }
);

// For list queries that show multiple words
const wordsListQuery = api.vocab.listByBank.useQuery(
  { wordBankId },
  { 
    staleTime: 10000,  // Shorter stale time for lists
    refetchOnMount: true
  }
);
```

#### Optimistic Updates with Mutation

```typescript
// When adding a new word
const addWordMutation = api.vocab.addWord.useMutation({
  onMutate: async (newWord) => {
    // Cancel any outgoing refetches
    await utils.vocab.listByBank.cancel();
    
    // Snapshot the previous value
    const previousWords = utils.vocab.listByBank.getData();
    
    // Optimistically update to the new value
    utils.vocab.listByBank.setData(
      { wordBankId }, 
      (old) => [...(old || []), { ...newWord, enrichmentStatus: 'pending' }]
    );
    
    return { previousWords };
  },
  onError: (err, newWord, context) => {
    // If the mutation fails, use the context returned from onMutate to roll back
    utils.vocab.listByBank.setData({ wordBankId }, context?.previousWords);
  },
  onSettled: () => {
    // Always refetch after error or success to make sure our local data is correct
    utils.vocab.listByBank.invalidate({ wordBankId });
  }
});
```

### 3. Reactive UI Components

#### Status-Aware Component

```tsx
const WordCard = ({ word }) => {
  // Extract status for clear rendering logic
  const { enrichmentStatus } = word;
  
  return (
    <div className="word-card">
      <div className="word-text">{word.text}</div>
      
      {enrichmentStatus === 'initial' && (
        <div className="status-badge initial">Queuing...</div>
      )}
      
      {enrichmentStatus === 'pending' && (
        <div className="status-badge pending">
          <Spinner size="small" />
          <span>Processing...</span>
        </div>
      )}
      
      {enrichmentStatus === 'failed' && (
        <div className="status-badge error">
          <ErrorIcon />
          <span>Processing failed</span>
          <Button onClick={handleRetry}>Retry</Button>
        </div>
      )}
      
      {enrichmentStatus === 'enriched' && (
        <div className="word-details">
          <div className="definition">{word.wordMaster.definition}</div>
          <div className="type">{word.wordMaster.wordType}</div>
        </div>
      )}
    </div>
  );
};
```

### 4. Background Synchronization

#### Real-time Updates with WebSockets (Optional)

```typescript
// Set up a socket connection for real-time updates
const socket = new WebSocket('wss://your-api.com/words/updates');

socket.addEventListener('message', (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'word_enriched') {
    // Update local state
    updateEnrichmentStatus(update.wordId, 'enriched');
    
    // Invalidate the specific word query to refetch fresh data
    utils.vocab.getWordById.invalidate({ id: update.wordId });
  }
});
```

#### Polling Fallback (More Controlled)

```typescript
// A more controlled polling approach
const pollEnrichmentStatus = useCallback(() => {
  // Only poll for words in 'pending' state
  const pendingWords = words?.filter(w => w.enrichmentStatus === 'pending') || [];
  
  if (pendingWords.length === 0) return;
  
  console.log(`Polling for ${pendingWords.length} pending words`);
  
  // Use a batch endpoint rather than individual queries
  api.vocab.checkEnrichmentStatus.fetch({ 
    wordIds: pendingWords.map(w => w.id) 
  }).then(results => {
    results.forEach(result => {
      if (result.isEnriched) {
        updateEnrichmentStatus(result.wordId, 'enriched');
        utils.vocab.getWordById.invalidate({ id: result.wordId });
      } else if (result.hasFailed) {
        updateEnrichmentStatus(result.wordId, 'failed', result.error);
      }
    });
  });
}, [words, updateEnrichmentStatus, utils]);

// Use an effect with a reasonable interval
useEffect(() => {
  const hasWordsAwaitingEnrichment = words?.some(w => w.enrichmentStatus === 'pending') || false;
  
  if (!hasWordsAwaitingEnrichment) return;
  
  const intervalId = setInterval(pollEnrichmentStatus, 5000);
  return () => clearInterval(intervalId);
}, [words, pollEnrichmentStatus]);
```

### 5. UX Design Patterns

1. **Skeleton Loading States**: Show skeleton placeholders while initial content loads
2. **Progressive Disclosure**: Start with minimal content, add details as they become available
3. **Background Processing Indicators**: Small indicators showing background work happening
4. **Toast Notifications**: Notify users when background processes complete

## Implementation Steps

1. **Step 1**: Add explicit enrichment status to Word type and update DB schema
2. **Step 2**: Update the `useWords` hook to centralize status management
3. **Step 3**: Update all UI components to use the status field
4. **Step 4**: Implement proper optimistic updates for mutation
5. **Step 5**: Add appropriate loading states to all components
6. **Step 6**: Set up a controlled background polling mechanism 
7. **Step 7**: Update the backend to properly track enrichment status

## Testing Strategy

1. **Unit Tests**: Test state transitions in isolation
2. **Integration Tests**: Test integration between UI components and data hooks
3. **E2E Tests**: Simulate actual user flows, including network delays
4. **Manual Testing**: Test edge cases like network failures during enrichment

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Backend processes take too long | Implement timeout and retry mechanism |
| Network disconnection during processing | Store pending operations and retry on reconnect |
| Race conditions when multiple components update | Single source of truth for all updates |
| UI gets out of sync with actual data | Implement reconciliation on reconnect |

## Conclusion

This approach creates a robust system for handling asynchronously generated content by:

1. Making the state explicit with well-defined transitions
2. Centralizing state management to avoid conflicts
3. Creating a clear visual language for different states
4. Using controlled background updates to refresh content
5. Implementing proper optimistic UI patterns

By following these patterns, we can create a responsive, resilient UI that gracefully handles async content generation while providing users with clear feedback throughout the process.
