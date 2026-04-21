import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronDown, X, Check, AlertCircle, Stethoscope } from 'lucide-react';
import { DEFAULT_DEPARTMENTS, Department, SubDepartment } from '../constants';

const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<{ deptId: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<string | null>(null);
  const [newSubDeptName, setNewSubDeptName] = useState<{ [key: string]: string }>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDeptData, setNewDeptData] = useState({ name: '', description: '', accentColor: '#00D8C1' });

  const handleAddDepartment = () => {
    if (!newDeptData.name) return;
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: newDeptData.name,
      description: newDeptData.description,
      isActive: true,
      subDepartments: [],
      accentColor: newDeptData.accentColor,
    };
    setDepartments([...departments, newDept]);
    setNewDeptData({ name: '', description: '', accentColor: '#00D8C1' });
    setIsAddingNew(false);
  };

  const handleDeleteDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
    setDeleteConfirm(null);
  };

  const handleUpdateDepartmentName = () => {
    if (!editingDeptName) return;
    setDepartments(departments.map(d =>
      d.id === editingDeptName.deptId ? { ...d, name: editingDeptName.name } : d
    ));
    setEditingDeptName(null);
  };

  const handleAddSubDepartment = (deptId: string) => {
    const name = newSubDeptName[deptId];
    if (!name) return;
    const newSub: SubDepartment = {
      id: `sub-${Date.now()}`,
      name,
      isActive: true,
    };
    setDepartments(departments.map(d =>
      d.id === deptId ? { ...d, subDepartments: [...d.subDepartments, newSub] } : d
    ));
    setNewSubDeptName({ ...newSubDeptName, [deptId]: '' });
  };

  const handleDeleteSubDepartment = (deptId: string, subId: string) => {
    setDepartments(departments.map(d =>
      d.id === deptId ? { ...d, subDepartments: d.subDepartments.filter(s => s.id !== subId) } : d
    ));
    setDeleteSubConfirm(null);
  };

  const toggleDepartmentActive = (id: string) => {
    setDepartments(departments.map(d =>
      d.id === id ? { ...d, isActive: !d.isActive } : d
    ));
  };

  return (
    <div className="w-full">
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Stethoscope className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">DEPARTMENTS MANAGEMENT</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-black tracking-tighter uppercase leading-none">
            ODDELENI <span className="text-white/20">KLINIKY</span>
          </h1>
        </div>
      </header>

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Nazev oddeleni"
                value={newDeptData.name}
                onChange={(e) => setNewDeptData({ ...newDeptData, name: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Popis"
                value={newDeptData.description}
                onChange={(e) => setNewDeptData({ ...newDeptData, description: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="color"
                value={newDeptData.accentColor}
                onChange={(e) => setNewDeptData({ ...newDeptData, accentColor: e.target.value })}
                className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.03] cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddDepartment}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Pridat
              </button>
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
              >
                Zrusit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAddingNew && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="mb-8 px-6 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold hover:bg-green-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Pridat nove oddeleni
        </button>
      )}

      <div className="space-y-4">
        {departments.map((dept) => (
          <motion.div
            key={dept.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all"
              onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: dept.accentColor }}
                />
                <div>
                  <h3 className="text-lg font-semibold text-white">{dept.name}</h3>
                  <p className="text-sm text-white/50">{dept.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${dept.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {dept.isActive ? 'Aktivní' : 'Neaktivní'}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-white/50 transition-transform ${expandedDept === dept.id ? 'rotate-180' : ''}`}
                />
              </div>
            </div>

            <AnimatePresence>
              {expandedDept === dept.id && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-white/5">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setEditingDeptName({ deptId: dept.id, name: dept.name })}
                        className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-all flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Upravit
                      </button>
                      <button
                        onClick={() => toggleDepartmentActive(dept.id)}
                        className="px-3 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm hover:bg-yellow-500/30 transition-all"
                      >
                        {dept.isActive ? 'Deaktivovat' : 'Aktivovat'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(dept.id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Smazat
                      </button>
                    </div>

                    {dept.subDepartments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/70 mb-2">Pododdeleni:</h4>
                        <div className="space-y-2">
                          {dept.subDepartments.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                              <span className="text-sm text-white/80">{sub.name}</span>
                              <button
                                onClick={() => setDeleteSubConfirm(sub.id)}
                                className="p-1 rounded hover:bg-red-500/20 text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nazev pododdeleni"
                        value={newSubDeptName[dept.id] || ''}
                        onChange={(e) => setNewSubDeptName({ ...newSubDeptName, [dept.id]: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20"
                      />
                      <button
                        onClick={() => handleAddSubDepartment(dept.id)}
                        className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm hover:bg-green-500/30 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingDeptName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setEditingDeptName(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Upravit oddeleni</h2>
              <input
                type="text"
                value={editingDeptName.name}
                onChange={(e) => setEditingDeptName({ ...editingDeptName, name: e.target.value })}
                className="w-full px-4 py-2 mb-4 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateDepartmentName}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 transition-all"
                >
                  Ulozit
                </button>
                <button
                  onClick={() => setEditingDeptName(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Potvrdit smazani</h2>
              <p className="text-white/70 mb-6">Opravdu chcete smazat toto oddeleni?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteDepartment(deleteConfirm)}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Smazat
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentsManager;
