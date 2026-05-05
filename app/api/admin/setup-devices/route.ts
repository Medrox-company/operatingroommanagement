import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint creates the devices table if it doesn't exist
export async function POST() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('devices')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist - this would need to be created via Supabase dashboard
      // For now, return instructions
      return NextResponse.json({
        success: false,
        message: 'Table does not exist. Please create it in Supabase dashboard.',
        sql: `
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  device_type TEXT,
  platform TEXT,
  browser TEXT,
  is_active BOOLEAN DEFAULT true,
  is_pwa_installed BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  installed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY devices_read ON public.devices FOR SELECT USING (true);
CREATE POLICY devices_write ON public.devices FOR INSERT WITH CHECK (true);
CREATE POLICY devices_update ON public.devices FOR UPDATE USING (true);
CREATE POLICY devices_delete ON public.devices FOR DELETE USING (true);
        `
      });
    }

    return NextResponse.json({ success: true, message: 'Table already exists' });
  } catch (error) {
    console.error('Setup devices error:', error);
    return NextResponse.json({ error: 'Failed to setup devices table' }, { status: 500 });
  }
}
