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

// Skill tags for doctors/nurses
const SkillTags: React.FC<{ skills: DoctorSkills | NurseSkills }> = ({ skills }) => {
  const skillList = [
    { key: 'aro', label: 'ARO' },
    { key: 'jip', label: 'JIP' },
    { key: 'emergency', label: 'UP' },
    { key: 'or', label: 'OS' },
  ];
  const activeSkills = skillList.filter(s => skills[s.key as keyof typeof skills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-xs">-</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => (
        <span key={skill.key} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/60 border border-white/10">
          {skill.label}
        </span>
      ))}
    </div>
  );
};

// Skill tags for OR nurses
const ORSkillTags: React.FC<{ skills: ORNurseSkills }> = ({ skills }) => {
  const skillList = [
    { key: 'surgery', label: 'CHI' },
    { key: 'trauma', label: 'TRA' },
    { key: 'ortho', label: 'ORT' },
    { key: 'gyneco', label: 'GYN' },
    { key: 'minor', label: 'MO' },
    { key: 'davinci', label: 'DaV' },
    { key: 'neuro', label: 'NCH' },
  ];
  const activeSkills = skillList.filter(s => skills[s.key as keyof ORNurseSkills]);
  if (activeSkills.length === 0) return <span className="text-white/20 text-xs">-</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {activeSkills.map(skill => (
        <span key={skill.key} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/60 border border-white/10">
          {skill.label}
        </span>
      ))}
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
    if (activeCategory === 'doctors') return doctors.filter(d => d.name.toLowerCase().includes(query));
    else if (activeCategory === 'nurses') return nurses.filter(n => n.name.toLowerCase().includes(query));
    else return orNurses.filter(n => n.name.toLowerCase().includes(query));
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

      {/* Stats Bar - matching dashboard stats */}
      <div className="flex gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-[2rem] mb-10 w-fit">
        {[
          { label: 'CELKEM', value: stats.total, icon: Users },
          { label: 'INTERNÍ', value: stats.internal, icon: Activity },
          { label: 'EXTERNÍ', value: stats.external, icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center justify-center px-8 py-3 rounded-2xl hover:bg-white/[0.03] transition-all">
            <div className="flex items-center gap-2 mb-1 opacity-40">
              <stat.icon className="w-3 h-3" />
              <p className="text-[9px] font-bold uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Category Tabs - clean minimal design */}
      <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-4">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); setEditingId(null); setIsAddingNew(false); }}
              className={`relative pb-4 -mb-4 transition-all ${isActive ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              <span className="text-sm font-semibold">{cat.label}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                {cat.count}
              </span>
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D8C1]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Add - centered clean design */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Hledat podle jména..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-white/10 focus:bg-white/[0.05] transition-all text-sm"
          />
        </div>
        <button
          onClick={startAddNew}
          className="px-5 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white font-medium flex items-center gap-2 hover:bg-white/[0.08] transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Přidat
        </button>
      </div>

      {/* Table - clean minimal design */}
      <div className="rounded-xl border border-white/5 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.02] border-b border-white/5 text-[11px] font-semibold text-white/40 uppercase tracking-wider">
          <div className="col-span-4">Jméno</div>
          <div className="col-span-1 text-center">Kvalifikace</div>
          <div className="col-span-1 text-center">Úvazek</div>
          <div className="col-span-1 text-center">Typ</div>
          <div className="col-span-4">Specializace</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/[0.03]">
          {filteredData.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/30">
              Žádní zaměstnanci nenalezeni
            </div>
          ) : (
            filteredData.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors group"
              >
                <div className="col-span-4">
                  <p className="font-medium text-white text-sm">{item.name}</p>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-white/5 text-white/70 border border-white/10">
                    {item.qualification}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className="text-sm text-white/60">{item.workload}%</span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    item.employmentType === 'I' ? 'bg-[#00D8C1]/10 text-[#00D8C1] border border-[#00D8C1]/20' : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                  }`}>
                    {item.employmentType}
                  </span>
                </div>
                <div className="col-span-4">
                  {activeCategory === 'or_nurses' ? (
                    <ORSkillTags skills={(item as ORNurse).skills} />
                  ) : (
                    <SkillTags skills={(item as Doctor | Nurse).skills} />
                  )}
                </div>
                <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditing(item)}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Opravdu chcete smazat tohoto zaměstnance?')) deleteItem(item.id); }}
                    className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

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
