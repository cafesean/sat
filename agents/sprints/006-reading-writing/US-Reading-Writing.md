# User Stories: Reading and Writing Module

## Reading and Writing Practice with Question Sets

*   **US: As a student, I want to practice my reading and writing skills using SAT-style passages and questions organized into Question Sets so that I can prepare for the exam effectively.**
    *   **Acceptance Criteria:**
        *   The main Reading & Writing page displays a list of available Question Sets.
        *   Users can initiate the creation of a new Question Set.
        *   When creating a new set, users can optionally provide a topic.
        *   If no topic is provided, the AI will determine a random topic.
        *   The AI will generate a passage, 4 multiple-choice answer options for the passage, and the correct answer for each question.
        *   For random topic sets, the AI will generate a random topic title.
        *   The generated Question Set (passage, questions, answers) is saved to the database.

*   **US: As a student, I want to easily start a practice session for a specific Question Set so that I can focus on targeted practice.**
    *   **Acceptance Criteria:**
        *   Users can click on a Question Set from the list to begin a practice session.
        *   A practice interface is displayed showing the passage and the 4 multiple-choice questions.
        *   There are no difficulty level selection buttons in the practice interface.

*   **US: As a student, I want to receive immediate feedback on my answer choices and understand why an answer is correct or incorrect so that I can learn from my mistakes.**
    *   **Acceptance Criteria:**
        *   After clicking on an answer option, the system displays whether the chosen answer is Correct or Incorrect.
        *   An explanation for the correct answer is provided.

*   **US: As a student, I want to be able to ask questions about the passage or answers during a practice session to deepen my understanding.**
    *   **Acceptance Criteria:**
        *   A chat window is available below the questions during a practice session.
        *   Users can type questions related to the passage or answers into the chat.
        *   The AI API provides responses to the user's questions.
        *   All chat history for the session is saved to the database.

*   **US: As a student, I want to review my past practice sessions and results so that I can track my progress and identify areas for improvement.**
    *   **Acceptance Criteria:**
        *   The results of each practice session are saved to the database.
        *   Users can view their history of practice sessions for each Question Set.
        *   Saved sessions include the user's answers, correctness, and chat history.
        *   Users can practice the same Question Set multiple times, with each session saved separately.

## Other Considerations

*   **Technical Task:** Remove the duplicate "Reading / Writing" navigation link in the navbar component (`src/components/navbar.tsx`) to resolve the console duplicate key warning.

## Word Highlighting in Passages (Existing)

*   **US: As a user, I want to be able to tap on a word in a passage and add it to a word bank so that I can easily build my vocabulary while reading.**
    *   Implement logic to make words in the reading passage tappable.
    *   When a user taps on a word, present options:
        *   View definition and usage.
        *   Add to an existing word bank.
        *   Create a new word bank and add the word.