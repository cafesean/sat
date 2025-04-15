# Sprint 1: Vocabulary Module Enhancements

## Overview
This document outlines the plan for the first sprint focused on enhancing the vocabulary module.

## Tasks

### 1. Login Redirect
- **Description:** On login, users should be redirected directly to the vocabulary module instead of the dashboard.
- **Implementation:** Modified the `handleCredentialsSubmit` and `handleEmailSubmit` functions in `src/app/login/page.tsx` to redirect to `/vocabulary` after successful login. **[COMPLETED]**

### 2. Hide Dashboard
- **Description:** The dashboard should be hidden from users for now.
- **Implementation:** Removed the Dashboard link from the `navLinks` array in `src/components/navbar.tsx`. **[COMPLETED]**
### 3. Hide Overall Progress
- **Description:** The overall progress component on the vocabulary page should be hidden.
- **Implementation:** Commented out the Overall Progress component in `src/app/vocabulary/page.tsx`. **[COMPLETED]**
- **Implementation:** Temporarily remove or comment out the progress component in the vocabulary page layout.

### 4. Rename Practice Button
- **Description:** The "Practice" button inside the word bank should be renamed to "Learn".
- **Implementation:** Changed the text "Practice" to "Learn" in the `WordBankListItem` component (`src/components/features/vocab/WordBankListItem.tsx`). **[COMPLETED]**

### 5. Remove Detail Card Background
- **Description:** Remove the card background in the word detail page.
- **Implementation:** Removed the `DialogContent` component from `src/components/features/vocab/WordDetailDialog.tsx`. **[COMPLETED]**

### 6. Word Card Modal UI
- **Description:** Make the word card modal UI the same as the layout used when learning a word.
- **Implementation:** Replaced the content of `WordDetailDialog` with `Card`, `CardHeader`, `CardContent`, and `CardFooter` components to match the styling of `LearnWords`. **[COMPLETED]**

### 7. Remove X Button
- **Description:** Remove the X button on the top right of the word card modal.
- **Implementation:** Removed the `DialogClose` component from `src/components/features/vocab/WordDetailDialog.tsx`. **[COMPLETED]**

### 8. Edit Icon
- **Description:** Editing a word should require tapping on an edit icon (pencil) instead of tapping on the word itself.
- **Implementation:** Replace the word click handler with a dedicated edit icon button.

### 9. Swipe to Delete (Mobile)
- **Description:** Implement a swipe-to-delete gesture on mobile devices.
- **Implementation:** Use a library like `react-swipeable` to detect swipe gestures and trigger the delete action.

### 10. Keep Trashcan on Desktop
- **Description:** On desktop, keep the trashcan icon for deleting words.
- **Implementation:** Conditionally render the trashcan icon based on the device type.

### 11. Increase Word Size
- **Description:** Increase the size of the words on the word bank view.
- **Implementation:** Modify the styling of the word elements in the `WordBankView` component.

### 12. Slide Up Modal (Mobile)
- **Description:** On mobile, have the word card slide up from the bottom instead of popping open.
- **Implementation:** Use a library like `react-spring` to create a slide-up animation for the modal.

### 13. Spaced Repetition Statistics
- **Description:** Add statistics about spaced repetition progress.
- **Implementation:** Determine the best location to display the statistics (word card, word bank, homepage) and fetch the relevant data.