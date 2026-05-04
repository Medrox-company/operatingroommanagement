import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role for reliable DB writes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomId, field, value } = body;

    if (!roomId || !field) {
      return NextResponse.json({ error: 'Missing roomId or field' }, { status: 400 });
    }

    if (!['is_emergency', 'is_locked'].includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    if (!supabase) {
      console.error('[API] Supabase not configured');
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('operating_rooms')
      .update({ [field]: value })
      .eq('id', roomId)
      .select();

    if (error) {
      console.error('[API] DB update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Toggle success:', { roomId, field, value, data });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[API] Toggle error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
