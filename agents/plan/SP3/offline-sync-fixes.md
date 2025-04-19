# Offline Data Sync & Loading Fix Plan

This plan addresses issues identified with the offline-first data loading and synchronization after implementing Tickets 12-15.

## Reported Issues:

1.  **Stale Word Bank List Data (`/vocabulary` page):**
    *   **Symptoms:** Word counts and mastery percentages show 0%, "Add Words" button shown instead of "Practice", practice history missing upon initial load after login.
    *   **Hypothesis:** Initial fetch/sync of `wordBanks` data (including counts, mastery, practice history linkage) from server to IndexedDB upon login/app load is incomplete or failing. The UI is likely reading stale/empty local data.
    *   **Investigation:**
        *   Review the logic in `useWordBanks` hook (`src/hooks/useWordBanks.ts`) responsible for fetching from the server and updating IndexedDB.
        *   Check the tRPC procedure `vocab.listWordBanks` (`src/server/api/routers/vocab.ts`) to ensure it returns all necessary data (word counts, mastery, last practiced).
        *   Inspect IndexedDB (`SATStudyAppDB` -> `wordBanks` table) after login to see what data is actually stored.
        *   Verify how practice history is linked/fetched for the main vocabulary page.

2.  **Incomplete Word Data (`/vocabulary/banks/[bankId]` page):**
    *   **Symptoms:** Words load, but `wordMaster` details (definition, samples, translations) and `notes` are missing. `isStarred` *is* working correctly.
    *   **Hypothesis:** The `useWords` hook or the underlying `storage.ts` functions might not be correctly fetching/storing/joining `wordMaster` data or `notes` locally. Alternatively, the tRPC procedure `vocab.listByBank` might not be returning the full `wordMaster` object needed, or the local storage logic isn't handling it. The fact that `isStarred` works suggests the basic `Word` record sync is partially functional.
    *   **Investigation:**
        *   Review `useWords` hook (`src/hooks/useWords.ts`) and `storage.ts` functions (`getWordsByBank`, `addWord`, `updateWord`) for handling `wordMaster` and `notes`.
        *   Check the tRPC procedure `vocab.listByBank` (`src/server/api/routers/vocab.ts`) to confirm it includes the full `wordMaster` relation and `notes`.
        *   Inspect IndexedDB (`words` table) to see if `wordMaster` data and `notes` are being stored.
        *   Examine the component rendering the words (`WordCardLargeGrid`, `WordCardSmallGrid`, `WordListItemView`) to ensure they correctly access nested `wordMaster` data and `notes`.

3.  **Practice Session Start Error:**
    *   **Symptoms:** Error message "Error loading data: Failed to fetch word banks from server" when trying to start a practice session.
    *   **Hypothesis:** The `startVocabSession` tRPC mutation or the component logic triggering it might be incorrectly attempting to fetch all word banks, or there's an unrelated error within the mutation itself.
    *   **Investigation:**
        *   Review the component logic that calls `startVocabSession` (likely in `/vocabulary/banks/[bankId]/page.tsx` or a related component).
        *   Examine the `startVocabSession` tRPC procedure (`src/server/api/routers/vocab.ts`) for any unintended dependencies or errors.
        *   Check network requests in browser dev tools when the error occurs.

## Proposed Fix Plan:

1.  **[X] Fix Initial Word Bank Sync:**
    *   **Status:** Addressed.
    *   **Action:** Modified `useWordBanks` hook (`src/hooks/useWordBanks.ts`) to explicitly re-read data from IndexedDB after `bulkPut` during sync, ensuring component state accurately reflects the stored data. The hook, tRPC procedure (`vocab.listWordBanks`), storage layer (`storage.ts`), and UI component (`vocabulary/page.tsx`) were verified to handle the required fields (`wordCount`, `masteryPercentage`, `lastPracticedAt`).
    *   **Note:** The issue likely stemmed from the UI rendering potentially stale state before the background sync fully updated both IndexedDB and the hook's state.
2.  **[X] Fix Word Detail Sync:**
    *   **Status:** Addressed.
    *   **Action:** Updated `Word` interface in `src/lib/storage.ts` to match the full data structure (including nested `wordMaster`, `notes`, SRS fields) returned by `vocab.listByBank`. Corrected the `normalizeWord` function in `src/hooks/useWords.ts` to map these fields properly and use `bulkPut` for syncing. Fixed `WordListItem` type definition in `src/app/vocabulary/banks/[bankId]/page.tsx`. Verified UI components (`WordCardLargeGrid`, `WordCardSmallGrid`, `WordListItemView`, `WordInteractionModal`) access data correctly.
    *   **Note:** The primary issue was the mismatch between the local data model (`Word` interface) and the actual data structure fetched from the server.
3.  **[-] Fix Practice Session Start:**
    *   **Status:** Investigated; root cause unclear, but direct logic seems correct.
    *   **Action:** Analyzed client (`WordBankCard` in `vocabulary/page.tsx`) and server (`startVocabSession` procedure, tRPC context, middleware). Confirmed the session start logic itself does not fetch the word bank list. The specific error message ("Failed to fetch word banks from server") likely originates from the `useWordBanks` hook's error handling, possibly triggered indirectly or coincidentally by the session start flow, rather than the mutation itself failing with that message. Simplified client-side error reporting in `WordBankCard`'s `onError` handler to display the raw error message from the mutation for better diagnosis if the issue persists.
    *   **Next Steps:** Requires testing to see if the issue persists and if the refined error message provides more clues. If it does, further investigation into potential side effects or interactions (e.g., with background sync) might be needed.
4.  **[X] Verify Offline Mutation Integration:**
    *   **Status:** Addressed.
    *   **Action:** Integrated offline queueing (`queueMutation`) using `navigator.onLine` check into the following actions:
        *   `useWords`: `update`, `remove`.
        *   `useWordBanks`: `addBank`.
        *   `WordInteractionModal`: `handleSaveNote`, `toggleStar` button `onClick`.
        *   `WordCardLargeGrid`: `toggleStar` button `onClick`.
        *   `WordCardSmallGrid`: `toggleStar` button `onClick`.
        *   `WordListItemView`: `toggleStar` button `onClick`.
        *   `AddWordsModal`: `handleSubmit` (for `addBatch`).
    *   **Action:** Added new `MutationType` values (`word/toggleStar`, `word/addBatch`) to `src/lib/storage.ts`.
    *   **Action:** Updated `useBackgroundSync` hook to handle the new mutation types.
5.  **[X] Fix Empty Practice History:**
    *   **Status:** Addressed.
    *   **Action:** Added `listPracticeLogs` tRPC procedure to `src/server/api/routers/vocab.ts` (including `userId` in the session include).
    *   **Action:** Updated `usePracticeLogs` hook (`src/hooks/usePracticeLogs.ts`) to fetch logs from the server via tRPC and sync them to IndexedDB, similar to `useWordBanks` and `useWords`. Corrected normalization logic and fixed schema validation error by adjusting fetch limit. Added offline queueing for the `add` function.
6.  **[X] Fix Word Bank Detail Page Loading:**
    *   **Status:** Addressed.
    *   **Action:** Stabilized `fetchAndSyncRemote` callback dependencies in `src/hooks/useWords.ts`. Added comparison logic to prevent unnecessary state updates if fetched data is identical to local data. Corrected initial load `useEffect` dependencies and fixed minor type/logic errors introduced during refactoring.
7.  **[ ] Test Thoroughly:**
    *   Test login flow, viewing vocabulary, viewing word bank details, starting practice, and performing actions online and offline. Verify data consistency and UI state.


# Other issues
- [X] Fix Maximum Update Depth Exceeded Error (`/vocabulary` page):
    *   **Status:** Addressed.
    *   **Action:** Stabilized `useEffect` and `useCallback` dependencies in `src/hooks/useWordBanks.ts` and `src/hooks/useWords.ts` to prevent potential re-render loops caused by unstable references or concurrent state updates interacting with UI components (like the sort `Select`). Added comparison logic to avoid unnecessary state updates.
- [-] Fix Star State Retention: Investigate why starring doesn't update UI immediately.
    *   **Status:** Investigated. Ensured all star toggle handlers (`WordInteractionModal`, `WordCardLargeGrid`, `WordCardSmallGrid`, `WordListItemView`) update local DB first and then invalidate the relevant tRPC query (`getWordById` or `listByBank`). This *should* trigger a UI update via refetch from local DB.
    *   **Next Steps:** Requires testing. If the issue persists, further debugging focusing on React Query cache invalidation and component re-rendering is needed.
- [X] Fix Practice Session Word Loading: Fix issue where starting practice finds no words.
    *   **Status:** Addressed.
    *   **Action:** Investigated `getNextVocabWord` and `addBatch` procedures. Confirmed new words should be available initially. Corrected the `rateWordReviewCount` procedure to properly update `nextDueAtReviewCount` on the word and increment `reviewCount` on the word bank, ensuring words become available again after being practiced via the review count SRS method.
    *   **Note:** Words practiced *before* this fix using the review count method might still be in an incorrect state.

src/components/ui/select.tsx (19:3) @ _c


  17 |   React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
  18 | >(({ className, children, ...props }, ref) => (

- [ ] Fix error: createContext for sliao01@hotmail.com
❌ tRPC failed on vocab.listPracticeLogs: [
  {
    "code": "too_big",
    "maximum": 50,
    "type": "number",
    "inclusive": true,
    "exact": false,
    "message": "Number must be less than or equal to 50",
    "path": [
      "limit"
    ]
  }
- [X] Fix tRPC Error `vocab.listPracticeLogs` (limit too big):
    *   **Status:** Addressed.
 
 Use lazy loading for all lists
 -[x] Practice history should show word bank practice sessions, not word practice history
 - [ ] Stars don't retain state when clicked, but they are still saved
 - [ ] Starting a practice session, no words are found
 - [x] Revert the UI layout of the word bank list back to the original design before implementing local storage. Reference previous code at /specs/code/vocab-ui.tsx
- Standar