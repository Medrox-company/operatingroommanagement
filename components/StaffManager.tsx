import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Edit2, Trash2, X, Check,
  Clock, Shield, Activity, Award, Briefcase, Zap, Filter, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react';

// Types
type DoctorQualification = 'L1' | 'L2' | 'L3' | 'S' | 'A';
type NurseQualification = 'S' | 'A' | 'D' | 'K';
type ORNurseQualification = 'S' | 'A' | 'K';
type EmploymentType = 'I' | 'E';
type StaffCategory = 'doctors' | 'nurses' | 'or_nurses';

interface DoctorSkills { aro: boolean; jip: boolean; emergency: boolean; or: boolean; }
interface NurseSkills { aro: boolean; jip: boolean; emergency: boolean; or: boolean; }
interface ORNurseSkills { surgery: boolean; trauma: boolean; ortho: boolean; gyneco: boolean; minor: boolean; davinci: boolean; neuro: boolean; }

interface Doctor { id: string; name: string; qualification: DoctorQualification; workload: number; skills: DoctorSkills; employmentType: EmploymentType; }
interface Nurse { id: string; name: string; qualification: NurseQualification; workload: number; skills: NurseSkills; employmentType: EmploymentType; }
interface ORNurse { id: string; name: string; qualification: ORNurseQualification; workload: number; skills: ORNurseSkills; employmentType: EmploymentType; }

// Mock data generators
const generateDoctors = (): Doctor[] => {
  const names = ['MUDr. Jan Novák', 'MUDr. Petr Svoboda', 'MUDr. Martin Dvořák', 'MUDr. Tomáš Černý', 'MUDr. Pavel Procházka', 'MUDr. Jaroslav Kučera', 'MUDr. Miroslav Veselý', 'MUDr. František Horák', 'MUDr. Václav Němec', 'MUDr. Karel Marek'];
  const qualifications: DoctorQualification[] = ['L1', 'L2', 'L3', 'S', 'A'];
  const workloads = [100, 100, 80, 80, 60, 50, 40, 30, 20];
  return names.map((name, i) => ({
    id: `doc-${i}`, name, qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { aro: Math.random() > 0.3, jip: Math.random() > 0.4, emergency: Math.random() > 0.5, or: Math.random() > 0.4 },
    employmentType: Math.random() > 0.2 ? 'I' : 'E'
  }));
};

const generateNurses = (): Nurse[] => {
  const names = ['Bc. Marie Nováková', 'Bc. Jana Svobodová', 'Bc. Eva Dvořáková', 'Bc. Anna Černá', 'Bc. Petra Procházková', 'Bc. Lucie Kučerová', 'Bc. Tereza Veselá', 'Bc. Hana Horáková', 'Bc. Kateřina Němcová', 'Bc. Monika Marková'];
  const qualifications: NurseQualification[] = ['S', 'A', 'D', 'K'];
  const workloads = [100, 100, 80, 80, 60, 50, 40, 30, 20];
  return names.map((name, i) => ({
    id: `nurse-${i}`, name, qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { aro: Math.random() > 0.4, jip: Math.random() > 0.3, emergency: Math.random() > 0.6, or: Math.random() > 0.3 },
    employmentType: Math.random() > 0.15 ? 'I' : 'E'
  }));
};

const generateORNurses = (): ORNurse[] => {
  const names = ['Sestra Alena', 'Sestra Marie', 'Sestra Lenka', 'Sestra Zuzana', 'Sestra Petra', 'Sestra Kristýna', 'Sestra Pavlína', 'Sestra Věra', 'Sestra Renáta', 'Sestra Milada'];
  const qualifications: ORNurseQualification[] = ['S', 'A', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40];
  return names.map((name, i) => ({
    id: `or-${i}`, name, qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { surgery: Math.random() > 0.3, trauma: Math.random() > 0.4, ortho: Math.random() > 0.5, gyneco: Math.random() > 0.5, minor: Math.random() > 0.3, davinci: Math.random() > 0.7, neuro: Math.random() > 0.6 },
    employmentType: Math.random() > 0.1 ? 'I' : 'E'
  }));
};

// Skill colors
const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  aro: { bg: 'rgba(239,68,68,0.10)', text: '#F87171', border: 'rgba(239,68,68,0.25)' },
  jip: { bg: 'rgba(245,158,11,0.10)', text: '#FBBF24', border: 'rgba(245,158,11,0.25)' },
  emergency: { bg: 'rgba(139,92,246,0.10)', text: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  or: { bg: 'rgba(59,130,246,0.10)', text: '#60A5FA', border: 'rgba(59,130,246,0.25)' },
  surgery: { bg: 'rgba(239,68,68,0.10)', text: '#F87171', border: 'rgba(239,68,68,0.25)' },
  trauma: { bg: 'rgba(245,158,11,0.10)', text: '#FBBF24', border: 'rgba(245,158,11,0.25)' },
  ortho: { bg: 'rgba(16,185,129,0.10)', text: '#34D399', border: 'rgba(16,185,129,0.25)' },
  gyneco: { bg: 'rgba(236,72,153,0.10)', text: '#F472B6', border: 'rgba(236,72,153,0.25)' },
  minor: { bg: 'rgba(139,92,246,0.10)', text: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  davinci: { bg: 'rgba(0,216,193,0.10)', text: '#00D8C1', border: 'rgba(0,216,193,0.25)' },
  neuro: { bg: 'rgba(6,182,212,0.10)', text: '#22D3EE', border: 'rgba(6,182,212,0.25)' },
};

const SkillTags: React.FC<{ skills: DoctorSkills | NurseSkills }> = ({ skills }) => {
  const skillList = [{ key: 'aro', label: 'ARO' }, { key: 'jip', label: 'JIP' }, { key: 'emergency', label: 'UP' }, { key: 'or', label: 'OS' }];
  const activeSkills = skillList.filter(s => skills[s.key as keyof typeof skills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-[10px]">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => {
        const c = SKILL_COLORS[skill.key];
        return (
          <span key={skill.key} className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            {skill.label}
          </span>
        );
      })}
    </div>
  );
};

const ORSkillTags: React.FC<{ skills: ORNurseSkills }> = ({ skills }) => {
  const skillList = [{ key: 'surgery', label: 'CHI' }, { key: 'trauma', label: 'TRA' }, { key: 'ortho', label: 'ORT' }, { key: 'gyneco', label: 'GYN' }, { key: 'minor', label: 'MO' }, { key: 'davinci', label: 'DaV' }, { key: 'neuro', label: 'NCH' }];
  const activeSkills = skillList.filter(s => skills[s.key as keyof ORNurseSkills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-[10px]">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => {
        const c = SKILL_COLORS[skill.key];
        return (
          <span key={skill.key} className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            {skill.label}
          </span>
        );
      })}
    </div>
  );
};

export default function StaffManager() {
  const [doctors] = useState<Doctor[]>(generateDoctors());
  const [nurses] = useState<Nurse[]>(generateNurses());
  const [orNurses] = useState<ORNurse[]>(generateORNurses());
  
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Lékaři', count: doctors.length, icon: Stethoscope },
    { id: 'nurses' as StaffCategory, label: 'Sestry', count: nurses.length, icon: Heart },
    { id: 'or_nurses' as StaffCategory, label: 'Sálové sestry', count: orNurses.length, icon: Users },
  ];

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    
    return data.filter(item => {
      if (item.name.toLowerCase().includes(query)) return true;
      if (item.qualification.toLowerCase().includes(query)) return true;
      const employmentText = item.employmentType === 'I' ? 'interní' : 'externí';
      if (employmentText.includes(query)) return true;
      for (const [key, value] of Object.entries(item.skills)) {
        if (value && key.toLowerCase().includes(query)) return true;
      }
      return false;
    });
  }, [activeCategory, searchQuery, doctors, nurses, orNurses]);

  const selectedStaff = selectedStaffId ? filteredData.find(s => s.id === selectedStaffId) : null;

  const stats = {
    available: filteredData.filter(s => s.workload === 100).length,
    busy: filteredData.filter(s => s.workload > 50 && s.workload < 100).length,
    avgWorkload: Math.round(filteredData.reduce((sum, s) => sum + s.workload, 0) / filteredData.length || 0)
  };

  const getQualColor = (qual: string) => {
    const colors: Record<string, string> = {
      L3: 'bg-green-500/15 text-green-300 border-green-500/30',
      L2: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      L1: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      K: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      D: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      A: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
      S: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    };
    return colors[qual] || 'bg-white/5 text-white/50 border-white/10';
  };

  const getWorkloadColor = (workload: number) => {
    if (workload === 100) return 'text-green-400';
    if (workload >= 80) return 'text-lime-400';
    if (workload >= 60) return 'text-yellow-400';
    if (workload >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="w-full space-y-12">
      {/* Header */}
      <header className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">PERSONÁL CONTROL</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            PERSONÁL <span className="text-white/20">MANAGEMENT</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl overflow-hidden">
          {[
            { label: 'DOSTUPNÍ', value: stats.available, icon: Activity, color: 'text-green-500' },
            { label: 'OBSAZENI', value: stats.busy, icon: Clock, color: 'text-yellow-500' },
            { label: 'AVG ÚVAZEK', value: `${stats.avgWorkload}%`, icon: TrendingUp, color: 'text-[#00D8C1]' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-10 py-4 rounded-3xl hover:bg-white/5 transition-all min-w-[140px] z-10">
              <div className="flex items-center gap-2.5 mb-2 opacity-40">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-4">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedStaffId(null); }}
              className={`flex items-center gap-2 pb-4 px-4 -mb-4 transition-all ${isActive ? 'text-white border-b-2 border-[#00D8C1]' : 'text-white/40 hover:text-white/60'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold">{cat.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Hledat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/10 focus:bg-white/[0.05] transition-all text-sm"
        />
      </div>

      {/* Main Content - 3 Column Grid */}
      <div>
        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredData.map((item, idx) => (
            <motion.button
              key={item.id}
              onClick={() => setSelectedStaffId(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer group flex items-center gap-4 h-32 ${
                selectedStaffId === item.id
                  ? 'bg-[#00D8C1]/15 border-[#00D8C1]/50 shadow-lg shadow-[#00D8C1]/20'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Left - Qual Icon + Name + Type */}
              <div className="flex-1 text-left flex flex-col justify-between h-full min-w-0">
                <div className="flex items-start gap-3">
                  {/* Qualification Icon */}
                  <div className={`p-2 rounded-lg shrink-0 ${
                    item.qualification === 'S' ? 'bg-blue-500/20' :
                    item.qualification === 'A' ? 'bg-purple-500/20' :
                    item.qualification === 'K' ? 'bg-green-500/20' :
                    item.qualification === 'D' ? 'bg-red-500/20' :
                    'bg-white/10'
                  }`}>
                    {item.qualification === 'S' ? <Award className="w-6 h-6 text-blue-400" /> :
                     item.qualification === 'A' ? <Shield className="w-6 h-6 text-purple-400" /> :
                     item.qualification === 'K' ? <Stethoscope className="w-6 h-6 text-green-400" /> :
                     item.qualification === 'D' ? <Users className="w-6 h-6 text-red-400" /> :
                     <Award className="w-6 h-6 text-white/40" />}
                  </div>

                  {/* Name + Type */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-semibold truncate ${selectedStaffId === item.id ? 'text-[#00D8C1]' : 'text-white'}`}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${item.employmentType === 'I' ? 'bg-teal-500/20 text-teal-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {item.employmentType === 'I' ? 'INT' : 'EXT'}
                      </span>
                      <span className="text-[9px] font-black text-white/40">
                        {item.qualification}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specializace - inline s barvami a větší */}
                <div className="flex flex-wrap gap-2">
                  {activeCategory === 'or_nurses' 
                    ? Object.entries((item as ORNurse).skills).filter(([, v]) => v).slice(0, 3).map(([k]) => {
                        const skillColors: Record<string, { bg: string; text: string }> = {
                          'davinci': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
                          'neuro': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
                          'emergency': { bg: 'bg-red-500/20', text: 'text-red-300' },
                          'or': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' }
                        };
                        const color = skillColors[k.toLowerCase()] || { bg: 'bg-white/10', text: 'text-white/60' };
                        return (
                          <span key={k} className={`text-xs px-2.5 py-1 rounded-lg uppercase font-semibold ${color.bg} ${color.text}`}>
                            {k}
                          </span>
                        );
                      })
                    : Object.entries((item as Doctor | Nurse).skills).filter(([, v]) => v).slice(0, 3).map(([k]) => {
                        const skillColors: Record<string, { bg: string; text: string }> = {
                          'aro': { bg: 'bg-green-500/20', text: 'text-green-300' },
                          'jip': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
                          'emergency': { bg: 'bg-red-500/20', text: 'text-red-300' },
                          'surgery': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
                          'trauma': { bg: 'bg-red-600/20', text: 'text-red-200' },
                          'ortho': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
                          'gyneco': { bg: 'bg-pink-500/20', text: 'text-pink-300' }
                        };
                        const color = skillColors[k.toLowerCase()] || { bg: 'bg-white/10', text: 'text-white/60' };
                        return (
                          <span key={k} className={`text-xs px-2.5 py-1 rounded-lg uppercase font-semibold ${color.bg} ${color.text}`}>
                            {k}
                          </span>
                        );
                      })
                  }
                </div>
              </div>

              {/* Right - Workload vertical progress */}
              <div className="flex flex-col items-center justify-between h-full">
                <span className={`text-lg font-black ${getWorkloadColor(item.workload)}`}>
                  {item.workload}%
                </span>
                <div className="h-20 w-1.5 rounded-full bg-white/[0.05] overflow-hidden border border-white/10">
                  <motion.div
                    className="w-full rounded-full"
                    initial={{ height: 0 }}
                    animate={{ height: `${item.workload}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      backgroundColor: item.workload === 100 ? '#10B981' : item.workload >= 80 ? '#84CC16' : item.workload >= 60 ? '#F59E0B' : item.workload >= 40 ? '#F97316' : '#EF4444'
                    }}
                  />
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Modal Popup - Detail s editací */}
        <AnimatePresence>
          {selectedStaff && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedStaffId(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              />

              {/* Modal */}
              <motion.div
                key={selectedStaff.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 flex items-center justify-center z-50 p-4"
              >
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-6 max-w-md w-full backdrop-blur-xl">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40 font-black tracking-widest uppercase mb-2">Detail personálu</p>
                      <h2 className="text-2xl font-semibold text-white">{selectedStaff.name}</h2>
                    </div>
                    <button
                      onClick={() => setSelectedStaffId(null)}
                      className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/40 uppercase font-bold">Kvalifikace</span>
                      <span className={`px-3 py-1 rounded font-semibold text-sm ${getQualColor(selectedStaff.qualification)}`}>
                        {selectedStaff.qualification}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/40 uppercase font-bold">Typ</span>
                      <span className={`text-sm font-semibold ${selectedStaff.employmentType === 'I' ? 'text-teal-300' : 'text-orange-300'}`}>
                        {selectedStaff.employmentType === 'I' ? 'Interní' : 'Externí'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/40 uppercase font-bold">Úvazek</span>
                      <span className={`text-sm font-black ${getWorkloadColor(selectedStaff.workload)}`}>
                        {selectedStaff.workload}%
                      </span>
                    </div>
                  </div>

                  {/* Specializace */}
                  <div className="border-t border-white/5 pt-4">
                    <p className="text-sm text-white/40 font-black tracking-widest uppercase mb-3">Specializace</p>
                    <div className="flex flex-wrap gap-2">
                      {activeCategory === 'or_nurses' ? <ORSkillTags skills={(selectedStaff as ORNurse).skills} /> : <SkillTags skills={(selectedStaff as Doctor | Nurse).skills} />}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t border-white/5 pt-6">
                    <button
                      onClick={() => { startEditing(selectedStaff); setSelectedStaffId(null); }}
                      className="flex-1 py-3 rounded-lg bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Upravit
                    </button>
                    <button
                      onClick={() => { if (confirm('Opravdu chcete smazat tohoto zaměstnance?')) { deleteItem(selectedStaff.id); setSelectedStaffId(null); } }}
                      className="flex-1 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Smazat
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
