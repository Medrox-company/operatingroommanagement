import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const settings = [
    {
      id: 'rooms',
      title: 'Operační sály',
      description: 'Správa a konfigurace operačních sálů',
      icon: Building2,
      accentColor: '#00D8C1',
      glowColor: '#00D8C1',
    },
    {
      id: 'schedule',
      title: 'Rozpis operačních sálů',
      description: 'Plánování a správa rozpisu sálů',
      icon: Calendar,
      accentColor: '#7C3AED',
      glowColor: '#7C3AED',
    },
    {
      id: 'staff',
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      accentColor: '#06B6D4',
      glowColor: '#06B6D4',
    },
    {
      id: 'departments',
      title: 'Oddělení',
      description: 'Správa oddělení a jejich konfigurací',
      icon: Stethoscope,
      accentColor: '#EC4899',
      glowColor: '#EC4899',
    },
    {
      id: 'contacts',
      title: 'Kontakty',
      description: 'Správa kontaktů a komunikace',
      icon: Phone,
      accentColor: '#3B82F6',
      glowColor: '#3B82F6',
    },
    {
      id: 'calendar',
      title: 'Kalendář',
      description: 'Správa kalendáře a událostí',
      icon: Clock,
      accentColor: '#F59E0B',
      glowColor: '#F59E0B',
    },
    {
      id: 'settings',
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      accentColor: '#8B5CF6',
      glowColor: '#8B5CF6',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full overflow-y-auto hide-scrollbar px-8 md:pl-32 md:pr-10 py-10"
    >
      <div className="max-w-[2400px] mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col gap-4 mb-16">
          <div className="flex items-center justify-start gap-3 mb-2 opacity-60">
            <SettingsIcon className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">NASTAVENÍ SYSTÉMU</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            NASTAVENÍ <span className="text-white/20">SPRÁVY</span>
          </h1>
          <p className="text-white/40 text-sm mt-4 max-w-xl">
            Nakonfigurujte a spravujte všechny aspekty operačních sálů, personálu a rozpisu.
          </p>
        </header>

        {/* Settings Grid */}
        <div className="pb-20 px-2">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
                  onClick={() => {}}
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
                  {/* Main Card Container - Exact RoomCard Design */}
                  <motion.div 
                    className="absolute inset-0 z-0 rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] border-white/5 group-hover:bg-white/[0.06] group-hover:border-white/10"
                    whileHover={{
                      boxShadow: `0 15px 35px -10px ${setting.accentColor}40, inset 0 0 30px ${setting.accentColor}10`,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    
                    {/* Dynamic State Glow Layer - Gray inactive, Color on hover with multiple glows */}
                    <motion.div 
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] transition-all duration-500 pointer-events-none"
                      initial={{ backgroundColor: '#64748B' }}
                      whileHover={{ backgroundColor: setting.glowColor }}
                      animate={{ 
                        opacity: [0.08, 0.12, 0.08]
                      }}
                      transition={{ 
                        opacity: { duration: 4, repeat: Infinity },
                        backgroundColor: { duration: 0.4 }
                      }}
                    />

                    {/* Secondary Radiant Glow - Creates dual glow effect */}
                    <motion.div
                      className="absolute left-1/2 top-1/4 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle, ${setting.glowColor}80, transparent)`,
                      }}
                    />

                    {/* Hover Gradient Wave Animation - Multiple Direction Waves */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 2.5, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(45deg, ${setting.glowColor}10, transparent 25%, transparent 50%, ${setting.glowColor}10 75%, ${setting.glowColor}05)`,
                        backgroundSize: '200% 200%',
                      }}
                    />

                    {/* Counter-Wave Animation for dynamic effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      animate={{
                        backgroundPosition: ['100% 100%', '0% 0%'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 3.5, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(-45deg, transparent, ${setting.glowColor}08, transparent)`,
                        backgroundSize: '300% 300%',
                      }}
                    />

                    {/* Animated Border Glow with Pulse */}
                    <motion.div
                      className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
                      animate={{
                        boxShadow: [
                          `inset 0 0 0 1px ${setting.glowColor}00, inset 0 0 10px ${setting.glowColor}10`,
                          `inset 0 0 30px 2px ${setting.glowColor}40, inset 0 0 60px ${setting.glowColor}20`,
                          `inset 0 0 0 1px ${setting.glowColor}00, inset 0 0 10px ${setting.glowColor}10`,
                        ],
                      }}
                      transition={{
                        boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                      }}
                    />

                    {/* Shimmer Effect - Light streak */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-50 pointer-events-none"
                      animate={{
                        backgroundPosition: ['-1000px 0', '1000px 0'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(90deg, transparent, ${setting.glowColor}40, transparent)`,
                        backgroundSize: '200% 100%',
                      }}
                    />
                  </motion.div>

                  {/* Content Container */}
                  <div className="relative h-full w-full z-10 p-6 flex flex-col">
                    
                    {/* Header */}
                    <div className="w-full flex justify-between items-start min-w-0 gap-2 shrink-0 mb-4">
                      <div className="flex flex-col min-w-0 flex-1">
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

                    {/* Central Content Wrapper (takes up remaining space and centers its content) */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                      {/* Icon Container */}
                      <motion.div
                        className="relative flex items-center justify-center mb-4"
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.08 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        <motion.div
                          className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1)`,
                          }}
                          whileHover={{
                            scale: 1.15,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 30px ${setting.glowColor}60, inset 0 0 20px ${setting.glowColor}30`,
                          }}
                          transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
                        >
                          <motion.div
                            initial={{ color: '#94A3B8' }}
                            whileHover={{ color: setting.glowColor }}
                            animate={{
                              textShadow: [
                                `0 0 0px ${setting.glowColor}00`,
                                `0 0 0px ${setting.glowColor}00`,
                              ],
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <Icon className="w-8 h-8" strokeWidth={1.5} />
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
    </motion.div>
  );
};

export default SettingsPage;
