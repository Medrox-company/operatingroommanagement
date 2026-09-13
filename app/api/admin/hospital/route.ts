import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireSession, requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { isSuperAdminRole } from '../../../../lib/auth/roles';
import { requireHospitalIdAccess } from '@/lib/hospital/access';

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
  // Kontext aplikace potřebuje název aktivního zařízení i pro provozní role.
  // Plnou konfiguraci však smí dostat pouze superadministrátor.
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Supabase není nakonfigurován' }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  const canManageHospitals = isSuperAdminRole(auth.user.role);
  if (!canManageHospitals) {
    const hospitalAccess = await requireHospitalIdAccess(auth.user, auth.user.hospitalId);
    if (hospitalAccess instanceof NextResponse) return hospitalAccess;
  }
  const selectedFields = canManageHospitals
    ? `id,${HOSPITAL_FIELDS.join(',')}`
    : 'id,hospital_name,hospital_short_name';
  let query = admin.from('hospitals').select(selectedFields).order('hospital_name');
  if (!canManageHospitals) query = query.eq('id', auth.user.hospitalId);
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hospitals: data ?? [], hospital: data?.[0] ?? {} });
}

export async function POST(req: NextRequest) {
  // Zdravotnická zařízení jsou globální konfigurace — spravuje je jen superadmin.
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!isSuperAdminRole(auth.user.role)) {
    return NextResponse.json(
      { error: 'Zdravotnická zařízení může spravovat pouze superadministrátor.' },
      { status: 403 },
    );
  }
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

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
    const [modulesResult, submodulesResult, statusesResult, settingsResult] = await Promise.all([
      admin.from('app_modules').select('*').eq('hospital_id', 'default'),
      admin.from('app_submodules').select('*').eq('hospital_id', 'default'),
      admin.from('workflow_statuses').select('*').eq('hospital_id', 'default'),
      admin.from('app_settings').select('*').eq('hospital_id', 'default').eq('id', 'default-global'),
    ]);
    if (modulesResult.data?.length) {
      await admin.from('app_modules').insert(modulesResult.data.map(row => ({ ...row, hospital_id: id })));
    }
    if (submodulesResult.data?.length) {
      await admin.from('app_submodules').insert(submodulesResult.data.map(row => ({ ...row, hospital_id: id })));
    }
    if (statusesResult.data?.length) {
      await admin.from('workflow_statuses').insert(statusesResult.data.map(row => ({ ...row, hospital_id: id })));
    }
    const baseSettings = settingsResult.data?.[0];
    if (baseSettings) {
      const cleanSettings = { ...baseSettings } as Record<string, unknown>;
      for (const field of HOSPITAL_FIELDS) delete cleanSettings[field];
      await admin.from('app_settings').insert({
        ...cleanSettings,
        id: `${id}-global`,
        hospital_id: id,
      });
    }

  }
  return NextResponse.json({ success: true, hospital: data });
}
