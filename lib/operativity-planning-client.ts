import type { OperativityPlanningAllocation, OperativityPlanningDepartment } from './operativity-planning';

/** Read every page; the database's default 1,000 row limit is not a complete annual plan. */
export async function loadOperativityPlanningYear(year: number, signal: AbortSignal, request: typeof fetch = fetch) {
  const allocations: OperativityPlanningAllocation[] = [];
  let departments: OperativityPlanningDepartment[] = [];
  const seenIds = new Set<string>();
  let offset = 0;
  for (let page = 0; page < 100; page++) {
    signal.throwIfAborted();
    const response = await request(`/api/room-specialty-allocations?year=${year}&offset=${offset}`, {
      signal, cache: 'no-store', credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      // migrationRequired říká, že v databázi chybí tabulky rozpisu (migrace 14–16).
      throw Object.assign(new Error(payload?.error || 'Roční rozpis se nepodařilo načíst.'), { migrationRequired: payload?.migrationRequired === true });
    }
    if (!Array.isArray(payload?.allocations) || !Array.isArray(payload?.departments)) throw new Error('Server vrátil neplatné podklady rozpisu.');
    // Stránky se čtou z živé tabulky: po souběžné změně se tentýž řádek může
    // objevit na dvou stránkách. Započte se jednou, jinak by se blok zdvojil.
    for (const allocation of payload.allocations) {
      if (typeof allocation?.id === 'string') {
        if (seenIds.has(allocation.id)) continue;
        seenIds.add(allocation.id);
      }
      allocations.push(allocation);
    }
    if (page === 0) departments = payload.departments;
    if (payload.nextOffset === null || (payload.nextOffset === undefined && payload.allocations.length < 1000)) {
      return { allocations, departments };
    }
    if (!Number.isSafeInteger(payload.nextOffset) || payload.nextOffset <= offset) {
      throw new Error('Server neposkytl úplný roční rozpis. Obnovte aplikaci a zkuste načtení znovu.');
    }
    offset = payload.nextOffset;
  }
  throw new Error('Roční rozpis je příliš velký pro bezpečné načtení. Zmenšete plánované období.');
}
