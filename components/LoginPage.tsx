import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Shield, User, Loader2 } from 'lucide-react';

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
      setError(result.error || 'Prihlaseni se nezdarilo');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[100px]" />
        <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-accent/3 blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border-subtle)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border-subtle)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-5 shadow-lg shadow-accent/20">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1.5">Operacni saly</h1>
          <p className="text-text-muted text-sm tracking-wide">Chirurgicky blok</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-6 shadow-xl">
          {/* Quick Role Selection */}
          <div className="mb-5">
            <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-3">Rychle prihlaseni</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                  selectedRole === 'admin'
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-surface-2 border-border-subtle text-text-secondary hover:bg-surface-3 hover:border-border-default'
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-sm font-medium">Administrator</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('user')}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                  selectedRole === 'user'
                    ? 'bg-info/10 border-info/40 text-info'
                    : 'bg-surface-2 border-border-subtle text-text-secondary hover:bg-surface-3 hover:border-border-default'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Uzivatel</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-text-muted text-xs uppercase tracking-wider">nebo</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="text-text-secondary text-xs font-medium mb-2 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-text-secondary text-xs font-medium mb-2 block">Heslo</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="........"
                  className="input pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="btn btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Prihlasovani...
                </span>
              ) : (
                'Prihlasit se'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-5 p-3 bg-surface-2 border border-border-subtle rounded-xl">
            <p className="text-text-muted text-xs text-center leading-relaxed">
              Demo pristupy:<br />
              <span className="text-text-tertiary">admin@nemocnice.cz / admin123</span><br />
              <span className="text-text-tertiary">user@nemocnice.cz / user123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-xs mt-5">
          Operacni saly {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
