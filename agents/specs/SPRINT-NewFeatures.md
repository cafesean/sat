# Sprint Plan: SPRINT-NewFeatures - Sharing, Groups, R&W, and Practice Enhancements

## Sprint Goal

Expand the SAT Study App's functionality with sharing features, group collaboration, a comprehensive Reading & Writing module, and enhanced practice sessions to improve user engagement and learning outcomes.

## User Stories / Tasks

### 1. Sharing Word Banks

*   **US: As a user, I want to be able to share my word banks with other users so that we can collaborate on vocabulary learning.**
    *   Implement a "Share" button/option on the Word Bank details page.
    *   Allow users to generate a shareable link or invite specific users via email.
    *   Implement logic to handle shared word banks:
        *   Allow recipients to view the shared word bank (read-only).
        *   Allow recipients to copy the shared word bank to their own account.

### 2. Groups Feature

*   **US: As a user, I want to be able to create groups and invite other users so that we can learn vocabulary together.**
    *   Implement a "Groups" section in the app.
    *   Allow users to create new groups.
    *   Allow group creators to invite other users to the group (via email or shareable link).
    *   Implement logic for group membership management (accept/reject invites).
*   **US: As a group member, I want to contribute to a shared word bank owned by the group so that we can build a collective vocabulary resource.**
    *   Implement the concept of a "Group Word Bank" that is owned by the group, not an individual user.
    *   Any word cards added to a Group Word Bank are automatically accessible to all group members.
    *   Ensure that group members can view, add, and practice with words in the Group Word Bank.
*   **US: As an invited user, I want to be able to accept or reject a group invitation so that I can control which groups I join.**
    *   Implement a clear process for users to accept or reject invitations received via email or in-app notification.
    *   Update the user's group membership status accordingly.
*   **US: As a group member, I want to be able to view the list of members in a group so that I know who I am collaborating with.**
    *   Display a list of all members on the Group Details page.
    *   Show basic information about each member (e.g., username).
*   **US: As a group member, I want to be able to leave a group so that I can remove myself from collaborations that are no longer relevant.**
    *   Implement a "Leave Group" option on the Group Details page.
    *   Include a confirmation step to prevent accidental departures.
    *   Remove the user's association with the group and the Group Word Bank upon leaving.
*   **US: As a group administrator, I want to be able to delete a group so that I can disband collaborations when they are no longer needed.**
    *   Implement a "Delete Group" option on the Group Details page, visible only to administrators.
    *   Include a confirmation step with a warning about data loss (Group Word Bank).
    *   Remove the group and its associated Group Word Bank from the system.
*   **US: As a group administrator, I want to be able to manage group member roles so that I can control permissions within the group.**
    *   Implement the concept of different roles (e.g., Admin, Member) with varying permissions.
    *   Allow administrators to assign and change member roles on the Group Details page.
*   **US: As a user, I want to receive notifications about group activities so that I can stay informed about collaborations I am part of.**
    *   Implement in-app and/or email notifications for key group events (e.g., invitations, new members, words added to Group Word Bank, group deletion, role changes).
    *   Allow users to manage their notification preferences for groups.

### 3. Practice Session Enhancements

*   **US: As a user, I want to be able to repeat a practice session so that I can reinforce my learning.**
    *   Add a "Repeat Session" button/option after completing a practice session.
    *   Clicking this button should start a new practice session with the same word bank/settings.
*   **US: As a user, I want the practice session to start with a randomized set of cards so that I am not always presented with the same words in the same order.**
    *   Implement logic to randomize the order of cards at the beginning of each practice session.
*   **US: As a user, I want the practice session to continuously display cards based on my mastery level so that I can focus on the words I struggle with.**
    *   Integrate the spaced repetition algorithm to prioritize cards based on the user's performance.

### 4. Improved Sample Sentences

*   **US: As a user, I want to see multiple sample sentences for words, especially those with different meanings, so that I can understand their usage nuances.**
    *   Modify the Gemini API integration to generate multiple sample sentences for words.
    *   Display these multiple sample sentences to the user on word details and potentially during practice.

### 5. Reading and Writing Module

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

### 6. Word Highlighting in Passages

*   **US: As a user, I want to be able to tap on a word in a passage and add it to a word bank so that I can easily build my vocabulary while reading.**
    *   Implement logic to make words in the reading passage tappable.
    *   When a user taps on a word, present options:
        *   View definition and usage.
        *   Add to an existing word bank.
        *   Create a new word bank and add the word.

### 7. Starring Words

*   **US: As a user, I want to be able to star a word during practice or review so that I can mark it for later focus.**
    *   Add a "Star" button/icon to the word display during practice sessions and word bank review.
    *   Allow users to toggle the star status of a word.
    *   Store the star status of each word in the database.
    *   Allow users to filter their word banks to show only starred words.

## Key User Experience Considerations

*   **Intuitive Sharing and Group Management:** Make it easy for users to share word banks and create/manage groups, with clear distinction between personal and group-owned word banks.
*   **Seamless Integration:** Integrate the new features seamlessly into the existing app interface.
*   **Clear Feedback:** Provide clear feedback to the user during practice sessions, sharing, and group management.
*   **Performance:** Optimize the performance of the new features, especially the AI-powered content generation in the Reading & Writing module.
*   **Mobile Responsiveness:** Ensure all new features are fully responsive and easy to use on mobile devices.
*   **Content Generation Quality:** Ensure the Gemini API generates high-quality, relevant SAT-style passages, questions, and sample sentences.