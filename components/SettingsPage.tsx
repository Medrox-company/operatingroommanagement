import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock, Bell, Briefcase, BarChart3, Activity, Palette, ChevronLeft } from 'lucide-react';
import OperatingRoomsManager from './OperatingRoomsManager';
import NotificationsManager from './NotificationsManager';
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

  // Module wrapper with error boundary
  const ModuleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full px-8 md:pl-32 md:pr-10 py-10"
    >
      <ErrorBoundary
        fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-white/50">Modul se nepodařilo načíst</p>
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </motion.div>
  );

  return (
    <div className="relative w-full min-h-screen">
      {selectedModule === 'rooms' ? (
        <ModuleWrapper>
          <OperatingRoomsManager 
            rooms={rooms} 
            onRoomsChange={(updatedRooms) => {
              onRoomsChange?.(updatedRooms);
            }}
            onScheduleUpdate={onScheduleUpdate}
          />
        </ModuleWrapper>
      ) : selectedModule === 'shifts' ? (
        <ModuleWrapper>
          <ShiftScheduleManager />
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
      ) : selectedModule === 'statuses' ? (
        <ModuleWrapper>
          <StatusesManager />
        </ModuleWrapper>
      ) : selectedModule === 'background' ? (
        <ModuleWrapper>
          <BackgroundManager />
        </ModuleWrapper>
      ) : selectedModule === 'management' ? (
        <ModuleWrapper>
          <ManagementManager />
        </ModuleWrapper>
      ) : (
        <div className="w-full px-8 md:pl-32 md:pr-10 py-10">
          <div className="max-w-[2400px] mx-auto w-full">
            {/* Settings Header */}
            <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
                  <SettingsIcon className="w-4 h-4 text-[#8B5CF6]" />
                  <p className="text-[10px] font-black text-[#8B5CF6] tracking-[0.4em] uppercase">SYSTEM CONFIGURATION</p>
                </div>
                <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                  NASTAVENÍ <span className="text-white/20">SYSTÉMU</span>
                </h1>
              </div>
            </header>

            {/* Settings Grid */}
            <div className="pb-20 px-2">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-8 gap-y-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
              >
                {settings.map((setting, index) => {
                  const Icon = setting.icon;
                  return (
                    <motion.div
                      key={setting.id}
                      layout
                      onClick={() => setSelectedModule(setting.id)}
                      className="relative group cursor-pointer h-[340px] w-full"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ 
                        scale: 1.02, 
                        zIndex: 50,
                        transition: { duration: 0.3 }
                      }}
                      style={{ zIndex: 1 }}
                      transition={{ delay: index * 0.08 }}
                    >
                      {/* Main Card Container */}
                      <motion.div 
                        className="absolute inset-0 z-0 rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] border-white/5 group-hover:bg-white/[0.06] group-hover:border-white/10"
                        whileHover={{
                          boxShadow: `0 15px 35px -10px ${setting.accentColor}40, inset 0 0 30px ${setting.accentColor}10`,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        
                        {/* Dynamic State Glow Layer */}
                        <motion.div 
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] transition-all duration-500 pointer-events-none"
                          initial={{ backgroundColor: '#64748B' }}
                          whileHover={{ backgroundColor: setting.accentColor }}
                          animate={{ 
                            opacity: [0.08, 0.12, 0.08]
                          }}
                          transition={{ 
                            opacity: { duration: 4, repeat: Infinity },
                            backgroundColor: { duration: 0.4 }
                          }}
                        />

                        {/* Hover Gradient Wave Animation */}
                        <motion.div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                          style={{
                            background: `linear-gradient(135deg, ${setting.accentColor}15, transparent 50%, ${setting.accentColor}15)`,
                          }}
                          animate={{
                            backgroundPosition: ['0% 0%', '100% 100%'],
                          }}
                          transition={{
                            backgroundPosition: { duration: 3, repeat: Infinity, ease: 'linear' },
                          }}
                        />

                        {/* Animated Border Glow */}
                        <motion.div
                          className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                          animate={{
                            boxShadow: [
                              `inset 0 0 0 1px ${setting.accentColor}00`,
                              `inset 0 0 20px 1px ${setting.accentColor}30`,
                              `inset 0 0 0 1px ${setting.accentColor}00`,
                            ],
                          }}
                          transition={{
                            boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                          }}
                        />
                      </motion.div>

                      {/* Content Container */}
                      <div className="relative h-full w-full z-10 p-6 flex flex-col">
                        
                        {/* Header */}
                        <div className="w-full flex justify-center items-center min-w-0 gap-2 shrink-0 mb-4">
                          <div className="flex flex-col min-w-0 flex-1 text-center">
                            <motion.p 
                              className="text-[9px] font-black tracking-[0.3em] uppercase leading-none mb-2 truncate transition-colors"
                              initial={{ color: '#64748B' }}
                              whileHover={{ color: setting.accentColor }}
                            >
                              MODUL
                            </motion.p>
                            <motion.h3 
                              className="text-lg font-bold tracking-tight uppercase leading-none transition-colors truncate"
                              initial={{ color: 'rgba(255, 255, 255, 0.60)' }}
                              whileHover={{ color: '#FFFFFF' }}
                            >
                              {setting.title}
                            </motion.h3>
                          </div>
                        </div>

                        {/* Central Content Wrapper */}
                        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                          {/* Icon Container */}
                          <motion.div
                            className="relative flex items-center justify-center mb-4"
                            initial={{ scale: 1 }}
                            whileHover={{ scale: 1.08 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                          >
                            {/* Main Icon Box */}
                            <motion.div
                              className="w-24 h-24 rounded-2xl border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300"
                              style={{
                                background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))`,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1)`,
                              }}
                              whileHover={{
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 30px ${setting.accentColor}50`,
                              }}
                              transition={{ duration: 0.3 }}
                            >
                              <motion.div
                                initial={{ color: setting.accentColor }}
                                whileHover={{ color: setting.accentColor }}
                                transition={{ duration: 0.3 }}
                              >
                                <Icon className="w-16 h-16" strokeWidth={1.5} />
                              </motion.div>
                            </motion.div>
                          </motion.div>

                          {/* Description */}
                          <motion.p 
                            className="text-xs leading-relaxed text-center transition-colors"
                            initial={{ color: 'rgba(255, 255, 255, 0.30)' }}
                            whileHover={{ color: 'rgba(255, 255, 255, 0.50)' }}
                          >
                            {setting.description}
                          </motion.p>
                        </div>

                        {/* Bottom Info */}
                        <div className="w-full space-y-3 shrink-0">
                          <div className="flex items-center justify-center pt-3 border-t border-white/5">
                            <motion.div
                              className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              animate={{ x: [0, 4, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <ArrowRight className="w-4 h-4" style={{ color: setting.accentColor }} />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
