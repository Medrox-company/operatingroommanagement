import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, AlertCircle,
  Shield, User, Stethoscope, Activity, Briefcase, ClipboardList,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

type QuickRoleId = 'admin' | 'user' | 'aro' | 'cos' | 'management' | 'primar';

/**
 * DEMO účty — jen pro ukázku. Přihlašování probíhá server-side (rate-limited
 * /api/auth/login) proti bcrypt hashím v DB, takže i kdyby někdo tato hesla
 * zneužil, jsou chráněna limitem pokusů. V PRODUKCI je nutné:
 *   1) tyto účty deaktivovat (app_users.is_active = false) nebo změnit hesla,
 *   2) odstranit QUICK_ROLES níže, aby se demo hesla nevystavovala v UI.
 */
const QUICK_ROLES: Array<{
  id: QuickRoleId;
  label: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { id: 'admin',      label: 'Administrátor', email: 'admin@nemocnice.cz',      password: 'admin123',  icon: Shield,        color: '#00D8C1' },
  { id: 'aro',        label: 'ARO',           email: 'aro@nemocnice.cz',        password: 'aro123',    icon: Activity,      color: '#EF4444' },
  { id: 'cos',        label: 'COS',           email: 'cos@nemocnice.cz',        password: 'cos123',    icon: Stethoscope,   color: '#06B6D4' },
  { id: 'management', label: 'Management',    email: 'management@nemocnice.cz', password: 'mgmt123',   icon: Briefcase,     color: '#F59E0B' },
  { id: 'primar',     label: 'Primariát',     email: 'primar@nemocnice.cz',     password: 'primar123', icon: ClipboardList, color: '#A855F7' },
  { id: 'user',       label: 'Uživatel',      email: 'user@nemocnice.cz',       password: 'user123',   icon: User,          color: '#64748B' },
];

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<QuickRoleId | null>(null);

  const handleQuickLogin = (roleId: QuickRoleId) => {
    const role = QUICK_ROLES.find(r => r.id === roleId);
    if (!role) return;
    setSelectedRole(roleId);
    setEmail(role.email);
    setPassword(role.password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      onLoginSuccess?.();
    } else {
      setError(result.error || 'Přihlášení se nezdařilo');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-200px] w-[900px] h-[900px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-300px] right-[-300px] w-[1000px] h-[1000px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00D8C1 0%, transparent 70%)' }} />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center mb-4"
          >
            <img
              src="/logo.png"
              alt="Operating Room Manager logo"
              className="w-32 h-32 object-contain"
              style={{ filter: 'drop-shadow(0 0 24px rgba(0,216,193,0.25))' }}
            />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Operating Room Manager</h1>
          <p className="text-white/40 text-sm tracking-wide text-[10px] leading-none h-0 overflow-hidden"></p>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8"
        >
          {/* Quick Role Selection */}
          <div className="mb-6">
            <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-3">Rychlé přihlášení</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {QUICK_ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <motion.button
                    key={role.id}
                    type="button"
                    onClick={() => handleQuickLogin(role.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-3 rounded-2xl border transition-all flex flex-col items-center gap-1.5 min-h-[84px]"
                    style={{
                      background: isSelected ? `${role.color}22` : 'rgba(255,255,255,0.02)',
                      borderColor: isSelected ? `${role.color}80` : 'rgba(255,255,255,0.1)',
                      color: isSelected ? role.color : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium leading-tight text-center">{role.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs uppercase tracking-widest">nebo</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="text-white/50 text-xs font-medium uppercase tracking-widest mb-2 block">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D8C1]/50 focus:ring-1 focus:ring-[#00D8C1]/30 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-white/50 text-xs font-medium uppercase tracking-widest mb-2 block">
                Heslo
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00D8C1]/50 focus:ring-1 focus:ring-[#00D8C1]/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || !email || !password}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #00D8C1 0%, #00A896 100%)',
                boxShadow: '0 0 30px rgba(0,216,193,0.3)'
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Přihlašování...
                </span>
              ) : (
                'Přihlásit se'
              )}
            </motion.button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <p className="text-white/30 text-[11px] text-center leading-relaxed">
              Demo přístupy (klikni výše pro rychlé vyplnění):<br />
              <span className="text-white/50">admin · aro · cos · management · primar · user</span><br />
              <span className="text-white/40">@nemocnice.cz — heslo: <code>role123</code> (mgmt123 pro management)</span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Operating Room Manager {new Date().getFullYear()} • Všechna práva vyhrazena
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
