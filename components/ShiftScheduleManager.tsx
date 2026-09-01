import React from 'react';
import { Calendar } from 'lucide-react';
import ModulePageHeading from './ModulePageHeading';

const ShiftScheduleManager: React.FC = () => {
  return (
    <div className="w-full">
      <header className="mb-16 flex flex-col items-start justify-between gap-6">
        <ModulePageHeading icon={Calendar} kicker="SHIFT SCHEDULE MANAGEMENT" title="ROZVRH" mutedTitle="SMEN" />
      </header>
    </div>
  );
};

export default ShiftScheduleManager;
