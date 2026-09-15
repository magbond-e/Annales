import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: 'admin' | 'etudiant';
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: 'admin' | 'etudiant';
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'etudiant';
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
  }
}
