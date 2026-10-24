/** The planning workspace shares its shell with the host; the source only owns views. */
export const OPERATIVITY_NAVIGATION = [
  { id: 'operations', label: 'Provoz', items: [
    { id: 'home', label: 'Přehled', icon: 'home' },
    { id: 'kal', label: 'Kalendář provozu', icon: 'calendar' },
    { id: 'map', label: 'Operační sály 3D', icon: 'cube' },
    { id: 'mine', label: 'Pohled oboru', icon: 'specialty' },
    { id: 'timeline', label: 'Časová osa', icon: 'timeline' },
  ] },
  { id: 'planning', label: 'Plánování', items: [
    { id: 'rooms', label: 'Sály a skupiny', icon: 'rooms' },
    { id: 'requests', label: 'Požadavky oborů', icon: 'requests' },
    { id: 'free', label: 'Volné kapacity', icon: 'capacity' },
    { id: 'plan', label: 'Návrh obsazení', icon: 'requests' },
    { id: 'blocks', label: 'Omezení sálů', icon: 'restriction' },
    { id: 'asanace', label: 'Návrh asanací', icon: 'hygiene' },
  ] },
  { id: 'reports', label: 'Přehledy', items: [
    { id: 'occ', label: 'Obsazenost sálů', icon: 'chart' },
    { id: 'quota', label: 'Kvóty oborů', icon: 'target' },
    { id: 'wait', label: 'Čekací listiny', icon: 'wait' },
    { id: 'staff', label: 'Personál', icon: 'staff' },
    { id: 'calendar', label: 'Svátky a prázdniny', icon: 'calendar' },
    { id: 'alerts', label: 'Upozornění', icon: 'alerts' },
  ] },
  { id: 'administration', label: 'Systém', items: [
    { id: 'data', label: 'Verze a záloha', icon: 'backup' },
    { id: 'pub', label: 'Zveřejnění návrhu', icon: 'publish' },
  ] },
] as const;

export type OperativityView = typeof OPERATIVITY_NAVIGATION[number]['items'][number]['id'];
const VIEWS = new Set<string>(OPERATIVITY_NAVIGATION.flatMap(group => group.items.map(item => item.id)));

export function isOperativityView(value: unknown): value is OperativityView {
  return typeof value === 'string' && VIEWS.has(value);
}

/** Discard unknown IDs from the child's permission-aware navigation report. */
export function operativityAllowedViews(value: unknown): OperativityView[] {
  return Array.isArray(value) ? [...new Set(value.filter(isOperativityView))] : [];
}

export function operativityFrameHeight(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(100_000, Math.max(240, Math.ceil(value))) : null;
}
