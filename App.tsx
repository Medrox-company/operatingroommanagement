'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { SWRConfig } from 'swr';
import Sidebar from './components/Sidebar';
import RoomNoticeComposer from './components/RoomNoticeComposer';
import MobileNav from './components/MobileNav';
import PlaceholderView from './components/PlaceholderView';

// ── Lazy-load těžkých modulů (nejsou výchozí pohled) → menší úvodní bundle,
//    rychlejší a stabilnější start. Načtou se až při přepnutí na daný modul. ──
const ModuleLoader = () => (
  <div className="w-full h-full flex items-center justify-center py-32">
    <div className="w-7 h-7 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
  </div>
);
const RoomDetail = dynamic(() => import('./components/RoomDetail'), { ssr: false, loading: ModuleLoader });
const DashboardModule = dynamic(() => import('./components/DashboardModule'), { ssr: false, loading: ModuleLoader });
const TimelineModule = dynamic(() => import('./components/TimelineModule'), { ssr: false, loading: ModuleLoader });
const StatisticsModule = dynamic(() => import('./components/StatisticsModule'), { ssr: false, loading: ModuleLoader });
const StaffOverviewModule = dynamic(() => import('./components/StaffOverviewModule'), { ssr: false, loading: ModuleLoader });
const SettingsPage = dynamic(() => import('./components/SettingsPage'), { ssr: false, loading: ModuleLoader });
const FlowMonitorModule = dynamic(() => import('./components/FlowMonitorModule'), { ssr: false, loading: ModuleLoader });
import DeviceRegistration from './components/DeviceRegistration';
import { ErrorBoundary } from './components/ErrorBoundary';
import AnimatedBackground from './components/AnimatedBackground';
import { AppToaster } from './components/ui/toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { OperatingRoom, WeeklySchedule } from './types';
import { AlertTriangle } from 'lucide-react';
import { updateOperatingRoom, fetchBackgroundSettings, BackgroundSettings, logNotificationEvent, setDatabaseHospitalId } from './lib/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HospitalProvider, useHospital } from './contexts/HospitalContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { WorkflowStatusesProvider, useWorkflowStatusesContext } from './contexts/WorkflowStatusesContext';
import LoginPage from './components/LoginPage';
import { useEmergencyAlert } from './hooks/useEmergencyAlert';
import { useOperatingRoomsData } from './hooks/useOperatingRoomsData';

// Main App Content - Operating Rooms Management System
const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  type: 'linear',
  colors: [
    { color: '#0a0a12', position: 0 },
    { color: '#1a1a2e', position: 100 },
  ],
  direction: 'to bottom',
  opacity: 100,
  imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000',
  imageOpacity: 15,
  imageBlur: 0,
};

type CompletedOperations = NonNullable<OperatingRoom['completedOperations']>;
type RoomStatusHistory = NonNullable<OperatingRoom['statusHistory']>;
type StaffAssignmentField = 'doctor_id' | 'nurse_id' | 'anesthesiologist_id';
type StaffAssignmentUpdate = Partial<Record<StaffAssignmentField, string | null>>;

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
  errorRetryCount: 2,
  keepPreviousData: true,
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isSuperAdmin, modules, user } = useAuth();
  const { activeHospitalId, loading: hospitalLoading } = useHospital();
  const { workflowStatuses } = useWorkflowStatusesContext();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [settingsResetTrigger, setSettingsResetTrigger] = useState(0);
  const [noticeComposerOpen, setNoticeComposerOpen] = useState(false);
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>(DEFAULT_BG_SETTINGS);
  const {
    rooms,
    roomsLoaded,
    setRooms,
    refreshRooms,
    ensureRoomDetails,
    markRoomLocallyUpdated,
  } = useOperatingRoomsData({
    enabled: isAuthenticated && !hospitalLoading,
    loadAllDetails: currentView === 'timeline',
  });

  useEffect(() => {
    setDatabaseHospitalId(activeHospitalId);
  }, [activeHospitalId]);

  // Global error handler - prevent white screen on unhandled errors
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('[v0] Unhandled error:', e.message);
      e.preventDefault();
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error('[v0] Unhandled rejection:', e.reason);
      e.preventDefault();
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Po prvním úspěšném načtení uloží aplikační shell a statické soubory.
  // Další otevření je rychlejší a při krátkém výpadku serveru se místo
  // systémové chybové stránky může zobrazit alespoň naposledy načtená aplikace.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.warn('[PWA] Service worker registration failed:', error);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  // Load background settings from database
  useEffect(() => {
    const loadBgSettings = async () => {
      const dbSettings = await fetchBackgroundSettings();
      if (dbSettings) {
        setBgSettings(dbSettings);
      }
    };
    loadBgSettings();
  }, [activeHospitalId]);

  // Listen for background settings changes
  useEffect(() => {
    const handleBgChange = (e: CustomEvent<BackgroundSettings>) => {
      setBgSettings(e.detail);
    };
    window.addEventListener('backgroundSettingsChanged', handleBgChange as EventListener);
    return () => window.removeEventListener('backgroundSettingsChanged', handleBgChange as EventListener);
  }, []);

  // Generate CSS gradient from settings - memoized
  // Emergency audio je směrované pouze na stanici s otevřeným příslušným sálem.
  // Globální přehledy zachovají vizuální upozornění, ale zvuk nepřehrávají.
  useEmergencyAlert(rooms, selectedRoomId);

  // Detail načte historii jen vybraného sálu; dashboard tak zůstává lehký.
  useEffect(() => {
    if (selectedRoomId) void ensureRoomDetails(selectedRoomId);
  }, [ensureRoomDetails, selectedRoomId]);

  // Prefetch nejčastěji používaných modulů na pozadí (až je prohlížeč v klidu),
  // aby přepnutí bylo okamžité bez spinneru. Lazy-loading šetří úvodní bundle,
  // tohle eliminuje prodlevu při prvním přepnutí.
  useEffect(() => {
    if (!isAuthenticated) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const connection = (navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }).connection;
    const slowConnection = connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
    if (slowConnection) return;

    const run = () => {
      void import('./components/TimelineModule');
    };
    // Timeline je nejčastější těžký modul. Začni ji načítat krátce po
    // přihlášení, aby první otevření nečekalo na stažení a parsování chunku.
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(run, { timeout: 1_500 })
      : window.setTimeout(run, 250);
    return () => {
      if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, [isAuthenticated]);

  // Memoize selectedRoom — bez useMemo se find() spouští každý render a `selectedRoom`
  // má pokaždé jinou referenci, což spou��tí re-render RoomDetailu i když data sálu jsou
  // stejná. setRooms s funkčním updaterem zachovává reference nezměněných sálů, takže
  // useMemo zde reálně sníží re-rendery RoomDetailu na minimum.
  const selectedRoom = useMemo(
    () => rooms.find(r => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  // Check if module is enabled AND the current user's role is allowed to see it.
  const isModuleEnabled = useCallback((moduleId: string) => {
    // Superadministrátor vidí vše. Administrátor už výjimku nemá — jeho
    // přístup nastavuje superadmin stejně jako u ostatních rolí.
    if (isSuperAdmin) return true;
    if (moduleId === 'dashboard') return true; // Dashboard je vždy přístupný
    const module = modules.find(m => m.id === moduleId);
    if (!module || module.is_enabled === false) return false;
    const allowed = module.allowed_roles;
    if (!allowed || allowed.length === 0) return false;
    const currentRole = user?.role;
    return !!currentRole && allowed.includes(currentRole);
  }, [isSuperAdmin, modules, user]);

  // Guard: If current view is not enabled, redirect to dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' && !isModuleEnabled(currentView)) {
      setCurrentView('dashboard');
    }
  }, [currentView, isModuleEnabled]);

  const roomsRef = useRef<OperatingRoom[]>(rooms);
  roomsRef.current = rooms;

  const updateRoomStep = useCallback((roomId: string, newStepIndex: number, stepColor?: string) => {
    markRoomLocallyUpdated(roomId);
    const now = new Date().toISOString();
    const currentRoom = roomsRef.current.find((room) => room.id === roomId);
    if (!currentRoom) return;

    const previousStepIndex = currentRoom.currentStepIndex;
    const isOperationStart = newStepIndex === 1 && previousStepIndex === 0;
    const isOperationComplete = newStepIndex === 0 && previousStepIndex > 0;
    let completedOperations = currentRoom.completedOperations || [];
    if (isOperationComplete && currentRoom.operationStartedAt) {
      completedOperations = [
        ...completedOperations,
        {
          startedAt: currentRoom.operationStartedAt,
          endedAt: now,
          statusHistory: currentRoom.statusHistory ? [...currentRoom.statusHistory] : [],
        },
      ];
    }

    // Historie cyklu se smí vyčistit až po návratu z poslední fáze do
    // „Sál připraven". Pevný index 7 byl chybný, protože každá nemocnice může
    // mít jiný počet aktivních workflow stavů a úklid může mít jinou pozici.
    const shouldResetHistory = newStepIndex === 0;
    const statusHistory: RoomStatusHistory = shouldResetHistory
      ? []
      : [
          ...(currentRoom.statusHistory || []),
          { stepIndex: newStepIndex, startedAt: now, color: stepColor || '#6B7280' },
        ];
    const operationStartedAt =
      isOperationStart
        ? now
        : shouldResetHistory
          ? null
          : currentRoom.operationStartedAt || null;

    const dbPayload: {
      current_step_index: number;
      phase_started_at: string;
      operation_started_at: string | null;
      status_history: RoomStatusHistory;
      completed_operations?: CompletedOperations;
    } = {
      current_step_index: newStepIndex,
      phase_started_at: now,
      operation_started_at: operationStartedAt,
      status_history: statusHistory,
    };
    // Běžný přechod fáze nesmí přepsat archiv dokončených výkonů. „Light"
    // načtení sálů totiž záměrně completed_operations neobsahuje a v klientovi
    // by se tak do DB mohla omylem uložit prázdná hodnota. Archiv zapisujeme
    // pouze ve chvíli, kdy právě vznikl nový dokončený cyklus.
    if (isOperationComplete && currentRoom.operationStartedAt) {
      dbPayload.completed_operations = completedOperations;
    }

    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        currentStepIndex: newStepIndex,
        phaseStartedAt: now,
        operationStartedAt,
        statusHistory,
        completedOperations,
      };
    }));

    // Zápis proběhne vždy. Případný výpadek obstará retry a následné
    // cílené načtení autoritativního stavu pouze tohoto sálu.
    void updateOperatingRoom(roomId, dbPayload);
  }, [markRoomLocallyUpdated, setRooms]);

  // ── Globální auto-ukončení úklidu (běží i bez otevřeného detailu sálu) ──
  // Pokud status „úklid" trvá > 30 min (+10s po upozornění), přepne sál na další
  // status. Logika je optimistická → na dalším ticku už sál není v úklidu.
  useEffect(() => {
    const statuses = workflowStatuses || [];
    if (statuses.length === 0) return;
    const CLEAN_MS = 30 * 60 * 1000 + 10 * 1000; // 30 min + 10 s
    const recentlyAdvanced = new Map<string, number>();

    const tick = () => {
      const now = Date.now();
      roomsRef.current.forEach((room) => {
        if (room.isPaused || room.isLocked) return;
        const idx = Math.min(Math.max(0, room.currentStepIndex || 0), statuses.length - 1);
        const step = statuses[idx];
        const name = (step?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!name.includes('uklid')) return;

        const seg = room.statusHistory && room.statusHistory.length > 0
          ? room.statusHistory[room.statusHistory.length - 1]
          : null;
        const startMs = seg && seg.stepIndex === idx
          ? new Date(seg.startedAt).getTime()
          : (room.phaseStartedAt ? new Date(room.phaseStartedAt).getTime() : NaN);
        if (isNaN(startMs)) return;

        if (now - startMs >= CLEAN_MS) {
          const last = recentlyAdvanced.get(room.id) || 0;
          if (now - last < 30000) return; // anti-duplicita
          recentlyAdvanced.set(room.id, now);
          const nextIndex = (idx + 1) % statuses.length;
          const nextColor = statuses[nextIndex]?.accent_color || statuses[nextIndex]?.color || '#6B7280';
          updateRoomStep(room.id, nextIndex, nextColor);
        }
      });
    };

    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [workflowStatuses, updateRoomStep]);

  const toggleEmergency = useCallback(async (roomId: string) => {
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) return;
    const newValue = !currentRoom.isEmergency;
    
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isEmergency: newValue } : room
    ));
    await updateOperatingRoom(roomId, { is_emergency: newValue });
  }, [markRoomLocallyUpdated, rooms, setRooms]);

  const toggleLock = useCallback(async (roomId: string) => {
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) return;
    const newValue = !currentRoom.isLocked;
    
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isLocked: newValue } : room
    ));
    await updateOperatingRoom(roomId, { is_locked: newValue });
  }, [markRoomLocallyUpdated, rooms, setRooms]);

  const handleUpdateRoomEndTime = useCallback(async (roomId: string, newTime: Date | null) => {
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, estimatedEndTime: newTime ? newTime.toISOString() : undefined }
        : room
    ));
    await updateOperatingRoom(roomId, {
      estimated_end_time: newTime ? newTime.toISOString() : null,
    });
  }, [markRoomLocallyUpdated, setRooms]);

  const handleEnhancedHygieneToggle = useCallback(async (roomId: string, enabled: boolean) => {
    markRoomLocallyUpdated(roomId);
    const targetRoom = rooms.find(r => r.id === roomId);
    // Při zapnutí ulož čas aktivace; při vypnutí čas PONECHÁME, aby bod na ose zůstal.
    const hygieneAt = enabled ? new Date().toISOString() : undefined;
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, isEnhancedHygiene: enabled, ...(enabled ? { enhancedHygieneAt: hygieneAt } : {}) }
        : room
    ));
    const saved = await updateOperatingRoom(roomId, {
      is_enhanced_hygiene: enabled,
      ...(enabled ? { enhanced_hygiene_at: hygieneAt } : {}),
    });
    // Auditní záznam vytvoříme jen po potvrzeném zápisu primárního stavu.
    if (saved && enabled) {
      void logNotificationEvent({
        roomId,
        roomName: targetRoom?.name || roomId,
        notificationType: 'infectious_patient',
        customReason: 'Zvýšený hygienický režim — infekční pacient',
      });
    }
  }, [markRoomLocallyUpdated, rooms, setRooms]);

  const handleUpdateWeeklySchedule = useCallback(async (roomId: string, schedule: WeeklySchedule) => {
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, weeklySchedule: schedule }
        : room
    ));
    await updateOperatingRoom(roomId, {
      weekly_schedule: schedule,
    });
  }, [markRoomLocallyUpdated, setRooms]);

  const handleStaffChange = useCallback(async (roomId: string, role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => {
    markRoomLocallyUpdated(roomId);
    const isUnassigning = !staffId && !staffName;

    // Update local state
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      
      const updatedStaff = { ...room.staff };
      if (role === 'doctor') {
        updatedStaff.doctor = isUnassigning ? { name: null, role: 'DOCTOR' } : { id: staffId, name: staffName, role: 'DOCTOR' };
      } else if (role === 'nurse') {
        updatedStaff.nurse = isUnassigning ? { name: null, role: 'NURSE' } : { id: staffId, name: staffName, role: 'NURSE' };
      } else if (role === 'anesthesiologist') {
        updatedStaff.anesthesiologist = isUnassigning ? { name: null, role: 'ANESTHESIOLOGIST' } : { id: staffId, name: staffName, role: 'ANESTHESIOLOGIST' };
      }
      
      return { ...room, staff: updatedStaff };
    }));

    const dbField: StaffAssignmentField = role === 'doctor' ? 'doctor_id' : role === 'nurse' ? 'nurse_id' : 'anesthesiologist_id';
    const staffUpdate: StaffAssignmentUpdate = { [dbField]: isUnassigning ? null : staffId };
    await updateOperatingRoom(roomId, staffUpdate);
  }, [markRoomLocallyUpdated, setRooms]);

  const handlePatientStatusChange = useCallback((roomId: string, calledAt: string | null, arrivedAt: string | null) => {
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, patientCalledAt: calledAt, patientArrivedAt: arrivedAt }
        : room
    ));
    void updateOperatingRoom(roomId, {
      patient_called_at: calledAt,
      patient_arrived_at: arrivedAt,
    });
  }, [markRoomLocallyUpdated, setRooms]);

  const handlePauseChange = useCallback((roomId: string, paused: boolean, pausedAt: string | null) => {
    markRoomLocallyUpdated(roomId);
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, isPaused: paused, pausedAt }
        : room
    ));
    void updateOperatingRoom(roomId, {
      is_paused: paused,
      paused_at: pausedAt,
    });
  }, [markRoomLocallyUpdated, setRooms]);

  // Stabilní handlery pro Sidebar / MobileNav — bez useCallbacku se recreatují
  // každý render a bustují memo na navigačních komponentách.
  const handleNavigate = useCallback((view: string) => {
    setCurrentView(prevView => {
      if (prevView === 'settings' && view === 'settings') {
        setSettingsResetTrigger(t => t + 1);
        return prevView;
      }
      return view;
    });
    setSelectedRoomId(null);
  }, []);

  const handleCloseRoomDetail = useCallback(() => setSelectedRoomId(null), []);

  /* Hardwarové tlačítko Zpět (Android): zavře otevřený detail sálu, jinak
     nechá událost projít (mobile/main.tsx pak jde zpět v historii, případně
     aplikaci ukončí). */
  useEffect(() => {
    const onNativeBack = (e: Event) => {
      if (noticeComposerOpen) { e.preventDefault(); setNoticeComposerOpen(false); return; }
      if (selectedRoomId) { e.preventDefault(); setSelectedRoomId(null); return; }
      if (currentView !== 'dashboard') { e.preventDefault(); setCurrentView('dashboard'); }
    };
    window.addEventListener('nativeBackButton', onNativeBack);
    return () => window.removeEventListener('nativeBackButton', onNativeBack);
  }, [selectedRoomId, currentView, noticeComposerOpen]);
  // Stabilní RoomDetail callbacky — používají selectedRoomId přímo (zdroj pravdy), takže
  // se NErecreatují při každém update sálů. Bez useCallbacku se po realtime updatu
  // recreate inline arrow funkce → memo na RoomDetailu by selhal a 1745řádková komponenta
  // by se zbytečně re-renderovala.
  const handleStepChange = useCallback((index: number, stepColor?: string) => {
    if (selectedRoomId) updateRoomStep(selectedRoomId, index, stepColor);
  }, [selectedRoomId, updateRoomStep]);

  const handleEndTimeChange = useCallback((newTime: Date | null) => {
    if (selectedRoomId) handleUpdateRoomEndTime(selectedRoomId, newTime);
  }, [selectedRoomId, handleUpdateRoomEndTime]);

  const handleEnhancedHygieneToggleSelected = useCallback((enabled: boolean) => {
    if (selectedRoomId) handleEnhancedHygieneToggle(selectedRoomId, enabled);
  }, [selectedRoomId, handleEnhancedHygieneToggle]);

  const handleStaffChangeSelected = useCallback((role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => {
    if (selectedRoomId) handleStaffChange(selectedRoomId, role, staffId, staffName);
  }, [selectedRoomId, handleStaffChange]);

  const handlePatientStatusChangeSelected = useCallback((calledAt: string | null, arrivedAt: string | null) => {
    if (selectedRoomId) handlePatientStatusChange(selectedRoomId, calledAt, arrivedAt);
  }, [selectedRoomId, handlePatientStatusChange]);

  const handlePauseChangeSelected = useCallback((paused: boolean, pausedAt: string | null) => {
    if (selectedRoomId) handlePauseChange(selectedRoomId, paused, pausedAt);
  }, [selectedRoomId, handlePauseChange]);

  // Admin → odeslat informační zprávu na jeden či více sálů (popup v detailu sálu)
  const handleSendRoomNotice = useCallback(async (roomIds: string[], message: string) => {
    if (roomIds.length === 0) return;
    const at = new Date().toISOString();
    const sender = user?.name || user?.email || 'Administrátor';
    const idSet = new Set(roomIds);
    setRooms(prev => prev.map(r => idSet.has(r.id) ? { ...r, noticeMessage: message, noticeAt: at, noticeSender: sender } : r));
    await Promise.all(roomIds.map(id => updateOperatingRoom(id, { notice_message: message, notice_at: at, notice_sender: sender })));
  }, [user]);

  // Zavření zprávy na sále (z detailu) — smaže zprávu z DB i lokálně
  const handleClearRoomNotice = useCallback(async (roomId: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, noticeMessage: null, noticeAt: null, noticeSender: null } : r));
    await updateOperatingRoom(roomId, { notice_message: null, notice_at: null, notice_sender: null });
  }, []);

  // Show login if not authenticated - must be after all hooks
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen w-full font-sans overflow-hidden bg-black text-white">
      {!hospitalLoading && activeHospitalId && <DeviceRegistration key={activeHospitalId} />}
      {/* Dynamic Background Layer - Controlled by BackgroundManager settings */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Background Image Layer - lazy loaded for performance */}
        {bgSettings.imageUrl && (
          <img
            src={bgSettings.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover grayscale scale-105 transition-opacity duration-500"
            style={{
              opacity: bgSettings.imageOpacity / 100,
              filter: bgSettings.imageBlur > 0 ? `blur(${bgSettings.imageBlur}px)` : undefined,
            }}
          />
        )}
        
        {/* Color/Gradient Overlay + animovaný efekt */}
        <AnimatedBackground settings={bgSettings} />

      </div>

<Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            onSendMessage={() => setNoticeComposerOpen(true)}
          />
      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Admin → odeslání informační zprávy na konkrétní sál */}
      {noticeComposerOpen && isAdmin && (
        <RoomNoticeComposer
          rooms={rooms}
          onClose={() => setNoticeComposerOpen(false)}
          onSend={handleSendRoomNotice}
        />
      )}

      <div className="flex-1 flex flex-col relative z-20 w-full overflow-hidden">
        {/* Horní lišta se nezobrazuje – všechny moduly mají plnou stránku jako dashboard */}
        {/* <TopBar /> */}

        <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">
          {/* Granulární error-boundary kolem obsahu modulů — pád jednoho modulu
              neshodí celou aplikaci (sidebar/navigace zůstanou). Klíč podle
              currentView zajistí reset po přepnutí na jiný modul. */}
          <ErrorBoundary
            key={currentView}
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-white/70 font-medium">Tento modul se nepodařilo zobrazit.</p>
                <p className="text-sm text-white/40">Zkuste přepnout na jiný modul nebo obnovit stránku.</p>
              </div>
            }
          >

            {/* Dashboard — room detail */}
            {currentView === 'dashboard' && selectedRoom && (
              <div className="absolute inset-0 z-50">
                <RoomDetail
                  room={selectedRoom}
                  allRooms={rooms}
                  onClose={handleCloseRoomDetail}
                  onStepChange={handleStepChange}
                  onEndTimeChange={handleEndTimeChange}
                  onEnhancedHygieneToggle={handleEnhancedHygieneToggleSelected}
                  onPauseChange={handlePauseChangeSelected}
                  onStaffChange={handleStaffChangeSelected}
                  onPatientStatusChange={handlePatientStatusChangeSelected}
                  onClearNotice={() => handleClearRoomNotice(selectedRoom.id)}
                />
              </div>
            )}

            {/* Dashboard — room grid */}
            {currentView === 'dashboard' && !selectedRoom && (
              <DashboardModule
                rooms={rooms}
                roomsLoaded={roomsLoaded}
                onSelectRoom={setSelectedRoomId}
                onEmergency={toggleEmergency}
                onLock={toggleLock}
              />
            )}

            {/* Tok pacienta — živý monitorovací modul */}
            {currentView === 'flow' && (
              <div className="w-full h-full overflow-hidden p-0 md:pl-28 md:pr-6 md:pt-2 md:pb-6">
                <FlowMonitorModule rooms={rooms} />
              </div>
            )}

            {/* Timeline */}
            {/* Pozn.: BEZ `pb-mobile-nav` — třída je definovaná mimo Tailwind vrstvy,
                takže přebíjela i `md:pb-6` a modul na desktopu nedosahoval na spodní
                okraj obrazovky. Mobilní odsazení řeší `pb-20` na <main> + interní
                spodní padding v MobileTimelineView. */}
            {currentView === 'timeline' && (
              <div className="w-full h-full overflow-hidden p-0 md:pl-28 md:pr-6 md:pt-2 md:pb-6">
                <TimelineModule rooms={rooms} onRefresh={refreshRooms} />
              </div>
            )}

            {/* Statistics */}
            {currentView === 'statistics' && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10 mobile-safe-top">
                  <StatisticsModule rooms={rooms} />
                </div>
              </div>
            )}

  {/* Staff */}
  {currentView === 'staff' && (
  <div className="w-full h-full overflow-y-auto hide-scrollbar">
  <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10 mobile-safe-top">
  <StaffOverviewModule rooms={rooms} />
  </div>
  </div>
  )}

  {/* Alerts */}
            {currentView === 'alerts' && (
              <div className="w-full h-full">
                <PlaceholderView
                  title="Upozornění"
                  description="Centrální upozornění a notifikace z operačních sálů budou zobrazeny zde."
                />
              </div>
            )}

            {/* Settings */}
            {currentView === 'settings' && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <SettingsPage 
                  rooms={rooms} 
                  onRoomsChange={setRooms} 
                  onScheduleUpdate={handleUpdateWeeklySchedule}
                  resetTrigger={settingsResetTrigger} 
                />
              </div>
            )}

          </ErrorBoundary>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
};

// Wrap with AuthProvider and WorkflowStatusesProvider
const App: React.FC = () => {
  return (
  <ErrorBoundary>
  <SWRConfig value={SWR_OPTIONS}>
  <AuthProvider>
  <HospitalProvider>
  <RealtimeProvider>
  <WorkflowStatusesProvider>
  <ConfirmProvider>
  <AppToaster />
  <AppContent />
  </ConfirmProvider>
  </WorkflowStatusesProvider>
  </RealtimeProvider>
  </HospitalProvider>
  </AuthProvider>
  </SWRConfig>
  </ErrorBoundary>
  );
  };

export default App;
