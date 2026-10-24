'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { PanelLeftClose, PanelLeftOpen, Search, Layers, ArrowLeft, UserRound, SlidersHorizontal, SquarePlus, Sparkles, Hourglass, CalendarRange, CircleAlert, Download, ExternalLink, Loader2, RefreshCw, RotateCcw, Home, CalendarDays, GanttChart, Stethoscope, Building2, Cuboid, ClipboardList, LayoutGrid, Ban, ShieldCheck, ChartColumn, Target, ListOrdered, Users, Bell, Archive, Send } from 'lucide-react';
import type { OperatingRoom } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useHospital } from '../contexts/HospitalContext';
import { useConfirm } from './ui/ConfirmDialog';
import { buildOperativityPlanningSeed, mergeOperativityPlanningDraft, type OperativityPlanningSeed } from '../lib/operativity-planning';
import { buildOperativityFrame } from '../lib/operativity-frame';
import { loadOperativityPlanningYear } from '../lib/operativity-planning-client';
import { OPERATIVITY_THREE_RUNTIME_URL, validateOperativityThreeRuntime } from '../lib/operativity-three-assets';
import { OPERATIVITY_NAVIGATION, isOperativityView, operativityAllowedViews, operativityFrameHeight, type OperativityView } from '../lib/operativity-navigation';
import styles from './planning/operativity-workspace.module.css';
import './planning/operativity-canvas.css';

const OriginalSchedule = dynamic(() => import('./RoomSpecialtyScheduleManager'), { ssr: false });
const LiberecCampusMap = dynamic(() => import('./planning/LiberecCampusMap'), { ssr: false, loading: () => <p role="status">Načítám mapu areálu…</p> });
const PROTOCOL = 'medrox-planning:v1';
const MAX_DRAFT_BYTES = 8_000_000;

interface Props {
  rooms: OperatingRoom[];
  roomsLoaded?: boolean;
  onOpenDashboard?: () => void;
}

export default function OperativityPlanningWorkspace({ rooms, roomsLoaded = true, onOpenDashboard }: Props) {
  const [tab, setTab] = useState<'draft' | 'schedule'>('draft');
  const { user, isAdmin, isAuthenticated, permissionsLoading, hasModuleAccess, hasSubmoduleAccess } = useAuth();
  const { activeHospitalId, loading } = useHospital();
  const allowed = roomsLoaded && isAuthenticated && !permissionsLoading && !loading && user && activeHospitalId
    && hasModuleAccess('settings') && hasSubmoduleAccess('settings.schedule');
  if (!allowed) return <p role="status">Ověřuji přístup k rozpisu…</p>;
  const tabs = <div className={styles.tabs} role="group" aria-label="Zobrazení rozpisu">
      <button type="button" aria-pressed={tab === 'draft'} onClick={() => setTab('draft')}>Rozpis operativy</button>
      <button type="button" aria-pressed={tab === 'schedule'} onClick={() => setTab('schedule')}>Společný rozpis sálů</button>
    </div>;
  return <div className={styles.workspace}>
    {tab === 'draft'
      ? <PlanningDraft key={`${activeHospitalId}:${user.id}:${isAdmin}`} rooms={rooms} onOpenDashboard={onOpenDashboard} tabs={tabs} />
      : <>{tabs}<OriginalSchedule key={activeHospitalId} rooms={rooms} /></>}
  </div>;
}

function PlanningDraft({ rooms, onOpenDashboard, tabs }: Props & { tabs: React.ReactNode }) {
  const { activeHospitalId, activeHospital } = useHospital();
  const { user, isAdmin, hasModuleAccess } = useAuth();
  const confirm = useConfirm();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<{ scopeKey: string; seed: OperativityPlanningSeed; html: string; channel: string; draft: unknown; loadedAt: string } | null>(null);
  const [error, setError] = useState('');
  const [storageStatus, setStorageStatus] = useState('');
  const [frameError, setFrameError] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<OperativityView>('home');
  const [mapMode, setMapMode] = useState<'campus' | 'rooms'>('campus');
  const campusActive = currentView === 'map' && mapMode === 'campus';
  const campusActiveRef = useRef(campusActive);
  campusActiveRef.current = campusActive;
  const mapSection = useRef<HTMLDivElement>(null);
  const [allowedViews, setAllowedViews] = useState<OperativityView[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [frameHeight, setFrameHeight] = useState(600);
  const [appearance, setAppearance] = useState<'dark' | 'light'>(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('medrox-operativity-appearance:v1') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;
  const frame = useRef<HTMLIFrameElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const draftRef = useRef<unknown>(null);
  const key = `medrox-operativity-draft:v2:${encodeURIComponent(activeHospitalId)}:${encodeURIComponent(user.id)}:${year}`;
  const ready = loaded?.scopeKey === key ? loaded : null;
  const previousView = useRef(currentView);
  useEffect(() => {
    // Wait until the selected section is visible before moving the shared page.
    if (previousView.current !== currentView) {
      (currentView === 'map' ? mapSection.current : frame.current)?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    previousView.current = currentView;
  }, [currentView]);
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, channel: ready.channel, type: 'presentation', visible: !campusActive }, '*');
  }, [ready, campusActive]);
  const actionsRef = useRef({ isAdmin, hasDashboard: hasModuleAccess('dashboard'), onOpenDashboard });
  actionsRef.current = { isAdmin, hasDashboard: hasModuleAccess('dashboard'), onOpenDashboard };
  const hospitalName = activeHospital?.hospital_name || activeHospital?.hospital_short_name || 'Zdravotnické zařízení';

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-operativity-design');
    root.setAttribute('data-operativity-design', appearance);
    try { localStorage.setItem('medrox-operativity-appearance:v1', appearance); } catch { /* Appearance is optional; clinical data is unaffected. */ }
    return () => {
      if (previous === null) root.removeAttribute('data-operativity-design');
      else root.setAttribute('data-operativity-design', previous);
    };
  }, [appearance]);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    setLoaded(null);
    setError('');
    setFrameError('');
    setSavedAt(null);
    setStorageStatus('');
    setAllowedViews([]);
    setFrameHeight(600);
    draftRef.current = null;
    const get = async (url: string, text = false) => {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        const body = text ? null : await response.json().catch(() => null);
        throw new Error(body?.error || 'Podklady pro plánování se nepodařilo načíst.');
      }
      return text ? response.text() : response.json();
    };
    void Promise.all([
      loadOperativityPlanningYear(year, controller.signal),
      loadOperativityPlanningYear(year + 1, controller.signal),
      get('/planning/operativity-source.txt', true),
      get(OPERATIVITY_THREE_RUNTIME_URL, true).then(validateOperativityThreeRuntime),
    ]).then(([first, second, source, threeRuntime]) => {
      if (disposed) return;
      const seed = buildOperativityPlanningSeed({ hospitalId: activeHospitalId, hospitalName,
        rooms: roomsRef.current, departments: first.departments, allocations: [...first.allocations, ...second.allocations], year });
      let stored: unknown = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw && raw.length <= MAX_DRAFT_BYTES) {
          const parsed = JSON.parse(raw);
          if (parsed.hospitalId === activeHospitalId && parsed.userId === user.id && parsed.year === year) {
            stored = parsed.data;
            setSavedAt(typeof parsed.savedAt === 'string' ? parsed.savedAt : null);
          }
        }
      } catch { setStorageStatus('Místní úložiště není dostupné. Návrh můžete stáhnout jako soubor.'); }
      const draft = mergeOperativityPlanningDraft(seed.data, stored);
      draftRef.current = draft;
      setLoaded({ scopeKey: key, seed, html: buildOperativityFrame(source, { threeRuntime }), channel: crypto.randomUUID(), draft,
        loadedAt: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) });
    }).catch(reason => {
      if (!disposed && reason.name !== 'AbortError') setError(reason.message || 'Rozpis se nepodařilo načíst.');
    });
    return () => { disposed = true; controller.abort(); };
  }, [activeHospitalId, hospitalName, user.id, year, reload, key]);

  useEffect(() => {
    if (!loaded || loaded.scopeKey !== key) return;
    let initialized = false;
    const timeout = window.setTimeout(() => {
      if (!initialized) setFrameError('Plánovač se nepodařilo spustit. Zkuste znovu načíst podklady.');
    }, 15_000);
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.protocol !== PROTOCOL) return;
      if (event.data.type === 'ready') {
        initialized = true;
        window.clearTimeout(timeout);
        frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, type: 'init', channel: loaded.channel,
          data: { data: loaded.draft, sites: loaded.seed.sites, years: loaded.seed.years, canEdit: isAdmin, theme: appearanceRef.current } }, '*');
        return;
      }
      if (event.data.channel !== loaded.channel) return;
      if (event.data.type === 'view' && isOperativityView(event.data.view)) {
        const allowed = operativityAllowedViews(event.data.allowedViews);
        if (allowed.includes(event.data.view)) {
          if (event.data.theme === 'dark' || event.data.theme === 'light') setAppearance(event.data.theme);
          setCurrentView(event.data.view);
          setAllowedViews(allowed);
          setCounts(Object.fromEntries(['alerts', 'requests', 'free'].map(id => [id,
            Number.isSafeInteger(event.data.counts?.[id]) && event.data.counts[id] > 0 ? Math.min(999, event.data.counts[id]) : 0])));
        }
        return;
      }
      if (event.data.type === 'resize') {
        const height = operativityFrameHeight(event.data.height);
        if (height !== null) setFrameHeight(previous => Math.abs(previous - height) > 1 ? height : previous);
        return;
      }
      if (event.data.type === 'scroll-top') {
        (campusActiveRef.current ? mapSection.current : frame.current)?.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }
      if (event.data.type === 'open-live') {
        if (actionsRef.current.hasDashboard) actionsRef.current.onOpenDashboard?.();
        return;
      }
      if (event.data.type === 'error') {
        setFrameError('Při zobrazení plánovače nastala chyba. Obnovte podklady; uložený místní návrh zůstává zachovaný.');
        return;
      }
      if (event.data.type !== 'draft' || !actionsRef.current.isAdmin) return;
      try {
        const serialized = JSON.stringify(event.data.data);
        if (!serialized || serialized.length > MAX_DRAFT_BYTES) throw new Error('Návrh je příliš velký pro místní uložení.');
        // Canonical room and specialty identities always come from the authenticated snapshot.
        const draft = mergeOperativityPlanningDraft(loaded.seed.data, event.data.data);
        draftRef.current = draft;
        const savedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify({ hospitalId: activeHospitalId, userId: user.id, year, savedAt, data: draft }));
        setSavedAt(savedAt);
        setStorageStatus('');
      } catch {
        setStorageStatus('Návrh se nepodařilo místně uložit. Před zavřením jej stáhněte jako soubor.');
      }
    };
    window.addEventListener('message', receive);
    return () => { window.clearTimeout(timeout); window.removeEventListener('message', receive); };
  }, [loaded, key, activeHospitalId, user.id, year, isAdmin]);

  useEffect(() => {
    if (!ready) return;
    let requestId = 0;
    const update = () => {
      requestId = 0;
      const element = frame.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const visibleTop = navigation.current?.closest('aside') ? 0 : Math.max(0, navigation.current?.getBoundingClientRect().bottom ?? 0);
      const firstVisible = Math.max(visibleTop, rect.top);
      const height = Math.min(window.innerHeight, rect.bottom) - firstVisible;
      if (height <= 0) return;
      const top = firstVisible - rect.top;
      element.contentWindow?.postMessage({ protocol: PROTOCOL, channel: ready.channel, type: 'viewport', top, height }, '*');
    };
    const schedule = () => { if (!requestId) requestId = window.requestAnimationFrame(update); };
    // The settings workspace scrolls in its own container, not in window.
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    if (frame.current) observer.observe(frame.current);
    if (navigation.current) observer.observe(navigation.current);
    schedule();
    return () => {
      window.cancelAnimationFrame(requestId);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [ready]);

  const navigate = (view: OperativityView) => {
    if (!ready || !allowedViews.includes(view)) return;
    frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, channel: ready.channel, type: 'navigate', view }, '*');
  };

  const reset = async () => {
    if (!await confirm({ title: 'Obnovit podklady aplikace?', description: 'Místní pracovní návrh tohoto období bude odstraněn. Společný rozpis se nezmění.', confirmLabel: 'Obnovit podklady', danger: true })) return;
    try { localStorage.removeItem(key); setReload(value => value + 1); }
    catch { setStorageStatus('Místní návrh nelze odstranit. Ověřte povolení úložiště v prohlížeči.'); }
  };
  const download = () => {
    if (!draftRef.current) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(draftRef.current, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `medrox_rozpis_operativy_${year}_navrh.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className={styles.draft} aria-label="Rozpis operativy">
    <PlanningNavigation navigationRef={navigation} currentView={currentView} allowedViews={allowedViews} onNavigate={navigate} counts={counts}
      onAction={action => { setMapMode('rooms'); if (ready) frame.current?.contentWindow?.postMessage({ protocol: PROTOCOL, channel: ready.channel, type: 'sidebar-action', action }, '*'); }} onExit={onOpenDashboard} />
    <div className={styles.toolbar}>
      {tabs}
      <label><CalendarRange size={15} aria-hidden="true" /><select aria-label="Počáteční rok plánování" value={year} onChange={event => setYear(Number(event.target.value))}>
        {Array.from({ length: 8 }, (_, index) => new Date().getFullYear() - 2 + index).map(value => <option key={value} value={value}>{value}–{value + 1}</option>)}
      </select></label>
      <button type="button" onClick={() => setReload(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />Načíst podklady</button>
      <details className={styles.more} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
        <summary>Více ···</summary><div className={styles.morePanel}>
      <button type="button" disabled={!ready} onClick={download}><Download size={15} aria-hidden="true" />Stáhnout návrh</button>
      {isAdmin && <button type="button" disabled={!ready} onClick={reset}><RotateCcw size={15} aria-hidden="true" />Zrušit místní úpravy</button>}
      {hasModuleAccess('dashboard') && onOpenDashboard && <button type="button" onClick={onOpenDashboard}><ExternalLink size={15} aria-hidden="true" />Živý přehled sálů</button>}
        </div>
      </details>
    </div>
    <div className={styles.contextLine}>
    <p className={styles.notice}><CircleAlert size={15} aria-hidden="true" /><span>Lokální návrh · personál a CA/LA jsou modelové údaje.</span></p>
    <p className={styles.status} role="status">{storageStatus || (savedAt ? `Místně uloženo ${new Date(savedAt).toLocaleTimeString('cs-CZ')}` : loaded ? `Podklady načteny v ${loaded.loadedAt}` : 'Načítám podklady…')}</p>
    {ready && <details className={styles.details}><summary>Co je propojeno a co je zatím předpoklad</summary><ul>
      <li>Úpravy se ukládají pouze v tomto prohlížeči pro aktuálního uživatele a nemocnici. Zveřejnění uvnitř návrhu nemění společný rozpis ani živý provoz.</li>
      <li>Sály, názvy oborů, barvy a půldenní přiřazení jsou načtené z vybrané nemocnice. Po načtení jde o snímek, nikoli živé řízení sálů.</li>
      {loaded.seed.warnings.map(warning => <li key={warning}>{warning}</li>)}
      <li>Původní 3D model, editor a transportní pohledy jsou zachované. Rozložení a průběhy v modelu jsou schematické simulace podle plánu, nikoli skutečný půdorys a živý klinický stav.</li>
      <li>Historie změn a pojmenované verze uvnitř plánovače platí do jeho zavření. Samotný pracovní návrh se místně ukládá; pro samostatnou zálohu použijte Stáhnout návrh.</li>
      <li>Načíst podklady zachová místní plán. Pro nový návrh z aktuálního společného rozpisu použijte Zrušit místní úpravy.</li>
    </ul></details>}
    </div>
    {error ? <div role="alert" className={styles.error}>{error}</div> : !ready ? <div className={styles.loading} role="status"><Loader2 className="animate-spin" aria-hidden="true" />Načítám rozpis operativy…</div> : <>
      {frameError && <div role="alert" className={styles.error}>{frameError}</div>}
      <div ref={mapSection} hidden={currentView !== 'map'}>
        <div className={styles.tabs} role="group" aria-label="Zobrazení 3D mapy">
          <button type="button" aria-pressed={mapMode === 'campus'} onClick={() => setMapMode('campus')}><Building2 size={16} aria-hidden="true" />Areál Liberec</button>
          <button type="button" aria-pressed={mapMode === 'rooms'} onClick={() => setMapMode('rooms')}><Cuboid size={16} aria-hidden="true" />Model sálů a editor</button>
        </div>
        {campusActive && <LiberecCampusMap appearance={appearance} />}
      </div>
      <iframe ref={frame} key={loaded.channel} title="Roční rozpis operativy – místní pracovní návrh" srcDoc={loaded.html}
        sandbox="allow-scripts allow-modals allow-downloads allow-popups" referrerPolicy="no-referrer" className={styles.frame} style={{ height: frameHeight, display: campusActive ? 'none' : undefined }} scrolling="no" />
    </>}
  </section>;
}

const NAV_ICONS = {
  home: Home, calendar: CalendarDays, timeline: GanttChart, specialty: Stethoscope, rooms: Building2,
  cube: Cuboid,
  requests: ClipboardList, capacity: LayoutGrid, restriction: Ban, hygiene: ShieldCheck, chart: ChartColumn,
  target: Target, wait: ListOrdered, staff: Users, alerts: Bell, backup: Archive, publish: Send,
};

function PlanningNavigation({ navigationRef, currentView, allowedViews, onNavigate, counts, onAction, onExit }: {
  navigationRef: React.RefObject<HTMLElement | null>;
  currentView: OperativityView;
  allowedViews: OperativityView[];
  onNavigate: (view: OperativityView) => void;
  counts: Record<string, number>;
  onAction: (action: 'cmd' | 'bulk' | 'newReq') => void;
  onExit?: () => void;
}) {
  const { isAdmin, hasModuleAccess } = useAuth();
  const { activeHospital } = useHospital();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarTarget, setSidebarTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const update = () => setSidebarTarget(desktop.matches ? document.getElementById('operativity-sidebar-navigation') : null);
    update();
    desktop.addEventListener('change', update);
    return () => desktop.removeEventListener('change', update);
  }, []);
  const groups = OPERATIVITY_NAVIGATION.map(group => ({ ...group, items: group.items.filter(item => allowedViews.includes(item.id)) })).filter(group => group.items.length);
  const activeGroup = groups.find(group => group.items.some(item => item.id === currentView)) ?? groups[0];
  if (sidebarTarget) return createPortal(<nav ref={navigationRef} className={`planner-rail ${collapsed ? 'planner-rail--collapsed' : ''}`} aria-label="Sekce rozpisu operativy">
    <div className="planner-rail__brand"><span className="planner-rail__logo">RO</span><div className="planner-rail__brand-text"><b>Rozpis operativy</b><small>{activeHospital?.hospital_name || activeHospital?.hospital_short_name}</small></div>
      <button type="button" className="planner-rail__toggle" title={collapsed ? 'Rozbalit menu' : 'Sbalit menu'} aria-label={collapsed ? 'Rozbalit menu' : 'Sbalit menu'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button></div>
    <button type="button" className="planner-rail__search" title="Hledat" aria-label="Hledat v rozpisu" onClick={() => onAction('cmd')}><Search /><span>Hledat…</span><kbd>⌘K</kbd></button>
    {isAdmin && <div className="planner-rail__quick"><button type="button" title="Hromadná úprava" onClick={() => onAction('bulk')}><Layers /><span>Hromadná úprava</span></button><button type="button" title="Nový požadavek" onClick={() => onAction('newReq')}><ClipboardList /><span>Nový požadavek</span></button></div>}
    {groups.length ? groups.map(group => <section key={group.id} aria-label={group.label}>
      <h2>{group.label}</h2>
      {group.items.map(item => {
        const Icon = ({ mine: UserRound, timeline: SlidersHorizontal, rooms: LayoutGrid, free: SquarePlus, plan: Layers, asanace: Sparkles, wait: Hourglass } as Partial<Record<OperativityView, typeof Home>>)[item.id] || NAV_ICONS[item.icon];
        return <button key={item.id} type="button" className="sidebar-project__button" title={item.label}
          aria-label={item.label} aria-current={currentView === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
          <Icon className="sidebar-project__icon" strokeWidth={1.75} aria-hidden="true" />
          <span className="sidebar-project__module-label">{item.label}</span>
          {!!counts[item.id] && <span className="planner-rail__badge" aria-label={`${counts[item.id]} upozornění`}>{counts[item.id]}</span>}
        </button>;
      })}
    </section>) : <span role="status" className="sidebar-project__module-label">Načítám rozpis…</span>}
    {onExit && hasModuleAccess('dashboard') && <button type="button" className="planner-rail__exit" title="Zpět do aplikace" onClick={onExit}><ArrowLeft /><span>Zpět do aplikace</span></button>}
  </nav>, sidebarTarget);
  return <nav ref={navigationRef} className={styles.navigation} aria-label="Sekce rozpisu operativy">
    <div className={styles.groups} role="group" aria-label="Oblasti plánování">
      {(groups.length ? groups : OPERATIVITY_NAVIGATION).map(group => <button type="button" key={group.id}
        disabled={!groups.length} aria-pressed={activeGroup?.id === group.id}
        onClick={() => { if (activeGroup?.id !== group.id) onNavigate(group.items[0].id); }}>{group.label}</button>)}
    </div>
    <div className={styles.sections}>
      {activeGroup?.items.map(item => {
        const Icon = NAV_ICONS[item.icon];
        return <button type="button" key={item.id} aria-current={currentView === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>
          <Icon size={17} aria-hidden="true" /><span>{item.label}</span>
        </button>;
      })}
    </div>
  </nav>;
}
