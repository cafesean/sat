# Jira Tickets: Mobile-Speed Performance Optimization Sprint

This document lists the Jira tickets derived from the "Improved Sprint Plan: Mobile-Speed Performance Optimization".

*(Note: Assignee, Reporter, Story Points, and specific Sprint links would typically be filled in within Jira itself.)*

---

## Epics

* **EPIC-CWV:** Core Web Vitals & Initial Load Optimization
* **EPIC-REACT19:** React 19 / Next.js 15 Rendering Performance
* **EPIC-OFFLINE:** Offline-First Data Architecture
* **EPIC-OPTIMISTIC:** Optimistic UI & Asynchronous UX
* **EPIC-MONITOR:** Performance Monitoring & Testing

---

## Tickets

### Epic: EPIC-CWV (Core Web Vitals & Initial Load Optimization)

---

**Ticket 1**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P1] Audit & Optimize next/image Usage for LCP/CLS
* **Description:**
    * Review all significant images across the application (e.g., logos, user content placeholders, UI elements).
    * Ensure the `next/image` component is used instead of standard `<img>` tags where appropriate.
    * Validate and implement correct `priority`, `loading`, and sizing props (explicit `width`/`height` or `fill` with appropriate CSS) to prevent layout shifts and optimize loading for the Largest Contentful Paint.
    * **Acceptance Criteria:**
        * Major images identified and refactored.
        * LCP and CLS metrics related to images show measurable improvement in DevTools/Lighthouse.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 2**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P1] Optimize Font Loading Strategy
* **Description:**
    * Analyze the current font loading mechanism.
    * Implement a non-blocking strategy, such as using `font-display: swap` via Tailwind config or CSS.
    * Preload critical font files if necessary.
    * Ensure fallback fonts are defined to minimize layout shifts (FOUT/CLS).
    * **Acceptance Criteria:**
        * Font loading does not significantly block rendering.
        * CLS related to font swaps is minimized or eliminated.
        * Font loading strategy documented.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 3**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P1] Analyze & Reduce Main Bundle Size
* **Description:**
    * Use bundle analysis tools (e.g., `@next/bundle-analyzer`) to identify large dependencies or code chunks in the main client bundle.
    * Identify and remove unused dependencies or redundant code.
    * Implement dynamic imports (`next/dynamic`) for components/libraries that are not critical for the initial page load (e.g., complex modals, charting libraries, less common features).
    * **Acceptance Criteria:**
        * Main client bundle size measurably reduced.
        * Bundle analysis report reviewed.
        * Non-critical components are lazy-loaded.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 4**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P2] Implement Critical Route Prefetching
* **Description:**
    * Identify primary navigation pathways for users (e.g., from dashboard/home to `/vocabulary`, from vocabulary list to `/practice`).
    * Implement `router.prefetch()` or `<Link prefetch={true}>` for these critical routes to load the necessary code/data ahead of time.
    * **Acceptance Criteria:**
        * Prefetching implemented for identified critical routes.
        * Network tab shows prefetching occurring on hover/viewport entry.
        * Navigation to prefetched routes feels faster.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 5**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P2] Optimize Viewport Meta Tags
* **Description:**
    * Review the `<meta name="viewport">` tag in `layout.tsx` or equivalent.
    * Ensure it includes `width=device-width, initial-scale=1` and potentially `maximum-scale=1` to prevent unwanted scaling on mobile devices.
    * Verify proper rendering across different mobile viewport sizes.
    * **Acceptance Criteria:**
        * Viewport meta tag configured according to best practices.
        * No unexpected zooming or scaling issues observed on mobile.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 6**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Story
* **Summary:** [P2] Implement Mobile-Friendly Skeleton Loaders
* **Description:**
    * As a user, when navigating to data-heavy views like the Word Bank List or starting a Practice Session, I want to see placeholder skeletons immediately so the app feels responsive while data loads.
    * Implement skeleton components (using Shadcn `Skeleton` or similar) for key views (`WordBankList`, `PracticeSession` initial load).
    * Ensure skeletons accurately reflect the final layout to minimize jarring shifts when content loads.
    * **Acceptance Criteria:**
        * Skeleton loaders implemented for `WordBankList` and `PracticeSession`.
        * Skeletons display quickly during data fetching states.
        * Layout shift upon content replacement is minimal.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 7**

* **Epic Link:** EPIC-CWV
* **Issue Type:** Task
* **Summary:** [P3] Audit & Minimize Layout Shifts (CLS)
* **Description:**
    * Perform a dedicated audit using DevTools and Lighthouse to identify specific elements causing Cumulative Layout Shift during page load and user interaction (beyond initial image/font loading already covered).
    * Address causes, such as dynamically injected content without reserved space, animations affecting layout, or late-loading third-party scripts.
    * **Acceptance Criteria:**
        * CLS score in Lighthouse/Web Vitals consistently below target (e.g., < 0.1).
        * Specific sources of CLS identified and fixed.
        * Code reviewed and merged.
* **Priority:** P3 - Medium

---

### Epic: EPIC-REACT19 (React 19 / Next.js 15 Rendering Performance)

---

**Ticket 8**

* **Epic Link:** EPIC-REACT19
* **Issue Type:** Task
* **Summary:** [P1] Refactor Key Components for React 19 Automatic Memoization
* **Description:**
    * Identify key interactive components previously relying heavily on manual `useMemo` and `useCallback`.
    * Remove unnecessary manual memoization hooks, relying on React 19's compiler/automatic memoization where appropriate.
    * Audit component structures for optimal rendering behavior with React 19.
    * Profile components before and after refactoring to verify performance characteristics.
    * **Acceptance Criteria:**
        * Manual memoization hooks removed where redundant.
        * Component rendering performance verified via Profiler.
        * No regressions in functionality introduced.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 9**

* **Epic Link:** EPIC-REACT19
* **Issue Type:** Task
* **Summary:** [P1] Leverage React Server Components (RSC)
* **Description:**
    * Identify components primarily responsible for data display without significant client-side interactivity (e.g., read-only views, static lists).
    * Migrate these components to React Server Components by removing the `'use client'` directive where possible.
    * Ensure data fetching occurs on the server for these components.
    * Verify reduction in client-side JavaScript bundle size and hydration cost.
    * **Acceptance Criteria:**
        * Suitable components migrated to RSCs.
        * Client bundle size reduced.
        * Functionality remains correct.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 10**

* **Epic Link:** EPIC-REACT19
* **Issue Type:** Task
* **Summary:** [P2] Optimize Client Component Usage
* **Description:**
    * Review components marked with `'use client'`.
    * Ensure the directive is only applied where necessary (hooks, event handlers, state).
    * Refactor large Client Components by pushing state/interactivity down to smaller, more specific child components marked `'use client'`, keeping parent components as RSCs where possible ('island' architecture).
    * **Acceptance Criteria:**
        * Client component boundaries reviewed and optimized.
        * Large client components broken down where feasible.
        * Client bundle size potentially reduced further.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 11**

* **Epic Link:** EPIC-REACT19
* **Issue Type:** Task
* **Summary:** [P2] Implement Async Boundaries with Suspense
* **Description:**
    * Identify complex interactive UI sections that can be loaded progressively (e.g., the main content of the Practice Session UI after the initial word loads, detailed word history modals).
    * Wrap these sections with `<Suspense>` boundaries and load them using `next/dynamic` or equivalent async loading patterns.
    * Provide appropriate fallback UI (e.g., skeletons) within the Suspense boundary.
    * **Acceptance Criteria:**
        * Identified UI sections load asynchronously.
        * Suspense fallbacks are displayed correctly during load.
        * Initial page interactivity improves for affected views.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

### Epic: EPIC-OFFLINE (Offline-First Data Architecture)

---

**Ticket 12**

* **Epic Link:** EPIC-OFFLINE
* **Issue Type:** Task
* **Summary:** [P1] Implement Local Data Storage Strategy (IndexedDB & localStorage)
* **Description:**
    * Choose and integrate an IndexedDB wrapper library (e.g., `dexie.js`) or develop custom hooks/utilities.
    * Define IndexedDB schemas/stores for core user data: Word Banks, Words, Notes, Practice Logs.
    * Implement logic to save/retrieve this data from IndexedDB.
    * Implement logic to save/retrieve simple UI preferences (view mode, sort options) using `localStorage`.
    * **Acceptance Criteria:**
        * IndexedDB setup complete and stores defined.
        * Core data can be successfully written to and read from IndexedDB.
        * UI preferences persist using localStorage.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 13**

* **Epic Link:** EPIC-OFFLINE
* **Issue Type:** Task
* **Summary:** [P1] Adapt Data Fetching Logic for Offline-First
* **Description:**
    * Refactor existing data fetching hooks/logic (e.g., tRPC query hooks).
    * Implement logic to first attempt fetching data from the local IndexedDB store.
    * If data is not present or considered stale (based on a defined strategy), fall back to making a network request via tRPC.
    * Ensure data fetched from the network updates the local IndexedDB store.
    * **Acceptance Criteria:**
        * App reads data primarily from IndexedDB when available.
        * Network requests are made only when necessary (e.g., initial load, stale data).
        * Data consistency maintained between local store and UI.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 14**

* **Epic Link:** EPIC-OFFLINE
* **Issue Type:** Task
* **Summary:** [P2] Implement Offline Mutation Queueing
* **Description:**
    * Develop a system (e.g., a separate IndexedDB store or flag within data) to queue data mutations (create, update, delete actions for words, logs, etc.) that occur while the application is offline.
    * Ensure mutations are stored reliably with all necessary data.
    * **Acceptance Criteria:**
        * Mutations performed offline are successfully queued locally.
        * Queue persists across page reloads/sessions.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 15**

* **Epic Link:** EPIC-OFFLINE
* **Issue Type:** Task
* **Summary:** [P2] Develop Background Sync Mechanism
* **Description:**
    * Implement logic to detect online/offline status changes.
    * Create a mechanism (e.g., triggered on regaining connectivity, periodically, or via a Service Worker background sync event) to process the offline mutation queue.
    * Send queued mutations to the backend tRPC API.
    * Handle successful sync (remove from queue) and potential failures (keep in queue, potentially with retry logic).
    * **Acceptance Criteria:**
        * Queued offline mutations are sent to the backend when online.
        * Successful mutations are removed from the local queue.
        * Mechanism handles connectivity changes gracefully.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 16**

* **Epic Link:** EPIC-OFFLINE
* **Issue Type:** Task
* **Summary:** [P3] Implement Basic Conflict Resolution Strategy
* **Description:**
    * Define a simple conflict resolution strategy for data syncing (e.g., last-write-wins based on a client-generated timestamp or a server timestamp upon successful sync).
    * Implement this strategy within the background sync mechanism or backend API to handle cases where local data might conflict with server data.
    * *(Note: This is basic; complex scenarios are out of scope for this sprint).*
    * **Acceptance Criteria:**
        * Defined conflict strategy (e.g., last-write-wins) is implemented.
        * Basic conflicts during sync are resolved according to the strategy.
        * Code reviewed and merged.
* **Priority:** P3 - Medium

---

### Epic: EPIC-OPTIMISTIC (Optimistic UI & Asynchronous UX)

---

**Ticket 17**

* **Epic Link:** EPIC-OPTIMISTIC
* **Issue Type:** Story
* **Summary:** [P1] Implement Optimistic Updates for Core Actions
* **Description:**
    * As a user, when I perform common actions like starring/unstarring a word, deleting a word, or submitting a practice answer, I want the UI to update instantly, even before the server confirms, so the app feels highly responsive.
    * Use React's `useOptimistic` hook (preferred in React 19) or `startTransition` to implement optimistic UI updates for:
        * Starring/unstarring words.
        * Deleting words from a word bank.
        * Submitting practice answers (e.g., showing feedback placeholder immediately).
    * **Acceptance Criteria:**
        * UI updates instantly for specified core actions.
        * State reverts correctly if the background operation fails (see next ticket).
        * Perceived responsiveness for these actions is significantly improved.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 18**

* **Epic Link:** EPIC-OPTIMISTIC
* **Issue Type:** Task
* **Summary:** [P2] Refine Background Task Handling with startTransition
* **Description:**
    * Identify user actions that trigger non-critical background updates (e.g., recalculating overall mastery stats after a practice session, updating 'last practiced' timestamps).
    * Wrap the state updates related to these background tasks in `startTransition` to ensure they don't block more critical UI updates or user input.
    * **Acceptance Criteria:**
        * Non-critical background updates do not degrade UI responsiveness.
        * `startTransition` used appropriately for these updates.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

**Ticket 19**

* **Epic Link:** EPIC-OPTIMISTIC
* **Issue Type:** Task
* **Summary:** [P2] Implement Graceful Error Handling for Optimistic Updates
* **Description:**
    * For all actions implemented with optimistic updates (Ticket 17), ensure robust error handling.
    * If the actual backend mutation (or sync from offline queue) fails, the UI state must correctly revert to its pre-optimistic state.
    * Provide clear user feedback about the failure (e.g., using a Toast notification) and potentially offer a retry mechanism.
    * **Acceptance Criteria:**
        * Optimistic UI correctly reverts on backend/sync failure.
        * User is notified of the failure.
        * Data integrity is maintained.
        * Code reviewed and merged.
* **Priority:** P2 - High

---

### Epic: EPIC-MONITOR (Performance Monitoring & Testing)

---

**Ticket 20**

* **Epic Link:** EPIC-MONITOR
* **Issue Type:** Task
* **Summary:** [P1] Integrate Web Vitals Monitoring
* **Description:**
    * Implement basic Web Vitals tracking using `next/web-vitals` or a similar library.
    * Configure it to log LCP, INP, CLS, TTFB, and FCP metrics to the browser console during development and potentially to an analytics platform (like Vercel Analytics, Google Analytics) in staging/production.
    * **Acceptance Criteria:**
        * Web Vitals metrics are captured and logged.
        * Configuration allows easy monitoring during development and testing.
        * Code reviewed and merged.
* **Priority:** P1 - Highest

---

**Ticket 21**

* **Epic Link:** EPIC-MONITOR
* **Issue Type:** Task
* **Summary:** [P1] Conduct Baseline & Post-Optimization Benchmarks
* **Description:**
    * **Baseline:** Before starting optimizations, conduct thorough performance benchmarks using Lighthouse (Mobile preset), Chrome DevTools Performance Profiler, and Network Throttling (simulated 4G). Record key metrics (LCP, INP, TTI, CLS, Bundle Sizes).
    * **Post-Optimization:** After implementing the sprint tasks, repeat the same benchmarks under the same conditions.
    * Compare results against the baseline and the sprint KPIs.
    * **Acceptance Criteria:**
        * Baseline benchmarks documented.
        * Post-optimization benchmarks documented.
        * Comparison clearly shows impact of optimizations and achievement against KPIs.
* **Priority:** P1 - Highest

---

**Ticket 22**

* **Epic Link:** EPIC-MONITOR
* **Issue Type:** Task
* **Summary:** [P1] Perform Manual QA for Performance & Offline Scenarios
* **Description:**
    * Conduct focused manual testing on various mobile devices (or emulators) and network conditions (Fast 3G, 4G, Offline).
    * Execute key user flows: App load, login, browsing word banks, adding/editing/deleting words, starting/completing practice sessions.
    * Pay close attention to perceived speed, responsiveness (INP), loading indicators, skeleton states, and offline functionality (including data sync upon reconnection).
    * Document any perceived sluggishness, jank, or offline/sync bugs.
    * **Acceptance Criteria:**
        * Manual QA checklist executed across target conditions.
        * Perceived performance meets expectations for fluidity.
        * Offline functionality works as designed.
        * Sync mechanism verified.
        * Issues logged and addressed or deferred.
* **Priority:** P1 - Highest

---
