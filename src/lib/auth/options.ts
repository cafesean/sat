import { prisma } from '@/lib/db/prisma'; // Corrected import
import { PrismaAdapter } from '@auth/prisma-adapter';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials'; // Import CredentialsProvider
import EmailProvider from 'next-auth/providers/email'; // Enable Email provider
import GoogleProvider from 'next-auth/providers/google';


export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  // Ensure prisma instance is passed correctly. The 'as any' might hide underlying type issues.
  adapter: PrismaAdapter(prisma!) as any, // Use type assertion to bypass type mismatch
  providers: [
    // Credentials Provider for Email/Password
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<any> { // Add explicit return type (speculative fix)
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }
        // Ensure prisma is available before using it
        if (!prisma) {
          console.error("Prisma client is not available in authorize callback");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          // User not found or doesn't have a password set (maybe magic link only)
          console.log('User not found or no password set for:', credentials.email);
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isValidPassword) {
          console.log('Invalid password attempt for:', credentials.email);
          return null;
        }

        console.log('Credentials valid for:', credentials.email);
        // Return user object without password, ensuring all required fields are present
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, ...userToReturn } = user;
        // reviewCount does not exist on the User model, remove this line
        return {
          ...userToReturn,
          // reviewCount: user.reviewCount ?? 0 // Removed
        };
      }
    }),
    // Google Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!, // The '!' asserts that the value is non-null
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Email Provider (Magic Link)
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
    strategy: 'jwt', // Use JWT strategy for better compatibility with credentials provider
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Optional: Add callbacks to control session/JWT data
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        // For both database and JWT sessions
        const userId = user?.id || token.sub;
        if (!userId) return session;

        // Ensure prisma is available
        if (!prisma) {
           console.error("Prisma client is not available in session callback");
           return session; // Return session unmodified if prisma is unavailable
        }
        
        const userFromDb = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            gradeLevel: true,
            languagePreference: true,
            // reviewCount removed from select
          },
        });

        if (userFromDb) {
          session.user.id = userFromDb.id;
          session.user.name = userFromDb.name;
          session.user.email = userFromDb.email;
          session.user.role = userFromDb.role ?? UserRole.USER;
          session.user.gradeLevel = userFromDb.gradeLevel;
          session.user.languagePreference = userFromDb.languagePreference;
          // reviewCount assignment removed
        }
      }
      // console.log("Session Callback - session:", session, "token:", token, "user:", user); // Add logging
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.gradeLevel = user.gradeLevel;
        token.languagePreference = user.languagePreference;
        // reviewCount assignment removed
      }
      // console.log("JWT Callback - token:", token, "user:", user); // Add logging
      return token;
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
  secret: (() => {
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.NEXTAUTH_SECRET) {
        throw new Error('NEXTAUTH_SECRET is required in production');
      }
      return process.env.NEXTAUTH_SECRET;
    }
    return process.env.NEXTAUTH_SECRET || 'dev-secret';
  })(),

  // Optional: Enable debug messages in development
  // debug: process.env.NODE_ENV === 'development',
}
