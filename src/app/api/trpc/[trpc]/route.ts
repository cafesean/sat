import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';

import { createContext } from '@/server/api/context';
import { appRouter } from '@/server/api/root';

/**
 * This wraps the `appRouter` and creates a tRPC handler.
 * @see https://trpc.io/docs/v11/server/adapters
 */
const handler = (req: NextRequest) => // Revert to non-async
  // Remove logging block
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            )
          }
        : undefined,
  })
// Remove extra closing brace

export { handler as GET, handler as POST };
