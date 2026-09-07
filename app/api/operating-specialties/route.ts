import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOSPITAL_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const SHORT_CODE_PATTERN = /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ -]{2,10}$/u;

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalizeDescription(value: unknown) {
  const description = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return description || null;
}

function normalizeShortCode(value: unknown) {
  return typeof value === 'string'
    ? value.replace(/\./g, '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('cs')
    : '';
}

function databaseError(error: { code?: string } | null, fallback: string) {
  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Operační obor se stejným názvem nebo zkratkou již existuje.' }, { status: 409 });
  }
  if (error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204' || error?.code === 'PGRST205') {
    return NextResponse.json(
      { error: 'Databázový modul operačních oborů vyžaduje aktuální migraci.', migrationRequired: true },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function validateHospital(hospitalId: string) {
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const invalidHospital = validateHospital(access.hospitalId);
  if (invalidHospital) return invalidHospital;

  const admin = getSupabaseAdmin();
  const [{ data: departments, error }, { data: allocations, error: allocationError }] = await Promise.all([
    admin
      .from('departments')
      .select('id, name, short_code, description, accent_color, is_active, sort_order, created_at, updated_at')
      .eq('hospital_id', access.hospitalId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    admin
      .from('room_specialty_allocations')
      .select('department_id')
      .eq('hospital_id', access.hospitalId)
      .not('department_id', 'is', null),
  ]);

  if (error) return databaseError(error, 'Operační obory se nepodařilo načíst.');
  if (allocationError) return databaseError(allocationError, 'Použití operačních oborů se nepodařilo načíst.');

  const usage = new Map<string, number>();
  for (const allocation of allocations ?? []) {
    if (!allocation.department_id) continue;
    usage.set(allocation.department_id, (usage.get(allocation.department_id) ?? 0) + 1);
  }

  return NextResponse.json({
    departments: (departments ?? []).map(department => ({
      ...department,
      allocation_count: usage.get(department.id) ?? 0,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const invalidHospital = validateHospital(access.hospitalId);
  if (invalidHospital) return invalidHospital;

  const body = await request.json().catch(() => ({}));
  const name = normalizeName(body.name);
  const shortCode = normalizeShortCode(body.shortCode);
  const description = normalizeDescription(body.description);
  const accentColor = typeof body.accentColor === 'string' ? body.accentColor : '#22D3EE';
  if (name.length < 2 || name.length > 100 || !SHORT_CODE_PATTERN.test(shortCode) || (description?.length ?? 0) > 240 || !COLOR_PATTERN.test(accentColor)) {
    return NextResponse.json({ error: 'Zkontrolujte název, zkratku, popis a barvu operačního oboru.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: duplicateShortCode, error: duplicateError } = await admin
    .from('departments')
    .select('id')
    .eq('hospital_id', access.hospitalId)
    .ilike('short_code', shortCode)
    .limit(1)
    .maybeSingle();
  if (duplicateError) return databaseError(duplicateError, 'Zkratku operačního oboru se nepodařilo ověřit.');
  if (duplicateShortCode) return NextResponse.json({ error: 'Tuto zkratku již používá jiný operační obor.' }, { status: 409 });

  const { data: lastDepartment, error: orderError } = await admin
    .from('departments')
    .select('sort_order')
    .eq('hospital_id', access.hospitalId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) return databaseError(orderError, 'Pořadí operačních oborů se nepodařilo načíst.');

  const { data, error } = await admin
    .from('departments')
    .insert({
      id: `department-${randomUUID()}`,
      hospital_id: access.hospitalId,
      name,
      short_code: shortCode,
      description,
      accent_color: accentColor.toUpperCase(),
      is_active: body.isActive !== false,
      sort_order: (lastDepartment?.sort_order ?? -1) + 1,
    })
    .select('id, name, short_code, description, accent_color, is_active, sort_order, created_at, updated_at')
    .single();
  if (error) return databaseError(error, 'Operační obor se nepodařilo vytvořit.');

  return NextResponse.json({ department: { ...data, allocation_count: 0 } }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const invalidHospital = validateHospital(access.hospitalId);
  if (invalidHospital) return invalidHospital;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const name = normalizeName(body.name);
  const shortCode = normalizeShortCode(body.shortCode);
  const description = normalizeDescription(body.description);
  const accentColor = typeof body.accentColor === 'string' ? body.accentColor : '';
  const sortOrder = Number(body.sortOrder);
  if (
    !id || id.length > 150 || name.length < 2 || name.length > 100 || !SHORT_CODE_PATTERN.test(shortCode)
    || (description?.length ?? 0) > 240 || !COLOR_PATTERN.test(accentColor)
    || !Number.isInteger(sortOrder) || sortOrder < 0
  ) {
    return NextResponse.json({ error: 'Zkontrolujte upravované údaje operačního oboru.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: duplicateShortCode, error: duplicateError } = await admin
    .from('departments')
    .select('id')
    .eq('hospital_id', access.hospitalId)
    .ilike('short_code', shortCode)
    .neq('id', id)
    .limit(1)
    .maybeSingle();
  if (duplicateError) return databaseError(duplicateError, 'Zkratku operačního oboru se nepodařilo ověřit.');
  if (duplicateShortCode) return NextResponse.json({ error: 'Tuto zkratku již používá jiný operační obor.' }, { status: 409 });

  const { data, error } = await admin
    .from('departments')
    .update({
      name,
      short_code: shortCode,
      description,
      accent_color: accentColor.toUpperCase(),
      is_active: body.isActive !== false,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('id, name, short_code, description, accent_color, is_active, sort_order, created_at, updated_at')
    .maybeSingle();
  if (error) return databaseError(error, 'Operační obor se nepodařilo uložit.');
  if (!data) return NextResponse.json({ error: 'Operační obor nebyl nalezen.' }, { status: 404 });

  return NextResponse.json({ department: data });
}

export async function DELETE(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const invalidHospital = validateHospital(access.hospitalId);
  if (invalidHospital) return invalidHospital;

  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!id || id.length > 150) return NextResponse.json({ error: 'Neplatný operační obor.' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { count, error: usageError } = await admin
    .from('room_specialty_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('hospital_id', access.hospitalId)
    .eq('department_id', id);
  if (usageError) return databaseError(usageError, 'Použití operačního oboru se nepodařilo ověřit.');
  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: `Operační obor je použit v ${count} položkách rozpisu. Místo smazání jej deaktivujte.`,
    }, { status: 409 });
  }

  const { data, error } = await admin
    .from('departments')
    .delete()
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('id')
    .maybeSingle();
  if (error) return databaseError(error, 'Operační obor se nepodařilo smazat.');
  if (!data) return NextResponse.json({ error: 'Operační obor nebyl nalezen.' }, { status: 404 });

  return NextResponse.json({ success: true });
}
