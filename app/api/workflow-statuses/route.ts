import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const { hospitalId } = access;
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('workflow_statuses')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error fetching workflow statuses:', error);
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { hospitalId } = access;

  const supabase = getSupabaseAdmin();

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
      .eq('hospital_id', hospitalId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Error updating workflow status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { hospitalId } = access;

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    
    // Get max sort_order
    const { data: maxData } = await supabase
      .from('workflow_statuses')
      .select('sort_order')
      .eq('hospital_id', hospitalId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const newSortOrder = (maxData?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('workflow_statuses')
      .insert({
        id: `status-${Date.now()}`,
        hospital_id: hospitalId,
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
    logger.error('Error creating workflow status:', error);
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { hospitalId } = access;

  const supabase = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('workflow_statuses')
      .delete()
      .eq('id', id)
      .eq('hospital_id', hospitalId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting workflow status:', error);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
