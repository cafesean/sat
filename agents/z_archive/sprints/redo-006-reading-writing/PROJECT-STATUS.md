# Reading & Writing Module: Current Status & Next Steps

## 1. What's Done

### Backend
- ✅ Basic data model implementation (QuestionSet, Passage, PracticeSession)
- ✅ Question Set creation API (creating empty sets)
- ✅ Question Set listing API
- ✅ Question Set detail API with passages
- ✅ Fixed user authentication issues in Question Set creation
- ✅ Answer submission API for practice sessions

### Frontend
- ✅ Question Set creation form
- ✅ Question Set listing page
- ✅ Question Set detail page showing passages
- ✅ Navigation fixes (removed duplicate links)

## 2. What's Missing

### Critical Path Items (Needed for End-to-End Flow)
- ❌ **Add Passage UI & API**: No way to add passages to question sets
- ❌ **AI Integration**: Not connected to AI for passage/question generation
- ❌ **Practice Session UI**: Can't actually practice with passages yet
- ❌ **Practice Session Start/End Flow**: Backend API exists but not fully implemented

### Secondary Items
- ❌ In-session chat functionality
- ❌ Practice session history view
- ❌ Word highlighting in passages
- ❌ Test coverage for all components

## 3. Next Steps (Priority Order)

1. **Create "Add Passage" API Endpoint**
   - Implement in `readingWriting.ts` router
   - Should accept questionSetId and optional topic
   - Should call AI generation API to create passage and questions
   - Should save generated content to database

2. **Implement "Add Passage" UI**
   - Create `/reading-writing-landing/[questionSetId]/add-passage` page
   - Form for topic input
   - Loading state during AI generation
   - Success/error handling
   - Redirect back to question set detail page

3. **Implement Practice Session Start API**
   - Complete the startReadingWritingSession procedure
   - Ensure it properly links passages to the session

4. **Create Practice Session UI**
   - Implement `/reading-writing-landing/[questionSetId]/[passageId]/practice` page
   - Display passage content
   - Show questions with multiple choice options
   - Handle answer selection
   - Show correctness and explanations
   - Add session completion flow

5. **Add In-Session Chat (optional for MVP)**
   - Chat UI within practice session
   - API endpoint for sending/receiving messages

## 4. Implementation Plan

### Week 1: Add Passage Functionality
- Day 1-2: Backend API for passage generation and addition
- Day 3-4: Frontend UI for adding passages
- Day 5: Testing and bug fixes

### Week 2: Practice Session Implementation
- Day 1-2: Complete practice session backend
- Day 3-4: Build practice session UI
- Day 5: Testing and bug fixes

### Week 3: Polish & Remaining Features
- In-session chat
- Practice session history
- Word highlighting
- Final testing & bug fixes

## 5. Open Issues & Dependencies

- AI Generation: Need to ensure Gemini API can handle the passage generation requirements
- Authentication: Keep session handling robust across all flows
- Error handling: Need consistent approach across all endpoints

## 6. Definition of "End-to-End Working" 

A user should be able to:
1. Create a question set
2. Add a passage to the question set (AI-generated)
3. Start a practice session with that passage
4. Answer questions and get feedback
5. Complete the practice session
6. View their session history/results 