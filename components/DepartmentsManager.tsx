import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, ChevronDown, X, Check, AlertCircle, Lock, Unlock, Stethoscope, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment, fetchSubDepartments, createSubDepartment, deleteSubDepartment } from '../lib/db';

interface Department {
  id: string;
  name: string;
  description: string;
  accent_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SubDepartment {
  id: string;
  name: string;
  department_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState<{ deptId: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<string | null>(null);
  const [newSubDeptName, setNewSubDeptName] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [depts, subDepts] = await Promise.all([
        fetchDepartments(),
        fetchSubDepartments()
      ]);
      setDepartments(depts);
      setSubDepartments(subDepts);
      setError(null);
    } catch (err) {
      console.error('Error loading departments:', err);
      setError('Chyba při načítání oddělení');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const deptSubscription = supabase
      .channel('departments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        () => loadData()
      )
      .subscribe();

    const subDeptSubscription = supabase
      .channel('sub_departments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_departments' },
        () => loadData()
      )
      .subscribe();

    return () => {
      deptSubscription.unsubscribe();
      subDeptSubscription.unsubscribe();
    };
  };

  const handleToggleDepartment = async (deptId: string) => {
    try {
      const dept = departments.find(d => d.id === deptId);
      if (dept) {
        await updateDepartment(deptId, { is_active: !dept.is_active });
        await loadData();
      }
    } catch (err) {
      console.error('Error toggling department:', err);
      setError('Chyba při aktualizaci oddělení');
    }
  };

  const handleUpdateDepartmentName = async (deptId: string, newName: string) => {
    try {
      if (!newName.trim()) return;
      await updateDepartment(deptId, { name: newName });
      setEditingDeptName(null);
      await loadData();
    } catch (err) {
      console.error('Error updating department name:', err);
      setError('Chyba při aktualizaci názvu');
    }
  };

  const handleDeleteDepartment = async (deptId: string) => {
    try {
      await deleteDepartment(deptId);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting department:', err);
      setError('Chyba při mazání oddělení');
    }
  };

  const handleAddSubDepartment = async (deptId: string) => {
    try {
      if (!newSubDeptName[deptId] || !newSubDeptName[deptId].trim()) return;

      await createSubDepartment({
        name: newSubDeptName[deptId],
        department_id: deptId,
        is_active: true,
      });
      setNewSubDeptName({ ...newSubDeptName, [deptId]: '' });
      await loadData();
    } catch (err) {
      console.error('Error adding sub-department:', err);
      setError('Chyba při přidávání pododdělení');
    }
  };

  const handleDeleteSubDepartment = async (subDeptId: string) => {
    try {
      await deleteSubDepartment(subDeptId);
      setDeleteSubConfirm(null);
      await loadData();
    } catch (err) {
      console.error('Error deleting sub-department:', err);
      setError('Chyba při mazání pododdělení');
    }
  };

  const handleToggleSubDepartment = async (subDeptId: string) => {
    try {
      const subDept = subDepartments.find(s => s.id === subDeptId);
      if (subDept) {
        await updateDepartment(subDeptId, { is_active: !subDept.is_active });
        await loadData();
      }
    } catch (err) {
      console.error('Error toggling sub-department:', err);
      setError('Chyba při aktualizaci');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

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

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* Departments List - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {departments.map((dept) => {
            const isEditingName = editingDeptName?.deptId === dept.id;
            const deptSubDepts = subDepartments.filter(s => s.department_id === dept.id);

            return (
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
                            background: dept.is_active ? `${dept.accent_color}20` : 'rgba(255,255,255,0.05)',
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          {dept.is_active ? (
                            <Unlock className="w-4 h-4" style={{ color: dept.accent_color }} />
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
                        {deptSubDepts.map((subDept) => (
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
                                onClick={() => handleToggleSubDepartment(subDept.id)}
                                className="p-1 rounded transition-all"
                                style={{
                                  background: subDept.is_active ? `${dept.accent_color}15` : 'rgba(255,255,255,0.03)',
                                }}
                                whileHover={{ scale: 1.1 }}
                              >
                                {subDept.is_active ? (
                                  <Unlock className="w-3 h-3" style={{ color: dept.accent_color }} />
                                ) : (
                                  <Lock className="w-3 h-3 text-white/30" />
                                )}
                              </motion.button>
                              <span
                                className={`text-sm font-medium ${
                                  subDept.is_active ? 'text-white/80' : 'text-white/40 line-through'
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Delete Sub-Department Confirmation */}
      <AnimatePresence>
        {deleteSubConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteSubConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Potvrdit smazání</h2>
              <p className="text-white/70 mb-6">Opravdu chcete smazat toto pododdělení?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteSubDepartment(deleteSubConfirm)}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Smazat
                </button>
                <button
                  onClick={() => setDeleteSubConfirm(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrušit
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
