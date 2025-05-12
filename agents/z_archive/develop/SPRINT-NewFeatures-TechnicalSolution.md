# Technical Solution: SPRINT-NewFeatures - Sharing, Groups, R&W, and Practice Enhancements

## 1. Introduction

This document outlines the technical approach for implementing the features defined in the SPRINT-NewFeatures sprint plan. It builds upon the existing system architecture and database design, detailing the necessary modifications and additions to support sharing, groups, the Reading & Writing module, and practice session enhancements.

## 2. Sharing Word Banks & Groups Feature

### 2.1 Data Model Extensions

*   **Groups Table:**
    *   `id`: String (@id, @default(cuid()))
    *   `name`: String
    *   `createdAt`: DateTime (@default(now()))
    *   `updatedAt`: DateTime (@updatedAt)
    *   `creatorId`: String (@relation to User)
*   **GroupMember Table:** (Many-to-many relationship between User and Group)
    *   `id`: String (@id, @default(cuid()))
    *   `groupId`: String (@relation to Group)
    *   `userId`: String (@relation to User)
    *   `joinedAt`: DateTime (@default(now()))
    *   `role`: String (e.g., 'admin', 'member')
    *   @@unique([groupId, userId])
*   **GroupInvite Table:** (Handles group invitations via shareable links)
    *   `id`: String (@id, @default(cuid()))
    *   `groupId`: String (@relation to Group)
    *   `createdById`: String (@relation to User)
    *   `createdAt`: DateTime (@default(now()))
    *   `expiresAt`: DateTime
    *   `token`: String @unique
    *   `used`: Boolean @default(false)
*   **SharedWordBank Table:** (Linking WordBanks to Groups or direct shares)
    *   `id`: String (@id, @default(cuid()))
    *   `wordBankId`: String (@relation to WordBank)
    *   `sharedById`: String (@relation to User) // The user who initiated the share
    *   `sharedWithGroupId`: String? (@relation to Group) // If shared with a group
    *   `sharedWithUserId`: String? (@relation to User) // If shared directly with a user
    *   `sharedAt`: DateTime (@default(now()))
    *   `shareLink`: String? @unique // Unique link for public/direct sharing
    *   @@unique([wordBankId, sharedWithGroupId]) // Prevent sharing the same bank to the same group multiple times
    *   @@unique([wordBankId, sharedWithUserId]) // Prevent sharing the same bank to the same user multiple times

### 2.2 API Endpoints (tRPC)

*   **`groupRouter`:**
    *   `createGroup`: Mutation to create a new group.
    *   `inviteUserToGroup`: Mutation to invite a user via email or generate an invite link.
    *   `acceptGroupInvite`: Mutation for a user to accept a group invitation.
    *   `leaveGroup`: Mutation for a user to leave a group.
    *   `getGroupDetails`: Query to fetch group information and members.
    *   `getGroupMembers`: Query to fetch members of a specific group.
    *   `getUsersGroups`: Query to fetch all groups a user belongs to.
    *   `generateGroupInviteLink`: Mutation to create a shareable invite link.
    *   `validateGroupInviteToken`: Query to validate an invite token.
*   **`wordBankRouter`:**
    *   ✅ `shareWordBank`: Mutation to create a SharedWordBank entry (direct or to a group).
    *   ✅ `getSharedWordBank`: Query to fetch a shared word bank (read-only view).
    *   ✅ `copySharedWordBank`: Mutation to copy a shared word bank to the user's account.
    *   ✅ `getWordBanksSharedWithUser`: Query to fetch word banks shared directly with the user.
    *   ✅ `getWordBanksSharedWithGroup`: Query to fetch word banks shared with a specific group the user is a member of.

### 2.3 Component Responsibilities

*   **`GroupList`:** Displays the list of groups the user belongs to.
*   **`GroupDetails`:** Displays group members and shared word banks within the group.
*   **`CreateGroupModal`:** Handles the creation of new groups.
*   **`InviteUserModal`:** Handles inviting users to a group.
*   **`SharedWordBankView`:** Renders a read-only view of a shared word bank.
*   **`WordBankDetails`:** Includes a "Share" button/modal to initiate sharing.

### 2.4 Implementation Notes

*   Sharing word banks with a group will involve creating a `SharedWordBank` entry linked to the group.
*   Adding a word card to a group word bank will require logic to ensure it's accessible to all group members (via the `SharedWordBank` link). This might involve adding a `groupId` field to the `WordBank` model or a separate linking table if a word bank can belong to multiple groups (current design suggests one-to-one or one-to-many from user/group to word bank). Re-evaluating the relationship between WordBank and Group is needed. A simpler approach might be that a WordBank is either owned by a User OR a Group.
*   Need to handle permissions and roles within groups (e.g., who can add words, who can invite).

## 3. Practice Session Enhancements

### 3.1 Data Model Extensions

*   No new tables required. Existing `PracticeSession` and `WordPracticeLog` models are sufficient.

### 3.2 API Endpoints (tRPC)

*   **`practiceRouter`:**
    *   `startPracticeSession`: Mutation to initiate a practice session, including logic for selecting and randomizing words based on SRS data.
    *   `submitPracticeAnswer`: Mutation to record a user's answer and update SRS data for the word.
    *   `repeatPracticeSession`: Mutation to start a new session with the same parameters as a previous one.

### 3.3 Component Responsibilities

*   **`PracticeSession`:** Manages the display of words, user input, feedback, and interaction with the SRS logic.
*   **`PracticeComplete`:** Displays session summary and includes a "Repeat Session" button.

### 3.4 Implementation Notes

*   The SRS logic (`src/lib/srs/`) will be integrated into the `startPracticeSession` and `submitPracticeAnswer` tRPC procedures.
*   Randomization will occur within the `startPracticeSession` procedure.

## 4. Improved Sample Sentences

### 4.1 Data Model Extensions

*   Modify the `Word` model to store multiple sample sentences.
    *   `sampleSentences`: String[] (Array of strings)

### 4.2 API Endpoints (tRPC)

*   **`geminiRouter` (or integrated into `vocabRouter`):**
    *   `generateSampleSentences`: Mutation/Query to call the Gemini API and fetch multiple sample sentences for a given word, especially if it has multiple meanings.

### 4.3 Component Responsibilities

*   **`WordDetails`:** Displays the multiple sample sentences fetched from the API.
*   **`AddWordForm`:** Handles the process of adding a new word, including calling the API to get sample sentences.

### 4.4 Implementation Notes

*   The Gemini API wrapper (`src/lib/api/gemini.ts`) will need to be updated to support requesting multiple sample sentences.
*   Logic is needed to identify words with potentially multiple distinct meanings (this might require additional API calls or a more sophisticated approach). Initially, we can request multiple sentences for all words and let the AI handle variations.

## 5. Reading and Writing Module

### 5.1 Data Model Extensions

*   Existing `PracticeSession`, `Passage`, `Question`, and `AnswerAttempt` models are suitable.

### 5.2 API Endpoints (tRPC)

*   **`readingWritingRouter`:**
    *   `startReadingWritingSession`: Mutation to initiate a session, including calling the Gemini API to generate passage and questions.
    *   `submitAnswerAttempt`: Mutation to record a user's answer to a question.
    *   `getReadingWritingSession`: Query to fetch details of a completed session (including passage, questions, answers, and explanations).
    *   `generatePassageAndQuestions`: Mutation/Query to specifically generate content (used by `startReadingWritingSession` and potentially for creating shareable sets).
    *   `createQuestionSet`: Mutation to save a user-created question set.
    *   `shareQuestionSet`: Mutation to share a user-created question set (similar to sharing word banks).
    *   `getSharedQuestionSet`: Query to fetch a shared question set.
    *   `copySharedQuestionSet`: Mutation to copy a shared question set to the user's account.
    *   `askQuestionAboutPassage`: Mutation/Query to interact with the AI chat feature for a specific question.

### 5.3 Component Responsibilities

*   **`ReadingWritingLanding`:** Entry point for the module, allowing difficulty selection.
*   **`ReadingWritingPractice`:** Displays the passage and questions, handles user interaction and answer submission.
*   **`ReadingWritingReview`:** Displays the passage, questions, user answers, correct answers, and explanations after a session.
*   **`QuestionChat`:** Provides the chat interface for asking questions about a specific question/passage.
*   **`CreateQuestionSet`:** Interface for users to create their own question sets.
*   **`SharedQuestionSetView`:** Renders a view of a shared question set.

### 5.4 Implementation Notes

*   Significant integration with the Gemini API for content generation. Need to handle potential latency and errors.
*   The chat feature for questions will require careful design to manage context and provide relevant AI responses.
*   Sharing question sets can leverage a similar mechanism to sharing word banks, potentially using the `SharedWordBank` model or a new `SharedQuestionSet` model. A new model is likely cleaner.

## 6. Word Highlighting in Passages

### 6.1 Data Model Extensions

*   No new tables required. Relies on existing `WordBank` and `Word` models.

### 6.2 API Endpoints (tRPC)

*   **`readingWritingRouter` (or a new `passageInteractionRouter`):**
    *   `getWordDefinitionAndOptions`: Query to fetch definition and present options (add to bank, create new bank) for a tapped word.

### 6.2 Component Responsibilities

*   **`ReadingWritingPractice`:** Needs to render the passage content in a way that allows individual words to be interactive (e.g., wrapped in spans with event listeners).
*   **`WordHighlightModal`:** Displays the word, its definition, and the options to add to/create a word bank.

### 6.3 Implementation Notes

*   This feature is dependent on the Reading & Writing module being implemented first.
*   Identifying words within the passage and making them interactive will require frontend logic to parse the passage text.
*   Fetching the definition for a tapped word might require an additional API call (potentially to Gemini or a dictionary service) if not already stored.


### 7.3 Component Responsibilities

*   **`PracticeSession`:** Displays a star icon next to each word.
*   **`WordCard`:** Includes the star icon and handles toggling the starred status.
*   **`WordBankDetails`:** Includes an option/filter to show only starred words.

### 7.4 Implementation Notes

*   This is a relatively straightforward feature involving a database field update and a filtering mechanism.

## 8. Technical Debt and Future Considerations

*   **Scalability of AI Content Generation:** As usage grows, monitor Gemini API costs and performance. Consider strategies like caching generated passages/questions or exploring alternative/supplementary content sources.
*   **Group Permissions:** Refine group roles and permissions beyond just membership (e.g., who can add/remove members, who can add/edit word banks/question sets).
*   **Real-time Updates:** For group features, consider implementing real-time updates (e.g., using WebSockets or polling) to show when members join, leave, or add content.
*   **Offline Access:** Explore options for limited offline access to downloaded word banks or practice content.

## 9. Task Breakdown (Detailed)

This technical solution will be broken down into smaller, actionable tasks for the development team during sprint planning. Each task will have clear requirements, acceptance criteria, and estimated effort.

:start_line:202
-------
*   **Database:**
    *   [x] Implement Prisma schema changes for Groups, GroupMember, and SharedWordBank tables.
    *   [x] Add `starred` boolean field to the Word model.
    *   [x] Add `sampleSentences` String[] field to the Word model.
    *   [x] Run Prisma migrations.
*   **API (tRPC):**
    *   [x] Develop `groupRouter` with procedures: `createGroup`, `inviteUserToGroup`, `acceptGroupInvite`, `leaveGroup`, `getGroupDetails`, `getGroupMembers`, `getUsersGroups`.
    *   [x] Implement group invite UI in `InviteUserModal`
    *   [x] Create group invite acceptance page (`/groups/invite/[inviteToken]`)
    *   [ ] **Implement `wordBankRouter` procedures for sharing and fetching shared word banks (Crucial for end-to-end group sharing):**
        *   [ ] `shareWordBank`: Mutation to create a SharedWordBank entry (direct or to a group).
        *   [ ] `getSharedWordBank`: Query to fetch a shared word bank (read-only view).
        *   [ ] `copySharedWordBank`: Mutation to copy a shared word bank to the user's account.
        *   [ ] `getWordBanksSharedWithUser`: Query to fetch word banks shared directly with the user.
        *   [ ] `getWordBanksSharedWithGroup`: Query to fetch word banks shared with a specific group the user is a member of.
    *   [ ] Implement API logic to add words to a group-owned word bank.
    *   [ ] Add/Modify `practiceRouter` procedures: `startPracticeSession` (including randomization and SRS integration), `submitPracticeAnswer` (including SRS update), `repeatPracticeSession`.
    *   [ ] Develop `readingWritingRouter` with procedures: `startReadingWritingSession` (including Gemini API call), `submitAnswerAttempt`, `getReadingWritingSession`, `generatePassageAndQuestions`, `createQuestionSet`, `shareQuestionSet`, `getSharedQuestionSet`, `copySharedQuestionSet`, `askQuestionAboutPassage`.
    *   [ ] Update Gemini API wrapper (`src/lib/api/gemini.ts`) to support multiple sample sentences and R&W content generation.
    *   [ ] Implement email sending for group invites (TODO in inviteUserToGroup procedure)
*   **Frontend Components & Integration:**
    *   [x] Build `GroupList` component.
    *   [x] Build `GroupDetails` component.
    *   [x] Build `CreateGroupModal` component.
    *   [x] Build `InviteUserModal` component.
    *   [x] Build `SharedWordBankView` component.
    *   [x] Integrate `GroupList` component into application navigation/page.
    *   [x] Build dynamic group details page (`/vocabulary/groups/[groupId]`) using the `GroupDetails` component and `getGroupDetails` tRPC query.
    *   [ ] **Modify `WordBankDetails` component to include sharing functionality (Needed for end-to-end sharing flow).**
    *   [ ] Modify `PracticeSession` component to integrate SRS, randomization, display star icon, and handle starring.
    *   [ ] Build `PracticeComplete` component with "Repeat Session" button.
    *   [ ] Modify `WordDetails` component to display multiple sample sentences.
    *   [ ] Modify `AddWordForm` component to fetch multiple sample sentences.
    *   [ ] Build `ReadingWritingLanding` component.
    *   [ ] Build `ReadingWritingPractice` component (including passage rendering for highlighting).
    *   [ ] Build `ReadingWritingReview` component.
    *   [ ] Build `QuestionChat` component.
    *   [ ] Build `CreateQuestionSet` component.
    *   [ ] Build `SharedQuestionSetView` component.
    *   [ ] Implement word highlighting logic in `ReadingWritingPractice`.
    *   [ ] Build `WordHighlightModal` component.
    *   [ ] Implement filtering for starred words in `WordBankDetails`.
    *   [ ] Ensure mobile responsiveness for all new components and features.
    *   [ ] Integrate `InviteUserModal` into `GroupDetails` component
    *   [ ] Create group invite acceptance page (`/groups/invite/[inviteToken]`)
*   **Testing:**
    *   [ ] Write unit tests for all new and modified API procedures.
    *   [ ] Write integration tests for API endpoints and database interactions.
    *   [ ] Write end-to-end tests for key user flows (sharing, groups, R&W practice, starring).
*   **Performance & Error Handling:**
    *   [ ] Implement error handling for API calls, especially Gemini API.
    *   [ ] Address performance considerations for AI content generation (e.g., loading states, potential caching).

This document serves as a guide for the development team. Further details and refinements will be made during task breakdown and implementation.