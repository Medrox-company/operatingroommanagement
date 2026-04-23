import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireSession } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth instanceof NextResponse) return auth;

  try {
    const { rooms } = await req.json();

    if (!Array.isArray(rooms)) {
      return NextResponse.json({ error: 'Invalid rooms format' }, { status: 400 });
    }
    if (rooms.length > 200) {
      return NextResponse.json({ error: 'Too many rooms' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Update sort_order for each room
    for (let i = 0; i < rooms.length; i++) {
      const roomId = rooms[i]?.id;
      if (typeof roomId !== 'string' || !roomId) continue;

      const { error } = await supabase
        .from('operating_rooms')
        .update({ sort_order: i })
        .eq('id', roomId);

      if (error) {
        console.error('[rooms/reorder] Error updating room order:', error);
        return NextResponse.json(
          { error: 'Failed to update room order' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[rooms/reorder] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
