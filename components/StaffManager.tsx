import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Edit2, Trash2, X, Check,
  Clock, Shield, Activity, Award, Briefcase, Zap, Filter, ChevronRight,
  GitBranch, TrendingUp, AlertCircle
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
  const workloads = [100, 100, 80, 80, 60, 50, 40, 30, 20];
  return names.map((name, i) => ({
    id: `nurse-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: { aro: Math.random() > 0.4, jip: Math.random() > 0.3, emergency: Math.random() > 0.6, or: Math.random() > 0.3 },
    employmentType: Math.random() > 0.15 ? 'I' : 'E',
  }));
};

const generateORNurses = (): ORNurse[] => {
  const names = [
    'Sestra Alena', 'Sestra Marie', 'Sestra Lenka', 'Sestra Zuzana',
    'Sestra Petra', 'Sestra Kristýna', 'Sestra Pavlína', 'Sestra Věra',
    'Sestra Renáta', 'Sestra Milada', 'Sestra Jolana', 'Sestra Daniela',
  ];
  const qualifications: ORNurseQualification[] = ['S', 'A', 'K'];
  const workloads = [100, 100, 100, 80, 80, 60, 50, 40];
  return names.map((name, i) => ({
    id: `or-${i}`,
    name,
    qualification: qualifications[Math.floor(Math.random() * qualifications.length)],
    workload: workloads[Math.floor(Math.random() * workloads.length)],
    skills: {
      surgery: Math.random() > 0.3, trauma: Math.random() > 0.4, ortho: Math.random() > 0.5,
      gyneco: Math.random() > 0.5, minor: Math.random() > 0.3, davinci: Math.random() > 0.7, neuro: Math.random() > 0.6
    },
    employmentType: Math.random() > 0.1 ? 'I' : 'E',
  }));
};

// Main Component
export default function StaffManager() {
  const [doctors] = useState<Doctor[]>(generateDoctors());
  const [nurses] = useState<Nurse[]>(generateNurses());
  const [orNurses] = useState<ORNurse[]>(generateORNurses());
  
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'schedule'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ qualification: '', employmentType: '', skills: [] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Lékaři', count: doctors.length, icon: Stethoscope, color: '#3B82F6' },
    { id: 'nurses' as StaffCategory, label: 'Sestry', count: nurses.length, icon: Heart, color: '#EC4899' },
    { id: 'or_nurses' as StaffCategory, label: 'Sálové sestry', count: orNurses.length, icon: Users, color: '#10B981' },
  ];

  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let results: (Doctor | Nurse | ORNurse)[] = [];
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    
    results = data.filter(item => {
      if (query && !item.name.toLowerCase().includes(query) && !item.qualification.toLowerCase().includes(query)) return false;
      if (filters.qualification && item.qualification !== filters.qualification) return false;
      if (filters.employmentType && item.employmentType !== filters.employmentType) return false;
      return true;
    });
    
    return results;
  }, [activeCategory, searchQuery, filters, doctors, nurses, orNurses]);

  const stats = useMemo(() => {
    const data = activeCategory === 'doctors' ? doctors : activeCategory === 'nurses' ? nurses : orNurses;
    return {
      total: data.length,
      available: filteredData.filter(d => d.workload === 100).length,
      avgWorkload: Math.round(filteredData.reduce((a, b) => a + b.workload, 0) / filteredData.length),
    };
  }, [activeCategory, filteredData, doctors, nurses, orNurses]);

  const startEditing = (item: Doctor | Nurse | ORNurse) => setEditingId(item.id);
  const startAddNew = () => setIsAddingNew(true);
  const deleteItem = (id: string) => console.log('Delete:', id);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">PERSONÁL</h1>
            <p className="text-white/40 text-sm mt-1">Správa a plánu zaměstnanců</p>
          </div>
          <button
            onClick={startAddNew}
            className="px-5 py-3 rounded-lg bg-[#00D8C1]/10 border border-[#00D8C1]/30 text-[#00D8C1] font-bold text-sm flex items-center gap-2 hover:bg-[#00D8C1]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Přidat zaměstnance
          </button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Celkem', value: stats.total, icon: Users, color: '#00D8C1' },
          { label: 'Dostupní', value: stats.available, icon: Check, color: '#10B981' },
          { label: 'Průměr', value: `${stats.avgWorkload}%`, icon: TrendingUp, color: '#F59E0B' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.01 }}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-3xl font-black text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="border-b border-white/5 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); setFilters({ qualification: '', employmentType: '', skills: [] }); }}
                className={`relative px-4 py-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-white border-[#00D8C1] bg-white/[0.02]'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-black ${
                  isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'
                }`}>
                  {cat.count}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* View Tabs */}
        <div className="flex gap-1">
          {[
            { id: 'list' as const, label: 'Seznam', icon: GitBranch },
            { id: 'analytics' as const, label: 'Analytika', icon: TrendingUp },
            { id: 'schedule' as const, label: 'Plán', icon: Clock },
          ].map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-white border border-white/10'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00D8C1]" />
          <input
            type="text"
            placeholder="Hledat zaměstnance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/[0.03] border border-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#00D8C1]/50 focus:bg-white/[0.05] transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Filtry
          </button>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all"
            >
              Vymazat
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'list' ? (
        // List View
        <div className="space-y-2">
          {filteredData.length === 0 ? (
            <div className="py-16 text-center text-white/30">
              Žádní zaměstnanci nenalezeni
            </div>
          ) : (
            filteredData.map((item, index) => {
              const category = activeCategory as StaffCategory;
              const themeColor = activeCategory === 'doctors' ? '#3B82F6' : activeCategory === 'nurses' ? '#EC4899' : '#10B981';
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all p-4 flex items-center justify-between cursor-pointer"
                >
                  {/* Left: Info */}
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-white text-sm"
                      style={{ backgroundColor: `${themeColor}20`, borderColor: `${themeColor}40`, border: '1px solid' }}
                    >
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[10px] font-black px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${themeColor}20`,
                            color: themeColor,
                            border: `1px solid ${themeColor}40`
                          }}
                        >
                          {item.qualification}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-1 rounded ${
                          item.employmentType === 'I'
                            ? 'bg-[#00D8C1]/20 text-[#00D8C1] border border-[#00D8C1]/40'
                            : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                        }`}>
                          {item.employmentType === 'I' ? 'INT' : 'EXT'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Workload */}
                  <div className="flex-shrink-0 flex items-center gap-6 px-6 border-l border-white/5">
                    <div className="text-right">
                      <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Úvazek</p>
                      <p className="text-2xl font-black text-white">{item.workload}%</p>
                    </div>
                    <div className="w-1 h-8 rounded-full"
                      style={{
                        background: item.workload === 100 ? '#10B981' : item.workload >= 80 ? '#84CC16' : item.workload >= 60 ? '#F59E0B' : '#EF4444'
                      }}
                    />
                  </div>

                  {/* Right: Actions */}
                  <div className="flex-shrink-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-white/5">
                    <button
                      onClick={() => startEditing(item)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Opravdu chcete smazat?')) deleteItem(item.id); }}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ChevronRight className="w-4 h-4 text-white/20 ml-2 flex-shrink-0" />
                </motion.div>
              );
            })
          )}
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="py-16 text-center text-white/30">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
          Analytika - Již brzy
        </div>
      ) : (
        <div className="py-16 text-center text-white/30">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          Plán - Již brzy
        </div>
      )}
    </div>
  );
}
