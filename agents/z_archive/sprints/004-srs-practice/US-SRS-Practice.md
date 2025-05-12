# User Stories: SRS Practice Enhancements

## Practice Session Enhancements

*   **US: As a user, I want to be able to repeat a practice session so that I can reinforce my learning.**
    *   Add a "Repeat Session" button/option after completing a practice session.
    *   Clicking this button should start a new practice session with the same word bank/settings.
*   **US: As a user, I want the practice session to start with a randomized set of cards so that I am not always presented with the same words in the same order.**
    *   Implement logic to randomize the order of cards at the beginning of each practice session.
*   **US: As a user, I want the practice session to continuously display cards based on my mastery level so that I can focus on the words I struggle with.**
    *   Integrate the spaced repetition algorithm to prioritize cards based on the user's performance.

## Starring Words

*   **US: As a user, I want to be able to star a word during practice or review so that I can mark it for later focus.**
    *   Add a "Star" button/icon to the word display during practice sessions and word bank review.
    *   Allow users to toggle the star status of a word.
    *   Store the star status of each word in the database.
    *   Allow users to filter their word banks to show only starred words.