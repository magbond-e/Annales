import { NextResponse } from 'next/server';

// Route supprimée — retourne 404
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
