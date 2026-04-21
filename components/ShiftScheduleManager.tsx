import React from 'react';
import { Calendar } from 'lucide-react';

const ShiftScheduleManager: React.FC = () => {
  return (
    <div className="w-full">
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">SHIFT SCHEDULE MANAGEMENT</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-black tracking-tighter uppercase leading-none">
            ROZVRH <span className="text-white/20">SMEN</span>
          </h1>
        </div>
      </header>
    </div>
  );
};

export default ShiftScheduleManager;
