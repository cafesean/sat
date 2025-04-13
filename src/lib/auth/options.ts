import { prisma } from '@/lib/db/prisma'; // Use the singleton instance
import { PrismaAdapter } from '@auth/prisma-adapter';
import { UserRole } from '@prisma/client'; // Import UserRole enum
import bcrypt from 'bcryptjs'; // Import bcrypt
import { type NextAuthOptions, type User as NextAuthUser } from 'next-auth'; // Import User type
import CredentialsProvider from 'next-auth/providers/credentials'; // Import CredentialsProvider
import EmailProvider from 'next-auth/providers/email'; // Enable Email provider
import GoogleProvider from 'next-auth/providers/google';

// Extend the default session user type to include id and role
declare module 'next-auth' {
  interface Session {
    user: NextAuthUser & {
      id: string;
      role: UserRole;
      gradeLevel?: number | null; // Add gradeLevel
      languagePreference?: string; // Add languagePreference
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
    // Credentials Provider for Email/Password
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
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
        // Return user object without password
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hashedPassword, ...userWithoutPassword } = user;
        return userWithoutPassword;
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
    strategy: 'database', // Use database sessions with the adapter
    // maxAge: 30 * 24 * 60 * 60, // 30 days
    // updateAge: 24 * 60 * 60, // 24 hours
  },

  // Optional: Add callbacks to control session/JWT data
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // Fetch the full user data including role, gradeLevel, and languagePreference
        const userFromDb = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, gradeLevel: true, languagePreference: true }, // Select required fields
        });

        session.user.id = user.id;
        session.user.role = userFromDb?.role ?? UserRole.USER;
        session.user.gradeLevel = userFromDb?.gradeLevel; // Add gradeLevel
        session.user.languagePreference = userFromDb?.languagePreference; // Add languagePreference
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
