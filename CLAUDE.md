@AGENTS.md

# OPERATINGROOM — kontext projektu

Systém řízení operačních sálů. Next.js 16 (App Router, Turbopack), React 19,
TypeScript, Tailwind v4, Supabase (Postgres + RLS + realtime), mobilní obal
přes Capacitor. Provoz na operatingroom.eu. **Jazyk kódu i rozhraní: čeština**
— komentáře, popisky i commity česky.

## Pravidla, která platí vždy

- **Jen reálná data z databáze.** Žádné vymyšlené hodnoty, žádné nuly místo
  chybějících měření. Když data nejsou, řekni to v rozhraní.
- **Přiřazení personálu se čte z databáze**, ne z lokální paměti.
- **SQL skripty se nespouštějí.** Připrav je do `scripts/`, spuštění je na
  uživateli — zásah do živé databáze je totéž co nasazení.
- **Nenasazovat bez výslovného pokynu.** Práce probíhá na větvi.

## Spouštění

```bash
# Node 16 ze systému je příliš starý. Vždy:
export PATH="$HOME/.nvm/versions/node/v22.13.0/bin:$PATH"

npx tsc --noEmit -p tsconfig.json      # typová kontrola
node --test "tests/**/*.test.js"       # sada testů (403 testů)
npm run build                          # nutné před nasazením
```

`npm run build` **nelze spustit v izolovaném Linuxu agenta** — chybí síť pro
stažení `@next/swc-linux-arm64-gnu`. Vizuální a běhové ověření musí udělat
uživatel u sebe. Netvrdit, že něco „funguje", na základě samotné typové kontroly.

## Testy mají neobvyklý tvar — čtou zdrojový kód

Sada nepoužívá Jest ani Vitest. Testy načtou `.tsx` soubor, přeloží ho
TypeScriptem a spustí vybrané funkce, nebo kontrolují zdrojový text regulárními
výrazy. Důsledky:

- **Přesun kódu mezi soubory testy rozbije.** Testy jmenovitě vytahují
  deklarace (`handlePrint`, `resolveReport`, `tabLabelMap`…) a očekávají CSS
  třídy (`timeline-commandbar`, `timeline-scheduler-shell`) v konkrétním
  souboru. Po refaktoru je nutné testy upravit společně s kódem.
- **Atrapy mají seznam povolených závislostí.** Nový import do komponenty
  shodí test hláškou `Unexpected dependency`. Doplň ho do atrapy.
- **14 testů selhává dlouhodobě.** Tvrdí věci o rozvržení, které bylo záměrně
  změněno (zrušené hledání sálu v mobilu, ikony akcí nahrazené dlouhým
  stiskem, jiný token pozadí). Nejsou to vady aplikace.

**Před tvrzením „nezpůsobil jsem regresi" porovnej s `main`:** pusť sadu na
`main` ve worktree a odečti selhání. Absolutní počet sám o sobě nic neříká.

## Stav repozitáře a nasazení

- Práce běží na větvi `zlepseni/rychle-vyhry`, nic nepushnuto.
- Lokální `main` je **napřed proti produkci** o stovky commitů. Poslední
  produkční nasazení Vercelu (projekt `operatingroom`) je na commitu
  `225e9b2a` z konce července — automatické nasazení z `main` zřejmě neběží.
  Před jakýmkoli pushem to ověřit, nespoléhat na „push do main = nasazení".
- Agent **nemá přístup k GitHubu** (izolovaná síť, žádné credentials). Push
  a merge dělá uživatel.
- `output/` a `tmp/` jsou generované soubory — necommitovat.

## Nespuštěné skripty

| skript | co dělá |
|---|---|
| `scripts/add-operational-thresholds.sql` | sloupce pro provozní prahy; bez něj jedou výchozí hodnoty a panel hlásí upozornění |
| `scripts/cleanup-anesthesiologist-column.sql` | odstranění `anesthesiologist_id`; **až po nasazení** verze, která ho nečte |
| `scripts/check-schedules-usage.sql` | pouze čtení — ověří, jestli se rozpis sálů plní |

## Domluvená rozhodnutí

- **Anesteziolog a lékař jsou tatáž role.** Platné pole je `doctor_id`.
  Sloupec `anesthesiologist_id` je pozůstatek vývoje, aplikace ho už nečte
  ani do něj nezapisuje; jména v něm jsou zastaralá.
- Statistiky mají devět záložek a jsou obsahově bohaté. Chybí **manažerský
  pohled**: cíle a skóre proti nim, srovnání sálů s kvartily, přesahy
  pracovní doby, teplotní mapa, skladba odborností, úplnost dat.
- Design statistik dnes stylují tři nezávislé systémy (`shared.tsx`,
  `AppCharts.tsx`, `performance-tab.css`). Sjednotit na jednu vrstvu tokenů
  a sadu primitivů.

## Mrtvý kód (nikdo neimportuje)

`lib/statistics-helpers.ts`, `components/EmailTemplate.tsx`,
`hooks/useEmailNotifications.ts`, `hooks/useWorkflowStatuses.ts`,
`lib/designTokens.ts`, `components/FitGrid.tsx`,
`lib/realtime-notifications.ts`, `components/timeline/StatBox.tsx`,
`components/TopBar.tsx`, `hooks/useRealtimeSubscription.ts`,
`components/AnimatedCounter.tsx`, `components/ShiftScheduleManager.tsx`.
Část vypadá jako rozdělaná funkcionalita — před smazáním se zeptat.

## Přístupnost

Rozhraní se čte z provozní vzdálenosti. Kontrast textu minimálně 4,5:1
(nad černou to znamená bílou s krytím alespoň 50 %), písmo nejméně 9 px,
zásahové plochy 44 px.
