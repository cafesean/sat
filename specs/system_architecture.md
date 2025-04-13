# System Architecture Overview (Concise)

This document provides a compact overview of the SAT Study App's architecture.

## 1. Core Framework & Language

*   **Framework:** Next.js 15+ (App Router)
*   **Language:** TypeScript
*   **Rendering:** Primarily Server Components; Client Components (`'use client'`) used for interactivity (hooks like `useState`, `useEffect`, event handlers).
*   **Styling:** Tailwind CSS with Shadcn UI components.
*   **Validation:** Zod for schema validation (especially tRPC inputs).

## 2. API Layer: tRPC

*   **Purpose:** End-to-end typesafe API layer for client-server communication within the application. Eliminates the need for manual API endpoint testing/typing.
*   **Implementation:**
    *   **Server:** `src/server/api/trpc.ts` (init), `src/server/api/root.ts` (merge routers), `src/server/api/routers/` (individual feature routers like `vocab.ts`).
    *   **Client:** `src/utils/trpc.ts` (client setup), `src/providers/TRPCProvider.tsx` (context provider).
    *   **Endpoint:** Single HTTP endpoint at `src/app/api/trpc/[trpc]/route.ts`.
*   **Usage:**
    *   Define `router` and `protectedProcedure` / `publicProcedure` in router files.
    *   Use Zod schemas (`src/schemas/`) for input validation (`.input(schema)`).
    *   Access DB via `ctx.prisma`, session via `ctx.session` in procedures.
    *   Call from Client Components using hooks: `api.routerName.procedureName.useQuery()`, `api.routerName.procedureName.useMutation()`.
*   **When to Use:** **Default** for all frontend-backend data fetching and mutations within the app.

## 3. Other APIs

*   **External APIs (e.g., Google Gemini):**
    *   Called **server-side only**, typically within tRPC procedures or dedicated library functions (`src/lib/api/gemini.ts`).
    *   API keys managed via environment variables (`src/env.mjs`, `.env`). **Never expose keys client-side.**
*   **Next.js Route Handlers (`src/app/api/...`):**
    *   Use for specific cases **not suitable for tRPC**:
        *   Webhooks receiving data from external services.
        *   Simple, non-typesafe endpoints if absolutely necessary (prefer tRPC).
        *   Serving non-JSON content (e.g., files - though `public/` is often better).
    *   Example: `/api/auth/[...nextauth]/route.ts` (handled by NextAuth.js).

## 4. Naming Conventions

*   **Directories:** `kebab-case` (e.g., `src/components/features/word-banks`).
*   **Components:** `PascalCase.tsx` (e.g., `WordList.tsx`).
*   **Hooks/Utils/Non-Component TS:** `camelCase.ts` (e.g., `useLocalStorage.ts`, `gemini.ts`).
*   **Variables/Functions:** `camelCase`.
*   **tRPC Routers/Procedures:** `camelCase` (e.g., `vocabRouter`, `listByBank`).

## 5. Database (Prisma)

*   **ORM:** Prisma.
*   **Schema:** `prisma/schema.prisma` defines models and relations.
*   **Client:** Generated via `pnpm prisma generate`. Accessed in tRPC context (`ctx.prisma`).
*   **Migrations:** Managed via `pnpm prisma migrate dev --name <migration_name>`. Apply changes sequentially.
*   **Standards:** Use CUIDs for IDs. Define relations clearly. Use enums where appropriate. Keep schema updated with migrations.

## 6. Authentication (NextAuth.js / Auth.js)

*   **Library:** NextAuth.js v5 (Auth.js).
*   **Config:** `src/lib/auth/options.ts` defines providers (Credentials, Email) and callbacks.
*   **Session Strategy:** Database (using Prisma adapter).
*   **Protection:**
    *   **tRPC:** Use `protectedProcedure` which verifies `ctx.session`.
    *   **Pages/Layouts:** Check session status using `auth()` server-side or `useSession()` client-side; use Next.js Middleware for route protection if needed.
*   **Session Data:** User ID, name, email, role, preferences available in `ctx.session.user` (tRPC) or via `useSession`/`auth()`.

## 7. Common Issues & Solutions

*   **Type Errors after DB/Schema Change:**
    1.  Run `pnpm prisma generate`.
    2.  Restart TS Server (Cmd+Shift+P -> `TypeScript: Restart TS server`).
    3.  If persistent, restart the Next.js dev server (`pnpm dev`).
*   **`useSearchParams`, `useRouter`, etc. Errors:** Ensure the component using these hooks is a Client Component (`'use client'`). Wrap usage in `<Suspense>` if required (especially `useSearchParams`).
*   **tRPC Data Not Updating:**
    *   Ensure `utils.routerName.procedureName.invalidate()` or `utils.routerName.invalidate()` is called after mutations.
    *   Check query keys used for `useQuery`.
*   **ENV Vars Not Working:**
    *   Verify `.env` file is correct.
    *   Ensure vars are defined and validated in `src/env.mjs`.
    *   Restart the dev server after changing `.env` or `src/env.mjs`.
*   **Client/Server Component Mismatch:** Hooks like `useState`, `useEffect` require `'use client'`. Server Components cannot use these; pass data via props.
*   **Editing Tool (`replace_in_file`) Failures:** Often caused by auto-formatting changing file content between steps. Requires using exact content from error messages or `write_to_file` fallback. Watch for accidental deletions/duplications during complex replacements.
*   **Schema/Import Definition Errors:** Double-check Zod schemas and component imports after edits, as they can be easily broken or affected by auto-formatting.
