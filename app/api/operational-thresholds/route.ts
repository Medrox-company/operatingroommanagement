import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { requireHospitalAccess } from '@/lib/hospital/access';
import { requireSubmoduleAccess } from '@/lib/hospital/submodule-access';
import { assertSameOrigin } from '@/lib/auth/csrf';

export const runtime = 'nodejs';

/**
 * Provozní prahy upozornění — čtení a uložení.
 *
 * Hodnoty žijí ve sloupcích tabulky `app_settings`. Dokud neproběhne migrace
 * scripts/add-operational-thresholds.sql, sloupce neexistují: čtení pak vrátí
 * výchozí hodnoty a uložení skončí srozumitelnou hláškou místo pádu.
 */
const COLUMNS = {
  shortPhaseMinutes: 'threshold_short_phase_minutes',
  cleaningWarningMinutes: 'threshold_cleaning_warning_minutes',
  rapidSurgeryMinutes: 'threshold_rapid_surgery_minutes',
  firstCaseGraceMinutes: 'threshold_first_case_grace_minutes',
} as const;

const DEFAULTS = {
  shortPhaseMinutes: 5,
  cleaningWarningMinutes: 30,
  rapidSurgeryMinutes: 5,
  firstCaseGraceMinutes: 15,
} as const;

type ThresholdKey = keyof typeof COLUMNS;

/** Mimo rozsah 1–240 minut jde skoro jistě o překlep; takovou hodnotu neuložíme. */
function sanitizeMinutes(value: unknown, fallback: number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) return fallback;
  return parsed;
}

function settingsId(hospitalId: string): string {
  return `${hospitalId}-global`;
}

export async function GET(request: NextRequest) {
  const access = await requireHospitalAccess(request);
  if (access instanceof NextResponse) return access;

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from('app_settings')
      .select('*')
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();

    const row = (data ?? {}) as Record<string, unknown>;
    const thresholds = Object.fromEntries(
      (Object.keys(COLUMNS) as ThresholdKey[]).map(key => [
        key,
        sanitizeMinutes(row[COLUMNS[key]], DEFAULTS[key]),
      ]),
    );
    // `configured` říká rozhraní, jestli už migrace proběhla.
    const configured = Object.values(COLUMNS).some(column => column in row);
    return NextResponse.json({ thresholds, configured });
  } catch (error) {
    console.error('[operational-thresholds] GET error:', error);
    return NextResponse.json({ thresholds: DEFAULTS, configured: false });
  }
}

export async function PUT(request: NextRequest) {
  const origin = assertSameOrigin(request);
  if (origin instanceof NextResponse) return origin;

  const access = await requireHospitalAccess(request, { adminOnly: true });
  if (access instanceof NextResponse) return access;
  const submoduleAccess = await requireSubmoduleAccess(access, 'settings.statuses');
  if (submoduleAccess instanceof NextResponse) return submoduleAccess;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný obsah požadavku.' }, { status: 400 });
  }

  const update = Object.fromEntries(
    (Object.keys(COLUMNS) as ThresholdKey[]).map(key => [
      COLUMNS[key],
      sanitizeMinutes(payload[key], DEFAULTS[key]),
    ]),
  );

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('app_settings')
      .update(update)
      .eq('hospital_id', access.hospitalId)
      .eq('id', settingsId(access.hospitalId));

    if (error) {
      // Chybějící sloupec = neproběhlá migrace. Chceme to říct nahlas.
      if (/column .* does not exist/i.test(error.message)) {
        return NextResponse.json(
          { error: 'Prahy zatím nejsou v databázi. Spusťte scripts/add-operational-thresholds.sql.' },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[operational-thresholds] PUT error:', error);
    return NextResponse.json({ error: 'Uložení prahů selhalo.' }, { status: 500 });
  }
}
