'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, BarChart3, Info, CheckCircle2 } from 'lucide-react';
import { WORKFLOW_STEPS } from '../constants';

const StatusesManager: React.FC = () => {
  const statuses = WORKFLOW_STEPS;

  return (
    <div className="space-y-8">
      {/* Header - matching OperatingRoomsManager style */}
      <header className="mb-8">
        <div className="mb-4">
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            SPRÁVA <span className="text-white/20">STATUSŮ</span>
          </h1>
        </div>
        <p className="text-white/40 text-sm max-w-xl">
          Prehled workflow statusu operacnich vykonu. Statusy jsou definovany v konstantach aplikace.
        </p>
      </header>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-300/90">
            <p className="font-semibold mb-1">Informace:</p>
            <p className="text-xs">Statusy jsou pevne definovany v aplikaci a zobrazuji se v Timeline modulu a detailu salu.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <p className="text-white/50 text-sm">Aktivni Statusy</p>
              <p className="text-2xl font-bold text-white">{statuses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-white/50 text-sm">Celkem Statusu</p>
              <p className="text-2xl font-bold text-white">{statuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white/80">Workflow Statusy</h2>
        
        <AnimatePresence>
          {statuses.map((status, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-lg border p-4 transition-colors bg-white/5 border-white/10 hover:bg-white/[0.08]"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-white/60">{idx + 1}</span>
                </div>

                <div 
                  className="flex-shrink-0 w-10 h-10 rounded-lg"
                  style={{ backgroundColor: status.color }}
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white/90">{status.name}</h3>
                  <p className="text-sm text-white/50">Index: {idx}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Clock className="w-4 h-4 text-white/40" />
                  <span className="text-white/90 text-sm">{status.duration || 0} min</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span className="text-white/50 text-sm">Statistiky</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StatusesManager;
