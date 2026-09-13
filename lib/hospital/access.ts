import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin, requireSession } from '../auth/server';
import type { SessionPayload } from '../auth/session';
import { getSupabaseAdmin } from '../supabase-server';
import { getRequestHospitalId } from './request';
import { hasGlobalHospitalAccess } from '../auth/roles';

interface HospitalAccessOptions {
  adminOnly?: boolean;
}

export interface HospitalAccess {
  user: SessionPayload;
  hospitalId: string;
}

/**
 * Ověří přístup již autentizovaného uživatele ke konkrétnímu tenantovi.
 * Používají ji i endpointy, které dostávají hospitalId v těle nebo query,
 * takže klientem dodané ID nikdy nestačí samo o sobě k service-role operaci.
 */
export async function requireHospitalIdAccess(
  user: SessionPayload,
  hospitalId: string,
): Promise<HospitalAccess | NextResponse> {
  try {
    const admin = getSupabaseAdmin();
    if (hasGlobalHospitalAccess(user.role)) {
      const { data: hospital, error } = await admin
        .from('hospitals')
        .select('id')
        .eq('id', hospitalId)
        .maybeSingle();
      if (error) throw error;
      if (!hospital) {
        return NextResponse.json({ error: 'Zdravotnické zařízení neexistuje.' }, { status: 404 });
      }
      return { user, hospitalId };
    }

    // Běžná role je po přihlášení připoutaná k jednomu zařízení. Členství v
    // dalším zařízení samo o sobě nesmí povolit přepnutí tenant kontextu bez
    // nového přihlášení do tohoto zařízení.
    if (!user.hospitalId || hospitalId !== user.hospitalId) {
      return NextResponse.json(
        { error: 'V této relaci nelze změnit zdravotnické zařízení.' },
        { status: 403 },
      );
    }

    const { data: membership, error } = await admin
      .from('hospital_user_memberships')
      .select('user_id')
      .eq('user_id', user.sub)
      .eq('hospital_id', hospitalId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) {
      return NextResponse.json(
        { error: 'K tomuto zdravotnickému zařízení nemáte přístup.' },
        { status: 403 },
      );
    }
    return { user, hospitalId };
  } catch {
    return NextResponse.json(
      { error: 'Oprávnění ke zdravotnickému zařízení se nepodařilo ověřit.' },
      { status: 503 },
    );
  }
}

/**
 * Jediná autorizační brána pro API pracující s nemocniční cookie.
 * Cookie určuje požadovaný tenant, ale oprávnění vždy znovu potvrzuje server.
 */
export async function requireHospitalAccess(
  request: NextRequest,
  options: HospitalAccessOptions = {},
): Promise<HospitalAccess | NextResponse> {
  const auth = options.adminOnly ? await requireAdmin() : await requireSession();
  if (auth instanceof NextResponse) return auth;

  const hospitalId = getRequestHospitalId(request);
  if (!hospitalId) {
    return NextResponse.json({ error: 'Zdravotnické zařízení není vybráno.' }, { status: 400 });
  }

  return requireHospitalIdAccess(auth.user, hospitalId);
}
