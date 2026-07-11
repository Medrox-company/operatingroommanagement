import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireSession } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { logger } from '@/lib/logger';
import { getRequestHospitalId } from '@/lib/hospital/request';

export const runtime = 'nodejs';

let supabaseInstance: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance !== undefined) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  supabaseInstance = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

  return supabaseInstance;
}

export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId) return NextResponse.json({ error: 'Hospital is required' }, { status: 400 });

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

    const supabase = getSupabaseClient();

    if (!supabase) {
      logger.error('[API] Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

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
