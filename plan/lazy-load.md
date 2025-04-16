# Lazy Loading / Virtualization Plan

**Goal:** Implement lazy loading/virtualization for long lists to improve rendering performance. We'll primarily use UI virtualization with `react-window` where backend pagination isn't readily available, and refine the existing backend pagination for practice history.

**Target Components & Strategy:**

1.  **Practice History List (`src/components/features/vocab/PracticeHistoryTabContent.tsx`)**
    *   **Strategy:** Backend Pagination (using `useInfiniteQuery` in `usePracticeLogs`).
    *   **Tasks:**
        *   [X] Refactor `usePracticeLogs` hook to use `useInfiniteQuery`.
        *   [X] Update `PracticeHistoryTabContent` to use paginated data and add a "Load More" button.
        *   [ ] Refine UI: Improve the display of individual logs (e.g., show word text) and potentially group by session if feasible with paginated data. (Optional Enhancement)

2.  **Word Bank List (`src/app/vocabulary/page.tsx`)**
    *   **Strategy:** UI Virtualization (`react-window`).
    *   **Tasks:**
        *   [X] Install `react-window` and types.
        *   [X] Implement `FixedSizeList` for the list view.
        *   [X] Implement `FixedSizeGrid` for the grid view.
        *   [ ] Add styling/sizing logic. (TODO: Needs responsive adjustments)
        *   [X] Handle the "Create New Bank" card separately outside the virtualized areas.

3.  **Word List within a Bank (`src/app/vocabulary/banks/[bankId]/page.tsx`)**
    *   **Strategy:** UI Virtualization (`react-window`).
    *   **Tasks:**
        *   [X] Implement `FixedSizeList` for the list view.
        *   [X] Implement `FixedSizeGrid` for grid views (large/small).
        *   [ ] Add styling/sizing logic. (TODO: Needs responsive adjustments)

4.  **Notes List (`src/components/features/vocab/ViewNotesDialog.tsx`)**
    *   **Strategy:** UI Virtualization (`react-window`).
    *   **Tasks:**
        *   [X] Located component.
        *   [X] Implemented `FixedSizeList`.
        *   [ ] Refine styling/sizing. (TODO: Needs responsive adjustments)

**Execution Order:**

1.  [X] Implement virtualization for Word List (`/vocabulary/banks/[bankId]`).
2.  [X] Implement virtualization for Word Bank List (`/vocabulary`).
3.  [X] Implement virtualization for Notes List (`ViewNotesDialog`).
4.  [X] Implement pagination for Practice History (`PracticeHistoryTabContent`).
5.  [ ] Refine styling/sizing for all virtualized lists. (Future Task)
6.  [ ] Refine Practice History display (Optional Enhancement). (Future Task)
