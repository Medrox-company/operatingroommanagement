'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Calendar, Users, Settings as SettingsIcon, ArrowLeft, ArrowRight, Clock, Bell, Briefcase, BarChart3, Activity, Smartphone, ClipboardList, Stethoscope, GalleryHorizontalEnd, LayoutGrid, Search, SlidersHorizontal, Cuboid } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { OperatingRoom, WeeklySchedule } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import ModulePageHeading from './ModulePageHeading';
import { useAuth } from '../contexts/AuthContext';
import { MobileHeader } from './mobile/MobileShell';
import './mobile/mobile-settings.css';

const OperatingRoomsManager = dynamic(() => import('./OperatingRoomsManager'), { ssr: false });
const DepartmentsManager = dynamic(() => import('./DepartmentsManager'), { ssr: false });
const RoomSpecialtyScheduleManager = dynamic(() => import('./RoomSpecialtyScheduleManager'), { ssr: false });
const NotificationsManager = dynamic(() => import('./NotificationsManager'), { ssr: false });
const StatisticsModule = dynamic(() => import('./StatisticsModule'), { ssr: false });
const StaffManager = dynamic(() => import('./StaffManager'), { ssr: false });
const StaffOverviewModule = dynamic(() => import('./StaffOverviewModule'), { ssr: false });
const StatusesManager = dynamic(() => import('./StatusesManager'), { ssr: false });
const ManagementManager = dynamic(() => import('./ManagementManager'), { ssr: false });
const DevicesManager = dynamic(() => import('./DevicesManager'), { ssr: false });
const CalendarManager = dynamic(() => import('./ScheduleCalendarManager'), { ssr: false });
const SystemSettingsModule = dynamic(() => import('./SystemSettingsModule'), { ssr: false });
const SpatialEditorManager = dynamic(() => import('./SpatialEditorManager'), { ssr: false });

type ModuleGroup = 'all' | 'provoz' | 'personal' | 'system';
type LandingView = 'carousel' | 'grid';

const SETTINGS_SYSTEM_SUBMODULES = [
  'settings.hospital',
  'settings.modules',
  'settings.diagnostics',
  'settings.database',
  'settings.access',
] as const;

const SETTINGS_MODULE_PERMISSIONS: Record<string, string> = {
  rooms: 'settings.rooms',
  spatial: 'dashboard.spatial',
  specialties: 'settings.specialties',
  schedule: 'settings.schedule',
  staff: 'settings.staff',
  'staff-overview': 'settings.staff-overview',
  statuses: 'settings.statuses',
  calendar: 'settings.calendar',
  notifications: 'settings.notifications',
  statistics: 'settings.statistics',
  management: 'settings.management',
  devices: 'settings.devices',
};

const GROUP_LABELS: Record<Exclude<ModuleGroup, 'all'>, string> = {
  provoz: 'Provoz',
  personal: 'Personál',
  system: 'Systém',
};

interface SettingsPageProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
  onScheduleUpdate?: (roomId: string, schedule: WeeklySchedule) => Promise<void>;
  /** Přiřazení personálu na sál — stejná cesta jako z detailu sálu. */
  onStaffChange?: (roomId: string, role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => void;
  resetTrigger?: number;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ rooms = [], onRoomsChange, onScheduleUpdate, onStaffChange, resetTrigger = 0 }) => {
  const { activeHospitalId } = useHospital();
  const { hasSubmoduleAccess } = useAuth();
  const canViewSpatial = hasSubmoduleAccess('dashboard.spatial');
  const canViewSystemSettings = SETTINGS_SYSTEM_SUBMODULES.some(hasSubmoduleAccess);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [landingView, setLandingView] = useState<LandingView>('carousel');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<ModuleGroup>('all');
  const pointerStartX = useRef<number | null>(null);
  const wheelLocked = useRef(false);
  
  useEffect(() => {
    setSelectedModule(null);
  }, [resetTrigger]);
  
  const settings = [
    {
      id: 'rooms',
      group: 'provoz' as const,
      title: 'Operační sály',
      description: 'Správa a konfigurace operačních sálů',
      icon: Building2,
      accentColor: '#22D3EE',
    },
    {
      id: 'spatial',
      group: 'provoz' as const,
      title: '3D dispozice',
      description: 'Editor prostorového modelu operačního traktu',
      icon: Cuboid,
      accentColor: '#FBBF24',
    },
    {
      id: 'specialties',
      group: 'provoz' as const,
      title: 'Operační obory',
      description: 'Správa oborů používaných v rozpisu sálů',
      icon: Stethoscope,
      accentColor: '#FB7185',
    },
    {
      id: 'schedule',
      group: 'provoz' as const,
      title: 'Rozpis sálů',
      description: 'Plánování a správa rozpisu sálů',
      icon: Calendar,
      accentColor: '#C084FC',
    },
    {
      id: 'staff',
      group: 'personal' as const,
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      accentColor: '#34D399',
    },
    {
      id: 'staff-overview',
      group: 'personal' as const,
      title: 'Přehled',
      description: 'Přehled personálu - kdo pracuje, kdo je volný',
      icon: ClipboardList,
      accentColor: '#FB923C',
    },
    {
      id: 'statuses',
      group: 'system' as const,
      title: 'Statusy',
      description: 'Konfigurace workflow statusů operací',
      icon: Activity,
      accentColor: '#818CF8',
    },
    {
      id: 'calendar',
      group: 'provoz' as const,
      title: 'Kalendář',
      description: 'Správa kalendáře a událostí',
      icon: Clock,
      accentColor: '#A3E635',
    },
    {
      id: 'notifications',
      group: 'system' as const,
      title: 'Notifikace',
      description: 'Správa upozornění a oznámení',
      icon: Bell,
      accentColor: '#F472B6',
    },
    {
      id: 'statistics',
      group: 'system' as const,
      title: 'Statistiky',
      description: 'Přehled metrik a výkonu systému',
      icon: BarChart3,
      accentColor: '#2DD4BF',
    },
    {
      id: 'management',
      group: 'personal' as const,
      title: 'Management',
      description: 'Správa kontaktů na management',
      icon: Briefcase,
      accentColor: '#F97316',
    },
    {
      id: 'devices',
      group: 'system' as const,
      title: 'Správa zařízení',
      description: 'Přehled registrovaných zařízení a jejich správa',
      icon: Smartphone,
      accentColor: '#60A5FA',
    },
    {
      id: 'settings',
      group: 'system' as const,
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      accentColor: '#94A3B8',
    },
  ].filter(item => {
    if (item.id === 'settings') return canViewSystemSettings;
    const permissionId = SETTINGS_MODULE_PERMISSIONS[item.id];
    return permissionId ? hasSubmoduleAccess(permissionId) : false;
  });

  useEffect(() => {
    if (selectedModule && !settings.some(item => item.id === selectedModule)) setSelectedModule(null);
  }, [canViewSpatial, canViewSystemSettings, hasSubmoduleAccess, selectedModule, settings]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (selectedModule || landingView !== 'carousel' || carouselPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const autoplay = window.setInterval(() => {
      setActiveModuleIndex(current => (current + 1) % settings.length);
    }, 5200);

    return () => window.clearInterval(autoplay);
  }, [carouselPaused, landingView, selectedModule, settings.length]);

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

  const groupCounts = useMemo(() => ({
    provoz: settings.filter(item => item.group === 'provoz').length,
    personal: settings.filter(item => item.group === 'personal').length,
    system: settings.filter(item => item.group === 'system').length,
  }), [settings]);

  const visibleModules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('cs');
    return settings.filter(item => {
      if (group !== 'all' && item.group !== group) return false;
      if (!normalizedQuery) return true;
      return `${item.title} ${item.description}`.toLocaleLowerCase('cs').includes(normalizedQuery);
    });
  }, [group, query, settings]);

  /** Přepínač zobrazení rozcestníku — karusel nebo mřížka modulů. */
  const viewToggle = (
    <div className="settings-view-toggle flex items-center gap-1" role="group" aria-label="Zobrazení modulů nastavení">
      {([
        ['carousel', 'Karusel', GalleryHorizontalEnd],
        ['grid', 'Mřížka', LayoutGrid],
      ] as const).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLandingView(value)}
          aria-pressed={landingView === value}
          title={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          aria-label={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          className={`grid h-[clamp(2.5rem,7vh,4rem)] w-[clamp(2.5rem,7vh,4rem)] place-items-center rounded-[clamp(0.75rem,1.8vh,1rem)] transition-colors duration-200 ${landingView === value ? 'bg-white/[0.15] text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        >
          {/* Stejná velikost ikony i tlačítka jako v levém postranním menu. */}
          <Icon
            className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)] transition-colors duration-200"
            strokeWidth={landingView === value ? 2.5 : 2}
          />
        </button>
      ))}
    </div>
  );

  const carouselStep = Math.min(250, Math.max(viewportWidth < 840 ? 92 : 138, viewportWidth * 0.145));

  // Module wrapper with error boundary
  const ModuleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="settings-module-wrapper w-full px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
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
    <div className={`settings-page-root relative h-full min-h-0 w-full ${selectedModule || landingView === 'grid' ? 'hide-scrollbar overflow-y-auto' : 'overflow-hidden'}`} data-settings-landing={selectedModule ? undefined : landingView}>
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
      ) : selectedModule === 'spatial' && canViewSpatial ? (
        <ModuleWrapper>
          <SpatialEditorManager key={activeHospitalId || 'no-hospital'} rooms={rooms} />
        </ModuleWrapper>
      ) : selectedModule === 'specialties' ? (
        <ModuleWrapper>
          <DepartmentsManager key={activeHospitalId || 'no-hospital'} />
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
          <StaffOverviewModule rooms={rooms} onStaffChange={onStaffChange} />
        </ModuleWrapper>
      ) : selectedModule === 'statuses' ? (
        <ModuleWrapper>
          <StatusesManager />
        </ModuleWrapper>
      ) : selectedModule === 'calendar' ? (
        <ModuleWrapper>
          <CalendarManager rooms={rooms} />
        </ModuleWrapper>
      ) : selectedModule === 'management' ? (
        <ModuleWrapper>
          <ManagementManager />
        </ModuleWrapper>
      ) : selectedModule === 'devices' ? (
        <ModuleWrapper>
          <DevicesManager onBack={() => setSelectedModule(null)} />
        </ModuleWrapper>
      ) : selectedModule === 'settings' && canViewSystemSettings ? (
        <ModuleWrapper>
          <SystemSettingsModule />
        </ModuleWrapper>
      ) : landingView === 'grid' ? (
        <ModuleWrapper>
          {/* Alternativa ke karuselu — stejná skladba jako Rozpis sálů nebo
              Operační obory: nadpis, vodorovná lišta, mřížka karet. */}
          <div className="settings-landing-grid statistics-module min-h-full w-full pb-10 font-sans">
            <div className="settings-mobile-heading md:hidden">
              <MobileHeader kicker="Konfigurace systému" title="Nastavení" right={viewToggle} />
            </div>
            <header className="mb-7 hidden md:block">
              <ModulePageHeading
                icon={SettingsIcon}
                kicker="SYSTEM CONFIGURATION"
                title="NASTAVENÍ"
                mutedTitle="SYSTÉMU"
                actions={viewToggle}
              />
            </header>

            <section className="settings-grid-commandbar hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="flex min-w-max items-center gap-2.5">
                {([
                  { label: 'Moduly celkem', value: settings.length, suffix: 'modulů', icon: LayoutGrid, color: '#38BDF8' },
                  { label: 'Provoz', value: groupCounts.provoz, suffix: 'modulů', icon: Building2, color: '#A855F7' },
                  { label: 'Personál', value: groupCounts.personal, suffix: 'modulů', icon: Users, color: '#34D399' },
                  { label: 'Systém', value: groupCounts.system, suffix: 'modulů', icon: SlidersHorizontal, color: '#FBBF24' },
                ] as const).map(({ label, value, suffix, icon: Icon, color }) => (
                  <div key={label} className="settings-grid-metric relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]">
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/38" title={label}>{label}</p>
                        <div className="mt-1.5 flex items-baseline gap-1">
                          <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{value}</span>
                          <span className="text-[8px] font-medium text-white/28">{suffix}</span>
                        </div>
                      </div>
                      <Icon className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
                    </div>
                  </div>
                ))}

                <div className="ml-1 h-10 w-px shrink-0 bg-white/[0.07]" aria-hidden="true" />

                <div className="w-[104px] shrink-0">
                  <h2 className="text-[11px] font-semibold leading-tight text-white/92">Rozcestník</h2>
                  <p className="mt-1 text-[8px] leading-tight text-white/38">Moduly nastavení</p>
                </div>

                <div className="settings-grid-filters grid shrink-0 grid-cols-4 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
                  {(['all', 'provoz', 'personal', 'system'] as ModuleGroup[]).map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGroup(value)}
                      aria-pressed={group === value}
                      className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${group === value ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
                    >
                      {value === 'all' ? 'Vše' : GROUP_LABELS[value]}
                    </button>
                  ))}
                </div>

                <label className="settings-grid-search flex h-10 w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.055] bg-black/10 px-3">
                  <Search className="h-4 w-4 shrink-0 text-white/30" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Hledat modul"
                    aria-label="Hledat modul nastavení"
                    className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
                  />
                </label>
              </div>
            </section>

            {visibleModules.length === 0 ? (
              <section className="settings-grid-empty flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
                <LayoutGrid className="h-9 w-9 text-white/20" strokeWidth={1.4} />
                <p className="mt-4 text-sm font-semibold text-white/65">Žádný modul neodpovídá filtru.</p>
              </section>
            ) : (
              <section className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleModules.map(setting => {
                  const Icon = setting.icon;
                  const color = setting.accentColor;
                  return (
                    <button
                      key={setting.id}
                      type="button"
                      onClick={() => setSelectedModule(setting.id)}
                      className="settings-grid-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] py-3.5 pl-5 pr-4 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/60"
                      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)' }}
                    >
                      <span className="settings-grid-card-stripe absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${color}88` }} />

                      <div className="settings-grid-card-row flex items-center gap-3.5">
                        <span
                          className="settings-grid-card-icon flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border"
                          style={{ borderColor: `${color}58`, backgroundColor: `${color}1f`, color }}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.5} />
                        </span>

                        <div className="settings-grid-card-copy min-w-0 flex-1">
                          <h3 className="settings-card-title truncate text-[15px] font-bold leading-tight text-white/90">{setting.title}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                            {GROUP_LABELS[setting.group]}
                          </p>
                        </div>

                        <span className="settings-grid-card-open grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.065] text-white/34 transition-colors group-hover:bg-white/[0.06] group-hover:text-white/80">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>

                      <p className="settings-card-description mt-auto min-h-[30px] pt-3 text-[11.5px] leading-[15px] text-white/42">
                        {setting.description}
                      </p>
                    </button>
                  );
                })}
              </section>
            )}
          </div>
        </ModuleWrapper>
      ) : (
        <div className="relative h-full min-h-0 w-full overflow-hidden">
          <div className="settings-carousel-layout relative z-10 h-full min-h-0 overflow-hidden">
            <div className="settings-mobile-heading settings-carousel-heading md:hidden">
              <MobileHeader kicker="Konfigurace systému" title="Nastavení" right={viewToggle} />
            </div>
            <header className="absolute inset-x-0 top-0 z-40 hidden select-none px-4 py-[clamp(1rem,3.4dvh,2.5rem)] sm:px-6 md:block md:pl-32 md:pr-10">
              <ModulePageHeading
                icon={SettingsIcon}
                kicker="SYSTEM CONFIGURATION"
                title="NASTAVENÍ"
                mutedTitle="SYSTÉMU"
                actions={viewToggle}
              />
            </header>

            <section
              data-settings-carousel
              className="settings-carousel-stage relative grid h-full min-h-0 place-items-center overflow-hidden [perspective:1500px] md:ml-[5.5rem]"
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
                className="settings-carousel-arrow absolute left-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-[#93A1BD]/30 bg-[#0B1224]/70 text-[#D7DEEA] transition-colors hover:border-[#ABB8D3]/60 hover:bg-[#131F3B]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF] sm:left-8 sm:h-13 sm:w-13 md:left-[clamp(2rem,4vw,4rem)]"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.4} />
              </button>

              <div className="absolute inset-0 grid place-items-center [perspective:1300px] [transform-style:preserve-3d]">
                <div className="settings-carousel-card-frame relative h-[clamp(16.25rem,48dvh,31.25rem)] w-[clamp(13rem,21vw,21.25rem)] [transform-style:preserve-3d]">
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
                        className="settings-carousel-card group absolute inset-0 flex cursor-pointer flex-col overflow-hidden rounded-[24px] border p-[clamp(1.5rem,3vw,2.375rem)] text-left transition-[transform,opacity,filter,border-color,background-color] duration-700 ease-[cubic-bezier(0.2,0.72,0.22,1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF]"
                        style={{
                          '--settings-accent': setting.accentColor,
                          transform: `translate3d(${distance * carouselStep}px, ${absoluteDistance * 9}px, ${-absoluteDistance * 118}px) rotateY(${distance * -11}deg) scale(${scale})`,
                          opacity: isVisible ? Math.max(0.18, 1 - absoluteDistance * 0.18) : 0,
                          filter: `brightness(${Math.max(0.42, 1 - absoluteDistance * 0.13)})`,
                          zIndex: 20 - absoluteDistance,
                          pointerEvents: isVisible ? 'auto' : 'none',
                          color: isActive ? '#E8EDF7' : '#B4BFD3',
                          borderColor: isActive ? `${setting.accentColor}70` : 'rgba(139,158,193,0.2)',
                          background: isActive
                            ? `linear-gradient(180deg, ${setting.accentColor}52 0%, ${setting.accentColor}24 42%, rgba(10,22,54,0.9) 100%)`
                            : 'linear-gradient(180deg, rgba(24,39,82,0.58) 0%, rgba(9,20,50,0.78) 100%)',
                          boxShadow: isActive
                            ? `0 24px 70px rgba(4,10,34,0.3), 0 0 34px ${setting.accentColor}14, inset 0 1px 0 rgba(190,205,255,0.08)`
                            : '0 18px 52px rgba(4,10,34,0.2), inset 0 1px 0 rgba(190,205,255,0.045)',
                        } as React.CSSProperties}
                      >
                        <span className="settings-carousel-eyebrow mb-auto text-center text-[9px] font-semibold uppercase tracking-[0.38em] text-[#9EABC2]">
                          MODUL
                        </span>
                        <Icon
                          className="settings-carousel-icon mb-7 h-[clamp(3.25rem,5vw,4rem)] w-[clamp(3.25rem,5vw,4rem)]"
                          style={{ color: isActive ? setting.accentColor : '#B3BFD3' }}
                          strokeWidth={1.25}
                        />
                        <span className="settings-card-title mb-2.5 text-[clamp(1.25rem,2vw,1.875rem)] font-normal uppercase leading-[1.05] tracking-[-0.035em] text-[#F1F4FA]">
                          {setting.title}
                        </span>
                        <span className="settings-card-description min-h-[42px] text-xs leading-[1.55] text-[#919DB2]">
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
                className="settings-carousel-arrow absolute right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-[#93A1BD]/30 bg-[#0B1224]/70 text-[#D7DEEA] transition-colors hover:border-[#ABB8D3]/60 hover:bg-[#131F3B]/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#848BFF] sm:right-8 sm:h-13 sm:w-13 md:right-[clamp(2rem,4vw,4rem)]"
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
