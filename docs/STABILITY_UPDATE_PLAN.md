# Detailní plán stabilizace a optimalizace aplikace

> **Cíl:** Dovést OperatingRoom Manager do stavu **stabilní, vysoce responzivní a plně optimalizované produkční aplikace** se zaměřením na paměť, výkon, korektnost funkcí a opravu bugů.
>
> **Scope:** 65 zdrojových souborů (`App.tsx`, `components/`, `contexts/`, `hooks/`, `lib/`, `app/api/`).

---

## 0. Executive summary

Audit kódu odhalil 4 kategorie problémů:

| Kategorie | Závažnost | Dopad |
|---|---|---|
| **Paměťové úniky** (audio, realtime, timery, listenery) | Vysoká | Zpomalení po hodinách provozu, crash na Safari |
| **Re-render storms** (chybějící memoizace, ref-equality) | Střední | Pomalá UI při větším počtu sálů |
| **256+ console.log v produkci** | Nízká | Bundle size + drobný runtime overhead |
| **Bugy v perzistenci/stavu** (částečně opraveno) | Vysoká | Ztráta uživatelských dat |

Plán je rozdělen do **5 fází (A–E)** + rollout. Každá fáze je uzavřená samostatně, takže lze postupovat inkrementálně bez přerušení produkce.

---

## 1. Fáze A — Optimalizace paměti

### A.1 Realtime Supabase subscriptions (kritické)

**Současný stav (`hooks/useRealtimeSubscription.ts`):**
- `useRealtimeMultiple` má v dependency array `tables` array a `handleUpdate` callback. Pokud volající předá literál `['rooms', 'staff']`, vznikne nová reference při každém renderu → **subscription se znovu vytváří a ruší při každém renderu**.
- Channel name `${table}_changes` koliduje, pokud více komponent subscribuje stejnou tabulku → Supabase Realtime má hard limit 100 connections per client.

**Fix:**
```ts
// Stabilizace tables přes serializovaný klíč
const tablesKey = useMemo(() => [...tables].sort().join(','), [tables]);
useEffect(() => { /* setup */ }, [tablesKey, handleUpdate, schema]);

// Unikátní channel jméno per komponenta
const instanceId = useId();
const channelName = `${table}_${instanceId}`;
```

**Action items:**
- [ ] `hooks/useRealtimeSubscription.ts` — stabilizovat `tables` dependency přes `tablesKey`.
- [ ] Přidat unikátní channel ID přes `useId()`.
- [ ] Audit všech volání `useRealtimeSubscription` / `useRealtimeMultiple` — ověřit, že callback je memoizovaný (`useCallback` v parent).
- [ ] V `lib/supabase.ts` ověřit singleton client (zamezit duplicitnímu `createClient` v HMR).

### A.2 AudioContext leak v `useEmergencyAlert`

**Současný stav (`hooks/useEmergencyAlert.ts`):**
- `sharedAudioContext` na module-level → vytváří se lazy, ale **nikdy se nezavírá**.
- Safari/iOS limit 6 AudioContext → 7. otevření tabu = `AudioContext is not allowed to start`.
- Module-level `document.addEventListener('touchstart', ...)` — v dev HMR se akumuluje při každém reloadu modulu.
- `oscillator.start/stop` 10× per emergency → uzly garbage-collectované, ale `gainNode` má dlouhý ramp chain (250ms+) což drží reference.

**Fix:**
- Přesunout AudioContext lifecycle do hooku, volat `audioContext.close()` v cleanup.
- Použít `useRef` pro per-instance kontext, nebo lazy-singleton s reference counting.
- Module-level event listenery zabalit do `if (!window.__emergencyUnlockInstalled)` guardu.
- Po `oscillator.onended` volat `oscillator.disconnect()` + `gainNode.disconnect()`.

**Action items:**
- [ ] Refactor `useEmergencyAlert` — AudioContext do `useRef` + cleanup `.close()` na unmount.
- [ ] Přidat install-once guard na unlock listenery (`window.__emergencyUnlockInstalled`).
- [ ] Uklidit `oscillator.disconnect()` + `gainNode.disconnect()` po `onended`.

### A.3 Timery v `RoomDetail.tsx` (25 výskytů)

**Současný stav:**
- 7 inline `setTimeout` bez cleanup (řádky 327, 402, 432, 737, 798, 1049, 1120) — pokud uživatel zavře detail sálu během timeru, `setState` fires na unmounted komponentě.
- Mix lokálních timerů a `useRef` (`updateTimeoutRef`, `endTimeTimeoutRef`, `patientCallTimerRef`) → nekonzistence.

**Fix:**
```ts
const timersRef = useRef<Set<number>>(new Set());

const safeSetTimeout = useCallback((fn: () => void, ms: number) => {
  const id = window.setTimeout(() => {
    fn();
    timersRef.current.delete(id);
  }, ms);
  timersRef.current.add(id);
  return id;
}, []);

useEffect(() => () => {
  timersRef.current.forEach((id) => clearTimeout(id));
  timersRef.current.clear();
}, []);
```

**Action items:**
- [ ] Konvertovat všech 7 inline `setTimeout` v `RoomDetail.tsx` na `safeSetTimeout`.
- [ ] Sjednotit existující 3 timer refs do jednoho `Set<number>`.
- [ ] Přidat `AbortController` pro async fetch operace v `RoomDetail`.

### A.4 Velký state v `App.tsx`

**Současný stav:**
- `rooms` (15-30 OperatingRoom objektů) bydlí v root `AppContent`.
- 20 `useState/useEffect/useMemo/useCallback` v jedné komponentě.
- Každá změna jednoho sálu re-renderuje celý strom (Sidebar, TopBar, Dashboard, Statistics, Timeline...).

**Fix (incremental):**
- **Krok 1 (low risk):** Memoizovat children Dashboard přes `React.memo` se selektivními props.
- **Krok 2 (medium risk):** Vyextrahovat `useRoomsState()` hook → odděluje načítání + realtime + emergency alert do jednoho hooku.
- **Krok 3 (vysoký dopad, vyšší riziko):** Přesunout `rooms` do dedikovaného `RoomsContext` se selektory přes `useSyncExternalStore`. **Provádět pouze pokud profiler ukáže >50ms render times.**

**Action items:**
- [ ] React DevTools Profiler — záznam 30s aktivního používání → identifikovat top 3 nejpomalejší komponenty.
- [ ] `RoomCard` zabalit `React.memo` s custom comparator (`prev.room.id === next.room.id && prev.room.status === next.room.status && prev.room.isEmergency === next.room.isEmergency`).
- [ ] Extrahovat `useRoomsState` z App.tsx (řádky 100-140).
- [ ] (Volitelné, pokud profiler ukáže) Migrace na `zustand` pro rooms store.

### A.5 Module-level listenery a singletony

**Auditovat:**
- `hooks/useEmergencyAlert.ts` — module-level `document.addEventListener` (viz A.2).
- `lib/supabase.ts` — `createClient` má být singleton.
- `lib/realtime-notifications.ts` — ověřit, že subscriber pattern má proper teardown.

**Action items:**
- [ ] Grep `addEventListener` na top-level (mimo useEffect) — zabalit do `__installed` guardu.
- [ ] Ověřit, že `lib/supabase.ts` exportuje jeden client (ne factory).

---

## 2. Fáze B — Code review a refaktoring

### B.1 Modularizace `App.tsx`

**Problémy:**
- Smíchaná logika: auth flow, rooms loading, background settings, view routing, emergency alerts.
- 20 hook calls v jediné komponentě.

**Cílová struktura:**

| Nová součást | Soubor | Odpovědnost |
|---|---|---|
| `<AppShell>` | `components/AppShell.tsx` | Layout, sidebar, topbar |
| `<RouteRenderer>` | `components/RouteRenderer.tsx` | Switch nad `currentView` |
| `useRoomsState()` | `hooks/useRoomsState.ts` | Načítání rooms + realtime + emergency |
| `useBackgroundSettings()` | `hooks/useBackgroundSettings.ts` | BG settings load + listener |
| `<GlobalErrorHandler>` | `components/GlobalErrorHandler.tsx` | window.error + rejection |

**Action items:**
- [ ] Extrahovat `useRoomsState` z App.tsx (řádky 100-140).
- [ ] Extrahovat `useBackgroundSettings` (řádky 64-95).
- [ ] App.tsx zredukovat pod 200 řádků.

### B.2 Eliminace `: any` typů v `lib/db.ts`

**Současný stav:** 23 výskytů `any` v `lib/db.ts`.

**Fix:**
- Definovat `WorkflowStatusUpdate`, `RoomUpdate`, `StaffUpdate` interfaces.
- Použít Supabase generated types (přes `supabase_generate_typescript_types`).

**Action items:**
- [ ] Spustit `supabase_generate_typescript_types` → `types/supabase.ts`.
- [ ] Postupně nahradit `any` v `lib/db.ts` za generated typy.

### B.3 Console.log čištění (256+ výskytů ve 25 souborech)

**Strategie:**
- Zachovat `console.error` pro telemetrii.
- Smazat verbose `console.log("[v0] ...")` v produkčních cestách.
- V `next.config.ts` aktivovat `compiler: { removeConsole: { exclude: ['error'] } }`.

**Action items:**
- [ ] Update `next.config.ts` o `removeConsole` v production.
- [ ] Smazat verbose logy z `lib/db.ts`, `WorkflowStatusesContext.tsx`, `RoomDetail.tsx`.
- [ ] Zachovat `console.error` všude.

### B.4 Anti-patterns v komponentách

**Identifikované:**
- Inline event handlery ve velkých listech (`onClick={() => doSomething(item.id)}`) — způsobuje re-render každé položky.
- Nadměrné inline `style={{}}` (zejména v `BackgroundManager`, `RoomDetail`) — přesunout do CSS proměnných nebo Tailwind tokenů.
- Komponenty bez `React.memo` v listech.

**Action items:**
- [ ] `RoomCard` zabalit `React.memo` s custom comparator (jen důležité props).
- [ ] `MobileNav` items projít přes `React.memo` (už má, ověřit `slice(0,5)` deps).
- [ ] Inline handlery v `OperatingRoomsManager` (drag actions) přesunout do `useCallback`.

### B.5 Dependency audit

**Současné velké dependencies:**

| Package | Velikost | Použití |
|---|---|---|
| `framer-motion` ^11.11.17 | ~130 kB | LoginPage + drobnosti |
| `recharts` ^2.13.0 | ~95 kB | StatisticsModule |
| `@dnd-kit/{core,sortable,utilities}` | ~60 kB total | Jen OperatingRoomsManager |
| `lucide-react` ^0.454.0 | tree-shaken | OK |

**Action items:**
- [ ] Code-split `OperatingRoomsManager` přes `React.lazy()` (DnD lib se loadne jen při admin → Operating Rooms).
- [ ] Code-split `StatisticsModule` (recharts loadne jen při Statistiky).
- [ ] LoginPage přejít na `framer-motion/mini` (`m.div` místo `motion.div`) — ušetří ~80 kB při prvním paint.

---

## 3. Fáze C — Verifikace funkcí (manuální QA)

### C.1 Core features test plan

| Feature | Test scénář | Status |
|---|---|---|
| Auth login | Login `admin@nemocnice.cz / admin123` → 200 OK + cookie | ⏳ |
| Auth logout | Logout button → cookie cleared, redirect na login | ⏳ |
| Room status change | Klik "Operace" → DB update + realtime do druhého tabu | ⏳ |
| Operating rooms reorder | Drag sál #2 nad #1 → reload → pořadí zachováno | ✅ |
| Patient called timer | Klik "Pacient zavolán" → timer běží, po 5s text mizí | ⏳ |
| Emergency alert | Aktivace `isEmergency` → audio na všech klientech | ⏳ |
| Background settings | Změna v Nastavení → ihned aplikováno přes CustomEvent | ⏳ |
| Workflow statuses | Změna barvy v Settings → propagace do RoomCard | ⏳ |
| Mobile responsive | iPhone SE (375px) → titul nepřesahuje | ✅ |
| Mobile bottom nav | Logout button volá `/api/auth/logout` | ✅ |

**Action items:**
- [ ] Vytvořit `scripts/qa-checklist.md` s každým scénářem (kroky + očekávaný výsledek).
- [ ] Smoke test po každé fázi.

### C.2 Event handling

**Klíčové event flows k ověření:**
1. `backgroundSettingsChanged` CustomEvent → poslouchá `App.tsx`, fires z `BackgroundManager`.
2. Supabase Realtime `postgres_changes` → fires z `useRealtimeSubscription`, poslouchá rooms loader.
3. Emergency alert → derivován z `rooms` state, fires audio.
4. DnD reorder → `onDragEnd` v `OperatingRoomsManager` → POST `/api/operating-rooms/reorder`.

**Test:**
- [ ] 2 taby, v jednom změnit pořadí → druhý dostane realtime update.
- [ ] V druhém tabu nastavit emergency → ověřit zvuk v prvním (po user interaction).
- [ ] Profiler během rapidního klikání na status změny → žádné memory leaky.

### C.3 Edge cases

- [ ] **Bezdrátové výpadky:** odpojit síť → změny se buffer-ují? Aplikace nezamrzne?
- [ ] **Konkurence:** dva uživatelé mění stejný sál současně → poslední vyhrává (Supabase last-write-wins).
- [ ] **DB outage:** Supabase down → fallback na `MOCK_ROOMS`, banner "Offline mode".
- [ ] **Auth expirace:** session expiruje uprostřed práce → graceful redirect, ne crash.
- [ ] **HMR development:** opakovaný hot reload → AudioContext se neakumuluje.

---

## 4. Fáze D — Známé bugy

### D.1 Vyřešené v poslední iteraci

- ✅ Operating rooms reorder se neukládal (`sort_order` chybělo v `transformRoom` + `.order('name')` místo `.order('sort_order')`).
- ✅ Mobile titul "OPERATINGROOM" přesahoval obrazovku (`clamp(1.875rem, 7vw, 4.5rem)` + `break-words`).
- ✅ Mobile nav Admin nahrazen Logout tlačítkem.
- ✅ TypeScript build error LucideIcon typ.
- ✅ Cyan → žlutý accent napříč 13 soubory (Trauma identita zachována).

### D.2 Otevřené bugy k opravě

| # | Bug | Lokace | Priorita |
|---|---|---|---|
| 1 | Workflow statuses realtime disabled — změny v Settings se neprojeví v jiném tabu | `WorkflowStatusesContext.tsx` (komentář na řádku ~200) | Střední |
| 2 | AudioContext leak po hodinách provozu | `useEmergencyAlert.ts` | **Vysoká** |
| 3 | RoomDetail timery bez cleanup → setState on unmounted | `RoomDetail.tsx` 7 míst | Střední |
| 4 | useRealtimeMultiple — re-subscribe storm při literál `tables` array | `useRealtimeSubscription.ts` | **Vysoká** |
| 5 | `MOCK_ROOMS` flash před DB načtením | `App.tsx:38` | Nízká (kosmetika) |
| 6 | Console.log spam v produkci | 25 souborů | Nízká |
| 7 | `: any` v lib/db.ts | `lib/db.ts` 23 míst | Nízká |

### D.3 Postup oprav

**Pro každý bug:**
1. Reproduce step-by-step v `scripts/qa-checklist.md`.
2. Napsat fix.
3. Ověřit reprodukcí, že je opraveno.
4. Smoke test celé aplikace (žádná regrese).
5. Commit s prefixem `fix:`.

---

## 5. Fáze E — Měření výkonu a responzivity

### E.1 Baseline metrics (před optimalizací)

**Snímek aktuálního stavu (Chrome DevTools):**
- [ ] **Bundle size** — `next build` → poznamenat velikost main chunk + per-route.
- [ ] **First Contentful Paint** — Lighthouse > 1.5s?
- [ ] **Time to Interactive** — Lighthouse < 3s?
- [ ] **Memory baseline po 1 hod** — Performance Monitor heap size.

### E.2 Po-optimalizační target metrics

| Metrika | Před (TBD) | Cíl |
|---|---|---|
| Bundle main page | TBD | < 250 kB gzip |
| FCP | TBD | < 1.2 s |
| TTI | TBD | < 2.5 s |
| Heap po 1 hod (idle) | TBD | < 80 MB |
| Re-render `RoomCard` při status change | celý list | jen 1 karta |

### E.3 Měřící nástroje

- **React DevTools Profiler** — záznam 30s aktivního používání → flame graph.
- **Chrome Performance + Memory** — heap snapshot before/after operations.
- **Lighthouse CI** — automated v PR (volitelné, pokud zavedeno CI).
- **PostHog** (volitelné, MCP available) — production performance monitoring.

### E.4 Responzivita test matrix

| Zařízení | Šířka | Test |
|---|---|---|
| iPhone SE | 375 px | Login + Dashboard + Mobile Nav |
| iPad | 768 px | Sidebar collapse breakpoint |
| Desktop FHD | 1920 px | Full layout |
| Desktop 4K | 2560 px | Žádné nadměrné prázdné prostory |

---

## 6. Rollout strategie

### 6.1 Pořadí implementace

```
Týden 1: Fáze A.1 + A.2 + D bug #2, #4 (vysoké priority memory leaks)
Týden 2: Fáze A.3 + A.4 + A.5 (zbytek paměťové optimalizace)
Týden 3: Fáze B.1 + B.2 (refaktor App.tsx + types)
Týden 4: Fáze B.3 + B.4 + B.5 (cleanup + memo + deps)
Týden 5: Fáze C — full QA pass + edge cases
Týden 6: Fáze E — měření + finalizace + deploy
```

### 6.2 Risk mitigation

- **Každá sub-fáze samostatný PR** → snadný revert pokud regrese.
- **Žádné mass-renames** — jen incremental targeted changes.
- **Smoke test po každé sub-úloze** — auth + dashboard + room change + reorder.
- **Backup DB** před jakýmkoli SQL migrace (přes Supabase Dashboard).
- **Feature flag** pro velké změny (např. `useNewRoomsStore`) — možnost rollback bez deploy.

### 6.3 Definition of Done

Aplikace je "stabilní + plně optimalizovaná" když:
- [ ] Profiler nezachytí memory leak po 1 hodině provozu.
- [ ] Lighthouse Performance > 90.
- [ ] Žádné `console.warn`/`console.error` v produkčním buildu (kromě signal eventů).
- [ ] Všech 10 core features v sekci C.1 prochází.
- [ ] Žádný `any` v `lib/db.ts`.
- [ ] Bundle main < 250 kB gzipped.
- [ ] Realtime updates v multi-tab scénáři fungují bez flickering.
- [ ] AudioContext zavírán správně (Safari 6+ taby otevřené, žádný error).

---

## 7. Out of scope (záměrně vyloučeno)

- **Migrace na app router server components** — současný client-heavy přístup OK pro real-time UX.
- **Switch UI library na shadcn/ui** — uživatel preferuje vlastní glassmorph design (LoginPage style).
- **Změna BackgroundManager API** — DB-konfigurovatelné, uživatelská preference.
- **Lokalizace mimo CZ** — bez požadavku.
- **Test framework (Jest/Vitest)** — manuální QA pokrývá use case; přidání frameworku je samostatný projekt.

---

## 8. Přílohy (TBD během implementace)

- **A.** [QA checklist template](../scripts/qa-checklist.md)
- **B.** [Bundle analysis report](./bundle-analysis.md)
- **C.** [Memory profile snapshots](./memory-snapshots/)

---

**Autor:** v0
**Verze:** 1.0
**Datum:** 4/25/2026
