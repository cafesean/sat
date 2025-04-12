import { prisma } from '@/lib/db/prisma'; // Use the singleton instance
import { PrismaAdapter } from '@auth/prisma-adapter';
import { UserRole } from '@prisma/client'; // Import UserRole enum
import { type NextAuthOptions, type User as NextAuthUser } from 'next-auth'; // Import User type
import EmailProvider from 'next-auth/providers/email'; // Enable Email provider
import GoogleProvider from 'next-auth/providers/google';

// Extend the default session user type to include id and role
declare module 'next-auth' {
  interface Session {
    user: NextAuthUser & {
      id: string;
      role: UserRole; // Add role here
    };
  }
  // Optional: Extend the default User type if needed elsewhere
  // interface User {
  //   role: UserRole;
  // }
}


export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  providers: [
    // Example: Google Provider (Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are in .env)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // The '!' asserts that the value is non-null
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Email Provider (Requires email server setup in .env)
    // IMPORTANT: Ensure EMAIL_SERVER_* and EMAIL_FROM variables are set in your .env file
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT), // Ensure port is a number
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM,
    }),
    // ...add more providers here
  ],

  // Optional: Customize session behavior
  session: {
    strategy: 'database', // Use database sessions with the adapter
    // maxAge: 30 * 24 * 60 * 60, // 30 days
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // Optional: Add callbacks to control session/JWT data
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Fetch the full user data including the role from the database
        const userFromDb = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }, // Select only the role
        });

        session.user.id = user.id; // Add user ID
        session.user.role = userFromDb?.role ?? UserRole.USER; // Add role, default to USER if not found
      }
      return session;
    },
    // async jwt({ token, user }) {
    //   // Persist the OAuth access_token and or the user id to the token right after signin
    //   if (user) {
    //     token.id = user.id
    //   }
    //   return token
    // }
  },

  // Optional: Specify custom pages if needed
  // pages: {
  //   signIn: '/auth/signin',
  // },

  // Secret used to sign tokens - MUST be set in .env
  secret: process.env.NEXTAUTH_SECRET,

  // Optional: Enable debug messages in development
  // debug: process.env.NODE_ENV === 'development',
}
