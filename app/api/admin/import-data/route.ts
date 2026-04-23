import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/import-data
 *
 * Body: {
 *   confirmation: 'OBNOVIT DATA',
 *   userEmail: string,
 *   backup: { version, exportedAt, tables: { [name]: Row[] } },
 * }
 *
 * Smaže aktuální obsah tabulek a naimportuje obsah ze zálohy.
 * Účty (app_users) se NIKDY nepřepisují — aby se administrátor nevyřadil.
 */

// Wipe pořadí — od listů ke kořenům kvůli FK
const WIPE_ORDER = [
  'notifications_log',
  'room_status_history',
  'shift_schedules',
  'schedules',
  'equipment',
  'operating_rooms',
  'management_contacts',
  'staff',
  'sub_departments',
  'departments',
  'workflow_statuses',
  // app_modules, app_settings, app_users se nemažou kompletně, jen upsertují
] as const;

// Insert pořadí — od kořenů k listům
const INSERT_ORDER = [
  'app_settings',
  'app_modules',
  'workflow_statuses',
  'departments',
  'sub_departments',
  'staff',
  'management_contacts',
  'operating_rooms',
  'equipment',
  'schedules',
  'shift_schedules',
  'room_status_history',
  'notifications_log',
] as const;

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase není správně nakonfigurován (chybí service role klíč)' },
      { status: 500 }
    );
  }

  let body: {
    confirmation?: string;
    userEmail?: string;
    backup?: { version?: string; tables?: Record<string, unknown[]> };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const { confirmation, userEmail, backup } = body;

  if (confirmation !== 'OBNOVIT DATA') {
    return NextResponse.json(
      { error: 'Nesprávný potvrzovací text. Pro obnovu zadejte přesně: OBNOVIT DATA' },
      { status: 400 }
    );
  }

  if (!backup || !backup.tables || typeof backup.tables !== 'object') {
    return NextResponse.json(
      { error: 'Neplatný formát zálohy — chybí pole "tables".' },
      { status: 400 }
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ověř, že volající je admin
  if (userEmail) {
    const { data: userRow } = await admin
      .from('app_users')
      .select('role, is_active')
      .eq('email', userEmail)
      .maybeSingle();
    if (!userRow || userRow.role !== 'admin' || !userRow.is_active) {
      return NextResponse.json(
        { error: 'Akce je povolena pouze pro aktivního administrátora' },
        { status: 403 }
      );
    }
  }

  const wipeCounts: Record<string, number | string> = {};
  const insertCounts: Record<string, number | string> = {};

  // 1) Vyčisti tabulky
  for (const table of WIPE_ORDER) {
    const { error, count } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .not('id', 'is', null);
    if (error) {
      wipeCounts[table] = `ERROR: ${error.message}`;
    } else {
      wipeCounts[table] = count ?? 0;
    }
  }

  // 2) Naimportuj data (upsert s onConflict=id pro zachování ID)
  for (const table of INSERT_ORDER) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      insertCounts[table] = 0;
      continue;
    }

    const { error, count } = await admin
      .from(table)
      .upsert(rows as never[], { onConflict: 'id', count: 'exact' });
    if (error) {
      insertCounts[table] = `ERROR: ${error.message}`;
    } else {
      insertCounts[table] = count ?? rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    version: backup.version ?? 'unknown',
    performedBy: userEmail ?? 'unknown',
    timestamp: new Date().toISOString(),
    wiped: wipeCounts,
    inserted: insertCounts,
  });
}
