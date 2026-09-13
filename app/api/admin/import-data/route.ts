import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { requireHospitalIdAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { isSuperAdminRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';

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
  'spatial_projects',
  'notifications_log',
  'safety_checklists',
  'operating_procedures',
  'room_status_history',
  'shift_schedules',
  'schedules',
  'equipment',
  'patients',
  'procedures',
  'devices',
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
  'app_submodules',
  'spatial_projects',
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

const COMPOSITE_TENANT_ID_TABLES = new Set<string>([
  'app_modules',
  'app_submodules',
  'workflow_statuses',
  'spatial_projects',
]);

const SUPERADMIN_CONFIGURATION_TABLES = new Set<string>([
  'app_modules',
  'app_submodules',
]);

const LEGACY_HOSPITAL_FIELDS = [
  'hospital_name',
  'hospital_short_name',
  'hospital_address',
  'hospital_city',
  'hospital_zip',
  'hospital_country',
  'hospital_ico',
  'hospital_contact_phone',
  'hospital_contact_email',
  'hospital_notes',
] as const;

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult.user;
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase není správně nakonfigurován (chybí service role klíč)' },
      { status: 500 }
    );
  }

  let body: {
    confirmation?: string;
    hospitalId?: string;
    backup?: { version?: string; tables?: Record<string, unknown[]> };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const { confirmation, backup } = body;
  const hospitalId = body.hospitalId || '';
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(hospitalId)) {
    return NextResponse.json({ error: 'Neplatné zařízení' }, { status: 400 });
  }
  const hospitalAccess = await requireHospitalIdAccess(sessionUser, hospitalId);
  if (hospitalAccess instanceof NextResponse) return hospitalAccess;
  const submoduleAccess = await requireSubmoduleAccess(hospitalAccess, 'settings.database');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;

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

  const admin = getSupabaseAdmin();

  // Většina starších tabulek má globálně unikátní `id`. Bez této kontroly by
  // service-role upsert dovolil záloze nemocnice A přepsat stejně pojmenovaný
  // řádek nemocnice B a změnit mu hospital_id. Kontrola musí proběhnout před
  // prvním mazáním, aby chybná záloha nezanechala částečně vyčištěná data.
  for (const table of INSERT_ORDER) {
    if (COMPOSITE_TENANT_ID_TABLES.has(table)) continue;
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const ids = Array.from(new Set(
      (rows as Record<string, unknown>[])
        .map(row => row && typeof row === 'object' ? row.id : null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ));
    if (ids.length !== rows.length) {
      return NextResponse.json(
        { error: `Záloha obsahuje neplatný nebo duplicitní identifikátor v tabulce ${table}.` },
        { status: 400 },
      );
    }

    for (let offset = 0; offset < ids.length; offset += 200) {
      const { data: existingRows, error } = await admin
        .from(table)
        .select('id,hospital_id')
        .in('id', ids.slice(offset, offset + 200));
      if (error) {
        return NextResponse.json({ error: `Kontrola importu selhala: ${error.message}` }, { status: 500 });
      }
      if ((existingRows || []).some(row => row.hospital_id !== hospitalId)) {
        return NextResponse.json(
          { error: `Záloha obsahuje identifikátor patřící jinému zařízení (${table}).` },
          { status: 409 },
        );
      }
    }
  }

  const wipeCounts: Record<string, number | string> = {};
  const insertCounts: Record<string, number | string> = {};

  // 1) Vyčisti tabulky
  for (const table of WIPE_ORDER) {
    const { error, count } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .eq('hospital_id', hospitalId);
    if (error) {
      wipeCounts[table] = `ERROR: ${error.message}`;
    } else {
      wipeCounts[table] = count ?? 0;
    }
  }

  // 2) Naimportuj data (upsert s onConflict=id pro zachování ID)
  for (const table of INSERT_ORDER) {
    if (!isSuperAdminRole(sessionUser.role) && SUPERADMIN_CONFIGURATION_TABLES.has(table)) {
      insertCounts[table] = 'PŘESKOČENO: spravuje pouze superadministrátor';
      continue;
    }
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      insertCounts[table] = 0;
      continue;
    }

    const scopedRows = (rows as Record<string, unknown>[]).map(row => {
      const sanitized = { ...row };
      if (table === 'app_settings') {
        for (const field of LEGACY_HOSPITAL_FIELDS) delete sanitized[field];
      }
      return { ...sanitized, hospital_id: hospitalId };
    });
    const conflictColumns = table === 'spatial_projects'
      ? 'hospital_id'
      : table === 'app_modules' || table === 'app_submodules' || table === 'workflow_statuses'
        ? 'id,hospital_id'
        : 'id';
    const { error, count } = await admin
      .from(table)
      .upsert(scopedRows as never[], { onConflict: conflictColumns, count: 'exact' });
    if (error) {
      insertCounts[table] = `ERROR: ${error.message}`;
    } else {
      insertCounts[table] = count ?? rows.length;
    }
  }

  return NextResponse.json({
    success: true,
    version: backup.version ?? 'unknown',
    performedBy: sessionUser.email,
    timestamp: new Date().toISOString(),
    wiped: wipeCounts,
    inserted: insertCounts,
  });
}
