import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireSession, requireAdmin } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * GET  /api/admin/facility  — vrátí informace o zdravotnickém zařízení (pro všechny přihlášené)
 * POST /api/admin/facility  — uloží informace o zdravotnickém zařízení (jen admin)
 *
 * Informace jsou uloženy v tabulce app_settings (řádek id='default').
 */

const FACILITY_FIELDS = [
  'facility_name',
  'facility_short_name',
  'facility_address',
  'facility_city',
  'facility_zip',
  'facility_country',
  'facility_ico',
  'facility_contact_phone',
  'facility_contact_email',
  'facility_notes',
] as const;

export async function GET() {
  // Čtení informací smí každý přihlášený uživatel
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('app_settings')
    .select(FACILITY_FIELDS.join(','))
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ facility: data ?? {} });
}

export async function POST(req: NextRequest) {
  // Úpravy jen admin
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  // Allowlist bezpečných polí — libovolná další pole se tiše ignorují
  const payload: Record<string, unknown> = { id: 'default' };
  for (const key of FACILITY_FIELDS) {
    if (key in body) {
      const value = body[key];
      if (typeof value === 'string') {
        if (value.length > 2000) {
          return NextResponse.json(
            { error: `Pole "${key}" je příliš dlouhé (max 2000 znaků).` },
            { status: 400 }
          );
        }
        payload[key] = value.trim() || null;
      } else if (value === null || typeof value === 'undefined') {
        payload[key] = null;
      } else {
        return NextResponse.json(
          { error: `Pole "${key}" musí být textové.` },
          { status: 400 }
        );
      }
    }
  }
  payload.updated_at = new Date().toISOString();

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('app_settings').upsert(payload, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
