import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Calendar, Users, Stethoscope, Settings as SettingsIcon, ArrowRight, Phone, Clock, ChevronRight } from 'lucide-react';

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
        <header className="flex flex-col gap-4 mb-20">
          <motion.div 
            className="flex items-center justify-start gap-3 mb-2 opacity-60"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SettingsIcon className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">NASTAVENÍ SYSTÉMU</p>
          </motion.div>
          <motion.h1 
            className="text-7xl font-black tracking-tighter uppercase leading-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            NASTAVENÍ <span className="text-white/20">SPRÁVY</span>
          </motion.h1>
          <motion.p 
            className="text-white/40 text-sm mt-4 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Nakonfigurujte a spravujte všechny aspekty operačních sálů, personálu a rozpisu.
          </motion.p>
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
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.02, 
                    zIndex: 50,
                    transition: { duration: 0.3 }
                  }}
                  style={{ zIndex: 1 }}
                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* Main Card Container */}
                  <motion.div 
                    className="absolute inset-0 z-0 rounded-[2.5rem] border shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] border-white/5 group-hover:bg-white/[0.06] group-hover:border-white/10"
                    whileHover={{
                      boxShadow: `0 20px 45px -15px ${setting.accentColor}50, inset 0 0 40px ${setting.accentColor}15`,
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    
                    {/* Primary Glow Layer */}
                    <motion.div 
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] transition-all duration-500 pointer-events-none"
                      initial={{ backgroundColor: '#64748B' }}
                      whileHover={{ backgroundColor: setting.glowColor }}
                      animate={{ 
                        opacity: [0.08, 0.14, 0.08]
                      }}
                      transition={{ 
                        opacity: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
                        backgroundColor: { duration: 0.4 }
                      }}
                    />

                    {/* Secondary Radiant Glow */}
                    <motion.div
                      className="absolute left-1/2 top-1/3 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle, ${setting.glowColor}90, transparent)`,
                      }}
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                      }}
                    />

                    {/* Wave Animation - Forward */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 2.5, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(45deg, ${setting.glowColor}12, transparent 25%, transparent 50%, ${setting.glowColor}12 75%, ${setting.glowColor}08)`,
                        backgroundSize: '200% 200%',
                      }}
                    />

                    {/* Wave Animation - Reverse */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                      animate={{
                        backgroundPosition: ['100% 100%', '0% 0%'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 3.5, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(-45deg, transparent, ${setting.glowColor}10, transparent)`,
                        backgroundSize: '300% 300%',
                      }}
                    />

                    {/* Animated Border Glow */}
                    <motion.div
                      className="absolute inset-0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-400"
                      animate={{
                        boxShadow: [
                          `inset 0 0 0 1px ${setting.glowColor}00, inset 0 0 10px ${setting.glowColor}12`,
                          `inset 0 0 35px 2px ${setting.glowColor}50, inset 0 0 70px ${setting.glowColor}25`,
                          `inset 0 0 0 1px ${setting.glowColor}00, inset 0 0 10px ${setting.glowColor}12`,
                        ],
                      }}
                      transition={{
                        boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                      }}
                    />

                    {/* Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-60 pointer-events-none"
                      animate={{
                        backgroundPosition: ['-1000px 0', '1000px 0'],
                      }}
                      transition={{
                        backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
                      }}
                      style={{
                        background: `linear-gradient(90deg, transparent, ${setting.glowColor}50, transparent)`,
                        backgroundSize: '200% 100%',
                      }}
                    />

                    {/* Particle Dots on Hover */}
                    <motion.div
                      className="absolute inset-0 rounded-[2.5rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        backgroundImage: `
                          radial-gradient(circle at 5% 5%, ${setting.glowColor}, transparent 1px),
                          radial-gradient(circle at 95% 5%, ${setting.glowColor}, transparent 1px),
                          radial-gradient(circle at 5% 95%, ${setting.glowColor}, transparent 1px),
                          radial-gradient(circle at 95% 95%, ${setting.glowColor}, transparent 1px)
                        `,
                        backgroundSize: '100% 100%',
                        backgroundPosition: '0 0',
                        backgroundRepeat: 'no-repeat',
                      }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                      }}
                    />
                  </motion.div>

                  {/* Content Container */}
                  <div className="relative h-full w-full z-10 p-6 flex flex-col">
                    
                    {/* Header Section */}
                    <motion.div 
                      className="w-full flex justify-between items-start min-w-0 gap-2 shrink-0 mb-4"
                      initial={{ opacity: 0, y: -10 }}
                      whileHover={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { duration: 0.3 }
                      }}
                      transition={{ delay: index * 0.08 + 0.1 }}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <motion.span 
                          className="text-[8px] font-black tracking-[0.35em] uppercase leading-none mb-3 inline-block transition-all"
                          initial={{ color: '#64748B', letterSpacing: '0.35em' }}
                          whileHover={{ 
                            color: setting.accentColor,
                            letterSpacing: '0.4em',
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          MODUL
                        </motion.span>
                        <motion.h3 
                          className="text-xl font-black tracking-tight uppercase leading-tight transition-all"
                          initial={{ color: 'rgba(255, 255, 255, 0.55)' }}
                          whileHover={{ 
                            color: '#FFFFFF',
                            textShadow: `0 0 20px ${setting.accentColor}40`,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {setting.title}
                        </motion.h3>
                      </div>
                    </motion.div>

                    {/* Central Icon & Description */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-5">
                      {/* Icon Container with Background Circle */}
                      <motion.div
                        className="relative flex items-center justify-center"
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        {/* Background Circle - Animated on Hover */}
                        <motion.div
                          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.1, 0.3, 0.1],
                          }}
                          transition={{
                            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                            opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                          }}
                          style={{
                            background: `radial-gradient(circle, ${setting.glowColor}60, transparent)`,
                            width: '100px',
                            height: '100px',
                          }}
                        />

                        {/* Main Icon Box */}
                        <motion.div
                          className="relative w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center group-hover:border-white/25 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1)`,
                          }}
                          whileHover={{
                            scale: 1.18,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 40px ${setting.glowColor}70, inset 0 0 25px ${setting.glowColor}40`,
                          }}
                          transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
                        >
                          <motion.div
                            initial={{ color: '#94A3B8', rotate: 0 }}
                            whileHover={{ 
                              color: setting.glowColor,
                              rotate: [0, 180, 360],
                            }}
                            transition={{ 
                              color: { duration: 0.3 },
                              rotate: { duration: 0.6, ease: 'easeOut' }
                            }}
                          >
                            <Icon className="w-8 h-8" strokeWidth={1.5} />
                          </motion.div>
                        </motion.div>
                      </motion.div>

                      {/* Description with Gradient on Hover */}
                      <motion.p 
                        className="text-xs leading-relaxed text-center transition-all font-medium"
                        initial={{ color: 'rgba(255, 255, 255, 0.28)' }}
                        whileHover={{ color: 'rgba(255, 255, 255, 0.65)' }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                      >
                        {setting.description}
                      </motion.p>
                    </div>

                    {/* Bottom CTA */}
                    <motion.div 
                      className="w-full space-y-3 shrink-0 pt-2"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1, transition: { duration: 0.3 } }}
                      transition={{ delay: index * 0.08 + 0.2 }}
                    >
                      <div className="flex items-center justify-center pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                        <motion.button
                          className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg"
                          style={{
                            background: `${setting.glowColor}10`,
                            border: `1px solid ${setting.glowColor}20`,
                          }}
                          whileHover={{
                            background: `${setting.glowColor}20`,
                            border: `1px solid ${setting.glowColor}40`,
                            scale: 1.05,
                          }}
                          animate={{ x: [0, 4, 0] }}
                          transition={{ x: { duration: 2, repeat: Infinity } }}
                        >
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: setting.glowColor }} />
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: setting.glowColor }}>
                            Konfig
                          </span>
                        </motion.button>
                      </div>
                    </motion.div>
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
