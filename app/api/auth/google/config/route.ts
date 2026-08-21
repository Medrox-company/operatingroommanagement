import { NextResponse } from 'next/server';
import { isGoogleLoginConfigured } from '@/lib/auth/google-allowlist';

export const runtime = 'nodejs';

/**
 * Říká přihlašovací stránce, jestli má nabídnout tlačítko pro Google.
 * Záměrně nevrací seznam povolených adres — jen zapnuto/vypnuto.
 */
export async function GET() {
  return NextResponse.json({ enabled: isGoogleLoginConfigured() });
}
