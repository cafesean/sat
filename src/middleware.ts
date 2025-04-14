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

    if (isProtected && !isAuth) {
      const url = new URL(`/login`, req.nextUrl.origin)
      url.searchParams.set("callbackUrl", encodeURI(req.nextUrl.pathname))
      return NextResponse.redirect(url)
    }
  },
  {
    callbacks: {
      authorized: () => {
        return true
      },
    },
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|/).*)']
}
