import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const protectedPaths = [
      '/vocabulary',
      '/dashboard', 
      '/reading-writing'
    ];

    const isAuth = !!req.nextauth.token
    const isProtected = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

    // Add debug logging
    console.log(`Middleware check - Path: ${req.nextUrl.pathname}, Auth: ${isAuth}, Protected: ${isProtected}`);
    
    if (isProtected && !isAuth) {
      const url = new URL(`/login`, req.nextUrl.origin)
      url.searchParams.set("callbackUrl", encodeURI(req.nextUrl.pathname))
      console.log(`Middleware redirecting to: ${url.toString()}`);
      return NextResponse.redirect(url)
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Return true to always allow the middleware function to handle the logic
        console.log(`Middleware authorized callback - Token exists: ${!!token}`);
        return true
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|/).*)']
}
