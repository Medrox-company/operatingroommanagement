/**
 * Tisk z izolovaného plánovače (Rozpis operativy).
 *
 * Plánovač běží v rámci s neprůhledným původem a sám nové okno naplnit nemůže.
 * Pošle proto hotový tiskový dokument a aplikace ho zobrazí ve vlastním okně.
 * Obsah pochází z izolovaného rámce, a tak se před zápisem vyčistí: zmizí
 * skripty, obsluhy událostí, vložené rámce, odkazy javascript: a externí
 * zdroje, a dokument dostane politiku, která spouštění skriptů zakazuje.
 */

export const OPERATIVITY_PRINT_MAX_BYTES = 12_000_000;

export const OPERATIVITY_PRINT_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

const REMOVED_ELEMENTS = 'script,noscript,iframe,frame,frameset,object,embed,applet,link,meta,base,template,portal';
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster', 'background'];

/** Vrátí bezpečný samostatný HTML dokument pro tiskové okno. */
export function sanitizeOperativityPrintDocument(html: string, parser: DOMParser = new DOMParser()): string {
  if (typeof html !== 'string' || !html || html.length > OPERATIVITY_PRINT_MAX_BYTES) throw new Error('Neplatný tiskový dokument.');
  // DOMParser vytváří inertní dokument: skripty se nespustí, obrázky se nenačtou.
  const doc = parser.parseFromString(html, 'text/html');
  doc.querySelectorAll(REMOVED_ELEMENTS).forEach(element => element.remove());
  doc.querySelectorAll('*').forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc') {
        element.removeAttribute(attribute.name);
      } else if (URL_ATTRIBUTES.includes(name) && !(value.startsWith('data:image/') || value.startsWith('#'))) {
        // Tisková stránka nic nenačítá ze sítě a nikam nenaviguje.
        element.removeAttribute(attribute.name);
      } else if (name === 'style' && /url\s*\(|expression\s*\(/i.test(attribute.value) && !/url\s*\(\s*["']?data:image\//i.test(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
  });
  const head = doc.head;
  const charset = doc.createElement('meta');
  charset.setAttribute('charset', 'utf-8');
  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', OPERATIVITY_PRINT_CSP);
  // Politika musí v hlavičce předcházet stylům i obsahu.
  head.prepend(charset, csp);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

/**
 * Otevře tiskovou stránku a spustí dialog tisku (v něm lze zvolit „Uložit jako PDF“).
 * Vrací false, pokud prohlížeč nové okno zablokoval.
 */
export function openOperativityPrintWindow(html: string): boolean {
  const safe = sanitizeOperativityPrintDocument(html);
  const preview = window.open('', '_blank');
  if (!preview) return false;
  preview.opener = null;
  preview.document.open();
  preview.document.write(safe);
  preview.document.close();
  const print = () => {
    if (preview.closed) return;
    try { preview.print(); } catch { /* Uživatel může použít tlačítko na stránce nebo tisk z nabídky prohlížeče. */ }
  };
  preview.document.querySelector('[data-print-action="print"]')?.addEventListener('click', print);
  preview.document.querySelector('[data-print-action="close"]')?.addEventListener('click', () => preview.close());
  // Před tiskem musí být rozvržení i vložené obrázky (např. snímek 3D modelu) hotové.
  const imagesReady = Array.from(preview.document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  }));
  void Promise.all(imagesReady).then(() => {
    if (!preview.closed) preview.requestAnimationFrame(() => {
      if (!preview.closed) preview.requestAnimationFrame(print);
    });
  });
  return true;
}

/**
 * Náhradní cesta, když prohlížeč nové okno zablokuje: stejný vyčištěný
 * dokument se vytiskne ze skrytého rámce v aktuální stránce.
 */
export function printOperativityDocumentInFrame(html: string): void {
  const safe = sanitizeOperativityPrintDocument(html);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Rámec nesmí mít display:none, některé prohlížeče by pak tiskly prázdnou stránku.
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  let removed = false;
  const remove = () => { if (!removed) { removed = true; frame.remove(); } };
  frame.addEventListener('load', () => {
    const view = frame.contentWindow;
    if (!view) { remove(); return; }
    view.addEventListener('afterprint', () => window.setTimeout(remove, 0), { once: true });
    // Pojistka pro prohlížeče, které afterprint nevyvolají.
    window.setTimeout(remove, 120_000);
    view.focus();
    view.print();
  }, { once: true });
  frame.srcdoc = safe;
  document.body.append(frame);
}
