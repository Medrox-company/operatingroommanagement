"use client";

import {
  DocSection,
  DocSubsection,
  DocCard,
  DocCode,
  DocBadge,
  DocNotice,
} from "../DocPrimitives";

export function Section09UserGuide() {
  return (
    <DocSection
      id="navod"
      number="09"
      title="Návod k používání"
      subtitle="Krok-za-krokem průvodce běžnými scénáři pro každou roli."
    >
      <DocSubsection number="9.1" title="Přihlášení do systému">
        <ol
          className="space-y-2 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            Otevřete URL aplikace v prohlížeči. Pokud nejste přihlášení,
            zobrazí se <DocCode>LoginPage</DocCode>.
          </li>
          <li>
            Klikněte na <DocBadge tone="accent">Přihlášení do systému</DocBadge>{" "}
            a zadejte e-mail a heslo.
          </li>
          <li>
            Po úspěšném přihlášení se zobrazí Dashboard s gridem všech
            sálů a vaše dostupné moduly v levé Sidebar liště.
          </li>
        </ol>
        <DocNotice type="tip" title="Demo tlačítka">
          Tlačítka „Demo“ na LoginPage automaticky předvyplní přihlašovací
          údaje pro každou roli. Slouží pro rychlé testování — v produkci je doporučeno
          tato tlačítka skrýt přes feature flag.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="9.2" title="Spuštění operace">
        <ol
          className="space-y-2 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            Klikněte na kartu volného sálu (status <DocBadge tone="ok">FREE</DocBadge>).
          </li>
          <li>
            V detailu sálu klikněte <DocBadge tone="accent">Začít přípravu</DocBadge>.
            Status se změní na <DocBadge tone="info">PREPARATION</DocBadge>.
          </li>
          <li>
            Vyplňte typ operace, vyberte tým ze <DocCode>StaffPickerModal</DocCode>{" "}
            a doplňte ID pacienta.
          </li>
          <li>
            Po dokončení přípravy klikněte <DocBadge tone="accent">Začít operaci</DocBadge>{" "}
            — spustí se časomíra a status přejde na <DocBadge tone="accent">IN OPERATION</DocBadge>.
          </li>
          <li>
            Po skončení zákroku klikněte <DocBadge tone="purple">Dokončit</DocBadge>.
            Záznam se uloží do <DocCode>operations_log</DocCode>, sál
            přechází do stavu <DocBadge tone="purple">CLEANING</DocBadge>.
          </li>
          <li>
            Po dokončení úklidu klikněte <DocBadge tone="ok">Hotovo</DocBadge>.
            Sál je opět <DocBadge tone="ok">FREE</DocBadge>.
          </li>
        </ol>
      </DocSubsection>

      <DocSubsection number="9.3" title="Akutní zákrok (Emergency)">
        <DocNotice type="err" title="Použití pouze v naléhavých případech">
          V detailu sálu klikněte <DocBadge tone="err">EMERGENCY</DocBadge>.
          Systém ihned přehraje audio alert pro všechny otevřené tab y
          aplikace, vytvoří notifikaci pro role <DocBadge tone="info">aro</DocBadge>{" "}
          <DocBadge tone="purple">cos</DocBadge> a (volitelně) odešle SMS/e-mail.
        </DocNotice>
      </DocSubsection>

      <DocSubsection number="9.4" title="Plánování směn">
        <ol
          className="space-y-2 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            Otevřete modul <DocBadge tone="accent">Rozvrh směn</DocBadge>.
          </li>
          <li>
            Vyberte týden v záhlaví. Levý sloupec ukazuje seznam personálu,
            mřížka pak dny týdne.
          </li>
          <li>
            Přetáhněte zaměstnance ze seznamu do buňky. V modálu zvolte
            typ směny (ranní / odpolední / noční).
          </li>
          <li>
            Při ukládání aplikace volá <DocCode>POST /api/staff/[id]/shifts</DocCode>{" "}
            — záznam vznikne v <DocCode>shift_schedules</DocCode>.
          </li>
        </ol>
      </DocSubsection>

      <DocSubsection number="9.5" title="Reorder operačních sálů">
        <DocCard>
          <p
            className="text-sm leading-relaxed mb-3"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            (admin only) V <DocBadge tone="accent">Admin → Operační sály</DocBadge>:
          </p>
          <ol
            className="space-y-1.5 text-sm list-decimal list-outside ml-5"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            <li>
              Klikněte a držte ikonu <DocCode>≡</DocCode> u sálu.
            </li>
            <li>Přetáhněte sál na novou pozici.</li>
            <li>
              Pořadí se automaticky uloží přes{" "}
              <DocCode>POST /api/operating-rooms/reorder</DocCode> a
              propaguje na všechny ostatní uživatele přes Realtime.
            </li>
          </ol>
        </DocCard>
      </DocSubsection>

      <DocSubsection number="9.6" title="Správa uživatelů (admin)">
        <ol
          className="space-y-2 text-sm list-decimal list-outside ml-5 leading-relaxed"
          style={{ color: "rgba(255,255,255,0.85)" }}
        >
          <li>
            Otevřete <DocBadge tone="accent">Admin → Správa uživatelů</DocBadge>.
          </li>
          <li>
            Tlačítkem <DocBadge tone="ok">Přidat uživatele</DocBadge> vyplníte
            email, jméno, roli a počáteční heslo (bcrypt hash se vygeneruje serverside).
          </li>
          <li>
            Pro deaktivaci stačí přepnout <DocCode>is_active</DocCode> na{" "}
            <DocCode>false</DocCode> — neaktivní uživatelé se nemohou přihlásit.
          </li>
        </ol>
      </DocSubsection>

      <DocSubsection number="9.7" title="Stažení této dokumentace jako PDF">
        <DocCard accent>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            V hlavičce této stránky je tlačítko{" "}
            <DocBadge tone="accent">Stáhnout PDF</DocBadge>. Při kliknutí
            se celý obsah dokumentace vyrenderuje do A4 stránek, sjednotí
            se design a stáhne soubor{" "}
            <DocCode>operating-room-manager-docs.pdf</DocCode>.
          </p>
          <p
            className="mt-3 text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Alternativně můžete použít klávesovou zkratku{" "}
            <DocCode>Ctrl + P</DocCode> (resp. <DocCode>⌘ + P</DocCode>) a
            v dialogu prohlížeče zvolit „Uložit jako PDF“. Print CSS pravidla
            jsou předem připravená pro čistý vzhled bez navigace.
          </p>
        </DocCard>
      </DocSubsection>
    </DocSection>
  );
}
