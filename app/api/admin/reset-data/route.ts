import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * POST /api/admin/reset-data
 *
 * Body: { mode: 'operational' | 'full', confirmation: string, userEmail: string }
 *
 * mode:
 *   - 'operational' — smaže pouze provozní/sesbíraná data:
 *       operating_rooms (pouze runtime stav se vyresetuje), room_status_history,
 *       schedules, shift_schedules, notifications_log, equipment.
 *       Zachová se: staff, departments, sub_departments, workflow_statuses,
 *       management_contacts, app_users, app_modules, app_settings.
 *   - 'full' — smaže všechna data kromě účtů (app_users), modulů (app_modules)
 *       a nastavení aplikace (app_settings). Vhodné pro nasazení do jiného zařízení.
 *
 * Bezpečnost:
 *   - vyžaduje service role key (server-side)
 *   - vyžaduje potvrzovací text "SMAZAT DATA"
 *   - zaznamená identitu volajícího (userEmail) — pro budoucí audit log
 */
export async function POST(req: NextRequest) {
  // AuthN/AuthZ — pouze přihlášený admin (ze session cookie)
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult.user;

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Supabase není správně nakonfigurován (chybí service role klíč)' },
      { status: 500 }
    );
  }

  let body: { mode?: string; confirmation?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku' }, { status: 400 });
  }

  const { mode, confirmation } = body;

  if (confirmation !== 'SMAZAT DATA') {
    return NextResponse.json(
      { error: 'Nesprávný potvrzovací text. Pro smazání zadejte přesně: SMAZAT DATA' },
      { status: 400 }
    );
  }

  if (mode !== 'operational' && mode !== 'full') {
    return NextResponse.json(
      { error: 'Neplatný režim. Očekáváno: operational nebo full' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const deletedCounts: Record<string, number | string> = {};

  // Pomocná funkce — smaže všechny řádky z tabulky a vrátí počet
  const wipeTable = async (table: string) => {
    // delete s "neq" proti fiktivní hodnotě smaže všechny řádky
    const { error, count } = await admin
      .from(table)
      .delete({ count: 'exact' })
      .not('id', 'is', null);
    if (error) {
      deletedCounts[table] = `ERROR: ${error.message}`;
    } else {
      deletedCounts[table] = count ?? 0;
    }
  };

  // Pořadí mazání — od "listových" tabulek k rodičovským, kvůli FK vazbám.
  // 1) Historie a logy (závislé na operating_rooms)
  await wipeTable('room_status_history');
  await wipeTable('notifications_log');
  // 2) Rozpisy a směny
  await wipeTable('shift_schedules');
  await wipeTable('schedules');
  // 3) Vybavení
  await wipeTable('equipment');

  if (mode === 'full') {
    // V režimu 'full' smažeme i konfigurační tabulky (personál, oddělení, workflow).
    await wipeTable('sub_departments');
    await wipeTable('departments');
    await wipeTable('staff');
    await wipeTable('management_contacts');
    await wipeTable('workflow_statuses');
    // operating_rooms se smažou kompletně — budou se znovu nakonfigurovat.
    await wipeTable('operating_rooms');
  } else {
    // V režimu 'operational' zachováme operační sály, jen vyresetujeme jejich runtime stav.
    const { error: resetErr, count: resetCount } = await admin
      .from('operating_rooms')
      .update(
        {
          current_step_index: 0,
          status: 'free',
          current_patient_id: null,
          current_procedure_id: null,
          is_emergency: false,
          is_locked: false,
          is_paused: false,
          is_septic: false,
          queue_count: 0,
          operations_24h: 0,
          patient_called_at: null,
          patient_arrived_at: null,
          operation_started_at: null,
          phase_started_at: null,
          estimated_end_time: null,
          status_history: [],
          completed_operations: [],
          updated_at: new Date().toISOString(),
        },
        { count: 'exact' }
      )
      .not('id', 'is', null);
    if (resetErr) {
      deletedCounts['operating_rooms_reset'] = `ERROR: ${resetErr.message}`;
    } else {
      deletedCounts['operating_rooms_reset'] = resetCount ?? 0;
    }
  }

  return NextResponse.json({
    success: true,
    mode,
    performedBy: sessionUser.email,
    timestamp: new Date().toISOString(),
    deleted: deletedCounts,
  });
}
