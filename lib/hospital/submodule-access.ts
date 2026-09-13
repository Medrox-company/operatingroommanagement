import { NextResponse } from 'next/server';
import type { SessionPayload } from '../auth/session';
import { isSuperAdminRole } from '../auth/roles';
import { getSupabaseAdmin } from '../supabase-server';
import type { HospitalAccess } from './access';

/**
 * Serverová autorizační brána pro chráněné části Nastavení systému.
 * Viditelnost záložky v Reactu je pouze UX; service-role endpoint musí stejné
 * oprávnění ověřit z autoritativních tenantových řádků v databázi.
 */
export async function requireSubmoduleAccess(
  access: HospitalAccess,
  submoduleId: string,
): Promise<HospitalAccess | NextResponse> {
  if (isSuperAdminRole(access.user.role)) return access;

  try {
    const admin = getSupabaseAdmin();
    const { data: submodule, error: submoduleError } = await admin
      .from('app_submodules')
      .select('module_id,is_enabled,allowed_roles')
      .eq('id', submoduleId)
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();

    if (submoduleError) throw submoduleError;
    if (!submodule || submodule.is_enabled === false || !hasRole(submodule.allowed_roles, access.user)) {
      return forbidden();
    }

    const { data: module, error: moduleError } = await admin
      .from('app_modules')
      .select('is_enabled,allowed_roles')
      .eq('id', submodule.module_id)
      .eq('hospital_id', access.hospitalId)
      .maybeSingle();

    if (moduleError) throw moduleError;
    if (!module || module.is_enabled === false || !hasRole(module.allowed_roles, access.user)) {
      return forbidden();
    }

    return access;
  } catch {
    return NextResponse.json(
      { error: 'Oprávnění k části nastavení se nepodařilo ověřit.' },
      { status: 503 },
    );
  }
}

function hasRole(allowedRoles: unknown, user: SessionPayload): boolean {
  return Array.isArray(allowedRoles) && allowedRoles.includes(user.role);
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: 'K této části nastavení nemáte přidělený přístup.' },
    { status: 403 },
  );
}
