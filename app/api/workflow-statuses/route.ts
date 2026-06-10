import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('workflow_statuses')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching workflow statuses:', error);
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...rawUpdates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    // Povol jen známé sloupce (ochrana proti mass-assignment)
    const ALLOWED_FIELDS = [
      'name', 'description', 'accent_color', 'icon', 'sort_order',
      'default_duration_minutes', 'is_active', 'is_special', 'include_in_statistics',
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in rawUpdates) updates[field] = rawUpdates[field];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workflow_statuses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating workflow status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    
    // Get max sort_order
    const { data: maxData } = await supabase
      .from('workflow_statuses')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = (maxData?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('workflow_statuses')
      .insert({
        id: `status-${Date.now()}`,
        name: body.name || 'Nový status',
        description: body.description || '',
        accent_color: body.accent_color || '#6B7280',
        icon: body.icon || 'Circle',
        sort_order: newSortOrder,
        default_duration_minutes: body.default_duration_minutes || 15,
        is_active: body.is_active ?? true,
        is_special: body.is_special ?? false,
        include_in_statistics: body.include_in_statistics ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating workflow status:', error);
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('workflow_statuses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow status:', error);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
