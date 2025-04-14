import { UserRole } from '@prisma/client';
import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      gradeLevel?: number | null;
      languagePreference?: string;
      // reviewCount removed
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
    gradeLevel?: number | null;
    languagePreference?: string;
    hashedPassword?: string | null;
    // reviewCount removed
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    gradeLevel?: number | null;
    languagePreference?: string;
    // reviewCount removed
  }
}

// Extend the built-in JWT types
// declare module 'next-auth/jwt' {
//   /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
//   interface JWT extends DefaultJWT {
//     /** OpenID ID Token */
//     id?: string // Add id to the JWT token as well if using JWT strategy or need it in jwt callback
//   }
// }
