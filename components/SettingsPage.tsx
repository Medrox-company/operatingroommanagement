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
      color: 'from-blue-500 to-cyan-500',
      accentColor: '#0EA5E9',
      glowColor: 'rgba(14, 165, 233, 0.4)',
    },
    {
      id: 'schedule',
      title: 'Rozpis operačních sálů',
      description: 'Plánování a správa rozpisu sálů',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      accentColor: '#A855F7',
      glowColor: 'rgba(168, 85, 247, 0.4)',
    },
    {
      id: 'staff',
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      accentColor: '#10B981',
      glowColor: 'rgba(16, 185, 129, 0.4)',
    },
    {
      id: 'departments',
      title: 'Oddělení',
      description: 'Správa oddělení a jejich konfigurací',
      icon: Stethoscope,
      color: 'from-orange-500 to-red-500',
      accentColor: '#F97316',
      glowColor: 'rgba(249, 115, 22, 0.4)',
    },
    {
      id: 'contacts',
      title: 'Kontakty',
      description: 'Správa kontaktů a komunikace',
      icon: Phone,
      color: 'from-indigo-500 to-blue-500',
      accentColor: '#6366F1',
      glowColor: 'rgba(99, 102, 241, 0.4)',
    },
    {
      id: 'calendar',
      title: 'Kalendář',
      description: 'Správa kalendáře a událostí',
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      accentColor: '#EAB308',
      glowColor: 'rgba(234, 179, 8, 0.4)',
    },
    {
      id: 'settings',
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      color: 'from-slate-500 to-gray-500',
      accentColor: '#64748B',
      glowColor: 'rgba(100, 116, 139, 0.4)',
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
          >
            {settings.map((setting, index) => {
              const Icon = setting.icon;
              return (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
                  whileHover={{ y: -12, transition: { duration: 0.3 } }}
                  className="group relative cursor-pointer h-full"
                >
                  {/* Multi-layer Glow Effect */}
                  <motion.div
                    className="absolute -inset-0.5 z-0 rounded-[1.75rem] blur-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${setting.glowColor}, transparent 80%)`,
                    }}
                  />

                  {/* Secondary Accent Glow */}
                  <motion.div
                    className="absolute -inset-1 z-0 rounded-[1.75rem] blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${setting.glowColor}, transparent)`,
                    }}
                  />

                  {/* Main Card Container */}
                  <div className="relative z-10 h-full rounded-[1.75rem] border border-white/5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl overflow-hidden group-hover:border-white/15 transition-all duration-300 p-8 flex flex-col items-center justify-center text-center shadow-2xl"
                    style={{
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 60px rgba(0,0,0,0.3)`,
                    }}
                  >
                    {/* Animated Gradient Underlay */}
                    <motion.div 
                      className={`absolute inset-0 bg-gradient-to-br ${setting.color} rounded-[1.75rem] opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 pointer-events-none`}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.04 }}
                    />

                    {/* Top Accent Line */}
                    <motion.div
                      className="absolute top-0 left-8 right-8 h-px z-20"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        background: `linear-gradient(90deg, transparent, ${setting.accentColor}60, transparent)`,
                      }}
                    />

                    {/* Content Container */}
                    <div className="relative z-20 flex flex-col items-center h-full justify-center gap-6 w-full">
                      {/* Icon Container - Enhanced Design */}
                      <motion.div
                        className="relative flex items-center justify-center"
                        initial={{ scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        {/* Icon Background Rings */}
                        <motion.div
                          className="absolute w-32 h-32 rounded-full border border-white/10 group-hover:border-white/20 transition-colors"
                          animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        <motion.div
                          className="absolute w-24 h-24 rounded-full border border-white/5 group-hover:border-white/15 transition-colors"
                          animate={{
                            scale: [1.05, 1, 1.05],
                            opacity: [0.5, 0.3, 0.5],
                          }}
                          transition={{ duration: 3, repeat: Infinity, delay: 0.2 }}
                        />

                        {/* Main Icon Box */}
                        <motion.div
                          className="relative w-28 h-28 rounded-3xl border-2 border-white/15 flex items-center justify-center group-hover:border-white/30 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px rgba(0,0,0,0.2)`,
                          }}
                          whileHover={{
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 40px ${setting.glowColor}`,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <motion.div
                            initial={{ color: '#94A3B8' }}
                            whileHover={{ color: setting.accentColor }}
                            transition={{ duration: 0.4 }}
                          >
                            <Icon className="w-14 h-14 drop-shadow-lg" strokeWidth={1.5} />
                          </motion.div>
                        </motion.div>
                      </motion.div>

                      {/* Text Content - Enhanced Typography */}
                      <div className="space-y-3">
                        <motion.h3 
                          className="text-2xl font-black tracking-tight text-white group-hover:text-white transition-colors duration-300"
                          initial={{ opacity: 0.9 }}
                          whileHover={{ opacity: 1 }}
                        >
                          {setting.title}
                        </motion.h3>
                        <motion.p 
                          className="text-sm text-white/45 group-hover:text-white/55 transition-colors duration-300 leading-relaxed font-medium"
                          initial={{ opacity: 0.7 }}
                          whileHover={{ opacity: 0.85 }}
                        >
                          {setting.description}
                        </motion.p>
                      </div>

                      {/* Footer Divider & CTA */}
                      <motion.div 
                        className="w-full mt-6 pt-6 border-t border-white/5 group-hover:border-white/10 transition-colors duration-300"
                        initial={{ opacity: 0.5 }}
                        whileHover={{ opacity: 1 }}
                      >
                        <motion.div
                          className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          animate={{ x: [0, 6, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <ArrowRight className="w-5 h-5" style={{ color: setting.accentColor }} />
                        </motion.div>
                      </motion.div>
                    </div>

                    {/* Corner Accent Dots */}
                    <motion.div
                      className="absolute top-4 right-4 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: setting.accentColor }}
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 10 }}
                    />
                    <motion.div
                      className="absolute bottom-4 left-4 w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: setting.accentColor }}
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 10, delay: 0.1 }}
                    />
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
