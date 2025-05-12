# Consolidated Development Progress Tracker

This document summarizes the development tasks, grouped by module or topic, based on the provided progress files. Checkboxes indicate the status:

* ✅ = Completed or Mostly Completed
* ⬜ = Pending, In Progress, or Needs Verification/Refinement

---

## 1. Project Setup & Core Infrastructure

* ✅ Initialize Next.js project (`pnpm create next-app@latest --typescript --tailwind --eslint --app`).
* ⬜ Install Shadcn UI CLI: `pnpm dlx shadcn-ui@latest init`. Configure `globals.css`, `tailwind.config.ts`, `utils.ts`.
* ✅ Install core dependencies: `pnpm add zod @t3-oss/env-nextjs`
* ✅ Install Prisma: `pnpm add -D prisma` & `pnpm add @prisma/client`.
* ✅ Install Auth dependencies: `pnpm add next-auth @auth/prisma-adapter`.
* ✅ Install tRPC dependencies: `pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query`.
* ✅ Set up project structure as defined in `specs/1.framework.md`. Create necessary directories (`src/lib`, `src/server`, `src/schemas`, etc.).
* ✅ Configure `tsconfig.json` for paths aliases (`@/*`).
* ✅ Configure ESLint and Prettier for code consistency.
* ✅ Set up PostgreSQL database (local or cloud provider). *(User dependent)*
* ✅ Create `.env` file and add `DATABASE_URL`. *(File exists, user needs to add URL)*
* ✅ Initialize Prisma: `pnpm prisma init --datasource-provider postgresql`. *(Implicitly done)*
* ✅ Define initial schema in `prisma/schema.prisma` (User, Account, Session, VerificationToken models).
* ✅ Run initial migration: `pnpm prisma migrate dev --name init-auth`.
* ✅ Create Prisma client instance in `src/lib/db/prisma.ts`.
* ✅ Create tRPC context `src/server/api/context.ts` (include Prisma client, session).
* ✅ Create tRPC initialization file `src/server/api/trpc.ts` (define `t`, `publicProcedure`, `protectedProcedure` with auth middleware).
* ✅ Create root router `src/server/api/root.ts`.
* ✅ Create tRPC API route handler `src/app/api/trpc/[trpc]/route.ts`.
* ✅ Set up tRPC client provider in `src/lib/trpc/client.ts`.
* ⬜ Verify tRPC provider wrapping in `layout.tsx`.
* ✅ Set up `T3 Env` in `src/env.mjs` to validate all required variables (`DATABASE_URL`, `NEXTAUTH_*`, `GEMINI_API_KEY`, `GEMINI_MODEL_NAME`).
* ✅ Ensure `.env` is added to `.gitignore`.

---

## 2. Authentication & User Management

* ✅ Configure NextAuth options in `src/lib/auth/options.ts` (Prisma adapter, providers).
* ✅ Create NextAuth API route handler `src/app/api/auth/[...nextauth]/route.ts`.
* ⬜ Configure `.env` variables for chosen Auth providers (Google, Email Magic Link). **(Needs User Input)**
* ✅ Implement Sign In/Sign Out functionality in `Navbar` using `signIn`, `signOut`, `useSession`. *(Needs testing)*
* ⬜ *Optional:* Implement custom Email Verification flow.
* ⬜ *Optional:* Investigate/Implement OTP login flow.
* ✅ *Optional:* Decide and configure session strategy (Database vs JWT - Currently Database).
* ✅ **Add Email/Password Authentication:**
    * ✅ Modify `User` Model: Add `hashedPassword String?`, ensure `email` is unique.
    * ✅ Install `bcryptjs`.
    * ✅ Add `CredentialsProvider` to NextAuth options (`src/lib/auth/options.ts`) with `authorize` logic.
    * ⬜ Create `auth.register` tRPC mutation (check user, hash password, create/update user).
    * ⬜ Update Login UI: Add email/password fields, call `signIn('credentials')`, handle errors/success. Keep magic link option. Link to Sign Up.
    * ⬜ Create Sign Up UI (`/signup`): Add fields (email, password, confirm, name), client-side validation, call `auth.register` mutation, handle loading/feedback, redirect.
    * ⬜ Run migration: `pnpm prisma migrate dev --name add-user-password`.
    * ⬜ *Recommended:* Implement rate limiting on login/registration.
* ⬜ **Route Protection:**
    * ⬜ Add middleware (`src/middleware.ts`) to protect `/vocabulary`, `/dashboard`, `/reading-writing` routes.
    * ⬜ Redirect unauthenticated users to `/login`.
* ✅ **Login Redirect:** Redirect to `/vocabulary` after successful login.
* ⬜ **User Profile Enhancements:**
    * ⬜ Add `languagePreference` (String) and `gradeLevel` (Int) to `User` model. Run migration.
    * ⬜ *(Deferred UI)* Create a User Profile page/section to set these preferences.

---

## 3. Vocabulary Module

### 3.1. Word Banks (CRUD, Display, UI)

* ✅ Update `prisma/schema.prisma`: Add `WordBank` model.
* ✅ Run migration: `pnpm prisma migrate dev --name add-vocab-models`. *(Combined migration done)*
* ✅ Implement `wordBank.create` tRPC mutation.
* ✅ Implement `wordBank.list` tRPC query (fetch banks for user, includes word count).
* ✅ Implement `wordBank.getById` tRPC query.
* ✅ Implement `wordBank.update` tRPC mutation.
* ✅ Create page `src/app/vocabulary/page.tsx` (Vocabulary Dashboard).
* ✅ Implement UI to list user's word banks.
* ✅ Add "Create Word Bank" functionality (link to create page).
* ✅ Create `src/components/features/vocab/WordBankForm.tsx` (for create/edit).
* ✅ Add Edit button/link per word bank.
* ⬜ Add Delete button per word bank (needs `AlertDialog` confirmation).
* ✅ **Vocabulary Dashboard Refactor (`/vocabulary`):**
    * ✅ Remove `Tabs` component and `practice-history` tab.
    * ✅ Remove top-level "Practice" button from page header.
    * ✅ Add placeholders for "Overall Progress" section.
    * ✅ Add section title "Your Word Banks".
    * ✅ Add Grid/List view toggle buttons.
    * ✅ Implement conditional rendering based on `viewMode`.
    * ⬜ Persist View Mode using `localStorage`.
    * ✅ **Grid View:** Use `WordBankCard`. Keep "Create New Bank" card.
    * ⬜ **Grid View:** Remove the "Add Words" card.
    * ✅ **List View:** Create and render `WordBankListItem`. Style list item.
    * ✅ Add Filter/Sort UI controls.
    * ✅ Implement client-side filtering/sorting logic.
* ✅ **Word Bank Card Refactor (`WordBankCard`):**
    * ✅ Display `wordCount` and `masteryPercentage` with progress bar.
    * ✅ Apply `line-clamp-3` to `CardDescription`.
    * ✅ Refactor buttons: "Edit" is icon, "Manage Words" added, "Practice" triggers mutation.
    * ✅ Change "Practice" button color to `variant="default"`.
    * ⬜ Display `wordCount` in larger text.
    * ⬜ Apply a distinct, bright/fun color to the "Practice" button.
* ✅ **Word Bank Edit Page (`/vocabulary/edit/[bankId]`):**
    * ✅ Ensure `WordBankForm` is used and fetches initial data.
    * ✅ Ensure form submission calls `wordBank.update`.
    * ⬜ Add "Done" (Save Changes) and "Cancel" buttons.
    * ⬜ Implement "Cancel" button navigation.
* ⬜ **Empty Word Bank Handling:**
    * ⬜ Update practice/learn button to show "Add Words" when bank is empty.
    * ⬜ Button should direct to the word management/detail page.
    * ⬜ Add plus icon to button.
* ⬜ **Implement Word Bank Mastery Display (`/vocabulary` page):**
    * ⬜ Modify `listWordBanks` query to include words/intervals.
    * ⬜ Map results to calculate and add `masteryPercentage` per bank (consider performance).
    * ⬜ Display the percentage (text or progress bar).
* ✅ **Rename Practice Button:** Rename "Practice" to "Learn" in `WordBankListItem`.

### 3.2. Word Management (Schema, Adding, Editing, Details, Starring)

* ✅ Update `prisma/schema.prisma`: Add `Word` model with SRS fields.
* ✅ Run migration: `pnpm prisma migrate dev --name add-vocab-models`. *(Combined migration done)*
* ✅ **Word Master Schema (`WordMaster` table):** *(From `7.word-management.txt` - requires implementation)*
    * ✅ Define `WordMaster` table (id, baseWord, variations, language, wordType, definition, sampleSentences JSON, translations JSON, isDictionaryWord, timestamps).
    * ✅ Update `Word` table schema (remove text, definition etc., add `wordMasterId` FK, `isStarred`, `notes`).
    * ✅ Run migration for `WordMaster` and `Word` table changes.
* ✅ Implement `word.addBatch` tRPC mutation (handles comma/newline separated text list).
* ⬜ Implement `word.listByBank` tRPC query. *(Needs fix for serialization error)*
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
    * ⬜ **Star Word:**
        * ⬜ Add `isStarred` boolean field to `Word` model (default: false). Run migration.
        * ⬜ Create `word.toggleStar` tRPC mutation.
        * ⬜ Ensure `listByBank` query includes `isStarred`.
        * ⬜ Add star icon button (`Star`) to toggle state visually and call mutation.
    * ⬜ **Filter by Starred:** Add toggle/button to filter word list for starred words.
    * ⬜ **Word History:**
        * ⬜ Add history icon button next to each word.
        * ⬜ Modify trigger button to include count badge (requires fetching count/history).
        * ⬜ On click, open `Dialog` (`WordHistoryDialog`).
        * ⬜ Call `api.vocab.getWordPracticeHistory.useQuery` inside the modal.
        * ⬜ Display loading/error states and render fetched history logs.
    * ⬜ **Mastery Indicator:**
        * ⬜ Access `interval` field for each word.
        * ⬜ Apply mapping logic (e.g., interval to level).
        * ⬜ Render as a thin colored vertical bar on the left side of the list item.
        * ⬜ Add `Tooltip` explaining the level.
    * ⬜ **Increase Word Size:** Increase font size of words in the list.
* ⬜ **Word Detail Dialog (`WordDetailDialog.tsx`):**
    * ⬜ Update to show details from `WordMaster` (definition, type, sentences, translations).
    * ⬜ Implement note saving (`Word.notes`).
    * ⬜ Implement star toggling.
    * ✅ Remove card background (`DialogContent`).
    * ✅ Match UI layout to `LearnWords` component (Card structure).
    * ✅ Remove 'X' close button (`DialogClose`).
* ⬜ **Edit Icon:** Replace word click-to-edit with a dedicated pencil icon button.
* ⬜ **Swipe to Delete (Mobile):** Implement swipe gesture for deletion on mobile.
* ⬜ **Keep Trashcan (Desktop):** Conditionally render trashcan icon for delete on desktop.
* ⬜ **Fix Serialization Error:** Resolve error in `vocab.listByBank` tRPC procedure (see `8.word-management-fixes.txt`).

### 3.3. Vocabulary Practice (SRS, UI, AI Grading, History, Mastery)

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
* ⬜ **Practice Tracking Improvements:**
    * ⬜ Update "Last practiced" timestamp in real-time (WebSockets?).
    * ⬜ Add visual indicator during update.
    * ⬜ Ensure immediate DB persistence.
* ⬜ **Hint Feature (`/vocabulary/practice/[sessionId]`):**
    * ⬜ Add `wordType` to `Word` or `WordMaster` model. Run migration.
    * ⬜ Update AI enrichment (`enrichWord`, `addBatch`) to fetch/save `wordType`.
    * ⬜ Create `getWordHint` tRPC query (fetch definition, type, sentence, translation).
    * ⬜ Add "Hint" button to UI.
    * ⬜ On click, call `getWordHint` and display data (Popover/Alert).
* ⬜ **Spaced Repetition Statistics:** Add SRS progress stats display (location TBD).

### 3.4. AI Enrichment & WordMaster Logic

* ✅ Create Gemini API client wrapper in `src/lib/api/gemini.ts`. Include `enrichWord` function. Handle API key from `env`.
* ✅ Modify `word.addBatch` tRPC procedure: Iterate words, call `enrichWord`, handle errors, save word/data. Handle duplicates.
* ⬜ **Refine `addBatch` for `WordMaster`:** *(From `7.word-management.txt`)*
    * ⬜ Check if `WordMaster` exists (by `baseWord` or `variations`).
    * ⬜ If not exists:
        * ⬜ Dictionary Check (External API/Service needed).
        * ⬜ If dictionary word: Call `enrichWord` (Gemini) for type, definition, default sentence/translation.
        * ⬜ *(Future)* Generate variations (AI).
        * ⬜ *(Future)* Generate grade-level sentences (AI).
        * ⬜ *(Future)* Generate translations (AI).
        * ⬜ Create `WordMaster` record (handle enrichment success/failure).
    * ⬜ Create `Word` record linking `wordMasterId` and `wordBankId`.
* ⬜ *(Deferred)* Master Vocabulary List / Deduplication: Centralize definitions.

---

## 4. Reading & Writing Module

* ✅ Removed reading/writing navigation link (temporarily hidden).
* ⬜ **Schema & API:**
    * ⬜ Update `schema.prisma`: Add `Passage`, `Question`, `AnswerAttempt` models. Update `PracticeSession` type/relations.
    * ⬜ Run migration: `pnpm prisma migrate dev --name add-reading-writing`.
    * ⬜ Create `src/server/api/routers/readingWriting.ts`.
    * ⬜ Implement `readingWriting.startSession` mutation (input: difficulty; calls AI generation, creates records).
    * ⬜ Implement `readingWriting.getSession` query (fetches session, passage, questions).
    * ⬜ Define Zod schemas in `src/schemas/readingWriting.schema.ts`.
* ⬜ **AI Generation (Backend):**
    * ⬜ Add `generateReadingPractice` function to `src/lib/api/gemini.ts`. Craft prompt.
    * ⬜ Create service/helper called by `startSession` to call AI, handle errors, save records via transaction, create `PracticeSession`.
* ⬜ **UI - Practice Setup (`/reading-writing/page.tsx`):**
    * ⬜ Create page.
    * ⬜ Add UI to select difficulty.
    * ⬜ Add "Start Practice Session" button calling `startSession` mutation. Show loading.
    * ⬜ Redirect to `/reading-writing/practice/[sessionId]` on success.
* ⬜ **UI - Practice Execution (`/reading-writing/practice/[sessionId]`):**
    * ⬜ Create page.
    * ⬜ Fetch session data using `getSession`.
    * ⬜ Display `Passage.content` (use `ScrollArea`).
    * ⬜ Display `Questions` (text, options using `RadioGroup`).
    * ⬜ Implement state management for selected answers.
    * ⬜ Add "Submit Answers" button.
* ⬜ **Scoring & Submission:**
    * ⬜ Implement `readingWriting.submitAnswers` mutation (input: sessionId, answers; checks answers, creates `AnswerAttempt`, calculates score, updates `PracticeSession`).
    * ⬜ Call mutation on button click. Show loading.
    * ⬜ Display results (score, correct/incorrect per question, explanation).
* ⬜ **UI - Real-time Score (Optional Enhancement):** Implement immediate feedback per question. Keep running score tally.
* ⬜ **UI - Practice History:**
    * ⬜ Add "Practice History" section or page.
    * ⬜ Implement `readingWriting.listSessions` query.
    * ⬜ Display list of past sessions (Date, Score, Difficulty) using `Table`.
    * ⬜ Allow clicking session to view detailed results (implement `getSessionResults` query if needed).

---

## 5. Dashboard

* ✅ Hide Dashboard link from Navbar.
* ✅ Hide Overall Progress component on vocabulary page.
* ⬜ Create page `src/app/dashboard/page.tsx`.
* ⬜ Implement `user.getDashboardData` tRPC query (summary stats: words learned, mastery, recent scores).
* ⬜ Design and implement dashboard UI (`Card` components, potentially `recharts` charts).
* ⬜ Add links/buttons to navigate to practice modules.

---

## 6. General UI/UX & Refinements

* ✅ **Global Navigation (Navbar):**
    * ✅ Add `Link` components for key modules (Dashboard, Vocabulary, R&W). *(Dashboard/R&W links hidden)*
    * ✅ Highlight active module link.
    * ⬜ **User Display:** Fetch user name/email, display `Avatar` with initials fallback, wrap in `DropdownMenuTrigger`, move Admin/Sign Out to `DropdownMenuContent`.
* ⬜ **Home Page (`/`):**
    * ⬜ Conditionally render content based on auth status (`AuthenticatedView` / `PublicView`).
    * ⬜ Show progress stats only when logged in (`ProgressStats` component).
    * ⬜ Add clear CTAs (Sign Up/Login) for logged-out users.
    * ⬜ Implement `vocab.getUserStats` tRPC query for `ProgressStats`.
* ⬜ **Navigation Updates (Sidebar/Navbar):**
    * ⬜ Hide protected routes from nav when logged out.
    * ⬜ Update active state styling.
* ⬜ **Mobile Experience:**
    * ⬜ Configure viewport meta tag to prevent scaling.
    * ⬜ Add CSS to prevent horizontal scrolling.
    * ⬜ Restrict touch actions to vertical panning only.
    * ⬜ **Slide Up Modal:** Have word card slide up from bottom on mobile (use `react-spring`?).
* ⬜ **Icon Spacing:** Increase gap between word card icons.
* ⬜ **Review all pages:** Check for consistent styling, spacing, component usage.
* ⬜ **Loading States:** Ensure smooth transitions and appropriate loading states (`Skeleton`).
* ⬜ **Responsiveness:** Test and refine mobile responsiveness thoroughly.
* ⬜ **User Feedback:** Implement `Toast` or `Sonner` for success/error messages.
* ⬜ **Accessibility:** Add ARIA labels, check keyboard navigation.
* ⬜ **Dark Mode Toggle:**
    * ⬜ Uncomment/Add theme toggle button (`useTheme`) in Navbar.
    * ⬜ Ensure `ThemeProvider` in `layout.tsx` is correctly configured.
    * ⬜ Verify light mode default and persistence.

---

## 7. Learning Engine Enhancements

* ✅ Spaced Repetition (SM2 algorithm) implemented.
* ⬜ Design adaptive learning engine with:
    * ⬜ Active Recall (question-first approach).
    * ⬜ Feynman Technique (explain in simple terms).
    * ⬜ Interleaving (mix different topics/words).
* ⬜ Engine should dynamically select method based on word difficulty, user history, session progress.
* ⬜ Engine should optimize review schedule using forgetting curve analysis and mastery level tracking.

---

## 8. Testing & Deployment

* ⬜ Write basic unit tests for critical utility functions (e.g., SRS logic).
* ⬜ Consider writing integration tests for key tRPC procedures.
* ⬜ **Deployment Prep:**
    * ⬜ Choose deployment platform (e.g., Vercel).
    * ⬜ Configure build settings.
    * ⬜ Set up production environment variables.
    * ⬜ Ensure database accessibility.
    * ⬜ Run production build (`pnpm build`) and test locally.
* ⬜ **Testing Plan (Home Page / Auth):**
    * ⬜ Verify unauthenticated access restrictions and CTAs.
    * ⬜ Verify authenticated access and content (stats, nav).
    * ⬜ Verify navigation behavior based on auth state.

---
