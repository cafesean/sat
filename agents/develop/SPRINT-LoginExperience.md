# Technical Solution: SPRINT-LoginExperience - Improve Login & Logged-out Experience

## Sprint Goal

Enhance the user experience for both logged-out and logged-in states, focusing on intuitive navigation, low-friction onboarding, and clear calls to action to drive user engagement, retention, and word-of-mouth growth.

## Technical Implementation Plan

This plan outlines the technical approach and tasks required to implement the features defined in the SPRINT-LoginExperience sprint plan.

### 1. Homepage Conditional Rendering

*   **Objective:** Display different content on the homepage (`src/app/page.tsx`) based on the user's authentication status.
*   **Implementation:**
    *   Utilize the `useSession` hook from NextAuth.js on the client-side or fetch session data on the server-side in `src/app/page.tsx`.
    *   Conditionally render either the logged-out homepage components or the logged-in dashboard components based on the session status.
*   **Code Tasks:**
    *   Update `src/app/page.tsx` to fetch session data.
    *   Implement conditional rendering logic based on session status.
    *   Create or identify placeholder components for both logged-out and logged-in states.

### 2. Logged-out Homepage Components

*   **Objective:** Implement the UI and linking for the logged-out homepage calls to action.
*   **Implementation:**
    *   Create React components for the "Study Vocabulary" and "Practice Reading & Writing" cards.
    *   Ensure these components are visually distinct and include prominent "Start Now" buttons.
    *   Link the "Start Now" buttons to the `/login` page.
    *   Implement the "Can't find your word banks? Login now." CTA, also linking to the `/login` page.
*   **Code Tasks:**
    *   Create `src/components/features/homepage/LoggedOutCards.tsx` component.
    *   Create `src/components/features/homepage/WordBankLoginCTA.tsx` component.
    *   Implement linking to `/login` using Next.js routing (`next/link` or `useRouter`).

### 3. Top Navigation (Logged-out State)

*   **Objective:** Ensure navigation links in the top NAV direct logged-out users to module landing pages.
*   **Implementation:**
    *   Modify the existing Navbar component (`src/components/navbar.tsx`) to conditionally display links or modify link behavior based on authentication status.
    *   Ensure "Vocabulary" and "Reading & Writing" links point to their respective landing pages (e.g., `/vocabulary-landing`, `/reading-writing-landing`).
    *   These landing pages should provide information about the modules and include CTAs to log in/sign up. (Creation of landing pages may be a separate task if they don't exist).
*   **Code Tasks:**
    *   Update `src/components/navbar.tsx` to handle logged-out state navigation links.
    *   (If necessary) Create placeholder landing pages for Vocabulary and Reading & Writing modules.

### 4. Word Bank Creation Interception (Logged-out State)

*   **Objective:** Intercept attempts to create a word bank while logged out and initiate the authentication flow.
*   **Implementation:**
    *   Identify the UI element or action that triggers word bank creation (e.g., a button click).
    *   Before allowing the creation action to proceed, check the user's authentication status.
    *   If logged out, redirect the user to the login/signup page, potentially including a query parameter to indicate the intended action (e.g., `/login?redirect=/vocabulary/create-bank`).
    *   After successful login/signup, redirect the user back to the word bank creation flow, potentially pre-filling data if possible.
*   **Code Tasks:**
    *   Implement authentication status check before word bank creation action.
    *   Implement redirection to login/signup page with redirect parameter.
    *   Implement logic on the login/signup page to handle the redirect parameter and forward the user after authentication.
    *   Implement logic on the word bank creation page to handle the redirect from login/signup.

### 5. Logged-in Dashboard

*   **Objective:** Implement the personalized dashboard displayed on the homepage for logged-in users.
*   **Implementation:**
    *   Create a new React component for the dashboard layout and content.
    *   Utilize tRPC procedures to fetch user-specific data, such as progress summaries (details to be defined) and the count of word banks.
    *   Display this information in a user-friendly format on the dashboard.
*   **Code Tasks:**
    *   Create `src/components/features/dashboard/UserDashboard.tsx` component.
    *   Develop new tRPC procedures in `src/server/api/routers/user.ts` or a new dashboard router to fetch required dashboard data (e.g., `getUserProgressSummary`, `getWordBankCount`).
    *   Integrate tRPC calls within `UserDashboard.tsx` using `useQuery`.

### 6. Persistent Sessions

*   **Objective:** Ensure users remain logged in across sessions.
*   **Implementation:**
    *   Verify that NextAuth.js is configured for persistent sessions (this is the default behavior but should be confirmed).
*   **Code Tasks:**
    *   Review NextAuth.js configuration in `src/lib/auth/options.ts` and `src/app/api/auth/[...nextauth]/route.ts` to confirm session strategy.

## User Experience Considerations in Implementation

*   **Loading States:** Implement loading indicators for data fetching on the dashboard and during the login/signup process to provide feedback to the user.
*   **Error Handling:** Display user-friendly error messages for failed login attempts, signup issues, or data fetching errors.
*   **Mobile Responsiveness:** Ensure all new and modified components are built with responsiveness in mind, using Tailwind CSS utilities and potentially responsive hooks.
*   **Navigation Consistency:** Maintain consistent navigation patterns and visual cues between logged-out and logged-in states.

## Tasks for Code Role

Based on the above plan, the following tasks are assigned to the Code role:

1.  **Implement Homepage Conditional Rendering:** Update `src/app/page.tsx` to conditionally render content based on authentication status.
2.  **Develop Logged-out Homepage Components:** Create components for CTA cards and the word bank login prompt, with correct linking.
3.  **Refine Top Navigation:** Adjust `src/components/navbar.tsx` for logged-out navigation behavior.
4.  **Implement Word Bank Creation Interception:** Add logic to intercept word bank creation for logged-out users and integrate with the auth flow.
5.  **Develop Logged-in Dashboard Component:** Create the `UserDashboard.tsx` component.
6.  **Create tRPC Procedures for Dashboard Data:** Implement backend procedures to fetch user progress and word bank count.
7.  **Integrate Dashboard Data Fetching:** Connect the `UserDashboard.tsx` component to the new tRPC procedures.
8.  **Verify Persistent Sessions:** Confirm NextAuth.js configuration for session persistence.
9.  **Implement Loading and Error States:** Add UI feedback for data loading and errors in relevant components.
10. **Ensure Mobile Responsiveness:** Review and adjust styling for mobile compatibility.

This technical solution document will be reviewed and refined as needed during the sprint.