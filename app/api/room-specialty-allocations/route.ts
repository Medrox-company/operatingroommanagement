import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { getRequestHospitalId } from '@/lib/hospital/request';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOSPITAL_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

function parseDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function repeatedDates(start: Date, repeat: 'single' | 'month' | 'year') {
  if (repeat === 'single') return [formatDate(start)];
  const end = repeat === 'month'
    ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
    : new Date(Date.UTC(start.getUTCFullYear(), 11, 31));
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && result.length < 54) {
    result.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return result;
}

async function canAccessHospital(userId: string, role: string, hospitalId: string) {
  if (role === 'admin') return true;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('hospital_user_memberships')
    .select('user_id')
    .eq('user_id', userId)
    .eq('hospital_id', hospitalId)
    .maybeSingle();
  return Boolean(data);
}

function databaseError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === '42P01') {
    return NextResponse.json(
      { error: 'Databázový modul rozpisu ještě není nainstalován.', migrationRequired: true },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }
  if (!await canAccessHospital(auth.user.sub, auth.user.role, hospitalId)) {
    return NextResponse.json({ error: 'K zařízení nemáte přístup.' }, { status: 403 });
  }

  const year = Number(request.nextUrl.searchParams.get('year'));
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: 'Neplatný rok.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const [{ data: allocations, error: allocationError }, { data: departments, error: departmentError }] = await Promise.all([
    admin
      .from('room_specialty_allocations')
      .select('id, operating_room_id, department_id, allocation_date, updated_at')
      .eq('hospital_id', hospitalId)
      .gte('allocation_date', start)
      .lte('allocation_date', end)
      .order('allocation_date', { ascending: true }),
    admin
      .from('departments')
      .select('id, name, accent_color')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ]);

  if (allocationError) return databaseError(allocationError, 'Rozpis se nepodařilo načíst.');
  if (departmentError) return databaseError(departmentError, 'Operační obory se nepodařilo načíst.');

  return NextResponse.json(
    { allocations: allocations ?? [], departments: departments ?? [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }
  if (!await canAccessHospital(auth.user.sub, auth.user.role, hospitalId)) {
    return NextResponse.json({ error: 'K zařízení nemáte přístup.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const roomId = typeof body.roomId === 'string' ? body.roomId : '';
  const departmentId = typeof body.departmentId === 'string' && body.departmentId ? body.departmentId : null;
  const startDate = typeof body.date === 'string' ? parseDate(body.date) : null;
  const repeat = body.repeat === 'month' || body.repeat === 'year' ? body.repeat : 'single';
  if (!roomId || roomId.length > 150 || !startDate) {
    return NextResponse.json({ error: 'Neplatné údaje rozpisu.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: room } = await admin
    .from('operating_rooms')
    .select('id')
    .eq('id', roomId)
    .eq('hospital_id', hospitalId)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: 'Operační sál nebyl nalezen.' }, { status: 404 });

  if (departmentId) {
    const { data: department } = await admin
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .maybeSingle();
    if (!department) return NextResponse.json({ error: 'Operační obor nebyl nalezen.' }, { status: 404 });
  }

  const dates = repeatedDates(startDate, repeat);
  if (!departmentId) {
    const { error } = await admin
      .from('room_specialty_allocations')
      .delete()
      .eq('hospital_id', hospitalId)
      .eq('operating_room_id', roomId)
      .in('allocation_date', dates);
    if (error) return databaseError(error, 'Přiřazení se nepodařilo odstranit.');
  } else {
    const now = new Date().toISOString();
    const rows = dates.map(allocationDate => ({
      hospital_id: hospitalId,
      operating_room_id: roomId,
      department_id: departmentId,
      allocation_date: allocationDate,
      updated_at: now,
    }));
    const { error } = await admin
      .from('room_specialty_allocations')
      .upsert(rows, { onConflict: 'hospital_id,operating_room_id,allocation_date' });
    if (error) return databaseError(error, 'Rozpis se nepodařilo uložit.');
  }

  return NextResponse.json({ success: true, dates });
}
