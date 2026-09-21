import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Protection périmétrique stricte des routes API d'administration
    if (pathname.startsWith('/api/admin')) {
      if (!token) {
        return NextResponse.json(
          { error: 'Authentification requise.' },
          { status: 401 }
        );
      }
      const userIsAdmin = Boolean(token?.isAdmin || token?.role === 'admin');
      if (!userIsAdmin) {
        return NextResponse.json(
          { error: 'Accès réservé aux administrateurs.' },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    // Protection stricte de l'espace administration (pages)
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
      authorized: ({ token, req }) => {
        // Pour les routes API, on transmet au middleware afin de retourner du JSON 401/403 adapté
        if (req.nextUrl.pathname.startsWith('/api/')) {
          return true;
        }
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
    '/api/admin/:path*',
    '/onboarding/:path*',
  ],
};
