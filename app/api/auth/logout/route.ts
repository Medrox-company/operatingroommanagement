import { NextResponse } from 'next/server';
import { getSessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ success: true });
  // Stejné atributy jako u login cookie, jinak ji prohlížeč nevymaže
  res.cookies.set({ ...getSessionCookieOptions(), value: '', maxAge: 0 });
  return res;
}
