import { DefaultSession } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id. */
      id: string
    } & DefaultSession['user'] // Keep the default properties like name, email, image
  }

  /** Extends the built-in User type */
  // interface User extends DefaultUser {
  //   // Add any custom properties for the User model here if needed
  // }
}

// Extend the built-in JWT types
// declare module 'next-auth/jwt' {
//   /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
//   interface JWT extends DefaultJWT {
//     /** OpenID ID Token */
//     id?: string // Add id to the JWT token as well if using JWT strategy or need it in jwt callback
//   }
// }
