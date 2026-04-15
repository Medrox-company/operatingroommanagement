import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - seznam všech management kontaktů
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('management_contacts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching management contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch management contacts' },
      { status: 500 }
    );
  }
}

// POST - přidání nového management kontaktu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      position, 
      email, 
      name, 
      phone,
      notes,
      notify_emergencies, 
      notify_daily_reports,
      notify_statistics,
      is_active,
      sort_order
    } = body;

    if (!position || !email) {
      return NextResponse.json(
        { error: 'Position and email are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('management_contacts')
      .insert([
        {
          id: `mgmt-${Date.now()}`,
          position,
          email,
          name: name || '',
          phone: phone || '',
          notes: notes || '',
          notify_emergencies: notify_emergencies ?? true,
          notify_daily_reports: notify_daily_reports ?? false,
          notify_statistics: notify_statistics ?? false,
          is_active: is_active ?? true,
          sort_order: sort_order ?? 0,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error('Error creating management contact:', error);
    return NextResponse.json(
      { error: 'Failed to create management contact' },
      { status: 500 }
    );
  }
}

// PUT - aktualizace management kontaktu
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      position, 
      email, 
      name, 
      phone,
      notes,
      notify_emergencies, 
      notify_daily_reports,
      notify_statistics,
      is_active,
      sort_order
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('management_contacts')
      .update({
        position,
        email,
        name: name || '',
        phone: phone || '',
        notes: notes || '',
        notify_emergencies,
        notify_daily_reports,
        notify_statistics,
        is_active,
        sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Error updating management contact:', error);
    return NextResponse.json(
      { error: 'Failed to update management contact' },
      { status: 500 }
    );
  }
}

// DELETE - smazání management kontaktu
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('management_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting management contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete management contact' },
      { status: 500 }
    );
  }
}
