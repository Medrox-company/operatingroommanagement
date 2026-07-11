import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  'patients',
  'procedures',
  'management_contacts',
  'operating_rooms',
  'operating_procedures',
  'safety_checklists',
  'equipment',
  'schedules',
  'shift_schedules',
  'room_status_history',
  'notifications_log',
  'devices',
] as const;

// Sloupce, které se z vybraných tabulek při exportu vynechávají (citlivá data).
const STRIPPED_COLUMNS: Record<string, string[]> = {
  app_users: ['password_hash', 'password'],
};

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult.user;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase není správně nakonfigurován (chybí service role klíč)' },
      { status: 500 }
    );
  }

  const admin = getSupabaseAdmin();
  const hospitalId = new URL(request.url).searchParams.get('hospitalId') || '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(hospitalId)) {
    return NextResponse.json({ error: 'Neplatné zařízení' }, { status: 400 });
  }

  const tables: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  let totalRows = 0;

  for (const table of EXPORT_TABLES) {
    const { data, error } = await admin.from(table).select('*').eq('hospital_id', hospitalId);
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

  const { data: hospitalData } = await admin.from('hospitals').select('*').eq('id', hospitalId).single();
  const hospitalRow = (hospitalData ?? {}) as Record<string, unknown>;

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    exportedBy: sessionUser.email,
    hospital: {
      name: hospitalRow.hospital_name ?? null,
      ico: hospitalRow.hospital_ico ?? null,
    },
    meta: {
      tableCount: EXPORT_TABLES.length,
      totalRows,
      errors,
    },
    tables,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const hospitalSlug =
    typeof hospitalRow.hospital_name === 'string' && hospitalRow.hospital_name
      ? String(hospitalRow.hospital_name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      : 'nemocnice';
  const filename = `or-backup_${hospitalSlug}_${timestamp}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
