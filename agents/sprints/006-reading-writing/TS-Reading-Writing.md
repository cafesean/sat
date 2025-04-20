# Technical Solution: Reading and Writing Module

## Overview
Implementation of SAT-style reading and writing practice module with auto-generated passages/questions, practice interface, and vocabulary integration.

## Technical Requirements
1. **Reading & Writing Module**
   - Difficulty level selection
   - Passage/question generation via Gemini API
   - Practice session interface
   - Answer submission and feedback
   - Question explanations
   - Chat feature for questions

2. **Question Set Sharing**
   - Create custom question sets
   - Share sets with other students

3. **Word Highlighting**
   - Tappable words in passages
   - Definition lookup
   - Word bank integration

## System Components
- **Frontend**:
  - Reading/Writing practice UI
  - Passage/question display
  - Answer submission interface
  - Word highlighting interaction
  - Question set sharing UI

- **Backend**:
  - Gemini API integration service
  - Passage/question generation service
  - Practice session service
  - Question set sharing service
  - Word highlighting service

## Data Model Changes
```prisma
model Passage {
  id            String      @id @default(cuid())
  content       String      @db.Text // Use Text for potentially long content
  difficulty    Difficulty
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
  chats         QuestionChat[] // Relation to chat messages
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

// Model for user-created question sets
model QuestionSet {
  id          String    @id @default(cuid())
  name        String
  description String?
  passages    Passage[] // Contains passages belonging to this set
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sharedWith  SharedQuestionSet[] // Track sharing
}

// Model for sharing question sets
model SharedQuestionSet {
  id            String      @id @default(cuid())
  questionSet   QuestionSet @relation(fields: [questionSetId], references: [id])
  questionSetId String
  sharedWith    User        @relation(fields: [sharedWithId], references: [id]) // Could also share via link
  sharedWithId  String
  sharedBy      User        @relation(fields: [sharedById], references: [id])
  sharedById    String
  createdAt     DateTime    @default(now())
  // Add permissions if needed
}

// Model for chat messages related to a question
model QuestionChat {
  id          String   @id @default(cuid())
  question    Question @relation(fields: [questionId], references: [id])
  questionId  String
  user        User     @relation(fields: [userId], references: [id])
  userId      String
  message     String   @db.Text
  createdAt   DateTime @default(now())
  isBot       Boolean  @default(false) // Flag for AI responses
}
```

## API Changes
1. `POST /api/reading-writing/generate` - Generate new passage/questions (AI)
2. `GET /api/reading-writing/passages/:id` - Get passage with questions
3. `POST /api/reading-writing/sessions` - Start practice session (can take passageId or questionSetId)
4. `POST /api/reading-writing/sessions/:id/answers` - Submit answers
5. `POST /api/reading-writing/question-sets` - Create custom question set (including passages/questions)
6. `GET /api/reading-writing/question-sets` - List user's question sets
7. `GET /api/reading-writing/question-sets/:id` - Get details of a question set
8. `PUT /api/reading-writing/question-sets/:id` - Update question set
9. `DELETE /api/reading-writing/question-sets/:id` - Delete question set
10. `POST /api/reading-writing/question-sets/:id/share` - Share question set (e.g., with user ID)
11. `GET /api/reading-writing/shared-question-sets` - List sets shared with the user
12. `POST /api/reading-writing/words/:word/lookup` - Word definition lookup
13. `POST /api/reading-writing/words/:word/add-to-bank` - Add word to bank
14. `GET /api/reading-writing/questions/:id/chat` - Get chat history for a question
15. `POST /api/reading-writing/questions/:id/chat` - Post a message to the question chat (user or AI response)

## Implementation Tasks
- [ ] Implement Passage, Question, Difficulty models
- [ ] Implement QuestionSet and SharedQuestionSet models
- [ ] Implement QuestionChat model
- [ ] Create Gemini API integration service for passage/question generation and chat responses
- [ ] Build passage/question generation logic
- [ ] Develop practice session interface (handling both single passages and question sets)
- [ ] Implement answer submission and feedback logic
- [ ] Create question explanation display
- [ ] Build word highlighting feature (UI and backend logic for lookup/add to bank)
- [ ] Implement Question Set CRUD operations (API and UI)
- [ ] Implement Question Set sharing functionality (API and UI)
- [ ] Implement Chat feature (API and UI) for questions
- [ ] Write unit tests for new services (generation, sharing, chat)
- [ ] Add integration tests for reading/writing features (practice flow, set creation/sharing, chat)

## Testing Considerations
1. Validate passage/question generation quality and relevance
2. Test practice session flow end-to-end (single passage and question sets)
3. Verify answer scoring and explanation display accuracy
4. Check word highlighting functionality (tapping, lookup, adding to bank)
5. Test Question Set CRUD and sharing flows
6. Validate chat feature integration (posting messages, retrieving history, AI responses)