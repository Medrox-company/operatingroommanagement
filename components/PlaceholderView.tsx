import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { MobileCard, MobileHeader, MobileScreen } from './mobile/MobileShell';
import ModulePageHeading from './ModulePageHeading';

interface PlaceholderViewProps {
  icon?: LucideIcon;
  title: string;
  description: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ icon: Icon = AlertCircle, title, description }) => (
  <>
  <MobileScreen>
    <MobileHeader kicker="Operační blok" title={title} />
    <MobileCard>
      <h2 className="m-unified-card-title">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--m-muted)' }}>{description}</p>
    </MobileCard>
  </MobileScreen>
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="app-module-shell w-full h-full hidden md:flex flex-col px-8 md:pl-32 md:pr-10 py-8"
  >
    <div className="app-module-content flex h-full min-h-0 flex-col">
      <header className="app-module-page-header shrink-0">
        <ModulePageHeading icon={Icon} kicker="OPERAČNÍ PROGRAM" title={title} />
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
            <Icon className="w-16 h-16 text-white/30" strokeWidth={1.5} />
          </div>
          <p className="text-white/50 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  </motion.div>
  </>
);

export default PlaceholderView;
