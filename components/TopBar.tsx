
import React, { useState, useEffect } from 'react';
import { Bell, Globe, ShieldCheck, Activity } from 'lucide-react';

interface TopBarProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
  onSettingsReset?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ currentView, onNavigate, onSettingsReset }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-20 px-8 md:px-12 flex items-center justify-between z-30 relative">
      {/* Glass background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-white/[0.02] to-white/[0.03] backdrop-blur-2xl border-b border-white/[0.06]" />
      
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FBBF24]/20 to-transparent" />
      
      {/* Left side - Logo & branding */}
      <div className="flex items-center gap-5 relative z-10">
        <div className="relative group">
          {/* Glow effect */}
          <div className="absolute -inset-2 bg-[#FBBF24]/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-11 h-11 bg-gradient-to-br from-white/[0.08] to-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center shadow-lg backdrop-blur-md group-hover:border-[#FBBF24]/30 transition-all duration-300">
            <ShieldCheck className="w-5 h-5 text-[#FBBF24]" />
          </div>
        </div>
        <div>
          <p className="text-[8px] font-bold tracking-[0.35em] text-white/25 leading-none mb-1 uppercase">HOSPITAL SYSTEM</p>
          <p className="text-sm font-bold text-white/90 uppercase tracking-wide">Operacni Saly</p>
        </div>
      </div>

      {/* Right side - Time, notifications, profile */}
      <div className="flex items-center gap-8 relative z-10">
        {/* Live status indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
        
        {/* Time display */}
        <div className="flex flex-col items-end">
          <span className="text-3xl font-mono font-bold text-white tracking-tight tabular-nums leading-none">
            {time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Globe className="w-2.5 h-2.5 text-white/20" />
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.25em]">GMT+1</span>
          </div>
        </div>
        
        <div className="h-8 w-px bg-white/[0.06]" />

        <div className="flex items-center gap-6">
          {/* Notification bell */}
          <button className="relative p-2.5 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] rounded-xl cursor-pointer hover:border-white/[0.12] hover:from-white/[0.08] hover:to-white/[0.04] transition-all duration-300 group backdrop-blur-md">
            <Bell className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
            {/* Notification dot */}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#FBBF24] rounded-full border border-black/50" />
          </button>

          {/* User profile */}
          <div className="flex items-center gap-4 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-none mb-0.5 group-hover:text-white transition-colors">Dr. Jan Sverak</p>
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-[0.2em] leading-none">Chief Surgeon</p>
            </div>
            <div className="relative">
              <div className="absolute -inset-1 bg-[#FBBF24]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative w-11 h-11 bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] text-black rounded-xl flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform duration-300 shadow-lg">
                JS
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
