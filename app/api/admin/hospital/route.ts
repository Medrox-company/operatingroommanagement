import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireSession, requireAdmin } from '@/lib/auth/server';
import { isAdminRole } from '../../../../lib/auth/roles';

export const runtime = 'nodejs';

/**
 * GET vrací seznam zařízení, POST vytvoří nebo upraví jedno zařízení.
 */

const HOSPITAL_FIELDS = [
  'hospital_name',
  'hospital_short_name',
  'hospital_address',
  'hospital_city',
  'hospital_zip',
  'hospital_country',
  'hospital_ico',
  'hospital_contact_phone',
  'hospital_contact_email',
  'hospital_notes',
] as const;

export async function GET() {
  // Čtení informací smí každý přihlášený uživatel
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  let allowedIds: string[] | null = null;
  if (!isAdminRole(auth.user.role)) {
    const { data: memberships } = await admin
      .from('hospital_user_memberships')
      .select('hospital_id')
      .eq('user_id', auth.user.sub);
    allowedIds = (memberships || []).map(row => row.hospital_id);
  }
  let query = admin.from('hospitals').select(`id,${HOSPITAL_FIELDS.join(',')}`).order('hospital_name');
  if (allowedIds) query = query.in('id', allowedIds.length ? allowedIds : ['__none__']);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hospitals: data ?? [], hospital: data?.[0] ?? {} });
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
  const requestedId = typeof body.id === 'string' ? body.id.trim() : '';
  const id = requestedId || `hospital-${crypto.randomUUID()}`;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: 'Neplatný identifikátor zařízení.' }, { status: 400 });
  }
  const payload: Record<string, unknown> = { id };
  for (const key of HOSPITAL_FIELDS) {
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
  const { data: existingHospital } = await admin.from('hospitals').select('id').eq('id', id).maybeSingle();
  if (!payload.hospital_name) {
    return NextResponse.json({ error: 'Název zařízení je povinný.' }, { status: 400 });
  }
  const { data, error } = await admin.from('hospitals').upsert(payload, { onConflict: 'id' }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!existingHospital) {
    const [modulesResult, statusesResult, settingsResult] = await Promise.all([
      admin.from('app_modules').select('*').eq('hospital_id', 'default'),
      admin.from('workflow_statuses').select('*').eq('hospital_id', 'default'),
      admin.from('app_settings').select('*').eq('hospital_id', 'default').eq('id', 'default-global'),
    ]);
    if (modulesResult.data?.length) {
      await admin.from('app_modules').insert(modulesResult.data.map(row => ({ ...row, hospital_id: id })));
    }
    if (statusesResult.data?.length) {
      await admin.from('workflow_statuses').insert(statusesResult.data.map(row => ({ ...row, hospital_id: id })));
    }
    const baseSettings = settingsResult.data?.[0];
    if (baseSettings) {
      await admin.from('app_settings').insert({
        ...baseSettings,
        id: `${id}-global`,
        hospital_id: id,
        hospital_name: null,
        hospital_short_name: null,
        hospital_address: null,
        hospital_city: null,
        hospital_zip: null,
        hospital_ico: null,
        hospital_contact_phone: null,
        hospital_contact_email: null,
        hospital_notes: null,
      });
    }
  }
  return NextResponse.json({ success: true, hospital: data });
}
