import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, AppModule } from '../contexts/AuthContext';
import { 
  Shield, Settings, LayoutGrid, Calendar, BarChart3, 
  Users, Bell, Power, Check, X, AlertTriangle,
  ChevronRight, Lock
} from 'lucide-react';
import PageLayout from './PageLayout';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutGrid,
  Calendar,
  BarChart3,
  Users,
  Bell,
  Settings,
  Shield,
};

interface AdminModuleProps {
  onClose?: () => void;
}

const AdminModule: React.FC<AdminModuleProps> = ({ onClose }) => {
  const { user, isAdmin, modules, toggleModule, logout } = useAuth();
  const [togglingModule, setTogglingModule] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!isAdmin) {
    return (
      <PageLayout title="Přístup odepřen" icon={Lock} accentColor="#EF4444">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Lock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Přístup odepřen</h2>
            <p className="text-white/50">Tato sekce je dostupná pouze pro administrátory.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleToggleModule = async (moduleId: string, currentState: boolean) => {
    // Prevent disabling settings module
    if (moduleId === 'settings') return;
    
    setTogglingModule(moduleId);
    await toggleModule(moduleId, !currentState);
    setTogglingModule(null);
  };

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <PageLayout
      title="Administrace"
      eyebrow="SYSTEM ADMIN"
      icon={Shield}
      accentColor="#00D8C1"
      description="Správa modulů a nastavení systému"
      actions={
        onClose && (
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.08] transition-all ios-tap"
            aria-label="Zavřít administraci"
          >
            <X className="w-5 h-5" />
          </button>
        )
      }
    >
      <div className="max-w-4xl mx-auto">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#00D8C1]/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#00D8C1]" />
              </div>
              <div>
                <p className="text-white font-semibold">{user?.name}</p>
                <p className="text-white/40 text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-[#00D8C1]/20 text-[#00D8C1] text-xs font-medium uppercase tracking-wider">
                {user?.role === 'admin' ? 'Administrátor' : 'Uživatel'}
              </span>
              <motion.button
                onClick={() => setShowLogoutConfirm(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all"
              >
                Odhlásit
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Modules Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-white/50" />
            <h2 className="text-lg font-semibold text-white">Správa modulů</h2>
          </div>
          <p className="text-white/40 text-sm mb-6">
            Zapněte nebo vypněte jednotlivé moduly aplikace pro uživatele. Administrátor má vždy přístup ke všem modulům.
          </p>

          <div className="space-y-3">
            {modules.map((module, index) => {
              const IconComponent = iconMap[module.icon || 'Settings'] || Settings;
              const isDisabled = module.id === 'settings'; // Can't disable settings
              
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    module.is_enabled
                      ? 'bg-white/[0.02] border-white/10'
                      : 'bg-white/[0.01] border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                      style={{ 
                        backgroundColor: module.is_enabled ? `${module.accent_color}20` : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <IconComponent 
                        className="w-5 h-5 transition-colors"
                        style={{ color: module.is_enabled ? module.accent_color || '#fff' : 'rgba(255,255,255,0.3)' }}
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium">{module.name}</p>
                      <p className="text-white/40 text-sm">{module.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isDisabled && (
                      <span className="text-white/30 text-xs">Vždy aktivní</span>
                    )}
                    <motion.button
                      onClick={() => !isDisabled && handleToggleModule(module.id, module.is_enabled)}
                      disabled={isDisabled || togglingModule === module.id}
                      whileHover={!isDisabled ? { scale: 1.05 } : {}}
                      whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      className={`relative w-14 h-8 rounded-full transition-all ${
                        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      } ${
                        module.is_enabled
                          ? 'bg-[#00D8C1]'
                          : 'bg-white/10'
                      }`}
                    >
                      <motion.div
                        animate={{ x: module.is_enabled ? 24 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center"
                      >
                        {togglingModule === module.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-4 h-4 border-2 border-[#00D8C1]/30 border-t-[#00D8C1] rounded-full"
                          />
                        ) : module.is_enabled ? (
                          <Check className="w-3 h-3 text-[#00D8C1]" />
                        ) : (
                          <X className="w-3 h-3 text-white/30" />
                        )}
                      </motion.div>
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Warning Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium text-sm">Upozornění</p>
            <p className="text-amber-300/70 text-sm mt-1">
              Změny v nastavení modulů se projeví okamžitě pro všechny uživatele (kromě administrátorů, kteří mají vždy plný přístup).
            </p>
          </div>
        </motion.div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a24] border border-white/10 rounded-3xl p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Power className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Odhlásit se?</h3>
                <p className="text-white/50 text-sm mb-6">
                  Opravdu se chcete odhlásit ze systému?
                </p>
                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowLogoutConfirm(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white font-medium hover:bg-white/[0.08] transition-all"
                  >
                    Zrušit
                  </motion.button>
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
                  >
                    Odhlásit
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default AdminModule;
