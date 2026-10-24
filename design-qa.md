## 2026-10-16 — Transparentní přihlašovací boxy

- Removed visible hospital labels (retained sr-only accessible names) and Vaše role text. Role tiles on both layouts now use12%-to6% translucent glass,6px blur, white icons/text; selected desktop tile remains translucent with selection outline. No auth, picker or layout changes.
- Isolated actual LoginPage browser QA390x844 confirms hidden headings and white22px glyphs; screenshot `/tmp/operatingroom-login-transparent.png`.22 targeted login tests pass; no real login/logout, preference or clinical changes.

---

## 2026-10-16 — Menší ikony přihlášení a vlastní nabídka zařízení

-22px role glyphs replace29px;32px holders,96px mobile tiles. Existing palette maintained. Replaced native OS hospital selects with shared-state Radix dropdown radio pickers (existing dependency), wrapping names, selected checkmark, bounded portal and54px rows. Login callbacks, canonical role emails, hospital loading/default and Google behavior unchanged. Did not reproduce a production native-picker failure or claim a proven root cause.
-30 focused auth/style tests and TypeScript pass. Diff-check clean.21st search unavailable; review retains palette guidance and pre-existing focus/motion findings. Tests adapt to actual radio-group changes, still exercise all original authentication paths with inert adapters.
- Actual LoginPage bundled with installed Next Webpack into a temporary isolated browser fixture: two synthetic hospitals, stubbed auth/native/Google and no production credentials. Verified click-open, second hospital selection updates trigger, checked item, automatic close, focus return and Escape.390x844 glyph measured22px;320x568 menu280px wide/right300px, no document overflow. Screenshots `/tmp/operatingroom-login-refined.png` and `/tmp/operatingroom-login-hospital-menu.png`. Existing signed-in tabs untouched; temporary server stopped. Native iOS device not exercised; no real sign-in or deployment.

---

## 2026-10-16 — Přihlášení přesněji podle detailu sálu

- Supersedes prior dashboard-like login tiles: use the actual RoomDetail action gradient, border, shadow,22px corners, centered navy glyphs and regular-weight labels. Remove separate circular icon backgrounds. Fields/secondary access use ARO low-alpha glass and inset shadow. No JSX/auth changes.
-20 focused login tests pass, including direct equality of five login/RoomDetail surface tokens. Diff-check clean;21st review palette infos only. Actual LoginPage isolated synthetic visual QA at390x844; screenshot `/tmp/operatingroom-login-room-detail.png`. No real credentials, sign-in/logout or clinical write.

---

## 2026-10-16 — Přihlášení v designu Orbit

- Added a scoped presentation stylesheet and class on both existing LoginPage shells. Reuses Orbit background asset, glass, lavender controls and circular icons; no auth logic, roles, API, stored preference or permission changes. Mobile fifth role spans the row. Desktop labels and leading field icons remain legible over glass.
-29 login tests pass: existing actual-component handler tests for all roles, hospital, failed login, reset, web/native Google plus new Orbit style contracts. TypeScript and diff-check pass.21st catalog unavailable; review only palette informational findings for the scoped stylesheet. No dependency or deployment.
- Visual QA renders the actual LoginPage with inert adapters, synthetic hospital and compiled actual CSS in a temporary localhost-only server, not a replacement app or real sign-in. Inspected390x844,320x568 and1280x800; no horizontal overflow, mobile password screen fits320x568. Screenshot `/tmp/operatingroom-login-orbit-mobile.png`. No user logout, credentials read, authentication submission or clinical write. Real signed-in user tabs untouched. Final desktop contrast tweaks covered by CSS review; initial desktop screenshot preceded those small tweaks.

---

## 2026-10-16 — Mobilní Nastavení jako Orbit mřížka

- Mobile landing always renders a two-column grid; carousel and switcher are absent, autoplay guarded. Desktop selection survives mobile/desktop resizing. Optional Cliniq styling reuses the accepted v3 artwork, continuous navy floor, glass at9px blur, lavender circle icons and segmented categories. Desktop KPI strip hidden only on mobile. Selected administration modules, permission checks and clinical callbacks unchanged. Hoisted the existing wrapper to preserve search focus while filtering.
-19 targeted tests passed (actual component rendering with permission/category/search/open/resize coverage, plus restoration/style contracts); TypeScript and diff-check passed.21st review: existing desktop motion warning and palette infos; fixed input focus-outline warning. Catalog lookup unavailable, reused existing project primitives/assets; no dependency added.
- Browser:390x844 and320x568 show12 permitted cards in two columns, no carousel or horizontal overflow;320px filter targets69.5x44px. Sequential typing Management retains input focus and filters to one card; Personál shows three.1100x800 restores desktop carousel with13 modules including desktop-only3D. No clinical writes, preference changes, build or deployment. Screenshot `/tmp/operatingroom-mobile-settings-grid.png`.

---

## 2026-10-16 — Stabilní výplň mobilních karet po odstranění přepínače motivu

- Found an equal-specificity collision between the Orbit glass card surface and legacy Cliniq `.m-dark` whole-card phase gradient. Added the actual overview root class to the existing Orbit surface selector so its neutral48/78% navy/lavender gradient,9px frosting, transparent border and no glow win regardless of CSS loading order. No dimensions, status logic, footer, theme preferences, navigation or clinical changes; theme switch remains absent.
- The reported visual difference was not reproduced in the fresh390px session or the original open overview: both already showed the approved Orbit surface; Requests/back also remained stable. Asked the user which aspect differs or for the prior screenshot rather than claiming an exact historical restoration. This is a targeted cascade fix, not evidence that the full reported mismatch is resolved.
-39 focused overview/card/grid tests, TypeScript and diff-check passed. Added specificity regression against the actual legacy dark rule.21st lookup unavailable(fetch failed); review45 existing color infos. Screenshot `/tmp/operatingroom-overview-cards-restored.png`; actual15rooms,9pxblur,transparentoutline,no theme-toggle buttons. No clinical writes, preference changes, build or deployment.

---

## 2026-10-16 — Detail sálu přizpůsobený malým telefonům

- Real RoomDetail adds a presentation-only orbit viewport wrapper. At <=767px width / <=900px height, flex remaining height and container units fit the unchanged circular geometry between the real wrapping header and compact timings/actions/personnel, with dock and safe-area space reserved. Existing tall-phone geometry, desktop, clinical callbacks, artwork and colors unchanged. All controls retain >=44px touch targets; exceptional warnings/enlarged text and very short landscape retain root scrolling rather than clipping.
- Browser QA with real rooms: 320x568,360x640,375x667,390x844,430x932 all have root scrollHeight equal clientHeight and every visible button >=44x44. Compact staff bottom stays14px above dock. Long GYNEKOLOGIE ZÁKROKOVÝ title wraps at320x568 (74.34px header) and still fits without scrolling;1100px hides mobile detail and removes compact styling. Screenshot `/tmp/operatingroom-mobile-detail-compact.png`. No clinical action was invoked.
-81 focused room detail/orbit/confirmation/rapid-warning tests pass; TypeScript and git diff-check pass. 21st search unavailable (fetch failed); reused existing project components. 21st review reports existing palette/motion guidance in the files, no automatic changes. No deployment or production build.

---

## 2026-10-16 — Stručnější mobilní formulář nového požadavku

- Mobile below768px hides only the three requested duration explanations in new intake (data-intake-new). Editing existing requests and desktop retain them. Selected numeric timeline estimate, duration radios,120-minute mapping and validation unchanged.
-25 acute UI tests, TypeScript and diff-check passed. Real390px dialog computed display none for all3 texts;1100px restored all3. Form opened/closed without submission. Screenshot `/tmp/operatingroom-mobile-intake-clean.png`; temporary tab closed and viewport restored.

---

## 2026-10-16 — Mobilní Požadavky bez kalendáře

- Below768px, both live query selection and request projection follow today's Prague date. Calendar aside and day navigator are not rendered; desktop historical selection remains in state and returns on resizing. Existing history and warning about older pending requests remain accessible; no clinical records, ordering, history range or mutation handlers changed.
-64 targeted acute day/projection/module/UI tests passed, including mobile midnight rollover, mobile live query, desktop restoration and retained calendar callbacks. TypeScript and diff-check passed. Actual390px UI shows16October2026 with no calendar/day navigator or horizontal overflow;1100px restores both controls. Screenshot `/tmp/operatingroom-mobile-requests-today.png`. Temporary tab closed and viewport reset; no clinical writes or production build.

---

## 2026-10-16 — Mobilní popup personálu v designu Orbit

- Reused real StaffPickerModal, existing role icons and room-detail background. Optional Cliniq below768px only: glass rows/current assignment, pale circular controls, complete wrapping names,16px search and readable skill badges. Selected/unavailable states remain distinct; all clinical/data callbacks unchanged. New class hooks/data-selected only, no data logic edits. Background dock hidden only while picker is mounted to fix its existing higher stacking context overlapping the footer.
-38 focused picker/detail tests passed, including synthetic free/busy/on-leave/selected staff, role filtering and assignment/unassignment callbacks. TypeScript and diff-check passed.21st catalog unavailable; reused project assets.21st review informational palette literals only. No production build run.
- Actual authenticated390×844 and320×740: doctor and nurse pickers, search/clear/empty state, list scrolling and close;16px input and no horizontal overflow.667×375:349px dialog scroll area/490px contents,169px list viewport; footer remains reachable. Closing restores navigation visibility. No personnel assignments or clinical writes during QA. Screenshot `/tmp/operatingroom-mobile-staff.png`; temporary tab closed, viewport reset. Physical mobile keyboard not tested.

---

## 2026-10-16 — Odstranění 3D z mobilního zobrazení

- Dashboard and Settings now require the existing768px desktop media query as well as spatial permission. Mobile 3D toggle removed, 3D viewer mount/preload prevented, spatial editor entry filtered and selected editor guarded. Saved desktop spatial preference stays untouched; returning to desktop restores it. Applies to both mobile appearances, with no clinical changes or deletion of stored models.
-17 targeted tests passed, including first-render saved-spatial fallback and desktop/mobile resize restoration. TypeScript and diff-check passed. React review: existing responsive hook reused unconditionally, heavy module retains dynamic loading and permission gating; no new global listener implementation or writes.
- Actual390px mobile: no3D buttons/viewer, layout chooser retains two-column/row cards; Settings has no3D entry. At1100px the3D Settings entry returns. Screenshot `/tmp/operatingroom-mobile-without-3d.png`; temporary QA tab closed, viewport restored. No production build rerun.

---

## 2026-10-16 — Mobilní nabídka Více v designu Orbit

- Existing permission-filtered Drawer, styled only under optional Cliniq below768px. Shared room-detail artwork/navy canvas, frosted glass rows, pale circular icons, readable lavender/white labels and red logout affordance. No handlers, permissions, destinations, data or preferences changed; classic/desktop unaffected.
- 12 focused navigation/More tests passed; TypeScript and diff-check passed. The broader mobile-ios-shell run passed2/3 but retains the unrelated existing overview-search font-size source-contract failure in untouched mobile-overview.css. No production build run.21st search unavailable (fetch failed); existing project components reused.21st review reports only informational palette literals matching Orbit.
- Authenticated browser QA390×844 and320×740: no horizontal overflow,44px close target and66px menu rows.667×375 landscape:351px capped drawer with248px scroll viewport and396px content. Open/close verified; logout was not activated. Screenshot `/tmp/operatingroom-mobile-more.png`. Temporary tab closed and viewport restored.

---

## 2026-10-16 — Mobilní Plán v designu Orbit

- Optional Cliniq below768px only. Reuses room-detail artwork/navy floor, lavender pill controls, circular time paging,9px frosted row cards, shared room-detail dock and the existing timeline drilldown. Full room names, real phase/estimate/pause segment geometry and colors, permissions and callbacks retained. No clinical writes, new data, dependencies or assets. Narrow ruler shows start/mid/end to avoid overlapping labels. Short landscape allows page scrolling and preserves the room-list scroll.
-66 targeted tests passed (timeline data/layout, navigation, acute proposal/cycle integration and new CSS scope contracts); TypeScript and diff-check passed.21st review only informational hardcoded-color notices matching accepted Orbit palette. React review: one stylesheet import, one navigation presentation condition and scoped App class only; no state/effects/fetching/clinical handlers added.
- Real authenticated UI:390×844,320×740,667×375;15 rooms retained, no horizontal document overflow; time-scale/paging/now and opening/closing room drilldown verified. Landscape room scroll169px. Fast Refresh intermittently reported a missing CSS chunk link during edits; clean reload restored the UI. Temporary QA tab only, no user-tab reload. Final screenshot `/tmp/operatingroom-mobile-plan.png`; viewport restored. Production build not rerun.

---

## 2026-10-16 — Mobilní Požadavky v designu Orbit

- Optional Cliniq only below768px: shared room-detail background/floor, lavender controls, pill tabs, compact glass request cards with actual urgency in full-width footer, shared navigation with Requests selected. Portal dialogs styled without changing form behavior, focus management, permissions or clinical handlers. Classic and desktop selectors are untouched.
- TypeScript and diff-check passed.45 existing targeted acute/dialog/navigation tests plus4 new mobile isolation/navigation tests passed (49 unique).21st review reports informational hardcoded-color notices only; colors intentionally match the accepted room-detail palette. React checklist: no new hooks, effects, state, fetching or event handlers; semantic controls retained.
- Actual authenticated localhost UI checked at390×844 and320×740: empty current day, existing completed cycle on14October, calendar, create dialog (not submitted). No horizontal document overflow at320px. Corrected inherited Timeline important rules so close control is circular lavender and descriptive copy is readable. No clinical writes. Screenshot: `/tmp/operatingroom-mobile-requests.png`. Temporary tab closed and viewport reset. Production build not rerun.

---

## 2026-10-15 — Jemnější rozmazání karet

final result: passed

- Na výslovné přání snížen pouze backdrop blur jednotlivých mobilních Cliniq karet z18na12px, WebKit i standard. Výplň48/78%, rozměry, ostrý obsah, stavové barvy, všech15sálů a oddělený16px dock blur beze změn. Upraveno pouze příslušné CSS a jeho testový kontrakt.
- Skutečný418×920 browser: computedblur12px, foregroundfilternone,15cards,bezoverflow; `output/mobile-orbit-qa/overview-frosted-soft-418.jpg`.52/52 cílených regresí a diff-check prošly;21streview pouze původní informační barevné poznámky. Produkční build této dvouhodnotové CSS korekce znovu nespouštěn. Pomocný tab zavřen a viewport resetován, uživatelovy taby/preference/klinická data nedotčeny.

---

## 2026-10-15 — Matný rozmazaný podklad jednotlivých karet

final result: passed

- Pouze existující `.mro-room.m-unified-card` v `components/mobile/mobile-overview-orbit.css`, pod768px a explicitnímCliniq přehledem. Přijatá lavender/navy155deg výplň má nyní alfa48/78% místo17/72%; přidán WebKit a následně standardní `backdrop-filter:blur(18px)`. Nejde o `filter:blur` nebo opacity na celém boxu: obsah zůstává ostrý a plně krycí. Společný selector pokrývá grid i rows. Stávající gradient/barvy projektu znovu použity, bez nového komponentu/assetu.
- Skutečný přihlášenýlocalhost v pomocném tabu,418×920CSS/raster1:1: `output/mobile-orbit-qa/overview-frosted-cards-418.jpg`. Computed18pxbackdropblur,gradientrgba(92,90,175,.48)→rgba(18,22,58,.78); karta ifázetext majífilter none/opacity1. Vlna je uvnitř karet měkká, ve vnějším pozadí zůstává původní.15skutečnýchsálů,229.20px výška první karty stejně jako před změnou,bezoverflow. Živé stavy nyní13připravených/2chirurgické jsou aktuální data uživatele, nikoli změna QA.
-320×740: `overview-frosted-cards-320.jpg`,15cards,18pxbackdrop,219.84px nezměněná výška a0horizontální overflow.1024×900: overviewdisplaynone,cardbackdropnone,bezoverflow. Barvy fází, ostré ikony, celé názvy a odhady/personál, stavové obrysy, spodní dokový blur, dimensions, žádnékruhy a okamžitý full list zachované. Nebyl aktivován žádný klinický ovladač ani měněna preference.
-52/52 cílených testů v5souborech prošlo (overview19/19). Nový boundedtest chrání semitransparentní výplň,18pxbackdrop/prefixorder a absenci foregroundfilter/opacity, sharedgrid/rowsselector, phase/emergency/lock/dock rozlišení a lokální scope. Produkční Webpack/TypeScript build26pages a diff-check prošly.21st review pouze52informačních barevných poznámek; katalogové search bylo nedostupné, použity původní projektové povrchy. Širší sadu s dříve zdokumentovanými3nesouvisejícími selháními tato úzká CSS iterace znovu nespouštěla.
- Browsererrorlogprázdný; pomocnýtabzavřen a viewportresetován, původní2taby/localapp ponechány. Žádný nový P0/P1/P2, fyzickýSafari/iOS netestován. CSS-only změna bez kliniky, backendu, saveddefaults, commitu či deploymentu.

---

## 2026-10-15 — Nižší karty bez kruhu, všechny sály a rozmazání za nabídkou

final result: passed

- Výslovná korekce uživatele nahrazuje předchozí kruhy a čtyřkartový preview pouze na mobilním dashboardu. Výchozí design/uložené preference, skutečné workflow barvy, detail, ostatní moduly a desktop se nemění. Výchozí obrazové srovnání předchozího stavu je `output/mobile-orbit-qa/overview-orbit-final-418.jpg`; nová vizuální autorita je aktuální požadavek odstranit kruh/snížit boxy/zobrazit všechny/rozmazat jen obsah za spodní nabídkou, nikoli původní ilustrace s8body.
- MobileRoomOverview nyní přímo renderuje všechny `visibleRooms` ve skutečném pořadí. Zrušen pouze showAll state/effect/preview/toggle a jeho nepoužívané CSS. Filtry zůstávají skutečné, Všechny ihned ukazuje15sálů bez kliknutí navíc. Není přidán observer/scroll timer, nedochází k přeskupení ani skrývání emergency dat. Stávající tap,500ms longpress, context/keyboard menu, oprávnění, realtime data a klinické callbacks zachované.
- MobileRoomOrbit nyní zobrazuje jen normálně vycentrovanou tematickou provozní ikonu a úplný skutečný název fáze. Odstraněna dial bitmapa, celý kruhový SVGchart/track/arcs/nodes a progress math; parent CSS nemá radial background/radius ani aspekt čtverce. Zůstává shared phase-color resolver a priorita emergency→locked→paused→actualphase; phase attrs a null/unknown fallback zachované. Žádná ikona lékařského oboru, nová grafika nebo změna detailového kruhu.
- Nižší boxy: minimum220px místo268px, pod360px210místo260, podélné156místo180. Center má normální flex/min-height100px; title/clinical metadata smějí zvětšit kartu bez clippingu. První kontrola odhalila[P2] překrytí dlouhého názvu pasivní šipkou na320px. Oprava22px kickeru a26px šipky top6 zachovává plnou šířku názvu a oddělení:320px title top226>arrowbottom225. Post-fix skutečné karty229.20px při418px (dříve274.85),219.84px při320px (dříve262). Font/ink/22px corners/2columns/gaps i skutečné elapsed/end/team informace zůstávají.
- Rozmazání není filter na kartách, seznamu ani celé aplikaci: jediný pasivní fixed-nav pseudo-element pokrývá pouze spodní pás od28px nad dockem do dolního safe-area okraje. Jeho16px backdrop-filter a32px gradientová maska vytváří plynulý přechod; podklad má jemný28% přijatý#0B102C závoj. Nav sám nemá backdrop-filter (zabraňuje oříznutí samplovací oblasti vnořeným backdrop rootem), zůstává sharp nad vlastním z−1pseudo. Vrstva má pointer-eventsnone/isolation a neovlivňuje pořadí focus/klinické callbacky. Pod otevřeným nastavením, quickactions nebo More je contentnone; mimo explicitCliniq overview a pod768px vůbec nevzniká. WebKit prefixy jsou před standardními mask/filter deklaracemi.

### Skutečné browserové důkazy a ověření

-418×920CSS/raster1:1: `output/mobile-orbit-qa/overview-compact-final-418.jpg`. Ihned15cards,0dial/chart/art/nodes, bez horizontálního overflow, obyčejné karty229.20px. Spodní menu y822.59–892.59 zůstává ostré, částečně zakryté karty rozmazané pouze v jeho pásu. `overview-compact-all-418.jpg` zachycuje první průchod ještě před title/chevron opravou.
-320×740: `overview-compact-final-320.jpg`,15cards/žádné kruhy, firstcard144×219.84px, titulky se nekrátí, šipka nad názvem.0horizontální overflow. Nav a ostatní skutečné ovladače mají původní44+px targets; šipka je pouze dekorace uvnitř celého cardbuttonu, ne zmenšený samostatný target.
- End key v reálném seznamu posunul v418px viewportu scroll na1286/max1286; poslední EXTERNÍ ANESTEZIE y552.09–786.82 plně nad maskovaným pásmem, všechny její údaje dostupné: `overview-compact-last-418.jpg` (první průchod před pozdějším8px headerrhythmfixem). Blur zůstává navázaný na dock a ne na identitu sálu; karty při posunu opět ostré nad ním.
- Probíhá skutečně vrací jediný chirurgický sál s parent i icon phasecolor#b3004d, žádný kruh: `overview-compact-active-418.jpg`. Všechny obnovuje všech15. Otevření připraveného TRAUMATOLOGIE -1 pouze čtením a návrat zachovaly skutečný detail: overview0/detail1, detailSVG2circles, navpseudo contentnone. Nebyla kliknuta žádná klinická akce.
- More otevřelo původní autorizované moduly/dialog; pseudocontentnone. Nastavení otevřelo původní ovladače bez změny preference, pseudo také none; Escape zavřel disclosure a vrátil focus.1024×900: overviewdisplaynone, dashboardbackgroundnone, navpseudo none, bez overflow. Error log pomocného tabu prázdný. Pomocný tab zavřen, viewport resetován, původní uživatelovy2taby a localhost ponechány.
-185/185 cílených regresí v15souborech prošlo včetně18overview/10ikonovýchcardtestů a původních detail/phase/confirmation/warning/acute/navigation kontraktů. Finální `npm run build -- --webpack` (TypeScript/26pages) a diff-check prošly.21st review pouze59informačních barevných poznámek; katalog search nedostupný(fetch failed), znovu použity skutečné projektové komponenty/assety. React condensed checklist proveden: odstraněný nepotřebný state/effect, žádná nová subscription/timer/dependency, sémantický cardbutton/ARIA a scope zachované.
- Širší `tests/dashboard/mobile-*.test.js`:232/235pass,3selhání mimo tuto úpravu, bez zásahu do jejich cílových souborů: `mobile-ios-shell.test.js:29` očekává již neexistující searchinputfont v nezměněnémmobile-overview.css; `mobile-overview.test.js:142` očekává starýisSuperAdmin/primaryItemsregex v nezměněnémMobileNav.tsx; `mobile-statistics-style.test.js:65` nachází neoznačený nadpis NotificationsTab. Tyto současné nesouvisející contract failures nejsou vykazovány jako opravené nebo jako úspěch celé sady.
- Žádný otevřený P0/P1/P2 této úpravy; fyzický iOS/VoiceOver není ověřen. Bez klinického zápisu, preference change, generováníassetu, commitu nebo deploymentu. Checklist: bezdashboardkruhu — hotovo; nižšíboxy/celéjméno — hotovo; všechnysály/filtry — hotovo; dock-onlyblur/scrollreachability — hotovo; zachovanýdetail/desktop — hotovo; testy/build — hotovo.

---

## 2026-10-15 — Mobilní hlavní přehled s kruhovými kartami

final result: passed

### Findings a historie oprav

- [P2, opraveno] První přehled měl příliš vysoké karty a zbytečně lámal názvy/„Odhad konce“. Evidence: `output/mobile-orbit-qa/overview-orbit-initial-comparison.png` obsahuje skutečnou předlohu a první418px render vedle sebe; karty309.77px oproti přibližně273px normalizované předloze, tlačítko všech sálů mizelo pod dockem. Oprava: padding-right pouze kickeru, ne celého názvu; odstraněná vynucená dvouřádková výška; dial max154px, kompaktnější patka a nezalamovaný popisek. Post-fix `overview-orbit-full-comparison.png` a `overview-orbit-card-comparison.png`: karta274.85px, druhá řada y475.85, show-all y762.70–810.70 před dockem822.59–892.59. Skutečně delší jména stále smějí růst, nikdy se nekrátí nebo nenahrazují aliasem.
- [P2, opraveno] Zachované podélné rozložení při360px mělo kvůli ikonám textové sloty49.67/32.32px, ale texty potřebovaly61/49px. Oprava pouze pro rows do399px skrývá dekorativní Clock/Users, nikoli label/hodnotu; texty mají alespoň61.36/49.22px, žádné překrytí a0 horizontální overflow. Post-fix `overview-orbit-rows-isolated-360.jpg` a `overview-orbit-rows-isolated-390.jpg`, test omezuje pravidlo na jediný rows selector.
- [P2, opraveno] Tým byl vizuálně správně, ale vnější explicitně pojmenované tlačítko nepřebíralo jeho vnitřní aria-label. Přidáno skutečné „Přiřazený tým0/1/2 ze2 rolí“ do přístupného názvu Cliniq karty; classic oznámení nedotčeno. Offline assertion i skutečný browser DOM potvrzují opravu.
- Žádný otevřený P0/P1/P2. P3/úmyslné produktové odlišnosti: ilustrace má8fází a4dock destinations, nemocnice nyní6fází a stávající autorizovaný přehled5destinations. Zachovány skutečné pořadí/fáze/role/navigační oprávnění místo falešné kopie. Standardní přijaté provozní ikony z existujícího detailu mají nepatrně jinou kresbu než ilustrace; žádné ikony lékařských oborů.

### Rozsah, zdroj a normalizace

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/nový design /mobil/af809346-c354-4ff5-a649-4888cc55e386.png`,853×1844px. Výslovný požadavek „podobný styl“, ale pozadí stejné jako v aktuálním detailu, skutečné statusové barvy. Nejde o vrácení staré ilustrace do detailu nebo překreslení desktopu. Změny: `MobileRoomOverview.tsx`, nový pasivní `MobileRoomOrbit.tsx`, lokální `mobile-overview-orbit.css` a `mobile-room-card-orbit.css`; žádné App/DashboardModule/MobileNav/klinické JSX či backend změny této iterace.
- Skutečný přihlášený `http://localhost:3000/` v pomocném tabu, uložený Cliniq/dark, přehled Všechny/grid: `output/mobile-orbit-qa/overview-orbit-final-418.jpg`,418×920px při CSS418×920;1raster pixel na1CSS pixel bez vnějšího device frame. Source normalizován na418×904px se zachováním poměru, bez přeskládání obsahu; spodních16px renderu je legitimně delší viewport. `overview-orbit-full-comparison.png` staví obě plochy vedle sebe ve stejném vstupu. Detail karty `overview-orbit-card-comparison.png` obsahuje zdroj crop(34,367)–(422,925) a reálný crop(17,192)–(205,468), normalizované na194px šířky. Předloha používá ilustrační názvy,4různé fáze, všechny kompletní týmy a časy; skutečná nemocnice při QA14připravených a1chirurgický sál, týmy0/2. Tato data se při srovnání nepovažují za chybu a nebyla přepsána pro hezčí snímek.
- Barevná rozmanitost ověřena skutečnými oběma komponentami přes existující offline test harness: `overview-orbit-colors-isolated-418.jpg` (syntetické rooms/statuses, mockované contexty/hooks/timery/storage, bez credentials/klinického klienta). Shodné configured parent/child barvy#DC5CA4/#10B981/#E78C2B/#F2B134, accent_color má přednost předcolor. `overview-orbit-light-isolated-320.jpg` potvrzuje zachování modrého detailového canvasu bezm-dark; nejde o zápis uložené theme preference nebo náhradní aplikaci. Izolovaný náhled slouží pouze QA, není finální výsledek.

### Pět povinných ploch fidelity

- Fonts/typografie: původní system/iOS stack a antialiasing; normal400 title21–27px, názvy12–17px podle card containeru, celé skutečné názvy se zalamují po slovech bez ellipsis/hyphen. Světlý#F8F7FF a lavender#DCD6FF/C1BFF1 místo původních tmavých light-theme inků pouze v této ploše. Sekundární patka9.5px, odhad14px, tým10.5px a zachovaný kompaktní elapsed8.5px; referenční optická váha i hierarchie ověřeny ve focused cropu. Dlouhé názvy úmyslně mohou zvětšit kartu. Nevkládá se nový webfont/dependency.
- Spacing/layout:418px hlavní17px gutters,2sloupce s9px gap a187.5px cards,22px corners, kompaktní identity/dial/patka; nahoře centrum titulu mezi44px kruhovými ovladači. Filter tlačítka minimálně44px, proto bar mírně vyšší než v ilustraci. První4původní rooms plus všechny emergency rooms ve zvoleném filtru, žádný reorder. Show-all/show-less zachová skutečný celkový počet. Existující uložené grid/rows se nemění. Původní5destinační dock zachován s glass pill a aktivní lavender výplní; samotný navigační kód/permissions nedotčeny.
- Colors/tokens: canvas používá přesně sdílený `/images/mobile-orbit-background-v3.png`,100%auto,14%blackveil, art-height216.1782vw, feather odheight−184doheight−24 a#0B102Cfloor, nikoli cover/stretch nebo barevný obrázek přesdata. Podklad je stejný jako detail, záměrně tmavší než nová přehledová ilustrace. Orbits/card tint/legend tečka čtou skutečné accent_color/color přes `mobileRoomPhaseVisual`, bez hardcoded mapy index→barva. Reálný aktivní EXTERNÍ ANESTEZIE měl#b3004d a totožnou vypočtenou SVGstroke rgb(179,0,77): `overview-orbit-active-418.jpg`. Warning/emergency/lock/pause nemění identitu fáze a zůstávají oddělené. Chybějící fáze má neutrální označení, bez falešného progressu.
- Image quality/icons: stávající čistý v3raster,512px dial, alpha table/scalpel masky a již instalované Lucide provozní line glyphy z přijatého detailu; assety se negenerují, nespriteují ani netvoří CSS náhradou. Pohybující se SVGtrack/segment/nodes je skutečná konfigurovaná datová vizualizace, nikoli dekorativní náhradní asset. Počet bodů/order zstatuses; připravený první stav má currentnode a žádný vymyšlený hotový arc. Žádné roztažení obrazů/halos. Reference má silnější instrument kresbu[P3], zůstává jednotný skutečný detailový iconset.
- Copy/content: „Přehled sálů“, skutečný connected live stav/počet, skutečné workflow názvy/legend counts; filtryVšechny/Probíhá/Připraveno používají původní filtraci. Karty mají celé skutečné jméno, actualphase/warningtitle, reálný odhad i elapsed. „Tým kompletní“ pouze při skutečně neprázdném doctor.name i nurse.name; jinak0/2nebo1/2, včetněARIA. Původní patientCalled/Arrived, hygienický režim a autorizovaná acute informace zachované. V aplikaci není implementační text nebo falešné data ilustrace.

### Interakce, přístupnost a regresní kontrola

- Skutečný browser: show-all otevřel15cards aaria-expandedtrue; Probíhá vyfiltroval skutečný chirurgický sál; tap otevřel tentýž sdílený klinický detail s původním warningem, bez aktivace fáze; lokální dismiss informačního warningu a návrat vrátil overview. Nastavení zpřístupňuje původní card/3D controls, design/theme agrid/rows; `overview-orbit-settings-418.jpg`. Escape zavřel jen details a focus byl na původním summary. Uložené preference při browser QA neměněny.
-418×920,320×740 (`overview-orbit-final-320.jpg`),360/390rows a320light bez vodorovného overflow. Menší viewport přirozeně scrolluje místo zmenšování44px cílů.1024×900 (`overview-orbit-desktop-1024.jpg`): overviewdisplaynone/width0, customdashboardbackgroundnone, desktop bez přetékání. Původní classic větve/hlavička/filterlabels/full list zachovány a style všechny pod768px + explicitCliniq scope. Focus-visible/reduced-motion ochrany přidány; pasivní kruh nevytváří další tabstop/klinický actiontarget. Browser error log prázdný.
-184/184 cílených testů v15souborech prošlo včetně nových17overview/10card-orbit regresí, původních classicgrid/typography/timing/permissions/quickactions/phaseicons/confirmation/warnings/acute start a navigation. Nový test úzkýchrows přidán do stejné17testů s následným17/17pass. Produkční `npm run build -- --webpack`/TypeScript i diff-check prošly.21st review jen informační hardcodedreferencecolors; katalogový lookup nedostupný, existující design/přijatéassetypoužity. React condensed checklist proveden.
- Residual test gap: fyzický iOS/VoiceOver nebyl k dispozici. P3poznámky nezabraňují předání. Izolovaná loopback služba a pomocný tab ukončeny, viewport resetován a oba dočasné skripty odstraněny; původní uživatelské taby a běžící localhost zůstávají. Žádné klinické API write, změna preference, commit ani deployment.

### Implementation checklist

- [x] Otevřít/normalizovat zdroj a skutečný render ve společném full/focused inputu.
- [x] Opravit nadměrnou výšku karet, rows metriky a přístupné jméno týmu; znovu zachytit a porovnat.
- [x] Ověřit skutečné barvy/statusy, filtry/show-all/detail/back/settings, úzký mobil a nedotčený desktop.
- [x] Zachovat reálné workflow/klinické handlers/permissions/appearance defaults; testy a production build.

---

## 2026-10-15 — Světlé referenční dlaždice a aktivní barevné přechody

final result: passed

### Rozsah a důkazy

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/nový design /mobil/6e51bdeb-9e56-4d4a-bd4b-57df9d1df1fc.png`,853 ×1844px. Cílem jsou pouze4 tlačítka Volat/Příjezd/Hygiena/Pauza; ostatní přijatý skutečný detail se nepředělává podle ilustračních dat obrázku. Nový výslovný požadavek nahrazuje dřívější shodné ARO sklo těchto tlačítek, nikoli sklo personální lišty nebo dialogů.
- Skutečný přihlášený TRAUMATOLOGIE -1 otevřen pouze čtením v pomocném tabu: `output/mobile-orbit-qa/actions-lavender-reference-418.jpg` a `actions-lavender-reference-row-418.jpg`. Všechny4 původní akce a jejich skutečné active/disabled podmínky zachovány. Žádné klinické tlačítko nebylo při browser QA aktivováno; browser error log prázdný.
- Final same-component offline capture: `actions-lavender-base-final-418.jpg`, `actions-lavender-active-final-418.jpg`, `actions-lavender-active-final-320.jpg`. Stávající RoomDetail/test harness používá syntetický Kontrolní sál a mockované contexty/efekty/audit, bez credentials/persistence/klinických API. All-active ukazuje navíc původně požadované oranžové hygienické pozadí a Pause ve středu; nejde o změnu klinických dat ani náhradní aplikaci.
- CSS viewport418 ×920 a320 ×740; screenshots1:1CSS px. Source normalized418 ×904px (původní poměr). Full-view společná srovnávací plocha: `actions-lavender-full-comparison.png`, předloha vlevo, finální render vpravo. Data/fáze/počet markerů/časy a absence app shell docku v izolovaném výřezu jsou očekávané odlišnosti mimo rozsah tohoto požadavku. Focused source crop0,1274–853,1494 normalizován418 ×108px a srovnán s řadou renderu0,608–418,716: `actions-lavender-final-comparison.png`. Přehled základní/aktivní varianty `actions-lavender-states-preview.png` je pouze mechanická kompozice skutečných browserových výřezů.

### Kontrola pěti ploch a historie oprav

- Fonts/typografie: zůstává původní system/iOS font400, label13.5px (320px:12px), bez změny textu či přidání podtextu. Všechny ikony/popisky dědí tmavý#151044; neaktivní disabled používá#51496F a aktivní disabled opět hlavní ink bez snížení opacity. Contrast test počítá skutečné gradient stops a semantic overlay kombinace včetně minimálně4.5:1 pro popisky.
- Spacing/layout: podle změřené předlohy přidán pouze12px inset řady,78px minimum height, ponechány4 columns/5px gap/22px corners (úzký mobil19px).418px: x32, šířka řady354px, tlačítka84.75 ×78px; reference normalizovaná přibližně84–86 ×78px.320px:60.25 ×78px,0 horizontální overflow, všechny texty viditelné a targety nad44px. Personální lišta, kruh, outer tick důraz a časový pár beze změny.
- Colors/tokens: základ je nový action-only165deg gradient#EEECFF0%→#C8C9FF48%→#B9BFFF100%, světlý1px obrys a jemný inset/shadow. Aktivní135deg přechod má různé stopy12/42/68% semantic barvy na0/55/100%, nikoli původní stejnoměrný16% závoj. Call zelená#20C997, arrival/pause modrá#5B8DEF, hygiena oranžová#FFB020 ze skutečných projektových tokenů. Samotné identity bez is-active zůstávají netónované. Gradienty jsou výslovný požadavek uživatele na UI povrch, nikoli nahrazení obrazového assetu.
- Image quality/icons: původní instalované Phone/BedSingle/Pause/Play a existující alpha hygiene mask zachovány, bez generování/nového assetu či kresby. První společná kontrola `actions-lavender-source-comparison.png` odhalila[P2] příliš drobnou hygienickou ikonu:256px bitmapa obsahuje průhledné okraje a původní42 ×33contain zobrazoval přibližně22 ×18px. Opraveno na45 ×45 s margin-8px0, čistý viditelný glyph přibližně30 ×24px a stejný29px layout slot jako ostatní. Post-fix evidence `actions-lavender-final-comparison.png` potvrzuje vyváženou váhu; bez roztažení bitmapy/halos. Standardní Phone/BedSingle mají drobně jinou kresbu než ilustrace[P3], ponechány jako stávající jednotné operační symboly.
- Copy/content: přesně Volat/Příjezd/Hygiena/Pauza, původní dostupné názvy pro volání/příjezd/hygienu/resume, žádné nové pole ani text. Aktivní Pauza si ponechává původní Play ikonu pro pokračování a skutečný Pause ve středu.
- Druhá společná kontrola odhalila[P2] růžovější a světlejší základ než předloha. Source vzorky nahoře222/221/254, uprostřed~200/200/252 a dole190/194/254 vedly k chladnějšímu165deg gradientu uvedenému výše místo původně zkoušeného145deg#F1EDFF/#DBD5FF/#C2BAFF. Finální full/focused společné snímky po znovunačtení nové CSS varianty byly otevřeny a vizuálně porovnány; oběP2 opravy uzavřené, žádné zbývajícíP0/P1/P2 v požadovaných4 tlačítkách.

### Ověření a předání

-141/141 cílených regresí v11 souborech prošlo, včetně nových lavender/gradient/contrast contractů, nezměněného personálního skla, active-disabled stylu, původní klinické sekvence, dvouvteřinového center feedbacku, fází, pauzy, potvrzení/warnings a akutní navigace. Produkční Webpack build/TypeScript a diff-check prošly.21st review jen informační barvy; katalogový lookup nedostupný, použita stávající grafika. CSS pouze pod768px, desktop i všechny klinické handlers/JSX neměněné. Focus/reduced-motion pravidla zachována, žádná nová animace.
- Pomocný tab i izolovaná loopback služba ukončeny, viewport resetován a pomocný skript odstraněn; původní uživatelské taby a běžící aplikace ponechány. Bez preference/klinického zápisu, commitu nebo deploymentu. K fyzickému iOS VoiceOver testu nedošlo. Checklist: porovnat source/render — hotovo; opravit hygienický scale/odstín — hotovo; ověřit4 gradienty a320px — hotovo; testy/build — hotovo. Není třeba další blokující oprava.

---

## 2026-10-15 — Jemně výraznější vnější čárkovaný kruh

final result: passed

- Zvýrazněny jen vnější čárky původního512px dial assetu: geometricky shodná pasivní `mrd-orbit-stage::before` kopie stejného obrázku s opacity0.1 a kruhovou maskou transparent89%→opaque90%. V assetu jsou vnější čárky přibližně v poloměru232–246px; původní souvislá kružnice kolem219px a vnitřní stupnice145–160px se do masky nedostanou. Původní dial opacity0.3, počet/rozteče/tloušťka čárek, phase SVG/arc/colors, JSX, ikony, pozadí, ovládání, klinická logika a desktop beze změny. Žádný nový asset ani glow.
- Skutečný přihlášený detail EXTERNÍ ANESTEZIE byl pouze otevřen v dočasném tabu bez aktivace klinických tlačítek.418 ×920: původní dial i přídavná vrstva shodně274.375px, computed opacity0.3/0.1, standardní radial mask89/90% a pointer-eventsnone.320 ×740: oba210.047px; v obou velikostech bez vodorovného overflow. Náhledy `output/mobile-orbit-qa/outer-ticks-gentle-418.jpg` a `outer-ticks-gentle-320.jpg`. Pomocný tab zavřen, viewport resetován, původní uživatelův tab ponechán beze změny.
-99/99 cílených regresí v5 souborech prošlo, včetně nového testu zachované geometrie, mírného zesílení pouze vnějšího mezikruží, Safari/standard mask pořadí, pasivnosti, mobilního scope a nezměněných klinických čar. Produkční Webpack build/TypeScript a diff-check prošly.21st review má jen informační barevné poznámky; katalogový lookup nedostupný, použita stávající grafika. Bez commitu či nasazení.

---

## 2026-10-15 — Dvouvteřinové volání a příjezd ve středu kruhu

final result: passed

- Přijatá lokální mobilní akce Volat ihned nahrazuje existující hlavní ikonu/popisek: instalovaná Phone a „Volání pacienta“. Příjezd stejným způsobem používá BedSingle a „Příjezd pacienta“. Žádné další pole, badge, podtext tlačítek ani stavová lišta. Použit původní64px wrapper,36px linkový glyph,160 ×132px center, typografie a skutečný phase ink; kruh, pozadí a CSS beze změny.
- Samostatný2000ms mobilní časovač má latest-wins chování: novější příjezd ruší a verzí zneplatňuje staré volání. Po vypršení se odstraní pouze dočasný feedback a zobrazí aktuální Pauza nebo aktuální fáze. Cleanup při změně room.id/activeHospitalId a odpojení komponenty ruší i zneplatňuje callback bez následného zápisu stavu. Historické patientCalledAt/patientArrivedAt ani otevření již aktivního sálu nespouští nový flash. Titulek má aria-live=polite a aria-atomic=true; přístupná klinická akce středu i disabled/confirmation guardy zůstávají původní.
- Klinické callbacks, audit, timestampy a sekvence jediné volání→jediný příjezd se nezměnily. Původní desktopové5s zprávy mají oddělené původní časování; desktopové JSX neměněné. Žádná nová fáze, závislost, asset, preference nebo backend změna.
-140/140 cílených testů prošlo v11 souborech. Nových5 regresí přes fake scheduler ověřuje hranice1999/2000ms, oba skutečné glyphy/popisky, oddělený5000ms desktop timer, rychlé call→arrival s ručně spuštěným stale callbackem, aktuální phase/pause/resume fallback, absenci initialhistory flash, room/hospital/unmount cleanup včetně nulového post-unmount setstate a nezměněnou strukturu/klinickou sekvenci. Produkční Webpack build a TypeScript prošly. Read-only review bez nového konkrétního nálezu.21st review pouze existující hardcoded-color/motion poznámky mimo tento úzký zásah; katalogový lookup nebyl dostupný a znovu použity instalované glyphy.
- Vzhled skutečné RoomDetail byl ověřen pomocí stávajícího offline harnessu s mockovanými contexty/efekty/auditem a syntetickým „Kontrolní sál“, bez credentials, persistence a klinického HTTP klienta. Handler byl vykonán pouze nad těmito testovacími daty.418 ×920: `output/mobile-orbit-qa/patient-call-center-isolated-418.jpg` a `patient-arrival-center-isolated-418.jpg` ukazují stejné místo v kruhu a původní4 tlačítka/ARO; computed Phone/BedSingle v64px wrapperu, bez horizontálního overflow.320 ×740: `patient-arrival-center-isolated-320.jpg`, text se vejde a šířka dokumentu320px. Statické browserové snímky ověřují vizuální rámec, přesné živé časování dokládají timer testy (ne statické SSR). VoiceOver na fyzickém iOS zařízení netestován. Pomocný loopback server/tab ukončeny, viewport resetován a dočasný skript odstraněn. Skutečný pacient nebyl volán ani příjezd potvrzen. Bez commitu či nasazení.

---

## 2026-10-15 — Hlavní ikona a popis Pauza ve středu kruhu

final result: passed

- Na základě nového výslovného požadavku skutečné isPaused nyní nahrazuje hlavní ikonu a popis ve stávajícím mobilním středu: instalovaná linková Pause a jediný text Pauza včetně přístupného názvu. Nejde o novou fázi, dodatečný badge/pole ani změnu workflow. Během pauzy se nezobrazuje tabulový/skalpelový mask ani příjezdový/odjezdový cue. Samostatný finální lock badge a původní guardy zůstávají.
- Změna je pouze v mobilním JSX RoomDetail. Použity původní64 ×64px ikonový wrapper,36 ×36px line glyph se stroke1.35,160 ×132px střed a stávající typografie/phase ink. CSS, assety, skutečná barva kruhu/fáze, uspořádané názvy fází, pozadí včetně hygieny, časování, callbacks, audit a desktop beze změny. Tlačítko středu při pauze zůstává disabled. Původní resume handler vrací ikonu i název skutečné fáze a nevytváří další phase transition.
- Aby QA nepozastavilo skutečný sál, skutečný RoomDetail byl vykreslen přes existující offline harness se syntetickým room, vypnutými effects a mockovanými contexty/auditem bez credentials, klinického HTTP klienta či persistence.418 ×1109: `output/mobile-orbit-qa/pause-center-isolated-418.jpg` potvrzuje Pause/Pauza,36px glyph/64px wrapper a0 dodatečných polí. Vypnutá pauza obnovila hlavní scalpel a Chirurgický výkon: `pause-resumed-isolated-418.jpg`.320 ×568: bez vodorovného overflow,160 ×132px center mezi x80–240 a y185–317,36px glyph a0 doplňkových polí; `pause-center-isolated-320.jpg`. Jde o označenou QA kontrolu stejné skutečné komponenty, nikoli náhradní aplikaci. Pomocný loopback server i tab ukončené, viewport resetován a dočasný skript odstraněn. Skutečná klinická pauza ani změna dat nebyla při QA vyvolána.
-135/135 cílených regresí prošlo: nové paused matice pro ready/surgery/arrival/departure/completion/anesthesia-end/unknown/empty zachovávají skutečné phasecolor/order a přesný původní layout; mockovaný resume pro7 konfigurací obnovuje původní ikonu/title/aria, zaznamenává pouze původní resume callback/audit a žádný phasechange. Ostatní potvrzení, upozornění, akutní start a navigační guardy prošly. Produkční Webpack build/TypeScript a whitespace kontrola čisté.21st review má jen již existující informační barevné a desktop motion poznámky, bez zásahu mimo rozsah. Lookup katalogu nebyl dostupný; znovu použit existující Pause glyph. Bez commitu či nasazení.

---

## 2026-10-15 — Popup upozornění na časový interval ve stylu detailu

final result: passed

- Stávající mobilní RapidSurgeryWarning má pouze nové prezentační class hooks; všechny původní inline styly zůstávají jako fallback pro Timeline a jiná použití. Nové CSS je výhradně uvnitř `.mobile-room-orbit` pod768px. Resolver intervalů, skutečná historie, konfigurovaný rapidSurgeryMinutes threshold, původní texty, ARIA, autofocus i lokální dismissedEventKey/useEffect Escape logika zůstávají beze změny. Desktopová a rail větev neměněné.
- Skleněná karta sdílí přesné výplně, obrys, stín a floor s již přijatým potvrzením fází: radius32px, skutečné pozadí rozostřené18px, karta28px s78% navy/warm floor a společným8% sklem. Jantarová je omezena na výstražnou ikonu, kicker a skutečný naměřený čas. Měřený interval je v jemném skleněném insetu s lehkým38–48px číslem; hlavní text je regular400. X má44 ×44px a potvrzovací Rozumím, zavřít minimálně74px se16% warning závojem a22px rohy. Při hygieně je warm floor zděděný ze skutečného detailu, bez nového assetu nebo filteru přes text.
- V reálné aplikaci byl nalezen starší globální important styl `.m-dark .mobile-room-detail h2`, který měnil nadpis na drobný uppercase popisek. Silnější lokální selector pro rapid title nyní chrání mixed-case22–28px nadpis se správnými important font/color/margin pravidly. Actual418px computed:25.289px, weight400, text-transformnone, spacing-.885px. Nový regresní test čte skutečné legacy globals a hlídá jejich překrytí.
- Pro zachování uživatelova rozpracovaného potvrzení v původním tabu byla otevřena dočasná druhá instance stejné skutečné přihlášené aplikace a pouze otevřen existující EXTERNÍ ANESTEZIE. Upozornění na skutečný interval0:20 se zobrazilo bez klinické akce. `output/mobile-orbit-qa/rapid-warning-glass-418.jpg`: card378px široká, blur18/28px, obrys rgba(163,153,239,.25), X44px, ack74px. Dočasná HMR chybějící CSS-link hláška v pomocném tabu vyřešena reloadem pouze tohoto tabu před finálním snímkem; produkční sestavení prošlo a uživatelův původní tab se nereloadoval.
-320 ×568: dokument320px bez horizontálního overflow, karta280 ×397.1px od y85.45 do482.55, hlavní nadpis22px bez uppercase, X44px a ack74px; `rapid-warning-glass-320.jpg`.568 ×240: karta400 ×200px v y20–220, scrollHeight414 a klávesnicový scroll215 zpřístupňuje celé74px potvrzovací tlačítko v y125–199 s viditelným focus obrysem; `rapid-warning-glass-short-scroll.jpg`. Escape skutečně zavřel pouze místní upozornění, fáze zůstala Chirurgický výkon. Pomocný tab zavřen a viewport resetován, žádná klinická změna/vrácení dat ani preference.
-133/133 cílených regresí prošlo včetně16 nových skutečných offline React/state/effect/window testů:299/300 i119/120 hranice, history sorting/latest preceding arrival, phase/operation fallback, česká normalizace, skutečný duration/text/ARIA, X/ack/Escape+cleanup a nový event znovu, zachované legacy nonorbit/desktop/rail větve, glass/inline priority, prefix pořadí, heading specificita, short-scroll,44/74px minima, focus a reduced-motion. Produkční Webpack build/TypeScript a whitespace kontrola prošly.21st review uvádí informační barvy a předchozí autofocus warning; původní bezpečné zaměření dismiss tlačítka není měněné. Katalogový lookup nebyl dostupný, existující prvky/tokens byly znovu použité. Bez commitu či nasazení.

---

## 2026-10-15 — Potvrzení mezi kroky ve skleněném stylu detailu

final result: passed

- Stávající StepConfirmationOverlay zůstává jediným funkčním potvrzením. Nová třída step-confirm-overlay umožňuje CSS pouze pro souseda skutečného otevřeného `.mobile-room-orbit` pod768px. Výchozí i hygienický floor a ink/glass proměnné mají společný zdroj s detailem. Žádný nový obrázek, komponentový dialog paralelně, globální redesign nebo úprava nastavení.
- Mobilní potvrzení je32px skleněná karta nad skutečným rozostřeným pozadím sálu, nikoli jiná stránka. Přesná výplň/obrys/vnitřní stín pocházejí ze stejných proměnných jako ARO a akce, hlavní plocha používá78% stejného navy/warm floor. Typografie400 odpovídá detailu, názvy fází/barvy zůstávají skutečné v jedné kompaktní skleněné trase. Zrušit a Potvrdit mají minimálně44 ×74px, stejné22px rohy,16% červený/zelený závoj a29px linkové ikony místo velkých plných barevných kruhů.
- Varování krátké fáze, nastavený threshold, vypočtený čas, průměr i původní klinické confirm/cancel callbacky zůstaly beze změny. Vizuální změna nevyvolává přechod. Obě původní responzivní větve nyní nesou samostatný role=dialog se správným vlastním heading/warning ID; mobil již neodkazuje na skryté desktopové záhlaví. Desktopové disky, vzhled a workflow neměněné.
- Reálné přihlášené EXTERNÍ ANESTEZIE již mělo uživatelem otevřené potvrzení Chirurgický výkon→Ukončení výkonu. Screenshot418 ×1109: `output/mobile-orbit-qa/confirmation-glass-418.jpg` včetně skutečného krátkého varování. Computed backdrop blur18px, card blur28px, border rgba(163,153,239,0.25), radius32px; oba buttony164.5 ×74px. Zjištěné pořadí standardní backdrop-filter před webkit prefixem v aktuálním Next/Lightning odstranilo standardní filtr z výsledného CSS. Po přesunu -webkit deklarace před standardní je v běžícím Chromium computed18/28px, nikoli none; pořadí chrání test.
-320 ×568: dokument bez horizontálního overflow, karta280px široká, obě akce115.5 ×74px, screenshot `confirmation-glass-320.jpg`. Velmi krátkých568 ×240: karta400 ×200px mezi y20–220, vlastní scrollHeight255; klávesa Tab bezpečně posunula vnitřní scroll na56px a zpřístupnila obě74px akce celé mezi y125–199 se2px focus obrysem. Fokus poté vrácen na Zrušit bez aktivace; `confirmation-glass-short-scroll.jpg`.1024 ×900: mobilní karta displaynone, jediný viditelný desktopový dialog má původní ID a oba disky204.8px, bez nového blur. Dočasný viewport resetován. Žádná klinická akce nebo potvrzení při QA neproběhly.
-111/111 cílených regresí prošlo (13 nových skutečných offline component/CSS testů) včetně null/reset/target barev, původních callbacků, přesných warning hranic119/120 a299/300, responsive aria ID, sdílených barev včetně hygieny, prefix pořadí, short-scroll,44px minima a reduced-motion. Produkční Webpack build/TypeScript a whitespace kontrola prošly.21st review pouze informační poznámky stávajících barev; lookup katalogu nebyl dostupný a lokální primitiva znovu použita. Žádný commit či nasazení.

---

## 2026-10-15 — Stabilní ovládání bez doplňkových textů a oranžová hygiena

final result: passed

- Z mobilní větve RoomDetail odebrány doplňkový čas u Volat, Potvrzeno u Příjezdu, dočasný potvrzovací řádek pod personálem, stavové proužky hygieny/pauzy a dodatečný pause badge nad tematickou ikonou fáze. Viditelné popisky zůstávají vždy Volat/Příjezd/Hygiena/Pauza. Při pauze zůstává Play ikona a přístupný příkaz Pokračovat ve fázi, aria-pressed a skutečný resume handler; žádný nový panel ani text. Samostatná upozornění nouze/zámku, finální lock cue a bezpečnostní/úklidová varování nejsou odstraněné.
- Skutečné room.isEnhancedHygiene nastavuje pouze mobilní data-hygiene. Přesný selector root[data-hygiene='true'] přebarví existující v3 podklad přes background-blend-mode normal/luminosity nad#7A390D.24% černý závoj a stejný160px fade184→24px před koncem rastru ústí do společného tmavě oranžového#241208 floor. Poměr/poloha vlny, velikost100%auto a souvislý canvas zůstávají. Žádný filter přes celé UI, nový asset či přebarvení skutečných phase ring/icon barev. Po vypnutí režimu se atribut odstraní a vrátí původní modrá.
- Skutečná přihlášená aplikace byla zkontrolována pouze čtením: aktivní call/arrival mají nyní jen stálé popisky bez small ani feedback. Uživatel během QA samostatně měnil fáze a otevřel potvrzení nového cyklu; naše QA žádnou klinickou akci, změnu či vrácení stavu neprovedlo. Aby nebylo nutné zapínat hygienu ve skutečných datech, barevná varianta byla vizuálně ověřena ve stejném skutečném RoomDetail přes existující offline test harness se syntetickým room, mockovanými contexty/efekty/auditem, bez přihlašovacích údajů a klinického síťového klienta. Jde pouze o QA, nikoli předávanou náhradní aplikaci.
- Izolované screenshoty: `output/mobile-orbit-qa/hygiene-orange-isolated-418.jpg` a `hygiene-off-isolated-418.jpg` (418 ×1109). Computed on background má orange base RGB122/57/13, floor36/18/8 a luminosity; off má původní blue/normal. Oba stavy mají přesně čtyři stejné popisky a0 small/feedback/status/pause-badge prvků.320 ×568 se všemi akcemi aktivními: šířka dokumentu320, akce66.25 ×74, scrollHeight766/scrollTop198, pole navíc0; `hygiene-orange-isolated-320-bottom.jpg` potvrzuje dostupnost a souvislý podklad. Pomocná loopback QA služba i její tab byly ukončené, dočasný viewport resetován.
- 98/98 cílených regresí prošlo včetně samotných handlerů, on/off callback/audit hygieny, absence dodatečné struktury/textu, zachovaných emergency/lock warnings, finálního lock cue a mobilně omezeného hygienického pozadí. Produkční Webpack build, TypeScript a whitespace kontrola prošly.21st review CSS má jen informační barevné poznámky; katalogový lookup nebyl dostupný a stávající assety/prvky byly znovu použité.
- Desktopová větev, klinické callbacks/timery, konfigurace fází, aktivní barevné závoje, personální lišta, ostatní moduly, preference, backend i data beze změny. Bez commitu či nasazení.

---

## 2026-10-15 — Jemný barevný závoj aktivních akcí

final result: passed

- Následné upřesnění mění pouze aktivní stavy čtyř mobilních akcí. Volat používá skutečný projektový success token#20C997, Příjezd i Pauza stejný info token#5B8DEF a Hygiena warning token#FFB020. Neaktivní plochy zůstávají přesně společným sklem personální lišty z předchozí opravy.
- `.is-active` přidává jednotný16% barevný závoj nad původní výplň rgba(146,141,190,0.08), jemně tónuje dosavadní obrys a ponechává původní vnitřní stín a světlý obsah. Aktivní disabled akce se nezeslabují celkovou opacity. Barevná identita je pouze přes data-action na stávajících tlačítkách; všechny původní active podmínky, disabled/aria-pressed hodnoty, potvrzení, callbacks i klinické auditní eventy jsou beze změny.
- Skutečná přihlášená aplikace418 ×1109: `output/mobile-orbit-qa/actions-active-tints-418.jpg`. Při nezávislé živé změně uživatele měly Volat/Příjezd active=true a disabled=true; computed background obsahoval jejich správnou zelenou/modrou s alfa0.16 nad shodnou výplní, zatímco neaktivní Hygiena/Pauza měly jen původní sklo. Screenshot ověřuje čitelné popisky a potvrzení. QA žádnou klinickou akci nevyvolalo ani nevracelo a dočasný viewport resetovalo.
- 94/94 cílených regresí prošlo včetně mapy všech čtyř barev, omezení závoje pouze na aktivní tlačítka, přesného overlay nad sklem a osmi scénářů původních active/disabled/aria-pressed podmínek včetně souběhu, nouze a finálního zámku. Produkční Webpack sestavení a whitespace kontrola prošly.21st review CSS uvádí jen informační barevné poznámky; lookup katalogu nebyl dostupný a existující projektové tokeny/prvky byly znovu použité.
- Pouze čtyři pasivní atributy v RoomDetail a mobilní CSS/testy. Beze změny okolního pozadí, fází, personální lišty, layoutu, desktopu, nastavení, backendu, commitu či nasazení.

---

## 2026-10-15 — Akční tlačítka se stejným pozadím jako personální lišta

final result: passed

- Volat, Příjezd, Hygiena a Pauza sdílejí s existující lištou ARO lékař / ARO sestra stejné lokální CSS proměnné pro průsvitnou výplň, obrys a jemný vnitřní stín. Vzhled samotné personální lišty je nezměněný. Původní světlé pastelové plochy akčních tlačítek jsou nahrazené tímto společným sklem.
- Ve skutečné přihlášené aplikaci mají všechny čtyři akce i personální lišta shodné computed hodnoty: výplň rgba(146,141,190,0.08), obrys rgba(163,153,239,0.25), vnitřní stín rgba(255,255,255,0.024) 0px 1px 0px 0px inset. Popisky a ikony dědí světlou barvu #DCD6FF. Stávající alfa artwork Hygieny se pouze zobrazuje jako currentColor maska včetně -webkit-mask, bez nového assetu.
- Nedostupná akce ponechává skutečný disabled atribut a stejné pozadí při opacity1; pouze obsah se tlumí na #8E88AB. Aktivní stav používá stejnou výplň/stín a výraznější obrys se světlejším obsahem. Jediné TSX přizpůsobení je pasivní dekorativní span namísto obrázku Hygieny uvnitř původního tlačítka, nikoli změna callbacku.
- Skutečný EXTERNÍ ANESTEZIE,418 ×1109 px: `output/mobile-orbit-qa/actions-glass-418.jpg`. Na320 ×568 px mají všechny čtyři akce66.25 ×74 px, horizontální overflow není přítomný a při scrollTop198 jsou akce i personál celé nad dockem: `output/mobile-orbit-qa/actions-glass-320-bottom.jpg`. Zachovány čtyři sloupce, původní rádiusy,44px minimum a viditelný klávesnicový fokus. Dočasný viewport byl resetován; žádná klinická akce při prohlížečové kontrole nebyla stisknutá.
- 92/92 cílených regresí prošlo včetně přesných sdílených povrchů, čitelného dědění, aktivních/disabled stavů, masky a dosavadních klinických guardů. Produkční Webpack sestavení a whitespace kontrola prošly. 21st review: informační poznámky stávající palety a předchozí desktopová motion upozornění, bez automatické změny nesouvisejících povrchů. Katalogový lookup nebyl dostupný; jako autorita je přímo použit existující personální styl.
- Původní souvislé tmavší modré pozadí, tematické fáze/barvy, ostatní mobilní obrazovky, desktop, preference, oprávnění a backend zůstaly beze změny. Bez commitu či nasazení.

---

## 2026-10-15 — Jednotné, mírně tmavší modré pozadí bez spodního předělu

final result: passed

- Hlášený screenshot `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-10-15 v 16.24.42.png` ukazuje konec width-scaled rastru a pod ním jinou tmavou výplň. Příčina je původní velikost 100% auto na vyšší ploše, ne chyba fáze. Předchozí skutečný QA snímek `output/mobile-orbit-qa/blue-background-restored.jpg` stejný problém reprodukuje při418 ×1109 px.
- Zachován původní poměr a poloha vlny rastru v3. Nová samostatná vrstva pozadí dává jemný14% černý závoj a dole160px plynulé prolínání do shodné výplně#0B102C. Rozměr podkladu vychází z853 ×1844 a šířky viewportu; fade končí24px před odhadovaným okrajem kvůli scrollbarům. Spodní hrana obrazu je tedy již zakrytá stejným neprůhledným podkladem jako zbytek plochy. Obraz se neprotahuje ani necropuje. Není použito zabarvení podle fáze ani filter přes celé UI.
- Finální skutečná aplikace418 ×1109 / DPR1: `output/mobile-orbit-qa/continuous-background-418.jpg`. Přímý výřez původního a opraveného místa (vlevo před, vpravo po), y770–990: `continuous-background-seam-comparison.jpg`. V místě původní hrany x210/y902–905 mají nyní všechny čtyři vzorkyRGB12,16,43, zatímco původní snímek přecházel z23,26,81 na16,22,56. Jasný vodorovný předěl je odstraněný, horní plocha mírně tmavší.
- 320 ×568: bez horizontálního overflow, scrollHeight766, konec scrollu198px; fade719.6–879.6px při418px se správně přepočítá na507.8–667.8px při320px. Snímek `continuous-background-320-bottom.jpg` potvrzuje souvislý podklad a dostupné akce/personál nad dockem. Dočasný viewport resetován a fokus vrácen do hlavičky bez kliknutí. Žádná vlastní klinická akce ani změna nastavení.
- Fonty, copy, velikosti, rozložení, skutečná data, tematické ikony a barvy aktivní fáze zůstaly beze změny. Veškeré změny CSS jsou pouze v již existujícím mobilním detailu pod768px; desktop ani RoomDetail TSX se v této opravě nemění. Žádný nový obrázek, závislost, backend, commit či nasazení.
- 87/87 cílených regresí a produkční Webpack build prošly, diff whitespace check čistý. Nový test odvozuje poměr stran ze skutečných rozměrů PNG a hlídá nenulovou fade oblast před hranou, průhledný vrchní závoj, společnou spodní výplň, oddělení fázových barev a původní UI/klinické guardy. 21st katalogový lookup nebyl dostupný, stávající asset a styl byly znovu použité; review má pouze informační poznámky stávající palety.

---

## 2026-10-15 — Potvrzené vrácení poslední úpravy pozadí

final result: passed

- Uživatel výslovně potvrdil vrácení pouze posledního celoplošného přebarvování. Obnoven původní modro-indigo v3 podklad, #111637 fallback, velikost 100% auto a normální blending. Vrácen také původní tlumený kontext hlavičky a zelené Živě. Předchozí celoplošná fázová korekce níže je historická a tímto nahrazená.
- Fáze, jejich konfigurace, tematické ikony a skutečné barvy aktivního kruhu/uzlu nejsou měněné. RoomDetail TSX, helper, klinické callbacks i desktop zůstaly v tomto kroku beze změny. Žádná změna klinických dat, nastavení, commit nebo nasazení.
- Skutečný otevřený EXTERNÍ ANESTEZIE, nativní viewport 418 × 1109: computed background rgb(17,22,55), v3 image, background-size 100% auto a blend normal, zatímco aktuální výkon nadále používá #b3004d. Náhled `output/mobile-orbit-qa/blue-background-restored.jpg` vizuálně potvrzuje modré pozadí a vínový kruh se skalpelem. Prohlížečová kontrola byla pouze čtení, bez navigace či klinického stisku.
- 86/86 cílených regresí a produkční Webpack sestavení prošly; test podkladu nově chrání pevnou modrou před opětovným celoplošným tintem. Zachováno oddělené ověření barev kruhu/ikon, oprávnění, fází a akutního startu. Kontrola whitespace čistá.

---

## 2026-10-15 — Celé pozadí detailu přebírá barvu fáze

final result: passed

- Na upřesnění uživatele nahrazeno předchozí trvale modré pozadí. Celý mobile-only root nyní používá skutečnou `--mrd-orbit-phase-color` jako barevný základ a existující v3 artwork přes nativní `background-blend-mode: luminosity`. Horní mlha, střed i spodní konturová vlna dostávají odstín a sytost fáze, světlo a struktura zůstávají z podkladu. Nejde o přebarvení pouze kruhu, filter na celé UI, nový bitmapový asset ani změnu tématu aplikace.
- `background-size: cover` zachovává proporce obrázku a pokrývá i delší scroll canvas malého telefonu bez jasného jednobarevného pruhu pod koncem rastru. Zesvětlen pouze drobný kontext hlavičky a text Živě; skutečně připojený stav má nadále samostatnou zelenou tečku. Tlačítka, personál, text fáze a ikony se jako celek nefiltrují.
- Skutečná aplikace 390 × 844 px / DPR 1: na uživatelově otevřeném EXTERNÍ ANESTEZIE byl pozorován vínový celý výkon a zelené celé Ukončení výkonu (#009e03); změny jeho živých dat nebyly vyvolány ani vraceny QA. Computed root background odpovídá rgb(0,158,3), blend luminosity. Finální screenshot `output/mobile-orbit-qa/full-phase-background.jpg`. Podklad zůstává `public/images/mobile-orbit-background-v3.png`; původní grafická reference a rozměry jsou v předchozích sekcích.
- 320 × 568 px: žádný vodorovný overflow, obsah 766 px, scroll na konec 198 px. Screenshot `output/mobile-orbit-qa/full-phase-background-320-bottom.jpg` potvrzuje fázové pozadí až po spodní okraj a dosažitelné akce/personál nad dockem. Dočasný viewport resetován. Fonty, velikosti, rozložení, skutečné copy a klinická navigace ponechány; nové pozadí je úmyslná korekce barev původní modré předlohy. Text zůstává ostrý, rastrová vlna bez natažení; žádný nový render efekt přes ovládání.
- 86/86 cílených testů prošlo včetně plného root pozadí, cover/local scroll kontraktu, oddělených výstrah, všech fázových ikon, navigace a klinických guardů. Produkční Webpack sestavení a whitespace kontrola prošly. 21st lookup nebyl dostupný; existující CSS/raster/primitives znovu použity, review uvádí pouze informační barvy již zvoleného designu. Starší nesouvisející chyby širší mobile sady nejsou změněné.
- Pouze prezentační CSS a testy, bez změny RoomDetail klinické logiky, backendu, nastavení zařízení, commitu nebo nasazení. QA neprovedlo žádnou vlastní klinickou akci.

---

## 2026-10-15 — Korekce modré palety a tematické ikony jednotlivých fází

final result: passed

### Zjištění a opravy

- [P2, opraveno] Předchozí v2 podklad byl zejména dole světlejší a modřejší než originál. Nový `public/images/mobile-orbit-background-v3.png` je čistá extrakce přímo z původní reference, bez statického UI. Na 21 nezakrytých bodech se průměrná absolutní RGB odchylka snížila z 9.83 na 3.63 / 255 (63% pokles měřené chyby, nikoli tvrzení o shodě všech pixelů). Např. bod 840/1010: reference 21,26,72; v2 26,32,86; v3 19,23,69. Tmavá dolní plocha a indigo mlha již nemají předchozí výrazné zesvětlení.
- [P2, opraveno] Aktivní kruh měl pevný modrý accent a uprostřed byl vždy skalpel. Nový čistý prezentační helper rozlišuje připravený sál/přípravu, příjezd, anestezii, konec anestezie, výkon, konec výkonu, odjezd, předání, úklid a dokumentaci. Připravený sál/příprava používá skutečný rastrový operační stůl, výkon stávající skalpel. Ostatní fáze používají odpovídající instalované linkové ikony; příjezd/odjezd odlišuje i směrová šipka. Neznámá uživatelská fáze má neutrální symbol, ne vymyšlený skalpel.
- [P2, opraveno] `--mrd-orbit-phase-color` nyní přijímá skutečné `accent_color`, případně `color` aktuální konfigurace. Aktivní oblouk a uzel používají tuto přesnou hodnotu, ikona zesvětlený odstín téhož barevného základu kvůli čitelnosti. Odstraněna pevná modrá i její nouzové/pauzové přepisy. Výstrahy, disabled guardy a potvrzení zůstaly samostatně; pauza/finální zámek neodstraňují tematickou ikonu fáze a mají vlastní malou stavovou značku.

### Vizuální evidence a pět kontrolovaných povrchů

- Zdroj: `/Users/jaroslavjedlicka/Desktop/nový design /mobil/8f4eaf9b-cf3e-4ec4-bf7f-3468ca9fafb7.png`, 853 × 1844 px, normalizovaný na 390 × 844 CSS px při DPR 1. Zdrojový soubor nezměněn. Skutečná přihlášená aplikace `http://localhost:3000/`; uložené Cliniq/dark preference zůstaly.
- Celkové srovnání: `output/mobile-orbit-qa/comparison-phase-palette.jpg` (vlevo zdroj, vpravo skutečný výkon). Detailní srovnání kruhu/ikony: `comparison-phase-icon.jpg`. Rozdílný počet šesti skutečných fází a vínová namísto ilustrační modré aktivní fáze jsou úmyslné splnění uživatelova nového požadavku, nikoli statická kopie dat z obrázku.
- Reálné snímky: `detail-phase-ready.jpg` (PCHO, stůl, #00ffee), `detail-phase-surgery.jpg` (Traumatologie, skalpel, #b3004d), `detail-phase-finished.jpg` (Ortopedie, clipboard-check, #009e03) a `detail-phase-cleaning.jpg` (Ortopedie, koště, #ff791a). Přímá sestava tří skutečných telefonních snímků: `phase-colors-preview.jpg`. Vše ve stejné složce, 390 × 844 px bez zařízení/chrome. V průběhu QA se Ortopedie skutečně aktualizovala na úklid; současná změna ikony i barvy byla pozorována bez našeho stisku klinického ovládání.
- Fonty/typografie: původní systémový iOS stack, velikosti/váhy i zalamování ponechány. Žádné nové truncation ani dělení názvů. Aktuální text fáze zůstává bílý a nepřebírá málo kontrastní tmavou barvu.
- Spacing/layout: neměnná 64 × 64px ikonová oblast uvnitř 160 × 132px potvrzovacího tlačítka, původní rozmístění kruhu, časů, akcí a docku. 320 × 568: bez vodorovného overflow, klient 568 / obsah 766 px a ikona 64 × 64 px, důkaz `detail-phase-ready-320.jpg`. 390 × 844: bez vodorovného overflow. Desktopový blok JSX až do EOF je byteově shodný s HEAD (nezávislá kontrola), nové CSS zůstává pod 768px.
- Barvy/tokeny: čistý modro-indigo podklad v3, lokální data-driven phase token, přesná barva aktivního oblouku/uzlu a čitelná světlejší ikona. Například computed stroke výkonu rgb(179,0,77), připraveného uzlu rgb(0,255,238), ukončení rgb(0,158,3). Chybějící/neplatná barva má neutrální fallback; nepřijímá libovolný CSS text.
- Obrazová kvalita/ikony: `mobile-orbit-operating-table.png` má 256 × 256 px a skutečnou průhlednost; CSS alpha maska včetně `-webkit-mask` zachovává kresbu a dovoluje obarvení bez cizího pozadí. Stejně obarven referenční skalpel. Ostatní symboly jsou existující Lucide, žádné ručně kreslené SVG nebo oborové orgány. P3 zůstává drobná odlišnost generované textury od originálu a jemnější tah operačního stolu; netvrdí se bitová totožnost celé stránky.
- Copy/obsah: skutečné uložené názvy, pořadí a počet fází, stav spojení, personál a časy bez přejmenování. Rozpoznání ikon je pouze prezentace dle normalizovaného českého/anglického názvu, ne klinická logika nebo změna indexů. Vlastní názvy mají bezpečný fallback.

### Funkční a automatická kontrola

- 85/85 cílených testů prošlo: klinické callbacky/guardy, akutní start a navigace, všechny tematické druhy a normalizace, změna pořadí bez změny významu, skutečné barvy včetně samostatné urgence/pauzy/zámku, maska v iOS a původní geometrie. TypeScript bez emit, produkční Webpack build a `git diff --check` prošly. Nezávislá read-only kontrola nezjistila blokující problém; 21st review uvádí zejména již existující desktopové motion poznámky a barvy závazné reference, nikoli nový blokátor.
- Prohlížeč otevřel pouze existující sály, místní varování a zpětnou navigaci. Žádná vlastní změna fáze, času, pacienta, personálu ani nastavení; živé uživatelské změny se nevracely. V závěrečném úseku QA nebyla zachycena nová console warn/error. Klinické ovládání nebylo v živé databázi testováno zápisem; jeho chování pokrývají izolované testy. Dřívější tři nesouvisející širší mobile-test chyby přetrvávají, celá repository sada se neoznačuje za zelenou.
- Bez backendové/auth změny, nového balíčku, migrace, commitu nebo nasazení. Dočasný viewport je po QA resetován.

### Vytvořené podklady

- Built-in imagegen, nikoli CLI: `public/images/mobile-orbit-background-v3.png`, 853 × 1844 px. Finální prompt: „Use case: precise-object-edit. Remove all interface elements from this screenshot to recover ONLY the original background. Keep absolutely every existing unobstructed background pixel's color, brightness, gradient, position and texture UNCHANGED. Do not recolor, do not restyle, do not enhance. Keep exact 853×1844 canvas. Inpaint ONLY the UI elements away: remove header text, back button, bell, live indicator, all labels, entire circular diagram with all rings, ticks, nodes, progress glows, central scalpel, plus/minus buttons, timing numbers and labels, all four pastel action cards, staff pill, bottom navbar. No UI may remain, not even ghost impressions. Reconstruct underneath from neighboring original background pixels. Preserve original soft blue-violet upper mist and dark navy lower half exactly; do not brighten at all. Preserve the flowing S-shaped dark lower wave at y990–1050 and very fine contour lines. Original source RGB background must be unchanged, no extra blue, saturation, contrast, grain, glow or vignette. Entire output is full-bleed original background only.“ Původní v1/v2 soubory zachované.
- Built-in imagegen: `public/images/mobile-orbit-operating-table.png`, 256 × 256 px. Finální zadání: minimalistická tenká monoline ikona chirurgického stolu z boku, segmentovaná deska se zdviženým hlavovým dílem, centrální stavitelný podstavec, nízká základna se dvěma kolečky, zaoblené spoje; bez zábradlí, polštáře, lidí, textu či pozadí. Tmavě modré tahy s průhlednými vnitřky pro obarvení CSS alpha maskou.

---

## 2026-10-15 — Mobilní detail podle vybrané fialové předlohy

**Výsledek: passed.** Skutečný mobilní RoomDetail, nikoli izolovaný návrh. Desktopová JSX větev zůstala beze změny. Žádný commit, nasazení, migrace nebo vlastní klinický zápis při QA.

### Zdroj a srovnávací evidence

- Zdroj: `/Users/jaroslavjedlicka/Desktop/nový design /mobil/8f4eaf9b-cf3e-4ec4-bf7f-3468ca9fafb7.png`, 853 × 1844 px. Pro porovnání normalizován na 390 × 844 CSS px při DPR 1; originál nebyl měněn.
- Skutečná přihlášená aplikace `http://localhost:3000/`, otevřená TRAUMATOLOGIE - 1, uložené Cliniq/dark preference ponechány. Nemocniční konfigurace má šest fází, nikoli osm ilustračních fází předlohy. Screenshot zachycuje skutečný Chirurgický výkon, běžící čas a odhad 15:30, ne statické hodnoty z obrázku.
- Finální implementace: `output/mobile-orbit-qa/detail-390.jpg`. Přímé porovnání (vlevo předloha, vpravo aplikace): `output/mobile-orbit-qa/comparison-390.jpg`. Detailní výřezy: `comparison-dial.jpg` a `comparison-controls.jpg` ve stejné složce.
- Responzivní evidence: `detail-320.jpg`, `detail-320-bottom.jpg`, `detail-430.jpg`, `detail-landscape.jpg`, `detail-desktop.jpg`. Tyto rozměrové snímky předcházejí pouze finálnímu doladění odstínu podkladu a zvětšení dekorativních rolových glyfů; geometrii a funkce mají stejné.

### Kontrola věrnosti a opravy

- Rozložení 390 × 844: hlavička 96 px, kruhová oblast y=114–464, časy y=514–584, akce y=598–672, personál y=686–741, dock x=16.92/y=748.85/šířka=356.16/výška=70 px. Zachována hierarchie předlohy, kruhová tlačítka ±, čtyři pastelové akce, dělená personální kapsle a samostatný spodní pill dock.
- Typografie: skutečný systémový iOS stack `-apple-system, system-ui, SF Pro Text, Segoe UI, sans-serif`, lehká časová čísla, lehké centrované nadpisy, bez dělení písmen nebo ořezání skutečných názvů. Žádné oborové/anatomické ikony. Funkční ikony z existující knihovny; skalpel, hygiena, lékař a sestra jsou lokální průhledné rastrové podklady inspirované dodanou referencí.
- P1 opraveno: starší `.m-dark .mobile-room-detail` přes `!important` mazal celý nový podklad. Nový přesně omezený selector přepisuje background i aspect-preserving velikost. P2 opraveno: boční názvy fází se nyní zarovnávají vně uzlů, ne přes uzly. Doplněny chybějící vnitřní/vnější stupnice a reference-like rolové glyfy; zmenšený skutečný obsah v průhledných ikonách opticky zvětšen bez změny velikosti klikací plochy.
- Barevnost: fialovo-indigo mlha, tmavá spodní plocha a konturová vlna jako lokální raster; druhá barevná iterace přiblížila tón předloze. Pozadí se neprotahuje podle výšky displeje, ale drží svůj poměr stran. Skutečná aktivní fáze dále respektuje nastavenou nemocniční barvu; urgence, uzamčení a pauza mají srozumitelnou prioritu.
- Zbývající P3 odchylky: nově vytvořený čistý podklad není bitově totožný se zdrojovým obrázkem; jemná textura/kontury a některé knihovní glyfy (zejména postel/dveře/kalendář) se mikrotvarem liší. Systémový font se může na jiném OS rasterizovat odlišně. Neuvádí se proto tvrzení o 100% pixelové identitě.
- Záměrné datové rozdíly nejsou maketa: přesné uložené názvy, šest skutečných fází, reálný odhad a timer, disabled Příjezd po odpovídajícím stavu, červený bod pouze při skutečné zprávě/urgenci a „Živě“ pouze při skutečně připojeném realtime. Vývojářský Next.js indikátor překrývající zvonek není součást produkčního designu.

### Responzivita, přístupnost a funkce

- 320 × 568: scrollHeight 766 px, bez vodorovného overflow; po odrolování jsou všechny čtyři akce i obě role nad dockem. 390 × 844 a 430 × 932: obsah bez vodorovného overflow. 767 × 430 landscape: svislý scroll 930 px, dosažitelný personál nad dockem. 1280 × 800: mobilní detail i nový dock jsou `display:none`, původní desktop beze změny.
- Klinické ovládání má minimálně 44px cíle, pojmenované buttony, focus-visible a respektuje reduced motion. Dekorativní rastry jsou `alt="" aria-hidden`, dynamická fáze je oznámená a pořadí je sémantický seznam. Názvy se zalamují pouze mezi slovy; malé obrazovky používají scroll, ne plošné zmenšování dotykových ploch.
- Otevřeno a zrušeno existující potvrzení další fáze, otevřen a zavřen výběr lékaře a nabídka Více. Žádná fáze, přiřazení, pauza, hygiena, pacient ani odhad nebyly při prohlížečové QA změněny. Dismiss místního rychlého-varování pouze zavřel komponentu. Dock používá stejné oprávněním filtrované moduly; nedostupné cíle se nevymýšlejí.
- Klinické callbacks, audit, pause/final-lock guardy, ±15 min debounce a atomický akutní start zůstaly zachované. Nastavení vzhledu není resetováno. React kontrola: stabilní hook pořadí, úplné memo dependencies, bez nového klinického efektu, API nebo duplikovaného časovače.

### Automatické ověření

- 63/63 cílených testů detailu, orbit CSS, docku, společného mobilního kontraktu a akutního startu/navigace prošlo. TypeScript `--noEmit --incremental false`, produkční `npm run build -- --webpack` (26 statických stránek) a `git diff --check` prošly.
- Širší mobilní sada obsahuje tři dřívější nesouvisející selhání: `mobile-ios-shell` (search selector), `mobile-overview` (zastaralé očekávání superadmin výjimky) a `mobile-statistics-style` (heading NotificationsTab). Nejde o tvrzení, že celý již rozpracovaný repozitář má zelenou celou sadu.
- Použit Image-to-code/design QA postup: skutečné viewporty, přímé porovnání a detailní výřezy. Imagegen vytvořil lokální bitmapové podklady, funkční SVG kreslí pouze skutečná workflow data. 21st katalogový lookup nebyl dostupný; použity již instalované komponenty a dodaná závazná reference. Nebyla přidána nová závislost ani změněna desktopová grafika.

---

## 2026-10-08 — Oprava hlášeného selhání startu akutního cyklu

- Skutečná tabulka workflow_statuses obsahuje accent_color, nikoli color. Nová start RPC nesprávně vybírala coalesce(accent_color,color), takže se před klinickým UPDATE vracela PostgreSQL chyba 42703 skrytá bezpečnou API zprávou. Předchozí syntetické testovací schéma mělo vymyšlený sloupec color a tuto chybu neodhalilo; nyní odstraněn.
- Opravná CLI migrace 20261008195723_fix_acute_cycle_workflow_color.sql nahrazuje výhradně tento lookup existujícím accent_color. Statický test potvrzuje shodu veškeré ostatní start transakce a grantů. Izolovaný PostgreSQL nejprve reprodukuje původní selhání bez změny verze/fáze/vazeb a následně ověřuje opravený skutečný start, barvu z nastavení, idempotenci, souběh, izolaci a dokončení. API a obrazovky se nemění.
- Oprava nainstalována do skutečně nakonfigurovaného projektu. Read-only dotazy potvrdily nový lookup, SECURITY INVOKER, execute pouze pro service_role a existující nastavenou barvu Příjezd na sál. Sál č. 7 zůstal připraven a vazby před klinickým použitím prázdné; žádné skutečné potvrzení příjezdu ani jiná klinická změna nebyla testována.
- Nezávislá kontrola ověřila ostatní odkazované sloupce, práva a pořadí triggerů bez dalšího zjištěného blokátoru. Poradce neuvádí nový problém opravené funkce; předchozí nesouvisející upozornění se v tomto úzkém fixu nemění. Pro server-only tabulky je absence klientských RLS policies záměrná při odebraných grantech.

---

## 2026-10-08 — Trvalé přiřazení akutního požadavku ke skutečnému cyklu

- Otevření požadavku zůstává navigační; až výslovně potvrzený přechod připraven → příjezd volá atomickou serverovou RPC se skutečným sálem a očekávanou revizí. Start, autentizační a tenantové kontroly i neměnná vazba jsou jedna transakce. Chyba nevytvoří náhradní běžný cyklus, dvojí potvrzení nevytvoří dva. Změna zařízení/účtu nedovolí promítnout pozdě vrácený výsledek do nového rozsahu. Detail ověřuje výsledek před resetem časovače a pomocnými zápisy.
- Dokončení doplní interní trigger podle skutečného operation_end při standardním návratu do připravené fáze, včetně úklidu na jiné stanici. V běžném dokončeném bloku Timeline malý neutrální glass popisek #N · Akutní · výkon s bodem urgence. Text v úzkém bloku se zkrátí, délka/phase colors/click celého cyklu se nemění. Mobil zachovává všechny sály, kompaktní označení a úplný přístupný popis. Již přiřazený požadavek se neopakuje jako odhad. Pořadník se automaticky neuzavírá. Dosavadní nouzový/uzamčený overlay zůstává beze změny.
- Použity zásady 21st: existující tokeny, schválený průsvitný room ribbon, žádná nová závislost nebo animace. React kontrola: úplné memo dependencies, stabilní refresh callback, oddělené SWR klíče podle tenant/user/role/okna, cleanup a debouncing realtime. Samostatná neměnná DB vazba není odvozena z názvu, odhadu, nejbližšího času ani omezeného queue snapshotu.
- 155/155 automatických regresí prošlo (celý akutní modul, mobilní layout a standardní Timeline řádek), TypeScript a whitespace check čisté. Skutečný izolovaný PostgreSQL ověřuje CAS, souběh, idempotenci, tenant/role/membership/module checks, skutečný start/konec, rollback při chybějícím záznamu, neměnné snapshoty, obě nepřípustné půlky konce a načtení 205 dokončených cyklů. Následná kontrola 8/8 backend testů reprodukuje zděděné Supabase granty a ověřuje jejich zúžení. Kontrola 21st nového hooku/popisku/CSS/ribbonu bez nálezů; starší globální review zjištění se plošně nepřepisují.
- Obě additive migrace instalovány do projektu odpovídajícího lokální konfiguraci. Read-only SQL potvrzuje RLS, nulové vazby před klinickým použitím, klientům nepřístupné tabulky/RPC, service SELECT/INSERT bez UPDATE/DELETE a správné pořadí triggerů. Reset s existujícími vazbami je před zápisem zablokovaný. QA nevytvořilo žádný skutečný klinický požadavek, nepostoupilo fázi a neuzavřelo cyklus.
- Browser 1543 × 1109: existující PŘEVAZ VAC otevře skutečný SÁL Č. 4 a při již rozběhnutém chirurgickém výkonu poctivě ukazuje „Vybráno pro další cyklus“ / „Přiřazení při dalším příjezdu pacienta“. Zavření vrací stejnou Timeline a fokus na původní odhad. Evidence `output/acute-qa/acute-cycle-next-selection.jpg`. Vizuální důkaz dokončeného skutečného akutního cyklu v živé DB se zde netvrdí: nebyl klinicky proveden při QA a starší cykly se zpětně nevymýšlejí. Dokončení a render označení jsou ověřené izolovanými DB a skutečnými komponentovými testy. Žádný commit nebo nasazení aplikace.

---

## 2026-10-08 — Sjednocení akutní lišty s grafikou detailu sálu

- Na výslovnou korekci uživatele odstraněn odmítnutý samostatný modrý panel, jeho obrys/blur/stín i vnitřní barevná plocha vybraného požadavku. Lišta je nyní přímo na původním fázovém plátně. Podle pravidel 21st znovu použity skutečné vizuální parametry okolních akcí detailu: neutrální přibližně 5% bílá průsvitná plocha, jemný 10% obrys a 16px rohy. Vybraný nadpis má lehčí 20–26px sazbu; další názvy 15px, podpůrné texty 11–12px. Barvy urgence zůstávají v textu/bodech, bez dekorativní záře. Mezi sousedními ovládacími prvky pouze jemná linka.
- Změněn jen lokální CSS module a regresní design test; komponenta, data, pořadí, názvy sálů, focus, navigace, fáze i klinické handlery beze změny. Mobil používá skutečné m-card/m-border tokeny, názvy i footer se mohou zalomit a horizontální seznam zůstává přístupný. Reuse místních prvků bez generování, nové závislosti nebo exportu projektového kontextu do katalogu.
- TypeScript, whitespace check a 53/53 cílených testů kontextu/ribbonu/navigace/Timeline/integrace/mobilního layoutu prošly. Lokální 21st review ribbonu a CSS: 2 soubory, 0 nálezů. Nový kontrakt hlídá transparentní borderless shell, neutrální glass ovládání shodné s detailem, větší text a wrap footeru; všechny dosavadní kontrakty kontextu/navigace zůstávají. Nezávislá read-only kontrola potvrdila scope, equal-height flex položky, wrap footer a viditelný focus bez požadavku další opravy.
- Skutečná přihlášená aplikace 1543 × 1109: lišta x=128, y=160–290.3, středový kruh začíná y=373.0 (82.7px odstup). Vnější background rgba(0,0,0,0), border 0px; oba viditelné ovládací prvky 256 × 90.3px, bílá výplň alpha .04745, nadpisy 15px a žádný textový overflow. Evidence `output/acute-qa/acute-room-queue-style-aligned.jpg`. QA otevřelo pouze existující APPE; žádné klinické tlačítko, submit nebo změna skutečných dat. Menší viewport se zde vizuálně netvrdí; mobile/short-layout fallback zůstává z předchozí implementace.

---

## 2026-10-08 — Akutní požadavek otevírá detail sálu s přehledem fronty

- Barevný požadavek v desktopové i mobilní Timeline otevírá stávající RoomDetail při zachování namountované časové osy a jejího časového okna. Kontext používá stejný tenant-scoped SWR zdroj; filtruje aktivní požadavky a následující řadí dle aktuálního provozního pořadí. Guard hlídá zařízení, účet, zapnutý modul i obě oprávnění; ukončený, přeřazený nebo nedostupný požadavek se nezobrazuje jako stále platný.
- 21st: pod názvem sálu jemný glass ribbon, vybraný výkon vlevo a horizontální dráha dalších požadavků s aktuálním pořadím, urgencí, skutečným názvem sálu a odhadem. Původní číslo zápisu je od provozního pořadí výslovně odlišené. Žádné vymyšlené začátky, nová animace či závislost. Normální detail z dashboardu má původní rozložení; jen akutní vstup rezervuje místo nad kruhy. Mobilní kontext je ve svislém toku s přístupným overflow fallbackem.
- React kontrola vedla k zachování SWR, immutable řazení, úplným memo závislostem a aktualizaci memo comparatoru detailu. Podklad je při otevřeném detailu inert; fokus míří na neklinické zavření, nikoli na fázi, a vrací se na skutečný opener. Doplněn focus-visible obrys středového tlačítka. Samotné otevření/přepnutí nezapisuje stav, nezačíná operaci a nepředstírá trvalé DB propojení požadavku s cyklem.
- TypeScript prošel; 42/42 kontextových, ribbon, Timeline, integračních a mobilních layout testů, navíc 10/10 kontraktů navigace. Lokální 21st review nového ribbonu a CSS: 0 nálezů. Širší review převážně uvádí dosavadní lokální barvy/motion; nalezený chybějící focus středového tlačítka byl opraven. Žádné plošné automatické přepisování okolního UI.
- Skutečná přihlášená aplikace, 1543 × 1109: otevření existujícího APPE ukazuje jeho kontext a následující PŘEVAZ VAC v SÁL Č. 4, přepnutí funguje a již existující fáze Příjezd na sál zůstává beze změny. Později přidaný uživatelův URS se promítl do fronty; kliknutí otevřelo skutečný SÁL Č. 7 ve stávající fázi Sál připraven bez posunu cyklu. Heading končí y=111.5; ribbon y=160–272.6; středový kruh y=373–835.9; časové ovládání y=843.9–921.5; rail y=1051.5–1077: bez překryvu. Zavření vrací stejnou Timeline a původní požadavek. Evidence `output/acute-qa/acute-room-queue-detail.jpg` nyní obsahuje oba následující požadavky. Browser nereflektoval dočasný menší viewport (override resetován), proto se zde netvrdí nové mobilní/tabletové vizuální ověření.
- QA pouze navigovalo již existující uživatelovy požadavky, pořadí a záznamy nebyly měněné ani vracené. Žádný vlastní klinický submit, migrace, commit nebo nasazení.

---

## 2026-10-08 — Pořadí zápisu akutního požadavku v Timeline

- Zachován schválený vzhled dle 21st: 28px drobný štítek `#N` v levém podbarveném popisku, stejné číslo uvnitř odhadového bloku, čitelný popis Pořadí při zápisu v tooltipu/aria-label. Úzký 30min blok ponechá číslo i délku; šířka odhadu a 44px řádek se nemění. Mobilní štítek je kompaktní a používá současné textové tokeny pro dark/light.
- Číslo je původní pozice z neměnného create auditu, nikdy aktuální ručně změněný queuePosition ani index viditelných řádků. Server používá nedávný audit bez dalšího dotazu; chybějící starší create načte tenant-scoped a indexovaným request_id filtrem po 100 ID. Neověřený údaj zůstává null/—. Volitelná chyba čtení neoznačí již potvrzené uložení za neúspěch. Supabase/postgres skill vedl k minimálnímu výběru sloupců, dávkám a zachování serverového ověření zařízení; bez migrace, zápisu do DB nebo nového oprávnění.
- TypeScript, whitespace a 21st review (2 soubory, 0 nálezů) prošly. Cílené testy zahrnují původní číslo po přeřazení, GET/POST, doplnění staršího auditu, 100/100/5 dávky, scope, invalid/missing data, chybu optional read, desktop/mobile SSR, ořez bez přečíslování a všechny předchozí UI/layout/mobilní regresní kontrakty.
- Skutečný localhost zobrazuje původní čísla #1/#2/#3. Všechny tři popisky i názvy bez overflow, bloky 43px v 44px řádcích; šířky 61.94/123.88/30.97 px a čísla uvnitř krátkého i dlouhého bloku bez overflow. Evidence `output/acute-qa/timeline-entry-order.jpg`. Pouze čtení již existujících dat přes aplikaci; žádný vlastní klinický submit, změna pořadí, commit či nasazení.

---

## 2026-10-08 — Barevný popisek a plná výška akutního odhadu v Timeline

- Levý popisek má jemný přechod 13 → 5 % v barvě urgence, tenkou boční linku a neutrální světlé písmo místo drobného barevného textu. Emergentní rose, urgentní zelená, časný sky-blue odpovídají schváleným kartám. Odhadový blok má čistý solid obrys a jemný přechod bez šrafování; track se natahuje přes celý původní 44px řádek, blok má 43px po odečtení spodního oddělovače. Změna pouze vzhledu a vysvětlujícího textu, ne časů nebo klinických záznamů.
- Container queries zachovávají reálnou šířku odhadu: krátký blok ukáže číslo, delší odhad + minuty a dostatečně široký i název. Úplné informace zůstávají v levém sloupci, tooltipu a aria-label. Zachován focus, oddělené překrývající se požadavky, mobilní tmavé/světlé textové tokeny a všechny skutečné sály.
- 68/68 cílených akutních a mobilních regresních testů, TypeScript a 21st review (2 soubory, 0 nálezů). Nové kontrakty palety, čitelného textu, plné výšky, absence šrafování a nezvětšování délky. Použity současné komponenty/tokeny dle 21st, bez závislostí či odesílání kontextu do katalogu.
- V přihlášené skutečné aplikaci na localhost ověřeny všechny tři urgence: výška bloků 43px ve 44px řádcích, šířky 60/120/30 minut = 61.94/123.88/30.97 px, neutrální text rgba(255,255,255,.95), jemný barevný label a solid obrys. Screenshot `output/acute-qa/timeline-request-styling.jpg`. Pouze čtení DOM a screenshot již existujících uživatelových požadavků; žádné uložení, migrace, commit nebo nasazení.

---

## 2026-10-08 — Akutní požadavek na ose v čase zadání

- Čárkované aktivní požadavky v desktopové i mobilní Timeline jsou od serverového `receivedAt`, ne od nepovinného `proposedStartAt`. Odhad končí po uloženém počtu minut (nová volba nad 60 = 120 min). Editace, změna pořadí a současný čas nemění okamžik zadání. Žádná změna záznamů, migrace či automatické rezervace. Akutní modul používá tutéž bázi v záložce Časová osa; ruční začátek již neskrývá nový požadavek. Souhrn nepřiřazených počítá chybějící sál, ne chybějící navržený čas.
- Reuse 21st: současné čárkované průhledné řádky s 44px targetem, stávající tokeny, ovládání a text zadání/odhadu. React Best Practices: bez nového fetch/effect, zachované SWR a memo dependencies, immutable filtered sorting, stabilní request keys, nezanořená klávesnicově přístupná tlačítka. 21st review: 34 nálezů, 33 informačních barev a jeden stávající warning hover-scale v nesouvisejícím filtru Timeline; bez automatického přepisování okolního UI.
- 47/47 cílených UI/layout/palette/integration/timeline testů a dalších 19/19 mobilních layout/accessibility regresí, TypeScript i diff whitespace check prošly. Null navržený čas se správně zobrazí; legacy plánovaný začátek ignorován pro pozici bloku; přesné sekundy/ms/timezone, změna pořadí/updatedAt, ořez okna, 120min projekce, mobilní zobrazení všech 15 sálů a module/error gating. Žádný zásah do skutečných cyklů, capacity inputs či statistik.
- Skutečný localhost obsahoval uživatelem zadané APPE požadavky 17:18/60 min pro PCHO SÁL Č.2 a 17:32/120 min pro SÁL Č.4. Oba viditelné v Timeline ve správném časovém sloupci (desktop block widths 61.94/123.88 px, poměr 1:2) a v časovém seznamu akutního modulu. QA pouze navigace a DOM/screenshot; žádný vlastní POST nebo změna těchto požadavků. Evidence `output/acute-qa/timeline-request-receipt.jpg`.

---

## 2026-10-08 — Volba nad 60 minut používá odhad 120 minut

- Na výslovnou korekci uživatele odstraněno pole přesného času. Více než 60 min při výběru nastavuje 120 minut; formulář transparentně uvádí plánovací odhad, nikoli skutečně naměřený čas. Do 30/60 min a vzhled dle 21st zůstávají stejné. Bez nových komponent nebo závislostí. Starší záznamy se hromadně nemění; editace bez změny volby zachovává evidovaný odhad. Nové formuláře používají 120 i při obnově vývoje s rozpracovanou starší volbou.
- 46 cílených testů: nový integrační kontrakt vede volbu přes skutečný převod intake do skutečné projekce Timeline a potvrzuje dvě hodiny / 50 % čtyřhodinového okna. Zůstává označení Návrh — nepotvrzeno, korektní ořez okna, bez vymyšleného začátku a bez zásahu do skutečných operačních cyklů. TypeScript a whitespace check; 21st review jen 75 informačních poznámek stávajících barev.
- Skutečný localhost: přepnutí Do 30 min → Více než 60 min ukazuje 30 → 120 min, dialog má nula spinbutton/číselných vstupů. Evidence `output/acute-qa/duration-over60-120.jpg`. QA bez uložení klinického požadavku, bez migrace, commitu nebo nasazení. Toto rozhodnutí nahrazuje níže popsané zadávání přesného odhadu nad 60 min.

---

## 2026-10-08 — Široký a zjednodušený formulář akutního výkonu

- Create/edit má vlastní `acute-dialog-intake` šířku max. 1320px a dva sloupce. Vlevo název + odhad, skutečný seznam sálů a popis; vpravo plně popsané ikonové priority a případné emergentní upozornění. Editace řadí popis a důvod vedle sebe, zrušení návrhu sálu sdílí řádek s vysvětlením. Ostatní detail/reorder popupy zůstaly ve stávajícím Timeline shellu a původních rozměrech.
- Na žádost uživatele odstraněny ovládací prvky interní reference, klinického rozhodnutí i celého termínu/návrhu času. Nové požadavky mají tyto údaje prázdné/null; editace drží přesné původní hodnoty včetně sekund, milisekund a timezone. Zrušení sálu odstraní i jeho navržený čas stejně jako dříve. Zachované role, required priority, privacy upozornění a audit reason; žádná migrace nebo vlastní testovací submit.
- Browser na skutečném localhost:3000 s 15 nastavenými sály: create v 1280 × 720 včetně emergentního upozornění nemá vertikální ani horizontální overflow; editace včetně důvodu a emergentního upozornění v 1024 × 720 má body clientHeight = scrollHeight = 582px a panel 976 × 666px. Edit v 1920 × 1080 rovněž bez overflow. Finální create v 1543 × 1109 má body clientHeight = scrollHeight = 572px a všech 15 voleb. Tlačítka jsou v každém těchto stavů uvnitř viewportu. Dočasný viewport resetován. Extrémně malá obrazovka/zoom/velké počty sálů mají přístupný scroll fallback, ne skryté informace.
- Evidence: `output/acute-qa/landscape-intake-final.jpg`, `landscape-intake-1280.jpg`, `landscape-edit-1024.jpg`. Testování používalo otevření a změnu lokálního draftu, ne vlastní uložení; uživatel současně pracoval se skutečnou frontou, jeho změny nebyly vraceny.
- 43/43 cílených UI/layout/integration/palette/timeline testů, TypeScript a diff whitespace check prošly. Přidány kontrakty odstranění polí, prázdných nových hodnot, přesného zachování starších hodnot a vlastního landscape layoutu. `21st review`: 75 informačních poznámek stávající palety, bez warning/error. Reuse Radix, Lucide a skutečného Timeline stylu; bez externího exportu projektového kontextu, závislostí, commitu nebo nasazení.

---

## 2026-10-08 — Korekce: pouze nastavené sály ze skutečné aplikace

- Na výslovnou opravu uživatele odstraněny všechny vlastní převody názvů na zkratky a rozlišovací čísla. Boxy zobrazují přesný `room.name`; radio hodnotou je nezměněné ID. `App` předává tentýž hospital-scoped seznam do Akutních výkonů a přes SettingsPage do OperatingRoomsManager. Výběr kopíruje jeho uložené pořadí `sort_order`, bez mutace seznamu nebo konfigurace.
- Full labels se zalamují v kompaktních 136px širokých boxech, bez truncation. Zůstává nativní radio, required, disabled, focus outline, fajfka a stávající Timeline paleta. Žádný nový fetch, efekt, závislost nebo změna oprávnění.
- Odstraněn vymyšlený seznam 13 sálů z izolovaného QA na portu 4189. Offline náhled bez zdroje nepředstírá konfiguraci zařízení; nabízí odkaz na skutečnou aplikaci. Syntetické požadavky zůstávají pouze v tomto jasně označeném offline QA, ne v databázi.
- Browser ověření proběhlo ve skutečné přihlášené aplikaci na localhost:3000: všech 15 aktuálně nastavených sálů, včetně jediného sdíleného ORL - ÚČOCH - OČNÍ. Výběr PCHO SÁL Č.2 ukázal jeho skutečné ID `room-11` a nastavený popis CÉVNÍ, DĚTSKÉ, MAMMO; žádná konverze na CHIR 2. Žádný požadavek se neuložil. Evidence: `output/acute-qa/configured-room-options.jpg`.
- 41/41 cílených UI/design/integration/timeline testů a TypeScript prošly. Nový kontrakt hlídá společný zdroj, uložené pořadí, přesné dlouhé/duplicitní názvy a absenci fiktivních preview sálů. `21st review`: pouze 75 informačních připomínek stávající lokální palety. Žádná změna klinických dat, commit nebo nasazení.

---

## 2026-10-08 — Kompaktní výběr operačního sálu (historie, odvozené zkratky níže nahrazeny korekcí výše)

- Volný text „Operační obor“ a druhý select navrženého sálu nahrazené jednou přehlednou, zalamující se řadou letter-icon boxů. Zkratky se odvozují pouze z předaných aktuálních sálů; full name je v aria-label, tooltipu a v popisu zvoleného sálu. Sdílené sály (např. ORL / ÚČOCH / OČNÍ) jsou jedna skutečná volba, nikoli tři fiktivní místnosti; duplicitní zkratky se rozliší číslem. Žádná změna konfigurace ani identity sálů.
- Explicitní výběr atomicky doplní skutečný `proposedRoomId` a nastavený department (při chybějícím departmentu plný název sálu). Nový požadavek vyžaduje sál; starý požadavek bez návrhu není automaticky přiřazen podle oboru. Edit zachovává původní údaje a dovoluje zrušit návrh včetně navrženého času. Chybějící sál a prázdná konfigurace mají vysvětlení; nová tvorba bez sálů je disabled. Výběr je stále návrh, nikoli rezervace.
- Browser: skutečné produkční komponenty s izolovaným lokálním controllerem. Kliknutí TRA 1, ArrowRight → TRA 3, jediná checked hodnota, focus outline, aktualizovaný plný název a zpřístupněný návrh času. Uložení syntetického testu URO/45 min/urgent → karta Urologie + SÁL Č. 7 → editace zachovává URO. Bez sítě a databáze; reload odstraní jen lokální fixture změnu. Produkční klinická data zůstávají beze změny.
- Vizuální evidence: `output/acute-qa/room-icon-options.jpg`, viewport 1395 × 1109, malé volby 68–90 × 60 px ve dvou řádcích, bez vodorovného přetečení. Desktop, responsive wrap a 8px Timeline-style surfaces; žádné nové animace nebo dependency. Mobilní CSS wrap zůstává přístupný, nové mobilní vizuální ověření se netvrdí.
- 40/40 cílených UI/design/integration/timeline testů a TypeScript prošly; čtyři nové testy pokrývají reálné IDs, zkratky, zachování departmentu, edit/empty/missing stavy, required/focus a geometrii. `21st review`: pouze 75 informačních připomínek lokálních barev; zachované tokeny a nativní radio primitives. React kontrola: bez nového efektu, fetch nebo hook větvení; aktualizace draftu je funkcionální. Žádný commit nebo nasazení.

---

## 2026-10-08 — Velké ikony klinické naléhavosti

- Výběr naléhavosti v produkčním formuláři create/edit nyní používá tři velké grafické volby s existujícími Lucide ikonami Siren / Timer / CalendarClock. Zachovaná schválená červenorůžová / zelená / modrá paleta a Timeline popup. Název, klinický popis a fajfka doplňují barvu; žádné klinické termíny ani automatické priority nepřibyly.
- Nativní povinné radio inputs nejsou odstraněné z accessibility tree: nový formulář nemá předvolenou hodnotu, editace zachovává enum a busy/read-only fieldset je disabled. Browser ověřil kliknutí emergent → upozornění, ArrowRight → urgent → upozornění zmizí, jedinou checked hodnotu, required validity a viditelný focus outline. Testování bez uložení a bez databáze.
- Evidence: `output/acute-qa/urgency-icon-options.jpg`, skutečný formulář s izolovaným controllerem, viewport 1395 × 1109, volby 235 × 172 px, bez horizontálního přetečení těla. Mobilní CSS skládá volby pod sebe s 96px minimálním cílem a světlými semantic colors; nové vizuální ověření mobilního viewportu se v tomto průchodu netvrdí.
- 29/29 cílených UI/integration/design testů a `npx tsc --noEmit` prošly. Dva nové SSR testy pokrývají tři explicitní enumy, prázdnou výchozí volbu, popisy, edit checked, disabled a focus/mobile CSS. `21st review` bez error/warning, pouze 75 informativních připomínek lokálních barev. Nový katalogový komponent není třeba; opakovaný export kontextu do 21st se po dřívějším bezpečnostním zamítnutí neprováděl. Žádná nová závislost, commit nebo nasazení.

---

## 2026-10-08 — Kruhová akce v prázdném přehledu akutních výkonů

- Prázdná záložka Požadavky používá menší statický protějšek soustředných kruhů detailu sálu: 180–240 px podle šířky, jemný modrý obrys/záře a transparentní střed s textem „Nový požadavek“. Původní neutrální empty card a nesouvisející popisek ručního pořadí jsou v tomto stavu nahrazené otevřeným plátnem; hlavička ani ostatní stavy se nemění.
- Kruh používá společné otevření stávajícího formuláře a skutečný opener pro návrat fokusu. Browser ověřil Enter → formulář → Escape → fokus na kruhu. Žádný požadavek se při této kontrole neuložil. Read-only větev má neinteraktivní grafiku „Bez požadavků“, busy větev disabled button; loading/error ani neprázdná fronta kruh nevykreslují.
- Evidence: `output/acute-qa/empty-orb-desktop.jpg`, skutečné komponenty s izolovaným prázdným controllerem, 1395 × 1109 px; kruh 240 × 240 px, bez vodorovného přetečení. V tomto průchodu browser nereflektoval požadovaný mobilní viewport override a dál hlásil 1395 × 1109 px, proto se netvrdí nové vizuální ověření telefonu. Override byl resetován; CSS dál používá fluidní 180–240px velikost.
- 27/27 cílených testů a TypeScript prošly. Dva nové SSR testy pokrývají empty/readonly/busy/loading/error/populated stavy. `21st review` pouze informativní připomínky lokální palety. Klinická data, oprávnění, priorita i společné popupy jsou beze změny.

---

## 2026-10-08 — Popupy Timeline a zarovnání Akutních výkonů

- Formulář nového požadavku / editace, detail a úprava pořadí nyní sdílejí skutečné `timeline-popup-overlay`, `timeline-popup-panel`, `timeline-popup-header`, `timeline-popup-close` a detailové `timeline-popup-metric`, nikoli jejich vlastní podobný motiv. Vnější roh 12 px, jemný blue-violet podklad a rozostřené pozadí odpovídají Timeline; form controls mají 8px rohy. Radix a všechny klinické/data handlery zůstaly zachované.
- Odstraněný vnitřní limit 1600 px opravuje přesun nadpisu na širokých monitorech. Akutní výkony přebírají existující `app-module-content` a `app-module-page-header`; při 2880 × 1200 mají sdílený content, modul i heading x = 284 px, šířku 2400 px a top = 40 px. Žádné přepisování globálního pozadí ani menu; priority zůstávají červenorůžová / zelená / světlemodrá.
- Prohlížeč: skutečné produkční komponenty v izolovaném QA bez databázových volání. Ověřeno vytvoření (pouze otevření), detail, přechod detail → edit → detail a změna pořadí (pouze otevření). Escape vrací fokus na skutečný opener; Shift+Tab z close cyklí na submit uvnitř dialogu. Nic se neukládalo ani neposílalo.
- Rozměry popupů: 1024 × 768 → 780 × 720 px; 390 × 844 → 366 × 820 px; 320 × 568 → 296 × 544 px; 640 × 360 → 608 × 336 px. Všechny zůstávají ve viewportu bez vodorovného přetečení, tělo roluje a hlavička s close zůstává viditelná. Světlý mobilní popup má pozadí #edf3fc a tmavé texty; nevztahuje se na barevnost celého QA canvasu. Dočasný viewport byl resetován.
- Evidence: `output/acute-qa/timeline-aligned-page.jpg`, `timeline-form-desktop.jpg`, `timeline-detail-desktop.jpg`, `timeline-reorder-desktop.jpg`, `timeline-form-mobile-dark.jpg` a `timeline-form-mobile-light.jpg`.
- 25/25 cílených UI/integration/CSS testů, TypeScript bez chyb. Pět nových kontraktů hlídá použití sdílených popup tříd, oddělené posouvání, společnou hlavičku, přístupné form controls a světlou mobilní větev. `21st review`: žádné error/warning, 67 informativních připomínek k lokálním barvám; React kontrola nenašla změny hooků, asynchronních toků ani novou závislost. Finální QA konzole bez warning/error. Commit, nasazení ani zapnutí modulu nebyly požadovány.

---

## 2026-10-08 — Barevné přechody akutních karet podle naléhavosti

- Následná korekce uživatele: urgentní mění jantarovou na zelenou (tmavý smaragdový přechod, světlý mint podklad; označení a obrys rovněž zelené). Emergentní i časný zůstávají beze změny. Aktualizovaný kontrakt palety a všech 20 cílených testů prošly; render ověřen na aktuální desktopové šířce 1167 px bez horizontálního přetečení. Evidence: `output/acute-qa/priority-green-desktop.jpg`. Níže je historie původního průchodu s jantarovou variantou.
- Uživatelem vyžádaná úprava původního schváleného návrhu: emergentní červenorůžový, urgentní jantarový a časný světlemodrý přechod. Pouze `.acute-card` a její části; globální podklad, geometrie, klinické výpočty, dialogy a data se nemění.
- Dva jemné gradienty přecházejí do průsvitného podkladu společného s patičkou. Konkávní výřez zůstává transparentní; obrys a kruhová šipka přebírají barvu skutečné naléhavosti, nikoli ručního pořadí či čekání.
- Browser evidence: `output/acute-qa/priority-gradients-desktop.jpg` (1586 × 992), `priority-gradients-mobile-dark.jpg` a `priority-gradients-mobile-light.jpg` (390 × 844). Skutečné produkční komponenty s lokálními syntetickými daty na `http://127.0.0.1:4189/`; žádná databázová volání.
- Drobné popisky byly po kontrole gradientu zesvětleny. Kontrola sousedních podkladových pixelů a vypočtených textových barev na desktopu: nejnižší z 10 zaznamenaných vzorků 4,97:1. Světlé karty: ověřené reference 4,66–4,68:1 a emergentní označení po ztmavení 5,38:1. Jde o lokální vzorky, ne tvrzení o kompletním WCAG auditu celé aplikace.
- Rozvržení ověřeno při 1586 × 992, 1024 × 768 a 390 × 844; při 320 × 568 s dlouhými texty žádný prvek modulu nepřekročil vodorovné hranice. Izolovaný QA canvas je stále navy i při `theme=light`; ověřena světlá větev karet, nikoli správnost mobilního motivu celé aplikace. Stávající kontrast hlavičky na takovém QA podkladu je mimo tuto scoped úpravu.
- 20/20 cílených UI/integration/CSS testů prošlo. Šest nových kontraktů pokrývá prioritu, gradienty, průsvitnost, transparentní kapsu, světlý motiv, reduced motion a scoped selektory. `21st review`: bez error/warning, pouze informativní návrhy převodu lokální palety na společné tokeny; `git diff --check` čistý. Nová závislost, commit, produkční nasazení ani zapnutí modulu nebyly provedeny.

---

## 2026-10-08 — Akutní výkony, implementace schváleného návrhu

### Podklady a rozsah

- Source visual truth: `/Users/jaroslavjedlicka/.codex/generated_images/01a020bb-6261-7152-8eaa-49ba81b1cac8/exec-6fd2b21e-96a3-46ed-b4ad-45b2bed42dde.png`, 1586 × 992 px; poslední uživatelem schválený návrh.
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/output/acute-qa/desktop-final.jpg`, 1586 × 992 px, CSS viewport 1586 × 992, DPR 1. Oba obrazy byly otevřeny společně v jednom porovnání v původním rozlišení; bez změny poměru stran nebo hustoty.
- Vizuální kontrola: `http://127.0.0.1:4189/?mode=default`, skutečné produkční komponenty s odděleným lokálním controllerem. Čtyři syntetické požadavky, pevný čas 7. 10. 2026 14:50, tmavý motiv, záložka Požadavky. Spodní QA lišta a ukázková navigace nejsou produkční funkcionalita.
- Reálná aplikace na `http://localhost:3000/` byla otevřena a zobrazuje dashboard i Nastavení. V cestě postranní Nastavení → karta Nastavení → Správa modulů je skutečná karta Akutní výkony, vypnutý přepínač a výslovná informace o vypnutí i pro superadministrátora. Ve všech třech propojených zařízeních modul zůstává vypnutý; nebylo provedeno skutečné přijetí požadavku ani změna klinického programu.

### Findings a historie oprav

- [P2, vyřešeno] Patičky první implementace měly proti předloze příliš drobné údaje a podstatně méně čitelný důvod změny pořadí. Evidence: `output/acute-qa/desktop-first.jpg`. Oprava: hlavní text 14 px, doplňující text 12 px, zalamování bez ořezu. Finální společné porovnání potvrzuje čitelnou dvojici údajů o sálu a auditu.
- [P2, vyřešeno] První pravý spodní roh karty tvořil vypouklou kapsu namísto konkávního výřezu. Oprava skutečných CSS povrchů zachovává volné místo pro kruhovou šipku a návaznost horního i spodního obrysu. Evidence: `output/acute-qa/desktop-final.jpg`; žádné nové rastrové nebo SVG ilustrace.
- [P2, vyřešeno] Řízený Radix dialog bez Trigger po Escape ztrácel původní klávesový fokus. Oprava ukládá skutečný spouštěcí button, vrací fokus při zavření a použije aktivní záložku, pokud karta zmizela. Přechod detail → edit → detail nepřetahuje fokus do pozadí. Ověřeno v prohlížeči i regresním testem.
- Po opravách nezůstává akční P0/P1/P2 v rozsahu schváleného vzhledu a ověřených stavů modulu.

### Pět povinných ploch fidelity

- **Fonts/typography:** zachována rodina a sdílený `ModulePageHeading` aplikace (`Segoe UI`, Inter, Helvetica Neue, Arial fallback). Nadpis 51 px, názvy karet 26 px, tabulární čísla 42 px; patičky 14/12 px. Předloha nemá fontový zdroj, proto se netvrdí pixelová identita řezu. Větší optická váha existující aplikace je přijatá integrace, ne nově zavedený font. Dlouhé názvy, reference i obory se zalamují bez skrytí.
- **Spacing/layout rhythm:** dva sloupce, 18px mezera, oblý obrys s výřezem a samostatnou šipkou. Finální desktopové karty mají šířku 700 px a výšku 340/330 px; x = 128/846, y = 262/620. Zdrojové x ≈ 147/835 je záměrně přizpůsobeno stávajícímu odsazení aplikace 128 px a jejímu menu. Sousední patičky drží společnou spodní hranu i při delších údajích.
- **Colors/tokens:** původní globální tmavomodrý podklad nebyl přepisován. Modré průsvitné karty, tenké světlé hrany a tlumené děliče; priorita používá růžovou, jantarovou a světlemodrou tečku i text, takže informace není pouze barevná. Na malých displejích se respektuje existující světlý/tmavý motiv aplikace.
- **Image quality/assets:** obrazový návrh neobsahuje vlastní ilustraci ani produktový obrázek k implementaci. Žádné náhradní dekorativní obrázky nebyly vloženy. Ovládání používá existující Lucide ikony a skutečné CSS karty. Kruhová šipka zůstává ostrá a její prostor nezasahuje do textů.
- **Copy/content:** zachované názvy záložek, ruční pořadí, časy, naléhavost a viditelná změna pořadí. Doplněn skutečný autor auditu a explicitní „Návrh — nepotvrzeno“. Nepodložené tvrzení „čeká na tým“ není automaticky odvozované z převzetí; skutečný popis je v detailu. Uzavření požadavku není označeno jako dokončená operace.

Full-view porovnání ověřilo kompozici, hustotu a všechny čtyři karty. Zaměřená kontrola ze stejného společného vstupu v původním rozlišení ověřila patičku Repozice (staré/nové pořadí, čas, důvod, autor), výřez a šipku i hranice metrik. Texty jsou při této hustotě přímo čitelné; další ořez nebyl potřebný. Samostatný formulář/detail byly zachyceny v `output/acute-qa/detail.jpg` a `output/acute-qa/mobile-form.jpg`; předloha tyto stavy nespecifikuje, byly posouzeny jako navazující funkční UI.

### Responsivita, interakce a ověření

- 1586 × 992: dvě karty 700 px, scrollWidth = 1586. 1024 × 768: dvě karty 419 px, patička přechází na svislé řádky, scrollWidth = 1024 (`output/acute-qa/tablet-1024.jpg`).
- 390 × 844: jeden sloupec 358 px, scrollWidth = 390 (`output/acute-qa/mobile-390.jpg`). Formulář 366 × 820 px je uvnitř viewportu, obsah roluje, pole a tlačítka mají alespoň 44 px.
- 320 × 568 s dlouhými názvy, referencemi a oborem: karty 288 px, scrollWidth = 320, žádný prvek modulu nepřekračuje vodorovné hranice (`output/acute-qa/narrow-long-320.jpg`). Všechny karty zůstávají dostupné svislým posouváním.
- Prohlížeč: syntetické zadání, převzetí, úprava odhadu s důvodem, přeuspořádání s auditem, uzavření, zrušení, historie a návrh zařazení. Ověřeny prázdný/chybový stav, režim pouze čtení bez mutačních tlačítek, šipkové ovládání záložek, Escape, návrat na opener i fallback po zmizení karty. Klinická naléhavost se posunutím pořadí nezměnila.
- Konzole izolovaného náhledu: 0 error/warn záznamů při finální kontrole. Tato věta není tvrzením o veškeré historické konzoli celé aplikace.
- Automatické ověření: **92/92 testů**, 0 selhání a 0 přeskočených; včetně izolovaného skutečného PostgreSQL, souběhu, auditu, tenantů, SWR při přepnutí zařízení, klinických cyklů timeline a mobilní navigace. TypeScript a `git diff --check` bez chyb.
- Databázová instalace je ověřená samostatně v `docs/acute-requests.md`. Vzdálené nemocniční záznamy nebyly použity k zápisovým UI testům; zapnutí modulu, živý klinický pracovní postup a produkční nasazení nejsou touto kontrolou prohlášeny za otestované. Mobilní světlý motiv a jiné než uvedené viewporty nebyly v tomto průchodu vizuálně ověřeny.

### Implementation checklist a follow-up

- [x] Funkční vzhled a čitelné priority podle schváleného návrhu; původní navigace/podklad zachovány.
- [x] Požadavky, pořadí, historie a nepotvrzené timeline návrhy připojeny k ověřenému API; žádné úpravy skutečných cyklů/statistik.
- [x] Databázové schéma instalované, všechny konfigurace zařízení vypnuté.
- [x] Desktop/tablet/telefon, dlouhé texty a klávesové ovládání ověřeny.
- [ ] Provozní správce zvolí zařízení/role a explicitně modul zapne. Produkční nasazení nebylo požadováno.
- [P3] Případné další ladění přesného řezu fontu může navázat na skutečný fontový zdroj předlohy; stávající aplikace je záměrně nepřefontována.

final result: passed


---

> Úklid 2026-09-14: obrazové výstupy kontrol nejsou součástí verzovaného projektu ani nasazení. Starší snímky byly odstraněny z pracovní kopie; posledních sedm snímků zarovnání a fidelity zůstává pouze lokálně jako ignorované soubory. Všechny historické obrazové podklady z tohoto protokolu lze obnovit z Git commitu `a37d0c662dab7147b6fbc6d0fa9662824bffd461`.

## 2026-09-14 — zarovnání pravého sloupce 3D dispozice

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-14 v 0.32.06.png` (794 × 2106 px). Jde o výřez chybného stavu; cílem je srovnat hrany a mezery, nikoli zkopírovat nesouosé rozložení.
- Browser implementation: `http://localhost:3000/`, 3D dispozice, vybraná `GYNEKOLOGIE HLAVNÍ`, připravený sál. Živé časy/počty se proti dodanému historickému snímku přirozeně liší.
- Full-view evidence: `design-qa-spatial-alignment-desktop.png` (1920 × 1080 px) a `design-qa-spatial-alignment-compact.png` (1280 × 720 px). Screenshoty odpovídají CSS viewportu; browser DPR 2.
- Focused comparison: `design-qa-spatial-alignment-comparison.png` (807 × 1085 px), vlevo zdroj normalizovaný z 2× na 397 × 1053 px, vpravo nezdeformovaný výřez pravého sloupce ze 1920px renderu. Výška historického viewportu není známa; porovnávají se hrany, šířky, text a mezery, nikoli absolutní výška panelu.

**Findings and fixes**

- [P1, vyřešeno] Toolbar měl šířku podle obsahu, detail samostatnou pevnou šířku a upozornění dva sloupce z dvanácti. Všechny tři řádky nyní používají společné CSS proměnné pro šířku detailu a mezeru. Horní ovládání se vejde dovnitř stejného sloupce.
- [P2, vyřešeno] Text upozornění se dotýkal tlačítka. Explicitní mezery, řádkování a nesmrštitelné tlačítko zachovávají oddělení prvků.
- [P2, vyřešeno] Dlouhý název měl příliš volné řádkování. Nadpis má řízené řádkování 1.2 a může bezpečně zalomit dlouhá slova; zavírací ikona má vlastní místo.

**Required fidelity surfaces**

- Fonts/typography: rodina, barvy, velikostní hierarchie a tabulární čísla zachované; zpřesněno pouze řádkování nadpisu a upozornění. Dvouřádkový název nezasahuje do zavíracího tlačítka.
- Spacing/layout: u 1920 × 1080 mají toolbar, detail i alert přesně x = 1542, šířku 338 px, pravou hranu 1880. U 1280 × 720 mají přesně x = 955, šířku 285 px. Spodní metriky a program zachovávají vzájemný poměr 1:1:1:2 v levé části.
- Colors/tokens: původní tmavomodré plochy, stavové barvy, žlutá akce a modré upozornění beze změny.
- Image quality/assets: tato oprava nemění modely, světla, textury ani používanou knihovnu ikon. Nové rastrové assety nejsou potřeba.
- Copy/content: názvy, živá data a texty akcí zachované; do backendu se nezapisovalo.

**Interaction and responsive checks**

- V prohlížeči ověřen výběr dlouhého názvu sálu. Detail i upozornění zobrazují stejný sál.
- U 1280 × 720 je celý detail vysoký 393 px, jeho scrollHeight = clientHeight = 391 px; tlačítko je celé uvnitř panelu. Mezera upozornění nad tlačítkem 12.1 px, na širokém monitoru 6.7 px.
- U 700 × 900 se části skládají do jednoho sloupce se shodnými hranami x = 36, pravá hrana 664, šířka 628 px. Bez horizontálního přetečení; mobilní stránka přirozeně roluje.
- TypeScript a `git diff --check` prošly. Browser konzole bez error záznamů; jeden dřívější warning Realtime heartbeat timeout není způsoben změnou rozložení a není zde označen za opravený.
- Předchozí chyby jsou na normalizovaném porovnání odstraněné. Nezbývá akční P0/P1/P2 v rozsahu zarovnání označeného sloupce. Rozložení na ostatních netestovaných rozměrech není prohlášeno za ověřené.

final result: passed

---

## 2026-09-14 — odstranění žlutých linek pod sály

- Požadavek: nezobrazovat žluté linky ve 3D projekci, které měnily viditelnost po kliknutí na sál. Teplé osvětlení aktivních sálů a živé barvy statusů mají zůstat zachované.
- Implementace: `vendor/orms-spatial-editor/src/dashboard-viewer.js`, `geometry.js`, `room-assets.js`.
- Provozní browser evidence: `design-qa-spatial-fidelity-dashboard.png` (1308 × 981 px), `http://localhost:3000/`, 3D dispozice po plném reloadu a výběru `Sál č. 7`.
- Aktivní stav bez zásahu do provozních dat: `design-qa-spatial-fidelity-fixture.png` (1448 × 1086 px), šest ukázkových sálů, PCHO 2 aktivní; `design-qa-spatial-fidelity-status.png` zachycuje další přepnutí statusu/výběru.
- Dashboard potlačuje dekorativní pásky před prvním vykreslením. Potlačení respektují změna aktivity, výběr a dokončení asynchronního načítání GLB. Editor tímto příznakem není změněn.
- Bodové světlo aktivního sálu je samostatná vrstva a zůstává zapnuté. Barvy statusů, modelové tablety a kontrolky nejsou odstraňovány.
- V prohlížeči ověřen reload, výběr sousedního sálu, změny ukázkových statusů a otočení scény. Konzole provozního dashboardu i ukázkové scény bez error/warn záznamů.
- Nezávislý smoke test se skutečným `DashboardViewer.setProject` a zpožděným GLB: 0 viditelných pásků před načtením, během výběru, po načtení i při přechodu aktivity na jiný sál; aktivní PointLight správně zůstává a přesouvá se.
- Automatické kontroly: 19/19 prostorových testů, TypeScript a `git diff --check` prošly. Produkční build `npm exec next build -- --webpack` prošel. Výchozí Turbopack build v tomto prostředí skončil na oprávnění sandboxu při bindování portu, nikoli na chybě aplikace.

final result: passed

---

## 2026-09-14 — detailnější živý 3D model a porovnání s předlohou

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Full-view implementation: `design-qa-spatial-fidelity-fixture.png`, viewport 1448 × 1086, šest sálů, aktivní PCHO 2; pouze lokální ukázková data. Produkční půdorys s 15 sály se kvůli porovnání nepřepisoval.
- Focused comparison: `design-qa-spatial-fidelity-comparison.png` (2024 × 616 px), vlevo zdrojový výřez, vpravo skutečný browser render. Výřezy jsou normalizované na šířku 1000 px; odlišná kompozice a geometrie zůstávají viditelné, nejsou maskované.
- Asset: nový `public/spatial/models/pcho-3-detailed.glb`, odvozený z dodaného `pcho-3.glb`. Originál zůstává nezměněný. Nový model má 49 218 trojúhelníků, 5 563 460 bajtů, zachované rozměry/pivoty a bitově shodné původní UI textury.
- Hrany dostaly fyzické malé úkosy; kontaktní stíny jsou předpočítané do jedné sdílené 2048² AO textury. Povrchy dostaly jemný saténový detail a samostatnou drsnost/kovovost. Barevná korekce sdílených materiálů probíhá pouze jednou, nikoli opakovaně pro každý mesh.
- Studené modrofialové stěny, světlejší hrany, stříbřité vybavení a teplé aktivní světlo byly laděny podle přímého porovnání. Stíny používají měkkou VSM mapu 2048²; žádný nový fullscreen AO průchod při otáčení scény.
- Kamera zachovává ortografickou projekci, mírné natočení a skutečné poměry stran. Automatické orámování používá promítnuté rohy modelu. Opravena Eulerova rotace klonovaných místností/vybavení, která u některých 180° klonů vracela dveře na nesprávnou stranu.
- Fonts, copy, panel layout: provozní typografie, názvy a údaje se neměnily. Testovací ovládání slouží pouze pro opakovatelné porovnání světel a statusů; nejde o náhradu dashboardu.
- Interakce: ověřeny výběr, aktivita, různé statusy, půdorys a rotace. Testy chrání projekci, správnou rotaci klonů, nezávislé statusové materiály, načítání a strukturu optimalizovaného GLB.

**Zbývající rozdíly vůči požadavku na naprostou identitu**

- [P2, otevřeno] Dodaný GLB není původní scéna ze snímku: jiný tvar/rozmístění lamp, stolů a přístrojů, jiné členění stěn a přípraven. Materiálová a světelná úprava tyto rozdíly sama neodstraní. Úplná shoda vyžaduje původní referenční 3D scénu nebo další cílené přemodelování vybavení a prostor.
- [P2, otevřeno] Na některých velkých stěnách zůstává proti předloze plošší světelný přechod a neodpovídá přesně kontrast/rozložení lokálních odlesků. Výsledný render je blíže, ale není pixelově ani geometricky identický.
- Tato kontrola tedy nepotvrzuje doslovné splnění „naprosto identicky“. Funkční úprava odstranění linek je ověřena samostatně výše.

final result: blocked

---

## 2026-09-13 — referenční pozadí a stínování neaktivních sálů

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-lighting-final.png` (955 × 1119 px).
- Normalizované zaměřené porovnání: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-lighting-comparison.png` (1420 × 544 px).
- Viewport: 955 × 1119 CSS px, devicePixelRatio 2; zachycený browser screenshot má 955 × 1119 obrazových bodů.
- State: provozní dashboard, `3D dispozice`, `Operační blok`, připravené/neaktivní sály a vybraný připravený `PCHO SÁL Č.2`. Zdrojový snímek má jiný půdorys a aktivní žlutě osvětlený sál; kontrola proto cíleně porovnává pozadí a všechny neaktivní modré plochy.

**Full-view and focused comparison evidence**

- Celý render používá shodný hluboký námořnický základ, modrofialový radiální přechod za dispozicí a tmavší spodní zakončení. Přechod nemá viditelný obdélníkový okraj.
- Neaktivní sály mají chladné modrofialové podlahy a stěny, tmavé spáry a sokly, světlejší konstrukční hrany a modroocelové vybavení. Materiály nepůsobí jako šedý nebo bílý model.
- Směrové světlo kreslí horní hrany a vybavení, zatímco svislé stěny zůstávají ve studeném stínu. Jemné obvodové světlo je součástí 3D scény, takže zůstává svázané s dispozicí při jejím pohybu.

**Required fidelity surfaces**

- Fonts and typography: typografie, štítky sálů a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: layout a responsivní uspořádání nebyly touto úpravou měněny; užší kontrolní viewport záměrně zobrazuje jiný výřez scény než široká reference.
- Colors and visual tokens: vzorky pozadí po opravě odpovídají referenci v tmavém námořnickém rozsahu; horní střed `#0E1740` vs. `#11183E`, střed záře `#111C49` vs. `#131B4A`, spodní oblast `#111D47` vs. `#151D4C`.
- Image quality and asset fidelity: místnosti dál používají dodaný `pcho-3.glb`; barevná korekce probíhá na PBR materiálech a zachovává textury, odlesky, stíny i ostré detaily při zoomu.
- Copy and content: názvy sálů a živá provozní data zůstaly beze změny.

**Findings and iteration history**

- [P2, vyřešeno] Výchozí scéna byla příliš šedá a rovnoměrně osvětlená. Materiály stěn, podlah, hran, spár a vybavení dostaly samostatnou studenou barevnou korekci; ambientní a environmentální světlo bylo omezeno.
- [P2, vyřešeno] První kontrolní průchod byl proti referenci příliš tmavý. Finální průchod vyvážil směrové světlo a expozici tak, aby zůstaly čitelné stoly, lampy, dveře, futra a tablety, ale neaktivní stěny zůstaly ve stínu.
- [P2, vyřešeno] Spodní část globálního pozadí byla téměř černá. Finální gradient zachovává modrý odstín až k dolnímu okraji a současně směrem dolů jemně tmavne.
- Nezůstává žádný akční P0/P1/P2 rozdíl v požadovaném pozadí nebo stínování neaktivních sálů.

**Primary interactions and implementation checks**

- V prohlížeči otestován výběr `Sál č. 7` a návrat na `PCHO SÁL Č.2`; detail i štítek se změnily bez opětovného sestavení celé scény.
- Po plném obnovení proběhl loader 3D modelů a finální scéna se vykreslila bez error/warning záznamů v browser konzoli.
- `npm run build`, `npx tsc --noEmit` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-13 — kompaktní 3D dashboard bez rolování

- Source visual truth: uživatelské výřezy `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.52.44.png` (528 × 116 px), `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.54.07.png` (3594 × 568 px) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-13 v 20.54.58.png` (722 × 1364 px).
- Implementation: `http://localhost:3000/`, desktopový dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `PCHO SÁL Č.2`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-responsive-layout.png` (1280 × 720 px).
- Browser viewport: 1280 × 720 CSS px, devicePixelRatio 1. Zdrojové výřezy zachycují samostatné oblasti ve vyšší hustotě; porovnání proto normalizuje jejich fyzické rozměry vůči odpovídajícím oblastem 1280px desktopového viewportu.

**Full-view and focused comparison evidence**

- Celý browser render potvrzuje, že dokument i hlavní modul mají shodnou výšku 720 px, `scrollY` je 0 a nevzniká stránkové přetečení.
- Výřez horního ovládání byl porovnán se zdrojem: samostatné boxy data a času jsou odstraněné a volba `Operační blok` je ve stejné skupině jako ikony Karty sálů, 3D pohled, Půdorys a Vycentrovat scénu.
- Výřez spodního souhrnu byl porovnán se zdrojem: jediný řádek karet zůstává zachovaný, ale při 720px výšce měří 119 px namísto původního téměř 200px minima.
- Výřez detailu sálu byl porovnán se zdrojem: všechny čtyři informační buňky i hlavní žluté tlačítko jsou viditelné zároveň. Panel měří 393 px, jeho `scrollHeight` se rovná `clientHeight` a `overflow-y` je `hidden`.

**Required fidelity surfaces**

- Fonts and typography: původní rodina, hierarchie, váhy a tabulární číslice zůstaly zachované; na nízkém desktopu se zmenšují jen fluidní velikosti a mezery, bez transformace nebo rozmazání textu.
- Spacing and layout rhythm: horní řádek má dvě jasné části, spodní pás je nižší a hlavní scéna dostává zbývající výšku. Detail je přesně vysoký jako 3D scéna.
- Colors and visual tokens: tmavomodré panely, transparentní hrany, žlutý aktivní stav i modrá výstražná karta zůstaly beze změny.
- Image quality and asset fidelity: živá Three.js dispozice, GLB modely, materiály a štítky nejsou škálovány přes CSS transformaci; přizpůsobuje se skutečný layout a viewport kamery.
- Copy and content: texty `Operační blok`, `Karty sálů`, `3D pohled`, provozní metriky a detail sálu zůstaly zachované.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči třem požadovaným úpravám.
- [P3] Na displejích užších než 700 px se dashboard záměrně vrací k vertikálnímu toku se scrollováním; bez něj by nebylo možné zachovat čitelnost mobilního zobrazení.

**Comparison history**

- Baseline P1: datum, čas a volba podlaží tvořily samostatný prostřední blok, zatímco požadovaná volba `Operační blok` měla být součástí skupiny ikon zobrazení.
- Baseline P2: spodní karty měly pevné minimum 198 px a odebíraly prostor 3D scéně.
- Baseline P1: pravý detail používal vlastní svislý posuvník a výšku `calc(100% - 40px)`, takže celý obsah nebyl viditelný bez rolování.
- Final fix: odstraněné datum a čas, přesunutý přepínač podlaží, výškově omezený souhrnný řádek a adaptivní grid detailu s výškovou variantou pro displeje do 900 px.
- Post-fix evidence: při 1280 × 720 má stránka `scrollHeight = clientHeight = 720`, panel `scrollHeight = clientHeight = 391` a celý souhrnný pás zůstává nad patičkou.

**Interaction and implementation checks**

- Ověřeno přepnutí `Karty sálů` → `3D dispozice` a návrat kompletní scény.
- Ověřeno zobrazení výběru podlaží přímo v pravé ovládací skupině.
- Browser console: 0 error-level položek.
- React kontrola: odstraněn již nepotřebný odvozený objekt data; nebyly přidány nové efekty, event listenery ani nákladné renderovací závislosti.
- `npm run build` a TypeScript kontrola prošly bez chyb.

final result: passed

---

## 2026-09-13 — detailní pevné stěny a parametrické ohraničení

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png` (1448 × 1086 px).
- Browser-rendered implementation: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-editor-final.jpg` (955 × 1119 px).
- Focused source evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-reference-focus.png` (980 × 560 px).
- Focused implementation evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-solid-walls-implementation-focus.jpg` (600 × 650 px).
- Viewport: 955 × 1119 CSS px, browser DPR 2; browser screenshot byl normalizován na 955 × 1119 obrazových bodů (efektivní hustota 1×).
- State: 3D prostorový editor, `1. patro · operační blok`, nízká přední řezová stěna, zapnutý obvod budovy, zapnuté KNL ohraničení, profil `Pevné nemocniční stěny`, automatický odstup 3 m podle šířky chodby.

**Full-view comparison evidence**

- Celek zachovává studenou modrošedou paletu, mírně natočenou 3D kameru a hmotný obvod operačního traktu. Nová pevná stěna tvoří souvislý uzavřený prstenec v editovatelném odstupu chodby.
- Přední strana se v režimu architektonického řezu sníží na 1,28 m, ostatní strany zachovávají nastavenou konstrukční výšku 3 m. Po vypnutí řezu mají všechny čtyři strany stejnou skutečnou výšku.
- Samostatný vnější prstenec je záměrná funkční vrstva nad rámec zdrojového renderu: uživatel jej může přepnout na prosklení nebo spojovací chodbu a jeho odstup se řídí editorem.

**Focused region comparison evidence**

- Pevná stěna má nosné jádro, pohledový kazetový obklad, svislé a vodorovné spáry, zesílený sokl, vnitřní ochranný sokl, ochranný pás, horní krycí hlavici a průběžné i rohové konstrukční pilíře.
- Moduly 1,18 m a členění do výškových pásů odpovídají vizuálnímu rytmu panelovaných stěn ve zdroji. Horní krytí a pilíře používají o něco světlejší, stále studený modrošedý materiál; spáry a sokl jsou tmavší.
- Obvod přímo navázaný na místnosti dále obsahuje dveřní otvory, dvoukřídlá posuvná křídla, obložky, překlady, prahy, senzory, čtečky a tablety. Tyto prvky zůstávají samostatné a reagují na úpravy místností.

**Required fidelity surfaces**

- Fonts and typography: typografický systém editoru se nezměnil; nový název profilu a popis používají existující velikosti, řádkování a kontrast postranního panelu bez přetečení.
- Spacing and layout rhythm: sekce `OHRANIČENÍ KNL` zachovává stejnou mřížku, radius a vertikální rytmus jako `OBVOD BUDOVY`; 3D model zůstává čitelný mezi oběma postranními panely.
- Colors and visual tokens: pevné vrstvy používají samostatné chladné PBR materiály s vysokou drsností; finální iterace ztmavila krytí a pilíře po přímém porovnání se zdrojem.
- Image quality and asset fidelity: místnosti v produkčním dashboardu nadále používají dodaný `pcho-3.glb`; nové pevné stěny jsou vektorová 3D geometrie, takže zůstávají ostré při zoomu, rotaci i změně rozměrů.
- Copy and content: volby `Pevné nemocniční stěny`, `Fasádní prosklení` a `Spojovací chodba` přesně popisují dostupné konstrukční profily; text uvádí vazbu na výšku, tloušťku a odstup chodby.

**Findings and iteration history**

- [P2, vyřešeno] První iterace měla 398 samostatných prvků a příliš světlý plášť. Oprava sloučila pohledové plochy, ponechala fyzické spáry a snížila scénu na 142 prvků; současně ztmavila albedo krytí, pilířů a panelů. Post-fix evidence: `design-qa-solid-walls-editor-final.jpg`.
- [P2, vyřešeno] Pevný vnější prstenec původně ignoroval režim nízkých stěn. Oprava snížila pouze přední stěnu v řezu a zachovala plnou výšku při exportu i režimu `Celé stěny`.
- Nezůstává žádný P0/P1/P2 problém v konstrukčním členění, přepínání profilů, editovatelnosti, odstupu ani řezovém zobrazení. Rozdílné rozmístění místností v kontrolním editorovém projektu je testovací stav, nikoli drift produkčního půdorysu.

**Primary interactions and implementation checks**

- V prohlížeči otestováno přepnutí `Pevné nemocniční stěny → Fasádní prosklení → Pevné nemocniční stěny`; popis i render se přepnuly bez chyby.
- Konzole kontrolního náhledu neobsahovala žádnou chybu, pouze zprávy vývojového hot-reloadu.
- Modelová validace přijímá nový profil `solid`; všechny prvky pevné stěny zůstávají samostatně editovatelné.
- Automatizovaný test ověřil 1,28/3/3/3 m v řezu a 3/3/3/3 m u plných stěn.

final result: passed

---

## 2026-09-10 — obnovený 3D úhel a oddělené stavové zvýraznění

- Source context: uživatelské upřesnění k nežádoucímu rovnému pohledu a k předchozímu celoplošnému barevnému zvýraznění; původní problematický snímek `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 13.27.29.png`.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, mírně pootočený ortografický pohled.
- Browser screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-perspective-status-final.jpg` (1600 × 1000 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1.
- State: `TRAUMATOLOGIE - 1` aktivní ve fázi `Příjezd na sál`, následně ověřen připravený `PCHO SÁL Č.2`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči upřesnění. 3D pohled je znovu mírně natočený a lze jej volně rotovat, ale kamera zůstává ortografická, takže přední ani zadní stěny nemění velikost podle vzdálenosti.
- Fázová barva je jemná a omezená pouze na materiály `wall` a `facade`. Podlaha, vybavení, dveře a ostatní konstrukce ji nepřebírají.
- Aktivní sály mají tenké žluté provozní světlo. Připravený sál nemá stavové tónování ani žlutou záři; při výběru používá pouze neutrální modrý štítek.

**Required fidelity surfaces**

- Fonts and typography: štítky a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: původní prostorové měřítko, vycentrování a mírně diagonální kompozice jsou obnoveny.
- Colors and visual tokens: živá fáze používá 16% příměs barvy a emissive intenzitu 0,14 pouze na stěnách; aktivní provozní linka zůstává žlutá `#FFDA28`.
- Image quality and asset fidelity: jde o nativní Three.js materiály a světla reagující na rotaci a zoom.
- Copy and content: názvy místností i statusů zůstaly beze změny.

**Interaction and implementation checks**

- Pro aktivní sál geometrický test potvrdil fialový emissive odstín stěny `#8B5CF6`, neutrální podlahu a viditelné žluté linky.
- Pro připravený sál test potvrdil původní neutrální materiál stěny `#9AA6C0` a skryté žluté linky. Browser ověřil neutrální štítek připraveného sálu.
- Projekční test stejné stěny v přední a zadní části scény naměřil shodnou obrazovou šířku `0,099608611626`; rozdíl je přesně `0`.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — barva vybraného sálu podle aktuálního statusu

- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, osově zarovnaný pohled.
- Browser screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-status-color-final.jpg` (1600 × 1000 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1.
- State: vybraný sál `TRAUMATOLOGIE - 1`, aktuální fáze `Příjezd na sál`, barva statusu `#8B5CF6`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku. Dřívější pevná žlutá byla odstraněna ze štítku, obvodových světel, stěn, podlahy, vstupního indikátoru i bodového světla vybraného sálu.
- Vybraný sál nyní přebírá `accent_color` konkrétního workflow statusu. Emergency a uzamčený stav dál používají své prioritní barvy; při chybějícím propojení se použije neutrální šedomodrá.

**Required fidelity surfaces**

- Fonts and typography: text, velikost, váha a zalamování štítku zůstaly beze změny.
- Spacing and layout rhythm: rozměry štítku, modelu a pravého detailu se nezměnily.
- Colors and visual tokens: štítek, 3D materiály a záře sdílejí jeden aktuální statusový token; pro `TRAUMATOLOGIE - 1` prohlížeč potvrdil `#8B5CF6` a po výběru `PCHO SÁL Č.2` potvrdil `#00FFEE`.
- Image quality and asset fidelity: zvýraznění zůstává součástí živých Three.js materiálů a osvětlení.
- Copy and content: názvy sálů i statusů zůstaly beze změny.

**Interaction and implementation checks**

- Ověřena změna výběru mezi dvěma sály s odlišnými statusy; barva štítku i 3D zvýraznění se přepnula bez obnovy celé scény.
- Deterministický test materiálů potvrdil fialovou `#8B5CF6` na obvodových světlech a emissive vrstvě stěn; po zrušení výběru se světla skryla a původní materiál stěny se obnovil.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — osově zarovnaný 3D pohled bez zkosení

- Source visual truth — nežádoucí zkosený stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 13.27.29.png` (1852 × 888 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `TRAUMATOLOGIE - 1`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-final.jpg` (1600 × 1000 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-focus.jpg` (1076 × 489 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1; dokument má shodných 1600 × 1000 px a nevzniká vodorovné ani svislé přetečení.

**Full-view and focused comparison evidence**

- Normalizované porovnání problémového snímku vlevo a finálního 3D výřezu vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-no-skew-comparison.jpg` (2860 × 650 px).
- Levý stav má bočně vyosený azimut: vodorovné a hloubkové osy se promítají diagonálně a jednotlivé řady působí zkoseně. Pravý stav zachovává 3D výšku stěn a pohled shora, ale kameru zarovnává přesně s osami budovy; řady jsou rovnoběžné a místnosti si zachovávají skutečné vzájemné proporce.

**Required fidelity surfaces**

- Fonts and typography: HTML štítky sálů, jejich velikost, váha a zalamování zůstaly beze změny.
- Spacing and layout rhythm: poloha hlavičky, detailu sálu, spodních souhrnů a ovládání se nezměnila; scéna je znovu automaticky vycentrovaná v dostupné ploše.
- Colors and visual tokens: materiály, modré pozadí, žlutý vybraný stav i stavové barvy zůstaly zachované.
- Image quality and asset fidelity: jde dál o živou Three.js scénu se skutečnou 3D geometrií, osvětlením a stíny, nikoli o rastrový nebo CSS překryv.
- Copy and content: názvy sálů a živá provozní data zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku na reálné osové zobrazení bez zkosení.
- [P3] Pevné osové zarovnání je záměrně méně dramatické než volný izometrický pohled; volná rotace zůstává dostupná v 3D editoru, kde slouží k úpravám dispozice.

**Comparison history**

- Baseline P1: kamera byla umístěna mimo střed osy X a OrbitControls dovoloval volný azimut; po otočení vzniklo výrazné diagonální zkosení celé dispozice.
- Pass 1 P2: zarovnání os odstranilo zkosení, ale nižší úhel kamery příliš zplošťoval skutečnou hloubku místností.
- Final fix: kamera je osově zarovnaná na `[0, 42, 30]`, používá ortografickou projekci a vyšší náklon, který čitelně zachovává podlahy i výšku stěn. Rotace je v provozním dashboardu uzamčena, posun a přiblížení zůstávají funkční.

**Interaction and implementation checks**

- Ověřeno přepnutí `3D pohled` → `Půdorys` → `3D pohled`; oba ovladače po kliknutí hlásily aktivní stav a finální scéna se vrátila do rovného osového pohledu.
- Projekční test potvrdil nulový svislý rozdíl obou konců vodorovné hrany a nulový vodorovný rozdíl obou konců hloubkové hrany (`0`, `0`).
- Browser runtime nezaznamenal žádnou chybu; `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — parametrické KNL ohraničení podle šířky chodby

- Source truth: `/Users/jaroslavjedlicka/Desktop/KNL_ohraniceni_pro_Codex.zip`, zejména `KNL_ohraniceni/KNL_ohraniceni.json`, `boundaries.mjs` a konstrukční profily `bridge` / `facade`. Balíček neobsahuje rastrovou referenci; shoda je proto ověřena proti jeho číselným geometrickým a materiálovým hodnotám.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, KNL profil `Fasádní prosklení`, automatické odsazení 3 m podle uložené šířky chodby.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-knl-boundary-final.jpg` (1600 × 1000 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-knl-boundary-focus.jpg` (1076 × 489 px).
- Browser viewport: 1600 × 1000 CSS px, devicePixelRatio 1; dokument přesně odpovídá viewportu a nemá vodorovné ani svislé přetečení.

**Full-view and focused comparison evidence**

- Celý provozní dashboard i zaměřený výřez ukazují transparentní modré prosklení s pravidelnými sloupky, souvislý pás pochozí plochy a stejnoměrný odstup po celém obvodu skutečné dispozice.
- Zdrojová specifikace nemá obrazový mockup, proto není účelné skládat falešné pixelové porovnání. Vizuální výsledek je porovnán se zdrojovými profily a zároveň ověřen numericky: výška, tloušťka, rozteč, opacity, roughness i metalness jsou převzaty z dodaného balíčku.
- Vnitřní sály, chodba, obvodový plášť, dveře, futra, tablety ani vybavení se přidáním KNL ohraničení neposouvají a nemění rozměry.

**Required fidelity surfaces**

- Fonts and typography: názvy sálů a provozní panely zůstaly beze změny; editorový blok používá stejnou typografii a hierarchii jako stávající nastavení patra.
- Spacing and layout rhythm: ohraničení používá jeden konzistentní odstup na všech čtyřech stranách; výchozí hodnota se počítá z aktuální šířky chodby a lze ji nahradit vlastní hodnotou 0,5–20 m.
- Colors and visual tokens: sklo, sloupky a podlaha používají přesné lineární RGB, průhlednost a materiálové parametry z KNL balíčku, přizpůsobené stávajícímu modrému prostorovému pozadí aplikace.
- Image quality and asset fidelity: ohraničení je nativní Three.js geometrie, nikoli statický obrázek; zůstává prostorové při rotaci, přiblížení i změně kamery.
- Copy and content: editor nabízí srozumitelné volby `Podle šířky chodby`, `Vlastní hodnota`, `Fasádní prosklení` a `Spojovací chodba`.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči dodané KNL konstrukční specifikaci a požadavku na odsazení podle šířky chodby nebo editace.
- [P3] Dodaný dokument je označen jako koncept, nikoli ověřená výrobní dokumentace; aplikace proto zachovává parametrickou editovatelnost místo uzamčení rozměrů.

**Interaction and implementation checks**

- Automatický režim vrací při 3m chodbě odstup 3 m; po změně její šířky na 4,25 m se hranice přepočítá na 4,25 m. Ruční režim zachová zadaných 5,5 m nezávisle na chodbě.
- Deterministický geometrický test potvrdil čtyři skleněné úseky, samostatné sloupky a čtyři pochozí pásy bez změny geometrie místností.
- `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — skutečné proporce 3D dispozice

- Source visual truth — nežádoucí zkosený/snížený stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 11.30.28.png` (2054 × 1136 px) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 11.30.37.png` (2178 × 1030 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, podlaží `Operační blok`, vybraný sál `TRAUMATOLOGIE - 1`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-final.jpg` (1920 × 1200 px).
- Focused 3D region: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-focus.png` (1396 × 687 px).
- Browser viewport: 1920 × 1200 CSS px, devicePixelRatio 1; stránka má shodnou šířku a výšku dokumentu s viewportem, bez vodorovného či svislého přetečení.

**Full-view and focused comparison evidence**

- Normalizované porovnání problémového stavu vlevo a opravené 3D geometrie vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-real-walls-comparison.png` (1944 × 614 px).
- Provozní 3D dashboard již nepoužívá pracovní `cutaway` režim. Přední stěny místností i automatický obvodový plášť proto mají skutečnou uloženou výšku a jejich horní hrana není proti ostatním stěnám snížena.
- Kamera zůstává ortografická; šířka, hloubka, pozice ani otočení žádné místnosti se opravou nemění. Prostorové uspořádání tak odpovídá uloženému projektu bez perspektivního zmenšování přední či zadní řady.

**Required fidelity surfaces**

- Fonts and typography: HTML štítky sálů, velikosti písma, zalamování a provozní panel zůstaly beze změny.
- Spacing and layout rhythm: ovládání, pravý detail a spodní souhrny se neposunuly; změna se týká pouze způsobu sestavení 3D stavebního objemu.
- Colors and visual tokens: materiály, vybraný žlutý stav, modré pozadí a pohyblivá záře zůstaly zachované.
- Image quality and asset fidelity: stěny jsou dál nativní Three.js geometrie se stíny, dveřmi, futry, tablety a materiály; nebyl přidán žádný rastrový překryv.
- Copy and content: názvy sálů a živá data zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku na skutečnou výšku a zachování půdorysu.
- [P3] Plné přední stěny záměrně zakrývají větší část interiéru při velmi nízkém úhlu kamery; půdorysný pohled a rotace zůstávají k dispozici pro kontrolu vybavení.

**Comparison history**

- Baseline P1: pracovní `cutaway` režim snižoval přední stěnu místností na 1,32 m a exponované přední části obvodového pláště na 1,28 m; zadní a boční stěny zůstávaly vysoké, takže stavební objem působil zkoseně.
- Final fix: dashboard sestavuje projekt bez `cutaway` režimu. Editor si nadále zachovává volitelný pracovní pohled s nízkými stěnami, ale tento režim již neovlivňuje provozní 3D zobrazení.

**Interaction and implementation checks**

- Ověřen návrat z detailu sálu, režim `3D dispozice`, vycentrování scény, výběr sálu a finální render při 1920 × 1200.
- Deterministický geometrický test potvrdil: přední stěny 3,25 m stejně jako ostatní stěny testovací místnosti, všechny části obvodového pláště 3,00 m a beze změny pozice `[2, 0, -4]` i půdorysu `8,4 × 6,8 m`.
- `node --check`, `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

## 2026-09-10 — obnovené pozadí detailu sálu

- Source visual truth — nežádoucí aktuální stav: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.28.46.png` (3840 × 2412 px).
- Source visual truth — požadované předchozí pozadí: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.29.26.png` (3840 × 2414 px).
- Implementation: `http://localhost:3000/`, detail sálu `TRAUMATOLOGIE - 1`, fáze `Chirurgický výkon`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-room-detail-background-restored-trauma.jpg` (1920 × 1207 px).
- Browser viewport: 1920 × 1207 CSS px, devicePixelRatio 1.
- Density normalization: zdroj byl zmenšen z 3840 × 2414 na 1920 × 1207; implementační snímek byl kvůli internímu měřítku snímacího nástroje oříznut na 960 × 604 a normalizován na stejných 1920 × 1207 px.

**Full-view comparison evidence**

- Reference vlevo a obnovená implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-room-detail-background-comparison-trauma-final.jpg`.
- Obě strany ukazují stejný sál, stejnou fázi, tmavý černý základ, vínové světlo aktivní fáze a plynulé zhasnutí do černé u okrajů.

**Focused region comparison evidence**

- Samostatný výřez nebyl nutný: požadovanou plochou je celé pozadí a normalizované full-view porovnání jej zobrazuje v plné výšce i šířce. Typografie a ovládací prvky nebyly předmětem změny.

**Required fidelity surfaces**

- Fonts and typography: rodina písma, velikosti, váhy, řádkování a zalamování názvů fází zůstaly beze změny.
- Spacing and layout rhythm: poloha kruhové grafiky, hlavičky, postranních akcí i spodní fáze zůstala stejná; při 1280 × 800 nevzniká vodorovné ani svislé přetečení.
- Colors and visual tokens: detail znovu používá černý základ, tmavý svislý přechod a 90% okrajovou vinětaci. Modré prostorové pozadí ostatních modulů se uvnitř detailu již nevykresluje.
- Image quality and asset fidelity: pozadí je tvořeno původními nativními vrstvami aplikace bez rastrového překryvu; fázové světlo zůstává dynamické podle barvy aktivního stavu.
- Copy and content: názvy sálu, fází a všech akcí zůstaly beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadovanému předchozímu pozadí.
- [P3] Intenzita vínové záře se může nepatrně měnit podle aktuálně uložené barvy aktivní fáze; jde o zamýšlené provozní chování.

**Comparison history**

- Baseline P1: globální 3D podklad pronikl také do detailu sálu a vytvořil širokou modrou plochu, která změnila původní černo-vínový charakter obrazovky.
- Pass 1 P2: detail dostal samostatný tmavý přechod, ale normalizované porovnání odhalilo přetrvávající modrofialový spodní tón a slabší vinětaci.
- Final fix: obnoven čistě černý kořen, původní přechod `from-black via-black/50 to-black/80` a radiální vinětace s 90% černou na okrajích. Následné porovnání se shodným sálem a stavem odstranění modrého závoje potvrzuje.

**Interaction and implementation checks**

- Ověřen přechod z 3D dashboardu do detailu sálu a zpět, výběr `TRAUMATOLOGIE - 1` a nové otevření detailu.
- V detailu není žádná vnořená vrstva `app-module-background` ani prostorový 3D podklad.
- Browser console po finálním testu: 0 error-level položek.
- `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

**Design QA — automatický obvodový plášť dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.05.32.png`.
- Source pixels: 2652 × 1350, vložený sRGB profil, 144 dpi.
- Rendered implementation: izolovaný browser render produkčního `mountEditor` modulu se skutečnou Three.js scénou a styly aplikace.
- Implementation screenshots: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-on.png` a `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-off.png` (oba 886 × 1119).
- Browser viewport: 886 × 1119 CSS px, devicePixelRatio 2; screenshot nástroj normalizoval výstup na rozměr CSS viewportu.
- State: desktop, první patro se šesti sály a centrální chodbou, nízká přední stěna, obvodový plášť zapnutý a následně vypnutý/znovu zapnutý.

**Full-view and focused comparison evidence**

- Full-view comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-comparison.png` (2567 × 920, oba vstupy normalizované na výšku 920 px).
- Focused geometry comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-envelope-focused.png` (2003 × 760, reference vlevo a výřez skutečné 3D scény vpravo).
- Implementace stejně jako reference vytváří jeden čitelný stavební objem: vysoké zadní a boční obvodové stěny, sníženou přední fasádu pro čitelný interiér, souvislou horní krycí hranu, sokl a modulové spáry.
- Společné hrany sousedních místností se do vnějšího pláště negenerují. Dveřní otvory na skutečně vnější hraně zůstávají průchozí.

**Required fidelity surfaces**

- Fonts and typography: nový ovladač používá stávající editorovou typografii, 10–11px pomocný text a jasnou hierarchii `OBVOD BUDOVY` → stav → rozměry.
- Spacing and layout rhythm: ovládání je součástí formuláře patra a nepřidává nový plovoucí panel; pole výšky a tloušťky jsou ve stejné dvousloupcové mřížce jako ostatní rozměry.
- Colors and visual tokens: plášť používá studené modrošedé materiály, světlejší krycí hrany a tmavý sokl; editorový ovladač navazuje na azurové linky stávající aplikace.
- Image quality and asset fidelity: obvod je nativní Three.js geometrie, nikoli statický obrázek či překryv; při rotaci a přiblížení si zachovává perspektivu, stíny i materiál.
- Copy and content: ovladač přesně popisuje automatický obvod, jeho stav a skutečnost, že se přepočítává po přesunu, otočení i změně velikosti prostoru.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadovaný jednotný vnější obvod dispozice.
- [P3] Referenční obraz obsahuje detailnější atypické vybavení a nepravidelnější půdorys; to není součástí tohoto požadavku na obvodové stěny a stávající editor dál používá vlastní datovou dispozici.

**Comparison history**

- Baseline P1: místnosti měly vlastní stěny, ale chyběl samostatný stavební plášť sledující obrys celého patra, takže celek mohl působit jako soustava samostatných boxů.
- Fix: přidán výpočet exponovaných hran sjednocené dispozice a generátor fasády se soklem, krycí hranou, panelovými spárami a rohovými pilíři.
- Post-fix evidence: finální a zaměřený kombinovaný snímek ukazují uzavřený souvislý vnější obvod; `off` snímek potvrzuje, že jej lze samostatně odebrat.

**Interaction and build checks**

- V editoru bylo kliknutím ověřeno vypnutí i opětovné přidání obvodových stěn; stavový text skončil na `Obvodové stěny přidány`.
- Runtime `error` a `unhandledrejection` události byly během načtení a dvojího přepnutí prázdné.
- Deterministický geometrický test dvou sousedních sálů potvrdil nula vnitřních obvodových segmentů a zachované vnější dveřní otvory.
- `node --check`, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

## 2026-09-10 — typografie 3D dashboardu

- Source visual truth — detail sálu: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.17.32.png` (778 × 1130 px).
- Source visual truth — spodní souhrny: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.19.06.png` (3556 × 434 px).
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`, vybraný sál `PCHO SÁL Č.2`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-final.jpg` (1920 × 1200 px; nástroj prohlížeče zachytil aplikaci v levé polovině obrazu při interním měřítku 0,5).
- Browser viewport: 1920 × 1200 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, otevřený detail sálu, živá provozní data.

**Full-view comparison evidence**

- Celý dashboard: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-final.jpg`.
- Rozvržení zůstalo beze změny: panel má 338 × 647 CSS px, spodní souhrn 1752 × 198 CSS px a stránka nemá vodorovný overflow.

**Focused region comparison evidence**

- Detail sálu, reference vlevo a implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-panel-comparison-final.jpg`.
- Spodní karty, reference vlevo a implementace vpravo: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-type-summary-comparison-final.jpg`.
- Pro detail byl zdroj i implementace normalizován na šířku 169 px; pro spodní souhrny na 876 px. Porovnání proto hodnotí typografickou hierarchii při stejné hustotě obrazu.

**Required fidelity surfaces**

- Fonts and typography: zachována rodina písma; nadpis detailu 24 px, stav 16 px, názvy metrik 13,8 px, hodnoty 27 px, doplňkové řádky 13 px a CTA 16 px. Spodní titulky mají 13 px, hlavní hodnoty 36 px a názvy sálů v programu přibližně 10 px.
- Spacing and layout rhythm: původní mřížka 2 × 2, rozměry panelu, CTA i sloupce spodního souhrnu zůstaly zachované. Na nižších výškách je detail bezpečně svisle rolovatelný místo oříznutí obsahu.
- Colors and visual tokens: barvy, kontrast, žlutá CTA i živé provozní odstíny nebyly měněny.
- Image quality and asset fidelity: změna je čistě typografická v CSS; 3D model, materiály, nasvícení a ikony zůstaly beze změny.
- Copy and content: texty, názvy sálů a živá data nebyly upraveny. Rozdíly hodnot proti referenci odpovídají aktuálním provozním datům.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadované čitelnosti.
- [P3] Dlouhý doplňkový text může být v nejužší kartě zkrácen elipsou; hlavní informace a hodnota zůstávají vždy viditelné.

**Comparison history**

- Baseline: názvy metrik, stav sálu, doplňkové texty a typografie spodních karet byly proti referenci příliš malé.
- Pass 1: zvětšeny hlavní hodnoty, titulky a graf programu ve spodních kartách; dorovnána základní hierarchie pravého panelu.
- Pass 2: zesílen nadpis detailu, stav, popisky a metadata; názvy metrik byly uzamčeny na jeden řádek.
- Final: ověřeno při 1920 × 1200 a 1440 × 900; panel se na kratší obrazovce neztrácí a nabízí svislý posun, bez vodorovného přetečení.

**Interaction and implementation checks**

- Ověřen výběr sálu `PCHO SÁL Č.2`; obsah pravého panelu se správně aktualizoval.
- Všechny čtyři názvy metrik zůstaly na jednom řádku.
- Browser console po finálním testu: 0 error-level položek.
- `npm run build` a `git diff --check` prošly bez chyb.

final result: passed

---

**Design QA — zjednodušená horní část 3D editoru**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.03.09.png` (původní stav) a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 9.03.50.png` (cílový styl ikon).
- Source pixels: 3554 × 426 a 524 × 132.
- Rendered implementation: izolovaný browser render produkčních stylů a skutečného `mountEditor` modulu.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-editor-icons-final.png` (886 × 1119).
- Browser viewport: 886 × 1119 CSS px, devicePixelRatio 1.
- State: desktop, 3D editor načtený s výchozí dispozicí; uložený stav reprezentuje ikona se zaškrtnutím.

**Full-view and focused comparison evidence**

- Combined comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-editor-icons-comparison.png` (původní horní blok a cílová ikonová reference vlevo, finální render vpravo).
- Původní souhrnný řádek `Patra / Prostory / Vybavení / Propojené sály`, textová stavová linka i duplicitní hlavička `OR MEDROX` byly odstraněny.
- Čtyři akce `Doplnit vazby`, `Nová dispozice`, `Načíst` a `Uložit` jsou vpravo nahoře jako stejně velké ikonové ovladače s tooltipy a přístupnými názvy.
- Focused comparison nebyl potřeba samostatně: kombinovaný snímek má pouze 280 px výšky a ikonová oblast je v něm čitelná v plné velikosti.

**Required fidelity surfaces**

- Fonts and typography: nadpis modulu a editoru používá stávající typografii aplikace; z odstraněných technických bloků nezůstaly žádné nadbytečné textové popisky.
- Spacing and layout rhythm: ikonový dock používá 46 × 46 px ovladače, 8px mezery a 11px rádius; editor začíná přímo pod titulkem a získal přibližně 85 px svislé pracovní plochy.
- Colors and visual tokens: klidový stav používá tmavě modrý povrch a jemnou linku podle 3D zobrazení, neuložený stav zvýrazní ikonu uložení žlutě a uložený stav používá tlumený mentolový akcent.
- Image quality and asset fidelity: všechny ovladače používají vektorové ikony z již používané knihovny Lucide; nebyly přidány rastrové náhrady ani vlastní kreslené ikony.
- Copy and content: texty zůstávají dostupné v `aria-label` a `title`, takže odstranění viditelných popisků nesnižuje srozumitelnost ani přístupnost.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku.
- [P3] Přihlášená hlavní browser session nemá oprávnění k modulu Nastavení; finální editor proto prošel izolovaným browser renderem se stejným produkčním CSS a skutečným editorem. Databázové handlery ikon byly ověřeny strukturálně a TypeScriptem.

**Comparison history**

- Baseline P1: dvě nad sebou umístěné informační/technické lišty zabíraly velkou část výšky a používaly textová tlačítka odlišná od 3D dashboardu.
- Fix: souhrny a interní hlavička byly odstraněny; čtyři hlavní akce se přesunuly do jednotného ikonového docku u titulku.
- Post-fix evidence: finální render v kombinovaném snímku ukazuje pouze jeden titulek, jeden ikonový dock a editor začínající bez mezilehlého pruhu.

**Interaction and build checks**

- DOM obsahuje přesně čtyři ikonové akce s názvy pro asistivní technologie.
- Načtení a uložení zůstávají připojené ke stávajícím databázovým handlerům; doplnění vazeb a vytvoření nové dispozice ke stávajícím editorovým funkcím.
- Klávesové `Ctrl/Cmd+Z` a `Ctrl/Cmd+Shift+Z` zůstaly zachované i po odstranění duplicitní hlavičky.
- `node --check`, strukturální test, `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Design QA — dveřní portály, vstupní tablety a prostorové transformace**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Detail reference crop: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-ref-door-details.png`.
- Source pixels: 1448 × 1086.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-details-final.png` (1456 × 1092).
- Browser viewport: 1456 × 1092 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `PCHO SÁL Č.2`.

**Comparison evidence**

- Side-by-side focused comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-details-comparison-final.png` (reference vlevo, implementace vpravo).
- Dveře mají zapuštěný tmavý dvoukřídlý portál, oddělené výplně, středovou spáru, práh, světlé boční obložky a horní překlad podle reference.
- Vedle dveří je samostatný vstupní terminál se čtečkou a stavovou diodou; tablet má stěnový držák, rámeček, modré sklo, stavovou hlavičku, řádky rozhraní, žlutou diodu a spodní senzor.
- Vnitřní řady si zachovávají plnou chodbovou stěnu, takže dveře, futra a tablety zůstávají viditelné; snížená stěna se používá jen v nejbližší řadě kvůli čitelnosti interiéru.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: původní rozvržení 3D dashboardu zůstalo zachované; nové díly jsou součástí geometrie místností.
- Colors and visual tokens: dveře používají studené modrošedé výplně, futra světlejší periwinkle odstín, obrazovky sytou modrou a stavové prvky žlutou v souladu se zdrojem.
- Image quality and asset fidelity: detaily jsou nativní Three.js geometrie a materiály, nikoli plošná překryvná grafika; reagují na výběr, kameru a rotaci celé místnosti.
- Copy and content: názvy sálů a provozní data beze změny.

**Spatial editor interaction checks**

- Místnosti včetně sálu, přípravny, skladu a dalších prostor lze otáčet v přesných 90° krocích; vybavení používá jemnější 15° krok.
- Režim `Rozměry` mění šířku a hloubku prostoru přímo v ploše; inspektor poskytuje i přesné krokové změny rozměrů.
- Přichycení pracuje s mřížkou i se středy a vnějšími hranami sousedních místností, počítá s jejich rotací a zobrazuje azurové zarovnávací vodicí linky.
- Transformace zapisují polohu, rotaci, šířku a hloubku do stávajícího projektového modelu, takže se ukládají stejnou cestou jako ostatní změny dispozice.
- Deterministický test ověřil otočení přípravny na 90°, rozměr 8,25 × 5,5 m, přichycení obou os, validitu projektu a přítomnost všech dveřních i tabletových částí.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadované dveřní, futrové, tabletové a transformační funkce.
- [P3] Aktuální přihlášená browser session nemá administrační položku Nastavení, proto byl samotný editor ověřen deterministickými testy transformačního enginu a validací geometrie; finální dashboard render byl ověřen v prohlížeči.

**Comparison history**

- Baseline: dveře byly příliš ploché, bez čitelných obložek, samostatného vstupního terminálu a detailního tabletu.
- Pass 1: přidán dvoukřídlý portál, futra, práh, terminál a detail tabletu; vysoké dveřní díly však u snížených stěn působily odděleně.
- Pass 2: výška portálu se navázala na profil stěny a plná chodbová stěna zůstala u vnitřních řad.
- Final: zvýšen lokální kontrast dveří a futer, ověřena viditelnost tabletů i vybraného sálu a porovnána finální scéna se zdrojem.

**Build and validation**

- `node --check` prošel pro model, geometrii, oba viewery i editor.
- `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Design QA — odstín stěn 3D dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Source pixels: 1448 × 1086.
- Implementation: `http://localhost:3000/`, dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-wall-tone-final.png` (1456 × 1092).
- Browser viewport: 1456 × 1092 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `PCHO SÁL Č.2`.
- Density normalization: oba výřezy byly převedeny na shodných 955 × 525 px.

**Comparison evidence**

- Side-by-side focused comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-wall-tone-comparison-final.png` (reference vlevo, implementace vpravo).
- Konstrukční stěny nyní používají světlý studený modrošedý odstín se samostatně světlejšími horními hranami. Výsledný odstín odpovídá periwinkle/slate charakteru reference a už nepůsobí tmavě námořnicky.
- Teplé žluté zvýraznění vybraného sálu zůstalo zachováno a nebylo přebarveno společně se stěnami.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: beze změny; rozměry sálů, stěn, vybavení i ovládacích prvků zůstaly stejné.
- Colors and visual tokens: stěny `#9aa6c0`, čelní stěny `#8492ae`, konstrukční hrany `#aebbd5`; materiály mají nízkou kovovost a měkkou difuzní odezvu, aby odstín zůstal čitelný i mimo přímé světlo.
- Image quality and asset fidelity: změna je provedena v nativních Three.js materiálech, bez překryvného filtru nebo rastrového zabarvení.
- Copy and content: názvy sálů i provozní data beze změny.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl pro požadovaný odstín stěn.
- [P3] Referenční vizualizace používá odlišnou geometrii a nasvícení; tyto části nebyly předmětem této barevné úpravy.

**Comparison history**

- Baseline: stěny byly výrazně tmavší a sytěji modré než reference.
- Pass 1: konstrukční hrany byly odděleny od materiálu vybavení, aby jejich zesvětlení neovlivnilo přístroje.
- Pass 2: stěny a fasády byly posunuty do neutrálnějšího modrošedého odstínu a zesvětleny v zastíněných částech.
- Final: jemně zvýšena světlost stěn a hran; porovnání potvrzuje shodný studený modrošedý charakter bez plošného barevného filtru.

**Interaction and implementation checks**

- Ověřen výběr sálu `PCHO SÁL Č.2`; detail i žluté zvýraznění reagují správně.
- DOM po finálním testu neobsahuje chybový překryv aplikace.
- `npx tsc --noEmit`, `npm run build` a `git diff --check` prošly.

final result: passed

---

**Předchozí Design QA — prostorová záře 3D dispozice**

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-09 v 23.55.17.png`, doplněný uživatelskou anotací, že velká statická záře a její obdélníkový konec jsou nežádoucí.
- Source pixels: 3840 × 2402 (`@2x`); pro porovnání normalizováno na 1920 × 1201.
- Implementation: `http://localhost:3000/`, přihlášený dashboard v režimu `3D dispozice`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-final.png` (1920 × 1201).
- Browser viewport: 1920 × 1201 CSS px, devicePixelRatio 1.
- State: desktop, 3D perspektiva, vybraný sál `TRAUMATOLOGIE - 3`.
- Density normalization: zdroj byl zmenšen přesně na 50 %; zdrojová i implementační strana porovnání mají shodných 1920 × 1201 px.

**Full-view comparison evidence**

- Side-by-side comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-comparison.png` (původní stav vlevo, opravený stav vpravo).
- Původní velký modrý závoj vyplňoval téměř celou obdélníkovou plochu jeviště a vizuálně končil před souhrnnými kartami. V opraveném stavu je tato statická DOM vrstva odstraněna; podklad zůstává souvislý a model má jen měkký nízko-kontrastní lem podél vlastního obvodu.

**Focused region comparison evidence**

- Focused model comparison: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-focus.png`.
- Výřez potvrzuje, že halo končí plynulým přechodem do nuly kolem siluety budovy, nikoli hranou obdélníku. Záře nepřekrývá vybavení, popisky ani pravý detail sálu.
- Alternate-camera evidence: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-halo-plan-final.png` ukazuje stejný jemný obvod po přechodu do půdorysu; efekt je součástí 3D skupiny podlaží, takže se transformuje společně s ní.

**Required fidelity surfaces**

- Fonts and typography: rodina, optické váhy, velikosti, řádkování, proklady, zalamování a kontrast textu nebyly změněny.
- Spacing and layout rhythm: rozměry jeviště, modelu, detailního panelu, ovládání a spodních souhrnů zůstaly beze změny; odstranění statických pseudo-vrstev neovlivnilo layout.
- Colors and visual tokens: halo používá tlumenou modrou `#526bc7` s maximální opacitou `0.13`; nepřidává fialový ani bílý závoj a souzní s námořnickým pozadím aplikace.
- Image quality and asset fidelity: efekt je nativní průhledný WebGL shader pod modelem, nikoli rastrový obrázek nebo oříznutý CSS gradient. SDF přechod dosáhne plné transparentnosti ještě před hranicí geometrie, takže nemůže ukázat pravoúhlý okraj.
- Copy and content: názvy sálů, provozní data i ovládací texty zůstaly nezměněné.

**Findings**

- Nezůstává žádný akční P0/P1/P2 rozdíl vůči požadavku.
- [P3] Softwarový renderer bez WebGL halo záměrně vynechá, aby jeho jednodušší rasterizace nevykreslila neprůhlednou plochu. Model i ovládání v tomto nouzovém režimu zůstávají funkční.

**Comparison history**

- Původní P1: dvě absolutně umístěné CSS radiální vrstvy vytvářely velkou statickou plochu, nereagovaly na kameru a jejich rozsah četl jako obdélníkový box.
- Oprava: obě pseudo-vrstvy byly odstraněny. Do skupiny podlaží byl přidán zaoblený obvodový shader s průhledností, nulovým zápisem do hloubky a úplným vyhasnutím před hranicí vlastní roviny.
- Post-fix evidence: full-view i focused comparison výše; žádná obdélníková hrana ani velký statický závoj nezůstává. Další P0/P1/P2 iterace nebyla nutná.

**Interaction and implementation checks**

- Ověřen výběr sálu `TRAUMATOLOGIE - 3`.
- Ověřen přechod `3D pohled` → `Půdorys` → `3D pohled`; halo změnilo perspektivu společně s modelem.
- Browser console po finálním testu neobsahovala error-level položky.
- `node --check`, `git diff --check` a validace `.21st/design.json` prošly.
- Produkční `npm run build` prošel včetně TypeScriptu a generování stránek.
- `21st review` pro oba změněné moduly prostorového rendereru: 0 findings.

final result: passed

---

## 2026-09-10 — barevné sjednocení carouselových karet

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 18.16.19.png` a `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-09-10 v 18.16.35.png`.
- Implementation: `http://localhost:3000/`, modul `Nastavení systému`, carousel modulů.
- Viewport: ověření bylo spuštěno v in-app prohlížeči; chráněný stav carouselu nebyl bez administrátorské relace dostupný.
- State: přihlašovací obrazovka bez dostupného zdravotnického zařízení.

**Findings**

- Zdrojové snímky potvrzují příliš černý spodní tón aktivních i vzdálených karet.
- Implementace nahrazuje černé výplně transparentní námořnickou modří, zachovává fialový akcent aktivního modulu a používá modře tónovaný stín.
- Vizuální post-fix snímek chráněného carouselu nelze bez aktivní administrátorské relace bezpečně pořídit.

**Required fidelity surfaces**

- Fonts and typography: beze změny.
- Spacing and layout rhythm: rozměry, perspektiva, pozice a animace karet jsou beze změny.
- Colors and visual tokens: upraveny pouze výplně a stíny carouselových karet.
- Image quality and asset fidelity: carousel neobsahuje rastrové obrazové prvky; ikony zůstaly beze změny.
- Copy and content: beze změny.

**Implementation checks**

- `git diff --check` a produkční `npm run build` včetně TypeScriptu prošly.
- Browser console chráněného carouselu nebylo možné zkontrolovat, protože test skončil na přihlášení.

final result: blocked

---

## 2026-09-10 — věrnost 3D operačních sálů referenčnímu renderu

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/c9a87c58-31d8-42d8-891d-0218ecd44e69.png`.
- Source comparison crop: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-reference-crop.png` (1280 × 720 px).
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-spatial-final-preview.png` (1280 × 720 px).
- Implementation: izolovaný náhled stejného `DashboardViewer`, stejného modelového stromu, materiálů a světel jako produkční 3D dispozice.
- State: šest operačních sálů, mírně natočená ortografická kamera, architektonický řez, aktivní `PCHO 2`, načtené GLB vybavení.
- Density normalization: zdrojový výřez i implementace byly porovnány v přesně shodném rastru 1280 × 720 px.

**Full-view comparison evidence**

- Kamera má shodný izometrický charakter bez perspektivního sbíhání; mírně nižší elevace odpovídá referenci a ponechává čitelné dveře, čelní stěny i interiér.
- Studený modrošedý stavební plášť, tmavé spáry panelů, podlahová mřížka a měkké pozadí odpovídají charakteru zdroje.
- Aktivní sál používá samostatné teplé lokální světlo a netonemapované žluté světelné linky. Ostatní sály zůstávají studené a neutrální.

**Focused region comparison evidence**

- Vybavení již není pouze nízkopolygonová procedurální náhrada: renderer asynchronně načítá všech 12 dodaných GLB modelů (`table`, `light`, `anesthesia`, `monitor`, `cabinet`, `trolley`, `wallScreen`, `tablet`, `sink`, `bed`, `stool`, `pendant`).
- GLB materiály mají studený kovový tón, environmentální odraz, emisivní čočky operačních světel a emisivní obrazovky. Pod podlahovým vybavením je jemná eliptická kontaktní stínová vrstva.
- Dveřní portály, obložky, křídla, prahy, čtečky a tablety zůstávají samostatné geometrické prvky a vrhají/přijímají stíny.

**Required fidelity surfaces**

- Fonts and typography: popisky sálů zůstaly beze změny; aktivní popisek používá žlutou zdroje.
- Spacing and layout rhythm: půdorysné rozměry a pozice místností se nemění; architektonický řez ovlivňuje pouze viditelnost stěny směrem ke kameře.
- Colors and visual tokens: sníženo přepalování globálním světlem; teplé světlo je omezené na aktivní sál, neutrální stěny zůstávají studeně modrošedé.
- Image quality and asset fidelity: používají se binární modely z dodaného `orms-spatial-editor-v0.2.2.zip`, PBR prostředí, ACES tonemapping, sRGB výstup a 2048px PCF stíny.
- Copy and content: názvy, provozní stav ani datové vazby nebyly změněny.

**Findings and capability boundary**

- [P2] Zdrojový PNG je hotový prerender s jemnější autorskou geometrií a obrazovými materiálovými mapami. Dodané GLB soubory tuto úroveň detailu ani bitmapové textury/normal mapy neobsahují; přesná pixelová shoda proto vyžaduje původní 3D scénu nebo kvalitnější texturované modely. Implementace nyní používá nejdetailnější dostupné zdrojové assety namísto aproximací.
- Nezůstává regresní P0/P1 rozdíl v načítání, barevném řízení stavu, ovládání kamery ani výběru sálu.

**Interaction and implementation checks**

- Loader čeká na skutečné GLB požadavky a hlásí jejich průběh místo předčasného skrytí.
- Při chybě jednoho souboru zůstává pro daný kus bezpečný procedurální fallback.
- Stejná GLB hydratační vrstva je zapojena v dashboardu i prostorovém editoru.
- Produkční `npm run build` včetně TypeScriptu a generování všech 29 stránek prošel.

final result: passed within supplied-asset fidelity; source-asset boundary documented

---

## 2026-09-13 — referenční sál `pcho-3.glb`

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/pcho-3.glb`.
- Implementation screenshot: `/Users/jaroslavjedlicka/COWORK/operatingroommanagement/design-qa-pcho3-reference-model.png` (1440 × 900 px).
- Implementation: stejný `DashboardViewer` a šest sálů demo dispozice, přičemž každý operační sál používá sdílenou instanci nového referenčního modelu.
- State: prostorový pohled, aktivní `PCHO 2`, červená živá fáze, zapnuté teplé provozní světlo.

**Asset inspection**

- Rozměry zdroje: 7,030 × 6,825 × 3,090 m; souřadný systém Y-up a počátek ve středu podlahy odpovídají internímu modelu aplikace.
- Model obsahuje 71 samostatných meshů a členění Architecture, VideoManagement, Table, Anaesthesia, SurgicalLights, CeilingBooms, Furniture, FloorDetails, MedicalServices a MedicalAccessories.
- Tři vložené PNG textury jsou zachovány jako sRGB base-color a emissive mapy displejů.

**Required fidelity surfaces**

- Geometry: procedurální obálka a samostatné jednoduché vybavení jsou po načtení nahrazeny kompletním referenčním sálem; model se škáluje pouze podle uložené šířky, hloubky a výšky místnosti.
- Materials: autorské PBR barvy, metalness, roughness, průhlednost a obrazové textury zůstávají zachovány. Stěnové materiály mají samostatný klon pro živé stavové zabarvení.
- Lighting: globální studené světlo, aktivní teplé světlo a žlutá obvodová linka zůstávají funkční; všechny části modelu vrhají i přijímají stíny.
- Interaction: výběr sálu funguje přes celý vložený model, protože referenční scéna zůstává potomkem původní interaktivní skupiny místnosti.
- Performance: geometrie a neměnné materiály se mezi sály sdílejí; jeden 2MB GLB nahrazuje dvanáct samostatných požadavků na vybavení. Procedurální scéna zůstává fallbackem při chybě souboru.

**Findings**

- Předchozí [P2] omezení chybějící kvalitní zdrojové geometrie je tímto GLB odstraněno.
- Nezůstává P0/P1/P2 odchylka v geometrii nebo texturách vůči dodanému modelu; stavové zabarvení je záměrná funkční vrstva aplikace.

**Implementation checks**

- `node --check` prošel pro loader referenčního sálu, geometrii a dashboard viewer.
- `git diff --check` prošel.
- Produkční `npm run build` včetně TypeScriptu a všech 29 stránek prošel.

final result: passed

---

## 2026-09-15 — mobilní aplikace podle `apka.jpg`

### Podklad a rozsah

- Source visual truth: `/Users/jaroslavjedlicka/Desktop/apka.jpg`.
- Implementovány skutečné komponenty `DashboardModule`, `MobileRoomOverview`, `SpatialDashboardView`, `RoomDetail` a `MobileNav`, nikoli statická maketa.
- Rozsah: telefonní přehled sálů, 3D/půdorys, vybraný sál, detail a navigace ve světlém a tmavém režimu. Desktopový dashboard a desktopová větev detailu zachovány.
- Izolovaný lokální náhled: `/private/tmp/orm-mobile-qa-4EjNBg`, port 4174. Autentizace a data nahrazeny explicitními ukázkovými záznamy; žádné zápisy do provozní databáze. Fixture není součástí aplikace.

### Vizuální porovnání

- Šest snímků implementace v 390 × 844 px: `/private/tmp/orm-mobile-final-qa/{dashboard,spatial,detail}-{light,dark}.png`.
- Společný obraz předlohy a všech šesti implementovaných obrazovek: `/private/tmp/orm-mobile-final-qa/source-comparison.png`. Porovnáno jako jeden obraz, se zachováním poměrů stran a čitelnými popisy zdroje/implementace.
- Trvalý náhled mimo Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-implemented-preview.png`.
- Typografie: kompaktní nadpisy, jemné pomocné texty, výrazné číselné hodnoty; velké desktopové prvky se do telefonu nepřenášejí.
- Rozestupy: jednotné boční odsazení, jemné 12–16px zaoblení, 2 sloupce časů a akcí, pevná spodní navigace. Na nízkém telefonu je obsah detailu vnitřně posuvný a primární akce zůstává viditelná.
- Barvy: světlé ledově modré plochy / tmavé námořnické plochy, jemné hranice, žluté primární akce, skutečné konfigurované barvy fází bez log na kartách.
- 3D asset fidelity: stávající GLB, geometrie, materiály, osvětlení a prostorové vazby nebyly kvůli mobilnímu návrhu změněny; pouze ovládací vrstva, rozměry panelů a kompaktní štítky.
- Záměrné rozdíly: žádný falešný rámeček telefonu ani systémový status bar; názvy a počty odpovídají skutečným datům, nikoli číslům v maketě. Skutečný workflow může mít více než pět fází a lze jím vodorovně posouvat. Aktuální fáze se při změně dostane do zorného pole. Požadované Volat, Příjezd a ±15 min jsou nad rámec původního obrázku. Rozměry skutečné dispozice zůstávají zachovány, proto model nemá v každé nemocnici stejný poměr stran jako kresba.

### Opravy během kontroly

- Odstraněn průnik tmavého pozadí do světlého 3D pohledu.
- Doplněna mobilní hlavička a stav načítání pro uložený 3D pohled, zatímco se načítají sály.
- Zmenšeny 3D štítky a skryty nevybrané popisky nepropojených pomocných místností, aby nepřekrývaly sály.
- Odstraněno dvojité spodní odsazení; mobilní kořen používá dynamickou výšku viewportu.
- Více zachovává autorizované položky i odhlášení; nativní Back zavírá otevřený navigační panel.
- Počáteční chyby GLB blob textur a dvojího React kořene pocházely z CSP/HMR izolované fixture. Opraveny jen ve fixture; po úplném načtení nebyly nové chyby ani varování v konzoli.

### Funkční a regresní ověření

- Prohlížeč: 390 × 844 světlý/tmavý, 360 × 640 detail s dostupnými akcemi bez vodorovného přetékání, 430 × 932 3D bez vodorovného přetékání, 1440 × 900 zachovaný desktop.
- Vyzkoušeno hledání + filtr připravených sálů; otevření detailu; výběr místnosti v 3D i půdorysu; přechod z panelu do detailu.
- Vyzkoušeno +15/−15 minut se správnou změnou času; pauza/pokračování; hygienický režim; Volat a následné potvrzení příjezdu; potvrzovací dialog další fáze; výběr ARO lékaře. Ověřeny callbacky a události na ukázkových datech.
- `node --test tests/*/*.test.js`: 194/194 úspěšně.
- `npx tsc --noEmit --pretty false`, `npm run mobile:build`, `npm run build` a `git diff --check`: úspěšně. Vite pouze upozorňuje na existující velikost chunků.
- Nativní zařízení a produkční databázové zápisy nebyly součástí testu; žádné nasazení ani push.

final result: passed — mobile UI and local interactions verified; actual-device/backend verification remains outside this isolated visual test

---

## 2026-09-17 — iOS refinement of the mobile application

### Reference and scope

- User reference: https://developer.apple.com/design/resources/#ios-apps and Apple HIG segmented controls, tab bars, materials, and layout.
- The supplied Figma document `o3xpkURlzTA80GnSDBpDsf`, node `0:1`, returned an empty Page 1 canvas. No pixel-exact Figma match is claimed.
- Applied the 21st UI-build workflow with the existing project design tokens/components. The 21st CLI was unavailable, so no catalog package or new dependency was introduced. SwiftUI translation was not applicable to this React/Capacitor visual refinement.
- Retained the approved light ice-blue / dark navy palette, yellow primary actions, configured phase colors, existing clinical handlers, permissions, and actual 3D assets. No native SwiftUI conversion, backend change, deployment, or push.

### Visual implementation

- Mobile system typography, large sentence-case page headings, inset grouped room/personnel lists, hairline separators and restrained surfaces.
- Neutral raised segmented controls, 16px search input, minimum 44px estimate controls, translucent tab bar, and grouped More sheet with a separate logout action.
- Detail has compact vertical spacing so all four clinical actions are visible on the tested 390 × 844 viewport; smaller screens retain an internal scroll region and a fixed primary CTA.
- Six actual UI screenshots with synthetic data: `/private/tmp/orm-ios-qa.crqWqJ/{dashboard,spatial,detail}-{light,dark}.png`.
- Reviewed combined preview: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-ios-preview.png`. QA badges and hospital names belong only to the isolated fixture.

### Verification

- Browser checked light/dark dashboard, room detail, 3D panel and More sheet at 390 × 844. Search + prepared filter returned the expected single matching room. Selected 3D room opened the real detail component.
- At 320 × 640, document width stayed 320px, the inner detail scrolled (559px content / 385px visible), and estimate buttons measured 59 × 44px. Call action remained reachable and enabled Arrival after invocation on synthetic data.
- At 1440 × 900, the mobile detail was hidden and the existing desktop branch rendered; no horizontal page overflow. Phone-specific CSS has media-query regression coverage. Browser console had no errors or warnings at final inspection; viewport override reset.
- Independent React/source review found no new regression, desktop style leakage, or permission/handler change. Shared segmented indicators use per-instance IDs and respect reduced motion.
- 31/31 focused mobile tests passed, including 7 new iOS shell/navigation checks. Next production build (including TypeScript), mobile Vite production build, and `git diff --check` passed. Vite retains its existing large-chunk advisory.
- Full suite: 200/201 passed. The existing statistics fixture `notification impacts keep zero distinct from unavailable and label overlapping sums` is date-dependent: fixed 14 September/Monday data is compared to the real rolling last-24-hour window. Independently verified that the unchanged test passes when its clock is frozen in memory to 14 September. No unrelated statistics code/test was modified for this UI task.
- Physical iPhone safe areas, Safari rendering and native/backend integration remain outside this local browser check.

final result: passed for scoped iOS visual refinement; one unrelated date-dependent statistics test remains failing in the full suite

---

## 2026-09-17 — Unified mobile cards and blue dark theme

### Scope and design contract

- Continued the mobile/iOS refinement, using the existing application components and shared design tokens through the 21st UI-build workflow. The CLI was unavailable; no dependency was added.
- Unified mobile content cards: 20px radius, 16px padding, 17px/600 headings placed first at the top-left. Shared page headings use 28px text, a 44px utility row and 20px page gutters.
- Applied to room overview/detail, patient flow, timeline, selected 3D room, statistics sections, personnel and Settings landing cards. The dark palette now uses Alerts-family navy/blue surfaces instead of greenish navy. Yellow actions and configured clinical status colors remain distinct.
- Desktop and print styling, permissions, clinical handlers, actual 3D geometry/materials and backend data were not changed. Internal statistic tiles remain subordinate to card headings, rather than receiving oversized page typography.
- Updated `.21st/design.json` to record the shared mobile contract. This supersedes the earlier mobile card geometry in this log.

### Browser QA and fixes

- Used actual application components with synthetic data in the isolated fixture `/private/tmp/orm-mobile-qa-4EjNBg` on port 4174. External/API writes were blocked; no production data was modified.
- Inspected dark/light overview, detail, 3D selected-room panel and statistics at 390 × 844; also inspected flow, timeline, Settings carousel/grid and personnel.
- Computed-style checks confirmed 17px/600 card headings and matching 17px outer-edge-to-text offsets (16px padding plus 1px border). Shared page headings aligned at x=20, y=74 on the tested mobile viewport.
- Opened all seven statistics sections. Found and fixed the mobile dynamic-import adapter's handling of direct React.memo/forwardRef exports; it now provides the module-shaped result required by React.lazy. Added actual lazy-render regression tests.
- At 320 × 640, detail and statistics had no horizontal page overflow. Detail content remained internally scrollable (710px content / 330px visible); estimate controls measured 51 × 44px. On shorter screens clinical action rows remain available by scrolling, while the primary action stays fixed.
- Synthetic interaction checks: +15 minutes updated the estimate; Call invoked the handler and enabled Arrival. Existing clinical behavior was retained.
- At 1440 × 900, mobile headers/styles were inactive and desktop statistics retained their prior geometry. Viewport override reset after QA.
- Reviewed preview: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-jednotne-karty.png`. The hospital/data and QA badge in these images are fixture-only.

### Verification

- Next production build, TypeScript check and final mobile Vite production build passed. Vite retains the existing large-chunk advisory.
- Added 23 passing regression tests covering shared mobile card styles, statistics, Settings and the dynamic adapter.
- Full suite: 223/224 passed. The sole failure is the unchanged date-dependent statistics fixture documented above (`notification impacts keep zero distinct from unavailable and label overlapping sums`); fixed 14 September data falls outside the current rolling time window.
- Physical iPhone/Safari and real backend integration were not tested. No deployment or push was performed.

final result: scoped mobile visual unification verified; unrelated date-dependent statistics test remains failing

---

## 2026-09-17 — Two-column iOS-style room tiles

- User-selected direction: replace full-width mobile operating-room rows with two equal-width cards side by side. Reused shared mobile typography, blue/light surfaces, 20px radius and 16px insets under the 21st UI-build workflow; no dependency or external component was added. This is a React/Capacitor visual adjustment, not a SwiftUI conversion.
- `MobileRoomOverview` now places the full room name and live phase first, two labelled times beneath, and separate Detail/context-menu controls in a footer. Czech hyphenation and balanced wrapping retain complete long names. Semantic phase colors, room actions, search/filter behavior and desktop layout are unchanged.
- Browser verified the real component with synthetic fixture data at 390 × 844 (light/dark) and 320 × 640 (dark). Equal card widths were 169px and 135px respectively; no horizontal page/card overflow. Footer touch targets measured at least 44 × 44px. Card heights align within each grid row.
- Verified prepared-room filtering, empty search result and reset, independent context menu opening/dismissal, and opening the correct room detail. No clinical action was sent to the real backend.
- At 1440 × 900 the mobile overview was hidden and the existing desktop room grid remained visible without horizontal overflow. Temporary viewport override reset.
- 27 focused regression tests passed, including six new grid/render-tree tests. TypeScript and mobile production build passed; only the existing Vite chunk-size advisory remains. No production deployment or push. Physical iOS hardware was not part of this browser check.
- Visual evidence outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/room-grid-dark.png` and `room-grid-light.png` (synthetic data).

final result: passed for the scoped two-column mobile room grid

---

## 2026-09-17 — Viewport-fitted mobile Rozpis timeline

- Replaced the mobile list/axis switch and long room cards with one iOS-inspired timeline. Reused the shared 20px card surface, 17px heading, 20px page gutters, navy/light palette and segmented controls through the 21st UI-build workflow. No new dependency was added.
- Time navigation offers 2 hours, 4 hours, an operational day (07:00 to next-day 07:00), previous/next windows and Now. Available vertical space determines the number of room rows; the remaining rooms are paged with 44px controls, with no page or chart scrolling. Smaller screens hide supplementary summary/header content before reducing readability.
- The timeline distinguishes recorded history/current phases, dashed future estimates, striped pauses and the current-time marker. Missing data explicitly says no record; ready rooms do not invent current activity. Phase lookup uses the enabled workflow array position. Accessible row names retain current state and specialty; descriptions include actual interval times. Room clicks retain the existing detail callback.
- Parent App already reserves 80px for the fixed tab bar; the timeline adds only its small inner/safe-area inset. Desktop, permissions, clinical handlers and database access remain unchanged.
- Browser QA used actual components with synthetic data in `/private/tmp/orm-mobile-qa-4EjNBg`, with real API writes blocked. Verified 390 × 844 light/dark (4 rooms/page), 320 × 568 (2 rooms/page) and 667 × 375 landscape (1 room/page). Document dimensions exactly matched each viewport with no overflow; paging stayed above the bottom navigation. Row heights were at least 80px in these views.
- Verified next/previous room groups, next time window, full operational day, Now reset, absence of a misleading current-time line outside the displayed window, and opening the correct room. Browser console had no errors/warnings. Temporary viewport override was reset.
- Reviewed screenshots outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-timeline-dark.png` and `mobile-timeline-light.png`.
- Next production build including TypeScript and mobile Vite production build passed; Vite retains the existing large-chunk advisory. All 34 focused regression tests passed. Data/layout coverage includes history clipping, completed cycles, pauses, estimates, missing timestamps, midnight/DST boundaries, measured pagination, resizing, empty states and screen-reader descriptions. Emergency/lock overlays retain measured workflow history without fabricating a completion time or a future forecast.
- Physical iPhone/Safari and live backend integration were not tested. Existing app breakpoint still switches to desktop at widths of 768px and above, including wide landscape phones. No deployment or push.

final result: passed for the scoped mobile timeline

---

## 2026-09-18 — Mobile title hierarchy and vivid current phase

- Removed introductory mobile header kickers (such as Operační blok / Živý operační program). The actual screen title now occupies the top-left toolbar beside existing actions; optional facility/date metadata remains below. Shared administration kicker rows are hidden only below 768px. Removed the obsolete floating short-screen Rozpis heading rule.
- Reused the existing shared mobile components/tokens through the 21st UI-build workflow. The room detail's active phase is a deliberate semantic exception to neutral cards: configured status-color gradient, outline/glow, colored elapsed-time accent and workflow markers. The top row contains Aktuální fáze and the actual workflow position/count. Dark mode has a deeper navy center; light mode uses a tinted surface and dark text. Ready stays neutral; pause/emergency/lock preserve existing priority colors.
- Actual clinical handlers, confirmations, permissions, +/− timing, personnel actions and desktop presentation were preserved. No hardcoded surgery pink or six-step sequence; the screenshot is a style reference, not data.
- Browser QA used actual components with synthetic data in `/private/tmp/orm-mobile-qa-4EjNBg` on port 4174, with external/API writes blocked. Inspected overview, flow, Settings, Rozpis, statistics and room detail at 320 × 640 / 390 × 844. Settings title and all three actions fit at 320px. No horizontal document overflow; Rozpis document remains exactly 320 × 640. Ready and paused states were inspected, and the live pause color was cyan with phase advancement disabled.
- Visually inspected the active phase in light and dark themes. At 1440 × 900 the mobile detail is hidden, the desktop kicker retains display:flex, and the document has no horizontal overflow. Browser console reported no warnings/errors. Temporary viewport override reset.
- 95 focused mobile regression tests pass; TypeScript, Next production build and mobile Vite production build pass. Vite retains the existing large-chunk advisory. Independent source review found no blocking regressions. `git diff --check` passes.
- Visual evidence outside Git: `/Users/jaroslavjedlicka/.codex/visualizations/2026/08/20/01a020bb-6261-7152-8eaa-49ba81b1cac8/mobile-current-phase-dark.png` and `mobile-current-phase-light.png` (synthetic QA data). Physical iPhone/Safari and live backend integration were not tested. No deployment or push.

final result: passed for scoped mobile headers and current-phase styling

## 2026-09-18 — Responsive mobile room detail

- Reused existing 21st design contracts and components; compacted header, timing cards, personnel and four actions without changing clinical handlers. Estimate buttons and primary controls retain 44px targets. Landscape places the phase beside timing/personnel and keeps the next-phase button in normal layout flow.
- Actual components verified with isolated synthetic data: 320 × 568, 348 × 614, 390 × 712, 430 × 932 and 568 × 320. Additional long-title/eight-phase/paused/hygiene/emergency/locked stress checks at heights 614, 712, 780, 844, 900 and 932 showed no body overflow. Light and dark screenshots reviewed; no browser errors. Viewport override reset.
- 98 mobile regression tests, TypeScript, mobile production build and diff whitespace checks passed. Existing Vite chunk-size advisory remains. No backend data changed, deployment or push performed. Physical iOS Safari was not tested. Widths from 768px retain existing desktop behavior. Exceptional content/accessibility enlargement retains a scrolling fallback rather than clipping controls.

final result: passed for scoped mobile detail viewport fit

## 2026-10-08 — Acute selection outside queue order and dashboard labels

- Reused the accepted borderless RoomDetail ribbon and existing neutral glass/timeline urgency tokens under the 21st UI-build contract. A non-head unbound selection shows `Není dodrženo pořadí výkonů`, identifies the actual first waiting request, and retains the full waiting queue including the selected highlighted node. The current manual rank is not confused with urgency or immutable submission number. The local queue scroll reveals only the selected node, not the page; navigation never reorders or starts a clinical cycle. Bound cycles do not invent a historical order violation.
- Dashboard desktop and actual mobile overview receive one shared authorized SWR projection. A passive label distinguishes assigned pending requests (procedure, urgency, current rank, additional count) from an exactly bound current acute cycle. Server-only tenant-scoped binding reads also include completed bindings for still-active requests outside the displayed Timeline interval, with 500-row pagination and monotonic completion merging. No migration, broader grants, clinical write or automatic queue closure.
- Acute cards reserve a uniform 360px minimum for the whole desktop grid. The SVG indicator retains an 84px minimum (approximately 60px visible circle) rather than shrinking to a tiny number. Existing transparent centers, phase colors, asymmetric action pockets, specialties, staff, keyboard/clinical callbacks and mobile themes remain intact.
- Live localhost read-only QA: Timeline request PŘEVAZ VAC opens its actual Sál č. 4 detail as selected for the next cycle while its unrelated running clinical cycle stays unchanged. Dashboard shows that pending request and the precisely bound APPE running cycle on Sál č. 5; the user's previously completed URS on Sál č. 7 is not labelled as waiting. No request was created, reordered, cancelled, started or completed during this QA. The currently remaining live waiting queue has only one unbound request, so out-of-order behavior is covered by synthetic render/context/start regression cases, not a fabricated live clinical example.
- Actual viewports confirmed through DOM measurements: 1543×1109 and 1024×768 desktop/tablet have no horizontal page overflow, uniform 360px cards and contained acute labels. Tablet indicator is 84px with about 2.5px clearance between its caption and badge. At 390×844 all 15 actual mobile room cards remain in the DOM; both new labels wrap within their cards without horizontal overflow. This is scoped badge/layout verification, not a claim of a new exhaustive mobile-header audit. Temporary viewport override reset and the original 1543×1109 view confirmed.
- 267/267 focused acute/dashboard/mobile/timeline regression tests pass, including isolated synthetic PostgreSQL transaction/grant tests run with shared-memory permission. TypeScript noEmit and `git diff --check` pass. Updated two stale mobile test fixtures to the pre-existing full-card quick-action/Cliniq behavior without production changes. `21st review` of the four new ribbon/badge TSX/CSS files reports zero findings; broader integration review has only pre-existing informational palette notes. Shared data, memoized maps, primitive effect keys, no per-card fetch and passive markup checked against React best practices.
- Evidence outside Git: `output/acute-qa/acute-dashboard-assigned.png`. No production deployment, commit or push. Physical mobile hardware was not tested.

final result: passed for scoped acute queue warnings and real room-card labels
## 2026-10-08 — Odhad výkonu ve třech výběrových boxech

- Číselný ovladač odhadu v akutním create/edit popupu nahrazen nativními required radio boxy Do 30 min / Do 60 min / Více než 60 min. Nové uzavřené rozsahy explicitně používají horní odhad 30/60 minut; otevřený rozsah vyžaduje vlastní celé číslo 61–1440, bez fiktivního defaultu. Přesný starší odhad zůstává zachován při editaci i opakovaném výběru téhož rozsahu.
- Reuse dle 21st: stávající Timeline tokens, 8px vnitřní geometrie, 44px boxy, cyan selected/check/focus, disabled a klávesnicové šipky; bez nové knihovny, externího exportu projektového kontextu či změny klinického backendu. Durace a rozsah jsou validované před odesláním.
- 45/45 cílených UI/layout/palette/integration/timeline testů, TypeScript a whitespace check prošly. `21st review`: 75 informačních poznámek stávající palety, bez warning/error. Kontrakty pokrývají hranice 30/60/61, prázdné/neplatné hodnoty, uchování 20/45/200 minut, required otevřený rozsah a native disabled/focus.
- Skutečný localhost: kliknutí Do 30 → 30 min, ArrowRight → Do 60 / 60 min; Více než 60 otevře prázdný required input, 60 je rangeUnderflow, 90 lze zadat do lokálního draftu. Na skutečném viewportu 1543×1109 má popup se všemi 15 sály i emergentním upozorněním body clientHeight=scrollHeight (645 px s přesným odhadem, 617 px s volbou Do 30). Resize override v této relaci nepřešel do skutečného viewportu; nové ověření 1024×720 se proto netvrdí. Reset override proveden. Evidence: `output/acute-qa/duration-band-options.jpg`. Žádný skutečný požadavek se při QA neuložil, žádná databázová migrace, commit nebo nasazení.

---

## 2026-10-09 — Provedené akutní výkony v modulu

- Přehled rozlišuje čekající požadavky, zahájené cykly a skutečně provedené výkony. `Provedeno` vyžaduje uložené události začátku a konce celého cyklu včetně úklidu; ruční uzavření požadavku není důkaz provedení. Skutečně navázané cykly se již nepočítají jako čekající. Automatické uzavírání ani změna pořadí požadavků se neprovádí.
- Provedené řádky a readonly detail zobrazují původní výkon, naléhavost a číslo zápisu, skutečný sál, začátek, konec a zaokrouhlenou délku celého cyklu. Detail funguje i bez původního požadavku v omezeném seznamu historie. Čekání se zastaví při začátku cyklu. Historie používá 30/90/365 kalendářních dní a explicitně přidává starší doložené cykly stále aktivních požadavků, aby se nezobrazily znovu jako čekající.
- Dle 21st byly znovu použity stávající skleněné řádky, rozložení nadpisu, barvy naléhavosti a Timeline/Radix popup. Bez nové knihovny, exportu projektových dat, migrace nebo změny autorizace API. Živé načítání používá existující tenant-scoped SWR a realtime; při chybě důkazu cyklů se nezobrazují zavádějící počty.
- 167/167 akutních regresních testů prošlo včetně izolovaného syntetického PostgreSQL workflow/grants; 16 nových kontraktů ověřuje partition, důkaz dokončení a oba detaily. TypeScript noEmit a whitespace check prošly. Nezávislý audit ověřil 5 481 časových oken Europe/Prague včetně DST. Cílené `21st review` má v TSX nula nálezů; CSS pouze 76 informačních poznámek palety bez warning/error.
- Read-only localhost QA: APPE na skutečném sále 5 je `Provedeno` (8. 10. 22:02 až 9. 10. 04:22, 380 min); URS na sále 7 je `Provedeno` (8. 10. 22:01, 0 min po zaokrouhlení krátkého skutečného cyklu). PŘEVAZ VAC na sále 4 zůstává pouze `Cyklus zahájen`. Nový uživatelův požadavek REPOZICE PŘEDLOKTÍ je odděleně čekající, nebyl vytvořen během QA. Ověřeny detail URS, Historie i načtení 365 dní. Na 1543×1109 byly řádky obsažené; závěrečný samostatný náhled 1280×720 nemá horizontální overflow, select je vysoký 44px, konzole bez error/warn. Nové mobilní viewporty ani fyzická zařízení se v této relaci netvrdí.
- Pomocný skrytý tab byl uzavřen; uživatelův souběžně otevřený formulář zůstal nedotčený. Žádný skutečný požadavek nebyl vytvořen, potvrzen, přeuspořádán, zrušen, zahájen ani dokončen. Evidence mimo Git: `output/acute-qa/acute-completed-module.png`. Bez commitu, push nebo nasazení.

final result: passed for scoped actual acute-cycle completion visibility

## 2026-10-09 — Kruhová časová osa akutních výkonů

- Záložka Časová osa v akutním modulu používá propojené průhledné kruhy v existujících barvách naléhavosti. Čekající požadavky mají uvnitř živé celé minuty, zahájené cykly hodiny a doložené provedené cykly značku dokončení. Pod kruhy zůstávají úplné názvy výkonů a skutečných sálů, původní číslo zápisu, aktuální pořadí čekajících, datum a čas. Rozestupy jsou explicitně schematické, nikoli časové měřítko nebo procentuální pokrok.
- Čekání běží od uloženého přijetí požadavku do doloženého začátku cyklu. Historie používá neměnnou identitu a skutečný sál uloženého cyklu; odhady se nepovažují za skutečnou délku. Krátký dokončený cyklus může mít po zaokrouhlení 0 min, což rozhraní vysvětluje. Chybějící čas se nevymýšlí a neumístitelné požadavky zůstávají s explicitní poznámkou dostupné v Požadavcích. Filtry období, zahájené a starší doplňující cykly zůstávají zachované.
- Reuse dle 21st: existující SVG kruhy, neutrální transparentní středy, barvy naléhavosti, hlavní rozložení a Timeline popup. Veřejné hledání komponent vyžadovalo přihlášení, proto žádná externí komponenta ani závislost nebyla přidána; projektová data nebyla exportována. Kliknutí na kruh otevírá stávající detail a vrací fokus, bez klinické změny. Hlavní scheduler, databázové schéma a autorizace API zůstávají nedotčené.
- 188/188 akutních testů prošlo včetně 21 nových datových/render kontraktů a izolovaných syntetických PostgreSQL regresí. TypeScript noEmit, whitespace check a cílené 21st review tří TSX/CSS souborů prošly; review má nula nálezů. Memoizovaná projekce používá existující sdílený čas, SWR a realtime, bez vlastního časovače nebo načítání pro jednotlivé kruhy.
- Read-only localhost QA ověřilo provedené URS/APPE, zahájený PŘEVAZ VAC a průběžně narůstající čekání REPOZICE PŘEDLOKTÍ. Další uživatelem zadané GYN KRVÁCENÍ a PERITONSILÁRNÍ ABSCES se objevily automaticky. Detail čekajícího i provedeného výkonu a návrat fokusu byly ověřeny bez změny klinického stavu. Konzole bez error/warn.
- Skutečné viewporty 1280×720 a 1024×768 mají posouvání delší osy pouze uvnitř přehledu, nikoli horizontální přetečení stránky. Na 390×844 a 320×568 jsou všechny uzly v přehledném svislém toku, kruhy 124px a dokument bez horizontálního přetečení. Viewport override resetován a původní uživatelovo okno 1543×1109 zůstalo nezměněné. Fyzická mobilní zařízení nebyla testována; light theme pokrývají tokenové testy, nikoli nový live screenshot.
- Evidence mimo Git: `output/acute-qa/acute-circular-timeline.png`. Pomocný QA tab uzavřen, původní uživatelův tab nedotčený. Žádný skutečný požadavek nebyl vytvořen, přeuspořádán, zrušen, zahájen nebo dokončen. Bez commitu, push nebo nasazení.

final result: passed for scoped circular acute timeline

## 2026-10-09 — Menší spodní lišta provedených akutních výkonů

- Provedené cykly jsou oddělené od hlavních čekajících/zahájených kruhů do spodního pásu. Používají stejné průhledné SVG obrysy a barvy naléhavosti, ale pouze 76px kruhy se značkou dokončení a kompaktní text vedle nich. Zachované jsou úplné názvy, skutečný sál, původní zápis, čas dokončení a zaznamenané délky. Časové pořadí každé skupiny zůstává stabilní; pouze prezentace se dělí do dvou úrovní.
- Prázdný spodní pás se neukazuje a historie bez aktivních výkonů má krátkou pravdivou informaci místo velkého prázdného prostoru. Hlavní kruhy zůstávají 184px na počítači a 124px na telefonu. Spodní pás je vodorovný i na telefonu a posouvá se lokálně; názvy se nezkracují v datech a všechny uzly zůstávají dostupné. Detailové callbacky, fokus, období historie, evidence dokončení a celý klinický backend jsou beze změny.
- Dle 21st znovu použity existující kruhy, typografie a neutrální oddělovací linka; veřejný katalog vyžadoval přihlášení. Bez externí závislosti, exportu projektových dat nebo klinických zápisů. 191/191 akutních regresních testů prošlo, včetně 14 render kontraktů pro obě skupiny, prázdné stavy, neměnná metadata a obnovení fokusu. TypeScript noEmit, whitespace check a 21st review obou změněných UI souborů prošly bez nálezů.
- Read-only localhost QA ověřilo velké PŘEVAZ VAC / PERITONSILÁRNÍ ABSCES a čtyři skutečně dokončené cykly ve spodním pásu. Uživatel souběžně dokončil GYN KRVÁCENÍ a REPOZICI PŘEDLOKTÍ; QA žádný cyklus nezahájilo ani nedokončilo. Malý kruh URS otevřel správný doložený detail a po zavření obdržel fokus zpět. Konzole bez error/warn.
- Skutečné viewporty 1280×720, 1024×768, 390×844 a 320×568 nemají horizontální přetečení dokumentu; provedené kruhy mají ve všech 76px. Na telefonech zůstává aktivní osa svislá a historie vodorovná. Viewport override resetován. Pomocný tab uzavřen, uživatelův tab nebyl přesměrován. Evidence mimo Git: `output/acute-qa/acute-completed-bottom-strip.png`. Fyzická zařízení nebyla testována. Bez commitu, push nebo nasazení.

final result: passed for scoped completed bottom strip

## 2026-10-09 — Čekající požadavky jako první v Požadavcích

- Změněné je pouze pořadí sekcí v `AcuteRequestsModule.tsx`: čekající karty / pravdivý prázdný pořadník, zahájené cykly, provedené výkony. Stávající vzhled, ruční pořadí, detailové callbacky, časová osa, historie a klinická data zůstávají beze změny. Dle 21st znovu použité existující komponenty, bez nové závislosti.
- 34/34 cílených module-cycles/UI testů prošlo včetně dvou nových regresí pořadí a stavů bez čekajících požadavků. TypeScript noEmit, whitespace check a 21st review změněného komponentu prošly; review bez nálezů.
- Read-only localhost kontrola záložky Požadavky v běžném 1280×720 náhledu potvrdila čekající PERITONSILÁRNÍ ABSCES před zahájeným PŘEVAZ VAC a čtyřmi doloženými provedenými cykly níže. Konzole bez error/warn. Žádný požadavek ani klinický cyklus nebyl změněn. Pomocný tab uzavřen a uživatelův náhled ponechán nedotčený.
- Důkazy mimo Git: `output/acute-qa/acute-requests-waiting-first.png` a `output/acute-qa/acute-requests-performed-below.png`. Bez commitu, push nebo nasazení.

final result: passed for scoped waiting-first requests order

## 2026-10-09 — Provedené výkony v akutní časové ose pod sebou

- Spodní vodorovný pás nahrazen jedním sloupcem plnošířkových kompaktních boxů. Každý zachovává 76px průhledný kruh, barvu naléhavosti, skutečnou identitu a sál, původní číslo zápisu, zaznamenané dokončení a délky. Na široké obrazovce jsou údaje uvnitř boxu v řádku, na užší se zalamují do dvou sloupců. Pořadí provedených podle času, velká aktivní osa, filtry, native detailové callbacky a klinická data zůstávají beze změny.
- Dle 21st použity stávající acute card/border/urgency tokeny, 12px geometrie a SVG obrys. Katalogové hledání nebylo dostupné (`fetch failed`); žádná externí komponenta či závislost nebyla přidána. 35/35 cílených UI, projekčních a module-cycles testů prošlo včetně nové kontroly svislých boxů bez vodorovného scrollu v každém breakpointu. TypeScript noEmit, whitespace check a 21st review obou změněných UI souborů prošly bez nálezů.
- Read-only localhost QA potvrdilo šest skutečně dokončených cyklů v boxech pod sebou na 1280×720, 1024×768, 390×844 a 320×568. Ve všech šířkách má seznam stejnou scrollWidth/clientWidth, každý box vlastní shodnou scrollWidth/clientWidth a dokument nepřetéká do stran. Kruhy mají 76px a názvy se zalamují bez překryvů. Konzole bez error/warn. Fyzická zařízení ani nový světlý náhled nebyly testovány.
- Evidence mimo Git: `output/acute-qa/acute-timeline-completed-vertical-boxes.png`. Viewport resetován a pomocný tab uzavřen; uživatelův náhled ponechán nedotčený. Žádný klinický požadavek či cyklus nebyl změněn. Bez commitu, push nebo nasazení.

final result: passed for scoped vertical completed timeline boxes

## 2026-10-09 — Box akutních požadavků vedle ARO statusu

- Samostatný desktopový textový řádek s počtem, Otevřít a vysvětlením odhadu nahrazen nativním navigačním boxem Akutní požadavky hned za ARO. Obě větve ARO i nový box mají společnou výšku 48px a rovné sloupce; při 768–1180px se dvojice přesune do druhého řádku lišty. Zachovaný je aktuální sdílený počet čekajících, přístupný počet nepřiřazených, poctivé loading/error stavy a dosavadní modulová/rolová brána. Mobilní souhrn, projekce bloků a klinické funkce jsou nedotčené.
- Reuse dle 21st: existující commandbar, neutral glass surface a theme tokeny; stávající Lucide ikony, žádná nová závislost nebo export projektu. Katalogové hledání selhalo při spojení. React review ověřilo top-level čistou komponentu bez nových hooků, efektů nebo fetch, nativní button/type a existující navigační callback bez klinických mutací.
- 39/39 cílených timeline integration, projection, navigation a cycle-link testů prošlo; pokrývají obě ARO větve, stejné rozměry a narrow CSS, češtinu počtů, loading/error, přístupné údaje, modulové brány a skutečné napojení callbacku. TypeScript noEmit a whitespace check prošly. 21st review má v novém komponentu/CSS nula nálezů; v původním TimelineModule zůstává 33 informačních poznámek palety a jeden původní ARO hover-scale warning mimo rozsah této změny.
- Read-only localhost QA na skutečných 1280×720 potvrdilo oba boxy 192×48px, odstraněný původní řádek, pravdivých 0 čekajících a otevření skutečného akutního modulu klávesou Enter. Konzole bez error/warn. Narrow pravidla jsou ověřena testy, nikoli novým live viewportem: resize capability v této relaci nezměnila skutečnou šířku, proto se další živé šířky netvrdí. Oba dočasné viewport overrides resetovány.
- Evidence mimo Git: `output/acute-qa/timeline-acute-toolbar-tile.png`. Pomocný tab uzavřen a uživatelův náhled ponechán nedotčený. Žádný požadavek, pořadí ani operační cyklus nebyl změněn. Bez commitu, push nebo nasazení.

final result: passed for scoped desktop acute toolbar tile

## 2026-10-09 — Denní přehled akutních požadavků a kalendář

- Stránka navazuje na Management/Notifikace: společný nadpis, kompaktní 68px souhrnné boxy, jedna neutrální lišta záložek a akcí, jemné 12px plochy. Existující gradienty priorit a popupy Timeline zůstávají. Kalendář a denní navigace jsou přímo sdílené komponenty ze Statistik; kalendář vpravo má na velké obrazovce 280px a na užší se skládá pod obsah. Sdílené kalendářové dny a nativní datum mají úplné přístupné názvy; u kalendáře se animuje pouze barva.
- Požadavky a akutní časová osa se filtrují podle neměnného přijetí v kalendářním dni Europe/Prague. Historie zachovává ostatní čekající a zahájené položky, doložené provedené cykly, archiv a audit; počet čekajících mimo den má přímý odkaz. Úplný pořadník a vazby se filtrací nemění. Chybějící historické zadání má výslovně označený skutečný den zahájení, bez vymyšlených počtů či aktivity kalendáře. Vybraný den rozšiřuje společný query rozsah vedle období historie; 365denní výběr je bezpečně omezen i při přechodu přes půlnoc. Nový požadavek není zpětně datován.
- Reuse dle 21st a React best practices: stávající shell, paleta, SWR/realtime a čistá memoizovaná projekce, bez dotazu či časovače na každé kartě. Katalogové hledání skončilo fetch failed, proto žádná externí komponenta, závislost či export projektu. Nezávislý závěrečný audit potvrdil opravu midnight/fallback hranic bez zbývajícího závažného nálezu v rozsahu změny. Původní omezení 200 ukončených požadavků zůstává poctivě uvedené.
- 226/226 akutních regresních testů bez databáze prošlo, včetně nových datových a hook/render případů pro výběr data, chyby/načítání, úplný reorder, různé klientské zóny a půlnoc. Závěrečných 28/28 day-view/day-page testů, TypeScript noEmit a whitespace kontrola prošly. Databázové syntetické transakční testy nebyly v tomto kroku spouštěny; backend se nemění. Cílené 21st review tří souborů má 82 poznámek: 78 informačních poznámek palety a čtyři stávající transition-all warningy v ostatních grafech AppCharts mimo tuto úpravu, bez error. Netvrdí se nulový nález celého souboru.
- Read-only localhost: 9. října tři skutečně zadané a provedené výkony; 8. října tři provedené cykly z daného dne zadání včetně cyklu dokončeného následující den. Historie zachovává všech šest. Volba 1. září přímo kalendářem vyvolala načtení mimo výchozích 30 dní a zobrazila pravdivý prázdný den bez chyby, návrat Dnes obnovil tři dnešní výkony. Nativní callback je pokryt testy; programové browser fill nebylo v této relaci spolehlivým důkazem React změny. Konzole bez error/warn.
- Skutečné DOM rozměry 1280×720, 1024×768, 390×844 a 320×568: dokument, denní řádky i karty nepřetékají do stran; na užších šířkách se kalendář a ovladače skládají, všechny záznamy zůstávají dostupné svislým posouváním. Narrow QA je geometrická kontrola, nikoli tvrzení o fyzickém telefonu či novém živém světlém náhledu. Viewport override resetován. Pomocný tab uzavřen, původní uživatelův tab nedotčený.
- Evidence mimo Git: `output/acute-qa/acute-day-layout.png`. Žádný skutečný požadavek ani klinický cyklus nebyl při QA vytvořen, přeuspořádán, zahájen, dokončen či jinak změněn. Bez migrace, commitu, push nebo nasazení.

final result: passed for scoped daily acute workspace and shared calendar

## 2026-10-09 — Nabídka Statistik ve stylu akutního modulu

- Pouze horní desktopová nabídka: stávající neutrální 12px lišta, 8px vnitřní segment, 2px inset, 6px tlačítka, 44px ovladače, 11px/500 popisky bez verzálek a cyan token aktivní záložky. Ikony, všechny názvy záložek, nadpis, pozadí a postranní navigace zůstávají. Období a exporty mají sladěné rozměry; pevný 224×50px slot je stejný pro běžná období i popisek dvanácti měsíců Výkonnosti.
- Dle 21st znovu použity skutečné acute/management povrchy a tokeny, nikoli nová externí komponenta. Katalogové hledání nebylo dostupné (fetch failed). Malý CSS adapter je scoped výhradně na statistics-desktop; StatisticsModule pouze importuje stylesheet. Nezměněné jsou výpočty, databázové dotazy, filtry, tisk/PDF/CSV a samotný navigační React komponent. Bez nového balíčku, klinických zápisů nebo exportu projektových dat.
- 31/31 cílených toolbar-style, navigation, mobile-statistics-style a print-integration testů prošlo, stejně jako TypeScript noEmit a whitespace kontrola. Nezávislý audit potvrdil wrapping a zachování period slotu. 21st review nového CSS má nula nálezů; StatisticsModule má jeden původní transition-all warning mimo rozsah této úpravy. Před změnou byl navíc v širším tab-reports.test.js nalezen nesouvisející již existující neúspěch notification-impact očekávání (test na řádku 178); v tomto grafickém kroku nebyl měněn ani vydáván za opravený.
- Živý read-only localhost na 1280×720: všech osm záložek je dostupných, mají 44px výšku a správnou typografii; stránka nepřetéká vodorovně. Fáze i Výkonnost mají totožný toolbar 1112×138px a stejný period slot, bez posunu. End otevřelo Zařízení a Home vrátilo fokus i aktivní tab na Přehled. Na užším desktopu se mají dvě části skládat podle explicitního CSS breakpointu; resize capability v této relaci nezměnila skutečný viewport, takže další živé rozměry se netvrdí. Override resetován. Mobilní chování je zachováno scopingem a regresními testy.
- Při přepínání záložek byly zachyceny dva Recharts warningy o nulové velikosti grafu při měření kontejneru, bez console error. Tento krok nemění grafy ani jejich kontejnery a neprohlašuje tyto warningy za opravené.
- Evidence mimo Git: `output/statistics-toolbar.png`. Pomocný QA tab uzavřen, uživatelův původní tab nedotčený. Žádná databázová či klinická mutace, commit, push nebo nasazení.

final result: passed for scoped Statistics toolbar styling

## 2026-10-09 — Kruhový procentuální preloader Výkonnosti

- Nový čistý SVG preloader má průhledný střed, jemný cyan obvod, celé procento uvnitř a skutečný počet načtených záznamů pod kruhem. První neznámý počet má indeterminate kruh a výslovné Zjišťuji počet záznamů, bez vymyšleného procenta. Výpočet používá pouze stávající progress observer historie: floor počtu/total, maximálně 99 před potvrzeným koncem, 100 až při complete. Pokud ještě čeká konfigurace workflow, zůstává tento samostatný zdroj čekání výslovně označen. Po načtení preloader hned zmizí, bez umělého zdržení.
- Initial loading nepředává částečné hodnoty do boxů nebo exportu; při obnově zůstává pět posledních boxů a menší 44px kruh v záhlaví. Chyby mají stále přednost před loaderem a tlačítko opakování funguje původní cestou. Výpočty, stránkování, SWR, izolace nemocnic, sdílený toolbar i klinická data jsou beze změny. Přístupný progressbar má název, min/max a skutečný valuenow/valuetext; unknown valuenow chybí a SVG je dekorativní. Reduced motion ruší rotaci i přechod. Kompaktní popisky se zalamují navzdory nowrap původního parentu.
- Dle 21st znovu použity skutečné statistické tokeny, povrchy a kruhový SVG vzor, bez externí komponenty či nové závislosti; katalogové hledání selhalo (fetch failed), projektová data nebyla exportována. React best practices review potvrdilo čistou top-level komponentu bez hooků, timerů a fetch, bez opakovaného výpočtu modelu při pouhé změně procent. Nezávislý závěrečný audit nenašel material issue v daném rozsahu.
- 94/94 cílených performance-history, performance-preloader, performance-report, performance-model/select, print-integration a toolbar testů prošlo; zahrnují 9 nových loader případů, neznámé a změněné počty, hranici plné stránky, chyby, retry, tab re-entry a scope izolaci. Původní stale closed-month test byl opraven pouze v selektorech na již dříve commitnuté overview markup; zaokrouhlovací assertions zůstaly. TypeScript noEmit a whitespace kontrola prošly. 21st review všech tří změněných UI souborů má nula nálezů.
- Read-only localhost 1280×720: zachycen neznámý počet a poté reálné 3 % (1 000 z 26 902 událostí); po dokončení se zobrazilo pět boxů bez loaderu a bez horizontálního overflow. Obnova ukázala compact 44×44px kruh se stejným reálným průběhem, všech pět hodnot zůstalo a po dokončení bylo tlačítko obnovy znovu dostupné. Žádný simulovaný browser progress, umělý throttle nebo klinický zápis. V konzoli byly opět zachyceny stávající Recharts warningy width/height0 při měření grafů; nejsou tímto krokem vydávány za opravené. Mobilní light/dark a wrapping jsou ověřeny zděděnými tokeny a CSS kontrakty, nikoli novým fyzickým/živým mobilním testem.
- Evidence mimo Git: `output/performance-preloader.png` a `output/performance-refresh-preloader.png`. Pomocný QA tab uzavřen, uživatelův tab nepřesměrován. Bez backendové změny, migrace, commitu, push nebo nasazení. Tento krok informuje o průběhu; neprohlašuje zrychlení databáze.

final result: passed for scoped Performance circular progress UI

## 2026-10-10 — 3D dispozice ve společném designu administračních modulů

- Upraven je pouze Settings editor: společná hlavička s mb-7, samostatná jemná 12px lišta, textově označené 44px akce, 8px ovladače, cyan tokeny a viditelná skutečná informace o uložení, změnách nebo chybě. Panely a formuláře používají neutrální transparentní plochy, sdílené textové barvy a focus; odlišné žluté akce a hover posun mizí. Nový CSS adapter je scoped na spatial-settings-module. Dashboardová 3D vizualizace, geometrie, místnosti, jejich propojení, ukládání, revize, potvrzení mazání a klinické callbacky nebyly měněny.
- Reuse dle 21st: aktuální ModulePageHeading, Management/Notifications povrchy a aplikací definované tokeny. Hledání katalogu selhalo při spojení; žádná závislost ani externí komponenta nebyla přidána a projektová data nebyla exportována. Cílené 21st review dvou produkčních UI souborů má pět informačních poznámek o záměrně převzatých neutrálních/border/tint hodnotách, bez warning/error. 44/44 testů spatial a desktop-header prošlo, včetně deseti nových SSR/CSS bezpečných presentation kontraktů. TypeScript noEmit a whitespace check prošly. Nezávislý audit odhalil a ověřil opravu hraniční auto-height podmínky a reduced-motion specificity.
- Živý read-only localhost na 1280×720 a 1024×768 potvrdil sdílenou hlavičku, lištu, 44px hlavní tlačítka, model 17 místností/150 objektů a původní přepínání Shora/3D pohled bez označení neuložené změny. Tab z Shora přešel na Nízké stěny s viditelným 2px cyan focusem. Resize původního auto-sized canvasu vyvolal dvě ResizeObserver loop zprávy; scéna byla následně ohraničena výškou v CSS a opakované resize už nové zprávy nepřidalo. Neprohlašuje se celá historická konzole za bezchybnou.
- Skutečné DOM šířky 1169/1170/1171 ověřují obě strany přepnutí panelů: při stacked režimu rám zahrnuje celý inspector, při desktop režimu tři sloupce. 390×844 a 320×568 ukazují scénu před všemi editačními panely v přístupném svislém toku. Ve všech ověřených rozměrech scrollWidth dokumentu odpovídá viewportu a scrollWidth panelů jejich clientWidth; žádné vodorovné přetékání. Fyzická zařízení a nový live light theme nebyly testovány. Prázdný/loading/error stav byl ověřen SSR bez DB či WebGL.
- Evidence mimo Git: output/spatial-settings-design.png. Viewport override resetován, dočasná volba mřížky nastavení vrácena na původní karusel a pomocný tab uzavřen. Uživatelův původní tab zůstal nedotčený. Žádné uložení, vytvoření/mazání projektu, změna parametrů modelu či klinický zápis během QA. Bez commitu, push, migrace nebo nasazení.

final result: passed for scoped Settings spatial-editor design alignment

## 2026-10-10 — Jemné sjednocení dashboardových boxů

- Pouze desktopové boxy: lehčí jednotná transparentní plocha, jemné ohraničení, měkčí písmo názvu/počtu, čitelnější sekundární údaje a klidný společný AM/PM panel s průhlednými vnitřními poli. Neutrální personální ikona je zřetelnější, ale vylučuje červené/jantarové/cyan sémantické stavy. Žádný nový status, text, data nebo dekorativní gradient. Původní vykrojení, průhledné středy kruhů, barvy nemocnice, schválené neonové akce a všechny klinické callbacky zůstávají.
- Dle 21st znovu použity skutečné projektové plochy/paleta a RoomCard, bez externí komponenty, závislosti či exportu projektu. Katalogové hledání nebylo dostupné (fetch failed). Malý CSS adapter je scoped nad 768px; DashboardModule pouze importuje stylesheet. Mobile a opt-in Cliniq nedostávají žádné nové pravidlo. 21st review má 20 informačních poznámek o záměrně převzatých barevných hodnotách, nula warning/error.
- 102/102 cílených testů card-polish, action-geometry, room-card, grid-layout, desktop-header, mobile-card-consistency, mobile-room-grid a akutních dashboardových kontraktů prošlo; zahrnují šest nových testů izolace adaptéru, průhledných kruhů a nezměněné geometrie. TypeScript noEmit prošel. Nezávislý audit nemá v rozsahu změny regresní nález.
- Širší sada před přidáním nových testů vykázala 190/206 úspěchů. Šestnáct neúspěchů je v nedotčených mobilních testech: 14 v mobile-room-detail (zejména chybějící mock dříve přidaného AcuteRoomQueueRibbon a starší CSS očekávání), jeden v mobile-ios-shell (očekávání font-size vyhledávání) a jeden v mobile-overview (starší očekávání isSuperAdmin filtru). Tyto testy nejsou závislé na DashboardModule ani na novém adaptéru; jejich oprava není součástí grafického kroku. Netvrdí se, že celý repozitář má zelené testy.
- Read-only localhost na skutečných 1280×720, 1024×768 a 768×1024: všechny sály dostupné, názvy bez horizontálního ořezu, všechny tři SVG kruhy fill:none, dvojice akcí minimálně44px a bez překryvu. Na 1024px mají akce50,63px a13,10px rozestup; na768px62,40px a16,13px rozestup. Dokument scrollWidth odpovídá viewportu také při390×844, kde jsou desktopové karty skryté. Úzké QA je geometrická kontrola, nikoli tvrzení o fyzickém telefonu či novém light-theme náhledu. Tab/Shift+Tab ověřily viditelný focus karty, bez aktivace akcí. Konzole QA tabu bez error/warn.
- Evidence mimo Git: output/dashboard-card-polish.png. Viewport resetován, pomocný tab po kontrole uzavřen; původní uživatelův tab neměněn. Žádný skutečný stav sálu, akutní požadavek, personální přiřazení nebo databázový záznam nebyl během QA změněn. Bez commitu, push či nasazení.

final result: passed for scoped desktop dashboard card polish

## 2026-10-10 — Jemné zpřehlednění živé časové osy

- Upraven pouze existující desktopový Timeline: transparentní otevřená plocha, jednotná jemná 12px ovládací lišta, nejméně 44px hlavní tlačítka, plné popisky Aktivní / Volné / Pozor, přístupná skupina filtrů, čitelnější hodiny a sekundární názvy. Spojitý sticky sloupec sálů má klidný povrch a názvy s lehčím písmem. Hotové fáze i pravé stavové štítky jsou jemnější; namísto diagonálního lesku a brightness filtrů jsou statická zvýraznění. Focus je viditelný, nové přechody respektují reduced motion. Zachován sdílený app canvas, bez nového nadpisu, dat či dekorativních gradientů.
- CSS adapter je scoped výhradně na timeline-desktop-workspace. Jmenný sloupec má stále320px, hodinová plocha58px a řádky stále řídí původní density model. Left/width všech výkonů, barvy aktivních statusů z konfigurace, klinické callbacky, aktuální čas, acute lanes/labels, mobilní kompaktní osa a canonical popups se nemění. Lišta má vyvážené pružné sloupce s kompaktním hodinovým polem; pod880px skutečné šířky modulu se dvojice ARO/akutní požadavky přesune spolu do druhé řady. Původní klinické ARO upozorňování zůstává, odstraněn jen hover-scale utility.
- Reuse dle21st: skutečné projektové tokeny a stávající Timeline komponenty; katalogové hledání nedostupné (fetch failed), bez externí komponenty, závislosti či exportu projektu. Závěrečné 21st review pěti UI souborů:0errors/0warnings/145 informačních token suggestions převážně původního markup. React best-practices review: žádný nový hook, timer, fetch, efekt nebo render-model; malé čisté presentation hooks. Nezávislý audit ověřil scoping a opravu precedence původního acute status media rule.
- 154/154 cílených Timeline, acute timeline/cycle client/API, shared-header a mobile-timeline kontraktů prošlo, včetně6nových design testů. TypeScript noEmit prošel. Jeden dodatečně vybraný lokální PostgreSQL integration test nedokázal vytvořit shared-memory segment v sandboxu; nejde o ověření databáze ani tvrzení o kompletně zeleném repozitáři. Žádná produkční databázová mutace při QA.
- Živý read-only localhost:1280×720,1440×900,1920×1080,1180×768,1024×768,768×1024 a1280×640; všechny15skutečné sály dostupné, hlavní ovladače44px, jmenný rail320px, document scrollWidth bez přetékání a žádná kolize toolbar/clock/status. Tři hotové bloky si zachovaly přesné původní procentní šířky; živý blok se přirozeně prodlužoval se skutečným časem. Filtr Aktivní zobrazil skutečnou externí anestezii, Souhrn/Živě se přepínal a blok sálu4otevřel správný celý dokončený cyklus. Nejnovější drobné vyvážení hodin a širších chybových statusů je po této resize sérii prověřeno source/testy a live1920; není vydáváno za opakovanou plnou resize sérii.
- Při pozdější kontrole čtení akutních dat dočasně ukázalo Nelze načíst, následně se nenačetly sály a po obnovení pomocného tabu se zobrazilo přihlášení. Nebyly zadány přihlašovací údaje. Závěrečný autentizovaný screenshot, opětovné otevření celodenního souhrnu po zániku dat a živý mobilní náhled nebyly dokončeny; mobilní izolace je ověřena6CSS/SSRkontrakty a existujícími mobile tests. Původní snapshot před úpravou je jen QA evidence/private/tmp/timeline-before-20261010.png, nikoli výsledný náhled. Konzole zachyceného QA tabu při kontrole neměla error/warn; to není tvrzení o dostupnosti backendu.
- Viewport override resetován a pomocný tab uzavřen. Bez změny stavu sálu, požadavků, oprávnění, schématu, přihlášení, commitu, push nebo nasazení. Není tvrzeno zrychlení databáze.

final result: passed for scoped desktop Timeline presentation; final authenticated screenshot blocked by login state

## 2026-10-10 — Přehlednější tabulka provozních metrik sálů

- Na žádost podle snímku upraven výhradně osmisloupcový denní přehled ve Statistiky → Přehled. `RoomMetricsTable` je čistá prezentační komponenta: jedno sémantické záhlaví, úplné názvy jako `th scope=row`, klidná souvislá plocha s horizontálními oddělovači, zarovnaná tabulární čísla, procento vedle krátké lišty využití, textový stav s barevným bodem a jednotky `min`. Titulek výslovně odlišuje aktuální stav od metrik vybraného provozního dne. Původní opakované štítky a vertikální mřížka byly odstraněny, včetně nevyužitého globálního CSS.
- Všech osm hodnot i jejich význam a barevná škála zůstávají. Adapter používá původní `dayRooms`, `dayHistory`, `metricsDay` a stejné kalkulátory. Využití není nově odvozeno z aktivních minut/kapacity: první údaj je uvnitř pracovní doby, druhý může zahrnovat přesah. Nulová/missing kapacita zůstává neznámá, nikoli falešné nulové využití; skutečná nulová naměřená hodnota se zachovává. Aktuální emergency/septic příznaky, pořadí sálů, kalendář, reporty, exporty, oddělený mobilní Přehled a všechny klinické callbacky jsou nedotčené. Řádky nejsou nové interaktivní akce.
- Použity existující statistické tokeny a stejný management-table pattern; 21st katalogové hledání skončilo `fetch failed`, bez přebírání externí komponenty, nové knihovny či exportu projektu. Závěrečné `21st review` tří UI souborů: žádný nález. React review: žádné nové hooks, timers, fetches, effects, nested components nebo mutable inputs.
- TypeScript `noEmit` prošel. 52 cílených kontraktů tabulky, denního/hospital rozsahu, detailu, exportů, toolbaru a mobilní izolace prošlo (9 nových). Širší Statistics + mobile-style sada: 192/193 prošlo; samostatně reprodukovaný test `notification impacts keep zero distinct from unavailable` používá pondělní kapacitu a zářijové fixture proti aktuálnímu sobotnímu hodinovému rozsahu a selhává nezávisle na nové tabulce. Mimo rozsah úkolu nebyl opraven ani změněn.
- Vizuální QA skutečné React komponenty a jejího CSS modulu proběhlo v dočasném lokálním SSR harnessu bez backendu, s ukázkovými hodnotami dodaného snímku. 1920×1050, 1440×1050, 1280×1050, 1024×1050 a 768×1050: osm hlaviček, všech 12 ukázkových řádků, žádné přetékání dokumentu ani buněk; na tabletu scrollWidth1040 zůstává uvnitř regionu a názvy jsou sticky. Šipka doprava posunula tabulku o40px, jmenná buňka zůstala na stejném X. Tiskové kontrakty zachovávají opakování záhlaví a nerozdělení řádků. Toto není tvrzení o živých datech, celé aplikaci nebo zařízení v produkci.
- Živý `localhost:3000` zůstal na přihlašovací obrazovce. Nebyly načteny ani zadány přihlašovací údaje; autentizovaný pohled na novou tabulku proto zbývá. Obraz `/private/tmp/room-metrics-qa.0bISud/room-metrics-desktop.png` je výslovně označená izolovaná kontrola komponenty s ukázkovými hodnotami, nikoli screenshot přihlášené aplikace.
- Žádné databázové změny, klinické akce, oprávnění, commit, push nebo nasazení. Předchozí rozpracované změny uživatele zůstaly zachovány.

final result: passed for scoped room-table presentation; authenticated full-app verification blocked by login state

## 2026-10-10 — Třetí dashboard: Carousel

- Přidána skutečná třetí volba Karty / 3D dispozice / Carousel. Karty zůstávají výchozí; volba se ukládá pod stávajícím hospital-scoped klíčem. 3D respektuje původní oprávnění, Carousel nevyžaduje oprávnění ke 3D. Původní grid, mobilní přehled a volitelný Cliniq nejsou přestylovány.
- Samostatná komponenta a CSS modul používají skutečné sloučené cykly provozního dne, enabled workflow, konfigurované barvy, rozpis oborů a pasivní akutní badge. Průhledný střed ukazuje skutečný počet cyklů; emergency/lock/pause zachovávají původní prioritu. Doba fáze a cyklu vychází ze zaznamenaných timestampů v celých minutách, nepoužitelný údaj a připravený sál mají pomlčku. Historický fallback fáze musí patřit aktuálnímu kroku. Žádná ukázková data ani předpokládané klinické hodnoty.
- Jemné portrait glass karty mají klidný statusový kruh, středové zvýraznění, fade na krajích a native scroll-snap. Bez autoplay, vlastního periodického časovače, nové knihovny nebo databázových dotazů. Šipky a Home/End mají hranice, všechny skutečné sály jsou také v zalamovaném rychlém výběru. Focus přivede kartu do středu; reduced motion používá okamžitý přesun a vypíná transitions. Programový smooth přesun neoznamuje všechny mezilehlé sály. Akční tlačítka mají54px základ, tedy nejméně45px i na zmenšených sousedních kartách.
- Živá autentizovaná QA localhost: všech15 sálů, přepnutí na původní Karty, návrat na Carousel, zachování volby po reloadu, End na poslední sál se zakázanou další šipkou, výběr středového sálu a otevření správného standardního detailu externí anestezie. Žádný status, uzamčení, nouze ani akutní požadavek nebyl aktivován. Na závěr zůstal Carousel otevřený; viewport override resetován. Konzole v kontrolovaném tabu bez error/warn.
- Resize768×1024,1024×768,1280×720 a1920×1080: document overflow0, všech15 karet, vybraný střed odchýlen nejvýše1px, nejmenší transformované akční tlačítko45.36px. Telefon390×844 zachoval15 skutečných mobilních karet a nepřetékal; Carousel byl správně skrytý. Nejde o test fyzických zařízení nebo všech výjimečných obsahových stavů. Nouze/uzamčení, chybějící timestampy, změna pořadí/odebrání sálu a neznámý workflow ověřeny pouze bounded testy, nikoli klinickou změnou v živé aplikaci.
- 84 cílených testů Carousel/RoomCard/polish/grid/action geometry prošlo, TypeScript noEmit a diff whitespace kontrola prošly. Celá dashboard sada204/220;16 nezávislých selhání ve stávajících mobile-ios-shell/mobile-overview/mobile-room-detail testech (mj. chybějící mock již existujícího AcuteRoomQueueRibbon a starší CSS očekávání) nebylo v tomto úkolu měněno. Původní sandboxed Turbopack produkční build uvízl bez dalšího výstupu a byl zastaven výhradně jeho vlastní proces. Kontrolní npm run build -- --webpack mimo sandbox následně kompletně prošel: kompilace, TypeScript a všech26 statických stránek. Běžící dev server nebyl zastaven. Žádný deploy, commit, push nebo změna oprávnění.
- Projektově ukotvený postup21st použil aktuální designové tokeny, původní callbacky a AcuteDashboardBadge. Katalogové hledání vrátilo401, bez exportu projektu nebo instalace komponenty. Lokální21st review uvedlo36 informativních hardcoded-color nálezů v zavedené navy/semantic paletě, bez automatických oprav. React kontrola zachovala jediné sdílené minutové hodiny, oddělenou ring komponentu a effect závislý na skutečných ID, nikoli klinických realtime změnách.
- Skutečný screenshot výsledné aplikace: /private/tmp/dashboard-carousel-1791668802392.jpg.

final result: passed for third desktop/tablet dashboard view; existing mobile-test failures and stalled default Turbopack build recorded separately

## 2026-10-11 — Carousel dokola v prostorovém kruhu

- Na explicitní upřesnění uživatele změněn pouze nový Carousel: skutečný CSS3D prstenec (`rotateY` + `translateZ`) se ručně otáčí dokola. Logická otáčka není omezena na indexy; poslední/první sál navazuje jedním krokem v obou směrech a přímý výběr používá nejkratší cestu. Polygonový radius vychází z šířky karty, nikoli pevné šířky stránky. Nula/jeden sál nemá pohyb ani dělení nulou, pro dva sály je konečný radius. Původní Karty, 3D dispozice, mobilní přehled, Cliniq, data a preference nebyly změněny.
- Každý skutečný sál má právě jednu kartu. Zadní/boční karty mají inert a disabled ovládání; jejich celoplošný překryv pouze vybírá sál. Přední karta má původní skutečný název, barvu statusu, průhledný kruh, cykly, doby, personál, rozpis a akutní badge. Po dobu otáčení je její ovládání také inert/disabled, uvolní jej skutečný transform transitionend. Media změna na reduced motion nebo skrytý mobil ukončuje čekání, takže okamžitý režim nečeká na neexistující animaci. Focus opouští kartu před zneaktivněním a rychlé výběry zůstávají dostupné.
- Šipky fungují bez koncové hranice, Home/End stále vybírají první/poslední sál. Horizontální trackpad otáčí, vertikální posouvání/zoom se nepřebírá. Horizontální tah přes hlavní plochu/boční kartu mění výběr a zruší navazující click. Tah začínající na klinickém tlačítku pouze ruší click, nikdy nespustí nouzi či zámek; pointercancel/lostcapture neprovádí výběr. Žádný autoplay, vlastní periodický timer, nová závislost, fetch nebo DB změna.
- Bounded testy pokrývají záporné/kladné otáčky několika celých oběhů, obě hrany, nejkratší cestu včetně dvou-sálové shody, identitu při přeskládání/odebrání, inert/disabled boční ovladače, výběrový překryv bez klinických callbacků, swipy/cancel a gating během transformu versus reduced motion. Testy nejsou vydávány za fyzický touch/trackpad test. Původní klinické callbacky na stojící přední kartě předávají skutečný roomId. React kontrola: transient gesture v refs, sdílené hodiny, žádné další dotazy; nepotřebný scroll RAF a ResizeObserver byly odstraněny.
- Živá autentizovaná QA `localhost:3000`: všech15 skutečných sálů bez duplikace, End→Next→první, Home→Left→poslední→Right→první. Kliknutí na boční PCHO kartu pouze vybralo sál a nechalo dashboard otevřený s focusem na carouselu. Rychlý výběr neurochirurgie fungoval. Zachyceno dočasně zablokované ovládání za pohybu a jeho uvolnění po dokončení. Všechny nevybrané klinické ovladače jsou disabled/inert. Přepnutí na Karty zobrazilo15 původních boxů, návrat obnovil kruhovou variantu. Nouze, uzamčení, statusy ani jiné klinické změny nebyly aktivovány.
- Resize768×1024,1024×768,1280×720,1920×1080: document overflow0, všech15 karet, přední střed odchylka0px, akce54×54px a po ustálení aktivní. Původní mobil390×844 ukázal15 z15 skutečných sálů, bez overflow; Carousel skryt a pohyb uvolněný. Viewport override resetován. Konzole v daném QA tabu bez zachyceného warn/error. Živé testy fyzického telefonu, trackpadu a OS preference reduced-motion nejsou tvrzeny; gesture/reduced-motion kontrakty ověřeny testy.
- Dle21st zachovány původní komponenty/tokeny/paleta; search vrací401 a review pouze34 informačních poznámek o již použitých barevných hodnotách, nula automatických oprav. Nebyla instalována knihovna ani exportován projekt. Typová kontrola, cílená sada a lokální Webpack produkční sestavení prošly. Historických16 selhání širší mobilní sady se tento krok nedotýká; celá sada nebyla znovu spuštěna. Žádný commit, push, deploy, migrace nebo změna oprávnění.
- Skutečný screenshot hotového dashboardu: `/private/tmp/dashboard-orbit-1791670295928.jpg`. Aplikace zůstává otevřená v Carousel variantě.

final result: passed for circular desktop/tablet dashboard Carousel; prior unrelated test/build limitations retained

## 2026-10-11 — Dashboard Carousel podle Nastavení

- Na další upřesnění uživatele nahrazen pouze válcový carousel skutečným vějířovým coverflow z `SettingsPage`: stejné perspektivy1500/1300px, normalizovaná vzdálenost, posuny9/118px, náklon11°, měřítko/útlum sousedů a700ms easing. Stejný24px obrys, navy boční plochy a jemný svislý gradient aktivní karty nyní používají skutečnou barvu statusu. Hlavička, postranní menu a aplikační pozadí zůstávají. Nastavení samotné nebylo upraveno.
- Klinická karta má kvůli obsahu minimálně260px šířky a440px výšky; na běžném PC mají karty stejné proporce jako Nastavení. Názvy jsou úplné, písmo lehké a průhledné statusové kruhy zachovávají skutečné cykly. Doby fáze/cyklu, obory, personál, akutní badge a upozornění pocházejí ze stejných zdrojů. Podrobné údaje sousedů se zobrazí až po výběru, titulky pod aktivní kartou mají fade. Schválené red/amber neonové akce, původní callbacks a případná potvrzení zůstávají; všechna aktivní tlačítka mají44px minimum.
- Šipky přesunuty po stranách doprostřed karet. Nekonečná navigace, Home/End, horizontální gesta a přímý výběr zůstávají, bez automatického otáčení. Malé tečky mají úplný přístupný název a44px cíl. Čítač a tečky jsou v jednom přirozeně zalamovaném sloupci, ne ve dvou překrývajících se absolute pásech. Během pohybu a při odebrání vybraného sálu jsou klinické ovladače inert/disabled; uvolní je pouze vlastní transform dokončené aktivní karty. Reduced motion nečeká na neexistující animaci.
- ResizeObserver měří skutečnou kartu, hlavičku i zalomený selector. Delší obsah nebo malá výška včas přepnou carousel do svisle dostupného toku. Výška fallbacku zahrnuje symetrický odstup od selectoru, nikoli pouze jeden jeho rozměr. Při automatickém klikání na překrytou boční kartu byl odhalen programový horizontální posun hidden stage; `overflow:clip` jej odstranil. Finální živý stage má scrollLeft0 a středovou odchylku0. Fyzické kliknutí na odkrytý kraj sousední karty není tímto krokem tvrzeno jako ověřené; jeho selection-only handler je pokryt bounded testem.
- Živá autentizovaná kontrola porovnala přímo Nastavení s novým dashboardem a použila15 skutečných sálů. End→Next první a Previous z prvního na poslední fungují; ovládání se po animaci uvolní. Rychlý výběr PCHO otevřel správný původní detail, který byl opět zavřen bez změny statusu. Přepnutí na Karty zachovalo původní grid. Na768×1024,1024×768,1280×720 a1920×1080: bez horizontálního přetékání, střed odchylka0, všechny klinické akce nejméně44px, hlavička/selector bez kolize. Čerstvě otevřený1280×600 fallback měl695px stage a23.8px odstup selectoru. Mobil390×844 ponechal Původní design a všech15 sálů, Carousel skrytý a document overflow0. Viewport override resetován; výsledný Carousel zůstává otevřený na1444×1109. Konzole bez zachycených warn/error.
- 23 Carousel testů a96 kombinovaných Carousel/RoomCard/polish/grid/action-geometry testů prošlo. Nové kontrakty kontrolují přesnou geometrii Nastavení, long-content fit, ResizeObserver cleanup/recovery, odebrání vybrané identity, bezpečné transition události a clip/focus. TypeScript noEmit a Webpack produkční sestavení prošly. 21st katalog vrátil401; kontrola dvou UI souborů měla pouze2 informační poznámky o již existujících loader barvách. Reuse skutečné projektové předlohy, bez externí komponenty, závislosti nebo exportu projektu. Historických16 selhání širších mobilních testů nebylo opravováno ani vydáváno za úspěšné. Delší obsah a reduced motion ověřeny modelovými/komponentovými testy, nikoli klinickými zápisy nebo změnou OS preference.
- Žádný status, nouze, zámek, personální přiřazení, akutní požadavek, oprávnění ani databáze nebyly během QA změněny. Bez commitu, push či deploymentu. Skutečný screenshot hotové aplikace je v dočasném souboru předaném uživateli, nikoli návrh s vymyšlenými daty.

final result: passed for Settings-matched desktop/tablet dashboard Carousel; prior unrelated limitations retained

## 2026-10-11 — Návrat na uložený dashboard bez probliknutí Karet

- Příčina: App při odchodu do jiného modulu nebo detailu sálu odmontuje DashboardModule. Původní pevná inicializace `cards` se proto při každém návratu vykreslila před pasivním načtením uložené volby.
- Uložený pohled se nyní načítá v lazy inicializaci stavu; změny nemocnice/oprávnění se synchronizují v layout efektu před malováním. Zachován stávající hospital-scoped klíč a prostorová oprávnění. Čtení/zápis blokovaného úložiště má bezpečný fallback. Client-only dynamic import v App zůstává stejný, bez SSR/hydration změny, časovače, nového loaderu nebo skrývání karet pomocí CSS.
- Žádná změna designu, carousel animací, mobilního/Cliniq zobrazení, klinických callbacků, dat nebo API. Reuse stávajícího rozhraní dle21st; katalogové hledání401, review pouze2 informační poznámky o původních loader barvách, bez warning/error. Nezávislý read-only audit potvrdil rozsah a opravu.
- Nových7 regresních testů vykonává skutečný DashboardModule s bounded hooks: první render a opakovaný remount, Cards/Carousel/Spatial výchozí volby, nemocniční izolaci, odebrání prostorového oprávnění před paint, ukládání ruční volby, blokované úložiště a non-browser fallback. Společně s Carousel/RoomCard/polish/grid/action-geometry prošlo103/103 testů; TypeScript noEmit prošel. Celá sada repozitáře ani nový produkční build v tomto malém lifecycle fixu nebyly spuštěny.
- Autentizovaný localhost: skutečné návraty z Nastavení, Timeline a otevřeného/zavřeného původního detailu TRAUMATOLOGIE1 zobrazily `Carousel` pressed, `Karty` unpressed, carousel wrapper přítomný a grid nepřítomný. První frame je ověřen regresním komponentovým testem, ne tvrzením o high-speed screen recording. Výsledný screenshot `/private/tmp/dashboard-carousel-restoration-1791711121968.png`. Žádná klinická akce, DB mutace, přihlášení, commit, push nebo nasazení.

final result: passed for saved dashboard view restoration without the default Cards first render

## 2026-10-11 — Rychlejší uložení akutního požadavku

- Rozsah pouze serverová cesta `/api/acute-requests`, společný helper oprávnění/DTO a regresní testy. Design formuláře, klinické stavy, oprávnění, klientská success cesta, pořadník a databázové funkce se nemění. Předchozí rozpracované změny jsou zachované.
- Read-only `pg_stat_statements` skutečného projektu operatingroom: `apply_acute_request_command` 38 volání, průměr 62,266 ms, maximum 233,450 ms; snapshot 8169 volání, průměr 16,106 ms, maximum 652,528 ms. Jde o historické časy samotného provedení v PostgreSQL, nikoli měření latence prohlížeče či benchmark nové verze. Samotný zápis nevykazoval dlouhou SQL exekuci; v kódu byly nalezené zbytečné sériové síťové fáze.
- Účet a modul se čtou souběžně; po členství, tab-scope a CSRF se POST validace sálu překrývá s těmito kontrolami. Zápis čeká na všechny souhlasy a zachovává autorizační precedence. Žádná cache oprávnění, odstranění guardu nebo rozšíření grantů. Doplňující audit je stále tenant-scoped, dávka100, souběh nejvýše3 a jeden společný AbortSignal rozpočet1500ms. Záznamy ani pořadí se nevymýšlejí; při timeoutu chybějící původní pozice zůstane null. Již potvrzený POST se kvůli pomocnému čtení nehlásí jako chyba.
- Klient již zveřejňuje autoritativní POST snapshot s `revalidate:false`; nebyl přepsán. Nové stateful testy potvrzují žádný optimistický úspěch před POST/JSON, bez následného GET, jednu cache publikaci, blokaci duplicity, verzi dalšího příkazu, selhání bez opakování zápisu a konflikt s jediným GET. Serverové testy řízenými promises ověřují skutečné překrytí čtení, čekání na všechny kontroly, chybovou precedence, dávkový limit a společný timeout/cleanup. Instalovaný skutečný Supabase/PostgREST builder byl testován se syntetickým fetch transportem bez sítě.
- Způsob práce dle Supabase best practices: měření skutečné SQL exekuce, odstranění sekvenčních dotazů bez oslabení čerstvých přístupových kontrol; žádná neodůvodněná migrace nebo index. Anonymní `Server-Timing` poskytuje fáze guard/db/response bez klinických či přihlašovacích údajů. Údaj1500ms není slibem maximální doby skutečného POST.
- TypeScript noEmit bez incremental cache a whitespace kontrola prošly. Všech23 nedatabázových akutních testových souborů bylo ověřeno (241 testů); serverové scénáře22/22 a klientské9/9. Databázové integrační soubory ani celý repozitář/build v této optimalizaci nebyly spouštěny; SQL není změněno. Živý autentizovaný modul na localhost zůstává bez zobrazené chyby a filtrovaná konzole nemá zachycené acute warn/error. Skutečný nový požadavek nebyl při QA zadán, takže end-to-end čas produkčního uložení není tvrzen jako změřený.
- Bez klinických zápisů, změny schématu, commitu, push či deploymentu.

final result: passed for bounded server concurrency and confirmed-save client regressions; live clinical POST timing deliberately not measured

## 2026-10-13 — Výběr dat, načítání, kvalita fází a export statistik

- Výkonnost zachovává pět hlavních KPI a stávající paletu; levý souhrnný ARO START nahrazuje Výběr dat a sdílený GlassCalendar. Denní výběr načítá skutečnou okolní historii, aby nepřerušil životní cyklus; měsíční režim zůstává dostupný. Nové prvky používají skutečné komponenty aplikace dle21st, nikoli demo nebo nový vzhled.
- Společná volba vynechává měřené fáze pod60sekund pouze ve výpočtech. Sálové scope se vyhodnocují před projekcí, lifecycle/archivní značky se neodstraňují; lokální denní Finance, Fáze, Sály a detail/trend respektují tentýž filtr. Výkonnost používá původní přesné intervaly a řízený filtr. Zdrojový CSV/JSON ponechává krátká, neplatná i ukázková data a rozlišuje je od měřených souhrnů. Ready fáze se v souhrnech cyklu/nákladů nezapočítává.
- Preloader čte skutečné počty stránkovaných řádků; roční rozpisy mají výslovně pojmenované dokončené zdroje. Neznámý počet není odhad procent,100% vyžaduje potvrzený snapshot a dokončenou přípravu. Testy ověřují nulový úspěšný výsledek oproti chybě, pozdní odpovědi, tenant/period izolaci, retry a původní realtime reducery.
- Export období nabízí den/týden/měsíc/rok/vlastní inkluzivní data v Europe/Prague, provozní hranici07→07 a úplné stránkování bez31/370denního cache limitu. CSV zahrnuje souhrnné i bezpečné zdrojové tabulky, JSON i samostatnou podpůrnou historii před/po intervalu. PDF používá stávající samostatný tiskový report; aktuální stav/obsazení/fronty/nouzové příznaky sálů jsou z reportových modelů odstraněny. Přesný místní den přepisuje v hlavičce obecný posuvný popis období. Finance v plném exportu jsou výslovný referenční výpočet podle současných sazeb, ne tvrzení o historickém účetnictví nebo kapacitě.
- Ověření:257/257 Statistiky + původní dashboard card/geometry regresí; TypeScript noEmit bez incremental cache, whitespace kontrola, bezpečnostní prebuild a produkční Webpack build prošly.21st review nových exportních/loading/performance prvků bez nových warningů; původní Finance autofocus a existující barvy/šířky tabulek ponechány.
- Autentizovaný localhost: skutečný den13.10., globální a lokální minfiltr, ponechané KPI, Výběr dat a kalendář. Export1.–15.7.2026 připravil3117 událostí a29 notifikací z úplného načítání30006 řádků včetně podpory; ověřeno100% a dostupné výstupní formáty. Na1024×768 a390×844 byly všechny pět KPI, filtr, výběr a export dostupné, dokumentové přetékání0; dočasný viewport vrácen. Desktop1452×1109 má280px levý rail a přetékání0. Recharts při HMR/změně viewportu hlásil přechodné nulové rozměry; následné grafy měly skutečnou viditelnou plochu. IAB neposkytl samostatně kontrolovatelný tiskový náhled; tisk byl zavřen Escape a fyzický PDF soubor/paginace nebyly při živé QA ukládány. Reportové modely/HTML a absence živých stavů jsou ověřené testy.
- Screenshoty: `/tmp/orm-statistics-qa.aBPyRg/performance-final.png` a `/tmp/orm-statistics-qa.aBPyRg/export-july.png`. Žádné klinické zápisy, změna schématu, mazání dat, commit, push ani nasazení. Původní rozpracované dashboard změny zachovány.

final result: passed for statistics filters, full historical export, true source loading and responsive controls; physical PDF pagination not independently rendered

## 2026-10-13 — Souhrn dne: zastoupení fází tvoří 100 %

- Opraven jmenovatel denního rozpadu: obsahuje stejné doložené neklidové fáze jako graf, nikoli skrytý stav Sál připraven. Skutečná Příprava sálu není klid; historické názvy zůstávají i po změně současného workflow. Ukončenou fázi určuje metadata.previous_step, ne následující step_index; operation_end se nepřičítá podruhé.
- Z naměřených intervalů timestamp−duration → timestamp se započítá jen průnik s vybraným provozním dnem07→07 a známou pracovní dobou každého sálu. Obě kalendářní části dne a změna letního času jsou zachované. Bez určeného/platného rozvrhu se skutečný čas nesmaže; tento případ je výslovně označen. Pauzy z rozvrhu se poměrově neodhadují. Krátké fáze zůstávají filtrovány podle původní naměřené délky, nikoli oříznutého přesahu.
- Přesné podíly zůstávají v čistém helperu; celočíselné popisky používají největší zbytky pro součet100%. Prázdná data nevytvářejí fiktivní100%. Syntetické/neplatné/budoucí záznamy a duplicity téhož ID se nepřičítají; různé autoritativní ID se heuristicky nemažou. Naměřený součet přes více sálů není délka jednoho pracovního dne ani vytížení kapacity.
- Stejné RingRow a vysvětlení slouží obrazovce i reportovému modelu PDF/CSV. Vytížení a počty výkonů nejsou přepočteny na100%. Zachován stávající vzhled dle21st; kontrola komponenty bez nálezů. Žádná změna databáze, klinických ovladačů, commitu nebo deploymentu.
- Ověření279/279 Statistiky + dashboard card/geometry testů, TypeScript a produkční Webpack sestavení. Z toho21 nových čistých regresí a nové propojení UI→report. Nezávislý audit reprodukoval přesah do následujícího časového rozvrhu60+30min=67/33. Autentizovaný localhost:13.10. podíly70+15+6+5+4=100;12.10.73+11+7+6+3=100, kalendář a minfiltr funkční. Screenshot `/tmp/orm-day-summary-qa.tAQrWh/day-summary.png`. Fyzický PDF tisk/paginace není nově tvrzen jako ověřený.

final result: passed for recorded daily phase shares and shared report normalization

## 2026-10-13 — Výkonnost ve skutečném designu záložky Fáze

- Upraven pouze prezentační obsah PerformanceTab a jeho scoped stylesheet. Hlavní sloupec začíná sdíleným Card panelem se stejným16px nadpisem, typografií,16px vnitřním odstupem a12px obrysem jako Fáze. Všech pět nativních klikacích ukazatelů je v kompaktním KPI pásu podle skutečného KPIBlock; kvůli klikací sémantice jde o jeho adaptaci, ne o novou neinteraktivní komponentu s přidaným tlačítkem. Ikony jsou rámované13px, hodnoty24px, celá plocha má nejméně112px výšky. Dlouhé definice zůstávají přístupné asistivním technologiím, ve vybraném grafu a metodice. Graf je hned pod souhrnem; metoda následuje až potom.
- Zachován280px levý Výběr dat se skutečnými sály a GlassCalendar. Panel, nadpis i sidebar mají při stejném1452px desktop viewportu přesně stejné souřadnice jako Fáze: hlavní panelx424/y354.375, nadpisx441/y390.375, sidebarx128/šířka280. Nezměněna hlavička, horní lišta, globální pozadí ani samotné Fáze. CSS odstranilo staré210–225px vysoké boxy, konkurenční3+2 rozvržení a mrtvé stylové bloky; nové pravidlo je2/5 sloupců s bezpečným jednosloupcovým fallbackem pod380px.
- Všechny výpočty, fetch/effect/hospital guardy, měsíční/denní režim, přesnost, skutečný preloader, ovládání krátkých fází, nulová/neznámá data a reportové payloady jsou zachované. Žádné procentní kruhy odvozené z minut, nové klinické limity, knihovna, databázový zápis, commit nebo nasazení. Předchozí rozpracované změny zůstaly.
- Ověření286/286 Statistiky + dashboard card/geometry testů;7 nových komponentových/design kontraktů, TypeScript, whitespace/JSON kontrola a produkční Webpack sestavení.21st katalog vrací fetchfailed, takže použita přímo skutečná projektová předloha; review obou souborů má pouze informační poznámky k převzatým barvám, bez warning/error a bez automatických změn.
- Autentizovaný localhost: Enter vybral Chirurgický výkon, skutečný dropdown TRAUMATOLOGIE1 + září změnil hodnoty a počty; tabulky/reportový výběr mají regresní pokrytí. Na1280×800 má pět boxů150×112px a přetékání0;1024×768 všech5 ukazatelů/2 filtry a graf dostupné bez dokumentového overflow;390×844 zachovaný Původní mobilní design, pět154×112px boxů bez interního overflow, tabulka se posouvá jen lokálně. Viewport override resetován, Výkonnost otevřená na výchozím desktopu. Fyzický mobil/tablet ani nové PDF stránkování nejsou tímto krokem tvrzeny jako testované.
- Skutečný screenshot: `/tmp/orm-performance-design-qa.DasANy/performance-final.png`.

final result: passed for Phases-matched Performance presentation with original calculations and callbacks

## Historical period report — compact utilization and notifications, 2026-10-14

- Scoped to the historical export model/dialog and an optional compact mode of the existing standalone A4 renderer. Default individual-tab reports and current clinical states are unchanged. Catalogue search was unavailable (`fetch failed`); existing report palette and project typography were reused. `21st review` reports zero findings in five changed implementation files.
- Visible PDF and human CSV use complete room names rather than room IDs, and duration columns use hours. ID-as-name/UUID fallbacks are rejected; unknown archived names are explicitly unavailable. The paper report hides provenance/quality diagnostics and large per-day/per-cycle dumps; complete safe evidence remains in CSV/JSON, including exact raw seconds and internal IDs in machine JSON. JSON schema version is now 3 with explicit units.
- Primary utilization uses closed recorded cycle intervals, merges overlaps, clips to Prague 07-to-07 operational days and each stored weekly work window, proportionally deducts explicitly configured breaks, excludes future operational days, and divides total scheduled active time by total planned capacity (not an average of room percentages). Include planned rooms without activity. A missing/disabled plan gives unknown utilization, never fabricated zero. Off-plan recorded time is separately labelled. Current-day capacity is the whole stored shift; unfinished cycles are not estimated. Historical schedule/rate revisions are not archived, so the report explicitly says that it uses currently stored configuration.
- Incident summaries use real Czech notification labels, normalize known aliases and retain recipient-zero record-only alerts. No delivery or delay-duration claim is inferred; free-text custom reasons are omitted. Alerts are visible by type and room, including late surgeon/anaesthesiologist/arrival, unprepared or infectious patient and emergency events.
- Automated verification: **314/314** statistics and dashboard-action geometry tests, TypeScript noEmit, optimized Webpack build and diff whitespace checks passed. Coverage includes DST/host timezone, range-boundary cycles, source completeness, filtered short phases, current-state exclusion, unknown capacities, zero-recipient incidents, no visible IDs, formula/HTML/SVG safety and preservation of default report rendering. A pre-existing notification-impact fixture depended on the weekday of the machine; it now explicitly selects its actual Monday date instead of altering application logic.
- Physical PDF QA: the actual HTML renderer, isolated offline headless Chrome, Poppler PDF inspection and page images. A synthetic fifteen-room / fifteen-day report is **3 A4 pages** with all rooms, phase/performance data, alert graphs and reference costs. Reviewed all three page images: no clipped rows, chart labels or overflow. Preview PDF and images are temporary QA files under `/private/tmp/orm-history-qa.prYA2g/`, not production fixtures.
- Authenticated localhost QA: period export reached 100% after 29,981 history/support rows. The requested 13October operational-day snapshot contained 282 history rows, 34 completed cycles and 0 notifications; utilization was **51.3%**, 49.98 scheduled hours /97.5 planned hours. JSON downloaded successfully using the real export button. Rendered its compact summaries offline into a second three-page PDF, with safe missing-plan labels and no room IDs/current clinical states. Zero-alert live snapshot plus nonzero deterministic tests cover both notification states. No clinical mutation, external upload, commit or deployment occurred. The IAB download completion call took unusually long; no repeated download was attempted.

final result: passed for compact historical reports, source-backed schedule utilization, hours and complete recorded-notification summaries

## Historical report — separate ÚPS columns, 2026-10-14

- User-defined ÚPS is recorded cycle activity outside the stored roster. Added columns for measured hours in roster, ÚPS hours, ÚPS share of total raw recorded cycle time, ÚPS utilization and its elapsed outside-roster time denominator. This is whole closed-cycle activity, not surgery-only incision time or staffed service capacity. Existing scheduled utilization remains break-weighted and unchanged; ÚPS share uses unweighted measured time consistently.
- ÚPS denominator is elapsed real 07-to-07 time minus gross scheduled windows, clipped at generation for an unfinished day. Explicitly disabled days are known outside-roster time. Shift breaks never become ÚPS, including a break consuming the whole net shift. Missing/invalid elapsed weekday plans or missing next-calendar-day pre-07 coverage remain unknown. Incomplete-plan rooms are excluded as a whole from confirmed ÚPS totals with an explicit coverage note; unknown observed activity prevents an unqualified overall share.
- Six headline metrics use the existing print renderer's optional 3×2 grid. Original four-metric/default reports are unchanged. The per-room ÚPS table starts on a fresh printed page; detailed daily ÚPS remains complete in CSV/JSON only. Removed old in-chart 'mimo rozpis' prose in favour of the named columns. No extra database query, schema change, clinical callback or notification mutation.
- Verification: **333/333** statistics/dashboard-action tests, TypeScript noEmit and Webpack production build passed; `21st review` four implementation files /zero findings, diff checks clean. New coverage exercises raw versus break-weighted time, proportion versus utilization denominators, unknown-roster nulls, fully disabled weekends, DST23/25h, overlap deduplication, current-day cutoff, next-date roster, aggregate weighting, independent short-phase filters, matching CSV columns and compact multi-year paper.
- Physical QA: regenerated the actual HTML renderer offline with fifteen synthetic rooms, including deliberate late cycles spanning shift end, and reviewed all **four A4 page images**. Six metric cards, all room rows, new ÚPS columns, repeated table headers and remaining summaries are visible without clipping. Example fixture:124.67h ÚPS /16.2% of all raw cycle time /3.1% of3,997.5elapsed outside-roster room-hours. Temporary PDF/PNGs: `/private/tmp/orm-history-qa.prYA2g/report.pdf` and `ups-page-1.png` through `ups-page-4.png`. These are QA fixtures, not patient or production data. Live localhost export preparation was re-run against the actual tenant; no download or native print interaction was repeated.

final result: passed for independent ÚPS time, share, elapsed utilization and compact report columns

## 2026-10-14 — Overview blocks aligned with the supplied KPI-strip reference

- Scope: only the four requested desktop/tablet Overview presentations: Jednotlivé sály — provozní metriky, Výkony / sál (24 h), Oddělení — výkony /24 h, and Přehled pracovních dob sálů (dnešní den). The user supplied `/Users/jaroslavjedlicka/Desktop/Snímek obrazovky 2026-10-14 v 0.44.54.png` (2820×196). This isolated strip specifies style, not a replacement full-page layout. Its eight headline cells are intentionally not copied as eight summary values into the room-level data. No new image assets are needed for native tables, text, separators and quantitative bars.
- Reference/actual comparison: opened the complete source and three authenticated actual-app screenshots together in one multimodal comparison input. The source was displayed proportionally (2048×142 in the viewer); no unverified pixel-density assumption or pixel-perfect whole-page claim. The runtime's existing matching KPI strip provides the CSS reference: translucent `--stats-surface`, `--stats-border`, 12px shell, 9px/600/.12em labels and 24px/300 values. Four new blocks use these actual project tokens, restrained semantic colors and hairline cell divisions. Operational table values use20px (capacity16px) to fit eight real columns; ranking and working-hours values use24px. These content-dependent type sizes and multiline table/list layouts are intentional, not missing screenshot sections.
- Full-view and focused inspection: `desktop-metrics.png` includes the existing KPI strip above the redesigned table; `desktop-rankings.png` shows both complete lists and surrounding unchanged charts; `desktop-hours.png` shows all thirteen configured room rows. Comparison checked surface/color treatment, typographic hierarchy, padding/alignment, existing labels/values and native structural elements. No new images/icons, oversized glow, repeated nested cards, extra motion, data or invented room aliases. Existing source aliases and top-eight/top-seven ranking limits are retained rather than silently changing reporting scope.
- Changes are scoped CSS modules/pure presentation components. The shared BarList and mobile return path are untouched. Operational table preserves its caption, actual-state label, eight columns, row headers and numerical semantics. Working hours preserve the actual configured room list, schedule, status colors, counts, utilization denominator and queue; only a pre-existing display rounding error is fixed:450min→7h30min,690min→11h30min. No statistical calculation, fetch, clinical handler, permission, filter or export model was changed. The method and period naming remain the existing app's, not newly redefined metrics.
- Live read-only QA: authenticated localhost, selected operational day13.10.2026; twelve eligible operational-day table rows and thirteen configured working-hours rows. Both lists and all working-hour rows visible without clipping on1452×1109. Runtime headers confirmed9px/600/1.08px tracking, continuous non-zebra surfaces and lightweight tabular values. At1024×768 and768×1024 document overflow is0; tables scroll only within their own focused regions, and the room-name column stays at the region's left edge while ArrowRight changes scrollLeft. Ranking lists fit their own widths. At390×844 the unchanged original mobile overview has0 document overflow. Previous day changed actual first-row measurements (13th→12th); next day restored13th. Captured console warn/error list is empty. Temporary viewport was reset.
- Verification:344/344 statistics and dashboard action-geometry tests;21 focused presentation tests independently audited; TypeScript noEmit without incremental cache; whitespace check and production Webpack build passed. `21st review` on seven changed implementation files:0 findings. Catalogue search was unavailable (`fetch failed`), so the supplied screenshot and existing real application component were used directly. React checklist: no new effect, fetch, shared state, dependency or conditional hook; native list/table semantics, stable rows and accessible empty/null/zero states. Existing report contracts passed; physical PDF pagination and physical devices were not separately re-rendered/tested in this visual-only change.
- Actual screenshots: `/private/tmp/orm-overview-strip-qa.GIWIKf/desktop-metrics.png`, `desktop-rankings.png`, `desktop-hours.png`, `tablet-hours.png`, `phone-overview.png`. An optional QA-only contact-sheet script could not run because the installed Sharp runtime lacks JP2 format metadata; the required source/actual comparison was performed directly on the original images together, not on a fabricated composite. No source image or dependency was changed to work around that tooling limitation.
- Prior unrelated worktree changes are preserved. No clinical/database writes, commit, push or deployment.

final result: passed for all four screenshot-aligned Overview blocks with preserved reporting behavior

## 2026-10-14 — Light infographic report design and exact small Operatingroom logo

### Target and scope

- User supplied four523×740 AVIF documents (annual-health-club..., modern-urban..., business-performance..., real-estate...) and `/Users/jaroslavjedlicka/Desktop/images.jpeg` (465×659), plus `/Users/jaroslavjedlicka/Desktop/Operatingroom-logo.svg`. All five visual references were opened; AVIFs were losslessly converted to PNG only for inspection under `/private/tmp/orm-report-redesign.WBiqH6/ref-1.png` through `ref-4.png`.
- Shared visual truth: light editorial dashboard paper, small brand heading with top accent rule, bold compact KPI values, white subtle rectangular sections, scientific charts and fine tabular rules. This is a requested stylistic adaptation to real clinical reports, not a clone of stock financial/population content. No invented growth badge, confidentiality/audit claim, fake graph or source illustration is copied. The only required image asset is the supplied logo, embedded unchanged; SHA2566b4a09b8778e4189731b67a9513a3b60ec0c2da4c85bc3a0fa14b69fba6cabf5.
- Actual implementation is the shared `lib/statistics-print.ts` used by all eight statistics tabs and historical exports. The separate calendar generator now uses a pure `lib/calendar-print.ts` helper and the same exact logo. Only CalendarManager's print adapter changed; working app screens, CSV/JSON, filters, permissions, calculations, historical provenance exclusions and existing roster/UPS definitions are unchanged.

### Rendered comparison and fidelity

- Actual production renderer was run offline with synthetic fixtures, not a reconstructed illustration. Chromium generated historical A4 portrait4pages, a standard overview A4 portrait2pages, and the calendar A4 landscape1page. Every page was rasterized with Poppler and opened, including the repeated headers and final rows. Paths: `/private/tmp/orm-report-redesign.WBiqH6/historical.pdf`, `overview.pdf`, `calendar.pdf`; corresponding `history-page-1.png` through `history-page-4.png`, `overview-page-1.png`/`2.png`, and `calendar-page-1.png`. These are temporary QA artifacts, not patient reports or user deliverables.
- Comparison input included the actual523×740 business-performance reference alongside normalized523×740 first pages from both actual report modes, plus the full calendar render. Actual portrait PNGs were919×1300 before proportional normalization; physical page size594.96×841.92pt. Landscape is841.92×594.96pt. No browser/pixel-density difference was treated as a font/layout defect. Full-page composition and focused1300px header/logo/KPI/table/chart regions were inspected.
- Fonts/typography: existing offline Arial/Helvetica sans stack,18–20pt compact title instead of the old22–26pt, restrained uppercase7–9pt section/metric labels,17–19pt KPI values, readable8pt historical table content. All Czech labels/diacritics remain actual text. No external font download.
- Spacing/layout: near-square2px panels,3mm section padding/gaps, A4 margins and normal long-table flow. Two-column pairs are limited by number of rows/columns/points and text length; oversized, wide or explicit-new-page sections never enter an unbreakable pair. The15-room utilization graph fits completely on page1, UPS starts on page2, repeated table headings are visible across subsequent pages. Long multi-page data is intentionally not forced into one stock-sized sheet.
- Color/tokens: pale#f7f9fc paper, white panels, navy#17233f text, thin blue-grey borders and teal#0e7490 headings/values; existing real series colors retained. This changes report styles only, not application theme/status semantics. Calendar uses the same light paper language and retains supplied valid configured cell/special-day colors.
- Assets/copy: exact supplied SVG at40×50CSSpx with intrinsic aspect contained, complete vector quality and accessible alt text; loaded before auto-print. No approximated logo, image generation, decorative image, remote asset or interpolation of untrusted report markup. Source labels, units, empty/null/zero states, all rows and precise existing report meanings remain intact. Historical reports still exclude current clinical states and room IDs.

### Browser, interactions and checks

- The actual renderer's synthetic HTML preview was inspected through the selected in-app browser at1280×720; loaded40×50logo, both bounded pairs,19body rows and0 document overflow were confirmed. Saved `browser-overview.png`. At390×844, DOM checks confirmed0 document overflow,366px single-column pairs and a loaded40×50logo. The IAB screenshot surface scaled the mobile override in its native window, so that image is not claimed as an independent1:1 physical-device capture. Override reset. The isolated preview contains explicitly labelled synthetic QA data and is not presented as the production app.
- Live authenticated app retained Statistics Overview. Clicking its PDF control did not expose the newly opened print window through the IAB tab inventory, so an end-to-end native dialog/save is not claimed. Standalone open/print/close callbacks, source-tab isolation and image/font/deferred-frame behavior are tested, including load/error, font failure with pending logo and closing the preview. Existing app console contained one realtime socket1006 warning, not a report exception. Synthetic report preview console warn/error list was empty.
-362/362 statistics/dashboard-action/calendar-print tests pass; TypeScript noEmit, whitespace checks and production Webpack build passed. Logo bytes and single trusted image are asserted, while dynamic injected markup/remote URLs remain rejected. Full180-row reports, all eight tab headings, exact metrics, untruncated names, gaps/nulls/zero, six-column UPS, print headers/page numbers and short-summary pairing are covered. Calendar tests preserve31days, all rows, merged cells, selected font sizes/colors and escape presentation inputs.
-21st search was unavailable (`fetch failed`); existing report components and the provided visual sources were reused. Shared renderer and new calendar helper review:0findings. Whole pre-existing CalendarManager reports unrelated old UI findings; none were automatically changed. No dependency, schema, clinical write, commit, push or deployment.

### Findings and comparison history

- First physical calendar comparison found a P2: automatic white heading text on yellow holiday#EAB308 had1.92:1contrast. The calendar heading now chooses the higher-contrast navy/white ink by sRGB luminance, including valid alpha hex composited on white paper. Explicit cell colors/textColor remain unchanged. Post-fix calendar PDF was regenerated and its full page reopened: yellow/pale headers use dark ink and dark special headers retain white. Focused8-test calendar suite covers the change.
- Pairing hardening from independent audit: mixed chart+table sections never pair, long column labels stay full-width, and paired line-chart tick labels are limited to12characters (longer labels stay full-width rather than being truncated). Synthetic standard/historical fixtures retain the inspected layout.
- No actionable P0/P1/P2 mismatch remains for the requested paper-style adaptation. Density and amount of data intentionally differ from one-page stock examples. Complete-data pagination takes precedence over decorative compression. Minor variation in specific teal shade between independent calendar and statistics rules is acceptable semantic branding, not a status/data change.
- Follow-up test gap: native save dialogs across external browsers and physical printers/devices were not operated. Backend data/query tests were not expanded because this change is presentation only.

final result: passed


## 2026-10-14 — Historical report: real two-column graphical summary

### Request, selected surface and chart contracts

- User rejected the tall list-only first page in `Snímek obrazovky 2026-10-14 v 2.29.45.png` and explicitly requested columns and graphs. This iteration extends the existing actual `StatisticsReport`/HTML-to-PDF surface; it does not replace the report with an image, a new analytics artifact/runtime, or an application dashboard. The prior supplied infographic paper palette and exact embedded small Operatingroom SVG remain the design authority. Working application screens are unchanged.
- The five native dashboard panels reuse the historical export model: all actual named-room capacity-weighted utilization percentages as zero-origin horizontal bars; measured filtered phase hours as a directly labelled donut excluding Ready; all rooms' actual completed-cycle counts as zero-origin columns; raw recorded roster versus UPS hours as a separate donut restricted to complete schedules; and actual logged alert counts by type as labelled bars. Cycle counts are scoped by completion in the selected period, not by guessed starts. The raw-hour composition is explicitly not break-weighted utilization or staffed on-call capacity. Notification counts do not imply email delivery or delay duration.
- Unknown/invalid values do not become zeros. Genuine zero series have no fabricated segment or column. Partial donuts identify known values; empty compositions state that no measured data is available. More than seven composition categories fall back to complete labelled bars. Large bar/column series continue in bounded18-point cards without dropping names. Ordinals under vertical bars are local keys matched to full visible names, never internal room IDs.
- The original report's complete tables, real precision, phase filter, operating dates/timezone, planned capacity, UPS definitions and chronological trend remain. Shared chart-only time/count evidence is projected into exact three-column appendix tables instead of repeated multi-line labels under every executive bar. CSV source tables and machine source evidence are not removed or recomputed; JSON summaries gain additive presentation/chart fields through their existing report object. No source query, hospital scoping, schema or clinical state mutation.

### Physical rendering, findings and fixes

- QA uses synthetic data only through the actual production `buildStatisticsExport` and `buildStatisticsPrintHtml`, loaded offline. Daily fixture:15rooms,22completed cycles,0notifications,2026-10-13. Period fixture:15rooms,154completed cycles,55alerts,2026-07-01–15. These are layout/contract fixtures, not patient reports, production data, or evidence of clinical performance.
- Actual Chromium A4 conversion with an isolated temporary profile and Poppler rasterization produced final `daily.pdf`4pages and `historical.pdf`5pages under `/private/tmp/orm-report-columns.P5IhxD/`. Every final page was opened: `check-daily-1.png` through`4.png`, `check-history-1.png` through`5.png`, each990×1400proportional A4. Final first pages visibly contain two independently flowing columns and four actual plots, not the old full-width list. Notification panel follows when it cannot safely fit; detail tables follow it without a forced blank page. Long evidence tables retain repeated column headers, complete names and final rows.
- Initial physical QA found a P1 layout defect: the first large nested grid was treated as an unbreakable row, pushing all graphs from page1. Fixed with independent left/right flows and compact one-row bars. Their former very thin appearance was also an SVG aspect-ratio issue; bar marks now stretch only their decorative marks, preserving actual numeric widths and textual values.
- Second QA found a P2 waste: a continued notification panel alone occupied page2 followed by a forced appendixpage3. Removed only the appendix's forced page break; exact evidence now follows on that same page. The explicit UPS section break is preserved. Files with before/after/final render evidence remain in the same temporary QA directory. No remaining clipping, overlapping labels, missing last rows, blank pages or hidden graph categories was observed in these bounded physical fixtures. Arbitrarily long facility names/series may add pages by design, rather than being cropped or shrunk to illegibility.

### Verification and scope boundaries

-382/382statistics, dashboard-action geometry and calendar-print tests passed. New export contracts cover actual counts/hours, filtering, missing schedules, genuine zeros and full-room membership. Renderer tests cover opt-in/default compatibility, independent columns, full appendix rows, shared-chart evidence preservation,47-room continuation, donut/column numeric geometry, null/zero/invalid states, text/color escaping and the one trusted exact logo. TypeScript noEmit and production Webpack build passed; `git diff --check` passed. `21st review lib/statistics-print.ts lib/statistics-export.ts`:2files,0findings.
- The21st catalog search was unavailable (`fetch failed`), so the existing native report components and supplied visual references were reused. No remote chart/font/logo dependency was added. Existing automatic print/font/image readiness, close/cancel/retry behavior, source-tab isolation and default reports remain covered by the prior and current tests.
- This iteration verifies physical PDF conversion, not a newly operated authenticated browser export/save dialog or a physical printer. Existing dashboard/app clinical UI was not modified. No DB write, patient data access, commit, push or deployment.

final result: passed for the requested two-column graphical historical-report redesign

## 2026-10-14 — Cliniq overview: whole-word heading and clearer phase gradients

- Scope is only `components/mobile/mobile-cliniq.css` below768px, gated by the existing optional Cliniq data attribute. No React handler, provider, room/color mapping, tenant preference default, classic CSS or desktop layout changed. Reused the actual shared MobileHeader and actual authenticated MobileRoomOverview, not the isolated synthetic study.21st catalog search failed (`fetch failed`); existing components/tokens remained authoritative.
- The actual390px live view reproduced the reported issue: the right action group occupied294.5px, compressing `Přehled sálů` into letter fragments through inherited `overflow-wrap:anywhere`. The Cliniq overview title now uses normal word wrapping, no automatic/iOS hyphens and `flex:1 0 min-content`; its toolbar and action group wrap while preserving complete controls. It is not hidden, truncated, scaled down or forced nowrap. Other headers retain their original rules.
- Both grid and row cards still derive their hue from the actual hospital's `--room-phase-color`. Whole-card light gradients are now32→12percent of that hue over white (was17→5); dark gradients30→8percent over the original navy (was18→0). Borders remain subtle20/34percent mixes, rounding stays24px, no extra glow or motion. Actual ready cyan and running surgery magenta were inspected without changing clinical state. Conditional clinical notes use the existing main ink; dark timing captions also use it so intensified backgrounds cannot reduce their readability.
- Actual localhost authenticated app was checked at320,360,375,390,430,540,600,767CSSpx in both light and dark. Every word's DOM Range remained a single line box, the heading/action rectangles did not overlap, document horizontal overflow was0, and all five visible header controls remained at least44×44px. All15real room cards stayed mounted. Row layout was also inspected and had0horizontal overflow. Temporary appearance/layout changes and viewport override were restored to the original classic/dark/grid1543×1109Statistics Performance view and original short-phase filter. No clinical controls were activated.
- Final screenshots are `/private/tmp/orm-cliniq-polish.RabgZw/cliniq-light-final.png`, `cliniq-dark-390.png`, `cliniq-dark-320.png`, `cliniq-light-rows.png`. Direct tab screenshot exports preserve the390×844viewport; the native IAB screenshot surface scales some overridden viewports within its host window, so it is not claimed as an independent1:1physical-phone capture.
-22/22focused tests pass:7newCliniq contracts,7shared header tests and8room-grid tests. The numerical regression test reads actual CSS tokens, both gradient stops and rgba inset surfaces and calculates sRGB/WCAG contrast for both black/white phase extremes. Titles, named phases, conditional clinical notes, values and captions stay≥4.5:1 in both themes; the tightest light timing caption is4.501:1and the corrected dark timing caption4.752:1. This is a bounded static palette/compositing proof, not an audit of every application label or arbitrary user CSS.
- TypeScript noEmit, production Webpack build and `git diff --check` passed.21st review reported25informational hardcoded-color notices in the existing Cliniq stylesheet; no unsafe automatic fixes were applied. Existing palette/surfaces were preserved rather than introducing another theme.
- Broader existing mobile suite has17pre-existing assertion failures: before this change113tests/96passed/17failed; now120tests/103passed/the same17failed. Independent baseline rerun replaced only this stylesheet with gitHEAD through an in-memory read adapter, never editing production files. Evidence `/private/tmp/orm-cliniq-baseline.VrXNKA/`: removed search CSS assertion, old permission regex,14old RoomDetail mock/CSS assertions and a NotificationsTab heading assertion. No unrelated fixes were folded into this request.
- No dependency, database write, patient data export, commit, push or production deployment in this iteration. The prior deployed report version remains in production until a new release is requested.

final result: passed for scoped Cliniq heading, phase-color strength and text contrast; pre-existing broader mobile-test failures recorded separately

## 2026-10-14 — Cliniq light canvas: neutral grey to white

- Follow-up changes only two existing tokens in the optional mobile Cliniq light root rule: fallback#F4F4F4and `linear-gradient(180deg,#ECECEC 0%,#F7F7F7 45%,#FFFFFF 100%)`. These are neutral equal-channel greys with monotonically increasing brightness, replacing the previous blue-green mist canvas. The existing shared page-background consumers are reused. Phase tints/contrast, cards, headings, controls, dark/default/desktop appearance and all clinical logic remain unchanged.
- Actual authenticated localhost390×844Cliniq light was opened and inspected. Computed canvas and rendered dashboard background match all three requested stops; document horizontal overflow0and whole-word `Přehled sálů` preserved. Final actual screenshot: `/private/tmp/orm-cliniq-polish.RabgZw/cliniq-neutral-background.png`. Dark-mode computed canvas remains the original shared navy/radial background and dark phase gradient remains30→8percent. Original classic/dark preference, Statistics Performance and its short-phase filter were restored, viewport reset to1543×1109.
- Focused tests include the new light-background ownership/neutral-stop/dark-default preservation contract in addition to all previous heading/card/contrast regressions. `git diff --check` passed.21st catalog search remained unavailable; reused the current design components and tokens. Review contains the same25informational existing palette notices; no automatic unrelated changes.
- No dependency, provider, data/schema change, clinical write, commit or deployment. Previous unrelated mobile-test failures are unchanged and recorded in the preceding entry. This small token-only iteration was verified with actual CSS hot reload and focused tests; the prior production build remains the latest full-build evidence.

final result: passed for scoped neutral grey-to-white Cliniq light background

## 2026-10-14 — Login without a username field

- Removed the mobile manual username/password branch from the actual shared `components/LoginPage.tsx`, including its now-unused email state. Initial mobile login now offers the existing hospital chooser, Google superadministrator option when enabled, and the five existing role tiles. Selecting a role shows only its password form. Desktop retains its existing role picker/password reveal. The chosen role supplies the same canonical account as before; empty role/password/hospital cannot submit. Reset, errors, password visibility, OAuth/2FA and native callbacks remain unchanged. No API, session, credential, permission, database or clinical mutation.
- Reused the current project login primitives and visual styles per21st. Catalog search was unavailable (`fetch failed`). `21st review components/LoginPage.tsx` reports23 existing palette, fixed-size, overflow and focus warnings; affected input styles and desktop sizing were already present in HEAD and were not redesigned. The mobile inputs have the existing shared CSS focus ring. No unrelated automatic fixes were applied.
-27/27 auth tests and15/15 email security tests passed. The17 new actual-component render/callback tests cover no username field/label, both layouts' five role-to-account mappings, selected hospital/password requirements, reset/error behavior and unchanged web/native Google flows. Tests mock auth/network and do not perform real sign-in. TypeScript noEmit, production Webpack build, email-secret guard and `git diff --check` passed. An independent agent audited the scoped production diff with no blocker.
- Browser QA used the real production build on an agent-owned temporary loopback server at127.0.0.1:3187 so the existing authenticated localhost:3000 session was not logged out or modified. Public hospital configuration loaded, all existing roles and Google option were enabled, mobile390×844 initial view had no username field, selecting ARO revealed exactly one visible password input, and Back returned to the chooser. Desktop1280×900 selection also revealed only the existing password input. Both views had0horizontal document overflow and0username/email inputs; production-tab console warning/error capture was empty. No password was entered, submit performed, Google redirect opened or authenticated action triggered. Screenshots: `/private/tmp/orm-login-no-username.png` and `/private/tmp/orm-login-desktop-no-username.png`.
- An earlier unauthenticated127.0.0.1:3000 dev-tab remained in its pre-hydration loading state; it was not used as evidence of functional login. The production-build check above resolved the QA limitation without changing development-origin/security configuration. Temporary QA tabs/server and viewport overrides were cleaned up. No dependency, commit, push or production deployment.

final result: passed for removal of the username field with existing role/password login preserved

## 2026-10-14 — iOS-inspired readable mobile login

- The actual light login reproduced the issue: shared desktop `.login-role-icon` used near-white `#e2e9ed` at0.76opacity on almost-white mobile tiles. Mobile field captions/icons also used an overly faint muted token, while the native hospital picker still forced dark colors. New rules are scoped to mobile login and override this inherited desktop appearance without changing the desktop rule.
- Reused the current LoginPage, role definitions, Lucide glyphs, password reveal, native hospital select and Google/native callback paths. New mobile presentation uses system-first typography, a quiet grey-to-white canvas, white grouped controls, restrained22px tiles,14px complete role labels and opaque blue glyphs on12percent tints from the existing role palette. The actual role/hospital context is shown above the password, not a username field. Google superadministrator access is a secondary control beneath ordinary roles. Dark uses the same structure with opaque navy cards and pale-blue glyphs; the existing dark background/preference remains. No authenticated module design, default appearance or theme persistence was changed.
- Direction follows21st's project-first reuse and the streamlined, consistent icon/label/control patterns described in [Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/buttons). This is an iOS-inspired React/Capacitor presentation, not SwiftUI, SF Symbols, native Liquid Glass or a Figma translation. The21st catalog search was unavailable (`fetch failed`), so no external template or dependency was introduced.
-59/59 focused tests pass:36auth (including9new presentation contracts),15email-security and8existing Cliniq overview contracts. New tests read the actual palette and all five role tints: lowest icon contrast5.71:1light and7.40:1dark; light muted text on cards5.25:1, light field icons5.96:1, dark muted on cards8.14:1. Tests also cover native option colors/scoping, no forced mobile dark picker, full role labels,44px controls, explicit keyboard focus/reduced-motion rules and actual selected-role/hospital context. These are bounded sRGB palette calculations, not a whole-app accessibility certification. Existing tests still cover all five canonical account mappings, password/hospital requirements and unchanged Google/native flows without real sign-in.
- Browser QA used the actual production build in an agent-owned temporary127.0.0.1:3187server, leaving the existing authenticatedlocalhost:3000session untouched. Light checked at320/360/390/430/540/600/767CSSpx, dark at320/390/540/767: all5roles present, no role-label horizontal overflow, no document horizontal overflow, all mobile buttons≥44px. Computed role glyphs are opaque rgb(35,91,181) light and rgb(159,197,255) dark; native select matches the light/dark palette. Long pages retain natural vertical scrolling, including Google access/footer on short screens, not height clipping or tiny scaling.
- Keyboard Tab from the hospital picker focused the first role with an actual3px blue focus-visible outline; Enter opened its real password-only view. Empty-password reveal toggle was44×44px, changed only that field's type, retained actual role/hospital and disabled submission; Back restored the chooser. No password was entered, form submitted, Google redirect opened, clinical action triggered or database changed. Desktop1280×900 retained original glyphrgb(226,233,237), hidden mobile layout and0horizontal overflow. Captured production-tab warning/error logs were empty.
- Actual screenshots opened and inspected: `/private/tmp/orm-login-ios-light.png`, `/private/tmp/orm-login-ios-password.png`, `/private/tmp/orm-login-ios-dark.png`. Full-page captures include all content; the first two-column phone view may scroll naturally. Temporary QA viewport/server/tabs were cleaned up; originallocalhostsession and settings were not changed.
- TypeScript noEmit, production Webpack build, email-secret guard and `git diff --check` passed.21st review reports756global findings, predominantly existing palette notices and unrelated global styles, plus the two unchanged desktop outline-none locations; the new mobile controls use an explicit scoped visible focus outline and no outline-none utility. No unrelated automatic fixes. Independent agent audited the new scoped UI diff and tests with no blocker. No commit, push or production deployment.

final result: passed for readable, iOS-inspired mobile login with existing authentication preserved

## 2026-10-17 — Mobile five-segment glass login

### Target and implementation

- User reference: `/Users/jaroslavjedlicka/Desktop/BA4651A8-7795-472C-B290-38D73279D015.PNG` (941 × 1672). Requested a similar mobile login graphic, not a change to authentication or desktop.
- Implemented in the existing `components/LoginPage.tsx`, with a mobile-only stylesheet `components/mobile/mobile-login-wheel.css` (max-width 767px). Five transparent native buttons overlay optimized glass artwork; names and Lucide icons remain live accessible content. Reused the supplied Q brand as a mask. Hospital selection follows the wheel. Existing password, Google, native authentication, disabled/error and Back behavior is retained.
- Product Design image-to-code guided asset extraction, actual functional controls and paired screenshot comparison. Background and wheel were recreated with imagegen from the supplied reference, rather than approximating the major artwork with CSS/SVG. No new package or font dependency. Both new WebP assets total 168,664 bytes (about 165 KiB).

### Visual QA and fix pass

- Canonical screenshot: `/tmp/operatingroom-mobile-login-qa/login-393x698.png`. Source normalized to 393 × 698 and compared beside the actual browser screenshot in one image: `/tmp/operatingroom-mobile-login-qa/comparison.png` (source left, implementation right). Whole image, no crop. This is the actual localhost application, not a static fixture.
- Initial QA found inherited centered wordmark alignment; corrected to left aligned. The password surface rule also affected the hospital picker; restricted it to the password panel. Re-rendered and compared the final result.
- Hierarchy, five-petal geometry/order, upper-left branding, lamp position, cyan light trails, dropdown and superadministrator access match the reference direction. Residual P3 differences: generated glass highlights are slightly more violet and stronger, and the lower controls sit around 12–16px below the scaled reference. These do not obstruct reading or operation. No remaining P0–P2 findings in the tested views.
- Verified 320 × 568, 393 × 698 and 390 × 844. No horizontal document overflow; all five role labels fit; all role targets are at least 44 × 44px. At 320px the long hospital name wraps naturally, and the complete chooser fits vertically. Screenshots: `login-320x568.png`, `login-393x698.png`, `login-390x844.png` in the same QA directory.
- Desktop checked at 1024 × 768: original desktop presentation is visible, mobile wheel is hidden, no horizontal document overflow. Screenshot: `login-desktop-1024x768.png`. Desktop JSX/styles were not changed.

### Functional verification

- Actual browser: hospital menu opens with the current selected institution, closes without changing it; Administrátor opens the real password view; empty-password reveal changes input type; Back restores the wheel. No password was entered or submitted, and no OAuth redirect was triggered. Browser error log was empty. Temporary viewport override reset after testing.
- 35/35 focused tests pass: existing role/account/hospital/Google/native/reset/error tests, retained base presentation contracts, and four new wheel-scoping, interaction, focus and asset-budget tests. The inert role harness was updated only for the new CSS import and button class. No live authentication is performed by these tests. Older presentation contracts cover the retained base stylesheet, not a claim that its legacy light theme is the displayed wheel design.
- `npx tsc --noEmit --incremental false`, `npm run build -- --webpack` and the build's email-security guard passed. No deployment, commit, push, credential, provider or database change. Pre-existing circle-label CSS modifications in `mobile-cliniq.css` and `mobile-room-orbit.css` preserved.

### Artwork provenance

- Reference above supplied for both imagegen edits. Background: `transparent_background: false`; source `/Users/jaroslavjedlicka/.codex/generated_images/01a14bab-f64d-70a0-b36a-191ade5b428b/exec-0d618624-338d-41e7-aa62-0407b87fd259.png`; optimized `public/images/mobile-login-theatre-blue.webp` (941 × 1671, 29,070 bytes).
- Exact background prompt:

```text
Use case: precise-object-edit. Asset type: portrait 9:16 mobile app background raster, with no interface. Input image 1 is the edit target and exact palette/composition reference. Remove every foreground interface element: all text and lettering, all logos including the Q at top and center, the entire segmented circular wheel with its glass panels and icons, hospital selector, buttons, lines surrounding text, labels and control outlines. Reconstruct the continuous background behind them. Preserve the deep midnight navy blue photographic surgical theatre atmosphere, the softly blurred multi-light surgical operating lamp at upper middle (center about 60% across and 25% down), and softly luminous blue/cyan sweeping light ribbons across lower middle. Preserve source colors, soft defocus, elegant lighting, diagonal lower light trails, dark uncluttered bottom and generous empty space for later UI. Background only, no humans, no added objects, no typography, no UI panels, no logo, no watermark. Save the resulting background image artifact.
```

- Wheel: `transparent_background: true`; source `/Users/jaroslavjedlicka/.codex/generated_images/01a14bac-85ac-7572-b59c-12f8703425c8/exec-987b6ae4-842f-44ae-a0d8-af7f080ae535.png`; optimized `public/images/mobile-login-role-wheel.webp` (960 × 960, 139,594 bytes).
- Exact wheel prompt:

```text
Use case: background-extraction.
Asset type: production mobile login circular menu glass-surface sprite with real transparent background.
Input image 1 is the exact appearance and geometry reference. Extract/recreate ONLY the circular five-petal menu centered in the reference, excluding every other screen element and the hospital photographic background.
Subject: five separate softly rounded annular wedge-shaped glass panels arranged as a circular wheel, plus one separate central dark glass circular disc. The top petal points upward centered at -90 degrees; then four petals centered at -18, 54, 126, 198 degrees clockwise from the x axis. Each outer petal spans about 70 degrees with a narrow radial gap. Keep the source's petal proportions: outer circle, softly rounded corners, inner circular cutout radius about 20% of outer wheel diameter, round central disc slightly smaller than the hole leaving a visible clear ring gap.
Style/material: match the original reference accurately: sophisticated smooth dark navy translucent blue glass faces, gently luminous cyan hairline outlines, brighter cyan outer edges on the right and lower-right, limited lilac-white edge reflections on the upper left and lower left, subtle blue shaded glass gradients. Keep surfaces broad and calm so readable text and icons can later be overlaid. Central circle is blank dark navy glass with a cyan rim and very subtle lilac reflection lower left.
Composition: exact flat front view, no perspective, no tilt, centered on a square canvas. Outer wheel diameter takes about 94% of the square, leaving a small margin for soft edge glow. Match the wheel of the reference; do not make a turbine, mechanical bevel, gear, or 3D thickness.
Transparency: genuine RGBA alpha background, fully transparent outside the five petals and center disc and fully transparent in the radial gaps and the circular gap. Preserve translucent edge glows. Do not draw a checkered or solid backdrop.
Remove every icon, shield, heart trace, briefcase, clipboard, stethoscope, all letters and all labels. Remove the cyan Q logo from the center entirely; leave blank glass. No text, symbols, logos, watermarks, buttons, backdrop, rays, photo, lamp, or added elements anywhere. Deliver ONLY the isolated five glass petals and blank central glass disc.
```

final result: passed for the requested mobile reference-inspired glass login; minor raster fidelity differences recorded above

## 2026-10-18 — Quieter mobile login refinement

- User-requested refinement reuses the existing wheel, mask logo, live buttons and Radix hospital picker. Only the decorative wheel image receives opacity .78 and saturation/brightness reduction; foreground text/icons stay sharp and opaque. Both Q marks are white. Icon/label groups use a centered grid, with thin 1.4px glyph strokes. Mobile visible administrator label is Admin while its accessible name and actual role/account remain Administrátor. Hospital/superadministrator borders use 25% alpha and surfaces 32%, with a quieter divider and inset reflection. Desktop and authentication unchanged.
- Actual browser inspected at 320 × 568 and default tall phone; final 393 × 698 screenshot saved to `/tmp/operatingroom-mobile-login-qa/login-refined-393x698.png`. All five role icons are horizontally centered within their hit targets (maximum subpixel deviation 0.004px), targets exceed 44 × 44px, names fit, document width stays 320px. Temporary viewport reset. No login submission or institution change.
- 22 focused component/auth/wheel tests and TypeScript noEmit passed; git whitespace check passed. 21st catalog was unavailable (`fetch failed`), so existing primitives were reused. Review reported 44 findings, including existing desktop fixed widths/outline removal and palette notices; no unrelated auto-fixes or desktop edits. Mobile visible focus outline remains explicit. No new asset payload, dependency, clinical operation or deployment.

final result: passed for quieter mobile glass, white branding, centered live labels and subtle secondary controls

## 2026-10-18 — Management placement and password reveal

- Swapped only mobile petal positions: Management now uses the wide top segment; Admin is lower-left. Kept live role identities, white logos and quiet artwork. Existing password form enters with a 280ms opacity/16px translation animation, disabled under prefers-reduced-motion. Mouse pointer entry and click/tap select through the existing handler; touch pointer entry alone and missing hospital cannot select. Desktop unchanged.
- Actual browser at 320 × 568 confirms the full Management label fits within the upper petal. Clicking it opens the real Management password form with the expected animation name and no horizontal overflow. Back restores the wheel; viewport reset. No credential entered/submitted. Screenshot: `/tmp/operatingroom-mobile-login-qa/login-management-top.png`.
- 24 focused tests and TypeScript passed. New tests cover mouse versus touch entry, unavailable hospital, exchanged geometry and reduced motion. 21st search unavailable; reused current project controls. Review retains the same 44 existing palette/desktop findings; no unrelated desktop fixes. No deployment.

final result: passed for swapped mobile roles and animated password reveal

## 2026-10-18 — Mobile login requires click to enter password

- Removed the mobile role button's mouse pointer-entry handler. Hover changes appearance only; click, tap, Enter or Space activates the existing role selection and animated password form. Management remains in the upper wide segment and Admin stays lower-left.
- Actual localhost browser click on Management opened its password field, and Back restored the wheel. No password was entered. All 24 focused role and wheel tests passed, including a direct check that role buttons have no pointer-entry handler. No desktop or authentication backend change.

final result: passed for click-only mobile role activation

## 2026-10-18 — Mobile administration matches Settings Orbit

- Scoped rooms, specialties, room schedule, staff, statuses and notifications to the existing Cliniq phone palette/background. Reused Settings artwork, dark veil, lavender controls, 9px backdrop blur and a shared centered title/back header. Desktop/classic styles, lazy module imports, permissions and clinical handlers are unchanged. No dependency or image payload added.
- Summary tiles wrap to two columns; search and period navigation fit the viewport with 44px controls. Rooms administration and staff table rows become phone cards. The genuine planning grid keeps horizontal scrolling and existing department/status colors. Explicit focus-visible and reduced-motion rules apply only to this mobile scope.
- Actual localhost UI: opened all six modules, checked screenshots at375px, specialties at456px, notifications at320px/393px. Document widths matched375/320 respectively. Corrected an observed date-navigation wrap and search-container collision. Staff table verified with321px-wide visible grid rows inside375px screen; restored cards afterward. At1280px, new mobile heading is hidden and original toolbar remains nowrap. Reset temporary viewport and returned to Settings. No clinical/settings data saved or messages sent.
- Proof: `/tmp/mobile-admin-notifications.png` (393×900). TypeScript noEmit and19 focused settings/schedule tests passed; git whitespace check passed. Tests cover six module titles/back navigation, permission preservation, phone-only scope and desktop selection.
- 21st search was unavailable (fetch failed); existing project primitives were reused. 21st review completed with163 findings, largely existing hardcoded semantic colors and outline/desktop widths; no bulk auto-fixes. Mobile focus outlines are explicitly supplied by scoped CSS. Review is not a clean lint pass. React review preserved stable wrappers, lazy loading and derived title without effects.

final result: passed for scoped mobile administration layout; no deployment performed

## 2026-10-18 — Remaining mobile administration and reports

- Extended the existing Settings Orbit header/background to statistics, staff overview, calendar, management, devices and system settings. Standalone statistics and staff routes now share the same host palette. Reused existing real components, graphic asset and data; no new dependency. All visual changes are scoped to Cliniq phones. Chart/status colors, permissions, export/print, assignments and settings operations are unchanged.
- Statistics/staff cards reuse lavender glass tokens and 9px frosting; filters and report controls use rounded surfaces and visible focus. System settings uses two-column section tiles. Calendar toolbar wraps, month navigation fits and the real month grid remains scrollable; selected-day columns shrink within the phone. Added the missing existing statistics title hook to NotificationsTab so its daily heading follows the same card typography.
- Browser verified staff overview, calendar, management and devices at375px, settings and statistics at320px, final statistics at393px. Observed document width matched viewport. Settings section grid and four-choice statistics period row fit. At1280px the desktop statistics component remains visible and host has no added background. Viewport reset. No saves, messages, registrations or clinical mutations performed.
- TypeScript and42 focused settings, statistics style/navigation and calendar-print tests passed; whitespace check passed. 21st catalog failed to connect, so reused project components. 21st review reported111 findings (mostly existing palette literals and outline warnings), no automated broad fixes; scoped mobile focus rules remain explicit. React review retained stable components/lazy imports and did not add data effects.
- Screenshot proof: `/tmp/mobile-secondary-statistics.png`. Local only; not deployed.

final result: passed for requested mobile-only visual unification

## 2026-10-18 — One mobile dock across modules

- Reused MobileNav and the overview Orbit stylesheet for every Cliniq route, removing the route-specific design allowlist. Permission-filtered destinations, More drawer, native Back and logout are unchanged. More now shares the lavender active pill for secondary modules. Classic navigation and desktop remain unchanged.
- Live localhost checked Timeline, Statistics and Settings at393px and320px. Shared dock has28px backdrop blur; at320px all four buttons measured approximately63×52px, with no horizontal overflow of the dock. Desktop1280px hides the mobile navigation. No clinical/settings mutations. Screenshot: `/tmp/mobile-shared-menu.png`.
- TypeScript noEmit passed. All18 focused dock, navigation-style and More tests passed, including every permitted route and existing permission-revocation coverage. Broader overview suite has a pre-existing stale assertion expecting a superadmin permission bypass and old primary-list expressions; no permission logic was changed to satisfy it (combined result29/30).
- 21st catalog unavailable; reused installed primitives. 21st review:8 informational findings for existing palette literals, no automated fixes. Local only, not deployed.

final result: shared mobile dock verified

## 2026-10-18 — Mobile Timeline phase-time page

- Phone Cliniq room selection now opens a dedicated read-only phase interval page instead of the old progress-gauge popup. Reused the accepted Orbit background and global MobileNav; no duplicate dock or extra requests. Underlying MobileTimelineView remains mounted and inert, preserving window/scroll state. Desktop/classic retains RoomDetailPopup unchanged.
- Actual timestamps only: recorded intervals clipped to the selected cycle, repeated phases retained, invalid/future entries excluded, absent phases explicitly unmeasured. Completed-cycle selection freezes the endpoint; ready-room default uses the latest available completed cycle, if any. Current recorded pause cuts off phase accrual and is shown separately. Historical pause reconstruction is not added. No mutations, estimates or new clinical logic.
- Live localhost: current Traumatology cycle and recorded18October16:00–16:25 cycle; ready/paused room historical view;320px and393px screens.320px page scrollWidth/clientWidth both320 and rows284px; full names wrap. Verified back-to-list and More drawer opening/Escape without closing the page after correcting Vaul's data-state (it does not expose aria-modal).1280px retains the original desktop dialog. Saved proof `/tmp/mobile-phase-times.png`.
-55 focused model/render/navigation/timeline tests passed, TypeScript noEmit and whitespace checks passed. React review: stable separate component, shared10-second clock, no data effects, native labelled select, focus cleanup and global navigation kept accessible.21st search unavailable; existing components/style reused.21st review reports54 primarily palette-literal findings, no broad automatic fixes. Production build/deployment not performed.

final result: mobile phase-time view verified locally

## 2026-10-18 — Subtle mobile login background blur

- Added a clipped, pointer-transparent pseudo-element with inherited photograph and3px blur, exclusively below768px. Existing foreground logo, role controls and password form remain unfiltered; desktop unchanged. No new asset or dependency.
- Focused login-role/wheel tests and whitespace check pass. Added regression checks for photo-only blur and mobile scope.21st catalog unavailable; review reports25 existing palette-literal findings. Did not sign out the user's authenticated browser to inspect login. Local only.
