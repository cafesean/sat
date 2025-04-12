import { authOptions } from '@/lib/auth/options'; // Import the options we defined
import NextAuth from 'next-auth';

// Initialize NextAuth with the options
const handler = NextAuth(authOptions)

// Export the handler for GET and POST requests as required by Next.js App Router
export { handler as GET, handler as POST };

