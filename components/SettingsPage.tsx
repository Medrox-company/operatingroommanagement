'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Calendar, Users, Settings as SettingsIcon, ArrowLeft, ArrowRight, Clock, Bell, Briefcase, BarChart3, Activity, Smartphone, ClipboardList } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { OperatingRoom, WeeklySchedule } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import ModulePageHeading from './ModulePageHeading';

const OperatingRoomsManager = dynamic(() => import('./OperatingRoomsManager'), { ssr: false });
const RoomSpecialtyScheduleManager = dynamic(() => import('./RoomSpecialtyScheduleManager'), { ssr: false });
const NotificationsManager = dynamic(() => import('./NotificationsManager'), { ssr: false });
const StatisticsModule = dynamic(() => import('./StatisticsModule'), { ssr: false });
const StaffManager = dynamic(() => import('./StaffManager'), { ssr: false });
const StaffOverviewModule = dynamic(() => import('./StaffOverviewModule'), { ssr: false });
const StatusesManager = dynamic(() => import('./StatusesManager'), { ssr: false });
const ManagementManager = dynamic(() => import('./ManagementManager'), { ssr: false });
const DevicesManager = dynamic(() => import('./DevicesManager'), { ssr: false });
const CalendarManager = dynamic(() => import('./CalendarManager'), { ssr: false });
const SystemSettingsModule = dynamic(() => import('./SystemSettingsModule'), { ssr: false });

interface SettingsPageProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
  onScheduleUpdate?: (roomId: string, schedule: WeeklySchedule) => void;
  resetTrigger?: number;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ rooms = [], onRoomsChange, onScheduleUpdate, resetTrigger = 0 }) => {
  const { activeHospitalId } = useHospital();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const pointerStartX = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  
  useEffect(() => {
    setSelectedModule(null);
  }, [resetTrigger]);
  
  const settings = [
    {
      id: 'rooms',
      title: 'Operační sály',
      description: 'Správa a konfigurace operačních sálů',
      icon: Building2,
      accentColor: '#0EA5E9',
    },
    {
      id: 'schedule',
      title: 'Rozpis sálů',
      description: 'Plánování a správa rozpisu sálů',
      icon: Calendar,
      accentColor: '#A855F7',
    },
    {
      id: 'staff',
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      accentColor: '#10B981',
    },
    {
      id: 'staff-overview',
      title: 'Přehled',
      description: 'Přehled personálu - kdo pracuje, kdo je volný',
      icon: ClipboardList,
      accentColor: '#FBBF24',
    },
    {
      id: 'statuses',
      title: 'Statusy',
      description: 'Konfigurace workflow statusů operací',
      icon: Activity,
      accentColor: '#A78BFA',
    },
    {
      id: 'calendar',
      title: 'Kalendář',
      description: 'Správa kalendáře a událostí',
      icon: Clock,
      accentColor: '#EAB308',
    },
    {
      id: 'notifications',
      title: 'Notifikace',
      description: 'Správa upozornění a oznámení',
      icon: Bell,
      accentColor: '#EC4899',
    },
    {
      id: 'statistics',
      title: 'Statistiky',
      description: 'Přehled metrik a výkonu systému',
      icon: BarChart3,
      accentColor: '#06B6D4',
    },
    {
      id: 'management',
      title: 'Management',
      description: 'Správa kontaktů na management',
      icon: Briefcase,
      accentColor: '#F97316',
    },
    {
      id: 'devices',
      title: 'Správa zařízení',
      description: 'Přehled registrovaných zařízení a jejich správa',
      icon: Smartphone,
      accentColor: '#3B82F6',
    },
    {
      id: 'settings',
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      accentColor: '#64748B',
    },
  ];

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (selectedModule || carouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const autoplay = window.setInterval(() => {
      setActiveModuleIndex(current => (current + 1) % settings.length);
    }, 5200);

    return () => window.clearInterval(autoplay);
  }, [carouselPaused, selectedModule, settings.length]);

  const goToModule = (index: number) => {
    setActiveModuleIndex((index + settings.length) % settings.length);
  };

  const signedModuleDistance = (index: number) => {
    let distance = index - activeModuleIndex;
    const half = settings.length / 2;
    if (distance > half) distance -= settings.length;
    if (distance < -half) distance += settings.length;
    return distance;
  };

  const carouselStep = Math.min(250, Math.max(viewportWidth < 840 ? 92 : 138, viewportWidth * 0.145));

  // Module wrapper with error boundary
  const ModuleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
      <ErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-white/50">Modul se nepodařilo načíst</p>
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </div>
  );

  return (
    // Rozcestník vždy přesně vyplní dostupný viewport bez stránkového scrollu.
    // Delší obsah vybraných administračních modulů roluje pouze uvnitř této plochy.
    <div className={`relative h-full min-h-0 w-full ${selectedModule ? 'hide-scrollbar overflow-y-auto' : 'overflow-hidden'}`}>
      {selectedModule === 'rooms' ? (
        <ModuleWrapper>
          <OperatingRoomsManager 
            key={activeHospitalId || 'no-hospital'}
            rooms={rooms} 
            onRoomsChange={(updatedRooms) => {
              onRoomsChange?.(updatedRooms);
            }}
            onScheduleUpdate={onScheduleUpdate}
          />
        </ModuleWrapper>
      ) : selectedModule === 'schedule' ? (
        <ModuleWrapper>
          <RoomSpecialtyScheduleManager
            key={activeHospitalId || 'no-hospital'}
            rooms={rooms}
          />
        </ModuleWrapper>
      ) : selectedModule === 'notifications' ? (
        <ModuleWrapper>
          <NotificationsManager />
        </ModuleWrapper>
      ) : selectedModule === 'statistics' ? (
        <ModuleWrapper>
          <StatisticsModule rooms={rooms} />
        </ModuleWrapper>
      ) : selectedModule === 'staff' ? (
        <ModuleWrapper>
          <StaffManager />
        </ModuleWrapper>
      ) : selectedModule === 'staff-overview' ? (
        <ModuleWrapper>
          <StaffOverviewModule rooms={rooms} />
        </ModuleWrapper>
      ) : selectedModule === 'statuses' ? (
        <ModuleWrapper>
          <StatusesManager />
        </ModuleWrapper>
      ) : selectedModule === 'calendar' ? (
        <ModuleWrapper>
          <CalendarManager />
        </ModuleWrapper>
      ) : selectedModule === 'management' ? (
        <ModuleWrapper>
          <ManagementManager />
        </ModuleWrapper>
      ) : selectedModule === 'devices' ? (
        <ModuleWrapper>
          <DevicesManager onBack={() => setSelectedModule(null)} />
        </ModuleWrapper>
      ) : selectedModule === 'settings' ? (
        <ModuleWrapper>
          <SystemSettingsModule />
        </ModuleWrapper>
      ) : (
        <div className="relative h-full min-h-0 w-full overflow-hidden">
          <div className="relative z-10 h-full min-h-0 overflow-hidden">
            <header className="absolute inset-x-0 top-0 z-40 select-none px-4 py-[clamp(1rem,3.4dvh,2.5rem)] sm:px-6 md:pl-32 md:pr-10">
              <ModulePageHeading
                icon={SettingsIcon}
                kicker="SYSTEM CONFIGURATION"
                title="NASTAVENÍ"
                mutedTitle="SYSTÉMU"
              />
            </header>

            <section
              data-settings-carousel
              className="relative grid h-full min-h-0 place-items-center overflow-hidden [perspective:1500px] md:ml-[5.5rem]"
              aria-label="Moduly nastavení"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
              onFocusCapture={() => setCarouselPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setCarouselPaused(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') goToModule(activeModuleIndex + 1);
                if (event.key === 'ArrowLeft') goToModule(activeModuleIndex - 1);
                if (event.key === 'Home') goToModule(0);
                if (event.key === 'End') goToModule(settings.length - 1);
              }}
              onWheel={(event) => {
                event.preventDefault();
                if (wheelLocked.current || Math.abs(event.deltaX) + Math.abs(event.deltaY) < 8) return;
                wheelLocked.current = true;
                goToModule(activeModuleIndex + ((event.deltaX || event.deltaY) > 0 ? 1 : -1));
                window.setTimeout(() => { wheelLocked.current = false; }, 520);
              }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                pointerStartX.current = event.clientX;
              }}
              onPointerUp={(event) => {
                if (pointerStartX.current === null) return;
                const distance = event.clientX - pointerStartX.current;
                if (Math.abs(distance) > 45) goToModule(activeModuleIndex + (distance < 0 ? 1 : -1));
                pointerStartX.current = null;
              }}
              onPointerCancel={() => { pointerStartX.current = null; }}
            >
              <button
                type="button"
                aria-label="Předchozí modul"
                onClick={() => goToModule(activeModuleIndex - 1)}
                className="absolute left-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-[#93A1BD]/30 bg-[#0B1224]/70 text-[#D7DEEA] transition-colors hover:border-[#ABB8D3]/60 hover:bg-[#131F3B]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF] sm:left-8 sm:h-13 sm:w-13 md:left-[clamp(2rem,4vw,4rem)]"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.4} />
              </button>

              <div className="absolute inset-0 grid place-items-center [perspective:1300px] [transform-style:preserve-3d]">
                <div className="relative h-[clamp(16.25rem,48dvh,31.25rem)] w-[clamp(13rem,21vw,21.25rem)] [transform-style:preserve-3d]">
                  {settings.map((setting, index) => {
                    const Icon = setting.icon;
                    const distance = signedModuleDistance(index);
                    const absoluteDistance = Math.abs(distance);
                    const isActive = distance === 0;
                    const isVisible = absoluteDistance <= 4;
                    const scale = Math.max(0.68, 1 - absoluteDistance * 0.095);

                    return (
                      <button
                        key={setting.id}
                        type="button"
                        aria-label={`${index + 1} z ${settings.length}: ${setting.title}`}
                        aria-current={isActive ? 'true' : undefined}
                        aria-hidden={!isVisible}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => isActive ? setSelectedModule(setting.id) : goToModule(index)}
                        className="group absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-[24px] border p-[clamp(1.5rem,3vw,2.375rem)] text-left transition-[transform,opacity,filter,border-color,background-color] duration-700 ease-[cubic-bezier(0.2,0.72,0.22,1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF]"
                        style={{
                          transform: `translate3d(${distance * carouselStep}px, ${absoluteDistance * 9}px, ${-absoluteDistance * 118}px) rotateY(${distance * -11}deg) scale(${scale})`,
                          opacity: isVisible ? Math.max(0.18, 1 - absoluteDistance * 0.18) : 0,
                          filter: `brightness(${Math.max(0.42, 1 - absoluteDistance * 0.13)})`,
                          zIndex: 20 - absoluteDistance,
                          pointerEvents: isVisible ? 'auto' : 'none',
                          color: isActive ? '#E8EDF7' : '#B4BFD3',
                          borderColor: isActive ? `${setting.accentColor}70` : 'rgba(139,158,193,0.2)',
                          background: isActive
                            ? `linear-gradient(180deg, ${setting.accentColor}4D 0%, ${setting.accentColor}1F 46%, rgba(5,10,23,0.92) 100%)`
                            : 'linear-gradient(180deg, rgba(18,27,51,0.3), rgba(5,10,23,0.74))',
                          boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
                        }}
                      >
                        <span className="mb-auto text-center text-[9px] font-semibold uppercase tracking-[0.38em] text-[#9EABC2]">
                          MODUL
                        </span>
                        <Icon
                          className="mb-7 h-[clamp(3.25rem,5vw,4rem)] w-[clamp(3.25rem,5vw,4rem)]"
                          style={{ color: isActive ? setting.accentColor : '#B3BFD3' }}
                          strokeWidth={1.25}
                        />
                        <span className="mb-2.5 text-[clamp(1.25rem,2vw,1.875rem)] font-normal uppercase leading-[1.05] tracking-[-0.035em] text-[#F1F4FA]">
                          {setting.title}
                        </span>
                        <span className="min-h-[42px] text-xs leading-[1.55] text-[#919DB2]">
                          {setting.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                aria-label="Následující modul"
                onClick={() => goToModule(activeModuleIndex + 1)}
                className="absolute right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-[#93A1BD]/30 bg-[#0B1224]/70 text-[#D7DEEA] transition-colors hover:border-[#ABB8D3]/60 hover:bg-[#131F3B]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF] sm:right-8 sm:h-13 sm:w-13 md:right-[clamp(2rem,4vw,4rem)]"
              >
                <ArrowRight className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </section>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
