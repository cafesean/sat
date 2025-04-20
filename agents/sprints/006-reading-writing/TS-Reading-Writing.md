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

## Implementation Tasks
- [ ] TS006-1: Implement Passage, Question, Difficulty models
- [ ] TS006-2: Implement QuestionSet and SharedQuestionSet models
- [ ] TS006-3: Implement QuestionChat model
- [ ] TS006-4: Create Gemini API integration service for passage/question generation and chat responses
- [ ] TS006-5: Build passage/question generation logic
- [ ] TS006-6: Develop practice session interface (handling both single passages and question sets)
- [ ] TS006-7: Implement answer submission and feedback logic
- [ ] TS006-8: Create question explanation display
- [ ] TS006-9: Build word highlighting feature (UI and backend logic for lookup/add to bank)
- [ ] TS006-10: Implement Question Set CRUD operations (logic and UI)
- [ ] TS006-11: Implement Question Set sharing functionality (logic and UI)
- [ ] TS006-12: Implement Chat feature (logic and UI) for questions
- [ ] TS006-13: Write unit tests for new services
- [ ] TS006-14: Add integration tests for reading/writing features (practice flow, set creation/sharing, chat)

## Testing Considerations
1. Validate passage/question generation quality and relevance
2. Test practice session flow end-to-end (single passage and question sets)
3. Verify answer scoring and explanation display accuracy
4. Check word highlighting functionality (tapping, lookup, adding to bank)
5. Test Question Set CRUD and sharing flows
6. Validate chat feature integration (posting messages, retrieving history, AI responses)