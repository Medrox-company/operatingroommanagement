import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export-data?userEmail=...
 *
 * Vyexportuje celou aplikační databázi do JSON souboru, který lze později
 * použít pro obnovu přes /api/admin/import-data.
 *
 * Bezpečnost:
 *  - požaduje service role key (server-side)
 *  - pokud je zadaný userEmail, ověří, že jde o aktivního admina
 *  - citlivá pole (password_hash) jsou z exportu odstraněna
 */

// Pořadí tabulek — při importu se insertuje ve stejném pořadí (FK-safe).
const EXPORT_TABLES = [
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
  'app_users',
] as const;

// Sloupce, které se z vybraných tabulek při exportu vynechávají (citlivá data).
const STRIPPED_COLUMNS: Record<string, string[]> = {
  app_users: ['password_hash', 'password'],
};

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase není správně nakonfigurován (chybí service role klíč)' },
      { status: 500 }
    );
  }

  const userEmail = req.nextUrl.searchParams.get('userEmail');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

  const tables: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  let totalRows = 0;

  for (const table of EXPORT_TABLES) {
    const { data, error } = await admin.from(table).select('*');
    if (error) {
      // Tabulka může neexistovat — zaznamenáme, ale export nepadne
      errors[table] = error.message;
      tables[table] = [];
      continue;
    }
    const rows = data ?? [];
    const strip = STRIPPED_COLUMNS[table];
    const cleaned = strip
      ? rows.map((row: Record<string, unknown>) => {
          const copy = { ...row };
          for (const col of strip) delete copy[col];
          return copy;
        })
      : rows;
    tables[table] = cleaned;
    totalRows += cleaned.length;
  }

  const facilityRow = (tables.app_settings?.[0] ?? {}) as Record<string, unknown>;

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: userEmail ?? 'unknown',
    facility: {
      name: facilityRow.facility_name ?? null,
      ico: facilityRow.facility_ico ?? null,
    },
    meta: {
      tableCount: EXPORT_TABLES.length,
      totalRows,
      errors,
    },
    tables,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const facilitySlug =
    typeof facilityRow.facility_name === 'string' && facilityRow.facility_name
      ? String(facilityRow.facility_name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : 'nemocnice';
  const filename = `or-backup_${facilitySlug}_${timestamp}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
