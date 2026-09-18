import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { MobileCard, MobileHeader, MobileScreen } from './mobile/MobileShell';

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
    className="w-full h-full hidden md:flex items-center justify-center px-8 md:pl-32 md:pr-10 py-8"
  >
    <div className="max-w-sm w-full text-center">
      <div className="inline-flex p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
        <Icon className="w-16 h-16 text-white/30" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold uppercase tracking-tight text-white/90 mb-3">{title}</h2>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
  </>
);

export default PlaceholderView;
