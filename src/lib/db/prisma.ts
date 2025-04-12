import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma client instance.
// This prevents creating multiple instances during development due to hot reloading.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Instantiate PrismaClient. If in production or if the global instance doesn't exist,
// create a new instance. Otherwise, use the existing global instance.
export const prisma =
  global.prisma ||
  new PrismaClient({
    // Optional: Enable logging for debugging if needed
    // log: ['query', 'info', 'warn', 'error'],
  })

// In development, assign the PrismaClient instance to the global variable.
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export default prisma
