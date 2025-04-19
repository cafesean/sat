import { authOptions } from '@/lib/auth/options';
import { getServerSession } from "next-auth";

// Export the handler for the API route
import NextAuth from 'next-auth';
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Export the auth function for server components
export const auth = async () => {
  return await getServerSession(authOptions);
};

export const signIn = () => NextAuth(authOptions).signIn;
export const signOut = () => NextAuth(authOptions).signOut;
