'use client';

/**
 * Bezpečnostní klíč (passkey) jako druhý krok ověření.
 *
 * Klíč leží v telefonu, správci hesel nebo přímo v počítači. Místo opisování
 * šestimístného čísla stačí otisk, obličej nebo naskenování QR kódu, který
 * vykreslí sám prohlížeč. Aplikace do té výměny nevstupuje — jen předá
 * prohlížeči výzvu ze Supabase a vrátí podepsanou odpověď.
 */

export interface RelyingParty {
  rpId: string;
  rpOrigins: string[];
}

/**
 * Doména, ke které jsou klíče kryptograficky vázané.
 *
 * Aplikace běží na operatingroom.eu i www.operatingroom.eu. Kdyby se rpId
 * odvozovalo z aktuální adresy, klíč zaregistrovaný na jedné z nich by na
 * druhé nefungoval. Proto se vždy použije doména bez www a obě adresy se
 * uvedou jako povolené origins.
 *
 * Tuhle hodnotu není možné později měnit — změna zneplatní všechny existující
 * klíče a uživatelé si musí zaregistrovat nové.
 */
export function getRelyingParty(): RelyingParty {
  const host = window.location.hostname;

  // Vývoj: WebAuthn povoluje nezabezpečené spojení jen na loopbacku.
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return { rpId: host, rpOrigins: [window.location.origin] };
  }

  const base = host.startsWith('www.') ? host.slice(4) : host;
  return { rpId: base, rpOrigins: [`https://${base}`, `https://www.${base}`] };
}

/** Umí prohlížeč bezpečnostní klíče? Starší a exotické prohlížeče ne. */
export function browserSupportsSecurityKey(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential === 'function' &&
    typeof navigator?.credentials?.create === 'function'
  );
}

const UNAVAILABLE_KEY = 'orm-security-keys-unavailable';

/**
 * Rozpozná, že bezpečnostní klíče nejsou v projektu Supabase zapnuté.
 * Není to selhání uživatele — nemá smysl mu to hlásit jako chybu.
 */
export function isKeyFeatureDisabled(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? '';
  return (
    code === 'mfa_webauthn_enroll_not_enabled' ||
    message.includes('mfa_webauthn_enroll_not_enabled') ||
    message.toLowerCase().includes('disabled for webauthn')
  );
}

/** Ať se nabídka klíče neopakuje při každém přihlášení, když ji nejde přijmout. */
export function rememberKeysUnavailable(): void {
  try {
    window.localStorage.setItem(UNAVAILABLE_KEY, '1');
  } catch {
    // Prohlížeč může mít lokální úložiště zakázané — nabídka se prostě zopakuje.
  }
}

export function areKeysKnownUnavailable(): boolean {
  try {
    return window.localStorage.getItem(UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Přeloží chyby z WebAuthn do věty, která uživateli něco řekne.
 * Prohlížeč většinu odmítnutí hlásí jako NotAllowedError bez rozlišení,
 * jestli uživatel zrušil dialog, nebo vypršel čas.
 */
export function describeSecurityKeyError(error: unknown): string {
  const name = (error as { name?: string } | null)?.name;
  const message = (error as { message?: string } | null)?.message ?? '';

  if (name === 'NotAllowedError') {
    return 'Ověření klíčem bylo zrušeno nebo vypršel čas. Zkuste to prosím znovu.';
  }
  if (name === 'InvalidStateError') {
    return 'Tento klíč už je k účtu zaregistrovaný.';
  }
  if (name === 'SecurityError') {
    return 'Prohlížeč odmítl klíč pro tuto adresu. Přihlaste se prosím přes operatingroom.eu.';
  }
  if (message.toLowerCase().includes('webauthn')) {
    return 'Bezpečnostní klíč se nepodařilo ověřit. Zkuste to prosím znovu.';
  }
  return 'Ověření klíčem se nezdařilo. Použijte prosím kód z autentizační aplikace.';
}
