import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Edit2, Trash2, X, Check,
  Clock, Shield, Activity
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
  const names = [
    'MUDr. Jan Novák', 'MUDr. Petr Svoboda', 'MUDr. Martin Dvořák', 'MUDr. Tomáš Černý',
    'MUDr. Pavel Procházka', 'MUDr. Jaroslav Kučera', 'MUDr. Miroslav Veselý', 'MUDr. František Horák',
    'MUDr. Václav Němec', 'MUDr. Karel Marek', 'MUDr. Josef Pospíšil', 'MUDr. Jiří Hájek',
    'MUDr. Anna Králová', 'MUDr. Eva Němcová', 'MUDr. Marie Pokorná', 'MUDr. Jana Růžičková',
    'MUDr. Lucie Benešová', 'MUDr. Tereza Fialová', 'MUDr. Kateřina Sedláčková', 'MUDr. Monika Urbanová',
  ];
  const qualifications: DoctorQualification[] = ['L1', 'L2', 'L3', 'S', 'A'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40, 30, 20];
  return names.map((name, i) => ({
    id: `doc-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { aro: Math.random() > 0.3, jip: Math.random() > 0.4, emergency: Math.random() > 0.5, or: Math.random() > 0.4 },
    employmentType: Math.random() > 0.2 ? 'I' : 'E',
  }));
};

const generateNurses = (): Nurse[] => {
  const names = [
    'Bc. Marie Nováková', 'Bc. Jana Svobodová', 'Bc. Eva Dvořáková', 'Bc. Anna Černá',
    'Bc. Petra Procházková', 'Bc. Lucie Kučerová', 'Bc. Tereza Veselá', 'Bc. Hana Horáková',
    'Bc. Kateřina Němcová', 'Bc. Monika Marková', 'Bc. Lenka Pospíšilová', 'Bc. Alena Hájková',
    'Bc. Zuzana Králová', 'Bc. Markéta Pokorná', 'Bc. Simona Růžičková', 'Bc. Denisa Benešová',
  ];
  const qualifications: NurseQualification[] = ['S', 'A', 'D', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40];
  return names.map((name, i) => ({
    id: `nurse-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { aro: Math.random() > 0.3, jip: Math.random() > 0.4, emergency: Math.random() > 0.5, or: Math.random() > 0.6 },
    employmentType: Math.random() > 0.15 ? 'I' : 'E',
  }));
};

const generateORNurses = (): ORNurse[] => {
  const names = [
    'Bc. Iveta Nová', 'Bc. Martina Svobodná', 'Bc. Božena Dvořáková', 'Bc. Jiřina Černá',
    'Bc. Zdeňka Procházková', 'Bc. Vlasta Kučerová', 'Bc. Emilie Veselá', 'Bc. Libuše Horáková',
    'Bc. Stanislava Němcová', 'Bc. Květa Marková', 'Bc. Drahomíra Pospíšilová', 'Bc. Miroslava Hájková',
    'Bc. Jaroslava Králová', 'Bc. Ludmila Pokorná', 'Bc. Věra Růžičková', 'Bc. Danuše Benešová',
  ];
  const qualifications: ORNurseQualification[] = ['S', 'A', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50];
  return names.map((name, i) => ({
    id: `or-nurse-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { surgery: Math.random() > 0.3, trauma: Math.random() > 0.4, ortho: Math.random() > 0.4, gyneco: Math.random() > 0.5, minor: Math.random() > 0.3, davinci: Math.random() > 0.7, neuro: Math.random() > 0.6 },
    employmentType: Math.random() > 0.15 ? 'I' : 'E',
  }));
};

// Workload circle badge – red→yellow→green by value
const WorkloadBadge: React.FC<{ workload: number }> = ({ workload }) => {
  const getColor = (w: number) => {
    if (w <= 30) return { stroke: '#EF4444', text: '#EF4444', bg: 'rgba(239,68,68,0.08)' };
    if (w <= 50) return { stroke: '#F97316', text: '#F97316', bg: 'rgba(249,115,22,0.08)' };
    if (w <= 70) return { stroke: '#F59E0B', text: '#F59E0B', bg: 'rgba(245,158,11,0.08)' };
    if (w <= 90) return { stroke: '#84CC16', text: '#84CC16', bg: 'rgba(132,204,22,0.08)' };
    return { stroke: '#10B981', text: '#10B981', bg: 'rgba(16,185,129,0.08)' };
  };
  const c = getColor(workload);
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (workload / 100) * circ;
  return (
    <div className="flex items-center justify-center w-10 h-10 relative" style={{ background: c.bg, borderRadius: '50%' }}>
      <svg className="absolute inset-0 w-10 h-10 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={c.stroke} strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-black relative z-10" style={{ color: c.text }}>
        {workload}
      </span>
    </div>
  );
};

// Qualification badge – color by level
const QualBadge: React.FC<{ qual: string; category: StaffCategory }> = ({ qual, category }) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    L3: { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
    L2: { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
    L1: { bg: 'rgba(139,92,246,0.12)', text: '#A78BFA', border: 'rgba(139,92,246,0.3)' },
    K:  { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
    D:  { bg: 'rgba(59,130,246,0.12)', text: '#60A5FA', border: 'rgba(59,130,246,0.3)' },
    A:  { bg: 'rgba(245,158,11,0.12)', text: '#FBBF24', border: 'rgba(245,158,11,0.3)' },
    S:  { bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', border: 'rgba(107,114,128,0.3)' },
  };
  const c = colors[qual] ?? colors['S'];
  return (
    <span
      className="px-2 py-1 rounded-md text-[11px] font-black tracking-wide"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {qual}
    </span>
  );
};

// Skill tags for doctors/nurses – each tag its own color
const SKILL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  aro:       { bg: 'rgba(239,68,68,0.10)',   text: '#F87171', border: 'rgba(239,68,68,0.25)' },
  jip:       { bg: 'rgba(245,158,11,0.10)',  text: '#FBBF24', border: 'rgba(245,158,11,0.25)' },
  emergency: { bg: 'rgba(139,92,246,0.10)',  text: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  or:        { bg: 'rgba(59,130,246,0.10)',  text: '#60A5FA', border: 'rgba(59,130,246,0.25)' },
  surgery:   { bg: 'rgba(239,68,68,0.10)',   text: '#F87171', border: 'rgba(239,68,68,0.25)' },
  trauma:    { bg: 'rgba(245,158,11,0.10)',  text: '#FBBF24', border: 'rgba(245,158,11,0.25)' },
  ortho:     { bg: 'rgba(16,185,129,0.10)',  text: '#34D399', border: 'rgba(16,185,129,0.25)' },
  gyneco:    { bg: 'rgba(236,72,153,0.10)',  text: '#F472B6', border: 'rgba(236,72,153,0.25)' },
  minor:     { bg: 'rgba(139,92,246,0.10)',  text: '#A78BFA', border: 'rgba(139,92,246,0.25)' },
  davinci:   { bg: 'rgba(0,216,193,0.10)',   text: '#00D8C1', border: 'rgba(0,216,193,0.25)' },
  neuro:     { bg: 'rgba(6,182,212,0.10)',   text: '#22D3EE', border: 'rgba(6,182,212,0.25)' },
};

const SkillTags: React.FC<{ skills: DoctorSkills | NurseSkills }> = ({ skills }) => {
  const skillList = [
    { key: 'aro', label: 'ARO' },
    { key: 'jip', label: 'JIP' },
    { key: 'emergency', label: 'UP' },
    { key: 'or', label: 'OS' },
  ];
  const activeSkills = skillList.filter(s => skills[s.key as keyof typeof skills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-[10px]">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => {
        const c = SKILL_COLORS[skill.key];
        return (
          <span key={skill.key}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
          >{skill.label}</span>
        );
      })}
    </div>
  );
};

const ORSkillTags: React.FC<{ skills: ORNurseSkills }> = ({ skills }) => {
  const skillList = [
    { key: 'surgery', label: 'CHI' }, { key: 'trauma', label: 'TRA' },
    { key: 'ortho', label: 'ORT' }, { key: 'gyneco', label: 'GYN' },
    { key: 'minor', label: 'MO' }, { key: 'davinci', label: 'DaV' },
    { key: 'neuro', label: 'NCH' },
  ];
  const activeSkills = skillList.filter(s => skills[s.key as keyof ORNurseSkills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-[10px]">—</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => {
        const c = SKILL_COLORS[skill.key];
        return (
          <span key={skill.key}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
          >{skill.label}</span>
        );
      })}
    </div>
  );
};

const StaffManager: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [doctors, setDoctors] = useState<Doctor[]>(generateDoctors);
  const [nurses, setNurses] = useState<Nurse[]>(generateNurses);
  const [orNurses, setORNurses] = useState<ORNurse[]>(generateORNurses);
  
  const [editForm, setEditForm] = useState<{
    name: string;
    qualification: string;
    workload: number;
    employmentType: EmploymentType;
    skills: DoctorSkills | NurseSkills | ORNurseSkills;
  }>({
    name: '',
    qualification: '',
    workload: 100,
    employmentType: 'I',
    skills: { aro: false, jip: false, emergency: false, or: false },
  });

  const resetForm = () => {
    if (activeCategory === 'doctors') {
      setEditForm({ name: '', qualification: 'L1', workload: 100, employmentType: 'I', skills: { aro: false, jip: false, emergency: false, or: false } });
    } else if (activeCategory === 'nurses') {
      setEditForm({ name: '', qualification: 'S', workload: 100, employmentType: 'I', skills: { aro: false, jip: false, emergency: false, or: false } });
    } else {
      setEditForm({ name: '', qualification: 'S', workload: 100, employmentType: 'I', skills: { surgery: false, trauma: false, ortho: false, gyneco: false, minor: false, davinci: false, neuro: false } });
    }
  };

  const startEditing = (item: Doctor | Nurse | ORNurse) => {
    setEditingId(item.id);
    setEditForm({ name: item.name, qualification: item.qualification, workload: item.workload, employmentType: item.employmentType, skills: { ...item.skills } });
  };

  const cancelEditing = () => { setEditingId(null); setIsAddingNew(false); resetForm(); };

  const saveEdit = () => {
    if (!editForm.name.trim()) return;
    if (activeCategory === 'doctors') {
      if (isAddingNew) {
        setDoctors(prev => [...prev, { id: `doc-${Date.now()}`, name: editForm.name, qualification: editForm.qualification as DoctorQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as DoctorSkills }]);
      } else {
        setDoctors(prev => prev.map(d => d.id === editingId ? { ...d, name: editForm.name, qualification: editForm.qualification as DoctorQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as DoctorSkills } : d));
      }
    } else if (activeCategory === 'nurses') {
      if (isAddingNew) {
        setNurses(prev => [...prev, { id: `nurse-${Date.now()}`, name: editForm.name, qualification: editForm.qualification as NurseQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as NurseSkills }]);
      } else {
        setNurses(prev => prev.map(n => n.id === editingId ? { ...n, name: editForm.name, qualification: editForm.qualification as NurseQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as NurseSkills } : n));
      }
    } else {
      if (isAddingNew) {
        setORNurses(prev => [...prev, { id: `or-nurse-${Date.now()}`, name: editForm.name, qualification: editForm.qualification as ORNurseQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as ORNurseSkills }]);
      } else {
        setORNurses(prev => prev.map(n => n.id === editingId ? { ...n, name: editForm.name, qualification: editForm.qualification as ORNurseQualification, workload: editForm.workload, employmentType: editForm.employmentType, skills: editForm.skills as ORNurseSkills } : n));
      }
    }
    setEditingId(null); setIsAddingNew(false); resetForm();
  };

  const deleteItem = (id: string) => {
    if (activeCategory === 'doctors') setDoctors(prev => prev.filter(d => d.id !== id));
    else if (activeCategory === 'nurses') setNurses(prev => prev.filter(n => n.id !== id));
    else setORNurses(prev => prev.filter(n => n.id !== id));
  };

  const startAddNew = () => { setIsAddingNew(true); setEditingId(null); resetForm(); };

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Lékaři', count: doctors.length },
    { id: 'nurses' as StaffCategory, label: 'Sestry', count: nurses.length },
    { id: 'or_nurses' as StaffCategory, label: 'Sálové sestry', count: orNurses.length },
  ];

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let results: (Doctor | Nurse | ORNurse)[] = [];
    
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    
    results = data.filter(item => {
      // Search by name
      if (item.name.toLowerCase().includes(query)) return true;
      
      // Search by qualification
      if (item.qualification.toLowerCase().includes(query)) return true;
      
      // Search by employment type
      const employmentText = item.employmentType === 'I' ? 'interní' : 'externí';
      if (employmentText.includes(query)) return true;
      
      // Search by skills
      const skills = item.skills;
      for (const [key, value] of Object.entries(skills)) {
        if (value && key.toLowerCase().includes(query)) return true;
      }
      
      // Map skill keys to readable names
      const skillNames: Record<string, string> = {
        aro: 'aro', jip: 'jip', emergency: 'urgentní', or: 'operační',
        surgery: 'chirurgie', trauma: 'traumatologie', ortho: 'ortopedie',
        gyneco: 'gynekologie', minor: 'malé obory', davinci: 'davinci', neuro: 'neurochirurgie'
      };
      
      for (const [key, value] of Object.entries(skills)) {
        if (value && skillNames[key]?.includes(query)) return true;
      }
      
      return false;
    });
    
    return results;
  }, [activeCategory, searchQuery, doctors, nurses, orNurses]);

  // Stats
  const stats = useMemo(() => {
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    return {
      total: data.length,
      internal: data.filter(d => d.employmentType === 'I').length,
      external: data.filter(d => d.employmentType === 'E').length,
      fullTime: data.filter(d => d.workload === 100).length,
    };
  }, [activeCategory, doctors, nurses, orNurses]);

  return (
    <div className="w-full max-w-[2000px] mx-auto">
      {/* Header - matching dashboard style */}
      <header className="mb-16">
        <div className="flex items-center gap-3 mb-3 opacity-60">
          <Shield className="w-4 h-4 text-[#00D8C1]" />
          <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">STAFF MANAGEMENT</p>
        </div>
        <h1 className="text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
          PERSONÁL <span className="text-white/20">CONTROL</span>
        </h1>
      </header>

      {/* Centered Search */}
      <div className="flex justify-center mb-10">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00D8C1]" />
          <input
            type="text"
            placeholder="Hledat podle jména, kvalifikace, typu, specializace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#00D8C1]/50 focus:bg-white/[0.05] transition-all text-sm text-center"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Cards - Active/Ready style */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const themeColor = cat.id === 'doctors' ? '#3B82F6' : cat.id === 'nurses' ? '#EC4899' : '#10B981';
          const Icon = cat.id === 'doctors' ? Stethoscope : cat.id === 'nurses' ? Heart : Users;
          
          return (
            <motion.button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setEditingId(null); setIsAddingNew(false); }}
              className={`relative group rounded-lg overflow-hidden transition-all duration-300 flex items-center gap-4 px-5 py-4 border ${
                isActive
                  ? 'bg-white/[0.06] border-white/15 shadow-[0_10px_25px_-8px_rgba(0,0,0,0.4)]'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* Glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(600px at 50% 0%, ${themeColor}08, transparent 80%)`
                }}
              />

              {/* Icon */}
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: `${themeColor}15`,
                    border: `1px solid ${themeColor}30`
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: themeColor }} />
                </div>
              </div>

              {/* Label + Count */}
              <div className="relative flex-1 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">
                  {cat.label}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.7)' }}
                >
                  {cat.count}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Add Staff Button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={startAddNew}
          className="px-6 py-3 rounded-lg bg-[#00D8C1]/10 border border-[#00D8C1]/30 text-[#00D8C1] font-bold flex items-center gap-2 hover:bg-[#00D8C1]/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Přidat zaměstnance
        </button>
      </div>

      {/* 2-column card grid - Compact inspired by screenshot */}
      {filteredData.length === 0 ? (
        <div className="py-16 text-center text-white/30 border border-white/5 rounded-xl">
          Žádní zaměstnanci nenalezeni
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredData.map((item, index) => {
            const avatarColor = (() => {
              const colors = ['#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#F87171', '#06B6D4', '#84CC16'];
              return colors[index % colors.length];
            })();
            
            const getInitials = (name: string) => {
              const parts = name.split(' ');
              return parts.length >= 2 ? (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
            };

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="group relative rounded-lg border border-white/[0.08] overflow-hidden p-3 transition-all hover:border-white/15"
                style={{
                  background: `linear-gradient(135deg, rgb(12, 13, 27) 0%, rgba(255, 255, 255, 0.02) 100%)`
                }}
              >
                {/* Top Row: Avatar + Name + Qual + Type + Actions */}
                <div className="flex items-start gap-3 mb-2">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(item.name)}
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <QualBadge qual={item.qualification} category={activeCategory} />
                      <span
                        className="text-[8px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: item.employmentType === 'I' ? 'rgba(0,216,193,0.15)' : 'rgba(245,158,11,0.15)',
                          color: item.employmentType === 'I' ? '#00D8C1' : '#F59E0B',
                          border: `1px solid ${item.employmentType === 'I' ? 'rgba(0,216,193,0.3)' : 'rgba(245,158,11,0.3)'}`
                        }}
                      >
                        {item.employmentType}
                      </span>
                    </div>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => startEditing(item)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1 mb-2 pl-14">
                  {activeCategory === 'or_nurses'
                    ? <ORSkillTags skills={(item as ORNurse).skills} />
                    : <SkillTags skills={(item as Doctor | Nurse).skills} />
                  }
                </div>

                {/* Workload progress bar */}
                <div className="space-y-1.5 pl-14">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-wide">Úvazek</span>
                    <span className="text-[10px] font-bold text-white">{item.workload}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.1]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: item.workload === 100 ? '#10B981' : item.workload >= 80 ? '#84CC16' : item.workload >= 60 ? '#F59E0B' : item.workload >= 40 ? '#F97316' : '#EF4444',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.workload}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Available status */}
                <div className="flex items-center gap-1.5 mt-2 pl-14 text-[10px] text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>K dispozici</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      <div className="mt-4 text-xs text-white/30">
        Zobrazeno {filteredData.length} z {activeCategory === 'doctors' ? doctors.length : activeCategory === 'nurses' ? nurses.length : orNurses.length} záznamů
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {(isAddingNew || editingId) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={cancelEditing}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#00D8C1] uppercase tracking-wider mb-1">
                      {activeCategory === 'doctors' ? 'Lékař' : activeCategory === 'nurses' ? 'Sestra' : 'Sálová sestra'}
                    </p>
                    <h3 className="text-lg font-bold text-white">
                      {isAddingNew ? 'Nový záznam' : 'Upravit záznam'}
                    </h3>
                  </div>
                  <button onClick={cancelEditing} className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-medium">Jméno</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
                      placeholder="Celé jméno..."
                      autoFocus
                    />
                  </div>

                  {/* Qualification & Workload */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-medium">Kvalifikace</label>
                      <select
                        value={editForm.qualification}
                        onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-white/20 transition-all"
                      >
                        {activeCategory === 'doctors' ? (
                          <>
                            <option value="L3">L3 - Atestace</option>
                            <option value="L2">L2 - Pokročilý</option>
                            <option value="L1">L1 - Základní</option>
                            <option value="A">A - Absolvent</option>
                            <option value="S">S - Stážista</option>
                          </>
                        ) : activeCategory === 'nurses' ? (
                          <>
                            <option value="K">K - Kvalifikovaná</option>
                            <option value="D">D - Pod dohledem</option>
                            <option value="A">A - Absolventka</option>
                            <option value="S">S - Stážistka</option>
                          </>
                        ) : (
                          <>
                            <option value="K">K - Kvalifikovaná</option>
                            <option value="A">A - Absolventka</option>
                            <option value="S">S - Stážistka</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-medium">Úvazek (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        step="10"
                        value={editForm.workload}
                        onChange={(e) => setEditForm({ ...editForm, workload: parseInt(e.target.value) || 100 })}
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-white/20 transition-all text-center"
                      />
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-medium">Typ zaměstnance</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, employmentType: 'I' })}
                        className={`py-3 rounded-xl font-medium transition-all text-sm ${
                          editForm.employmentType === 'I'
                            ? 'bg-[#00D8C1]/10 border-2 border-[#00D8C1]/50 text-[#00D8C1]'
                            : 'bg-white/[0.02] border border-white/10 text-white/40 hover:bg-white/[0.05]'
                        }`}
                      >
                        Interní (I)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, employmentType: 'E' })}
                        className={`py-3 rounded-xl font-medium transition-all text-sm ${
                          editForm.employmentType === 'E'
                            ? 'bg-[#F59E0B]/10 border-2 border-[#F59E0B]/50 text-[#F59E0B]'
                            : 'bg-white/[0.02] border border-white/10 text-white/40 hover:bg-white/[0.05]'
                        }`}
                      >
                        Externí (E)
                      </button>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <label className="block text-[11px] text-white/40 mb-2 uppercase tracking-wider font-medium">Specializace</label>
                    <div className="flex flex-wrap gap-2">
                      {activeCategory === 'or_nurses' ? (
                        ['surgery', 'trauma', 'ortho', 'gyneco', 'minor', 'davinci', 'neuro'].map(key => {
                          const labels: Record<string, string> = { surgery: 'CHI', trauma: 'TRA', ortho: 'ORT', gyneco: 'GYN', minor: 'MO', davinci: 'DaV', neuro: 'NCH' };
                          const isActive = (editForm.skills as ORNurseSkills)[key as keyof ORNurseSkills];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setEditForm({
                                ...editForm,
                                skills: { ...(editForm.skills as ORNurseSkills), [key]: !isActive },
                              })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive ? 'bg-white/10 border border-white/20 text-white' : 'bg-white/[0.02] border border-white/5 text-white/40 hover:bg-white/[0.05]'
                              }`}
                            >
                              {labels[key]}
                            </button>
                          );
                        })
                      ) : (
                        ['aro', 'jip', 'emergency', 'or'].map(key => {
                          const labels: Record<string, string> = { aro: 'ARO', jip: 'JIP', emergency: 'UP', or: 'OS' };
                          const isActive = (editForm.skills as DoctorSkills | NurseSkills)[key as keyof (DoctorSkills | NurseSkills)];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setEditForm({
                                ...editForm,
                                skills: { ...(editForm.skills as DoctorSkills | NurseSkills), [key]: !isActive },
                              })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive ? 'bg-white/10 border border-white/20 text-white' : 'bg-white/[0.02] border border-white/5 text-white/40 hover:bg-white/[0.05]'
                              }`}
                            >
                              {labels[key]}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-white/5 flex gap-3">
                  <button
                    onClick={saveEdit}
                    disabled={!editForm.name.trim()}
                    className="flex-1 py-3 rounded-xl bg-white text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all text-sm"
                  >
                    <Check className="w-4 h-4" />
                    {isAddingNew ? 'Přidat' : 'Uložit'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10 transition-all text-sm"
                  >
                    Zrušit
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManager;
