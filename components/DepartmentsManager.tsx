import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronDown, X, Check, AlertCircle, Lock, Unlock, Stethoscope } from 'lucide-react';

interface SubDepartment {
  id: string;
  name: string;
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  subDepartments: SubDepartment[];
  accentColor: string;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: 'tra',
    name: 'Traumatologie',
    description: 'Léčba úrazů a poranění',
    isActive: true,
    subDepartments: [],
    accentColor: '#00D8C1',
  },
  {
    id: 'chir',
    name: 'Chirurgie',
    description: 'Chirurgické výkony',
    isActive: true,
    subDepartments: [
      { id: 'chir-hpb', name: 'HPB (játra, pankreas, žlučník)', isActive: true },
      { id: 'chir-cevni', name: 'Cévní chirurgie', isActive: true },
      { id: 'chir-detske', name: 'Dětská chirurgie', isActive: true },
      { id: 'chir-mammo', name: 'Mammo chirurgie', isActive: true },
      { id: 'chir-prokto', name: 'Proktochirurgie', isActive: true },
    ],
    accentColor: '#7C3AED',
  },
  {
    id: 'neurochir',
    name: 'Neurochirurgie',
    description: 'Chirurgie nervové soustavy',
    isActive: true,
    subDepartments: [],
    accentColor: '#06B6D4',
  },
  {
    id: 'uro',
    name: 'Urologie',
    description: 'Léčba urogenitálního systému',
    isActive: true,
    subDepartments: [],
    accentColor: '#EC4899',
  },
  {
    id: 'gyn',
    name: 'Gynekologie',
    description: 'Péče o reprodukční zdraví žen',
    isActive: true,
    subDepartments: [],
    accentColor: '#F472B6',
  },
  {
    id: 'orl',
    name: 'ORL',
    description: 'Otolaryngologie - ucho, nos, krk',
    isActive: true,
    subDepartments: [],
    accentColor: '#3B82F6',
  },
  {
    id: 'ucoch',
    name: 'ÚČOCH',
    description: 'Urgentní centrum chirurgie',
    isActive: true,
    subDepartments: [],
    accentColor: '#F59E0B',
  },
  {
    id: 'stoma',
    name: 'Stomatologie',
    description: 'Péče o zubní zdraví',
    isActive: true,
    subDepartments: [],
    accentColor: '#8B5CF6',
  },
  {
    id: 'ortho',
    name: 'Ortopedie',
    description: 'Léčba pohybového aparátu',
    isActive: true,
    subDepartments: [],
    accentColor: '#059669',
  },
  {
    id: 'ocu',
    name: 'Oční',
    description: 'Oftalmologie - péče o oči',
    isActive: true,
    subDepartments: [],
    accentColor: '#06B6D4',
  },
  {
    id: 'davinci',
    name: 'Da Vinci',
    description: 'Robotická chirurgie',
    isActive: true,
    subDepartments: [],
    accentColor: '#EC4899',
  },
];

const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<{ deptId: string; name: string } | null>(null);
  const [editingSubDept, setEditingSubDept] = useState<{ deptId: string; subDept: SubDepartment } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<string | null>(null);
  const [newSubDeptName, setNewSubDeptName] = useState<{ [key: string]: string }>({});

  const handleToggleDepartment = (deptId: string) => {
    setDepartments(
      departments.map((d) => (d.id === deptId ? { ...d, isActive: !d.isActive } : d))
    );
  };

  const handleUpdateDepartmentName = (deptId: string, newName: string) => {
    setDepartments(
      departments.map((d) => (d.id === deptId ? { ...d, name: newName } : d))
    );
    setEditingDeptName(null);
  };

  const handleDeleteDepartment = (deptId: string) => {
    setDepartments(departments.filter((d) => d.id !== deptId));
    setDeleteConfirm(null);
  };

  const handleAddSubDepartment = (deptId: string) => {
    if (!newSubDeptName[deptId] || !newSubDeptName[deptId].trim()) return;

    setDepartments(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: [
                ...d.subDepartments,
                {
                  id: `${deptId}-${Date.now()}`,
                  name: newSubDeptName[deptId],
                  isActive: true,
                },
              ],
            }
          : d
      )
    );
    setNewSubDeptName({ ...newSubDeptName, [deptId]: '' });
  };

  const handleDeleteSubDepartment = (deptId: string, subDeptId: string) => {
    setDepartments(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: d.subDepartments.filter((s) => s.id !== subDeptId),
            }
          : d
      )
    );
    setDeleteSubConfirm(null);
  };

  const handleToggleSubDepartment = (deptId: string, subDeptId: string) => {
    setDepartments(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: d.subDepartments.map((s) =>
                s.id === subDeptId ? { ...s, isActive: !s.isActive } : s
              ),
            }
          : d
      )
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Stethoscope className="w-4 h-4 text-[#F97316]" />
            <p className="text-[10px] font-black text-[#F97316] tracking-[0.4em] uppercase">HOSPITAL DEPARTMENTS</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            ODDĚLENÍ <span className="text-white/20">HOSPITAL</span>
          </h1>
        </div>
      </header>

      {/* Departments List - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {departments.map((dept) => {
            const isEditingName = editingDeptName?.deptId === dept.id;
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-[60px] overflow-hidden hover:border-white/20 transition-all"
            >
              {/* Department Header */}
              <motion.button
                onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                className="w-full p-6 flex items-center justify-between group"
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <motion.div
                    animate={{ rotate: expandedDept === dept.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-white/50" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {isEditingName ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingDeptName?.name || ''}
                          onChange={(e) => setEditingDeptName({ ...editingDeptName!, name: e.target.value })}
                          onBlur={() => {
                            if (editingDeptName?.name.trim()) {
                              handleUpdateDepartmentName(dept.id, editingDeptName.name);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdateDepartmentName(dept.id, editingDeptName?.name || '');
                            } else if (e.key === 'Escape') {
                              setEditingDeptName(null);
                            }
                          }}
                          className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white font-bold text-lg focus:outline-none focus:border-white/40"
                        />
                      ) : (
                        <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                      )}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDepartment(dept.id);
                        }}
                        className="p-1.5 rounded-lg transition-all"
                        style={{
                          background: dept.isActive ? `${dept.accentColor}20` : 'rgba(255,255,255,0.05)',
                        }}
                        whileHover={{ scale: 1.1 }}
                      >
                        {dept.isActive ? (
                          <Unlock className="w-4 h-4" style={{ color: dept.accentColor }} />
                        ) : (
                          <Lock className="w-4 h-4 text-white/40" />
                        )}
                      </motion.button>
                    </div>
                    <p className="text-sm text-white/50">{dept.description}</p>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDeptName({ deptId: dept.id, name: dept.name });
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(dept.id);
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/40 text-white/60 hover:text-red-400 transition-all"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.button>

              {/* Sub-Departments */}
              <AnimatePresence>
                {expandedDept === dept.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-white/10 bg-white/[0.02]"
                  >
                    <div className="p-6 space-y-3">
                      {/* Sub-departments list */}
                      {dept.subDepartments.map((subDept) => (
                        <motion.div
                          key={subDept.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <motion.button
                              onClick={() => handleToggleSubDepartment(dept.id, subDept.id)}
                              className="p-1 rounded transition-all"
                              style={{
                                background: subDept.isActive ? `${dept.accentColor}15` : 'rgba(255,255,255,0.03)',
                              }}
                              whileHover={{ scale: 1.1 }}
                            >
                              {subDept.isActive ? (
                                <Unlock className="w-3 h-3" style={{ color: dept.accentColor }} />
                              ) : (
                                <Lock className="w-3 h-3 text-white/30" />
                              )}
                            </motion.button>
                            <span
                              className={`text-sm font-medium ${
                                subDept.isActive ? 'text-white/80' : 'text-white/40 line-through'
                              }`}
                            >
                              {subDept.name}
                            </span>
                          </div>
                          <motion.button
                            onClick={() => setDeleteSubConfirm(subDept.id)}
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/40 text-white/40 hover:text-red-400 transition-all"
                            whileHover={{ scale: 1.1 }}
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </motion.div>
                      ))}

                      {/* Add Sub-Department */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                        <input
                          type="text"
                          placeholder="Nové pododdělení..."
                          value={newSubDeptName[dept.id] || ''}
                          onChange={(e) =>
                            setNewSubDeptName({ ...newSubDeptName, [dept.id]: e.target.value })
                          }
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleAddSubDepartment(dept.id);
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
                        />
                        <motion.button
                          onClick={() => handleAddSubDepartment(dept.id)}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete Confirmation */}
              {deleteConfirm === dept.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-t border-white/10 bg-red-500/5 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">Opravdu chcete smazat {dept.name}?</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleDeleteDepartment(dept.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      Smazat
                    </motion.button>
                    <motion.button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      Zrušit
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Delete Sub-Department Confirmation */}
              {deleteSubConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-t border-white/10 bg-red-500/5 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">Smazat pododdělení?</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleDeleteSubDepartment(dept.id, deleteSubConfirm)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      Smazat
                    </motion.button>
                    <motion.button
                      onClick={() => setDeleteSubConfirm(null)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm hover:bg-white/10 transition-all"
                      whileHover={{ scale: 1.05 }}
                    >
                      Zrušit
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DepartmentsManager;
