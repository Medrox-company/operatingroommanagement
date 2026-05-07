import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - List all devices
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('last_seen_at', { ascending: false });

    if (error) {
      // Table might not exist
      if (error.code === '42P01') {
        return NextResponse.json({ devices: [], tableNotExists: true });
      }
      throw error;
    }

    return NextResponse.json({ devices: data || [] });
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

// POST - Register or update a device
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { device_id, device_name, device_type, platform, browser, is_pwa_installed } = body;

    // Get IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip_address = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    // Check if device exists
    const { data: existing } = await supabase
      .from('devices')
      .select('id, is_active')
      .eq('device_id', device_id)
      .single();

    if (existing) {
      // Update existing device
      const updateData: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ip_address,
      };

      if (device_name) updateData.device_name = device_name;
      if (device_type) updateData.device_type = device_type;
      if (platform) updateData.platform = platform;
      if (browser) updateData.browser = browser;
      if (is_pwa_installed !== undefined) {
        updateData.is_pwa_installed = is_pwa_installed;
        if (is_pwa_installed) {
          updateData.installed_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('devices')
        .update(updateData)
        .eq('device_id', device_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ device: data, isNew: false, isActive: existing.is_active });
    } else {
      // Create new device
      const { data, error } = await supabase
        .from('devices')
        .insert({
          device_id,
          device_name: device_name || `Zařízení ${new Date().toLocaleDateString('cs')}`,
          device_type: device_type || 'unknown',
          platform: platform || 'unknown',
          browser: browser || 'unknown',
          is_pwa_installed: is_pwa_installed || false,
          installed_at: is_pwa_installed ? new Date().toISOString() : null,
          is_active: true,
          ip_address,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ device: data, isNew: true, isActive: true });
    }
  } catch (error) {
    console.error('Failed to register device:', error);
    return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
  }
}

// PATCH - Update device (activate/deactivate, rename)
export async function PATCH(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, device_id, is_active, device_name } = body;

    const identifier = id || device_id;
    if (!identifier) {
      return NextResponse.json({ error: 'id or device_id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (is_active !== undefined) updateData.is_active = is_active;
    if (device_name !== undefined) updateData.device_name = device_name;

    const query = supabase.from('devices').update(updateData);
    
    if (id) {
      query.eq('id', id);
    } else {
      query.eq('device_id', device_id);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return NextResponse.json({ device: data });
  } catch (error) {
    console.error('Failed to update device:', error);
    return NextResponse.json({ error: 'Failed to update device' }, { status: 500 });
  }
}

// DELETE - Remove a device
export async function DELETE(request: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const device_id = searchParams.get('device_id');

    const identifier = id || device_id;
    if (!identifier) {
      return NextResponse.json({ error: 'id or device_id is required' }, { status: 400 });
    }

    const query = supabase.from('devices').delete();
    
    if (id) {
      query.eq('id', id);
    } else {
      query.eq('device_id', device_id);
    }

    const { error } = await query;

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete device:', error);
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}
