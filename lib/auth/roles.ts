/**
 * Role a jejich úrovně přístupu — sdílené mezi serverem i klientem.
 *
 * Hierarchie: superadmin > admin > ostatní role.
 *
 * `superadmin` vznikl přejmenováním původní role `user`
 * (viz scripts/11-superadmin-role.sql). Všude, kde se dosud kontrolovalo
 * `role === 'admin'`, musí projít i superadministrátor — jinak by měl nižší
 * oprávnění než administrátor, což je přesně naopak, než má být.
 */

export type AppRole = 'superadmin' | 'admin' | 'aro' | 'cos' | 'management' | 'primar';

/** Nejvyšší role — bez omezení, včetně správy oprávnění ostatních rolí. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'superadmin';
}

/**
 * Administrátorská úroveň a výš. Používat všude, kde dřív stálo
 * `role === 'admin'` — superadmin musí projít taky.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

/**
 * Role, které nejsou vázané na členství v konkrétní nemocnici — vidí a spravují
 * všechna zdravotnická zařízení.
 *
 * Od scripts/17 je to pouze superadministrátor. Administrátor se řídí členstvím
 * stejně jako provozní role, protože každá nemocnice má vlastního správce
 * s vlastním heslem. Nezaměňovat s `isAdminRole` — ta říká, kdo smí do
 * administrátorského rozhraní, ne ke kolika zařízením.
 */
export function hasGlobalHospitalAccess(role: string | null | undefined): boolean {
  return isSuperAdminRole(role);
}
