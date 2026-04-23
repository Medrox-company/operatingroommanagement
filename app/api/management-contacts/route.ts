import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireSession, requireAdmin } from '@/lib/auth/server';

export const runtime = 'nodejs';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeString(v: unknown, maxLen = 500): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, maxLen);
}

// GET - seznam všech management kontaktů (pro přihlášené uživatele)
export async function GET() {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('management_contacts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('[management-contacts] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch management contacts' },
      { status: 500 }
    );
  }
}

// POST - přidání nového management kontaktu (admin only)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const position = sanitizeString(body.position, 200);
    const email = sanitizeString(body.email, 255).toLowerCase();
    const name = sanitizeString(body.name, 200);
    const phone = sanitizeString(body.phone, 50);
    const notes = sanitizeString(body.notes, 1000);

    if (!position || !email) {
      return NextResponse.json(
        { error: 'Position and email are required' },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Neplatný formát e-mailu' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('management_contacts')
      .insert([
        {
          id: `mgmt-${Date.now()}`,
          position,
          email,
          name,
          phone,
          notes,
          notify_emergencies: !!body.notify_emergencies,
          notify_daily_reports: !!body.notify_daily_reports,
          notify_statistics: !!body.notify_statistics,
          is_active: body.is_active ?? true,
          sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('[management-contacts] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create management contact' },
      { status: 500 }
    );
  }
}

// PUT - aktualizace management kontaktu (admin only)
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const id = sanitizeString(body.id, 100);
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const position = sanitizeString(body.position, 200);
    const email = sanitizeString(body.email, 255).toLowerCase();

    if (!position || !email) {
      return NextResponse.json(
        { error: 'Position and email are required' },
        { status: 400 }
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Neplatný formát e-mailu' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('management_contacts')
      .update({
        position,
        email,
        name: sanitizeString(body.name, 200),
        phone: sanitizeString(body.phone, 50),
        notes: sanitizeString(body.notes, 1000),
        notify_emergencies: !!body.notify_emergencies,
        notify_daily_reports: !!body.notify_daily_reports,
        notify_statistics: !!body.notify_statistics,
        is_active: body.is_active ?? true,
        sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('[management-contacts] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update management contact' },
      { status: 500 }
    );
  }
}

// DELETE - smazání management kontaktu (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('management_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[management-contacts] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete management contact' },
      { status: 500 }
    );
  }
}
