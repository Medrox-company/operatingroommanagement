import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: {
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: true,
    },
  });
}
