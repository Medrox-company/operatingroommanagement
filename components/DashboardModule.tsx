'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Cuboid, HelpCircle, LayoutGrid, Shield } from 'lucide-react';
import type { OperatingRoom } from '../types';
import LiveClock from './LiveClock';
import RoomCard from './RoomCard';
import MobileRoomOverview from './mobile/MobileRoomOverview';
import { MobileHeader } from './mobile/MobileShell';
import { useCurrentRoomSpecialties } from '../hooks/useCurrentRoomSpecialties';
import { useTimelineCompletedOperations } from '../hooks/useTimelineCompletedOperations';
import { mergeCompletedOperations } from '../lib/completed-operations';
import ModulePageHeading from './ModulePageHeading';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth } from '../contexts/AuthContext';
import { preloadSpatialProject } from '../hooks/useSpatialProject';
import SpatialLoadingBar from './spatial/SpatialLoadingBar';
import { useDashboardGridLayout } from '../hooks/useDashboardGridLayout';
import './tutorial/tutorial.css';

const loadSpatialDashboard = () => import('./spatial/SpatialDashboardView');

// Nápověda se načítá až při spuštění — nese s sebou celý detail sálu.
const TutorialOverlay = dynamic(() => import('./tutorial/TutorialOverlay'), { ssr: false });

const SpatialDashboardView = dynamic(loadSpatialDashboard, {
  ssr: false,
  loading: () => <div className="mobile-spatial-module-loading">
    <div className="md:hidden"><MobileHeader kicker="Operační sály" title="Operační blok" /></div>
    <SpatialLoadingBar label="Načítám 3D engine" initial={6} ceiling={34} />
  </div>,
});

type DashboardView = 'cards' | 'spatial';

interface DashboardModuleProps {
  rooms: OperatingRoom[];
  roomsLoaded: boolean;
  onSelectRoom: (roomId: string) => void;
  onEmergency: (roomId: string) => void;
  onLock: (roomId: string) => void;
  onNavigate?: (view: string) => void;
}

const DashboardModule: React.FC<DashboardModuleProps> = ({
  rooms: sourceRooms,
  roomsLoaded,
  onSelectRoom,
  onEmergency,
  onLock,
  onNavigate,
}) => {
  const { activeHospitalId } = useHospital();
  const { hasSubmoduleAccess } = useAuth();
  const canViewSpatial = hasSubmoduleAccess('dashboard.spatial');
  const [dashboardView, setDashboardView] = useState<DashboardView>('cards');
  const [spatialMounted, setSpatialMounted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'spatial' | 'plan'>('spatial');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const { currentByRoom } = useCurrentRoomSpecialties();

  const warmSpatialView = React.useCallback(() => {
    if (!canViewSpatial || !activeHospitalId) return;
    void loadSpatialDashboard();
    void preloadSpatialProject(activeHospitalId).catch(() => undefined);
  }, [activeHospitalId, canViewSpatial]);

  useEffect(() => {
    if (!activeHospitalId) return;
    const saved = localStorage.getItem(`or-dashboard-view:${activeHospitalId}`);
    const savedView = saved === 'spatial' && canViewSpatial ? 'spatial' : 'cards';
    setDashboardView(savedView);
    if (savedView === 'spatial') {
      setSpatialMounted(true);
      warmSpatialView();
    }
  }, [activeHospitalId, canViewSpatial, warmSpatialView]);

  useEffect(() => {
    if (!canViewSpatial || !activeHospitalId || !roomsLoaded || dashboardView === 'spatial') return;
    const requestIdle = window.requestIdleCallback?.bind(window);
    const cancelIdle = window.cancelIdleCallback?.bind(window);
    if (requestIdle) {
      const idleId = requestIdle(warmSpatialView, { timeout: 1_500 });
      return () => cancelIdle?.(idleId);
    }
    const timer = window.setTimeout(warmSpatialView, 350);
    return () => window.clearTimeout(timer);
  }, [activeHospitalId, canViewSpatial, dashboardView, roomsLoaded, warmSpatialView]);

  const changeDashboardView = (view: DashboardView) => {
    if (view === 'spatial' && !canViewSpatial) return;
    if (view === 'spatial') {
      setSpatialMounted(true);
      warmSpatialView();
    }
    setDashboardView(view);
    if (activeHospitalId) localStorage.setItem(`or-dashboard-view:${activeHospitalId}`, view);
  };

  // Číslo uprostřed karty = počet dokončených cyklů provozního dne. Samotný
  // archiv u sálu na to nestačí: zapisuje ho klient jen při vlastním přechodu
  // do „Sál připraven", takže výkony ukončené z jiného zařízení nebo databázovým
  // triggerem v něm chybí. Log událostí je úplný a chodí realtime, proto ho sem
  // přimícháváme stejně jako v Timeline (SWR cache je pro oba moduly společná).
  const { completedOperationsByRoom } = useTimelineCompletedOperations();
  const rooms = useMemo(() => sourceRooms.map((room) => {
    const eventOperations = completedOperationsByRoom.get(room.id) ?? [];
    if (eventOperations.length === 0) return room;
    return {
      ...room,
      completedOperations: mergeCompletedOperations(room.completedOperations ?? [], eventOperations),
    };
  }), [completedOperationsByRoom, sourceRooms]);
  const viewToggle = canViewSpatial ? (
    <div className="dashboard-view-switch" role="group" aria-label="Zobrazení dashboardu">
      {([
        ['cards', 'Karty', LayoutGrid],
        ['spatial', '3D dispozice', Cuboid],
      ] as const).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onPointerEnter={value === 'spatial' ? warmSpatialView : undefined}
          onFocus={value === 'spatial' ? warmSpatialView : undefined}
          onPointerDown={value === 'spatial' ? warmSpatialView : undefined}
          onClick={() => changeDashboardView(value)}
          aria-label={label}
          title={label}
          aria-pressed={dashboardView === value}
          className="dashboard-view-option"
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  ) : null;

  const spatialMode = canViewSpatial && dashboardView === 'spatial';
  const gridRef = useDashboardGridLayout(rooms.length, roomsLoaded && !spatialMode && rooms.length > 0);
  // Na mobilu jsou zobrazení jen dvě kruhové ikony v horní liště vedle zvonku.
  // Pruh se třemi záložkami (Karty / 3D pohled / Půdorys) zabíral celý řádek
  // a půdorys se na telefonu stejně nepoužíval.
  const mobileViewControls = canViewSpatial ? (
    <div className="mro-view-icons" role="group" aria-label="Zobrazení operačních sálů">
      {([
        ['cards', 'Karty sálů', LayoutGrid],
        ['spatial', '3D pohled', Cuboid],
      ] as const).map(([value, label, Icon]) => (
        <button
          type="button"
          key={value}
          className="mro-icon-button"
          aria-label={label}
          title={label}
          aria-pressed={value === 'cards' ? !spatialMode : spatialMode}
          onPointerEnter={value === 'spatial' ? warmSpatialView : undefined}
          onPointerDown={value === 'spatial' ? warmSpatialView : undefined}
          onClick={() => {
            if (value === 'spatial') setCameraMode('spatial');
            changeDashboardView(value);
          }}
        >
          <Icon size={20} strokeWidth={1.7} aria-hidden />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className={`dashboard-module statistics-module h-full w-full overflow-y-auto px-4 py-6 pb-mobile-nav sm:px-6 md:py-10 md:pb-10 md:pl-32 md:pr-10 mobile-safe-top ${spatialMode ? 'spatial-dashboard-module' : ''}`}>
      <div aria-hidden className="mobile-theme-surface fixed inset-0 -z-10 md:hidden" />
      <div className={`mx-auto w-full max-w-[2400px] ${spatialMode ? 'flex h-full min-h-0 flex-col' : 'dashboard-cards-layout'}`}>
        {!spatialMode && <MobileRoomOverview rooms={rooms} roomsLoaded={roomsLoaded} viewControls={mobileViewControls} onSelectRoom={onSelectRoom} onEmergency={onEmergency} onLock={onLock} onNavigate={onNavigate} />}

        {/* Hlavička karet se přizpůsobuje dostupné šířce; 3D má vlastní layout. */}
        <header className="dashboard-page-header mb-7 hidden min-w-0 flex-shrink-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-[clamp(1rem,3vw,3rem)] md:grid md:pr-2">
          <ModulePageHeading
            icon={Shield}
            kicker="APLIKACE PRO ŘÍZENÍ OPERAČNÍCH SÁLŮ"
            title="OPERAČNÍ"
            mutedTitle="SÁLY"
            titleClassName="truncate"
            actions={viewToggle}
            titleAfter={(
              <button
                type="button"
                className="dashboard-help-button"
                onClick={() => setTutorialOpen(true)}
                aria-label="Spustit interaktivní nápovědu"
                title="Interaktivní nápověda"
              >
                <HelpCircle strokeWidth={2} aria-hidden />
              </button>
            )}
          />
          <LiveClock />
        </header>

        <div className={spatialMode ? 'min-h-0 flex-1' : 'dashboard-card-content'}>
          {!roomsLoaded ? (
            <div className={`${spatialMode ? 'flex' : 'hidden md:flex'} flex-col items-center justify-center md:py-32 gap-3`}>
              {spatialMode && <div className="md:hidden w-full">
                <MobileHeader kicker="Operační sály" title="Operační blok" />
                {mobileViewControls}
              </div>}
              <div className="w-7 h-7 border-2 border-[#C7D4E8] border-t-[#2952C8] md:border-white/20 md:border-t-white/70 rounded-full animate-spin" />
              <p className="text-sm text-[#7C8AA5] md:text-white/40">Načítám operační sály…</p>
            </div>
          ) : (
            <>
              {canViewSpatial && spatialMounted && (
                <div className={spatialMode ? 'h-full min-h-0' : 'hidden'} aria-hidden={!spatialMode}>
                  <SpatialDashboardView
                    rooms={rooms}
                    onSelectRoom={onSelectRoom}
                    onSwitchToCards={() => changeDashboardView('cards')}
                    mobileViewControls={mobileViewControls}
                    cameraMode={cameraMode}
                    onCameraModeChange={setCameraMode}
                  />
                </div>
              )}
              {!spatialMode && (
                rooms.length === 0 ? (
                  <div className="dashboard-empty-state hidden md:flex" role="status">
                    <LayoutGrid aria-hidden="true" strokeWidth={1.4} />
                    <h2>Zatím nejsou k dispozici žádné sály</h2>
                    <p>Sály se zde zobrazí po přiřazení k vašemu zdravotnickému zařízení.</p>
                  </div>
                ) : (
                <div ref={gridRef} className="dashboard-room-grid">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      specialties={currentByRoom.get(room.id)}
                      onClick={() => onSelectRoom(room.id)}
                      onEmergency={() => onEmergency(room.id)}
                      onLock={() => onLock(room.id)}
                    />
                  ))}
                </div>
                )
              )}
            </>
          )}
        </div>
      </div>

      {tutorialOpen && <TutorialOverlay onClose={() => setTutorialOpen(false)} />}
    </div>
  );
};

export default memo(DashboardModule);
