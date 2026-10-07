/**
 * Akutní operační výkony — doménová logika.
 *
 * Čisté funkce bez Reactu a bez databáze. Druhý krok nahradí paměťové úložiště
 * tabulkou, tenhle soubor se tím nezmění.
 *
 * Dvě zásady, které drží celý modul:
 *
 * 1. Systém prioritu ZAZNAMENÁVÁ, nepočítá ji a nenavrhuje. Stupeň zadává
 *    žádající oddělení. Pořadí určuje člověk. Aplikace hlídá jen to, co umí
 *    hlídat bezpečně — uplynulé okno a fakt, že někdo pořadí změnil.
 *    (docs/MDR_COMPLIANCE.md: software „neposkytuje terapeutická doporučení".)
 *
 * 2. Klinický stupeň a provozní pořadí jsou dvě různé věci. Stupeň říká, jak
 *    akutní výkon je. Pořadí říká, v jakém sledu se na sál doopravdy půjde —
 *    a legitimně se od stupně liší, když je sál obsazený nebo chybí vybavení.
 */

/** Stupně podle doby, kterou výkon snese do sálu. */
export type AcuteUrgency = 'neodkladny' | 'urgentni' | 'odkladny';

export interface UrgencyLevel {
  id: AcuteUrgency;
  /** Název v rozhraní. */
  label: string;
  /** Co stupeň znamená — zobrazuje se u výběru, aby se stupně nepletly. */
  meaning: string;
  /** Výchozí okno do sálu v minutách; zařízení si ho nastaví vlastní. */
  defaultWindowMinutes: number;
  color: string;
}

/**
 * Názvosloví záměrně odpovídá české chirurgické praxi, ne anglickým kalkům:
 * „neodkladný" místo „emergentní", „odkladný" místo „odložitelný".
 * České zdroje se v pojmech „urgentní" a „akutní" rozcházejí, proto u každého
 * stupně stojí časové okno — to je definice, slovo je jen zkratka.
 */
/* Barvy odpovídají paletě aplikace (components/statistics/statistics-theme.ts):
   červená / oranžová / akcentová. Žádné vlastní odstíny. */
export const URGENCY_LEVELS: readonly UrgencyLevel[] = [
  {
    id: 'neodkladny',
    label: 'Neodkladný',
    meaning: 'Vitální indikace — přímé ohrožení života nebo končetiny. Jde se ihned.',
    defaultWindowMinutes: 30,
    color: '#EF4444',
  },
  {
    id: 'urgentni',
    label: 'Urgentní',
    meaning: 'Nesnese odklad do dalšího dne. Řádově hodiny.',
    defaultWindowMinutes: 360,
    color: '#F97316',
  },
  {
    id: 'odkladny',
    label: 'Odkladný',
    meaning: 'Musí proběhnout, ale vejde se do programu. Desítky hodin.',
    defaultWindowMinutes: 1440,
    color: '#06B6D4',
  },
] as const;

export type UrgencyWindows = Record<AcuteUrgency, number>;

export const DEFAULT_URGENCY_WINDOWS: UrgencyWindows = {
  neodkladny: 30,
  urgentni: 360,
  odkladny: 1440,
};

export function urgencyLevel(id: AcuteUrgency): UrgencyLevel {
  return URGENCY_LEVELS.find(level => level.id === id) ?? URGENCY_LEVELS[1];
}

/** Čím nižší číslo, tím akutnější. Slouží jen k řazení, ne k rozhodování. */
export function urgencyRank(id: AcuteUrgency): number {
  const index = URGENCY_LEVELS.findIndex(level => level.id === id);
  return index === -1 ? URGENCY_LEVELS.length : index;
}

/** Stav požadavku v jeho cestě na sál. */
export type AcuteState = 'zadan' | 'prevzat' | 'probiha' | 'dokoncen' | 'zrusen' | 'presunut';

/** Důvody posunu pořadí. Jedno kliknutí, ne volný text — jinak to nikdo nevyplní. */
export const MOVE_REASONS = [
  { id: 'sal-obsazen', label: 'Sál obsazen' },
  { id: 'personal', label: 'Personál' },
  { id: 'vybaveni', label: 'Vybavení / instrumentárium' },
  { id: 'krevni-derivaty', label: 'Krevní deriváty' },
  { id: 'pacient-nepripraven', label: 'Pacient nepřipraven' },
  { id: 'zmena-stupne', label: 'Změna stupně' },
  { id: 'jine', label: 'Jiné' },
] as const;

export type MoveReasonId = (typeof MOVE_REASONS)[number]['id'];

export function moveReasonLabel(id: MoveReasonId | undefined): string {
  return MOVE_REASONS.find(reason => reason.id === id)?.label ?? 'Neuvedeno';
}

export interface AcuteRequest {
  id: string;
  urgency: AcuteUrgency;
  /** Typ výkonu. Bez údajů o pacientovi — ty mají vlastní pole. */
  procedure: string;
  /** Žádající oddělení; odkaz do nastavených oddělení zařízení. */
  departmentId: string;
  /**
   * Z pacienta se ukládá jen příjmení a oddělení, kde leží. Žádné jméno,
   * rodné číslo ani diagnóza — ani k zobrazení, ani do databáze.
   */
  patientSurname: string;
  patientWard: string;
  estimatedMinutes: number;
  createdAt: string;
  state: AcuteState;
  /** Sál, který požadavek převzal. */
  roomId?: string | null;
  /** Předpokládaný začátek po převzetí — podklad pro obrys v časové ose. */
  plannedStartAt?: string | null;
  /** Poznámka pro sál (septický výkon, potřeba ARO lůžka apod.). */
  note?: string;
  /** Pořadí v provozní frontě. Nižší číslo jde dřív. */
  order: number;
  /** Stopa po ručním posunu — bez ní by nebylo poznat, že pořadí někdo změnil. */
  move?: {
    reason: MoveReasonId;
    /** Pozice, na které požadavek stál před posunem (1 = první). */
    fromPosition: number;
    toPosition: number;
    at: string;
  };
}

/** Požadavky, které ještě čekají na sál. */
export function isWaiting(request: AcuteRequest): boolean {
  return request.state === 'zadan';
}

/** Požadavky, které jsou ve hře — čekají nebo už mají sál. */
export function isOpen(request: AcuteRequest): boolean {
  return request.state === 'zadan' || request.state === 'prevzat' || request.state === 'probiha';
}

/**
 * Klinické řazení: podle stupně, pak podle času zadání.
 * Tohle NENÍ doporučené pořadí — je to referenční sled, proti kterému se pozná,
 * že provozní pořadí je jiné.
 */
export function clinicalOrder(requests: AcuteRequest[]): AcuteRequest[] {
  return [...requests].sort((a, b) => {
    const rank = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (rank !== 0) return rank;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

/** Provozní řazení — to, podle kterého se doopravdy jde na sál. */
export function operationalOrder(requests: AcuteRequest[]): AcuteRequest[] {
  return [...requests].sort((a, b) => a.order - b.order);
}

/**
 * Odchyluje se provozní pořadí od klinického? Vrací posun v pozicích:
 * kladné číslo = požadavek stojí dál, než by podle stupně stál.
 */
export function clinicalDrift(requests: AcuteRequest[], id: string): number {
  const clinical = clinicalOrder(requests).findIndex(request => request.id === id);
  const operational = operationalOrder(requests).findIndex(request => request.id === id);
  if (clinical === -1 || operational === -1) return 0;
  return operational - clinical;
}

export type WindowStatus = 'v-okne' | 'krati-se' | 'vyprselo';

export interface WindowState {
  status: WindowStatus;
  /** Zbývající minuty; negativní číslo znamená přesah. */
  remainingMinutes: number;
  deadlineMs: number;
}

/**
 * Stav okna do sálu. Poslední čtvrtina okna se hlásí jako „krátí se" —
 * ne jako alarm, jen jako tichý stav. Při šesti souběžných požadavcích by
 * odpočty s výstrahami vytvořily šum, ve kterém zmizí to podstatné.
 */
export function windowState(
  request: AcuteRequest,
  windows: UrgencyWindows = DEFAULT_URGENCY_WINDOWS,
  nowMs: number = Date.now(),
): WindowState {
  const minutes = windows[request.urgency] ?? urgencyLevel(request.urgency).defaultWindowMinutes;
  const deadlineMs = Date.parse(request.createdAt) + minutes * 60_000;
  const remainingMinutes = Math.round((deadlineMs - nowMs) / 60_000);
  const status: WindowStatus = remainingMinutes < 0
    ? 'vyprselo'
    : remainingMinutes <= minutes * 0.25
      ? 'krati-se'
      : 'v-okne';
  return { status, remainingMinutes, deadlineMs };
}

/** Jak dlouho požadavek čeká, v minutách. */
export function waitingMinutes(request: AcuteRequest, nowMs: number = Date.now()): number {
  return Math.max(0, Math.round((nowMs - Date.parse(request.createdAt)) / 60_000));
}

/** Pořadí nových požadavků navazuje za stávající frontu. */
export function nextOrder(requests: AcuteRequest[]): number {
  return requests.reduce((max, request) => Math.max(max, request.order), 0) + 1;
}

/**
 * Přesune požadavek na danou pozici v provozní frontě a zapíše stopu.
 *
 * Pořadí se přečísluje od jedničky, aby nevznikaly mezery. Stopa si drží
 * pozici PŘED posunem — tím zůstává dohledatelné, odkud se požadavek pohnul,
 * i když se fronta mezitím přečísluje.
 */
export function moveRequest(
  requests: AcuteRequest[],
  id: string,
  toPosition: number,
  reason: MoveReasonId,
  at: string = new Date().toISOString(),
): AcuteRequest[] {
  const queue = operationalOrder(requests);
  const fromIndex = queue.findIndex(request => request.id === id);
  if (fromIndex === -1) return requests;

  const target = Math.min(Math.max(toPosition - 1, 0), queue.length - 1);
  if (target === fromIndex) return requests;

  const [moved] = queue.splice(fromIndex, 1);
  queue.splice(target, 0, moved);

  return queue.map((request, index) => {
    const order = index + 1;
    if (request.id !== id) return { ...request, order };
    return {
      ...request,
      order,
      move: { reason, fromPosition: fromIndex + 1, toPosition: order, at },
    };
  });
}

/** Změna stupně je klinické rozhodnutí — vyžaduje důvod a je vidět. */
export function setUrgency(
  requests: AcuteRequest[],
  id: string,
  urgency: AcuteUrgency,
  at: string = new Date().toISOString(),
): AcuteRequest[] {
  return requests.map(request => (
    request.id === id
      ? { ...request, urgency, move: { reason: 'zmena-stupne' as MoveReasonId, fromPosition: request.order, toPosition: request.order, at } }
      : request
  ));
}

/** Souhrn pro pruh na dashboardu a pro hlavičku modulu. */
export interface AcuteSummary {
  waiting: number;
  byUrgency: Record<AcuteUrgency, number>;
  /** Počet požadavků s vypršelým oknem. */
  overdue: number;
  /** Nejbližší konec okna; null, když fronta nečeká. */
  nextDeadlineMs: number | null;
}

export function summarize(
  requests: AcuteRequest[],
  windows: UrgencyWindows = DEFAULT_URGENCY_WINDOWS,
  nowMs: number = Date.now(),
): AcuteSummary {
  const waiting = requests.filter(isWaiting);
  const byUrgency = { neodkladny: 0, urgentni: 0, odkladny: 0 } as Record<AcuteUrgency, number>;
  let overdue = 0;
  let nextDeadlineMs: number | null = null;

  for (const request of waiting) {
    byUrgency[request.urgency] += 1;
    const state = windowState(request, windows, nowMs);
    if (state.status === 'vyprselo') overdue += 1;
    else if (nextDeadlineMs === null || state.deadlineMs < nextDeadlineMs) nextDeadlineMs = state.deadlineMs;
  }

  return { waiting: waiting.length, byUrgency, overdue, nextDeadlineMs };
}

/** Formát trvání pro rozhraní: do hodiny minuty, výš hodiny a minuty. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.abs(Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
