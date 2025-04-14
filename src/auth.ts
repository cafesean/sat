import { authOptions } from '@/lib/auth/options';
import NextAuth from 'next-auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

export const auth = () => NextAuth(authOptions).auth;
export const signIn = () => NextAuth(authOptions).signIn;
export const signOut = () => NextAuth(authOptions).signOut;
