# TS-SRS-Practice: Technical Solution Proposal for Enhancing getPrioritizedWords API for Infinite SRS Practice Sessions

## Objective
Enhance the existing getPrioritizedWords API and related components to support infinite spaced repetition system (SRS) practice sessions with pagination and session state tracking. This will improve learning effectiveness and user experience by enabling continuous, prioritized word practice.

## Proposed Solution

### 1. Session State Tracking
- Extend the `PracticeSession` model in the Prisma schema to include a new field, e.g., `lastFetchedWordId` (String, optional) or `lastFetchedOffset` (Int, optional).
- This field will store the ID or offset of the last word fetched in the current practice session.
- Update this field after each batch of words is fetched to maintain session state.

### 2. Pagination in getPrioritizedWords API
- Modify the `getPrioritizedWords` API to accept an additional input parameter: `cursor` (string) or `offset` (number).
- When provided, the API will fetch words starting after the cursor or offset, ordered by SRS priority (interval ascending, nextReviewDate ascending).
- Use cursor-based pagination (preferred) or offset-based pagination depending on database capabilities and performance considerations.
- If no cursor/offset is provided, fetch from the beginning as currently implemented.

### 3. Frontend Integration
- Update the frontend component `LearnWordsWithSession` to:
  - Track the cursor or offset of the last fetched word.
  - Pass this cursor/offset in subsequent calls to `getPrioritizedWords`.
  - Append newly fetched words to the existing word list to enable infinite scrolling/practice.
- Handle session start and end mutations to initialize and clear session state accordingly.

### 4. Consistent Batches and Reshuffling
- Ensure the API returns consistent batches of words until all due words are exhausted.
- When all due words are reviewed, reshuffle or restart the session as per SRS logic.
- Reset the cursor/offset and update session state accordingly.

### 5. Unit Testing
- Extend existing tests in `practice.test.ts` to cover:
  - Pagination behavior with cursor/offset.
  - Session state updates after fetching words.
  - Edge cases such as end of word list and session restart.
- Mock database queries to verify correct filtering and ordering with pagination.

## Benefits
- Enables infinite, prioritized word practice sessions.
- Improves user experience by seamless word loading.
- Maintains accurate session state for better tracking and analytics.

## Next Steps
- Implement schema migration to add session state field.
- Update API and frontend code as described.
- Write and run unit tests.
- Perform integration testing to validate end-to-end flow.

---

This proposal outlines the technical approach to enhance the SRS practice feature with pagination and session state tracking for infinite practice sessions.