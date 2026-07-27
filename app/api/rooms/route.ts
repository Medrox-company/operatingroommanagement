import { fetchOperatingRooms } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// CRITICAL: Disable all caching - this endpoint must always return fresh data
// for real-time sync of room states (lock, emergency) across devices
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;
  const { hospitalId } = access;

  try {
    const rooms = await fetchOperatingRooms(hospitalId, getSupabaseAdmin());
    return NextResponse.json(rooms, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error("[API] Failed to fetch rooms:", error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
