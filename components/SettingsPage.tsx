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
    },
    {
      id: 'schedule',
      title: 'Rozpis operačních sálů',
      description: 'Plánování a správa rozpisu sálů',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      accentColor: '#A855F7',
    },
    {
      id: 'staff',
      title: 'Personál',
      description: 'Správa zaměstnanců a jejich přiřazení',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      accentColor: '#10B981',
    },
    {
      id: 'departments',
      title: 'Oddělení',
      description: 'Správa oddělení a jejich konfigurací',
      icon: Stethoscope,
      color: 'from-orange-500 to-red-500',
      accentColor: '#F97316',
    },
    {
      id: 'contacts',
      title: 'Kontakty',
      description: 'Správa kontaktů a komunikace',
      icon: Phone,
      color: 'from-indigo-500 to-blue-500',
      accentColor: '#6366F1',
    },
    {
      id: 'calendar',
      title: 'Kalendář',
      description: 'Správa kalendáře a událostí',
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      accentColor: '#EAB308',
    },
    {
      id: 'settings',
      title: 'Nastavení',
      description: 'Konfigurace systému a preferencí',
      icon: SettingsIcon,
      color: 'from-slate-500 to-gray-500',
      accentColor: '#64748B',
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
            transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
          >
            {settings.map((setting, index) => {
              const Icon = setting.icon;
              return (
                <motion.div
                  key={setting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="group relative cursor-pointer"
                >
                  {/* Glow effect on hover */}
                  <motion.div
                    className="absolute -inset-1 z-0 rounded-[1.75rem] blur-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${setting.accentColor}40, ${setting.accentColor}20)`,
                    }}
                  />

                  {/* Main Card */}
                  <div className="relative z-10 h-full rounded-[1.75rem] border border-white/10 bg-white/[0.04] backdrop-blur-[60px] overflow-hidden group-hover:border-white/20 transition-all duration-300 p-8 flex flex-col items-center justify-center text-center">
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${setting.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />

                    {/* Content */}
                    <div className="relative z-20 flex flex-col items-center h-full justify-center gap-4">
                      {/* Icon - Large and Centered */}
                      <motion.div
                        className="w-24 h-24 rounded-3xl border-2 border-white/20 bg-white/[0.08] flex items-center justify-center group-hover:border-white/40 transition-all duration-300"
                        style={{
                          boxShadow: `0 0 0 1px ${setting.accentColor}00`,
                        }}
                        whileHover={{
                          scale: 1.1,
                          boxShadow: `0 0 30px ${setting.accentColor}50`,
                        }}
                      >
                        <Icon className="w-12 h-12 transition-colors" style={{ color: setting.accentColor }} />
                      </motion.div>

                      {/* Text Content */}
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-white mb-1.5 group-hover:text-white/95 transition-colors">
                          {setting.title}
                        </h3>
                        <p className="text-xs text-white/40 group-hover:text-white/50 transition-colors leading-relaxed">
                          {setting.description}
                        </p>
                      </div>

                      {/* Footer Arrow */}
                      <div className="mt-4 pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors w-full">
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
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
