import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Filter, Plus, Edit2, Trash2, X, Check,
  Building2, Clock, Award, UserCheck, UserX, ChevronDown, ChevronUp
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

// Qualification badge component
const QualificationBadge: React.FC<{ qual: string; category: StaffCategory }> = ({ qual, category }) => {
  const getColor = () => {
    if (category === 'doctors') {
      switch (qual) {
        case 'L3': return { bg: '#10B981', text: '#D1FAE5' };
        case 'L2': return { bg: '#3B82F6', text: '#DBEAFE' };
        case 'L1': return { bg: '#8B5CF6', text: '#EDE9FE' };
        case 'A': return { bg: '#F59E0B', text: '#FEF3C7' };
        case 'S': return { bg: '#6B7280', text: '#F3F4F6' };
        default: return { bg: '#64748B', text: '#F1F5F9' };
      }
    } else if (category === 'nurses') {
      switch (qual) {
        case 'K': return { bg: '#10B981', text: '#D1FAE5' };
        case 'D': return { bg: '#3B82F6', text: '#DBEAFE' };
        case 'A': return { bg: '#F59E0B', text: '#FEF3C7' };
        case 'S': return { bg: '#6B7280', text: '#F3F4F6' };
        default: return { bg: '#64748B', text: '#F1F5F9' };
      }
    } else {
      switch (qual) {
        case 'K': return { bg: '#10B981', text: '#D1FAE5' };
        case 'A': return { bg: '#F59E0B', text: '#FEF3C7' };
        case 'S': return { bg: '#6B7280', text: '#F3F4F6' };
        default: return { bg: '#64748B', text: '#F1F5F9' };
      }
    }
  };
  
  const colors = getColor();
  
  return (
    <span
      className="px-2 py-1 rounded-md text-xs font-bold"
      style={{ backgroundColor: `${colors.bg}30`, color: colors.bg, border: `1px solid ${colors.bg}50` }}
    >
      {qual}
    </span>
  );
};

// Workload badge
const WorkloadBadge: React.FC<{ workload: number }> = ({ workload }) => {
  const getColor = () => {
    if (workload >= 100) return '#10B981';
    if (workload >= 80) return '#3B82F6';
    if (workload >= 50) return '#F59E0B';
    return '#EF4444';
  };
  
  return (
    <span
      className="px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"
      style={{ backgroundColor: `${getColor()}20`, color: getColor(), border: `1px solid ${getColor()}40` }}
    >
      <Clock className="w-3 h-3" />
      {workload}%
    </span>
  );
};

// Skill icons for doctors/nurses
const SkillIcons: React.FC<{ skills: DoctorSkills | NurseSkills; category: 'doctors' | 'nurses' }> = ({ skills, category }) => {
  const skillList = [
    { key: 'aro', label: 'ARO', color: '#EF4444' },
    { key: 'jip', label: 'JIP', color: '#F59E0B' },
    { key: 'emergency', label: 'UP', color: '#8B5CF6' },
    { key: 'or', label: 'OS', color: '#3B82F6' },
  ];
  
  return (
    <div className="flex gap-1 flex-wrap">
      {skillList.map(skill => {
        const hasSkill = skills[skill.key as keyof typeof skills];
        return (
          <span
            key={skill.key}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              hasSkill ? 'opacity-100' : 'opacity-20'
            }`}
            style={{ 
              backgroundColor: hasSkill ? `${skill.color}20` : 'transparent',
              color: hasSkill ? skill.color : '#64748B',
              border: `1px solid ${hasSkill ? `${skill.color}40` : '#64748B30'}`
            }}
            title={skill.label}
          >
            {skill.label}
          </span>
        );
      })}
    </div>
  );
};

// Skill icons for OR nurses
const ORSkillIcons: React.FC<{ skills: ORNurseSkills }> = ({ skills }) => {
  const skillList = [
    { key: 'surgery', label: 'CHI', color: '#EF4444' },
    { key: 'trauma', label: 'TRA', color: '#F59E0B' },
    { key: 'ortho', label: 'ORT', color: '#10B981' },
    { key: 'gyneco', label: 'GYN', color: '#EC4899' },
    { key: 'minor', label: 'MO', color: '#8B5CF6' },
    { key: 'davinci', label: 'DaV', color: '#3B82F6' },
    { key: 'neuro', label: 'NCH', color: '#06B6D4' },
  ];
  
  return (
    <div className="flex gap-1 flex-wrap">
      {skillList.map(skill => {
        const hasSkill = skills[skill.key as keyof ORNurseSkills];
        return (
          <span
            key={skill.key}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
              hasSkill ? 'opacity-100' : 'opacity-20'
            }`}
            style={{ 
              backgroundColor: hasSkill ? `${skill.color}20` : 'transparent',
              color: hasSkill ? skill.color : '#64748B',
              border: `1px solid ${hasSkill ? `${skill.color}40` : '#64748B30'}`
            }}
            title={skill.label}
          >
            {skill.label}
          </span>
        );
      })}
    </div>
  );
};

// Employment type badge
const EmploymentBadge: React.FC<{ type: EmploymentType }> = ({ type }) => {
  const isInternal = type === 'I';
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ 
        backgroundColor: isInternal ? '#10B98120' : '#F59E0B20',
        color: isInternal ? '#10B981' : '#F59E0B',
        border: `1px solid ${isInternal ? '#10B98140' : '#F59E0B40'}`
      }}
      title={isInternal ? 'Interní zaměstnanec' : 'Externí zaměstnanec'}
    >
      {type}
    </span>
  );
};

const StaffManager: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [doctors, setDoctors] = useState<Doctor[]>(generateDoctors);
  const [nurses, setNurses] = useState<Nurse[]>(generateNurses);
  const [orNurses, setORNurses] = useState<ORNurse[]>(generateORNurses);
  
  // Form state for editing/adding
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
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      qualification: item.qualification,
      workload: item.workload,
      employmentType: item.employmentType,
      skills: { ...item.skills },
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsAddingNew(false);
    resetForm();
  };

  const saveEdit = () => {
    if (!editForm.name.trim()) return;
    
    if (activeCategory === 'doctors') {
      if (isAddingNew) {
        const newDoctor: Doctor = {
          id: `doc-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as DoctorQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as DoctorSkills,
        };
        setDoctors(prev => [...prev, newDoctor]);
      } else {
        setDoctors(prev => prev.map(d => 
          d.id === editingId ? {
            ...d,
            name: editForm.name,
            qualification: editForm.qualification as DoctorQualification,
            workload: editForm.workload,
            employmentType: editForm.employmentType,
            skills: editForm.skills as DoctorSkills,
          } : d
        ));
      }
    } else if (activeCategory === 'nurses') {
      if (isAddingNew) {
        const newNurse: Nurse = {
          id: `nurse-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as NurseQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as NurseSkills,
        };
        setNurses(prev => [...prev, newNurse]);
      } else {
        setNurses(prev => prev.map(n => 
          n.id === editingId ? {
            ...n,
            name: editForm.name,
            qualification: editForm.qualification as NurseQualification,
            workload: editForm.workload,
            employmentType: editForm.employmentType,
            skills: editForm.skills as NurseSkills,
          } : n
        ));
      }
    } else {
      if (isAddingNew) {
        const newORNurse: ORNurse = {
          id: `or-nurse-${Date.now()}`,
          name: editForm.name,
          qualification: editForm.qualification as ORNurseQualification,
          workload: editForm.workload,
          employmentType: editForm.employmentType,
          skills: editForm.skills as ORNurseSkills,
        };
        setORNurses(prev => [...prev, newORNurse]);
      } else {
        setORNurses(prev => prev.map(n => 
          n.id === editingId ? {
            ...n,
            name: editForm.name,
            qualification: editForm.qualification as ORNurseQualification,
            workload: editForm.workload,
            employmentType: editForm.employmentType,
            skills: editForm.skills as ORNurseSkills,
          } : n
        ));
      }
    }
    
    setEditingId(null);
    setIsAddingNew(false);
    resetForm();
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

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    resetForm();
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

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const currentCategory = categories.find(c => c.id === activeCategory)!;

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-12 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Users className="w-4 h-4 text-[#10B981]" />
            <p className="text-[10px] font-black text-[#10B981] tracking-[0.4em] uppercase">STAFF MANAGEMENT</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            PERSONÁL
          </h1>
        </div>
      </header>

      {/* Category Boxes - 3 kompaktní boxy bez ikon */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); setEditingId(null); setIsAddingNew(false); }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 px-3 rounded-xl border transition-all overflow-hidden ${
                isActive
                  ? 'border-white/20 bg-white/10'
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 30%, ${cat.color}, transparent 70%)` }} />
              )}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: cat.color }} />
              )}
              <span className={`text-base font-bold leading-tight text-center ${isActive ? 'text-white' : 'text-white/60'}`}>
                {cat.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                {cat.count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Search - centered premium design */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="relative w-full max-w-xl group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#5B65DC]/20 via-[#00D8C1]/20 to-[#5B65DC]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center">
            <div className="absolute left-5 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-[#5B65DC]" />
            </div>
            <input
              type="text"
              placeholder="Hledat podle jmena..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl border border-white/10 bg-[#0a0a0a] text-white placeholder-white/40 focus:outline-none focus:border-[#5B65DC]/50 focus:bg-[#0f0f0f] transition-all text-center font-medium"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSearchQuery('')}
                className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
          <p className="text-center text-white/30 text-xs mt-2">
            Nalezeno <span className="text-[#00D8C1] font-semibold">{filteredData.length}</span> zamestnancu
          </p>
        </div>
        
        <motion.button
          onClick={startAddNew}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B65DC] to-[#00D8C1] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#5B65DC]/20 hover:shadow-[#5B65DC]/40 transition-all"
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-5 h-5" />
          Pridat {activeCategory === 'doctors' ? 'lekare' : activeCategory === 'nurses' ? 'sestru' : 'salovou sestru'}
        </motion.button>
      </div>

      {/* Add/Edit Popup Modal - Premium Design */}
      <AnimatePresence>
        {(isAddingNew || editingId) && (
          <>
            {/* Backdrop with blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
              onClick={cancelEditing}
            />
            {/* Modal - perfectly centered */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-lg pointer-events-auto"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#5B65DC]/30 to-[#00D8C1]/30 rounded-3xl blur-2xl opacity-50" />
                
                <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl shadow-[#5B65DC]/10 overflow-hidden">
                  {/* Modal Header with gradient */}
                  <div className="relative px-8 py-6 border-b border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#5B65DC]/10 via-transparent to-[#00D8C1]/10" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-[#00D8C1] uppercase tracking-[0.2em] mb-1">
                          {activeCategory === 'doctors' ? 'Lekar' : activeCategory === 'nurses' ? 'Sestra' : 'Salova sestra'}
                        </p>
                        <h3 className="text-xl font-bold text-white">
                          {isAddingNew ? 'Pridat noveho zamestnance' : 'Upravit udaje'}
                        </h3>
                      </div>
                      <motion.button
                        onClick={cancelEditing}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5"
                        whileHover={{ scale: 1.05, rotate: 90 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>

                {/* Modal Body */}
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Name - Premium input */}
                  <div className="group">
                    <label className="block text-[11px] text-[#00D8C1] mb-2 uppercase tracking-[0.15em] font-semibold">Jmeno</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-[#5B65DC]/50 focus:bg-white/[0.05] transition-all text-lg font-medium"
                        placeholder="Zadejte cele jmeno..."
                        autoFocus
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#5B65DC]/20 to-[#00D8C1]/20 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none blur-xl" />
                    </div>
                  </div>
                  
                  {/* Qualification & Workload */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] text-[#00D8C1] mb-2 uppercase tracking-[0.15em] font-semibold">Kvalifikace</label>
                      <select
                        value={editForm.qualification}
                        onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-[#5B65DC]/50 transition-all appearance-none cursor-pointer"
                      >
                        {activeCategory === 'doctors' ? (
                          <>
                            <option value="L3">L3 - Atestace</option>
                            <option value="L2">L2 - Pokrocily</option>
                            <option value="L1">L1 - Zakladni</option>
                            <option value="A">A - Absolvent</option>
                            <option value="S">S - Stazista</option>
                          </>
                        ) : activeCategory === 'nurses' ? (
                          <>
                            <option value="K">K - Plne kvalifikovana</option>
                            <option value="D">D - Pod dohledem</option>
                            <option value="A">A - Absolventka</option>
                            <option value="S">S - Stazistka</option>
                          </>
                        ) : (
                          <>
                            <option value="K">K - Plne kvalifikovana</option>
                            <option value="A">A - Absolventka</option>
                            <option value="S">S - Stazistka</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#00D8C1] mb-2 uppercase tracking-[0.15em] font-semibold">Uvazek (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        step="10"
                        value={editForm.workload}
                        onChange={(e) => setEditForm({ ...editForm, workload: parseInt(e.target.value) || 100 })}
                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-[#5B65DC]/50 transition-all text-center text-lg font-bold"
                      />
                    </div>
                  </div>
                  
                  {/* Employment Type - Premium toggle */}
                  <div>
                    <label className="block text-[11px] text-[#00D8C1] mb-3 uppercase tracking-[0.15em] font-semibold">Typ zamestnance</label>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, employmentType: 'I' })}
                        className={`relative py-4 rounded-xl font-semibold transition-all overflow-hidden ${
                          editForm.employmentType === 'I'
                            ? 'bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981]'
                            : 'bg-white/[0.02] border border-white/10 text-white/40 hover:bg-white/[0.05] hover:text-white/60'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {editForm.employmentType === 'I' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/20 to-transparent" />
                        )}
                        <span className="relative">Interni (I)</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, employmentType: 'E' })}
                        className={`relative py-4 rounded-xl font-semibold transition-all overflow-hidden ${
                          editForm.employmentType === 'E'
                            ? 'bg-[#F59E0B]/20 border-2 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-white/[0.02] border border-white/10 text-white/40 hover:bg-white/[0.05] hover:text-white/60'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {editForm.employmentType === 'E' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/20 to-transparent" />
                        )}
                        <span className="relative">Externi (E)</span>
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Skills - Premium pills */}
                  <div>
                    <label className="block text-[11px] text-[#00D8C1] mb-3 uppercase tracking-[0.15em] font-semibold">Specializace</label>
                    <div className="flex flex-wrap gap-2">
                      {activeCategory === 'or_nurses' ? (
                        <>
                          {[
                            { key: 'surgery', label: 'CHI', full: 'Chirurgie', color: '#EF4444' },
                            { key: 'trauma', label: 'TRA', full: 'Traumatologie', color: '#F59E0B' },
                            { key: 'ortho', label: 'ORT', full: 'Ortopedie', color: '#10B981' },
                            { key: 'gyneco', label: 'GYN', full: 'Gynekologie', color: '#EC4899' },
                            { key: 'minor', label: 'MO', full: 'Male obory', color: '#8B5CF6' },
                            { key: 'davinci', label: 'DaV', full: 'DaVinci', color: '#3B82F6' },
                            { key: 'neuro', label: 'NCH', full: 'Neurochirurgie', color: '#06B6D4' },
                          ].map(skill => {
                            const isActive = (editForm.skills as ORNurseSkills)[skill.key as keyof ORNurseSkills];
                            return (
                              <motion.button
                                key={skill.key}
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  skills: {
                                    ...(editForm.skills as ORNurseSkills),
                                    [skill.key]: !isActive,
                                  },
                                })}
                                className="relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all overflow-hidden"
                                style={{
                                  backgroundColor: isActive ? `${skill.color}20` : 'rgba(255,255,255,0.02)',
                                  border: `2px solid ${isActive ? skill.color : 'rgba(255,255,255,0.1)'}`,
                                  color: isActive ? skill.color : 'rgba(255,255,255,0.4)',
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={skill.full}
                              >
                                {isActive && (
                                  <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(135deg, ${skill.color}40, transparent)` }} />
                                )}
                                <span className="relative">{skill.label}</span>
                              </motion.button>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          {[
                            { key: 'aro', label: 'ARO', full: 'ARO luzka', color: '#EF4444' },
                            { key: 'jip', label: 'JIP', full: 'JIP', color: '#F59E0B' },
                            { key: 'emergency', label: 'UP', full: 'Urgentni prijem', color: '#8B5CF6' },
                            { key: 'or', label: 'OS', full: 'Operacni saly', color: '#3B82F6' },
                          ].map(skill => {
                            const isActive = (editForm.skills as DoctorSkills | NurseSkills)[skill.key as keyof (DoctorSkills | NurseSkills)];
                            return (
                              <motion.button
                                key={skill.key}
                                type="button"
                                onClick={() => setEditForm({
                                  ...editForm,
                                  skills: {
                                    ...(editForm.skills as DoctorSkills | NurseSkills),
                                    [skill.key]: !isActive,
                                  },
                                })}
                                className="relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all overflow-hidden"
                                style={{
                                  backgroundColor: isActive ? `${skill.color}20` : 'rgba(255,255,255,0.02)',
                                  border: `2px solid ${isActive ? skill.color : 'rgba(255,255,255,0.1)'}`,
                                  color: isActive ? skill.color : 'rgba(255,255,255,0.4)',
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title={skill.full}
                              >
                                {isActive && (
                                  <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(135deg, ${skill.color}40, transparent)` }} />
                                )}
                                <span className="relative">{skill.label}</span>
                              </motion.button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer - Premium */}
                <div className="flex gap-4 px-8 py-6 border-t border-white/10 bg-gradient-to-r from-white/[0.02] to-transparent">
                  <motion.button
                    onClick={saveEdit}
                    disabled={!editForm.name.trim()}
                    className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#5B65DC] to-[#00D8C1] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#5B65DC]/20 hover:shadow-[#5B65DC]/40 transition-all"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Check className="w-5 h-5" />
                    {isAddingNew ? 'Pridat zamestnance' : 'Ulozit zmeny'}
                  </motion.button>
                  <motion.button
                    onClick={cancelEditing}
                    className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold hover:bg-white/10 hover:text-white transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Zrusit
                  </motion.button>
                </div>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Legend - modré pozadí */}
      <div className="mb-6 p-4 rounded-xl border border-[#5B65DC]/30 bg-[#5B65DC]/10">
        <div className="flex flex-wrap gap-6 text-xs">
          <div>
            <p className="text-[#a0a8ff] mb-2 font-semibold uppercase tracking-wider">Kvalifikace {activeCategory === 'doctors' ? 'lékaři' : 'sestry'}:</p>
            <div className="flex flex-wrap gap-2">
              {activeCategory === 'doctors' ? (
                <>
                  <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">L3 = Atestace</span>
                  <span className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">L2 = Pokročilý</span>
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">L1 = Základní</span>
                  <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">A = Absolvent</span>
                  <span className="px-2 py-1 rounded bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/40">S = Stážista</span>
                </>
              ) : activeCategory === 'nurses' ? (
                <>
                  <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">K = Plně kvalifikována</span>
                  <span className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">D = Pod dohledem</span>
                  <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">A = Absolventka</span>
                  <span className="px-2 py-1 rounded bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/40">S = Stážistka</span>
                </>
              ) : (
                <>
                  <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">K = Plně kvalifikována</span>
                  <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">A = Absolventka</span>
                  <span className="px-2 py-1 rounded bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/40">S = Stážistka</span>
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-[#a0a8ff] mb-2 font-semibold uppercase tracking-wider">Typ úvazku:</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-[#10B981]/30 flex items-center justify-center text-[10px] font-bold">I</span>
                Interní
              </span>
              <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-[#F59E0B]/30 flex items-center justify-center text-[10px] font-bold">E</span>
                Externí
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#5B65DC]/20">
          <p className="text-[#a0a8ff] mb-2 font-semibold uppercase tracking-wider text-xs">Specializace:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {activeCategory === 'or_nurses' ? (
              <>
                <span className="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">CHI = Chirurgie</span>
                <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">TRA = Traumatologie</span>
                <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">ORT = Ortopedie</span>
                <span className="px-2 py-1 rounded bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40">GYN = Gynekologie</span>
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">MO = Malé obory</span>
                <span className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">DaV = DaVinci</span>
                <span className="px-2 py-1 rounded bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40">NCH = Neurochirurgie</span>
              </>
            ) : (
              <>
                <span className="px-2 py-1 rounded bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">ARO = ARO lůžka</span>
                <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">JIP = JIP</span>
                <span className="px-2 py-1 rounded bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">UP = Urgentní příjem</span>
                <span className="px-2 py-1 rounded bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40">OS = Operační sály</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Staff Table - 2 sloupce */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredData.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: index * 0.015 }}
            className="rounded-xl border border-white/10 bg-[#0f0f0f] overflow-hidden"
          >
            {/* Card Header - modré pozadí */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-[#5B65DC]/30 bg-[#5B65DC]/15">
              <div className="col-span-5 text-[10px] font-bold text-[#a0a8ff] uppercase tracking-wider">Jméno</div>
              <div className="col-span-2 text-center text-[10px] font-bold text-[#a0a8ff] uppercase tracking-wider">Kvalif.</div>
              <div className="col-span-2 text-center text-[10px] font-bold text-[#a0a8ff] uppercase tracking-wider">Úvazek</div>
              <div className="col-span-2 text-center text-[10px] font-bold text-[#a0a8ff] uppercase tracking-wider">Typ</div>
              <div className="col-span-1"></div>
            </div>

            {/* Card Row */}
            <div
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => toggleRow(item.id)}
            >
              <div className="col-span-5 font-medium text-white text-sm truncate">{item.name}</div>
              <div className="col-span-2 flex justify-center">
                <QualificationBadge qual={item.qualification} category={activeCategory} />
              </div>
              <div className="col-span-2 flex justify-center">
                <WorkloadBadge workload={item.workload} />
              </div>
              <div className="col-span-2 flex justify-center">
                <EmploymentBadge type={item.employmentType} />
              </div>
              <div className="col-span-1 flex justify-center gap-0.5">
                <motion.button
                  onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-[#3B82F6] transition-all"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Opravdu chcete smazat tohoto zaměstnance?')) { deleteItem(item.id); } }}
                  className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-[#EF4444] transition-all"
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>

            {/* Specializace - modré pozadí */}
            <div className="px-4 py-2 border-t border-[#5B65DC]/20 bg-[#5B65DC]/8">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#a0a8ff] uppercase tracking-wider shrink-0">Specializace:</span>
                <div className="flex flex-wrap gap-1">
                  {activeCategory === 'or_nurses' ? (
                    <ORSkillIcons skills={(item as ORNurse).skills} />
                  ) : (
                    <SkillIcons skills={(item as Doctor | Nurse).skills} category={activeCategory as 'doctors' | 'nurses'} />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedRows.has(item.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">ID zaměstnance</p>
                        <p className="text-white font-mono text-xs">{item.id.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Pracovní úvazek</p>
                        <p className="text-white text-xs">{item.workload}% ({Math.round(item.workload * 0.4)} h/týden)</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Kvalifikace</p>
                        <p className="text-white text-xs">
                          {activeCategory === 'doctors' && (
                            item.qualification === 'L3' ? 'Atestovaný lékař' :
                            item.qualification === 'L2' ? 'Pokročilý lékař' :
                            item.qualification === 'L1' ? 'Základní kvalifikace' :
                            item.qualification === 'A' ? 'Absolvent' : 'Stážista'
                          )}
                          {activeCategory === 'nurses' && (
                            item.qualification === 'K' ? 'Plně kvalifikovaná' :
                            item.qualification === 'D' ? 'Pod dohledem' :
                            item.qualification === 'A' ? 'Absolventka' : 'Stážistka'
                          )}
                          {activeCategory === 'or_nurses' && (
                            item.qualification === 'K' ? 'Plně kvalifikovaná' :
                            item.qualification === 'A' ? 'Absolventka' : 'Stážistka'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Typ zaměstnance</p>
                        <p className="text-white text-xs">{item.employmentType === 'I' ? 'Kmenový interní' : 'Externí spolupracovník'}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-white/40 text-xs mb-1">Celkem zobrazeno</p>
            <p className="text-white font-bold text-lg">{filteredData.length} zaměstnanců</p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Interních</p>
            <p className="text-[#10B981] font-bold text-lg">
              {filteredData.filter(i => i.employmentType === 'I').length}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Externích</p>
            <p className="text-[#F59E0B] font-bold text-lg">
              {filteredData.filter(i => i.employmentType === 'E').length}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs mb-1">Plný úvazek (100%)</p>
            <p className="text-white font-bold text-lg">
              {filteredData.filter(i => i.workload === 100).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManager;
