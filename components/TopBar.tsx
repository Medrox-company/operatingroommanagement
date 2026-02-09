
import React, { useState, useEffect } from 'react';
import { Bell, Globe, ShieldCheck } from 'lucide-react';

const TopBar: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-24 px-12 md:px-14 flex items-center justify-between bg-white/5 backdrop-blur-2xl z-30 border-b border-white/10">
      <div className="flex items-center gap-6">
         <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md">
            <ShieldCheck className="w-6 h-6 text-[#00D8C1]" />
         </div>
         <div>
            <p className="text-[9px] font-black tracking-[0.4em] text-white/30 leading-none mb-1.5 uppercase">HOSPITAL SYSTEM</p>
            <p className="text-sm font-bold text-white uppercase tracking-tight">OPERATINGROOM</p>
         </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="flex flex-col items-end">
          <span className="text-4xl font-mono font-bold text-white tracking-tighter tabular-nums leading-none">
            {time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2 mt-2">
             <Globe className="w-3 h-3 text-white/20" />
             <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">LOCAL TIME • GMT+1</span>
          </div>
        </div>
        
        <div className="h-10 w-px bg-white/10" />

        <div className="flex items-center gap-8">
          <div className="relative p-3.5 bg-white/5 border border-white/10 rounded-2xl shadow-2xl cursor-pointer hover:bg-white/10 hover:text-white transition-all group backdrop-blur-md">
            <Bell className="w-5 h-5 text-white/40 group-hover:text-white" />
          </div>

          <div className="flex items-center gap-5 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-[12px] font-black text-white/90 uppercase tracking-tighter leading-none mb-1">Dr. Jan Svěrák</p>
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Chief Surgeon</p>
            </div>
            <div className="w-14 h-14 bg-[#00D8C1] text-black rounded-2xl flex items-center justify-center font-black text-sm group-hover:scale-105 transition-all shadow-glow shadow-[#00D8C1]/20">
              JS
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;