import { fetchOperatingRooms } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rooms = await fetchOperatingRooms();
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("[API] Failed to fetch rooms:", error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
