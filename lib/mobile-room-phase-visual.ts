export type MobileRoomPhaseVisualKind =
  | 'ready'
  | 'preparation'
  | 'arrival'
  | 'anesthesia'
  | 'anesthesia-end'
  | 'surgery'
  | 'surgery-end'
  | 'departure'
  | 'handover'
  | 'cleaning'
  | 'documentation'
  | 'unknown';

export type MobileRoomPhaseVisualStatus = Readonly<{
  name?: string | null;
  title?: string | null;
  color?: string | null;
  accent_color?: string | null;
}>;

const NEUTRAL_PHASE_COLOR = '#7890A8';

function normalizePhaseName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-\u2010-\u2015]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function phaseKind(value: string | null | undefined): MobileRoomPhaseVisualKind {
  const name = normalizePhaseName(value);
  if (!name) return 'unknown';

  // A specific ending must win over its generic procedure/anesthesia word.
  if (/^(?:(?:ukonceni|konec|dokonceni) (?:chirurgickeho |operacniho )?vykonu|(?:surgery|surgical procedure|operation) (?:end|ended|complete|completed)|(?:end|completion) of (?:surgery|surgical procedure|operation))(?:\b|$)/.test(name)) return 'surgery-end';
  if (/^(?:(?:ukonceni|konec|dokonceni) anestezie|an(?:a)?esthesia (?:end|ended|complete|completed)|(?:end|completion) of an(?:a)?esthesia)(?:\b|$)/.test(name)) return 'anesthesia-end';

  // Ready-after-cleaning is still a ready room, not an active cleaning phase.
  if (/^(?:(?:operacni )?sal (?:je )?pripraven(?:y)?|pripraven(?:y)? (?:operacni )?sal|ready(?: room)?|(?:operating )?room (?:is )?ready)(?:\b|$)/.test(name)) return 'ready';
  if (/^(?:(?:priprava|chystani) (?:operacniho )?salu|(?:operating )?room preparation|preparation of (?:the )?(?:operating )?room)(?:\b|$)/.test(name)) return 'preparation';
  if (/^(?:(?:prijezd|prijem|prichod)(?: pacienta)?(?: na (?:operacni )?sal)?|(?:patient )?(?:arrival|admission)(?: to (?:the )?(?:(?:operating )?room|or))?)(?:\b|$)/.test(name)) return 'arrival';
  if (/^(?:(?:zacatek|zahajeni) anestezie|anestezie|an(?:a)?esthesia(?: start)?|start of an(?:a)?esthesia)(?:\b|$)/.test(name)) return 'anesthesia';
  if (/^(?:(?:chirurgicky|operacni) vykon|(?:zacatek|zahajeni) (?:chirurgickeho|operacniho) vykonu|surgery|surgical procedure|operation|start of (?:surgery|surgical procedure|operation))(?:\b|$)/.test(name)) return 'surgery';
  if (/^(?:(?:odjezd|odvoz)(?: pacienta)?(?: (?:ze|z) (?:operacniho )?salu)?|(?:patient )?departure|patient discharge)(?:\b|$)/.test(name)) return 'departure';
  if (/^(?:predani(?: pacienta)?|(?:patient )?(?:handover|hand over|transfer of care))(?:\b|$)/.test(name)) return 'handover';
  if (/^(?:uklid(?: salu)?|zahajeni uklidu|dezinfekce(?: salu)?|cisteni(?: salu)?|cleaning|(?:operating )?room cleaning|disinfection)(?:\b|$)/.test(name)) return 'cleaning';
  if (/^(?:(?:zaverecna )?dokumentace|(?:final )?documentation|clinical records)(?:\b|$)/.test(name)) return 'documentation';
  return 'unknown';
}

function configuredHexColor(value: string | null | undefined): string | undefined {
  const color = value?.trim();
  // CSS hexadecimal notation, including shorthand and optional alpha. Reject
  // other CSS tokens so an invalid setting cannot erase the neutral fallback.
  return color && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
    ? color
    : undefined;
}

/** Presentation only: never infer a phase from its UUID, index or room flags. */
export function mobileRoomPhaseVisual(status?: MobileRoomPhaseVisualStatus | null): {
  kind: MobileRoomPhaseVisualKind;
  color: string;
} {
  const titleKind = phaseKind(status?.title);
  return {
    kind: titleKind === 'unknown' ? phaseKind(status?.name) : titleKind,
    color: configuredHexColor(status?.accent_color)
      ?? configuredHexColor(status?.color)
      ?? NEUTRAL_PHASE_COLOR,
  };
}
