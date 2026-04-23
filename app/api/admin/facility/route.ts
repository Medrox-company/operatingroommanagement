import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET  /api/admin/facility  — vrátí informace o zdravotnickém zařízení
 * POST /api/admin/facility  — uloží informace o zdravotnickém zařízení
 *
 * Informace jsou uloženy v tabulce app_settings (řádek id='default').
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

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
  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  // Vyber jen bezpečná pole
  const payload: Record<string, unknown> = { id: 'default' };
  for (const key of FACILITY_FIELDS) {
    if (key in body) {
      const value = body[key];
      payload[key] = typeof value === 'string' ? value.trim() || null : value ?? null;
    }
  }
  payload.updated_at = new Date().toISOString();

  const { error } = await admin.from('app_settings').upsert(payload, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
