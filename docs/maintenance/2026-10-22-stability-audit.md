# Kontrola stability a bezpečný úklid — 22. 10. 2026

## Závěr

Webové i mobilní webové sestavení prochází. Opraveny byly konkrétní chyby historie kalendáře, klávesových zkratek a časové osy. Offline testy: **1 222 úspěšných z 1 225**. Aplikaci zatím nelze označit za plně ověřenou pro vydání: zbývají tři mobilní UI rozpory, nefunkční lint příkaz, bezpečnostní aktualizace Next.js a ověření databázových/nativních scénářů.

Práce proběhla na existující větvi `medrox_op_room_ver_0_2`, bez commitu, nasazení, migrací nebo zápisů do klinických dat. Rozpracované uživatelské změny, design, barvy stavů a navigace byly zachovány.

## Provedené opravy

- `components/CalendarManager.tsx`: undo/redo nyní výměnou snapshotů obnovuje skutečný stav buněk, řádků a speciálních dnů. Nová editace po undo správně zahodí redo větev.
- Klávesové zkratky kalendáře ignorují textová pole, contenteditable, IME, již zpracované události a nesouvisející modifikátory. Delete při psaní již nemaže označené buňky kalendáře. Listener pracuje s aktuálními callbacky; doplněno Cmd/Ctrl+Shift+Z.
- `components/timeline/TimelineRoomRow.tsx`: projekce aktuálního cyklu a náhradní začátek používají předaný `currentTime`, nikoli nezávislé systémové hodiny při renderování.
- Přidáno sedm regresních testů kalendáře a dva časové osy. Před opravami byly relevantní regrese červené, po opravách zelené. Nezávislá kontrola těchto změn nezjistila další konkrétní regresi.
- Čtyři zastaralé testy upraveny pro existující strukturu UI: CSS mock orbitu, vnořený přístupný popisek, centralizovaná kontrola oprávnění navigace a stávající CSS scope stavů. Zbývající tři rozpory nebyly potlačeny.
- Přidán opakovatelný příkaz `npm run typecheck` bez vytváření inkrementální cache.
- Odstraněn pouze chybný kruhový symlink `node_modules/node_modules`, který odkazoval zpět do nadřazeného `node_modules`. Obsah závislostí nebyl tímto krokem smazán; `npm ls --depth=0` nyní končí úspěšně.

Kontrola podle pravidel React se zaměřila na závislosti callbacků, úklid event listeneru a deterministický čas při renderování. Nevedla k plošnému přepisování komponent.

## Úklid a obnova

Do dočasné obnovitelné zálohy `/private/tmp/medrox-cleanup-20261022.pdw21d` bylo přesunuto 20 ověřených cílů, obsahujících 1 132 souborů o logické velikosti 812 884 775 bajtů (cca 775 MiB). Šlo o generované cache, Android build výstupy a metadata Finderu, nikoli zdrojový kód.

**Jde o přesun mimo projekt, ne o uvolnění stejného množství místa na disku.** Záloha stále zabírá místo a systém může obsah `/private/tmp` časem odstranit. Není to dlouhodobý archiv.

Přesunuté relativní cesty, zachované i v záloze:

```text
.next/cache/webpack
android/app/build
android/.gradle
android/build
output/acute-vite-cache
.DS_Store
android/.DS_Store
android/app/.DS_Store
android/app/src/main/assets/public/images/.DS_Store
app/.DS_Store
components/.DS_Store
docs/app-store/.DS_Store
ios/.DS_Store
ios/App/.DS_Store
ios/App/App/public/images/.DS_Store
lib/.DS_Store
mobile-dist/images/.DS_Store
output/.DS_Store
public/images/.DS_Store
tsconfig.tsbuildinfo
```

Obnova: při zastaveném příslušném nástroji vrátit jen požadovanou cestu ze zálohy na stejné místo v projektu. Pokud již vznikla nová cache stejného jména, nepřepisovat ji naslepo; cache lze také nechat znovu vytvořit sestavením.

Zachovány: aktivní `.next/dev`, používaná iOS DerivedData, skutečné Git worktrees, dokumentace/designové reference, release archivy a `.ipa`, zdrojové obrázky, mobilní distribuční obsah a nativní assets. Další soubory nebyly mazány jen na základě chybějícího přímého importu.

## Ověření po opravách

| Kontrola | Výsledek |
| --- | --- |
| `npm run typecheck` | Úspěšná |
| `npm run build` na Node 26.5.0 | Úspěšná, 26 generovaných stránek |
| Mobilní Vite build do odděleného `/private/tmp/medrox-mobile-validation-final-20261022` | Úspěšný, 3 161 modulů; bez přepsání `mobile-dist` a bez Capacitor sync |
| Zaměřené testy kalendáře, tisku a timeline | 32/32 úspěšných |
| Kompletní offline sada | 121 souborů, 1 225 testů: 1 222 pass, 3 fail, 0 skipped |
| `npm ls --depth=0` | Úspěšné, závislosti vyřešeny |
| `git diff --check` | Bez chyb |
| Stávající lokální aplikace | Načteny přehled, timeline, statistiky a detail sálu; pouze čtení/navigace |
| Bez přihlášení přes HTTP | `/`, `/privacy`, `/support` vrací 200; `/api/rooms` vrací 401 |
| Kontrola e-mailových tajemství při sestavení | Prošla; nejde o audit celé historie Gitu |

Vite upozorňuje na chunk `equipment-assets` cca 645 kB a na kombinovaný statický/dynamický import `google-client`. Sestavení to neblokuje; optimalizace bundle je samostatná práce.

Aktivní prostředí používá Node 26.5.0, zatímco `.nvmrc` uvádí 22.13.0. Kontrola typů prošla i na dostupném Node 22.13.0. Jeho produkční build se však zastavil bez dalšího výstupu a byl po více než šesti minutách ukončen; **úspěšný Node 22 build není doložen**. Příčina nebyla určena. Uživatelský dev server nebyl zastaven.

### Zbývající tři UI testy

- `tests/dashboard/mobile-header.test.js`: existující implementace skrývá přepínač designu a vynucuje Cliniq; test a projektové instrukce očekávají volitelný design. Vyřešit podle požadovaného chování, ne odstraněním testu.
- `tests/dashboard/mobile-ios-shell.test.js`: test očekává vyhledávací pole v přehledu a jeho minimální velikost písma; aktuální přehled toto pole neobsahuje. Nejdříve sjednotit požadavek a implementaci.
- `tests/dashboard/mobile-room-orbit.test.js`: uživatelské rozpracované CSS dovoluje zalamování uvnitř slov, test je zakazuje. Záměr návrhu je třeba rozhodnout bez přepsání rozpracovaných úprav.

Pět integračních testů vyžaduje skutečnou databázi a nebylo spuštěno bez oddělené testovací instance: `tests/email/database.test.js`, `tests/acute/backend-database.test.js`, `tests/acute/cycle-links-backend-database.test.js`, `tests/operating-rooms/allocation-tenant-database.test.js`, `tests/statistics/history-integrity-database.test.js`. Nativní iOS/Android buildy a kompletní klinické end-to-end scénáře nebyly ověřeny.

Reprodukce offline testů:

```sh
node --input-type=module -e 'import {readdirSync} from "node:fs"; import {spawnSync} from "node:child_process"; const files=readdirSync("tests",{recursive:true}).filter(p=>p.endsWith(".test.js")&&!p.endsWith("database.test.js")).map(p=>"tests/"+p).sort(); const r=spawnSync(process.execPath,["--test","--test-concurrency=2",...files],{stdio:"inherit"}); process.exitCode=r.status??1;'
```

## Bezpečnost a dostupné aktualizace

Stav registry/auditu ověřen k 22. 10. 2026. Závěrečný `npm audit --json` hlásí **čtyři zasažené balíčky: jeden kritický a tři moderate**. Nejde o čtyři nezávislé exploity ani důkaz napadení této aplikace.

1. **Priorita: Next.js 16.3.8 → 16.4.2.** Nainstalovaná verze spadá do rozsahů hlášení pro cache, optimalizaci SVG a Server Actions. Nejstarší opravená verze těchto hlášení je 16.4.1; audit nabízí 16.4.2. V kontrolovaném kódu nebyly nalezeny příslušné direktivy `use cache`/`use server`; to není náhrada aktualizace ani úplný důkaz neovlivnitelnosti. [Oficiální cache advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [SVG advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [release 16.4.2](https://github.com/vercel/next.js/releases/tag/v16.4.2).
2. Tři moderate balíčky tvoří vývojový řetězec `@capacitor/cli → xcode → uuid`. CLI 8.5.3 je aktuální; audit navrhuje downgrade, nikoli bezpečný jednoduchý upgrade. Nepoužit `npm audit fix --force` ani neověřený major override UUID. Kontrolované volání xcode používá UUID v4, nikoli v3/v5/v6 z [hlášení](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
3. **Lint vyžaduje samostatné zprovoznění.** `npm run lint` stále volá `next lint`, odstraněný v Next 16. Zkušební ESLint 9/Next konfigurace odhalila další statické problémy, ale ESLint 9 je již nepodporovaný. ESLint 10 s parserem dodávaným Next 16.3.8 skončil chybou `scopeManager.addGlobals is not a function`; přidání Next lint konfigurace také přineslo další auditový nález. Tento pokus byl celý vrácen, nové lint závislosti ani konfigurace nezůstaly. Nejde o úspěšně provedený lint. [Oficiální přechod na ESLint CLI](https://nextjs.org/docs/app/api-reference/config/eslint).

Další ověřené aktualizace, zatím neinstalované:

| Oblast | Nainstalováno → dostupné |
| --- | --- |
| React / React DOM / React Is | 19.2.8 → 19.3.1, aktualizovat společně |
| Capacitor Android / Core / iOS | 8.5.2 → 8.5.3 |
| Capacitor App / Browser / Keyboard / Status Bar | 8.1.1 → 8.1.2 / 8.0.4 → 8.0.5 / 8.0.5 → 8.0.6 / 8.0.3 → 8.0.4 |
| Vite / PostCSS | 8.3.3 → 8.3.5 / 8.5.29 → 8.5.31 |
| Supabase JS / Resend / React Email Render | 2.117.3 → 2.118.0 / 6.32.1 → 6.34.1 / 2.1.0 → 2.1.1 |
| Framer Motion / Lucide / Tailwind Merge | 14.1.0 → 14.6.0 / 1.33.0 → 1.61.0 / 3.6.0 → 3.7.0 |
| Radix Dialog / Dropdown / Tooltip | 1.1.23 → 1.3.1 / 2.1.24 → 2.2.1 / 1.2.16 → 1.4.1 |
| Three / typy Three | 0.180.0 → 0.186.1 / 0.180.0 → 0.186.0; vyžaduje kontrolu 3D modulů |
| TypeScript | 5.8.3 → 7.0.2; zásadní upgrade, ne součást automatického úklidu |

Aktualizace frameworku čeká na schválení zaslané během auditu. `package-lock.json` je po kontrole nezměněný; žádný frameworkový upgrade nebyl ponechán. Před vydáním postupovat: Next aktualizace a testy → kompatibilní lint → sjednocení tří UI požadavků → ověřený LTS Node → oddělená databázová a nativní QA. Nepovažovat úspěšný build za úplnou záruku klinické nebo bezpečnostní správnosti.
