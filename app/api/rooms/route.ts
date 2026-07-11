import { fetchOperatingRooms } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/server';
import { getRequestHospitalId } from '@/lib/hospital/request';

// CRITICAL: Disable all caching - this endpoint must always return fresh data
// for real-time sync of room states (lock, emergency) across devices
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;
  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId) return NextResponse.json({ error: 'Hospital is required' }, { status: 400 });

  try {
    const rooms = await fetchOperatingRooms(hospitalId);
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
