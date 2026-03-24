import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Edit2, Trash2, X, Check,
  Clock, ChevronRight, User, Briefcase, Award, Building2
} from 'lucide-react';

// Types
type DoctorQualification = 'L1' | 'L2' | 'L3' | 'S' | 'A';
type NurseQualification = 'S' | 'A' | 'D' | 'K';
type ORNurseQualification = 'S' | 'A' | 'K';
type EmploymentType = 'I' | 'E';
type StaffCategory = 'doctors' | 'nurses' | 'or_nurses';

interface DoctorSkills {
  aro: boolean;
  jip: boolean;
  emergency: boolean;
  or: boolean;
}

interface NurseSkills {
  aro: boolean;
  jip: boolean;
  emergency: boolean;
  or: boolean;
}

interface ORNurseSkills {
  surgery: boolean;
  trauma: boolean;
  ortho: boolean;
  gyneco: boolean;
  minor: boolean;
  davinci: boolean;
  neuro: boolean;
}

interface Doctor {
  id: string;
  name: string;
  qualification: DoctorQualification;
  workload: number;
  skills: DoctorSkills;
  employmentType: EmploymentType;
}

interface Nurse {
  id: string;
  name: string;
  qualification: NurseQualification;
  workload: number;
  skills: NurseSkills;
  employmentType: EmploymentType;
}

interface ORNurse {
  id: string;
  name: string;
  qualification: ORNurseQualification;
  workload: number;
  skills: ORNurseSkills;
  employmentType: EmploymentType;
}

// Mock data generators
const generateDoctors = (): Doctor[] => {
  const names = [
    'MUDr. Jan Novák', 'MUDr. Petr Svoboda', 'MUDr. Martin Dvořák', 'MUDr. Tomáš Černý',
    'MUDr. Pavel Procházka', 'MUDr. Jaroslav Kučera', 'MUDr. Miroslav Veselý', 'MUDr. František Horák',
    'MUDr. Václav Němec', 'MUDr. Karel Marek', 'MUDr. Josef Pospíšil', 'MUDr. Jiří Hájek',
    'MUDr. Anna Králová', 'MUDr. Eva Němcová', 'MUDr. Marie Pokorná', 'MUDr. Jana Růžičková',
    'MUDr. Lucie Benešová', 'MUDr. Tereza Fialová', 'MUDr. Kateřina Sedláčková', 'MUDr. Monika Urbanová',
    'MUDr. Petra Dostálová', 'MUDr. Hana Šimková', 'MUDr. Alena Kopecká', 'MUDr. Lenka Marková',
    'MUDr. Zdeněk Kadlec', 'MUDr. Radek Vlček', 'MUDr. David Kořínek', 'MUDr. Lukáš Bartoš',
    'MUDr. Ondřej Polák', 'MUDr. Adam Krejčí', 'MUDr. Jakub Šťastný', 'MUDr. Michal Holub',
    'MUDr. Roman Blažek', 'MUDr. Stanislav Kozák', 'MUDr. Vladimír Řezníček', 'MUDr. Igor Matoušek',
    'MUDr. Robert Doležal', 'MUDr. Daniel Kratochvíl', 'MUDr. Patrik Havlíček', 'MUDr. Vojtěch Tesař',
    'MUDr. Aleš Konečný', 'MUDr. Marek Vaněk', 'MUDr. Štěpán Jelínek', 'MUDr. Viktor Kolar',
    'MUDr. Richard Urbánek', 'MUDr. Milan Šimek', 'MUDr. Vlastimil Hrubý', 'MUDr. Libor Beneš',
    'MUDr. Oldřich Tuček', 'MUDr. Ivo Machač'
  ];
  const qualifications: DoctorQualification[] = ['L1', 'L2', 'L3', 'S', 'A'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40, 30, 20];
  
  return names.map((name, i) => ({
    id: `doc-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: {
      aro: Math.random() > 0.3,
      jip: Math.random() > 0.4,
      emergency: Math.random() > 0.5,
      or: Math.random() > 0.4,
    },
    employmentType: Math.random() > 0.2 ? 'I' : 'E',
  }));
};

const generateNurses = (): Nurse[] => {
  const names = [
    'Bc. Marie Nováková', 'Bc. Jana Svobodová', 'Bc. Eva Dvořáková', 'Bc. Anna Černá',
    'Bc. Petra Procházková', 'Bc. Lucie Kučerová', 'Bc. Tereza Veselá', 'Bc. Hana Horáková',
    'Bc. Kateřina Němcová', 'Bc. Monika Marková', 'Bc. Lenka Pospíšilová', 'Bc. Alena Hájková',
    'Bc. Zuzana Králová', 'Bc. Markéta Pokorná', 'Bc. Simona Růžičková', 'Bc. Denisa Benešová',
    'Bc. Veronika Fialová', 'Bc. Michaela Sedláčková', 'Bc. Nikola Urbanová', 'Bc. Barbora Dostálová',
    'Bc. Kristýna Šimková', 'Bc. Adéla Kopecká', 'Bc. Eliška Marešová', 'Bc. Vendula Kadlecová',
    'Bc. Klára Vlčková', 'Bc. Sabina Kořínková', 'Bc. Ivana Bartošová', 'Bc. Renata Poláková',
    'Bc. Dagmar Krejčová', 'Bc. Blanka Šťastná', 'Bc. Helena Holubová', 'Bc. Jitka Blažková',
    'Bc. Pavla Kozáková', 'Bc. Dana Řezníčková', 'Bc. Věra Matoušková', 'Bc. Zdena Doležalová',
    'Bc. Milena Kratochvílová', 'Bc. Olga Havlíčková', 'Bc. Radka Tesařová', 'Bc. Soňa Konečná',
    'Bc. Gabriela Vaňková', 'Bc. Romana Jelínková', 'Bc. Andrea Kolářová', 'Bc. Iva Urbánková',
    'Bc. Naděžda Šimková', 'Bc. Marta Hrubá', 'Bc. Ludmila Benešová', 'Bc. Jaroslava Tučková',
    'Bc. Božena Machačová', 'Bc. Růžena Novotná'
  ];
  const qualifications: NurseQualification[] = ['S', 'A', 'D', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40];
  
  return names.map((name, i) => ({
    id: `nurse-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: {
      aro: Math.random() > 0.3,
      jip: Math.random() > 0.4,
      emergency: Math.random() > 0.5,
      or: Math.random() > 0.6,
    },
    employmentType: Math.random() > 0.15 ? 'I' : 'E',
  }));
};

const generateORNurses = (): ORNurse[] => {
  const names = [
    'Bc. Iveta Nová', 'Bc. Martina Svobodná', 'Bc. Božena Dvořáková', 'Bc. Jiřina Černá',
    'Bc. Zdeňka Procházková', 'Bc. Vlasta Kučerová', 'Bc. Emilie Veselá', 'Bc. Libuše Horáková',
    'Bc. Stanislava Němcová', 'Bc. Květa Marková', 'Bc. Drahomíra Pospíšilová', 'Bc. Miroslava Hájková',
    'Bc. Jaroslava Králová', 'Bc. Ludmila Pokorná', 'Bc. Věra Růžičková', 'Bc. Danuše Benešová',
    'Bc. Milada Fialová', 'Bc. Jarmila Sedláčková', 'Bc. Růžena Urbanová', 'Bc. Zdislava Dostálová',
    'Bc. Antonie Šimková', 'Bc. Bohumila Kopecká', 'Bc. Cecílie Marešová', 'Bc. Doubravka Kadlecová',
    'Bc. Eliška Vlčková', 'Bc. Františka Kořínková', 'Bc. Gertruda Bartošová', 'Bc. Hedvika Poláková',
    'Bc. Iva Krejčová', 'Bc. Julie Šťastná', 'Bc. Klára Holubová', 'Bc. Lada Blažková',
    'Bc. Magdalena Kozáková', 'Bc. Nina Řezníčková', 'Bc. Olga Matoušková', 'Bc. Patricie Doležalová',
    'Bc. Radmila Kratochvílová', 'Bc. Sylvie Havlíčková', 'Bc. Tamara Tesařová', 'Bc. Ulrika Konečná',
    'Bc. Vilma Vaňková', 'Bc. Xenie Jelínková', 'Bc. Yveta Kolářová', 'Bc. Zina Urbánková',
    'Bc. Agáta Šimková', 'Bc. Blanka Hrubá', 'Bc. Ctibora Benešová', 'Bc. Darina Tučková',
    'Bc. Ema Machačová', 'Bc. Filipa Novotná'
  ];
  const qualifications: ORNurseQualification[] = ['S', 'A', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50];
  
  return names.map((name, i) => ({
    id: `or-nurse-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: {
      surgery: Math.random() > 0.3,
      trauma: Math.random() > 0.4,
      ortho: Math.random() > 0.4,
      gyneco: Math.random() > 0.5,
      minor: Math.random() > 0.3,
      davinci: Math.random() > 0.7,
      neuro: Math.random() > 0.6,
    },
    employmentType: Math.random() > 0.15 ? 'I' : 'E',
  }));
};

// Staff Card Component
const StaffCard: React.FC<{
  item: Doctor | Nurse | ORNurse;
  category: StaffCategory;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ item, category, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getQualificationInfo = (qual: string) => {
    if (category === 'doctors') {
      const info: Record<string, { label: string; color: string; desc: string }> = {
        'L3': { label: 'L3', color: '#10B981', desc: 'Atestace' },
        'L2': { label: 'L2', color: '#3B82F6', desc: 'Pokročilý' },
        'L1': { label: 'L1', color: '#8B5CF6', desc: 'Základní' },
        'A': { label: 'A', color: '#F59E0B', desc: 'Absolvent' },
        'S': { label: 'S', color: '#6B7280', desc: 'Stážista' },
      };
      return info[qual] || { label: qual, color: '#64748B', desc: '' };
    } else if (category === 'nurses') {
      const info: Record<string, { label: string; color: string; desc: string }> = {
        'K': { label: 'K', color: '#10B981', desc: 'Kvalifikovaná' },
        'D': { label: 'D', color: '#3B82F6', desc: 'Pod dohledem' },
        'A': { label: 'A', color: '#F59E0B', desc: 'Absolventka' },
        'S': { label: 'S', color: '#6B7280', desc: 'Stážistka' },
      };
      return info[qual] || { label: qual, color: '#64748B', desc: '' };
    } else {
      const info: Record<string, { label: string; color: string; desc: string }> = {
        'K': { label: 'K', color: '#10B981', desc: 'Kvalifikovaná' },
        'A': { label: 'A', color: '#F59E0B', desc: 'Absolventka' },
        'S': { label: 'S', color: '#6B7280', desc: 'Stážistka' },
      };
      return info[qual] || { label: qual, color: '#64748B', desc: '' };
    }
  };

  const qualInfo = getQualificationInfo(item.qualification);
  const isInternal = item.employmentType === 'I';

  const getSkillsList = () => {
    if (category === 'or_nurses') {
      const skills = item.skills as ORNurseSkills;
      return [
        { key: 'surgery', label: 'Chirurgie', short: 'CHI', active: skills.surgery, color: '#EF4444' },
        { key: 'trauma', label: 'Traumatologie', short: 'TRA', active: skills.trauma, color: '#F59E0B' },
        { key: 'ortho', label: 'Ortopedie', short: 'ORT', active: skills.ortho, color: '#10B981' },
        { key: 'gyneco', label: 'Gynekologie', short: 'GYN', active: skills.gyneco, color: '#EC4899' },
        { key: 'minor', label: 'Malé obory', short: 'MO', active: skills.minor, color: '#8B5CF6' },
        { key: 'davinci', label: 'DaVinci', short: 'DaV', active: skills.davinci, color: '#3B82F6' },
        { key: 'neuro', label: 'Neurochirurgie', short: 'NCH', active: skills.neuro, color: '#06B6D4' },
      ];
    } else {
      const skills = item.skills as DoctorSkills | NurseSkills;
      return [
        { key: 'aro', label: 'ARO lůžka', short: 'ARO', active: skills.aro, color: '#EF4444' },
        { key: 'jip', label: 'JIP', short: 'JIP', active: skills.jip, color: '#F59E0B' },
        { key: 'emergency', label: 'Urgentní příjem', short: 'UP', active: skills.emergency, color: '#8B5CF6' },
        { key: 'or', label: 'Operační sály', short: 'OS', active: skills.or, color: '#3B82F6' },
      ];
    }
  };

  const skillsList = getSkillsList();
  const activeSkills = skillsList.filter(s => s.active);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <div 
        className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 overflow-hidden cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Accent line */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${qualInfo.color}80, transparent)` }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Avatar & Name */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${qualInfo.color}15`, border: `1px solid ${qualInfo.color}30` }}
              >
                <User className="w-5 h-5" style={{ color: qualInfo.color }} />
              </div>
              
              {/* Name & Type */}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white truncate">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: isInternal ? '#10B98115' : '#F59E0B15',
                      color: isInternal ? '#10B981' : '#F59E0B',
                      border: `1px solid ${isInternal ? '#10B98130' : '#F59E0B30'}`
                    }}
                  >
                    {isInternal ? 'Interní' : 'Externí'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Badges */}
            <div className="flex items-center gap-3">
              {/* Qualification */}
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ 
                  backgroundColor: `${qualInfo.color}15`,
                  color: qualInfo.color,
                  border: `1px solid ${qualInfo.color}30`
                }}
                title={qualInfo.desc}
              >
                {qualInfo.label}
              </div>

              {/* Workload */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                <Clock className="w-3.5 h-3.5 text-white/40" />
                <span className="text-sm font-medium text-white/70">{item.workload}%</span>
              </div>

              {/* Expand Arrow */}
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/30"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            </div>
          </div>

          {/* Skills Preview */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {skillsList.map(skill => (
              <span
                key={skill.key}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  skill.active 
                    ? 'opacity-100' 
                    : 'opacity-30'
                }`}
                style={{ 
                  backgroundColor: skill.active ? `${skill.color}15` : 'transparent',
                  color: skill.active ? skill.color : '#64748B',
                  border: `1px solid ${skill.active ? `${skill.color}30` : '#ffffff10'}`
                }}
              >
                {skill.short}
              </span>
            ))}
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-2 border-t border-white/[0.05]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Award className="w-3.5 h-3.5" />
                      <span>Kvalifikace</span>
                    </div>
                    <p className="text-sm font-medium text-white">{qualInfo.desc}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Úvazek</span>
                    </div>
                    <p className="text-sm font-medium text-white">{item.workload}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Typ</span>
                    </div>
                    <p className="text-sm font-medium text-white">{isInternal ? 'Kmenový' : 'Externí'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Specializace</span>
                    </div>
                    <p className="text-sm font-medium text-white">{activeSkills.length} z {skillsList.length}</p>
                  </div>
                </div>

                {/* Active Skills */}
                <div className="mb-4">
                  <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Aktivní specializace</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSkills.length > 0 ? activeSkills.map(skill => (
                      <span
                        key={skill.key}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ 
                          backgroundColor: `${skill.color}15`,
                          color: skill.color,
                          border: `1px solid ${skill.color}30`
                        }}
                      >
                        {skill.label}
                      </span>
                    )) : (
                      <span className="text-sm text-white/30">Žádné specializace</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Upravit
                  </motion.button>
                  <motion.button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (confirm('Opravdu chcete smazat tohoto zaměstnance?')) onDelete(); 
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const StaffManager: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItem, setEditingItem] = useState<Doctor | Nurse | ORNurse | null>(null);
  
  const [doctors, setDoctors] = useState<Doctor[]>(generateDoctors);
  const [nurses, setNurses] = useState<Nurse[]>(generateNurses);
  const [orNurses, setORNurses] = useState<ORNurse[]>(generateORNurses);
  
  // Form state
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
      setEditForm({
        name: '',
        qualification: 'L1',
        workload: 100,
        employmentType: 'I',
        skills: { aro: false, jip: false, emergency: false, or: false },
      });
    } else if (activeCategory === 'nurses') {
      setEditForm({
        name: '',
        qualification: 'S',
        workload: 100,
        employmentType: 'I',
        skills: { aro: false, jip: false, emergency: false, or: false },
      });
    } else {
      setEditForm({
        name: '',
        qualification: 'S',
        workload: 100,
        employmentType: 'I',
        skills: { surgery: false, trauma: false, ortho: false, gyneco: false, minor: false, davinci: false, neuro: false },
      });
    }
  };

  const startEditing = (item: Doctor | Nurse | ORNurse) => {
    setEditingItem(item);
    setIsAddingNew(false);
    setEditForm({
      name: item.name,
      qualification: item.qualification,
      workload: item.workload,
      employmentType: item.employmentType,
      skills: { ...item.skills },
    });
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingItem(null);
    resetForm();
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsAddingNew(false);
    resetForm();
  };

  const saveEdit = () => {
    if (!editForm.name.trim()) return;
    
    if (activeCategory === 'doctors') {
      if (isAddingNew) {
        const newItem: Doctor = {
          id: `doc-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as DoctorQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as DoctorSkills,
        };
        setDoctors(prev => [newItem, ...prev]);
      } else if (editingItem) {
        setDoctors(prev => prev.map(d => 
          d.id === editingItem.id ? { ...d, ...editForm, qualification: editForm.qualification as DoctorQualification, skills: editForm.skills as DoctorSkills } : d
        ));
      }
    } else if (activeCategory === 'nurses') {
      if (isAddingNew) {
        const newItem: Nurse = {
          id: `nurse-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as NurseQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as NurseSkills,
        };
        setNurses(prev => [newItem, ...prev]);
      } else if (editingItem) {
        setNurses(prev => prev.map(n => 
          n.id === editingItem.id ? { ...n, ...editForm, qualification: editForm.qualification as NurseQualification, skills: editForm.skills as NurseSkills } : n
        ));
      }
    } else {
      if (isAddingNew) {
        const newItem: ORNurse = {
          id: `or-nurse-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as ORNurseQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as ORNurseSkills,
        };
        setORNurses(prev => [newItem, ...prev]);
      } else if (editingItem) {
        setORNurses(prev => prev.map(n => 
          n.id === editingItem.id ? { ...n, ...editForm, qualification: editForm.qualification as ORNurseQualification, skills: editForm.skills as ORNurseSkills } : n
        ));
      }
    }
    
    cancelEdit();
  };

  const deleteItem = (id: string) => {
    if (activeCategory === 'doctors') {
      setDoctors(prev => prev.filter(d => d.id !== id));
    } else if (activeCategory === 'nurses') {
      setNurses(prev => prev.filter(n => n.id !== id));
    } else {
      setORNurses(prev => prev.filter(n => n.id !== id));
    }
  };

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Lékaři', icon: Stethoscope, color: '#3B82F6', count: doctors.length },
    { id: 'nurses' as StaffCategory, label: 'Sestry', icon: Heart, color: '#EC4899', count: nurses.length },
    { id: 'or_nurses' as StaffCategory, label: 'Sálové sestry', icon: Users, color: '#10B981', count: orNurses.length },
  ];

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (activeCategory === 'doctors') {
      return doctors.filter(d => d.name.toLowerCase().includes(query));
    } else if (activeCategory === 'nurses') {
      return nurses.filter(n => n.name.toLowerCase().includes(query));
    } else {
      return orNurses.filter(n => n.name.toLowerCase().includes(query));
    }
  }, [activeCategory, searchQuery, doctors, nurses, orNurses]);

  const currentCategory = categories.find(c => c.id === activeCategory)!;

  // Stats
  const getStats = () => {
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    const internal = data.filter(d => d.employmentType === 'I').length;
    const fullTime = data.filter(d => d.workload === 100).length;
    return { total: data.length, internal, external: data.length - internal, fullTime };
  };
  const stats = getStats();

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#10B981] tracking-[0.3em] uppercase">Management</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Personál</h1>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Celkem', value: stats.total, color: currentCategory.color },
          { label: 'Interních', value: stats.internal, color: '#10B981' },
          { label: 'Externích', value: stats.external, color: '#F59E0B' },
          { label: 'Plný úvazek', value: stats.fullTime, color: '#3B82F6' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
          >
            <p className="text-xs text-white/40 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); cancelEdit(); }}
              className={`px-5 py-3 rounded-xl border flex items-center gap-3 font-medium transition-all ${
                isActive 
                  ? 'bg-white/[0.08] border-white/[0.15]' 
                  : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon 
                className="w-5 h-5 transition-colors" 
                style={{ color: isActive ? cat.color : 'rgba(255,255,255,0.4)' }} 
              />
              <span className={isActive ? 'text-white' : 'text-white/60'}>{cat.label}</span>
              <span 
                className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: isActive ? `${cat.color}20` : 'rgba(255,255,255,0.05)',
                  color: isActive ? cat.color : 'rgba(255,255,255,0.4)'
                }}
              >
                {cat.count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            placeholder="Hledat podle jména..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all"
          />
        </div>
        <motion.button
          onClick={startAddNew}
          className="px-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ 
            backgroundColor: `${currentCategory.color}15`,
            border: `1px solid ${currentCategory.color}30`,
            color: currentCategory.color
          }}
          whileHover={{ scale: 1.02, backgroundColor: `${currentCategory.color}25` }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-5 h-5" />
          Přidat
        </motion.button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAddingNew || editingItem) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div 
              className="p-6 rounded-2xl border"
              style={{ 
                backgroundColor: `${currentCategory.color}08`,
                borderColor: `${currentCategory.color}25`
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-5">
                {isAddingNew ? 'Přidat nového zaměstnance' : 'Upravit zaměstnance'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {/* Name */}
                <div className="lg:col-span-2">
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Jméno</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white placeholder-white/30 focus:outline-none focus:border-white/[0.2] transition-all"
                    placeholder="Celé jméno"
                  />
                </div>
                
                {/* Qualification */}
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Kvalifikace</label>
                  <select
                    value={editForm.qualification}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-all"
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
                
                {/* Workload */}
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Úvazek (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="10"
                    value={editForm.workload}
                    onChange={(e) => setEditForm({ ...editForm, workload: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.05] text-white focus:outline-none focus:border-white/[0.2] transition-all"
                  />
                </div>
              </div>

              {/* Employment Type */}
              <div className="mb-5">
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Typ zaměstnance</label>
                <div className="flex gap-3">
                  {[
                    { value: 'I', label: 'Interní', color: '#10B981' },
                    { value: 'E', label: 'Externí', color: '#F59E0B' },
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, employmentType: type.value as EmploymentType })}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        editForm.employmentType === type.value
                          ? ''
                          : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:bg-white/[0.05]'
                      }`}
                      style={editForm.employmentType === type.value ? {
                        backgroundColor: `${type.color}15`,
                        border: `1px solid ${type.color}40`,
                        color: type.color
                      } : {}}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Skills */}
              <div className="mb-6">
                <label className="block text-xs text-white/50 mb-3 uppercase tracking-wider">Specializace</label>
                <div className="flex flex-wrap gap-2">
                  {activeCategory === 'or_nurses' ? (
                    [
                      { key: 'surgery', label: 'Chirurgie', color: '#EF4444' },
                      { key: 'trauma', label: 'Traumatologie', color: '#F59E0B' },
                      { key: 'ortho', label: 'Ortopedie', color: '#10B981' },
                      { key: 'gyneco', label: 'Gynekologie', color: '#EC4899' },
                      { key: 'minor', label: 'Malé obory', color: '#8B5CF6' },
                      { key: 'davinci', label: 'DaVinci', color: '#3B82F6' },
                      { key: 'neuro', label: 'Neurochirurgie', color: '#06B6D4' },
                    ].map(skill => {
                      const isActive = (editForm.skills as ORNurseSkills)[skill.key as keyof ORNurseSkills];
                      return (
                        <button
                          key={skill.key}
                          type="button"
                          onClick={() => setEditForm({
                            ...editForm,
                            skills: {
                              ...(editForm.skills as ORNurseSkills),
                              [skill.key]: !isActive,
                            },
                          })}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          style={isActive ? {
                            backgroundColor: `${skill.color}15`,
                            border: `1px solid ${skill.color}40`,
                            color: skill.color
                          } : {
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.4)'
                          }}
                        >
                          {skill.label}
                        </button>
                      );
                    })
                  ) : (
                    [
                      { key: 'aro', label: 'ARO lůžka', color: '#EF4444' },
                      { key: 'jip', label: 'JIP', color: '#F59E0B' },
                      { key: 'emergency', label: 'Urgentní příjem', color: '#8B5CF6' },
                      { key: 'or', label: 'Operační sály', color: '#3B82F6' },
                    ].map(skill => {
                      const isActive = (editForm.skills as DoctorSkills | NurseSkills)[skill.key as keyof (DoctorSkills | NurseSkills)];
                      return (
                        <button
                          key={skill.key}
                          type="button"
                          onClick={() => setEditForm({
                            ...editForm,
                            skills: {
                              ...(editForm.skills as DoctorSkills | NurseSkills),
                              [skill.key]: !isActive,
                            },
                          })}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                          style={isActive ? {
                            backgroundColor: `${skill.color}15`,
                            border: `1px solid ${skill.color}40`,
                            color: skill.color
                          } : {
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.4)'
                          }}
                        >
                          {skill.label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  onClick={saveEdit}
                  disabled={!editForm.name.trim()}
                  className="px-6 py-3 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ 
                    backgroundColor: currentCategory.color,
                    color: '#000'
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Check className="w-4 h-4" />
                  {isAddingNew ? 'Přidat' : 'Uložit'}
                </motion.button>
                <motion.button
                  onClick={cancelEdit}
                  className="px-6 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/70 font-semibold flex items-center gap-2 hover:bg-white/[0.08] transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <X className="w-4 h-4" />
                  Zrušit
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredData.map((item) => (
            <StaffCard
              key={item.id}
              item={item}
              category={activeCategory}
              onEdit={() => startEditing(item)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40">Žádní zaměstnanci nenalezeni</p>
          <p className="text-white/20 text-sm mt-1">Zkuste změnit vyhledávací dotaz</p>
        </motion.div>
      )}
    </div>
  );
};

export default StaffManager;
