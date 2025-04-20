# User Stories: Reading and Writing Module

## Reading and Writing Module

*   **US: As a student, I want to practice my reading and writing skills using SAT-style passages and questions so that I can prepare for the exam.**
    *   Implement a new "Reading & Writing" module.
    *   Allow users to select a difficulty level.
    *   Implement logic to auto-generate passages and multiple-choice questions using the Gemini API.
    *   Store the generated passages, questions, and answers in the database.
    *   Implement a practice interface:
        *   Display the passage to the student.
        *   Present multiple-choice questions.
        *   Allow the student to submit answers.
        *   Record the student's answers and check correctness.
        *   Display immediate feedback (correct/incorrect).
        *   Display an explanation for each question after the practice session.
    *   Implement a chat feature for each question, allowing students to ask questions related to the passage and questions.
*   **US: As a student, I want to be able to create and share question sets with other students so that we can study together.**
    *   Allow students to create question sets (passages and questions).
    *   Allow students to share question sets with other students.

## Word Highlighting in Passages

*   **US: As a user, I want to be able to tap on a word in a passage and add it to a word bank so that I can easily build my vocabulary while reading.**
    *   Implement logic to make words in the reading passage tappable.
    *   When a user taps on a word, present options:
        *   View definition and usage.
        *   Add to an existing word bank.
        *   Create a new word bank and add the word.