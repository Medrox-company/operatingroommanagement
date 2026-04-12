import React, { useState, useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';

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

  const formattedDate = time.toLocaleDateString('cs-CZ', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <header className="h-16 px-6 md:px-8 flex items-center justify-between bg-surface-1/50 backdrop-blur-xl z-30 border-b border-border-subtle">
      {/* Left - Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center">
          <span className="text-accent font-bold text-xs">OR</span>
        </div>
        <div className="hidden sm:block">
          <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">Hospital System</p>
          <p className="text-sm font-semibold text-text-primary -mt-0.5">Operating Room</p>
        </div>
      </div>

      {/* Right - Time & Actions */}
      <div className="flex items-center gap-4">
        {/* Date & Time */}
        <div className="flex items-center gap-3 px-3 py-2 bg-surface-1 rounded-xl border border-border-subtle">
          <Clock className="w-4 h-4 text-text-tertiary" />
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-semibold text-text-primary tabular-nums">
              {time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] text-text-muted uppercase hidden sm:inline">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-border-subtle hidden sm:block" />

        {/* Notifications */}
        <button 
          className="relative p-2.5 bg-surface-1 border border-border-subtle rounded-xl hover:bg-surface-2 hover:border-border-default transition-all duration-200 group"
          aria-label="Notifikace"
        >
          <Bell className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
        </button>

        {/* User Avatar */}
        <button className="flex items-center gap-3 group">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-text-primary">Dr. J. Novak</p>
            <p className="text-[10px] text-text-muted">Chirurg</p>
          </div>
          <div className="w-9 h-9 bg-accent text-accent-foreground rounded-xl flex items-center justify-center font-semibold text-xs group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-accent/20">
            JN
          </div>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
