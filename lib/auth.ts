import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const providers: NextAuthOptions['providers'] = [];

// Google Provider réel si les clés sont fournies
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    })
  );
}

// Provider de secours pour développement local uniquement
if (process.env.NODE_ENV !== 'production') {
  providers.push(
    CredentialsProvider({
      id: 'credentials',
      name: 'Connexion Démo (Dev)',
      credentials: {
        email: { label: 'Email', type: 'email' },
        name: { label: 'Nom', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        return {
          id: 'user_dev_local',
          email: credentials.email.toLowerCase().trim(),
          name: credentials.name || 'Utilisateur Test',
          image: null,
        };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (token.email) {
        try {
          const { isUserAdminAsync } = await import('@/lib/utils/admin');
          const adminCheck = await isUserAdminAsync(token.email as string);
          token.isAdmin = adminCheck;
          token.role = adminCheck ? 'admin' : 'etudiant';
        } catch (e) {
          console.error('Erreur vérification admin jwt callback:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || '';
        session.user.name = (token.name as string) || 'Étudiant MBH';
        session.user.image = (token.picture as string) || null;
        session.user.role = token.role || (token.isAdmin ? 'admin' : 'etudiant');
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!user?.email) return;
      try {
        const { AdminService } = await import('@/lib/storage/admin-service');
        await AdminService.logConnection({
          email: user.email,
          nom: user.name || undefined,
          image: user.image || undefined,
          provider: account?.provider || 'google',
        });
      } catch (err) {
        console.error('Erreur logging connexion authOptions:', err);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
