
import React, { useState, useEffect } from 'react';
import { OperatingRoom } from '../types';
import { MOCK_ROOMS } from '../constants';
import { motion, AnimatePresence, useCycle, Variants } from 'framer-motion';
import { 
  ArrowLeft, User, Phone, Scissors, Star, Bed, UserCheck, SprayCan, Sparkles,
  Syringe, ArrowRight, CheckCircle, ChevronsRight, Activity, Cog, BarChart2, ScanLine, Compass, GitBranch, Waves, CircleDot, Terminal, Blend, Orbit, Bot, GitCommit, Flower, Droplet, BookOpen, Map, Layers3, Play, Gauge, Shield, Milestone
} from 'lucide-react';

// --- SHARED COMPONENTS & DATA (Copied from RoomDetail for standalone demo) ---

const workflowSteps = [
  { title: "Příjezd na sál", Icon: UserCheck, color: 'workflow-admit' },
  { title: "Začátek anestezie", Icon: Syringe, color: 'workflow-anesthesia' },
  { title: "Výkon", Icon: Scissors, color: 'workflow-procedure' },
  { title: "Konec výkonu", Icon: Star, color: 'workflow-end' },
  { title: "Ukončení anestezie", Icon: Bed, color: 'workflow-wakeup' },
  { title: "Úklid sálu", Icon: SprayCan, color: 'workflow-call' }, // Používá barvu původního volání (modrou)
  { title: "Sál připraven", Icon: Sparkles, color: 'workflow-ready' },
];

const DetailHeader: React.FC<{ onClose: () => void, room: OperatingRoom }> = ({ onClose, room }) => (
  <motion.header 
    initial={{ y: -60, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
    className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20">
    <div className="flex items-center gap-6">
      <motion.button
        onClick={onClose}
        className="flex items-center justify-center w-12 h-12 bg-light-panel/80 backdrop-blur-lg border border-light-border rounded-full text-light-text-subtle hover:text-light-text shadow-soft transition-colors"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>
      <div className="flex items-center gap-3">
        <motion.div className="w-12 h-12 bg-light-accent/10 rounded-2xl flex items-center justify-center border border-light-border">
            <Activity className="w-6 h-6 text-light-accent"/>
        </motion.div>
        <div>
          <p className="text-xs font-bold text-light-text-subtle tracking-widest uppercase">{room.department} UNIT</p>
          <h1 className="text-2xl font-bold tracking-tight text-light-text">{room.name}</h1>
        </div>
      </div>
    </div>
  </motion.header>
);

const FooterControls: React.FC<{ currentStep: number; onNextStep: () => void; }> = ({ currentStep, onNextStep }) => {
  const previousAction = workflowSteps[currentStep - 1] || { title: "Zahájení operace", Icon: Sparkles };
  const nextAction = workflowSteps[currentStep];

  return (
    <motion.footer 
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
      className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-center z-20">
      <div className={`p-4 rounded-2xl flex items-center gap-4 min-w-[320px] glass-panel shadow-soft`}>
          <div className={`w-12 h-12 bg-light-success/10 rounded-lg flex items-center justify-center border border-light-border`}><CheckCircle className="w-6 h-6 text-light-success"/></div>
          <div>
              <p className="text-[10px] text-light-text-subtle font-bold tracking-wider">DOKONČENO</p>
              <p className="text-lg font-bold text-light-text">{previousAction.title}</p>
          </div>
      </div>
      <motion.button onClick={onNextStep} className="relative w-16 h-16 bg-light-panel rounded-full border border-light-border shadow-soft flex items-center justify-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} >
        <ChevronsRight className="w-8 h-8 text-light-text-subtle" />
      </motion.button>
      <div className={`p-4 rounded-2xl flex items-center justify-end text-right gap-4 min-w-[320px] glass-panel shadow-soft`}>
           <div>
              <p className="text-[10px] text-light-text-subtle font-bold tracking-wider flex items-center justify-end gap-1.5">NÁSLEDUJÍCÍ KROK <ArrowRight className="w-3 h-3"/></p>
              <p className={`text-lg font-bold text-${nextAction.color}`}>{nextAction.title}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${nextAction.color}/10 border border-light-border`}><nextAction.Icon className={`w-6 h-6 text-${nextAction.color}`}/></div>
      </div>
    </motion.footer>
  );
};

// --- DIAL ANIMATION VARIANTS (Existing + New) ---

const OriginalDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const rotation = -currentStep * (360 / workflowSteps.length);
    const progress = room.currentProcedure?.progress || 0;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
             <motion.div className="absolute w-[600px] h-[600px]" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} >
                <div className="absolute inset-[15%] w-[70%] h-[70%] rounded-full border border-dashed border-light-border/30" />
                <div className="absolute inset-0 w-full h-full rounded-full border-2 border-light-border/50" />
                <motion.div className="absolute inset-0" animate={{ rotate: rotation }} transition={{ type: 'spring', stiffness: 150, damping: 25, mass: 1.5 }} >
                    {workflowSteps.map((s, index) => (
                        <div key={index} className="absolute w-full h-full" style={{ transform: `rotate(${(index / workflowSteps.length) * 360}deg)` }}>
                            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.8 + index * 0.05 }} className="absolute top-[-24px] left-1/2 -ml-6 w-12 h-12 bg-light-panel shadow-soft border border-light-border rounded-full flex items-center justify-center">
                                <s.Icon className="w-5 h-5 text-light-text-subtle" />
                            </motion.div>
                        </div>
                    ))}
                </motion.div>
                 <div className="absolute top-[-28px] left-1/2 -ml-7 w-14 h-14 z-10"><motion.div key={step.color} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`w-full h-full rounded-full bg-${step.color}/10 border-2 border-${step.color} shadow-lg shadow-${step.color}/20`} /></div>
            </motion.div>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} className="relative text-center flex flex-col items-center z-10" >
              <div className="relative w-52 h-52">
                <svg className="absolute inset-0 w-full h-full -rotate-90 text-light-border" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="transparent" /></svg>
                <svg className={`absolute inset-0 w-full h-full -rotate-90 text-${step.color}`} viewBox="0 0 100 100">
                    <motion.circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="transparent" pathLength={1} strokeDasharray={1} initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 1 - progress / 100 }} transition={{ duration: 1, ease: 'easeOut' }} />
                </svg>
                <motion.button onClick={onNextStep} className="w-full h-full rounded-full group" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <div className="relative w-full h-full"><div className={`absolute inset-0 rounded-full bg-${step.color} opacity-50 blur-lg shadow-2xl shadow-${step.color}/50`}></div><div className={`absolute inset-1 rounded-full bg-${step.color}`}></div><div className="absolute inset-2.5 rounded-full bg-gradient-to-br from-white/25 to-white/0"><div className="absolute inset-0 rounded-full shadow-[inset_0_6px_8px_rgba(0,0,0,0.2),inset_0_-4px_6px_rgba(255,255,255,0.2)]"></div></div><div className="absolute inset-0 flex items-center justify-center"><step.Icon className="w-20 h-20 text-white drop-shadow-lg" /></div></div>
                </motion.button>
              </div>
              <h2 className={`mt-8 text-3xl font-bold text-${step.color}`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const KineticDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const rotation = -currentStep * (360 / workflowSteps.length);
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <motion.div className="absolute w-[600px] h-[600px]" animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="absolute w-[600px] h-[600px]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}>
                <motion.div className="absolute inset-0" animate={{ rotate: rotation }} transition={{ type: 'spring', stiffness: 80, damping: 15, mass: 2, restDelta: 0.01 }}>
                    {workflowSteps.map((s, index) => {
                        const angle = (index / workflowSteps.length) * 360;
                        return (
                            <motion.div key={index} className="absolute w-full h-full" style={{ transform: `rotate(${angle}deg)` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + index * 0.05 }}>
                                <div className={`absolute top-[-16px] left-1/2 -ml-4 w-8 h-8 rounded-full flex items-center justify-center bg-light-panel border-2 ${currentStep === index ? `border-${s.color}` : 'border-light-border'}`}><s.Icon className={`w-4 h-4 ${currentStep === index ? `text-${s.color}` : 'text-light-text-subtle'}`} /></div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </motion.div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer group" whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.4 }} className={`w-52 h-52 rounded-full bg-${step.color} shadow-2xl shadow-${step.color}/40 flex items-center justify-center`}>
                    <step.Icon className="w-24 h-24 text-white drop-shadow-lg" />
                    <motion.div className={`absolute inset-0 border-4 border-white/50 rounded-full`} animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} />
                </motion.div>
                <motion.h2 key={step.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-8 text-3xl font-bold text-${step.color}`}>{step.title}</motion.h2>
            </motion.div>
        </div>
    );
};

const RadarDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const progress = room.currentProcedure?.progress || 0;
    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <div className="absolute w-[600px] h-[600px] rounded-full border border-light-accent/10 bg-light-accent/5">
                {[...Array(3)].map((_, i) => <div key={i} style={{ inset: `${(i + 1) * 20}%` }} className="absolute rounded-full border border-dashed border-light-accent/10" />)}
            </div>
            <motion.div className="absolute w-[600px] h-[600px]" animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}>
                <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent to-light-accent origin-left" />
            </motion.div>
            <motion.div onClick={onNextStep} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-52 h-52 rounded-full border-2 border-light-accent/20 bg-light-panel flex flex-col items-center justify-center shadow-soft">
                    <span className="font-mono font-bold text-6xl text-light-accent">{progress}<span className="text-3xl">%</span></span>
                    <p className="text-xs font-bold uppercase tracking-widest text-light-text-subtle">Progress</p>
                </div>
                 <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <step.Icon className={`w-6 h-6 text-${step.color}`} />
                            <h2 className={`text-3xl font-bold text-${step.color}`}>{step.title}</h2>
                        </div>
                    </motion.div>
                 </AnimatePresence>
            </motion.div>
        </div>
    );
};

const MinimalistDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const progress = room.currentProcedure?.progress || 0;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute w-[600px] h-[600px]">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="48" stroke="#EAEBEE" strokeWidth="1" fill="transparent" />
                    <motion.circle cx="50" cy="50" r="48" stroke="#5B65DC" strokeWidth="1.5" fill="transparent" pathLength={1} strokeDasharray={1} initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 1 - progress / 100 }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
                </svg>
            </motion.div>
            <div className="absolute w-[600px] h-[600px]">
                {workflowSteps.map((s, index) => {
                    const angle = -90 + (index / workflowSteps.length) * 360;
                    return (
                        <motion.div key={index} className="absolute top-1/2 left-1/2 w-1.5 h-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 + index * 0.05 } }} style={{ transform: `translateX(-50%) translateY(-50%) rotate(${angle}deg) translateX(300px)` }}>
                            <div className={`w-full h-full rounded-full transition-all ${currentStep === index ? `bg-${s.color} scale-150` : 'bg-light-border'}`} />
                        </motion.div>
                    );
                })}
            </div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }} className="text-center">
                        <p className="font-mono text-7xl font-bold text-light-text">{`${String(currentStep + 1).padStart(2, '0')}`}</p>
                        <h2 className="mt-2 text-3xl font-semibold text-light-text">{step.title}</h2>
                        <p className={`mt-1 text-sm font-bold text-${step.color} uppercase tracking-widest`}>Fáze operace</p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const SpectrumDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const colors = workflowSteps.map(s => `var(--tw-color-${s.color})`);
    const [hue, setHue] = useCycle(...colors);

    useEffect(() => {
        setHue(colors[currentStep]);
    }, [currentStep, setHue, colors]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <motion.div className="absolute w-[600px] h-[600px] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ backgroundImage: `conic-gradient(from 0deg, #5B65DC, #D64D65, #FBBF24, #34C759, #A78BFA, #5B65DC)` }}
            />
            <div className="absolute w-[580px] h-[580px] bg-light-bg rounded-full" />
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer group" whileTap={{ scale: 0.9 }}>
                <motion.div
                    className="w-52 h-52 rounded-full shadow-2xl flex items-center justify-center"
                    animate={{ 
                        backgroundColor: hue,
                        boxShadow: `0 0 60px -10px ${hue}`
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    <motion.div
                        className="absolute inset-0 border-4 border-white/50 rounded-full"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                    <step.Icon className="w-24 h-24 text-white drop-shadow-lg" />
                </motion.div>
                <AnimatePresence mode="wait">
                    <motion.h2 key={step.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`mt-8 text-3xl font-bold`} style={{color: hue}}>{step.title}</motion.h2>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const ScannerDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const progress = room.currentProcedure?.progress || 0;
    const arcs = [
        { size: 48, duration: 10, stroke: 1.5, opacity: 0.3 },
        { size: 42, duration: 8, stroke: 2, opacity: 0.5, dash: "0.4 0.6" },
        { size: 36, duration: 15, stroke: 1, opacity: 0.2, dir: -1 },
        { size: 30, duration: 6, stroke: 2.5, opacity: 0.8, dash: "0.7 0.3" },
    ];
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: 'backOut' }} className="absolute w-[600px] h-[600px]">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <g opacity="0.5">
                         {arcs.map((arc, i) => (
                            <motion.circle key={i} cx="50" cy="50" r={arc.size}
                                stroke={`var(--tw-color-${step.color})`} strokeWidth={arc.stroke} fill="transparent"
                                pathLength={1} strokeDasharray={arc.dash || "1"} strokeOpacity={arc.opacity}
                                animate={{ rotate: 360 * (arc.dir || 1) }}
                                transition={{ duration: arc.duration, repeat: Infinity, ease: 'linear' }}
                            />
                        ))}
                    </g>
                </svg>
            </motion.div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                 <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center flex flex-col items-center">
                        <div className={`w-20 h-20 mb-6 rounded-full bg-${step.color}/10 border border-${step.color}/20 flex items-center justify-center`}>
                            <step.Icon className={`w-10 h-10 text-${step.color}`} />
                        </div>
                        <p className={`text-sm font-bold uppercase tracking-widest text-${step.color}`}>Fáze {currentStep + 1}</p>
                        <h2 className="text-4xl font-semibold text-light-text mt-1">{step.title}</h2>
                        <div className="mt-8 w-40 h-1 bg-light-border rounded-full overflow-hidden">
                            <motion.div className={`h-full bg-${step.color}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                        </div>
                    </motion.div>
                 </AnimatePresence>
            </motion.div>
        </div>
    );
};

const SteampunkDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center [background:radial-gradient(ellipse_at_center,_#854d0e_0%,_#292524_100%)]">
            <motion.div className="absolute w-[600px] h-[600px] text-amber-200/50" animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}>
                <Cog className="absolute w-32 h-32 top-10 left-20 opacity-20"/>
                <Cog className="absolute w-48 h-48 bottom-10 right-20 opacity-20 animate-spin [animation-duration:10s]"/>
            </motion.div>
             <motion.div className="absolute w-[500px] h-[500px] text-amber-200/50" animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}>
                <Cog className="absolute w-24 h-24 bottom-20 left-10 opacity-20 animate-spin [animation-duration:8s] [animation-direction:reverse]"/>
                 <Cog className="absolute w-40 h-40 top-20 right-10 opacity-20"/>
            </motion.div>

            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer group" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <div className="w-52 h-52 rounded-full bg-amber-300 border-8 border-amber-700 shadow-[inset_0_0_15px_rgba(0,0,0,0.4),0_5px_15px_rgba(0,0,0,0.3)] flex items-center justify-center">
                    <step.Icon className="w-24 h-24 text-amber-900 drop-shadow-lg" />
                </div>
                <div className="mt-8 text-center px-4 py-1 bg-stone-800 text-amber-100 rounded border-2 border-amber-900/50 shadow-lg">
                    <h2 className={`text-3xl font-bold font-serif tracking-wider text-${step.color}`}>{step.title}</h2>
                </div>
            </motion.div>
        </div>
    );
};

const ParticlesDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const particleCount = 50;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
             <AnimatePresence>
                <motion.div key={currentStep} className="absolute inset-0">
                    {[...Array(particleCount)].map((_, i) => {
                        const angle = (i / particleCount) * Math.PI * 2;
                        return (
                            <motion.div
                                key={i}
                                className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-${step.color}`}
                                initial={{ scale: 0, x: '-50%', y: '-50%' }}
                                animate={{ 
                                    scale: [0, 1, 0],
                                    x: [`-50%`, `${Math.cos(angle) * 300 - 50}%`, `${Math.cos(angle) * 300 - 50}%`],
                                    y: [`-50%`, `${Math.sin(angle) * 300 - 50}%`, `${Math.sin(angle) * 300 - 50}%`]
                                }}
                                transition={{ duration: 2, delay: Math.random() * 0.5, repeat: Infinity, ease: "linear" }}
                            />
                        )
                    })}
                </motion.div>
            </AnimatePresence>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer" whileTap={{ scale: 0.9 }}>
                <div className={`w-52 h-52 rounded-full bg-${step.color}/10 backdrop-blur-sm border-2 border-${step.color} flex items-center justify-center`}>
                    <step.Icon className={`w-24 h-24 text-${step.color}`} />
                </div>
                <h2 className={`mt-8 text-3xl font-bold text-white`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const DataVizDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const bars = 24;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-[600px] h-[600px]">
                {[...Array(bars)].map((_, i) => {
                    const angle = (i / bars) * 360;
                    const height = 50 + Math.sin(i * 0.5 + currentStep) * 20;
                    return (
                        <div key={i} className="absolute top-1/2 left-1/2 w-1 h-full origin-bottom" style={{ transform: `rotate(${angle}deg)` }}>
                            <motion.div
                                className={`w-full bg-light-border`}
                                style={{ height: `${height}%` }}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ delay: i * 0.02, type: 'spring', stiffness: 100 }}
                            />
                        </div>
                    );
                })}
            </div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-52 h-52 rounded-full bg-light-panel shadow-soft border border-light-border flex flex-col items-center justify-center">
                    <BarChart2 className={`w-12 h-12 text-${step.color} mb-2`} />
                    <p className="text-sm uppercase tracking-widest text-light-text-subtle">Fáze</p>
                    <p className="text-4xl font-bold font-mono text-light-text">{String(currentStep + 1).padStart(2, '0')}</p>
                </div>
                <h2 className={`mt-8 text-3xl font-bold text-light-text`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const BlueprintDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#0d2a50] animated-grid-bg [background-image:linear-gradient(to_right,_rgba(91,101,220,0.2)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(91,101,220,0.2)_1px,_transparent_1px)]">
            <svg className="absolute w-[600px] h-[600px] text-light-accent/50" viewBox="0 0 100 100">
                <motion.circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" fill="transparent" pathLength={1} strokeDasharray={1} initial={{strokeDashoffset: 1}} animate={{strokeDashoffset: 0}} transition={{duration: 2, delay: 0.2}} />
                <motion.circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" fill="transparent" pathLength={1} initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: 1, delay: 0.5}} />
            </svg>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer text-light-accent">
                <motion.div className="w-52 h-52 flex items-center justify-center" initial={{opacity:0, scale: 0.5}} animate={{opacity:1, scale:1}} transition={{delay: 0.4}}>
                    <step.Icon className="w-24 h-24" strokeWidth={1} />
                </motion.div>
                <h2 className="mt-8 text-3xl font-bold font-mono uppercase tracking-widest">{step.title}</h2>
            </motion.div>
        </div>
    );
};

const NeonDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const color = `var(--tw-color-${step.color})`;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
             <motion.div 
                className="absolute w-[600px] h-[600px] rounded-full"
                key={`glow-${currentStep}`}
                initial={{ boxShadow: `0 0 0px ${color}`, scale: 1 }}
                animate={{ 
                    boxShadow: [`0 0 20px ${color}`, `0 0 80px ${color}`, `0 0 20px ${color}`],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                 <motion.div 
                    className="w-52 h-52 rounded-full border-2 flex items-center justify-center"
                    key={`icon-${currentStep}`}
                    style={{borderColor: color, color: color, textShadow: `0 0 20px ${color}`}}
                    initial={{opacity: 0}} animate={{opacity: 1}}
                 >
                    <step.Icon className="w-24 h-24" />
                </motion.div>
                <h2 className="mt-8 text-3xl font-bold" style={{color: color, textShadow: `0 0 15px ${color}`}}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const OrganicDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const petals = 6;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
             <motion.div className="absolute w-[600px] h-[600px]" animate={{rotate: 360}} transition={{repeat: Infinity, duration: 30, ease: 'linear'}}>
                {[...Array(petals)].map((_, i) => (
                    <div key={i} className="absolute inset-0" style={{transform: `rotate(${(i / petals) * 360}deg)`}}>
                        <motion.div 
                            className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-96 rounded-[50%] bg-${step.color}/20`}
                            key={currentStep}
                            initial={{scaleY: 0, opacity: 0, transformOrigin: 'bottom'}}
                            animate={{scaleY: 1, opacity: 1}}
                            transition={{delay: 0.1 * i, type: 'spring', stiffness: 50}}
                        />
                    </div>
                ))}
            </motion.div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-52 h-52 rounded-full bg-light-panel shadow-soft flex items-center justify-center">
                    <step.Icon className={`w-24 h-24 text-${step.color}`} />
                </div>
                <h2 className={`mt-8 text-3xl font-bold text-${step.color}`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const FlipbookDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-amber-50">
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-64 h-64 bg-white rounded-lg shadow-xl p-4 flex items-center justify-center border-4 border-gray-200">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={currentStep}
                            initial={{rotateY: -90, opacity: 0}}
                            animate={{rotateY: 0, opacity: 1}}
                            exit={{rotateY: 90, opacity: 0}}
                            transition={{duration: 0.2}}
                        >
                            <step.Icon className={`w-32 h-32 text-${step.color}`} />
                        </motion.div>
                    </AnimatePresence>
                </div>
                <h2 className="mt-8 text-3xl font-bold text-gray-700">{step.title}</h2>
            </motion.div>
        </div>
    );
};

const CompassDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const angle = (currentStep / workflowSteps.length) * 360;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-[600px] h-[600px] rounded-full border border-light-border bg-light-bg shadow-[inset_0_0_40px_rgba(0,0,0,0.05)]">
                {workflowSteps.map((s, i) => (
                    <div key={i} className="absolute inset-0" style={{transform: `rotate(${(i / workflowSteps.length) * 360}deg)`}}>
                        <div className="absolute top-4 left-1/2 -translate-x-1/2"><s.Icon className="w-5 h-5 text-light-text-subtle"/></div>
                    </div>
                ))}
            </div>
            <motion.div 
                className="absolute w-2 h-[600px]"
                animate={{ rotate: angle }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
                <div className={`w-full h-1/2 bg-gradient-to-b from-${step.color} to-transparent`}></div>
                <div className="w-full h-1/2"></div>
            </motion.div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-40 h-40 bg-light-panel rounded-full shadow-soft flex items-center justify-center">
                     <Compass className={`w-24 h-24 text-${step.color}`}/>
                </div>
                 <h2 className={`mt-8 text-3xl font-bold text-light-text`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const WaveformDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const bars = 30;
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="absolute w-[600px] h-[600px] flex items-center justify-center">
                 {[...Array(bars)].map((_, i) => (
                    <motion.div 
                        key={i}
                        className={`absolute w-1 rounded-full bg-${step.color}`}
                        style={{height: '100%', transform: `rotate(${(i/bars)*360}deg)`}}
                        initial={{scaleY: 0, transformOrigin: 'center'}}
                        animate={{scaleY: 1}}
                        transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatType: 'mirror',
                            delay: i * 0.05,
                        }}
                    />
                 ))}
            </div>
             <div className="absolute w-[500px] h-[500px] bg-light-bg rounded-full"/>
             <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-40 h-40 bg-light-panel rounded-full shadow-soft flex flex-col items-center justify-center">
                     <Waves className={`w-16 h-16 text-${step.color}`}/>
                     <p className="font-mono font-bold text-light-text">{step.title}</p>
                </div>
            </motion.div>
        </div>
    );
};

const AtomDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-800">
            <div className="absolute w-[400px] h-[400px]">
                {[0, 60, 120].map(angle => (
                    <motion.div key={angle} className="absolute inset-0 border-2 border-light-accent/30 rounded-[50%]" 
                        style={{rotate: `${angle}deg`}}
                        animate={{scale: [1, 1.05, 1]}}
                        transition={{duration: 5, repeat: Infinity, ease: 'easeInOut'}}
                    >
                        <motion.div className={`absolute -top-2 left-1/2 -ml-2 w-4 h-4 rounded-full bg-light-accent`}
                            animate={{
                                offsetDistance: "100%",
                            }}
                            transition={{
                                duration: 4 + Math.random() * 2,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{offsetPath: `ellipse(50% 50% at 50% 50%)`}}
                        />
                    </motion.div>
                ))}
            </div>
             <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className={`w-40 h-40 bg-${step.color} rounded-full shadow-lg shadow-${step.color}/30 flex items-center justify-center`}>
                     <CircleDot className="w-20 h-20 text-white"/>
                </div>
                 <h2 className={`mt-8 text-3xl font-bold text-white`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const GlitchDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const glitchVariants: Variants = {
        glitch: {
            x: [0, -2, 2, -3, 3, 0],
            y: [0, 3, -3, 2, -2, 0],
            skewX: [0, 2, -2, 3, -3, 0],
            transition: { duration: 0.2, repeat: 3, repeatType: 'reverse' }
        },
        skewX: { x: 0, y: 0, skewX: 0 }
    }
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <div className={`absolute inset-0 bg-${step.color} animate-pulse opacity-20`}/>
             <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer text-green-400 font-mono">
                <motion.div className="w-52 h-52 flex items-center justify-center" key={currentStep} variants={glitchVariants} animate="glitch" initial="idle">
                     <Terminal className="w-32 h-32"/>
                </motion.div>
                 <h2 className={`mt-8 text-3xl font-bold uppercase`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const LiquidDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-light-accent">
            <svg className="absolute w-0 h-0">
                <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
            </svg>
             <div className="w-[600px] h-[600px]" style={{filter: 'url(#goo)'}}>
                <motion.div 
                    className="absolute top-1/2 left-1/2 w-52 h-52 bg-white rounded-full"
                    style={{x:'-50%', y:'-50%'}}
                />
                {[...Array(5)].map((_, i) => (
                    <motion.div key={i}
                        className={`absolute top-1/2 left-1/2 w-24 h-24 bg-white rounded-full`}
                        style={{x:'-50%', y:'-50%'}}
                        animate={{
                            rotate: 360,
                            x: `${Math.cos(i * 2) * 150 - 50}%`,
                            y: `${Math.sin(i * 2) * 150 - 50}%`,
                        }}
                        transition={{duration: 10 + i * 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut'}}
                    />
                ))}
            </div>
             <motion.div onClick={onNextStep} className="absolute z-10 flex flex-col items-center cursor-pointer">
                <div className={`w-40 h-40 flex items-center justify-center`}>
                    <step.Icon className={`w-24 h-24 text-${step.color}`}/>
                </div>
                 <h2 className={`mt-8 text-3xl font-bold text-white`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

// --- HUDDial a další zůstávají, jen aktualizují workflowSteps pro galerii ---
const HUDDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const color = `var(--tw-color-${step.color})`;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-900" style={{'--hud-color': color} as React.CSSProperties}>
            <motion.div className="w-[600px] h-[600px] relative" initial={{opacity:0}} animate={{opacity:1}}>
                 <svg className="w-full h-full absolute" viewBox="0 0 100 100">
                    <motion.circle cx="50" cy="50" r="48" stroke="var(--hud-color)" strokeWidth="0.5" fill="none" strokeDasharray="4 4" initial={{rotate:0}} animate={{rotate:360}} transition={{duration:20, ease:'linear', repeat: Infinity}}/>
                    <motion.path d="M 50 2 A 48 48 0 0 1 98 50" stroke="white" strokeWidth="1" fill="none" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1}}/>
                </svg>
            </motion.div>
             <motion.div onClick={onNextStep} className="absolute z-10 flex flex-col items-center cursor-pointer" initial={{scale:0.8}} animate={{scale:1}}>
                <AnimatePresence mode="wait">
                <motion.div key={currentStep} className="text-center" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                    <p className="font-mono text-sm uppercase" style={{color: color}}>Stav systému</p>
                    <h2 className="font-mono text-4xl text-white my-4 uppercase">{step.title}</h2>
                    <step.Icon className="w-20 h-20 text-white mx-auto" strokeWidth={1.5} />
                </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
// ... (zbytek gallery komponentů beze změn)

const SonarDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-teal-900 overflow-hidden">
            <motion.div className="w-[600px] h-[600px] absolute rounded-full border border-teal-500/20">
                 {[...Array(4)].map((_, i) => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border border-teal-500/20" style={{inset: `${(i+1)*20}%`}}/>
                 ))}
                 <motion.div className="absolute w-full h-1/2 bg-gradient-to-b from-teal-400/20 to-transparent" animate={{rotate:360}} transition={{duration:3, repeat:Infinity, ease:'linear'}} style={{transformOrigin: '50% 100%'}}/>
            </motion.div>
             <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <AnimatePresence>
                    <motion.div key={currentStep} className={`w-40 h-40 rounded-full bg-${step.color} shadow-lg shadow-${step.color}/40 flex items-center justify-center`} initial={{scale:0}} animate={{scale:1}} >
                        <step.Icon className="w-20 h-20 text-white"/>
                    </motion.div>
                </AnimatePresence>
                <h2 className={`mt-8 text-3xl font-bold text-white`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const EqualizerDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const bars = 40;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-800">
            <div className="absolute w-[400px] h-[400px]">
                {[...Array(bars)].map((_, i) => (
                    <div key={i} className="absolute w-1 h-full left-1/2 -ml-0.5" style={{transform:`rotate(${(i/bars)*360}deg)`}}>
                        <motion.div className={`w-full rounded-full bg-gradient-to-b from-${step.color} to-light-accent`} style={{height:'50%', transformOrigin:'bottom'}} 
                        animate={{scaleY: Math.random() * 0.5 + 0.5}} transition={{duration:0.2, repeat:Infinity, repeatType:'mirror'}}/>
                    </div>
                ))}
            </div>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className="w-40 h-40 bg-gray-700 rounded-full shadow-inner flex items-center justify-center"><step.Icon className={`w-20 h-20 text-${step.color}`}/></div>
                <h2 className={`mt-8 text-3xl font-bold text-white`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const CircuitBoardDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-[#0a1a0a]">
            <svg width="100%" height="100%" className="absolute opacity-20">
                <motion.path d="M 0 50 H 50 V 100 H 100" stroke="#34C759" strokeWidth="2" fill="none" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:2, repeat:Infinity, repeatType:'reverse'}}/>
                <motion.path d="M 200 150 H 150 V 100 H 50 V 0" stroke="#34C759" strokeWidth="2" fill="none" initial={{pathLength:1}} animate={{pathLength:0}} transition={{duration:3, repeat:Infinity, repeatType:'reverse'}}/>
            </svg>
            <motion.div onClick={onNextStep} className="relative z-10 flex flex-col items-center cursor-pointer">
                <div className={`w-40 h-40 bg-green-900 border-4 border-green-400 rounded-full flex items-center justify-center`}>
                    <step.Icon className={`w-20 h-20 text-green-400`}/>
                </div>
                <h2 className={`mt-8 text-3xl font-bold font-mono text-green-400`}>{step.title}</h2>
            </motion.div>
        </div>
    );
};

const CodeMatrixDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden" onClick={onNextStep}>
            <div className="absolute inset-0 flex justify-around opacity-50">
                {[...Array(10)].map((_, i) => (
                    <motion.p key={i} className="font-mono text-green-500 text-xs" style={{writingMode: 'vertical-rl'}}
                    initial={{y: '-100%'}} animate={{y: '100%'}} transition={{duration: Math.random() * 5 + 5, repeat: Infinity, ease:'linear', delay: Math.random() * 2}}>
                        {Array.from({length: 50}, () => chars[Math.floor(Math.random() * chars.length)]).join('')}
                    </motion.p>
                ))}
            </div>
            <motion.div className="relative z-10 text-center text-green-400 font-mono">
                 <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                        <step.Icon className="w-24 h-24 mx-auto"/>
                        <h2 className="text-4xl mt-4">{step.title}</h2>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const TimelineDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const StepIcon = workflowSteps[currentStep].Icon;
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-4xl">
                 <div className="relative w-full h-1 bg-light-border rounded-full">
                    <motion.div className="absolute top-0 left-0 h-full bg-light-accent rounded-full" animate={{width: `${(currentStep / (workflowSteps.length -1)) * 100}%`}} />
                    {workflowSteps.map((s, i) => (
                        <div key={i} className="absolute -top-2.5" style={{left: `${(i / (workflowSteps.length -1)) * 100}%`}}>
                            <motion.div className="w-6 h-6 rounded-full border-4 border-light-bg" animate={{backgroundColor: i <= currentStep ? `var(--tw-color-light-accent)` : `var(--tw-color-light-border)`}}/>
                        </div>
                    ))}
                </div>
            </div>
            <motion.div onClick={onNextStep} className="mt-20 text-center cursor-pointer">
                <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}>
                        <StepIcon className={`w-24 h-24 mx-auto text-${workflowSteps[currentStep].color}`}/>
                        <h2 className="text-4xl mt-4 font-bold text-light-text">{workflowSteps[currentStep].title}</h2>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const SolarSystemDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
            <motion.div onClick={onNextStep} className="absolute z-10 w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_40px_rgba(251,191,36,0.7)]">
                <Orbit className="w-12 h-12 text-yellow-900"/>
            </motion.div>
            <motion.div className="w-[500px] h-[500px]" animate={{rotate:360}} transition={{duration:60, repeat:Infinity, ease:'linear'}}>
                {workflowSteps.map((s, i) => (
                    <motion.div key={i} className="absolute top-1/2 left-1/2" style={{transform:`rotate(${(i/workflowSteps.length)*360}deg) translateX(250px)`}}>
                         <motion.div className={`w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center`} animate={{scale: currentStep === i ? 1.5 : 1, backgroundColor: `var(--tw-color-${s.color})`}}>
                            <s.Icon className="w-4 h-4 text-white"/>
                        </motion.div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
};

const FlowerBloomDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-green-50">
            <motion.div onClick={onNextStep} className="relative w-[400px] h-[400px] cursor-pointer">
                <AnimatePresence>
                    <motion.div key={currentStep}>
                         {workflowSteps.map((s, i) => (
                             <motion.div key={i} className={`absolute w-full h-full rounded-[50%] bg-${s.color}/30`}
                                initial={{transform: 'rotate(0deg) scale(0)', transformOrigin: '50% 100%'}}
                                animate={{transform: `rotate(${(i/workflowSteps.length)*360}deg) scale(1)`}}
                                transition={{delay: i * 0.05, type:'spring', stiffness:100}}/>
                         ))}
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-20 bg-white rounded-full flex flex-col items-center justify-center text-center p-2">
                    <step.Icon className={`w-12 h-12 text-${step.color}`}/>
                    <p className={`font-bold text-${step.color}`}>{step.title}</p>
                </div>
            </motion.div>
        </div>
    );
};

const WaterRipplesDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const [ripple, setRipple] = useState(0);
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-blue-500 overflow-hidden" onClick={() => {onNextStep(); setRipple(r => r+1)}}>
             <AnimatePresence>
                <motion.div key={ripple} className={`absolute w-20 h-20 rounded-full border-4 border-${step.color}`} initial={{scale:0, opacity:1}} animate={{scale:20, opacity:0}} transition={{duration:1}}/>
            </AnimatePresence>
            <motion.div className="relative z-10 text-center text-white">
                <step.Icon className="w-24 h-24 mx-auto"/>
                <h2 className="text-4xl mt-4 font-bold">{step.title}</h2>
            </motion.div>
        </div>
    );
};

const TreeGrowthDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const StepIcon = workflowSteps[currentStep].Icon;
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-lime-50" onClick={onNextStep}>
            <svg className="w-full h-2/3" viewBox="0 0 200 150">
                <motion.path d="M 100 150 V 10" stroke="#84cc16" strokeWidth="2" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1}}/>
                {workflowSteps.map((s, i) => {
                    const angle = -90 + (i - (workflowSteps.length-1)/2) * 15;
                    const d = `M 100 10 L ${100 + Math.cos(angle * Math.PI/180) * 80} ${10 + Math.sin(angle * Math.PI/180) * 80}`;
                    return <motion.path key={i} d={d} stroke={i <= currentStep ? `var(--tw-color-${s.color})` : '#d4d4d4'} strokeWidth="2" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.5, delay: 1 + i*0.1}}/>
                })}
            </svg>
            <div className="text-center">
                 <StepIcon className={`w-16 h-16 mx-auto text-${workflowSteps[currentStep].color}`}/>
                <h2 className="text-3xl font-bold">{workflowSteps[currentStep].title}</h2>
            </div>
        </div>
    );
};

const InkblotDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-white" onClick={onNextStep}>
            <svg className="absolute w-0 h-0">
                <filter id="ink-goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -10" result="goo" />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
            </svg>
             <motion.div className="w-[600px] h-[600px]" style={{filter: 'url(#ink-goo)'}}>
                 <AnimatePresence>
                 <motion.div key={currentStep} initial={{scale:0}} animate={{scale:1}} exit={{scale:0}} transition={{duration:0.5}}>
                    {[...Array(6)].map((_, i) => (
                        <motion.div key={i} className={`absolute w-40 h-40 rounded-full bg-${step.color}`} style={{top: '50%', left:'50%', x:'-50%', y:'-50%'}}
                        animate={{
                            x: `${Math.cos(i*2) * 100 - 50}%`,
                            y: `${Math.sin(i*3) * 100 - 50}%`,
                            rotate: Math.random() * 360
                        }}
                        transition={{duration: 2, repeat:Infinity, repeatType:'reverse', ease:'easeInOut'}}/>
                    ))}
                 </motion.div>
                </AnimatePresence>
            </motion.div>
            <div className="absolute text-center">
                <step.Icon className={`w-24 h-24 mx-auto text-white mix-blend-difference`}/>
                <h2 className="text-4xl mt-4 font-bold text-white mix-blend-difference">{step.title}</h2>
            </div>
        </div>
    );
};

const StainedGlassDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-200" onClick={onNextStep}>
            <div className="w-[500px] h-[500px] grid grid-cols-3 gap-1 rotate-45">
                {[...workflowSteps, {color:'light-accent'}].map((s,i) => (
                    <motion.div key={i} className={`bg-${s.color} border-4 border-black`}
                        animate={{opacity: currentStep === i || i > workflowSteps.length-1 ? 1 : 0.3}}
                    />
                ))}
            </div>
            <div className="absolute text-center bg-black/50 p-8 rounded-lg text-white">
                <step.Icon className="w-24 h-24 mx-auto"/>
                <h2 className="text-4xl mt-4 font-bold">{step.title}</h2>
            </div>
        </div>
    );
};

const OrigamiDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-blue-100" onClick={onNextStep}>
            <div className="w-64 h-64" style={{perspective: '1000px'}}>
                <AnimatePresence>
                <motion.div key={currentStep} className={`w-full h-full bg-${step.color} flex items-center justify-center`}
                    initial={{rotateY: 180}} animate={{rotateY:0}} exit={{rotateY:-180}} transition={{duration:0.5}}>
                    <step.Icon className="w-32 h-32 text-white"/>
                </motion.div>
                </AnimatePresence>
            </div>
            <h2 className="absolute bottom-20 text-3xl font-bold text-gray-700">{step.title}</h2>
        </div>
    );
};

const CassetteTapeDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-gray-300" onClick={onNextStep}>
            <div className="w-[500px] h-80 bg-gray-100 rounded-lg shadow-lg p-6 flex flex-col justify-between border border-gray-200">
                <div className="w-full h-20 bg-gray-800 text-white font-mono p-4 text-center rounded">
                    {step.title}
                </div>
                <div className="flex justify-around items-center">
                    <motion.div className="w-24 h-24 rounded-full bg-gray-800 border-4 border-gray-100 shadow-inner" animate={{rotate:360}} transition={{duration:2, repeat:Infinity, ease:'linear'}}/>
                    <motion.div className="w-24 h-24 rounded-full bg-gray-800 border-4 border-gray-100 shadow-inner" animate={{rotate:360}} transition={{duration:2, repeat:Infinity, ease:'linear'}}/>
                </div>
            </div>
        </div>
    );
};

const CardDeckDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-indigo-50" onClick={onNextStep}>
            <div className="relative w-64 h-80">
            <AnimatePresence>
                {workflowSteps.slice(0, currentStep + 1).map((s,i) => (
                    <motion.div key={i} className={`absolute w-full h-full bg-${s.color} rounded-xl shadow-lg flex flex-col items-center justify-center text-white p-4`}
                        initial={{scale:0.8, y: -50, opacity: 0}}
                        animate={{
                            scale: i === currentStep ? 1 : 0.9,
                            y: i === currentStep ? 0 : (currentStep - i) * -10,
                            zIndex: i,
                            opacity: 1
                        }}
                        exit={{y: 100, opacity:0}}
                        transition={{type:'spring', stiffness:100, damping:15}}
                    >
                        {i === currentStep && <>
                            <s.Icon className="w-24 h-24"/>
                            <h2 className="text-2xl font-bold mt-4">{s.title}</h2>
                        </>}
                    </motion.div>
                ))}
            </AnimatePresence>
            </div>
        </div>
    );
};

const SubwayMapDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gray-100 p-8" onClick={onNextStep}>
            <div className="relative w-full max-w-4xl h-2 bg-gray-300 rounded-full flex items-center">
                {workflowSteps.map((s, i) => (
                    <div key={i} className="absolute flex flex-col items-center" style={{left: `${(i / (workflowSteps.length -1)) * 100}%`}}>
                        <motion.div className={`w-6 h-6 rounded-full border-4 border-gray-100 bg-${s.color} -mt-2`} animate={{scale: currentStep === i ? 1.5 : 1}}/>
                        <p className={`mt-8 text-xs font-bold text-${s.color}`}>{s.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BookPagesDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-stone-200" onClick={onNextStep}>
            <div className="w-[600px] h-[400px] bg-white rounded-lg shadow-2xl flex" style={{perspective: '2000px'}}>
                <div className="w-1/2 h-full bg-stone-50"/>
                <div className="w-1/2 h-full bg-stone-50 relative">
                    <AnimatePresence>
                    <motion.div key={currentStep} className={`absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center origin-left border-l border-stone-200`}
                        initial={{rotateY: -180}} animate={{rotateY:0}} exit={{rotateY:-180}} transition={{duration:0.7}}>
                        <step.Icon className={`w-24 h-24 text-${step.color}`}/>
                        <h2 className={`text-3xl font-bold mt-4 text-${step.color}`}>{step.title}</h2>
                        <p className="absolute bottom-4 right-4 font-bold">{currentStep+1}</p>
                    </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const GameUIDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const progress = room.currentProcedure?.progress || 0;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-800 text-white" onClick={onNextStep}>
            <AnimatePresence>
            <motion.div key={currentStep} className="text-center" initial={{opacity:0, y:50}} animate={{opacity:1, y:0}} exit={{opacity:0}}>
                <div className="p-2 border-2 border-cyan-400 bg-cyan-900/50 inline-block">
                    <p className="font-mono text-cyan-400">ÚKOL AKTUALIZOVÁN</p>
                </div>
                <h2 className="text-6xl font-bold my-8 uppercase" style={{textShadow: '0 0 10px white'}}>{step.title}</h2>
                <div className="w-96 h-4 bg-gray-700 border-2 border-gray-500 mx-auto">
                    <motion.div className={`h-full bg-gradient-to-r from-green-400 to-cyan-400`} initial={{width:0}} animate={{width: `${progress}%`}}/>
                </div>
            </motion.div>
            </AnimatePresence>
        </div>
    );
};

const WatchFaceDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    const angle = (currentStep / (workflowSteps.length-1)) * 270 - 135;
    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black" onClick={onNextStep}>
            <div className="w-[500px] h-[500px] rounded-full bg-gray-800 border-8 border-gray-600 flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full bg-white z-10"/>
                 <motion.div className="absolute w-2 h-1/2 bottom-1/2 origin-bottom" animate={{rotate: angle}} transition={{type:'spring', damping:20}}>
                    <div className="w-full h-full bg-red-500"/>
                 </motion.div>
                <div className="absolute text-center" style={{transform: 'translateY(100px)'}}>
                    <step.Icon className="w-12 h-12 text-white mx-auto"/>
                    <h2 className="text-2xl font-bold text-white mt-2">{step.title}</h2>
                </div>
            </div>
        </div>
    );
};

const ProgressBarDial: React.FC<{ room: OperatingRoom; currentStep: number; onNextStep: () => void }> = ({ room, currentStep, onNextStep }) => {
    const step = workflowSteps[currentStep];
    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8" onClick={onNextStep}>
            <AnimatePresence mode="wait">
            <motion.div key={currentStep} className="text-center w-full max-xl" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                <div className="flex justify-between font-mono text-sm text-light-text-subtle">
                    <p>Fáze {currentStep + 1}/{workflowSteps.length}</p>
                    <p>{step.title}</p>
                </div>
                <div className="w-full h-4 bg-light-border rounded-full mt-2 overflow-hidden">
                     <motion.div className={`h-full bg-${step.color}`} animate={{width: `${((currentStep+1)/workflowSteps.length)*100}%`}} transition={{duration:0.5}}/>
                </div>
            </motion.div>
            </AnimatePresence>
        </div>
    );
};

const animationVariants = [
    { id: 'original', name: 'Originál', Component: OriginalDial },
    { id: 'kinetic', name: 'Kinetický', Component: KineticDial },
    { id: 'radar', name: 'Radar', Component: RadarDial },
    { id: 'minimalist', name: 'Minimalistický', Component: MinimalistDial },
    { id: 'spectrum', name: 'Duhový', Component: SpectrumDial },
    { id: 'scanner', name: 'Scanner', Component: ScannerDial },
    { id: 'steampunk', name: 'Steampunk', Component: SteampunkDial },
    { id: 'particles', name: 'Částice', Component: ParticlesDial },
    { id: 'dataviz', name: 'DataViz', Component: DataVizDial },
    { id: 'blueprint', name: 'Plán', Component: BlueprintDial },
    { id: 'neon', name: 'Neon', Component: NeonDial },
    { id: 'organic', name: 'Organický', Component: OrganicDial },
    { id: 'flipbook', name: 'Flipbook', Component: FlipbookDial },
    { id: 'compass', name: 'Kompas', Component: CompassDial },
    { id: 'waveform', name: 'Vlna', Component: WaveformDial },
    { id: 'atom', name: 'Atom', Component: AtomDial },
    { id: 'glitch', name: 'Glitch', Component: GlitchDial },
    { id: 'liquid', name: 'Tekutý', Component: LiquidDial },
    { id: 'hud', name: 'HUD', Component: HUDDial },
    { id: 'sonar', name: 'Sonar', Component: SonarDial },
    { id: 'equalizer', name: 'Ekvalizér', Component: EqualizerDial },
    { id: 'circuitboard', name: 'Obvod', Component: CircuitBoardDial },
    { id: 'codematrix', name: 'Matrix', Component: CodeMatrixDial },
    { id: 'timeline', name: 'Časová osa', Component: TimelineDial },
    { id: 'solarsystem', name: 'Planety', Component: SolarSystemDial },
    { id: 'flowerbloom', name: 'Květ', Component: FlowerBloomDial },
    { id: 'waterripples', name: 'Vlnky', Component: WaterRipplesDial },
    { id: 'treegrowth', name: 'Strom', Component: TreeGrowthDial },
    { id: 'inkblot', name: 'Skvrna', Component: InkblotDial },
    { id: 'stainedglass', name: 'Vitráž', Component: StainedGlassDial },
    { id: 'origami', name: 'Origami', Component: OrigamiDial },
    { id: 'cassettetape', name: 'Kazeta', Component: CassetteTapeDial },
    { id: 'carddeck', name: 'Karty', Component: CardDeckDial },
    { id: 'subwaymap', name: 'Metro', Component: SubwayMapDial },
    { id: 'bookpages', name: 'Kniha', Component: BookPagesDial },
    { id: 'gameui', name: 'Herní UI', Component: GameUIDial },
    { id: 'watchface', name: 'Ciferník', Component: WatchFaceDial },
    { id: 'progressbar', name: 'Průběh', Component: ProgressBarDial },
];

const AnimationsGallery: React.FC = () => {
    const [activeVariant, setActiveVariant] = useState(animationVariants[0].id);
    const [currentStep, setCurrentStep] = useState(2);
    
    const mockRoom = MOCK_ROOMS[5]; 

    const handleNextStep = () => {
        setCurrentStep(prev => (prev + 1) % workflowSteps.length);
    };

    const ActiveDial = animationVariants.find(v => v.id === activeVariant)!.Component;

    return (
        <div className="w-full h-full text-light-text relative overflow-hidden bg-light-bg">
            <DetailHeader onClose={() => { /* Navigate back */ }} room={mockRoom} />
            
            <div className="absolute top-28 left-0 right-0 z-30 flex justify-center px-4">
                <div className="flex items-center gap-2 p-1.5 bg-light-panel/80 backdrop-blur-lg border border-light-border rounded-full shadow-soft overflow-x-auto max-w-full hide-scrollbar">
                    {animationVariants.map(v => (
                        <button key={v.id} onClick={() => setActiveVariant(v.id)} className={`relative px-4 py-2 text-sm font-bold rounded-full transition-colors flex-shrink-0 ${activeVariant === v.id ? 'text-white' : 'text-light-text-subtle hover:text-light-text'}`}>
                            {activeVariant === v.id && <motion.div layoutId="active-pill" className="absolute inset-0 bg-light-accent rounded-full" />}
                            <span className="relative">{v.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <main className="w-full h-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeVariant}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: 'easeInOut' }}
                        className="w-full h-full"
                    >
                        <ActiveDial room={mockRoom} currentStep={currentStep} onNextStep={handleNextStep} />
                    </motion.div>
                </AnimatePresence>
            </main>

            <FooterControls currentStep={currentStep} onNextStep={handleNextStep} />
        </div>
    );
};

export default AnimationsGallery;
