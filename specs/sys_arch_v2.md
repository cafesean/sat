# System Architecture Overview (v2 - Post-Performance Sprint)

This document provides an updated overview of the SAT Study App's architecture, incorporating changes focused on performance and offline capabilities.

## 1. Core Framework & Language

* **Framework:** Next.js 15+ (App Router)
* **Language:** TypeScript
* **Rendering Strategy:**
    * **Default:** React Server Components (RSC) for minimal client-side JS and server-side data fetching.
    * **Interactivity:** Client Components (`'use client'`) used judiciously for state, hooks (`useState`, `useEffect`, etc.), and event handlers. Employ 'island' architecture where possible.
    * **React 19:** Leverage automatic memoization; avoid manual `useMemo`/`useCallback` unless specifically needed for complex scenarios or referential equality issues not handled automatically.
    * **Performance:** Utilize `next/dynamic` for code splitting non-critical components and `<Suspense>` for asynchronous loading boundaries and improved perceived performance.
* **Styling:** Tailwind CSS with Shadcn UI components.
* **Validation:** Zod for schema validation (tRPC inputs, environment variables).
* **Image Optimization:** Use `next/image` component with proper `priority`, `loading`, and sizing props (`width`/`height` or `fill`) as standard practice to optimize LCP and prevent CLS.

## 2. API Layer: tRPC

* **Primary Role:** End-to-end typesafe API layer for **client-server data synchronization** and fetching data **when local data is unavailable or stale**. It is *not* always the primary data source for the UI in the offline-first model.
* **Implementation:**
    * Server: `src/server/api/trpc.ts` (init), `src/server/api/root.ts` (merge routers), `src/server/api/routers/` (feature routers).
    * Client: `src/utils/trpc.ts` (client setup), `src/providers/TRPCProvider.tsx`.
    * Endpoint: `src/app/api/trpc/[trpc]/route.ts`.
* **Usage:**
    * Define routers and procedures (`protectedProcedure`/`publicProcedure`). Use Zod for inputs. Access Prisma (`ctx.prisma`) and session (`ctx.session`).
    * Client hooks (`useQuery`, `useMutation`) are used for:
        * Fetching data from the server if not available/stale locally (see Client-Side Data Storage).
        * Sending queued mutations to the server during background sync.
        * Handling real-time actions when online and optimistic updates are not used or have failed.
* **Interaction with Offline/Optimistic Patterns:**
    * tRPC mutations are the target for the background sync mechanism processing the offline mutation queue.
    * Optimistic updates often involve calling a tRPC mutation in the background and reverting UI state if it fails.
    * tRPC query invalidation (`utils.routerName.invalidate()`) is still important after successful syncs or direct mutations to ensure consistency if other parts of the app rely on fresh server data.

## 3. Client-Side Data Storage

* **Strategy:** Offline-first approach prioritizes reading/writing data locally for speed and offline availability.
* **Core Data (Word Banks, Words, Notes, Practice Logs):**
    * **Technology:** IndexedDB, likely managed via a wrapper library (e.g., `dexie.js`) for simplified API usage.
    * **Location:** Browser's IndexedDB storage.
    * **Access:** Custom hooks or data layer utilities abstracting IndexedDB operations.
* **UI Preferences (View Mode, Sort Options, etc.):**
    * **Technology:** `localStorage`.
    * **Purpose:** Storing simple, non-critical UI state that needs to persist across sessions quickly.
* **Data Flow:** UI components primarily interact with the client-side data layer. This layer reads from IndexedDB/localStorage and coordinates background synchronization with the backend via tRPC (see Section 4).

## 4. Offline Support & Data Sync Strategy

* **Read Operations:** Data fetching logic first attempts to retrieve data from IndexedDB. Network requests (via tRPC `useQuery`) are made only if data is missing locally or deemed stale (requires a cache invalidation/staleness strategy).
* **Write Operations (Mutations):**
    1.  **Optimistic UI:** (Where applicable) Update UI state immediately for perceived speed using React `useOptimistic` or `startTransition`.
    2.  **Local Write:** Save changes directly to IndexedDB.
    3.  **Mutation Queueing:** If offline, queue the mutation details (action type, data payload) reliably (e.g., in a dedicated IndexedDB store).
    4.  **Background Sync:** When online (detected via browser APIs or Service Worker), process the mutation queue:
        * Send queued mutations to the backend via tRPC `useMutation`.
        * On success, remove the mutation from the queue.
        * On failure, handle appropriately (retry logic, user notification, potentially revert optimistic update if still relevant).
* **Conflict Resolution:** Employ a simple strategy initially (e.g., last-write-wins based on timestamp) for potential conflicts between local and server data during sync.
* **Service Workers (Optional but Recommended):** Can be used for more robust background sync capabilities, caching application shell/assets for faster loads, and potentially handling push notifications or more complex offline logic.

## 5. Performance Patterns & Best Practices

* **Code Splitting:** Use `next/dynamic` aggressively for components/libraries not needed immediately.
* **Rendering:** Prioritize RSCs, minimize Client Component scope, use Suspense for async loading.
* **Prefetching:** Use `router.prefetch()` or `<Link prefetch>` for critical navigation paths.
* **Optimistic Updates:** Implement for common actions to enhance perceived responsiveness. Use `useOptimistic` / `startTransition`.
* **Loading States:** Employ skeleton loaders for data-heavy components.
* **Image Optimization:** Standardize on `next/image` with correct props.
* **Font Optimization:** Use non-blocking strategies (`font-display: swap`, preloading).
* **Bundle Analysis:** Regularly analyze client bundles (`@next/bundle-analyzer`) to identify regressions or new optimization opportunities.
* **Web Vitals Monitoring:** Track LCP, INP, CLS continuously during development and testing.

## 6. Database (Prisma - Backend)

* **ORM:** Prisma.
* **Schema:** `prisma/schema.prisma` defines server-side database models.
* **Client:** Accessed server-side, primarily within tRPC procedures (`ctx.prisma`).
* **Migrations:** Managed via `pnpm prisma migrate dev`.
* **Role:** Serves as the persistent source of truth and the target for data synchronization from clients.

## 7. Authentication (NextAuth.js / Auth.js)

* **Library:** NextAuth.js v5 (Auth.js).
* **Config:** `src/lib/auth/options.ts`.
* **Session Strategy:** Database (using Prisma adapter).
* **Protection:** Use `protectedProcedure` (tRPC), `auth()` (Server Components/Route Handlers), `useSession()` (Client Components), and potentially Middleware.
* **Role in Offline Sync:** Authentication status (`session`) is crucial for:
    * Authorizing tRPC sync requests.
    * Ensuring data is synced to the correct user account.
    * Background sync logic should typically only run for authenticated users.

## 8. Other APIs

* **External APIs (e.g., Google Gemini):** Called server-side only (e.g., within tRPC). Keys managed via `src/env.mjs`.
* **Next.js Route Handlers (`src/app/api/...`):** Use for webhooks, non-tRPC specific needs (rare).

## 9. Naming Conventions

* **Directories:** `kebab-case`.
* **Components:** `PascalCase.tsx`.
* **Hooks/Utils/Non-Component TS:** `camelCase.ts`.
* **Variables/Functions:** `camelCase`.
* **tRPC Routers/Procedures:** `camelCase`.

## 10. Common Issues & Solutions (Expanded)

* **Type Errors after DB/Schema Change:** `pnpm prisma generate`, Restart TS Server, Restart dev server.
* **Client Hook Errors (`useSearchParams`, etc.):** Ensure component is `'use client'`, consider `<Suspense>`.
* **tRPC Data Not Updating:** Check query invalidation (`utils...invalidate()`), query keys.
* **ENV Vars Not Working:** Check `.env`, `src/env.mjs`, restart dev server.
* **Client/Server Component Mismatch:** Remember hook limitations in RSCs.
* **IndexedDB Issues:**
    * Errors during schema definition or version upgrades.
    * Race conditions if accessing DB from multiple places without proper abstraction.
    * Storage limits (though usually large).
    * Cross-browser compatibility nuances (less common with wrappers).
* **Offline Sync Conflicts:** Data inconsistencies if conflict resolution is too simple or sync logic has bugs. Requires careful testing.
* **Optimistic Update State Bugs:** UI not reverting correctly on failure, complex state interactions becoming hard to manage. Requires thorough testing of success/failure paths.
* **Performance Regressions:** Need for continuous monitoring (Web Vitals, bundle analysis) to catch regressions introduced by new code.
