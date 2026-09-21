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

// Provider de secours pour développement local uniquement (strictement restreint à NODE_ENV === 'development')
// Interdit en production et sur tout environnement autre que le développement local strict
if (process.env.NODE_ENV === 'development') {
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
        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Garde-fou absolu : interdiction formelle d'usurper un compte administrateur en mode démo
        const { getStaticAdminEmails } = await import('@/lib/utils/admin');
        if (getStaticAdminEmails().has(normalizedEmail)) {
          console.warn(`[SÉCURITÉ] Tentative de connexion démo bloquée pour l'email administrateur: ${normalizedEmail}`);
          return null;
        }

        return {
          id: 'user_dev_local',
          email: normalizedEmail,
          name: credentials.name || 'Utilisateur Test (Démo)',
          image: null,
        };
      },
    })
  );
}

// Validation stricte du secret NextAuth
const INSECURE_DEFAULT_SECRETS = [
  'annale229_secret_key_development_only_123456789',
  'votre-secret-robuste-genere-via-openssl',
  'secret',
  'changeme',
];

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  if (!nextAuthSecret || INSECURE_DEFAULT_SECRETS.includes(nextAuthSecret) || nextAuthSecret.length < 32) {
    throw new Error(
      '[FATAL SÉCURITÉ] NEXTAUTH_SECRET non sécurisé ou absent en production. Générez une clé aléatoire forte avec `openssl rand -base64 32`.'
    );
  }
} else if (!nextAuthSecret || INSECURE_DEFAULT_SECRETS.includes(nextAuthSecret)) {
  console.warn(
    '[AVERTISSEMENT SÉCURITÉ] NEXTAUTH_SECRET utilise une clé faible de développement. Remplacez-la avant toute mise en production.'
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
  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name: isProd ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProd,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.provider = account.provider;
      }

      if (token.email) {
        try {
          // Règle de sécurité stricte : un compte issu du provider Credentials ne peut JAMAIS être administrateur
          if (token.provider === 'credentials') {
            token.isAdmin = false;
            token.role = 'etudiant';
            token.isSuperAdmin = false;
          } else {
            const { isUserAdminAsync, isSuperAdmin } = await import('@/lib/utils/admin');
            const adminCheck = await isUserAdminAsync(token.email as string);
            token.isAdmin = adminCheck;
            token.role = adminCheck ? 'admin' : 'etudiant';
            token.isSuperAdmin = isSuperAdmin(token.email as string);
          }
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
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
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
  secret: nextAuthSecret,
};
