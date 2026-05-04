
import React, { useState, useEffect } from 'react';
import { Bell, Globe, ShieldCheck } from 'lucide-react';

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
    <header className="h-24 px-6 md:px-10 flex items-center justify-between glass z-30 border-b border-blue-500/20">
      <div className="flex items-center gap-4">
         <div className="w-12 h-12 bg-primary/20 border border-primary/40 rounded-xl flex items-center justify-center glass glow-blue">
            <ShieldCheck className="w-6 h-6 text-primary" />
         </div>
         <div>
            <p className="text-[9px] font-bold tracking-[0.4em] text-muted-foreground/60 leading-none mb-1.5 uppercase">HOSPITAL SYSTEM</p>
            <p className="text-sm font-bold text-foreground uppercase tracking-tight">OPERAČNÍ SÁLY</p>
         </div>
      </div>

      <div className="flex items-center gap-6 md:gap-10">
        <div className="flex flex-col items-end">
          <span className="text-3xl md:text-4xl font-mono font-bold text-foreground tracking-tight tabular-nums leading-none">
            {time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2 mt-2">
             <Globe className="w-3 h-3 text-muted-foreground/50" />
             <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em]">LOCAL TIME • GMT+1</span>
          </div>
        </div>
        
        <div className="h-10 w-px bg-border" />

        <div className="flex items-center gap-4 md:gap-8">
          <div className="relative p-3 glass border-blue-500/20 rounded-lg cursor-pointer hover:bg-blue-500/10 hover:text-primary transition-all group glow-blue">
            <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>

          <div className="flex items-center gap-4 md:gap-5 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-bold text-foreground uppercase tracking-tight leading-none mb-1">Dr. Jan Svěrák</p>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">Chief Surgeon</p>
            </div>
            <div className="w-12 md:w-14 h-12 md:h-14 bg-primary/30 text-primary-foreground border border-primary/50 rounded-lg glass glow-blue flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-all">
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
