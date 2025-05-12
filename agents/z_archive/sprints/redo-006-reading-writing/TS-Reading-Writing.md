# Technical Solution: Reading and Writing Module

## Overview
Implementation of SAT-style reading and writing practice module centered around manageable Question Sets, featuring AI-powered generation, interactive practice sessions with feedback and chat, and detailed session history.

## Technical Requirements
1. **Question Set Management**
   - Display a list of available Question Sets on the main Reading & Writing page.
   - Allow users to create new Question Sets (with optional topic input).
   - Implement AI logic to generate passages, 4 multiple-choice questions, and correct answers based on a provided or random topic.
   - Implement AI logic to generate a random topic title for sets created without a specified topic.
   - Save generated Question Sets to the database.
   - **NEW:** Allow users to manually add passages to existing Question Sets.

2. **Practice Session**
   - Allow users to start a practice session by selecting a Question Set.
   - Display the passage and associated multiple-choice questions within the practice interface.
   - **Remove** difficulty level selection from the practice interface.
   - Implement logic for users to select an answer option.
   - Provide immediate feedback (Correct/Incorrect) upon answer selection.
   - Display a detailed explanation for the correct answer after the user selects an option.

3. **Practice Session History and Results**
   - Save the results of each individual practice session to the database, including user's answers, correctness, and chat history.
   - Allow users to view their history of practice sessions for each Question Set.

4. **In-Session Chat**
   - Implement a chat window within the practice session interface.
   - Allow users to send messages related to the passage or questions.
   - Integrate with the AI API to provide responses to chat messages.
   - Save chat messages as part of the practice session history.

5. **Word Highlighting (Existing Requirement)**
   - Make words in the reading passage tappable.
   - Implement functionality to view definition/usage and add words to a word bank upon tapping.

6. **Navigation Fix**
   - Remove the duplicate "Reading / Writing" navigation link in the navbar component.

## System Components
- **Frontend**:
  - Question Set listing page
  - New Question Set creation form
  - Practice session interface (Passage display, Question display with multiple choice, Feedback/Explanation area, Chat window)
  - Practice session history view
  - Word highlighting interaction
  - Navigation bar (for the fix)
  - **NEW:** Add Passage interface for existing Question Sets

- **Backend**:
  - API endpoints for Question Set CRUD operations.
  - API endpoint for initiating AI generation of Question Sets (handling topic input and random generation).
  - API endpoint for managing practice sessions (starting, submitting answers, saving results).
  - API endpoint for handling in-session chat messages and interacting with the AI API for responses.
  - API endpoints for word lookup and word bank integration.
  - **NEW:** API endpoint for retrieving Question Set details including passages.

## Data Model Changes
```prisma
// Keep existing models and add/modify as needed based on new requirements
model Passage {
  id            String      @id @default(cuid())
  content       String      @db.Text
  // Remove difficulty field as it's no longer required for practice sessions
  questions     Question[]
  createdAt     DateTime    @default(now())
  createdBy     User?       @relation(fields: [createdById], references: [id])
  createdById   String?
  questionSetId String?     // Link to a custom question set
  questionSet   QuestionSet? @relation(fields: [questionSetId], references: [id])
}

model Question {
  id            String         @id @default(cuid())
  passage       Passage        @relation(fields: [passageId], references: [id])
  passageId     String
  text          String         @db.Text
  options       Json           // Store options as JSON array of strings
  correctAnswer Int            // Index of the correct option
  explanation   String         @db.Text
  // Remove direct relation to chats here, link chats to PracticeSession
}

// Model for user-created question sets
model QuestionSet {
  id          String    @id @default(cuid())
  name        String // Use this for the topic title
  description String? // Optional description
  passages    Passage[] // Contains passages belonging to this set
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  // Remove sharedWith for now, focus on core practice flow
  practiceSessions PracticeSession[] // Link to practice sessions for this set
}

// New model for individual practice sessions
model PracticeSession {
  id            String    @id @default(cuid())
  questionSet   QuestionSet @relation(fields: [questionSetId], references: [id])
  questionSetId String
  user          User      @relation(fields: [userId], references: [id])
  userId        String
  startTime     DateTime  @default(now())
  endTime       DateTime?
  userAnswers   Json?     // Store user's answers and correctness as JSON
  chatHistory   Json?     // Store chat history as JSON
  // Add fields for score, completion status, etc. as needed
}

// Remove SharedQuestionSet model for now

// Model for chat messages related to a practice session
model PracticeSessionChat {
  id              String         @id @default(cuid())
  practiceSession PracticeSession @relation(fields: [practiceSessionId], references: [id])
  practiceSessionId String
  user            User           @relation(fields: [userId], references: [id])
  userId          String
  message         String         @db.Text
  createdAt       DateTime       @default(now())
  isBot           Boolean        @default(false)
}
```

## Implementation Tasks
- [✅] TS006-1: Update Passage model (remove difficulty) and Question model (remove chat relation).
- [✅] TS006-2: Update QuestionSet model (add practiceSessions relation).
- [✅] TS006-3: Implement PracticeSession model.
- [✅] TS006-4: Implement PracticeSessionChat model.
- [✅] TS006-5: Create API endpoint and backend logic for listing Question Sets.
- [✅] TS006-6: Create API endpoint and backend logic for creating new Question Sets (handling topic input).
- [✅] TS006-24: Create API endpoint for retrieving Question Set details (getQuestionSet).
- [✅] TS006-25: Create API endpoint for adding passages to existing Question Sets.
- [ ] TS006-7: Integrate with AI API for passage/question generation and random topic title generation.
- [ ] TS006-8: Create API endpoint and backend logic for starting a practice session for a Question Set.
- [✅] TS006-9: Create API endpoint and backend logic for submitting answers during a practice session and saving results.
- [ ] TS006-10: Create API endpoint and backend logic for handling in-session chat messages and integrating with AI API for responses.
- [✅] TS006-23: Fixed `PrismaClientValidationError` when creating Question Sets (user ID is undefined).
- [ ] TS006-11: Create API endpoint and backend logic for retrieving practice session history and results for a Question Set.
- [✅] TS006-12: Develop frontend component for Question Set listing page.
- [✅] TS006-13: Develop frontend component for New Question Set creation form.
- [✅] TS006-26: Develop frontend component for Question Set detail page with passage list.
- [ ] TS006-27: Develop frontend component for adding passages to a Question Set.
- [ ] TS006-14: Develop frontend component for the practice session interface (Passage, Questions, Feedback, Explanation, Chat).
- [ ] TS006-15: Develop frontend component for viewing practice session history and results.
- [ ] TS006-16: Implement word highlighting feature (UI and backend logic for lookup/add to bank).
- [✅] TS006-17: **Technical Debt:** Remove the duplicate "Reading / Writing" navigation link in `src/components/navbar.tsx`.
- [ ] TS006-18: Write unit tests for new/updated backend services.
- [ ] TS006-19: Add integration tests for the core practice session flow (start, answer, feedback, save).
- [ ] TS006-20: Add integration tests for Question Set creation and listing.
- [ ] TS006-21: Add integration tests for the in-session chat feature.
- [ ] TS006-22: Add integration tests for viewing practice session history.

## Implementation Notes
1. The current implementation creates empty Question Sets first, then allows users to manually add passages to them rather than automatically generating content at creation time.
2. The Question Set detail page displays all passages in the set and allows users to practice with specific passages.
3. AI generation of passages and questions will be implemented as a separate step that occurs when adding passages to existing Question Sets.

## Testing Considerations
1. Validate AI-generated passage and question quality, relevance, and adherence to SAT style.
2. Test the end-to-end flow of creating a Question Set, adding passages, starting a practice session, submitting answers, receiving feedback, using the chat, and viewing history.
3. Verify that difficulty level selection is removed from the practice interface.
4. Ensure practice session results and chat history are correctly saved and retrieved.
5. Test word highlighting functionality thoroughly.
6. Verify that the duplicate navigation link is removed and the navbar functions correctly.