import React, { useState, useEffect } from 'react';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock, Bell, Briefcase, BarChart3, Activity, Palette, ChevronLeft } from 'lucide-react';
import OperatingRoomsManager from './OperatingRoomsManager';
import NotificationsManager from './NotificationsManager';
import DepartmentsManager from './DepartmentsManager';
import ScheduleManager from './ScheduleManager';
import ShiftScheduleManager from './ShiftScheduleManager';
import StatisticsModule from './StatisticsModule';
import StaffManager from './StaffManager';
import StatusesManager from './StatusesManager';
import BackgroundManager from './BackgroundManager';
import { ErrorBoundary } from './ErrorBoundary';
import { OperatingRoom } from '../types';

interface SettingsPageProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
  onScheduleUpdate?: (roomId: string, schedule: Record<string, any>) => void;
  resetTrigger?: number;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ rooms = [], onRoomsChange, onScheduleUpdate, resetTrigger = 0 }) => {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  useEffect(() => {
    setSelectedModule(null);
  }, [resetTrigger]);
  
  const settings = [
    { id: 'rooms', title: 'Operacni saly', description: 'Sprava a konfigurace operacnich salu', icon: Building2, color: '#0EA5E9' },
    { id: 'schedule', title: 'Rozpis salu', description: 'Planovani a sprava rozpisu salu', icon: Calendar, color: '#A855F7' },
    { id: 'shifts', title: 'Rozpis sluzeb', description: 'Sprava pracovnich smen a personalu', icon: Briefcase, color: '#F97316' },
    { id: 'staff', title: 'Personal', description: 'Sprava zamestnancu a jejich prirazeni', icon: Users, color: '#10B981' },
    { id: 'departments', title: 'Oddeleni', description: 'Sprava oddeleni a jejich konfiguraci', icon: Stethoscope, color: '#F97316' },
    { id: 'statuses', title: 'Statusy', description: 'Konfigurace workflow statusu operaci', icon: Activity, color: '#A78BFA' },
    { id: 'contacts', title: 'Kontakty', description: 'Sprava kontaktu a komunikace', icon: Phone, color: '#6366F1' },
    { id: 'calendar', title: 'Kalendar', description: 'Sprava kalendare a udalosti', icon: Clock, color: '#EAB308' },
    { id: 'notifications', title: 'Notifikace', description: 'Sprava upozorneni a oznameni', icon: Bell, color: '#EC4899' },
    { id: 'statistics', title: 'Statistiky', description: 'Prehled metrik a vykonu systemu', icon: BarChart3, color: '#06B6D4' },
    { id: 'background', title: 'Pozadi', description: 'Nastaveni barev a obrazku pozadi', icon: Palette, color: '#8B5CF6' },
    { id: 'settings', title: 'Nastaveni', description: 'Konfigurace systemu a preferenci', icon: SettingsIcon, color: '#64748B' },
  ];

  const ModuleWrapper: React.FC<{ children: React.ReactNode; title: string }> = ({ children, title }) => (
    <div className="w-full px-4 md:pl-28 md:pr-6 py-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => setSelectedModule(null)}
        className="mb-6 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all duration-200"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Zpet</span>
      </button>
      
      <ErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-text-muted">Modul se nepodarilo nacist</p>
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </div>
  );

  // Render selected module
  if (selectedModule) {
    const moduleMap: Record<string, React.ReactNode> = {
      rooms: <OperatingRoomsManager rooms={rooms} onRoomsChange={onRoomsChange} onScheduleUpdate={onScheduleUpdate} />,
      shifts: <ShiftScheduleManager />,
      notifications: <NotificationsManager />,
      statistics: <StatisticsModule rooms={rooms} />,
      staff: <StaffManager />,
      statuses: <StatusesManager />,
      background: <BackgroundManager />,
    };

    const setting = settings.find(s => s.id === selectedModule);
    const content = moduleMap[selectedModule];

    if (content) {
      return (
        <ModuleWrapper title={setting?.title || ''}>
          {content}
        </ModuleWrapper>
      );
    }
  }

  return (
    <div className="w-full px-4 md:pl-28 md:pr-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <SettingsIcon className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-semibold text-accent tracking-widest uppercase">Konfigurace</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            Nastaveni systemu
          </h1>
          <p className="text-sm text-text-tertiary mt-2">
            Spravujte moduly a konfigurace operacniho systemu
          </p>
        </header>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {settings.map((setting, index) => {
            const Icon = setting.icon;
            return (
              <button
                key={setting.id}
                onClick={() => setSelectedModule(setting.id)}
                className="group relative flex flex-col p-5 rounded-2xl bg-surface-1 border border-border-subtle hover:bg-surface-2 hover:border-border-default transition-all duration-200 text-left h-[180px]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105"
                  style={{ backgroundColor: `${setting.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: setting.color }} strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary mb-1 group-hover:text-white transition-colors">
                    {setting.title}
                  </h3>
                  <p className="text-xs text-text-muted line-clamp-2">
                    {setting.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-[-4px] group-hover:translate-x-0">
                  <ArrowRight className="w-4 h-4" style={{ color: setting.color }} />
                </div>

                {/* Hover glow */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ 
                    boxShadow: `inset 0 0 0 1px ${setting.color}20, 0 0 20px ${setting.color}10` 
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
