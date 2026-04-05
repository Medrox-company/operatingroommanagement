import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { rooms } = await req.json();

    if (!Array.isArray(rooms)) {
      return NextResponse.json(
        { error: 'Invalid rooms format' },
        { status: 400 }
      );
    }

    // Update sort_order for each room
    for (let i = 0; i < rooms.length; i++) {
      const { error } = await supabase
        .from('operating_rooms')
        .update({ sort_order: i })
        .eq('id', rooms[i].id);

      if (error) {
        console.error('Error updating room order:', error);
        return NextResponse.json(
          { error: 'Failed to update room order' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in reorder endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
