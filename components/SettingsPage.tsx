'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock, Bell, Briefcase, BarChart3, Activity, Palette, ChevronLeft, Smartphone, ClipboardList } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { OperatingRoom, WeeklySchedule } from '../types';
import { useHospital } from '../contexts/HospitalContext';

const OperatingRoomsManager = dynamic(() => import('./OperatingRoomsManager'), { ssr: false });
const NotificationsManager = dynamic(() => import('./NotificationsManager'), { ssr: false });
const ScheduleManager = dynamic(() => import('./ScheduleManager'), { ssr: false });
const StatisticsModule = dynamic(() => import('./StatisticsModule'), { ssr: false });
const StaffManager = dynamic(() => import('./StaffManager'), { ssr: false });
const StaffOverviewModule = dynamic(() => import('./StaffOverviewModule'), { ssr: false });
const StatusesManager = dynamic(() => import('./StatusesManager'), { ssr: false });
const BackgroundManager = dynamic(() => import('./BackgroundManager'), { ssr: false });
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
      id: 'background',
      title: 'Pozadí',
      description: 'Nastavení barev a obrázků pozadí',
      icon: Palette,
      accentColor: '#8B5CF6',
    },
    {
      id: 'management',
      title: 'Management',
      description: 'Správa kontaktů na management',
      icon: Briefcase,
      accentColor: '#06B6D4',
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
    // Rozcestník (bez vybraného modulu) potřebuje definovanou výšku (h-full),
    // aby FitGrid správně změřil plochu a neproblikával. Po výběru modulu
    // necháme min-h-screen, ať se obsah může rolovat.
    <div className={`relative w-full ${selectedModule ? 'min-h-screen' : 'h-full'}`}>
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
          <ScheduleManager />
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
      ) : selectedModule === 'background' ? (
        <ModuleWrapper>
          <BackgroundManager />
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
        <div className="w-full h-full overflow-y-auto hide-scrollbar px-4 sm:px-6 md:pl-32 md:pr-10 py-6 md:py-10 pb-mobile-nav md:pb-10">
          <div className="max-w-[2400px] mx-auto w-full">
            {/* Settings Header */}
            <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-4 md:mb-10 lg:mb-12 flex-shrink-0">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
                  <SettingsIcon className="w-4 h-4 text-[#8B5CF6]" />
                  <p className="text-[10px] font-bold text-[#8B5CF6] tracking-[0.4em] uppercase">SYSTEM CONFIGURATION</p>
                </div>
                <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
                  NASTAVENÍ <span className="text-white/20">SYSTÉMU</span>
                </h1>
              </div>
            </header>

            {/* Settings Grid — stejný design jako dashboard (responzivní mřížka s rolováním) */}
            <div className="pb-20 px-0 sm:px-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:gap-y-8">
                {settings.map((setting, index) => {
                  const Icon = setting.icon;
                  return (
                    <div
                      key={setting.id}
                      onClick={() => setSelectedModule(setting.id)}
                      className="relative group cursor-pointer h-[260px] sm:h-[340px] w-full transition-transform duration-300 hover:-translate-y-1 hover:z-50"
                      style={{ zIndex: 1 }}
                    >
                      {/* Main Card Container */}
                      <div className="absolute inset-0 z-0 rounded-[2.5rem] border transition-colors duration-200 bg-white/[0.025] border-white/[0.07] group-hover:bg-white/[0.045] group-hover:border-white/[0.12]" />

                      {/* Content Container */}
                      <div className="relative h-full w-full z-10 p-6 flex flex-col">
                        
                        {/* Header */}
                        <div className="w-full flex justify-center items-center min-w-0 gap-2 shrink-0 mb-4">
                          <div className="flex flex-col min-w-0 flex-1 text-center">
                            <p className="text-[9px] font-bold tracking-[0.3em] uppercase leading-none mb-2 truncate text-slate-500">
                              MODUL
                            </p>
                            <h3 className="text-lg font-bold tracking-tight uppercase leading-none text-white/60 group-hover:text-white transition-colors duration-200 truncate">
                              {setting.title}
                            </h3>
                          </div>
                        </div>

                        {/* Central Content Wrapper */}
                        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                          {/* Icon Container */}
                          <div className="relative flex items-center justify-center mb-4">
                            {/* Main Icon Box */}
                            <div
                              className="w-24 h-24 rounded-2xl border border-white/10 bg-white/[0.025] flex items-center justify-center group-hover:border-white/20 transition-colors duration-200"
                            >
                              <div style={{ color: setting.accentColor }}>
                                <Icon className="w-16 h-16" strokeWidth={1.5} />
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs leading-relaxed text-center text-white/30 group-hover:text-white/50 transition-colors duration-200">
                            {setting.description}
                          </p>
                        </div>

                        {/* Bottom Info */}
                        <div className="w-full space-y-3 shrink-0">
                          <div className="flex items-center justify-center pt-3 border-t border-white/5">
                            <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <ArrowRight className="w-4 h-4" style={{ color: setting.accentColor }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
