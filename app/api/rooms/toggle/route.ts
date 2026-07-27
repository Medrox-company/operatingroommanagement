import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { logger } from '@/lib/logger';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { hospitalId } = access;

  try {
    const body = await request.json();
    const { roomId, field, value } = body;

    if (!roomId || !field) {
      return NextResponse.json({ error: 'Missing roomId or field' }, { status: 400 });
    }

    if (!['is_emergency', 'is_locked'].includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }
    if (typeof value !== 'boolean') {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('operating_rooms')
      .update({ [field]: value })
      .eq('id', roomId)
      .eq('hospital_id', hospitalId)
      .select();

    if (error) {
      logger.error('[API] DB update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info('[API] Toggle success:', { roomId, field, value, data });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error('[API] Toggle error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
