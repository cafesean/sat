# Technical Stories: User Session End Redirect

This document outlines the technical tasks required to implement the feature where a user is automatically redirected to the home page when their session ends.

## User Story: As a logged-in user, I want to be automatically redirected to the home page if my session expires or ends, so that I am not left on a protected page in an unauthenticated state.

### TS1.1: Implement Client-Side Session Status Monitoring

-   **Description:** Implement a mechanism on the client side to monitor the user's authentication status using the `next-auth/react` `useSession` hook. This involves reacting to changes in the session `status` property, specifically transitioning from 'authenticated' to 'unauthenticated'.
-   **Acceptance Criteria:**
    -   A client-side component can reliably determine the current authentication status.
    -   The component can detect when the status changes to 'unauthenticated'.
-   **Testing Notes:** Manually test by logging in and then simulating session expiration (e.g., clearing cookies, invalidating session server-side if possible) or explicitly logging out in another tab.

### TS1.2: Implement Client-Side Redirection Logic

-   **Description:** Implement the logic to programmatically redirect the user to the home page (`/`) using the `next/navigation` `useRouter` hook when the session status is detected as 'unauthenticated'.
-   **Acceptance Criteria:**
    -   The application can navigate the user to the home page.
    -   Redirection logic is implemented using the appropriate Next.js App Router hooks.
-   **Testing Notes:** Verify that calling the redirect function successfully navigates the user.

### TS1.3: Integrate Session Monitoring and Redirection into Application Layout

-   **Description:** Integrate the session status monitoring and redirection logic into a suitable client-side component that is part of the application's layout, ensuring it runs on protected routes. This could be within the `ClientProviders` component or a layout specific to authenticated routes. Ensure redirection does not occur on public pages like `/`, `/login`, or `/signup` to prevent redirect loops.
-   **Description:** Place the `SessionRedirect` component (or similar logic) within `src/providers/ClientProviders.tsx` or a layout component that wraps protected routes.
-   **Acceptance Criteria:**
    -   The session monitoring and redirection logic is active on pages requiring authentication.
    -   The application automatically redirects to `/` when the session becomes unauthenticated on a protected page.
    -   No redirect loops occur on public pages.
-   **Testing Notes:** Test by accessing protected pages after the session has ended. Test by accessing public pages while logged out.

### TS1.4: Verify Explicit Logout Redirection

-   **Description:** Ensure that the explicit logout action (e.g., clicking a "Sign Out" button in the Navbar) correctly terminates the user session and redirects the user to the home page (`/`).
-   **Acceptance Criteria:**
    -   Clicking the logout button signs the user out.
    -   The user is redirected to the home page after logging out.
-   **Testing Notes:** Manually test the logout button functionality.

### TS1.5: Test Implicit Session Expiration Handling

-   **Description:** Test the scenario where a user's session expires due to inactivity or server-side invalidation while they are on a protected page. Verify that the client-side monitoring detects the session change and triggers the redirection to the home page.
-   **Acceptance Criteria:**
    -   The application detects implicit session expiration.
    -   The user is automatically redirected to the home page upon implicit session expiration while on a protected page.
    -   The redirection is handled gracefully without errors or crashes.
-   **Testing Notes:** Simulate session expiration (e.g., wait for session timeout, manually invalidate session server-side) and observe client-side behavior on a protected page.

### TS1.6: Add Client-Side Authentication Check for Protected Actions

-   **Description:** Implement client-side checks using `useSession` status before allowing users to trigger server-side mutations or actions that require authentication (e.g., creating a word bank, submitting practice answers). Provide user feedback (e.g., a toast notification) if an action is attempted while unauthenticated on the client side.
-   **Description:** Add checks in relevant components (e.g., `WordBankForm.tsx`) to verify `useSession().status === 'authenticated'` before calling protected TRPC mutations.
-   **Acceptance Criteria:**
    -   Protected client-side actions are guarded by an authentication check.
    -   Users attempting protected actions while unauthenticated on the client receive appropriate feedback.
    -   Server-side errors due to missing session for these actions are reduced.
-   **Testing Notes:** While logged out, attempt to perform actions that require authentication (e.g., click the "Create Word Bank" button). Verify that the action is prevented and client-side feedback is shown.