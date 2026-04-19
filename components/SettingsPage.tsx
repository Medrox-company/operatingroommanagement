import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock, Bell, Briefcase, BarChart3, Activity, Palette, ChevronLeft } from 'lucide-react';
import PageLayout from './PageLayout';
import OperatingRoomsManager from './OperatingRoomsManager';
import NotificationsManager from './NotificationsManager';
import DepartmentsManager from './DepartmentsManager';
import ScheduleManager from './ScheduleManager';
import ShiftScheduleManager from './ShiftScheduleManager';
import StatisticsModule from './StatisticsModule';
import StaffManager from './StaffManager';
import StatusesManager from './StatusesManager';
import BackgroundManager from './BackgroundManager';
import ManagementManager from './ManagementManager';
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
      id: 'shifts',
      title: 'Rozpis služeb',
      description: 'Správa pracovních směn a personálu',
      icon: Briefcase,
      accentColor: '#F97316',
    },
    {
      id: 'staff',
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      accentColor: '#10B981',
    },
    {
      id: 'departments',
      title: 'Oddělení',
      description: 'Správa oddělení a jejich konfigurací',
      icon: Stethoscope,
      accentColor: '#F97316',
    },
    {
      id: 'statuses',
      title: 'Statusy',
      description: 'Konfigurace workflow statusů operací',
      icon: Activity,
      accentColor: '#A78BFA',
    },
    {
      id: 'contacts',
      title: 'Kontakty',
      description: 'Správa kontaktů a komunikace',
      icon: Phone,
      accentColor: '#6366F1',
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
      id: 'settings',
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      accentColor: '#64748B',
    },
  ];

  // Floating back button overlay for nested modules
  const BackButton = () => (
    <button
      onClick={() => setSelectedModule(null)}
      className="
        fixed top-3 md:top-6 z-[90]
        left-3 md:left-28
        flex items-center gap-2
        px-4 py-2 rounded-2xl
        text-sm font-semibold text-white/80 hover:text-white
        border backdrop-blur-xl
        transition-all ios-tap
      "
      style={{
        background: 'rgba(10,10,18,0.8)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 8px 24px -8px rgba(0,0,0,0.5)',
        top: 'max(0.75rem, env(safe-area-inset-top))',
      }}
      aria-label="Zpět na nastavení"
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Nastavení</span>
    </button>
  );

  // Module wrapper with error boundary (for modules that don't have their own PageLayout)
  const ModuleWrapper: React.FC<{ children: React.ReactNode; title?: string; icon?: any; eyebrow?: string; accentColor?: string }> = ({ children, title, icon, eyebrow, accentColor }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      <ErrorBoundary
        fallback={
          <PageLayout title="Chyba" icon={SettingsIcon}>
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-white/50">Modul se nepodařilo načíst</p>
            </div>
          </PageLayout>
        }
      >
        {title ? (
          <PageLayout title={title} icon={icon} eyebrow={eyebrow} accentColor={accentColor}>
            {children}
          </PageLayout>
        ) : (
          children
        )}
      </ErrorBoundary>
    </motion.div>
  );

  // Render selected nested module with back button overlay
  if (selectedModule) {
    const renderModule = () => {
      switch (selectedModule) {
        case 'rooms':
          return (
            <ModuleWrapper title="Operační sály" icon={Building2} eyebrow="ROOM CONFIGURATION" accentColor="#0EA5E9">
              <OperatingRoomsManager
                rooms={rooms}
                onRoomsChange={(updatedRooms) => onRoomsChange?.(updatedRooms)}
                onScheduleUpdate={onScheduleUpdate}
              />
            </ModuleWrapper>
          );
        case 'shifts':
          return (
            <ModuleWrapper title="Rozpis služeb" icon={Briefcase} eyebrow="SHIFT PLANNING" accentColor="#F97316">
              <ShiftScheduleManager />
            </ModuleWrapper>
          );
        case 'notifications':
          return (
            <ModuleWrapper title="Notifikace" icon={Bell} eyebrow="NOTIFICATIONS" accentColor="#EC4899">
              <NotificationsManager />
            </ModuleWrapper>
          );
        case 'statistics':
          // StatisticsModule has its own PageLayout
          return <ModuleWrapper><StatisticsModule rooms={rooms} /></ModuleWrapper>;
        case 'staff':
          // StaffManager has its own PageLayout
          return <ModuleWrapper><StaffManager /></ModuleWrapper>;
        case 'statuses':
          return (
            <ModuleWrapper title="Statusy" icon={Activity} eyebrow="WORKFLOW STATUSES" accentColor="#A78BFA">
              <StatusesManager />
            </ModuleWrapper>
          );
        case 'background':
          return (
            <ModuleWrapper title="Pozadí" icon={Palette} eyebrow="APPEARANCE" accentColor="#8B5CF6">
              <BackgroundManager />
            </ModuleWrapper>
          );
        case 'management':
          return (
            <ModuleWrapper title="Management" icon={Briefcase} eyebrow="MANAGEMENT" accentColor="#06B6D4">
              <ManagementManager />
            </ModuleWrapper>
          );
        default:
          return null;
      }
    };

    return (
      <div className="relative w-full h-full">
        <BackButton />
        {renderModule()}
      </div>
    );
  }

  // Main Settings Menu
  return (
    <PageLayout
      title="Nastavení"
      eyebrow="SYSTEM CONFIGURATION"
      icon={SettingsIcon}
      accentColor="#8B5CF6"
      description="Správa modulů, personálu, sálů a dalších systémových nastavení."
    >
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.04, delayChildren: 0.05 }}
      >
        {settings.map((setting, index) => {
          const Icon = setting.icon;
          return (
            <motion.button
              key={setting.id}
              onClick={() => setSelectedModule(setting.id)}
              className="
                relative group text-left overflow-hidden
                rounded-3xl p-5
                border backdrop-blur-xl
                transition-all duration-300
                ios-tap
                aspect-square sm:aspect-[4/5]
                flex flex-col justify-between
              "
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{
                y: -4,
                borderColor: `${setting.accentColor}40`,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}
            >
              {/* Background glow on hover */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 100%, ${setting.accentColor}20, transparent 70%)`,
                }}
              />

              {/* Icon */}
              <div
                className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border backdrop-blur-md shrink-0"
                style={{
                  background: `${setting.accentColor}14`,
                  borderColor: `${setting.accentColor}30`,
                  boxShadow: `0 0 24px -6px ${setting.accentColor}40`,
                }}
              >
                <Icon
                  className="w-6 h-6 sm:w-7 sm:h-7"
                  style={{ color: setting.accentColor }}
                  strokeWidth={2}
                />
              </div>

              {/* Title + description */}
              <div className="relative mt-4">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight text-balance">
                  {setting.title}
                </h3>
                <p className="mt-1.5 text-xs text-white/50 leading-relaxed line-clamp-2">
                  {setting.description}
                </p>
              </div>

              {/* Arrow indicator */}
              <div className="relative mt-3 flex items-center justify-end">
                <motion.div
                  className="w-8 h-8 rounded-full flex items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `${setting.accentColor}14`,
                    border: `1px solid ${setting.accentColor}30`,
                  }}
                  whileHover={{ x: 2 }}
                >
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: setting.accentColor }} />
                </motion.div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </PageLayout>
  );
};

export default SettingsPage;
