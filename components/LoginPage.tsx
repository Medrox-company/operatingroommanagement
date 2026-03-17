import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Shield, User } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user' | null>(null);

  const handleQuickLogin = (role: 'admin' | 'user') => {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail('admin@nemocnice.cz');
      setPassword('admin123');
    } else {
      setEmail('user@nemocnice.cz');
      setPassword('user123');
    }
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
            style={{ 
              background: 'linear-gradient(135deg, #00D8C1 0%, #00A896 100%)',
              boxShadow: '0 0 60px rgba(0,216,193,0.3)'
            }}
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Operační sály</h1>
          <p className="text-white/40 text-sm tracking-wide">CHIRURGICKÝ BLOK • PŘIHLÁŠENÍ</p>
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
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                  selectedRole === 'admin'
                    ? 'bg-[#00D8C1]/20 border-[#00D8C1]/50 text-[#00D8C1]'
                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <Shield className="w-6 h-6" />
                <span className="text-sm font-medium">Administrátor</span>
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleQuickLogin('user')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                  selectedRole === 'user'
                    ? 'bg-[#A855F7]/20 border-[#A855F7]/50 text-[#A855F7]'
                    : 'bg-white/[0.02] border-white/10 text-white/60 hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <User className="w-6 h-6" />
                <span className="text-sm font-medium">Uživatel</span>
              </motion.button>
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
            <p className="text-white/30 text-xs text-center">
              Demo přístupy: <br />
              <span className="text-white/50">admin@nemocnice.cz / admin123</span><br />
              <span className="text-white/50">user@nemocnice.cz / user123</span>
            </p>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          Operační sály v{new Date().getFullYear()} • Všechna práva vyhrazena
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
