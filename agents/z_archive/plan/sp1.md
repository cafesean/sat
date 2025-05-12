# Sprint 1: Vocabulary Practice and Management

This sprint focuses on implementing and refining features related to practicing and managing vocabulary words. Below are the tasks selected from the backlog:

---

## Vocabulary Practice (SRS, UI, AI Grading, History, Mastery)

* ✅ Update `prisma/schema.prisma`: Add `PracticeSession` (with `VOCABULARY` type), `WordPracticeLog` models. Add SRS fields to `Word` model.
* ✅ Run migration: `pnpm prisma migrate dev --name add-vocab-practice`. *(Combined migration done)*
* ✅ Implement `practice.startVocabSession` mutation (input: `wordBankId`; creates `PracticeSession`, saves `wordBankId`).
* ✅ Implement `practice.getNextVocabWord` query (input: `practiceSessionId`; uses SRS logic, filters by `session.wordBankId`).
* ✅ Implement `practice.submitVocabAnswer` mutation (input: sessionId, wordId, userSentence, ease; calls AI grading, saves `WordPracticeLog`, updates `Word` SRS fields).
* ✅ Implement `practice.getVocabSessionSummary` query.
* ✅ Implement SRS algorithm logic in `src/lib/srs/sm2.ts`.
* ✅ Integrate SRS logic into `getNextVocabWord` and `submitVocabAnswer`.
* ✅ Create page `src/app/vocabulary/practice/page.tsx` (Practice Setup).
* ✅ Add UI to select Word Banks (now handled by starting from specific bank).
* ✅ Add "Start Practice" button calling `practice.startVocabSession` from Word Bank Card/List Item. Redirects to `/[sessionId]`.
* ✅ Create `src/app/vocabulary/practice/[sessionId]/page.tsx` (Practice Session).
    * ✅ Fetch next word using `practice.getNextVocabWord`.
    * ✅ Display the word (`Word.text` or `WordMaster.baseWord`).
    * ✅ Provide `Textarea` for user sentence.
    * ✅ Provide ease feedback buttons (Again, Hard, Good, Easy).
    * ✅ On submit, call `practice.submitVocabAnswer`. Show loading state.
    * ✅ Display AI feedback (`WordPracticeLog.aiFeedback`, correct/incorrect).
    * ✅ Fetch next word automatically or via "Next" button.
    * ✅ Handle session completion, show summary.
    * ✅ **UI Enhancements:**
        * ✅ Add "End Session" button.
        * ✅ Add and increment "Words Answered" counter.
        * ✅ **AI Feedback Styling:** Remove variant, add icons (`CheckCircle`/`XCircle`), increase text size.
        * ✅ **Input Text Size:** Increase `Textarea` font size.
        * ⬜ **Improve AI Feedback Clarity:** Increase font weight for "Correct!" / "Needs Improvement" and feedback text. Adjust spacing. Consider `Alert` component.
* ✅ **AI Grading Integration:**
    * ✅ Add `gradeSentence` function to `src/lib/api/gemini.ts`.
    * ✅ Create API route `/api/grade-sentence/route.ts` calling `gradeSentence`. Secure endpoint.
    * ✅ Modify `practice.submitVocabAnswer` to call the API endpoint.
    * ⬜ Update grading API (`/api/grade-sentence/route.ts`) to accept `gradeLevel` from user profile and modify Gemini prompt.
    * ⬜ Update `submitVocabAnswer` tRPC mutation to fetch user's `gradeLevel` and pass it to grading API.
* ✅ **Verify Practice Session Saving:** Confirm `WordPracticeLog` creation and `Word` SRS field updates in `submitVocabAnswer`.
* ⬜ **Implement Word Practice History Display:** *(Handled in Word Detail section)*
    * ⬜ Create `getWordPracticeHistory` tRPC query.
* ✅ **Verify SRS Algorithm Integration:** Review `calculateNextReview` and its usage in `submitVocabAnswer`.
* ✅ **Quick Practice Button (Navbar):**
    * ✅ Create `startQuickVocabSession` tRPC mutation (no `wordBankId`).
    * ✅ Modify `getNextVocabWord` to handle sessions *without* a `wordBankId`.
    * ✅ Add "Quick Practice" button to Navbar with `useMutation` hook.
    * ✅ Ensure mutation call works and navigates correctly.
    * ⬜ *(Deferred Refinement)* Logic for selecting module or showing options.
* ⬜ **Practice History Tab/Modal:**
    * ✅ Create `listPracticeSessions` tRPC query (include `wordBank.name`).
    * ✅ Fetch data using `useInfiniteQuery` in `PracticeHistoryTabContent.tsx`.
    * ✅ Render data using `PracticeHistoryItem`, display `wordBankName`.
    * ⬜ Simplify `PracticeHistoryItem` layout (more compact).
    * ⬜ Change "Review Session" button to open a modal displaying results (use `getVocabSessionSummary`) instead of navigating.
* ⬜ **Practice Indicators:**
    * ⬜ Add practice count badges next to words in Word Bank Detail list (only if count > 0).
* ✅ **Practice Tracking Improvements:**
    * ✅ Add visual indicator during update.
    * ✅ Ensure immediate DB persistence.
* ✅ **Hint Feature (`/vocabulary/practice/[sessionId]`):**
    * ✅ Add `wordType` to `Word` or `WordMaster` model. Run migration.
    * ✅ Update AI enrichment (`enrichWord`, `addBatch`) to fetch/save `wordType`.
    * ✅ Create `getWordHint` tRPC query (fetch definition, type, sentence, translation).
    * ✅ Add "Hint" button to UI.
    * ✅ On click, call `getWordHint` and display data (Popover/Alert).
* ⬜ **Spaced Repetition Statistics:** Add SRS progress stats display (location TBD).

---

## Vocabulary Management (Schema, Adding, Editing, Details, Starring)

* ✅ Update `prisma/schema.prisma`: Add `Word` model with SRS fields.
* ✅ Run migration: `pnpm prisma migrate dev --name add-vocab-models`. *(Combined migration done)*
* ✅ **Word Master Schema (`WordMaster` table):** *(From `7.word-management.txt` - requires implementation)*
    * ✅ Define `WordMaster` table (id, baseWord, variations, language, wordType, definition, sampleSentences JSON, translations JSON, isDictionaryWord, timestamps).
    * ✅ Update `Word` table schema (remove text, definition etc., add `wordMasterId` FK, `isStarred`, `notes`).
    * ✅ Run migration for `WordMaster` and `Word` table changes.
* ✅ Implement `word.addBatch` tRPC mutation (handles comma/newline separated text list).
* ✅ Implement `word.listByBank` tRPC query. *(Completed)*
* ⬜ Implement `word.delete` tRPC mutation.
* ✅ Define Zod schemas in `src/schemas/vocab.schema.ts`.
* ⬜ **Word Bank Detail Page (`/vocabulary/banks/[bankId]/page.tsx`):**
    * ⬜ Create the page.
    * ⬜ Fetch and display bank details (`getById`) and word list (`listByBank`).
    * ⬜ **Display Word Details:** Use `Collapsible` to show/hide definition, sentence, translation (fetch from `WordMaster` eventually).
    * ✅ **Column Layout:** Apply grid layout.
    * ✅ **Filtering/Sorting:** Added UI controls and client-side logic. *(Needs verification/debugging)*
    * ⬜ **Add Word Input:** Add Input/Textarea and button to call `addBatch` mutation.
    * ⬜ **Inline Word Editing:** Implement editing `word.text` (or `wordMaster.baseWord`) on click/focus, saving via `updateWord` (or similar) on blur/Enter. *(Re-adding)*
    * ⬜ **Edit Word Details (Modal):** Add edit icon in collapsible to open modal for editing definition, sentence, translation (update `WordMaster` or `Word` depending on final schema). *(New Clarification)*
    * ⬜ **Delete Word:** Add delete icon button (`Trash2`) triggering `deleteWord` mutation with confirmation (`AlertDialog`). *(Re-adding)*
    * ✅ **Star Word:**
        * ✅ Add `isStarred` boolean field to `Word` model (default: false). Run migration.
        * ✅ Create `word.toggleStar` tRPC mutation.
        * ✅ Ensure `listByBank` query includes `isStarred`.
        * ✅ Add star icon button (`Star`) to toggle state visually and call mutation.
    * ✅ **Filter by Starred:** Add toggle/button to filter word list for starred words.
    * ⬜ **Word History:**
        * ✅ Add history icon button next to each word.
        * ✅ Modify trigger button to include count badge (requires fetching count/history).
        * ✅ On click, open `Dialog` (`WordHistoryDialog`).
        * ✅ Call `api.vocab.getWordPracticeHistory.useQuery` inside the modal.
        * ✅ Display loading/error states and render fetched history logs.
    * ⬜ **Mastery Indicator:**
        * ⬜ Access `interval` field for each word.
        * ⬜ Apply mapping logic (e.g., interval to level).
        * ⬜ Render as a thin colored vertical bar on the left side of the list item.
        * ⬜ Add `Tooltip` explaining the level.
    * ⬜ **Increase Word Size:** Increase font size of words in the list.
* ✅ **Word Detail Dialog (`WordDetailDialog.tsx`):**
    * ✅ Update to show details from `WordMaster` (definition, type, sentences, translations).
    * ✅ Implement note saving (`Word.notes`).
    * ✅ Implement star toggling.
    * ✅ Remove card background (`DialogContent`).
    * ✅ Match UI layout to `LearnWords` component (Card structure).
    * ✅ Remove 'X' close button (`DialogClose`).
* ⬜ **Edit Icon:** Replace word click-to-edit with a dedicated pencil icon button.
* ⬜ **Swipe to Delete (Mobile):** Implement swipe gesture for deletion on mobile.
* ⬜ **Keep Trashcan (Desktop):** Conditionally render trashcan icon for delete on desktop.
* ⬜ **Fix Serialization Error:** Resolve error in `vocab.listByBank` tRPC procedure (see `8.word-management-fixes.txt`).