import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export async function GET(req: any, ctx: any) {
  const params = await ctx?.params;
  return handler(req, { ...ctx, params });
}

export async function POST(req: any, ctx: any) {
  const params = await ctx?.params;
  return handler(req, { ...ctx, params });
}
