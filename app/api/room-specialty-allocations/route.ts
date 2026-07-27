import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOSPITAL_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
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

function normalizeDepartmentName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('cs');
}

function hospitalDepartmentId(hospitalId: string, name: string) {
  const digest = createHash('sha256')
    .update(`${hospitalId}:${normalizeDepartmentName(name)}`)
    .digest('hex')
    .slice(0, 32);
  return `department-${digest}`;
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
    { data: initialDepartments, error: departmentError },
    { data: roomDepartments, error: roomDepartmentError },
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
      .select('id, name, accent_color')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    admin
      .from('operating_rooms')
      .select('department')
      .eq('hospital_id', hospitalId),
  ]);

  if (allocationError) return databaseError(allocationError, 'Rozpis se nepodařilo načíst.');
  if (departmentError) return databaseError(departmentError, 'Operační obory se nepodařilo načíst.');
  if (roomDepartmentError) return databaseError(roomDepartmentError, 'Obory operačních sálů se nepodařilo načíst.');

  // Nové nemocnice nemusí mít historicky založené řádky v departments.
  // Bootstrapujeme pouze názvy oborů z JEJICH vlastních operačních sálů.
  const knownNames = new Set((initialDepartments ?? []).map(item => normalizeDepartmentName(String(item.name || ''))));
  const uniqueRoomDepartments = new Map<string, string>();
  for (const row of roomDepartments ?? []) {
    const name = typeof row.department === 'string' ? row.department.trim().replace(/\s+/g, ' ') : '';
    if (!name) continue;
    const normalized = normalizeDepartmentName(name);
    if (!knownNames.has(normalized)) uniqueRoomDepartments.set(normalized, name);
  }

  let departments = initialDepartments ?? [];
  if (uniqueRoomDepartments.size > 0) {
    const rows = Array.from(uniqueRoomDepartments.values()).map((name, index) => ({
      id: hospitalDepartmentId(hospitalId, name),
      hospital_id: hospitalId,
      name,
      description: 'Automaticky vytvořeno z konfigurace operačních sálů',
      is_active: true,
      accent_color: ['#22D3EE', '#38BDF8', '#818CF8', '#A78BFA', '#F472B6', '#34D399', '#FBBF24'][index % 7],
    }));
    const { error: insertError } = await admin.from('departments').upsert(rows, { onConflict: 'id' });
    if (insertError) return databaseError(insertError, 'Obory zařízení se nepodařilo inicializovat.');
    const { data: refreshedDepartments, error: refreshError } = await admin
      .from('departments')
      .select('id, name, accent_color')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (refreshError) return databaseError(refreshError, 'Operační obory se nepodařilo znovu načíst.');
    departments = refreshedDepartments ?? [];
  }

  return NextResponse.json(
    { allocations: allocations ?? [], departments },
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
