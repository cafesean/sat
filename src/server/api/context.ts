import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

/**
 * Creates context for incoming requests
 * @link https://trpc.io/docs/v11/context
 */
export async function createContext(opts?: FetchCreateContextFnOptions) {
  // Get the session from the server using the unstable_getServerSession method
  // We pass the authOptions here to ensure consistency
  const session = await getServerSession(authOptions)

  console.log('createContext for', session?.user?.email ?? 'unknown user')

  // Return the context object with prisma instance and the session
  return {
    session,
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
