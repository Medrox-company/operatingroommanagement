import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import TimelineModule from './components/TimelineModule';
import StatisticsModule from './components/StatisticsModule';
import StaffManager from './components/StaffManager';
import SettingsPage from './components/SettingsPage';
import AdminModule from './components/AdminModule';
import PlaceholderView from './components/PlaceholderView';
import AnimatedCounter from './components/AnimatedCounter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_ROOMS } from './constants';
import { OperatingRoom, WeeklySchedule } from './types';
import { Activity, LayoutGrid, Shield } from 'lucide-react';
import { fetchOperatingRooms, updateOperatingRoom, subscribeToOperatingRooms, transformSingleRoom, fetchBackgroundSettings, BackgroundSettings } from './lib/db';
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
  const { isAuthenticated, isAdmin, modules } = useAuth();
  const [rooms, setRooms] = useState<OperatingRoom[]>(MOCK_ROOMS);
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

  // Emergency alert sound - plays when any room's emergency status is activated
  useEmergencyAlert(rooms, selectedRoomId);

  // Load rooms from API on mount - separated for stability
  useEffect(() => {
    let isMounted = true;
    const loadRooms = async () => {
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/rooms', { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!isMounted) return; // Ignore if unmounted
        if (!response.ok) throw new Error('Failed to fetch rooms');
        
        const dbRooms = await response.json();
        if (dbRooms && Array.isArray(dbRooms) && dbRooms.length > 0) {
          setRooms(dbRooms);
          setIsDbConnected(true);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("[v0] Failed to load rooms from API:", error);
        // Keep using MOCK_ROOMS on error - don't crash
      }
    };
    loadRooms();
    return () => { isMounted = false; };
  }, []);

  // Track recent local updates to ignore duplicate realtime events (prevents flickering)
  const recentLocalUpdates = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 2000; // Ignore realtime updates within 2s of local update (increased for stability)
  
  // Cleanup old entries from recentLocalUpdates to prevent memory growth
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      recentLocalUpdates.current.forEach((timestamp, roomId) => {
        if (now - timestamp > DEBOUNCE_MS * 2) {
          recentLocalUpdates.current.delete(roomId);
        }
      });
    }, 10000); // Cleanup every 10 seconds
    
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

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  // Check if module is enabled (admins always have access, users check module settings)
  const isModuleEnabled = useCallback((moduleId: string) => {
    if (isAdmin) return true; // Admin má vždy přístup ke všem modulům
    if (moduleId === 'dashboard') return true; // Dashboard je vždy přístupný
    const module = modules.find(m => m.id === moduleId);
    return module?.is_enabled !== false;
  }, [isAdmin, modules]);

  // Guard: If current view is not enabled, redirect to dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' && !isModuleEnabled(currentView)) {
      setCurrentView('dashboard');
    }
  }, [currentView, isModuleEnabled]);

  const updateRoomStep = useCallback(async (roomId: string, newStepIndex: number, stepColor?: string) => {
    // Mark this room as recently updated locally to prevent realtime flicker
    recentLocalUpdates.current.set(roomId, Date.now());
    
    const now = new Date().toISOString();
    
    // Check if operation is being completed (transitioning to "Sál připraven po úklidu" - index 7, or back to index 0)
    // Operation is complete when: resetting to 0, or moving to index 7 (after cleanup)
    const isOperationComplete = (currentIndex: number, nextIndex: number) => {
      // Reset to ready state
      if (nextIndex === 0) return true;
      // Moving to "Sál připraven po úklidu" (index 7) after úklid sálu (index 6)
      if (nextIndex === 7 && currentIndex >= 1) return true;
      return false;
    };
    
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      
      // Save completed operation when transitioning to ready state
      let updatedCompletedOps = room.completedOperations || [];
      // Check if operation is being completed (going to index 0 or 7)
      // We need operationStartedAt to track when operation began
      const shouldSaveOperation = isOperationComplete(room.currentStepIndex, newStepIndex) && 
        room.operationStartedAt;
        
      if (shouldSaveOperation) {
        console.log("[v0] Saving completed operation for room:", room.name, {
          from: room.currentStepIndex,
          to: newStepIndex,
          startedAt: room.operationStartedAt,
          historyLength: room.statusHistory?.length || 0
        });
        updatedCompletedOps = [
          ...updatedCompletedOps,
          {
            startedAt: room.operationStartedAt!,
            endedAt: now,
            statusHistory: room.statusHistory ? [...room.statusHistory] : []
          }
        ];
      }
      
      // Build status history - reset when going back to ready state
      const shouldResetHistory = newStepIndex === 0 || newStepIndex === 7;
      const currentHistory = room.statusHistory || [];
      const newHistory = shouldResetHistory
        ? [] 
        : [...currentHistory, { stepIndex: newStepIndex, startedAt: now, color: stepColor || '#6B7280' }];
      
      // Set operationStartedAt when transitioning to first active status (index 1)
      const operationStartedAt = newStepIndex === 1 && (room.currentStepIndex === 0 || room.currentStepIndex === 7)
        ? now 
        : (shouldResetHistory ? null : room.operationStartedAt);
      
      return { 
        ...room, 
        currentStepIndex: newStepIndex, 
        phaseStartedAt: now,
        operationStartedAt,
        statusHistory: newHistory,
        completedOperations: updatedCompletedOps
      };
    }));
    
    if (isDbConnected) {
      const room = rooms.find(r => r.id === roomId);
      
      // Save completed operation
      let updatedCompletedOps = room?.completedOperations || [];
      const shouldSaveOperation = isOperationComplete(room?.currentStepIndex || 0, newStepIndex) && 
        room?.operationStartedAt;
        
      if (shouldSaveOperation) {
        console.log("[v0] DB: Saving completed operation for room:", room?.name, {
          from: room?.currentStepIndex,
          to: newStepIndex
        });
        updatedCompletedOps = [
          ...updatedCompletedOps,
          {
            startedAt: room!.operationStartedAt!,
            endedAt: now,
            statusHistory: room?.statusHistory ? [...room.statusHistory] : []
          }
        ];
      }
      
      const shouldResetHistory = newStepIndex === 0 || newStepIndex === 7;
      const currentHistory = room?.statusHistory || [];
      const newHistory = shouldResetHistory
        ? [] 
        : [...currentHistory, { stepIndex: newStepIndex, startedAt: now, color: stepColor || '#6B7280' }];
      const operationStartedAt = newStepIndex === 1 && (room?.currentStepIndex === 0 || room?.currentStepIndex === 7)
        ? now 
        : (shouldResetHistory ? null : room?.operationStartedAt);
      
      await updateOperatingRoom(roomId, { 
        current_step_index: newStepIndex, 
        phase_started_at: now,
        operation_started_at: operationStartedAt,
        status_history: newHistory,
        completed_operations: updatedCompletedOps
      });
    }
  }, [isDbConnected, rooms]);

  const toggleEmergency = useCallback(async (roomId: string) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    const room = rooms.find(r => r.id === roomId);
    const newValue = room ? !room.isEmergency : false;
    
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, isEmergency: newValue } : r
    ));
    
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { is_emergency: newValue });
    }
  }, [isDbConnected, rooms]);

  const toggleLock = useCallback(async (roomId: string) => {
    recentLocalUpdates.current.set(roomId, Date.now());
    const room = rooms.find(r => r.id === roomId);
    const newValue = room ? !room.isLocked : false;
    
    setRooms(prev => prev.map(r =>
      r.id === roomId ? { ...r, isLocked: newValue } : r
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
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, isEnhancedHygiene: enabled }
        : room
    ));
    if (isDbConnected) {
      await updateOperatingRoom(roomId, { 
        is_enhanced_hygiene: enabled 
      });
    }
  }, [isDbConnected]);

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

<Sidebar currentView={currentView} onNavigate={(view) => {
            if (currentView === 'settings' && view === 'settings') {
              // Reset settings module when clicking settings again
              setSettingsResetTrigger(prev => prev + 1);
            } else {
              setCurrentView(view);
              setSelectedRoomId(null);
            }
          }} />
      <MobileNav currentView={currentView} onNavigate={(view) => {
        if (currentView === 'settings' && view === 'settings') {
          // Reset settings module when clicking settings again
          setSettingsResetTrigger(prev => prev + 1);
        } else {
          setCurrentView(view);
          setSelectedRoomId(null);
        }
      }} />

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
                  onClose={() => setSelectedRoomId(null)}
                  onStepChange={(index, stepColor) => updateRoomStep(selectedRoom.id, index, stepColor)}
                  onEndTimeChange={(newTime) => handleUpdateRoomEndTime(selectedRoom.id, newTime)}
                  onEnhancedHygieneToggle={(enabled) => handleEnhancedHygieneToggle(selectedRoom.id, enabled)}
                  onStaffChange={(role, staffId, staffName) => handleStaffChange(selectedRoom.id, role, staffId, staffName)}
                  onPatientStatusChange={(calledAt, arrivedAt) => handlePatientStatusChange(selectedRoom.id, calledAt, arrivedAt)}
                />
              </div>
            )}

            {/* Dashboard — room grid */}
            {currentView === 'dashboard' && !selectedRoom && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10">
                <div className="max-w-[2400px] mx-auto w-full">
                  <header className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12 lg:mb-16 flex-shrink-0">
                    <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
                      <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
                        <Shield className="w-4 h-4 text-[#00D8C1]" />
                        <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
                      </div>
                      <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-black tracking-tighter uppercase leading-none truncate">
                        OPERATING <span className="text-white/20">ROOM</span>
                      </h1>
                    </div>
                    <div className="flex gap-2 md:gap-4 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                      {(() => {
                        // Check if room is in "ready" status (step index 0 or 7)
                        const isRoomReady = (room: OperatingRoom) => {
                          return room.currentStepIndex === 0 || room.currentStepIndex === 7;
                        };
                        
                        const readyRooms = rooms.filter(isRoomReady);
                        const activeRooms = rooms.filter(r => !isRoomReady(r));
                        
                        return [
                          { label: 'AKTIVNI',    value: activeRooms.length, icon: Activity,   color: 'text-red-500'    },
                          { label: 'PRIPRAVENO', value: readyRooms.length,  icon: LayoutGrid, color: 'text-[#00D8C1]'  },
                        ];
                      })().map((stat) => (
                        <div key={stat.label} className="flex flex-col items-center justify-center px-4 sm:px-6 md:px-10 py-3 md:py-4 rounded-3xl hover:bg-white/5 transition-all min-w-[110px] sm:min-w-[130px] md:min-w-[150px] z-10">
                          <div className="flex items-center gap-2.5 mb-2 opacity-40">
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                          </div>
                          <AnimatedCounter to={stat.value} />
                        </div>
                      ))}
                    </div>
                  </header>
                  <div className="pb-20 px-0 sm:px-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-4 sm:gap-x-6 md:gap-x-8 gap-y-6 sm:gap-y-8 md:gap-y-12">
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
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {currentView === 'timeline' && (
              <div className="w-full h-full overflow-hidden">
                <TimelineModule rooms={rooms} />
              </div>
            )}

            {/* Statistics */}
            {currentView === 'statistics' && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10">
                  <StatisticsModule rooms={rooms} />
                </div>
              </div>
            )}

            {/* Staff */}
            {currentView === 'staff' && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10">
                  <StaffManager />
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

            {/* Admin - only for admins */}
            {currentView === 'admin' && isAdmin && (
              <div className="w-full h-full overflow-y-auto hide-scrollbar">
                <AdminModule onClose={() => setCurrentView('dashboard')} />
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
          <AppContent />
        </WorkflowStatusesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
