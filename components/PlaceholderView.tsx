import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaceholderViewProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="w-full h-full flex items-center justify-center px-8 md:pl-32 md:pr-10 py-8"
  >
    <div className="max-w-sm w-full text-center">
      <div className="inline-flex p-6 rounded-3xl bg-white/5 border border-white/10 mb-8">
        <Icon className="w-16 h-16 text-white/30" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold uppercase tracking-tight text-white/90 mb-3">{title}</h2>
      <p className="text-white/50 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export default PlaceholderView;
