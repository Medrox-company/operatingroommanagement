import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdmin, requireSession } from '../auth/server';
import type { SessionPayload } from '../auth/session';
import { getSupabaseAdmin } from '../supabase-server';
import { getRequestHospitalId } from './request';

interface HospitalAccessOptions {
  adminOnly?: boolean;
}

export interface HospitalAccess {
  user: SessionPayload;
  hospitalId: string;
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

  try {
    const admin = getSupabaseAdmin();
    if (auth.user.role === 'admin') {
      const { data: hospital, error } = await admin
        .from('hospitals')
        .select('id')
        .eq('id', hospitalId)
        .maybeSingle();
      if (error) throw error;
      if (!hospital) {
        return NextResponse.json({ error: 'Zdravotnické zařízení neexistuje.' }, { status: 404 });
      }
      return { user: auth.user, hospitalId };
    }

    const { data: membership, error } = await admin
      .from('hospital_user_memberships')
      .select('user_id')
      .eq('user_id', auth.user.sub)
      .eq('hospital_id', hospitalId)
      .maybeSingle();
    if (error) throw error;
    if (!membership) {
      return NextResponse.json(
        { error: 'K tomuto zdravotnickému zařízení nemáte přístup.' },
        { status: 403 },
      );
    }
    return { user: auth.user, hospitalId };
  } catch {
    return NextResponse.json(
      { error: 'Oprávnění ke zdravotnickému zařízení se nepodařilo ověřit.' },
      { status: 503 },
    );
  }
}
