import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOSPITAL_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_BULK_TARGETS = 400;
type AllocationKind = 'SPECIALTY' | 'CLOSED' | 'SERVICE';

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

function databaseError(error: { code?: string; message?: string } | null, fallback: string) {
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return NextResponse.json(
      { error: 'Databázový modul rozpisu ještě není nainstalován.', migrationRequired: true },
      { status: 503 },
    );
  }
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    return NextResponse.json(
      { error: 'Databázový modul rozpisu vyžaduje aktuální migraci.', migrationRequired: true },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const { hospitalId } = access;
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }

  const requestedDate = request.nextUrl.searchParams.get('date');
  const parsedRequestedDate = requestedDate ? parseDate(requestedDate) : null;
  const year = Number(request.nextUrl.searchParams.get('year'));
  if (!parsedRequestedDate && (!Number.isInteger(year) || year < 2020 || year > 2100)) {
    return NextResponse.json({ error: 'Neplatné datum nebo rok.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const resolvedYear = parsedRequestedDate?.getUTCFullYear() ?? year;
  const start = parsedRequestedDate ? formatDate(parsedRequestedDate) : `${resolvedYear}-01-01`;
  const end = parsedRequestedDate ? start : `${resolvedYear}-12-31`;
  const [
    { data: allocations, error: allocationError },
    { data: departments, error: departmentError },
  ] = await Promise.all([
    admin
      .from('room_specialty_allocations')
      .select('id, operating_room_id, department_id, allocation_date, day_part, allocation_kind, updated_at')
      .eq('hospital_id', hospitalId)
      .gte('allocation_date', start)
      .lte('allocation_date', end)
      .order('allocation_date', { ascending: true }),
    admin
      .from('departments')
      .select('id, name, short_code, description, accent_color, is_active, sort_order')
      .eq('hospital_id', hospitalId)
      .order('sort_order', { ascending: true })
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
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { hospitalId } = access;
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const roomId = typeof body.roomId === 'string' ? body.roomId : '';
  const departmentId = typeof body.departmentId === 'string' && body.departmentId ? body.departmentId : null;
  const requestedKind: AllocationKind | null = body.allocationKind === 'SPECIALTY'
    || body.allocationKind === 'CLOSED'
    || body.allocationKind === 'SERVICE'
    ? body.allocationKind
    : null;
  const clear = body.clear === true || (!requestedKind && !departmentId);
  const allocationKind: AllocationKind = requestedKind ?? 'SPECIALTY';
  const requestedParts = Array.isArray(body.dayParts) ? body.dayParts : [body.dayPart];
  const dayParts = Array.from(new Set(requestedParts.filter((part: unknown): part is 'AM' | 'PM' => part === 'AM' || part === 'PM')));
  const startDate = typeof body.date === 'string' ? parseDate(body.date) : null;
  const repeat = body.repeat === 'month' || body.repeat === 'year' ? body.repeat : 'single';
  if (!roomId || roomId.length > 150 || !startDate || dayParts.length === 0 || (!clear && allocationKind === 'SPECIALTY' && !departmentId)) {
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

  if (!clear && allocationKind === 'SPECIALTY' && departmentId) {
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
  if (clear) {
    const { error } = await admin
      .from('room_specialty_allocations')
      .delete()
      .eq('hospital_id', hospitalId)
      .eq('operating_room_id', roomId)
      .in('allocation_date', dates)
      .in('day_part', dayParts);
    if (error) return databaseError(error, 'Přiřazení se nepodařilo odstranit.');
  } else {
    const now = new Date().toISOString();
    const rows = dates.flatMap(allocationDate => dayParts.map(dayPart => ({
        hospital_id: hospitalId,
        operating_room_id: roomId,
        department_id: allocationKind === 'SPECIALTY' ? departmentId : null,
        allocation_date: allocationDate,
        day_part: dayPart,
        allocation_kind: allocationKind,
        updated_at: now,
      })));
    const { error } = await admin
      .from('room_specialty_allocations')
      .upsert(rows, { onConflict: 'hospital_id,operating_room_id,allocation_date,day_part' });
    if (error) return databaseError(error, 'Rozpis se nepodařilo uložit.');
  }

  return NextResponse.json({ success: true, dates, dayParts, allocationKind: clear ? null : allocationKind });
}

export async function PATCH(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const { hospitalId } = access;
  if (!hospitalId || !HOSPITAL_PATTERN.test(hospitalId)) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const allocationKind: AllocationKind | null = body.allocationKind === 'SPECIALTY'
    || body.allocationKind === 'CLOSED'
    || body.allocationKind === 'SERVICE'
    ? body.allocationKind
    : null;
  const departmentId = typeof body.departmentId === 'string' && body.departmentId ? body.departmentId : null;
  const rawTargets = Array.isArray(body.targets) ? body.targets : [];
  if (!allocationKind || rawTargets.length === 0 || rawTargets.length > MAX_BULK_TARGETS || (allocationKind === 'SPECIALTY' && !departmentId)) {
    return NextResponse.json({ error: 'Neplatný rozsah hromadného přiřazení.' }, { status: 400 });
  }

  const targets = new Map<string, { roomId: string; date: string; dayPart: 'AM' | 'PM' }>();
  for (const target of rawTargets) {
    const roomId = typeof target?.roomId === 'string' ? target.roomId : '';
    const parsedDate = typeof target?.date === 'string' ? parseDate(target.date) : null;
    const dayPart = target?.dayPart === 'AM' || target?.dayPart === 'PM' ? target.dayPart : null;
    if (!roomId || roomId.length > 150 || !parsedDate || !dayPart) {
      return NextResponse.json({ error: 'Neplatná buňka hromadného přiřazení.' }, { status: 400 });
    }
    const date = formatDate(parsedDate);
    targets.set(`${roomId}|${date}|${dayPart}`, { roomId, date, dayPart });
  }

  const uniqueTargets = Array.from(targets.values());
  const roomIds = Array.from(new Set(uniqueTargets.map(target => target.roomId)));
  const admin = getSupabaseAdmin();
  const { data: rooms, error: roomsError } = await admin
    .from('operating_rooms')
    .select('id')
    .eq('hospital_id', hospitalId)
    .in('id', roomIds);
  if (roomsError) return databaseError(roomsError, 'Operační sály se nepodařilo ověřit.');
  if ((rooms ?? []).length !== roomIds.length) {
    return NextResponse.json({ error: 'Některý operační sál nebyl nalezen.' }, { status: 404 });
  }

  if (allocationKind === 'SPECIALTY' && departmentId) {
    const { data: department } = await admin
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .maybeSingle();
    if (!department) return NextResponse.json({ error: 'Operační obor nebyl nalezen.' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const rows = uniqueTargets.map(target => ({
    hospital_id: hospitalId,
    operating_room_id: target.roomId,
    department_id: allocationKind === 'SPECIALTY' ? departmentId : null,
    allocation_date: target.date,
    day_part: target.dayPart,
    allocation_kind: allocationKind,
    updated_at: now,
  }));
  const { error } = await admin
    .from('room_specialty_allocations')
    .upsert(rows, { onConflict: 'hospital_id,operating_room_id,allocation_date,day_part' });
  if (error) return databaseError(error, 'Hromadné přiřazení se nepodařilo uložit.');

  return NextResponse.json({ success: true, count: rows.length });
}
