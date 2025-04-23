# Development Tasks: Reading/Writing Module (Sprint 006)

Based on the updated User Stories and Technical Solution:

## Core Backend Development (Assigned To: Backend Developer)

- [ ] TS006-1: Update Passage model (remove difficulty) and Question model (remove chat relation) in `prisma/schema.prisma`.
- [ ] TS006-2: Update QuestionSet model (add practiceSessions relation) in `prisma/schema.prisma`.
- [ ] TS006-3: Implement PracticeSession model in `prisma/schema.prisma`.
- [ ] TS006-4: Implement PracticeSessionChat model in `prisma/schema.prisma`.
- [-/1] TS006-5: Create API endpoint and backend logic for listing Question Sets.
- [ ] TS006-6: Create API endpoint and backend logic for creating new Question Sets (handling topic input and random generation).
- [✅] TS006-7: Integrate with AI API for passage/question generation and random topic title generation.
- [ ] TS006-8: Create API endpoint and backend logic for starting a practice session for a Question Set.
- [✅] TS006-9: Create API endpoint and backend logic for submitting answers during a practice session and saving results.
- [ ] TS006-10: Create API endpoint and backend logic for handling in-session chat messages and integrating with AI API for responses.
- [ ] TS006-11: Create API endpoint and backend logic for retrieving practice session history and results for a Question Set.
- [ ] TS006-23: Investigate and fix `PrismaClientValidationError` when creating Question Sets (user ID is undefined).
- [ ] TS006-16: Implement backend logic for word lookup and word bank integration.
- [ ] TS006-18: Write unit tests for new/updated backend services.
- [-/1] TS006-19: Add integration tests for the core practice session flow (start, answer, feedback, save).
- [ ] TS006-20: Add integration tests for Question Set creation and listing.
- [ ] TS006-21: Add integration tests for the in-session chat feature.
- [ ] TS006-22: Add integration tests for viewing practice session history.

## Core Frontend Development (Assigned To: Frontend Developer)

- [ ] TS006-12: Develop frontend component for Question Set listing page.
- [ ] TS006-13: Develop frontend component for New Question Set creation form.
- [ ] TS006-14: Develop frontend component for the practice session interface (Passage, Questions with multiple choice, Feedback, Explanation, Chat).
- [ ] TS006-15: Develop frontend component for viewing practice session history and results.
- [ ] TS006-16: Implement frontend UI for word highlighting feature.

## Technical Debt / Fixes (Assigned To: Frontend Developer)

- [✅] TS006-17: Remove the duplicate "Reading / Writing" navigation link in `src/components/navbar.tsx`.

## Testing (Assigned To: QA Engineer)

- [ ] TS006-QA-1: Verify AI-generated passage and question quality, relevance, and adherence to SAT style.
- [ ] TS006-QA-2: Test the end-to-end flow of creating a Question Set (with and without topic), starting a practice session, submitting answers, receiving feedback, using the chat, and viewing history.
- [ ] TS006-QA-3: Verify that difficulty level selection is removed from the practice interface.
- [ ] TS006-QA-4: Ensure practice session results and chat history are correctly saved and retrieved.
- [ ] TS006-QA-5: Test word highlighting functionality thoroughly.
- [ ] TS006-QA-6: Verify that the duplicate navigation link is removed and the navbar functions correctly.