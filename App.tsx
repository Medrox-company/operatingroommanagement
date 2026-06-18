'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import PlaceholderView from './components/PlaceholderView';

// ── Lazy-load těžkých modulů (nejsou výchozí pohled) → menší úvodní bundle,
//    rychlejší a stabilnější start. Načtou se až při přepnutí na daný modul. ──
const ModuleLoader = () => (
  <div className="w-full h-full flex items-center justify-center py-32">
    <div className="w-7 h-7 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
  </div>
);
const TimelineModule = dynamic(() => import('./components/TimelineModule'), { ssr: false, loading: ModuleLoader });
const StatisticsModule = dynamic(() => import('./components/StatisticsModule'), { ssr: false, loading: ModuleLoader });
const StaffManager = dynamic(() => import('./components/StaffManager'), { ssr: false, loading: ModuleLoader });
const StaffOverviewModule = dynamic(() => import('./components/StaffOverviewModule'), { ssr: false, loading: ModuleLoader });
const SettingsPage = dynamic(() => import('./components/SettingsPage'), { ssr: false, loading: ModuleLoader });
import AnimatedCounter from './components/AnimatedCounter';
import LiveClock from './components/LiveClock';
import DeviceRegistration from './components/DeviceRegistration';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_ROOMS } from './constants';
import { OperatingRoom, WeeklySchedule } from './types';
import { Activity, LayoutGrid, Shield, AlertTriangle, Lock } from 'lucide-react';
import { fetchOperatingRooms, updateOperatingRoom, subscribeToOperatingRooms, transformSingleRoom, fetchBackgroundSettings, BackgroundSettings, logNotificationEvent } from './lib/db';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkflowStatusesProvider } from './contexts/WorkflowStatusesContext';
import LoginPage from './components/LoginPage';
import { useEmergencyAlert } from './hooks/useEmergencyAlert';

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

const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, modules, user } = useAuth();
  // Začínáme prázdní — mock data se NEzobrazují (zabrání probliknutí špatných
  // názvů/statusů). Mock zůstává jen jako záloha při selhání načtení (offline/demo).
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [roomsLoaded, setRoomsLoaded] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [settingsResetTrigger, setSettingsResetTrigger] = useState(0);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [bgSettings, setBgSettings] = useState<BackgroundSettings>(DEFAULT_BG_SETTINGS);

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

  // Load background settings from database
  useEffect(() => {
    const loadBgSettings = async () => {
      const dbSettings = await fetchBackgroundSettings();
      if (dbSettings) {
        setBgSettings(dbSettings);
      }
    };
    loadBgSettings();
  }, []);

  // Listen for background settings changes
  useEffect(() => {
    const handleBgChange = (e: CustomEvent<BackgroundSettings>) => {
      setBgSettings(e.detail);
    };
    window.addEventListener('backgroundSettingsChanged', handleBgChange as EventListener);
    return () => window.removeEventListener('backgroundSettingsChanged', handleBgChange as EventListener);
  }, []);

  // Generate CSS gradient from settings - memoized
  const backgroundStyle = useMemo(() => {
    const colors = bgSettings.colors || [];
    if (bgSettings.type === 'solid' || colors.length <= 1) {
      return colors[0]?.color || '#0a0a12';
    }
    const sortedColors = [...colors].sort((a, b) => a.position - b.position);
    const colorStops = sortedColors.map(c => `${c.color} ${c.position}%`).join(', ');
    if (bgSettings.type === 'radial') {
      return `radial-gradient(circle at center, ${colorStops})`;
    }
    return `linear-gradient(${bgSettings.direction || 'to bottom'}, ${colorStops})`;
  }, [bgSettings]);

  // Emergency alert sound — siréna při aktivaci stavu nouze (isEmergency=true).
  useEmergencyAlert(rooms);

  // Track recent local updates to ignore the realtime UPDATE event echo from
  // our own DB write (Supabase broadcasts UPDATE events back to the originating
  // client). Without this, we'd briefly flicker as the realtime event arrives
  // and re-applies the same value we already set optimistically.
  const recentLocalUpdates = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 2000;

  // Ref to track current view without causing re-renders
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Load rooms after login (one-time fetch). Supabase Realtime handles all subsequent updates.
  // /api/rooms nově vyžaduje session, proto načítáme až po přihlášení.
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const loadRooms = async () => {
      try {
        // Přímý dotaz na Supabase (jako u ručního refreshe) — vynechá serverový
        // mezikrok /api/rooms i ověření session, takže dashboard naběhne rychleji.
        // Timeout 9 s: kdyby dotaz „visel", appka nezůstane navždy v načítání.
        const dbRooms = await Promise.race([
          fetchOperatingRooms(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000)),
        ]);
        if (!isMounted) return;
        if (!dbRooms || !Array.isArray(dbRooms) || dbRooms.length === 0) {
          // DB prázdná/nedostupná → záloha mock dat (offline/demo)
          setRooms(MOCK_ROOMS);
          setRoomsLoaded(true);
          return;
        }

        setRooms(dbRooms);
        setIsDbConnected(true);
        setRoomsLoaded(true);
      } catch (error) {
        if (!isMounted) return;
        console.error("[App] Failed to load rooms:", error);
        // Síťová chyba → záloha mock dat, ať appka není prázdná
        setRooms(MOCK_ROOMS);
        setRoomsLoaded(true);
      }
    };
    
    // Initial load only - Supabase Realtime handles updates
    loadRooms();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Ruční obnovení dat (Timeline modul) — Realtime řeší většinu, tohle je „force refresh".
  const refreshRooms = useCallback(async () => {
    try {
      const dbRooms = await fetchOperatingRooms();
      if (dbRooms && dbRooms.length > 0) {
        setRooms(dbRooms);
        setIsDbConnected(true);
      }
    } catch (error) {
      console.error('[App] Manual refresh failed:', error);
    }
  }, []);
  
  // Cleanup old entries from recentLocalUpdates to prevent memory growth.
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      recentLocalUpdates.current.forEach((timestamp, roomId) => {
        if (now - timestamp > DEBOUNCE_MS * 3) {
          recentLocalUpdates.current.delete(roomId);
        }
      });
    }, 10000);
    return () => clearInterval(cleanupInterval);
  }, []);

  // Subscribe to real-time updates with granular room updates
  useEffect(() => {
    const unsubscribe = subscribeToOperatingRooms(
      // Full refresh callback (for INSERT/DELETE)
      async () => {
        const dbRooms = await fetchOperatingRooms();
        if (dbRooms && dbRooms.length > 0) {
          setRooms(dbRooms);
        }
      },
      // Granular update callback (for UPDATE - instant sync)
      (roomId, dbChanges) => {
        // Skip if we recently made a local update to this room (prevents double-render flickering)
        const lastLocalUpdate = recentLocalUpdates.current.get(roomId);
        if (lastLocalUpdate && Date.now() - lastLocalUpdate < DEBOUNCE_MS) {
          return; // Ignore this realtime update - we already have the data from optimistic update
        }
        
        const appChanges = transformSingleRoom(dbChanges);
        setRooms(prev => prev.map(room =>
          room.id === roomId ? { ...room, ...appChanges } : room
        ));
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
    if (isAdmin) return true; // Admin má vždy přístup ke všem modulům
    if (moduleId === 'dashboard') return true; // Dashboard je vždy přístupný
    const module = modules.find(m => m.id === moduleId);
    if (!module || module.is_enabled === false) return false;
    // allowed_roles NULL / [] => admin-only
    const allowed = module.allowed_roles;
    if (!allowed || allowed.length === 0) return false;
    const currentRole = user?.role;
    return !!currentRole && allowed.includes(currentRole);
  }, [isAdmin, modules, user]);

  // Guard: If current view is not enabled, redirect to dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' && !isModuleEnabled(currentView)) {
      setCurrentView('dashboard');
    }
  }, [currentView, isModuleEnabled]);

  const updateRoomStep = useCallback((roomId: string, newStepIndex: number, stepColor?: string) => {
    // Mark this room as recently updated locally to prevent realtime flicker
    recentLocalUpdates.current.set(roomId, Date.now());

    const now = new Date().toISOString();

    // Check if operation is being completed (transitioning to "Sál připraven po úklidu" - index 7, or back to index 0)
    const isOperationComplete = (currentIndex: number, nextIndex: number) => {
      if (nextIndex === 0) return true;
      if (nextIndex === 7 && currentIndex >= 1) return true;
      return false;
    };

    // Compute the new room state using a functional updater. We do the heavy lifting
    // inside the reducer so we always have access to the latest `room` data (no stale
    // closure on `rooms`), and we capture the DB payload via a ref-style local var
    // so we can persist it AFTER React has applied the optimistic update.
    let dbPayload: {
      current_step_index: number;
      phase_started_at: string;
      operation_started_at: string | null;
      status_history: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }>;
      completed_operations: Array<{ startedAt: string; endedAt: string; statusHistory: any[] }>;
    } | null = null;

    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;

      // Save completed operation when transitioning to ready state
      let updatedCompletedOps = room.completedOperations || [];
      const shouldSaveOperation =
        isOperationComplete(room.currentStepIndex, newStepIndex) && !!room.operationStartedAt;

      if (shouldSaveOperation) {
        updatedCompletedOps = [
          ...updatedCompletedOps,
          {
            startedAt: room.operationStartedAt!,
            endedAt: now,
            statusHistory: room.statusHistory ? [...room.statusHistory] : [],
          },
        ];
      }

      // Build status history - reset when going back to ready state
      const shouldResetHistory = newStepIndex === 0 || newStepIndex === 7;
      const currentHistory = room.statusHistory || [];
      const newHistory = shouldResetHistory
        ? []
        : [...currentHistory, { stepIndex: newStepIndex, startedAt: now, color: stepColor || '#6B7280' }];

      const operationStartedAt =
        newStepIndex === 1 && (room.currentStepIndex === 0 || room.currentStepIndex === 7)
          ? now
          : shouldResetHistory
            ? null
            : room.operationStartedAt;

      // Capture payload for DB write (computed from authoritative `prev` snapshot)
      dbPayload = {
        current_step_index: newStepIndex,
        phase_started_at: now,
        operation_started_at: operationStartedAt,
        status_history: newHistory,
        completed_operations: updatedCompletedOps,
      };

      return {
        ...room,
        currentStepIndex: newStepIndex,
        phaseStartedAt: now,
        operationStartedAt,
        statusHistory: newHistory,
        completedOperations: updatedCompletedOps,
      };
    }));

    // Fire-and-forget DB persist. UI has already updated optimistically �� we don't
    // block on the network roundtrip. Errors are logged but never surfaced.
    if (isDbConnected && dbPayload) {
      updateOperatingRoom(roomId, dbPayload).catch((err) =>
        console.error('[v0] updateRoomStep DB persist failed', err)
      );
    }
  }, [isDbConnected]);

  const toggleEmergency = useCallback(async (roomId: string) => {
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) return;
    const newValue = !currentRoom.isEmergency;
    
    recentLocalUpdates.current.set(roomId, Date.now());
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isEmergency: newValue } : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { is_emergency: newValue });
    }
  }, [isDbConnected, rooms]);

  const toggleLock = useCallback(async (roomId: string) => {
    const currentRoom = rooms.find(r => r.id === roomId);
    if (!currentRoom) return;
    const newValue = !currentRoom.isLocked;
    
    recentLocalUpdates.current.set(roomId, Date.now());
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isLocked: newValue } : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { is_locked: newValue });
    }
  }, [isDbConnected, rooms]);

  const handleUpdateRoomEndTime = useCallback(async (roomId: string, newTime: Date | null) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, estimatedEndTime: newTime ? newTime.toISOString() : undefined }
        : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { 
        estimated_end_time: newTime ? newTime.toISOString() : null 
      });
    }
  }, [isDbConnected]);

  const handleEnhancedHygieneToggle = useCallback(async (roomId: string, enabled: boolean) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    const targetRoom = rooms.find(r => r.id === roomId);
    // Při zapnutí ulož čas aktivace; při vypnutí čas PONECHÁME, aby bod na ose zůstal.
    const hygieneAt = enabled ? new Date().toISOString() : undefined;
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, isEnhancedHygiene: enabled, ...(enabled ? { enhancedHygieneAt: hygieneAt } : {}) }
        : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, {
        is_enhanced_hygiene: enabled,
        ...(enabled ? { enhanced_hygiene_at: hygieneAt } : {}),
      });
      // Při VYHLÁŠENÍ zvýšeného hygienického režimu (infekční pacient) zapiš
      // trvalý záznam do notifications_log — na kterém sále a v jakém čase.
      if (enabled) {
        void logNotificationEvent({
          roomId,
          roomName: targetRoom?.name || roomId,
          notificationType: 'infectious_patient',
          customReason: 'Zvýšený hygienický režim — infekční pacient',
        });
      }
    }
  }, [isDbConnected, rooms]);

  const handleUpdateWeeklySchedule = useCallback(async (roomId: string, schedule: Record<string, any>) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, weeklySchedule: schedule as WeeklySchedule }
        : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { 
        weekly_schedule: schedule
      });
    }
  }, [isDbConnected]);

  const handleStaffChange = useCallback(async (roomId: string, role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    const isUnassigning = !staffId && !staffName;

    // Update local state
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      
      const updatedStaff = { ...room.staff };
      if (role === 'doctor') {
        updatedStaff.doctor = isUnassigning ? { name: null, role: 'DOCTOR' } : { name: staffName, role: 'DOCTOR' };
      } else if (role === 'nurse') {
        updatedStaff.nurse = isUnassigning ? { name: null, role: 'NURSE' } : { name: staffName, role: 'NURSE' };
      } else if (role === 'anesthesiologist') {
        updatedStaff.anesthesiologist = isUnassigning ? { name: null, role: 'ANESTHESIOLOGIST' } : { name: staffName, role: 'ANESTHESIOLOGIST' };
      }
      
      return { ...room, staff: updatedStaff };
    }));

    // Update database - null to unassign
    if (isDbConnected) {
      const dbField = role === 'doctor' ? 'doctor_id' : role === 'nurse' ? 'nurse_id' : 'anesthesiologist_id';
      await updateOperatingRoom(roomId, { [dbField]: isUnassigning ? null : staffId } as any);
    }
  }, [isDbConnected]);

  const handlePatientStatusChange = useCallback((roomId: string, calledAt: string | null, arrivedAt: string | null) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, patientCalledAt: calledAt, patientArrivedAt: arrivedAt }
        : room
    ));
  }, []);

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

  // Show login if not authenticated - must be after all hooks
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ErrorBoundary>
    <div className="flex h-screen w-full font-sans overflow-hidden bg-black text-white">
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
        
        {/* Color/Gradient Overlay */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{
            background: backgroundStyle,
            opacity: (bgSettings.opacity ?? 100) / 100,
          }}
        />
        
      </div>

<Sidebar 
            currentView={currentView} 
            onNavigate={handleNavigate}
          />
      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      <div className="flex-1 flex flex-col relative z-20 w-full overflow-hidden">
        {/* Horní lišta se nezobrazuje – všechny moduly mají plnou stránku jako dashboard */}
        {/* <TopBar /> */}

        <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">

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
                  onStaffChange={handleStaffChangeSelected}
                  onPatientStatusChange={handlePatientStatusChangeSelected}
                />
              </div>
            )}

            {/* Dashboard — room grid */}
            {currentView === 'dashboard' && !selectedRoom && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
                <div className="max-w-[2400px] mx-auto w-full">
                  <header className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-3 md:gap-6 mb-4 md:mb-10 lg:mb-12 flex-shrink-0">
                    <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
                      <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-1 sm:mb-2 opacity-60">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-[#FBBF24]" />
                        <p className="text-[9px] sm:text-[10px] font-bold text-[#FBBF24] tracking-[0.3em] sm:tracking-[0.4em] uppercase">APLIKACE PRO ŘÍZENÍ OPERAČNÍCH SÁLŮ</p>
                      </div>
                      <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none truncate flex items-center gap-3 sm:gap-4 justify-center lg:justify-start">
                        <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
                          <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#34D399' }} />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ background: '#34D399', boxShadow: '0 0 10px #34D39988' }} />
                        </span>
                        <span>OPERAČNÍ <span className="text-white/20">SÁLY</span></span>
                      </h1>
                    </div>
                    <div className="flex items-center gap-2 md:gap-5">
                      <LiveClock />
                      <div className="flex items-stretch gap-1 md:gap-2 p-1.5 md:p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-3xl md:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        {/* Jemný horní světelný akcent panelu */}
                        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        {(() => {
                          // Check if room is in "ready" status (step index 0 or 7)
                          const isRoomReady = (room: OperatingRoom) => {
                            return room.currentStepIndex === 0 || room.currentStepIndex === 7;
                          };

                          const emergencyRooms = rooms.filter(r => r.isEmergency);
                          const lockedRooms = rooms.filter(r => r.isLocked && !r.isEmergency);
                          const readyRooms = rooms.filter(r => isRoomReady(r) && !r.isEmergency && !r.isLocked);
                          const activeRooms = rooms.filter(r => !isRoomReady(r) && !r.isEmergency && !r.isLocked);

                          // NOUZE a UZAMČENO se ukazují jen když jsou relevantní — panel zůstává čistý
                          return [
                            { label: 'AKTIVNÍ',    value: activeRooms.length,    icon: Activity,      color: 'text-[#22D3EE]',  valueColor: '#22D3EE', show: true,  pulse: false },
                            { label: 'PŘIPRAVENO', value: readyRooms.length,     icon: LayoutGrid,    color: 'text-[#34D399]',  valueColor: '#34D399', show: true,  pulse: false },
                            { label: 'NOUZE',      value: emergencyRooms.length, icon: AlertTriangle, color: 'text-[#FF453A]',  valueColor: '#FF453A', show: emergencyRooms.length > 0, pulse: true },
                            { label: 'UZAMČENO',   value: lockedRooms.length,    icon: Lock,          color: 'text-[#FBBF24]',  valueColor: '#FBBF24', show: lockedRooms.length > 0,    pulse: false },
                          ].filter(s => s.show);
                        })().map((stat, idx) => (
                          <React.Fragment key={stat.label}>
                            {idx > 0 && (
                              <div className="w-px self-stretch my-2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                            )}
                            <div className={`flex flex-col items-center justify-center px-3 sm:px-6 md:px-9 py-2 sm:py-3 md:py-4 rounded-2xl md:rounded-3xl hover:bg-white/5 transition-all min-w-[90px] sm:min-w-[120px] md:min-w-[140px] z-10 ${stat.pulse ? 'animate-pulse' : ''}`}>
                              <div className="flex items-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                                <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${stat.color}`} />
                                <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white/45">{stat.label}</p>
                              </div>
                              <div style={{ color: stat.valueColor }}>
                                <AnimatedCounter to={stat.value} />
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </header>
                  <div className="pb-20 px-0 sm:px-2">
                    {!roomsLoaded ? (
                      <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <div className="w-7 h-7 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                        <p className="text-sm text-white/40">Načítám operační sály…</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:gap-y-8">
                        {rooms.map((room) => (
                          <RoomCard
                            key={room.id}
                            room={room}
                            onClick={() => setSelectedRoomId(room.id)}
                            onEmergency={() => toggleEmergency(room.id)}
                            onLock={() => toggleLock(room.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {currentView === 'timeline' && (
              <div className="w-full h-full overflow-hidden">
                <TimelineModule rooms={rooms} onRefresh={refreshRooms} />
              </div>
            )}

            {/* Statistics */}
            {currentView === 'statistics' && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
                  <StatisticsModule rooms={rooms} />
                </div>
              </div>
            )}

  {/* Staff */}
  {currentView === 'staff' && (
  <div className="w-full h-full overflow-y-auto hide-scrollbar">
  <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
  <StaffOverviewModule />
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
  <AuthProvider>
  <WorkflowStatusesProvider>
  <DeviceRegistration />
  <AppContent />
  </WorkflowStatusesProvider>
  </AuthProvider>
  </ErrorBoundary>
  );
  };

export default App;
