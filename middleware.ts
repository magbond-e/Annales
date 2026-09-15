import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Protection stricte de l'espace administration
    if (pathname.startsWith('/admin')) {
      const userIsAdmin = Boolean(token?.isAdmin || token?.role === 'admin');
      if (!userIsAdmin) {
        return NextResponse.redirect(new URL('/epreuves', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // L'accès aux pages protégées requiert impérativement une session active (cookie)
        return !!token;
      },
    },
    pages: {
      signIn: '/',
    },
  }
);


export const config = {
  matcher: [
    '/epreuves/:path*',
    '/deposer/:path*',
    '/mes-depots/:path*',
    '/admin/:path*',
    '/onboarding/:path*',
  ],
};
