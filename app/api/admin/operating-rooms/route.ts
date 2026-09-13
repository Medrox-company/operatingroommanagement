import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const ROOM_ID = /^[a-zA-Z0-9_-]{1,150}$/;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function isWeeklySchedule(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const schedule = value as Record<string, unknown>;
  return DAY_KEYS.every((day) => {
    const entry = schedule[day];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const typed = entry as Record<string, unknown>;
    return typeof typed.enabled === 'boolean'
      && typeof typed.start === 'string'
      && typeof typed.end === 'string';
  });
}

async function authorize(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'settings.rooms');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;
  return access;
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (isWeeklySchedule(body.weekly_schedule)) {
    if (!ROOM_ID.test(id)) {
      return NextResponse.json({ error: 'Neplatný operační sál.' }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin()
      .from('operating_rooms')
      .update({ weekly_schedule: body.weekly_schedule, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('hospital_id', access.hospitalId)
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Rozpis sálu se nepodařilo uložit.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Operační sál nebyl nalezen.' }, { status: 404 });
    return NextResponse.json({ success: true });
  }
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const department = typeof body.department === 'string' ? body.department.trim().slice(0, 120) : '';
  const sortOrder = Number(body.sort_order);
  if (!ROOM_ID.test(id) || name.length < 2 || name.length > 160 || !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 500) {
    return NextResponse.json({ error: 'Neplatné údaje operačního sálu.' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('operating_rooms')
    .insert({
      id,
      hospital_id: access.hospitalId,
      name,
      department,
      status: 'FREE',
      queue_count: 0,
      operations_24h: 0,
      current_step_index: 6,
      is_emergency: false,
      is_locked: false,
      is_paused: false,
      is_septic: false,
      sort_order: sortOrder,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'Operační sál se nepodařilo vytvořit.' }, { status: error.code === '23505' ? 409 : 500 });
  return NextResponse.json({ room: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const department = typeof body.department === 'string' ? body.department.trim().slice(0, 120) : '';
  if (!ROOM_ID.test(id) || name.length < 2 || name.length > 160) {
    return NextResponse.json({ error: 'Neplatné údaje operačního sálu.' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('operating_rooms')
    .update({ name, department, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Operační sál se nepodařilo uložit.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Operační sál nebyl nalezen.' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!ROOM_ID.test(id)) return NextResponse.json({ error: 'Neplatný operační sál.' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin()
    .from('operating_rooms')
    .delete()
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Operační sál se nepodařilo smazat.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Operační sál nebyl nalezen.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
