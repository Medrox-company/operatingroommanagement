import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const STAFF_ID = /^[a-zA-Z0-9_-]{1,150}$/;
const ROLES = new Set(['DOCTOR', 'NURSE']);
const SKILL_LEVELS = new Set(['L3', 'L2', 'L1', 'A', 'SR', 'N', 'S']);

async function authorize(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'settings.staff');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;
  return access;
}

export async function POST(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const role = typeof body.role === 'string' ? body.role : '';
  if (name.length < 2 || name.length > 160 || !ROLES.has(role)) {
    return NextResponse.json({ error: 'Neplatné údaje zaměstnance.' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('staff')
    .insert({
      id: `staff-${randomUUID()}`,
      hospital_id: access.hospitalId,
      name,
      role,
      is_active: true,
    })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Zaměstnance se nepodařilo vytvořit.' }, { status: 500 });
  return NextResponse.json({ staff: data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!STAFF_ID.test(id)) return NextResponse.json({ error: 'Neplatný zaměstnanec.' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 2 || name.length > 160) return NextResponse.json({ error: 'Neplatné jméno.' }, { status: 400 });
    updates.name = name;
  }
  if ('role' in body) {
    if (typeof body.role !== 'string' || !ROLES.has(body.role)) return NextResponse.json({ error: 'Neplatná role.' }, { status: 400 });
    updates.role = body.role;
  }
  if ('skill_level' in body) {
    if (body.skill_level != null && (typeof body.skill_level !== 'string' || !SKILL_LEVELS.has(body.skill_level))) {
      return NextResponse.json({ error: 'Neplatná úroveň odbornosti.' }, { status: 400 });
    }
    updates.skill_level = body.skill_level ?? null;
  }
  if ('availability' in body) {
    const availability = Number(body.availability);
    if (!Number.isFinite(availability) || availability < 0 || availability > 100) {
      return NextResponse.json({ error: 'Neplatná dostupnost.' }, { status: 400 });
    }
    updates.availability = availability;
  }
  for (const field of ['is_external', 'is_recommended', 'is_active'] as const) {
    if (field in body) {
      if (typeof body[field] !== 'boolean') return NextResponse.json({ error: 'Neplatná hodnota přepínače.' }, { status: 400 });
      updates[field] = body[field];
    }
  }
  for (const field of ['sick_leave_days', 'vacation_days'] as const) {
    if (field in body) {
      const value = Number(body[field]);
      if (!Number.isInteger(value) || value < 0 || value > 366) return NextResponse.json({ error: 'Neplatný počet dnů.' }, { status: 400 });
      updates[field] = value;
    }
  }
  if ('notes' in body) {
    if (body.notes != null && typeof body.notes !== 'string') return NextResponse.json({ error: 'Neplatná poznámka.' }, { status: 400 });
    updates.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Chybí změny.' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('staff')
    .update(updates)
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Zaměstnance se nepodařilo uložit.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Zaměstnanec nebyl nalezen.' }, { status: 404 });
  return NextResponse.json({ staff: data });
}

export async function DELETE(request: NextRequest) {
  const access = await authorize(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!STAFF_ID.test(id)) return NextResponse.json({ error: 'Neplatný zaměstnanec.' }, { status: 400 });
  const { data, error } = await getSupabaseAdmin()
    .from('staff')
    .delete()
    .eq('id', id)
    .eq('hospital_id', access.hospitalId)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Zaměstnance se nepodařilo smazat.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Zaměstnanec nebyl nalezen.' }, { status: 404 });
  return NextResponse.json({ success: true });
}
