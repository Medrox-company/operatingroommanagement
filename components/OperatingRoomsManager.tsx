import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { Plus, Trash2, Edit2, GripVertical, X, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { MOCK_ROOMS, DEFAULT_DEPARTMENTS } from '../constants';

interface OperatingRoomsManagerProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
}

interface EditingRoom {
  id: string;
  name: string;
  department: string;
  description?: string;
}

const OperatingRoomsManager: React.FC<OperatingRoomsManagerProps> = ({
  rooms = MOCK_ROOMS,
  onRoomsChange,
}) => {
  const [roomsList, setRoomsList] = useState<OperatingRoom[]>(rooms);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRoom, setEditingRoom] = useState<EditingRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedDeptForRoom, setSelectedDeptForRoom] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
    description: '',
  });

  // Department colors
  const deptColors: Record<string, { color: string; accentColor: string }> = {
    TRA: { color: '#00D8C1', accentColor: '#00D8C1' },
    CHIR: { color: '#7C3AED', accentColor: '#7C3AED' },
    ROBOT: { color: '#06B6D4', accentColor: '#06B6D4' },
    URO: { color: '#EC4899', accentColor: '#EC4899' },
    ORL: { color: '#3B82F6', accentColor: '#3B82F6' },
    CÉVNÍ: { color: '#F59E0B', accentColor: '#F59E0B' },
    'HPB + PLICNÍ': { color: '#8B5CF6', accentColor: '#8B5CF6' },
    DĚTSKÉ: { color: '#06B6D4', accentColor: '#06B6D4' },
    MAMMO: { color: '#EC4899', accentColor: '#EC4899' },
  };

  const getDeptColor = (dept: string) => deptColors[dept] || { color: '#64748B', accentColor: '#64748B' };

  const handleAddRoom = () => {
    if (newRoomData.name && newRoomData.department) {
      const newRoom: OperatingRoom = {
        id: Date.now().toString(),
        name: newRoomData.name,
        department: newRoomData.department,
        status: RoomStatus.FREE,
        queueCount: 0,
        operations24h: 0,
        currentStepIndex: 6,
        isEmergency: false,
        isLocked: false,
        staff: {
          doctor: { name: null, role: 'DOCTOR' },
          nurse: { name: null, role: 'NURSE' },
        },
      };
      const updated = [...roomsList, newRoom];
      setRoomsList(updated);
      onRoomsChange?.(updated);
      setNewRoomData({ name: '', department: '', description: '' });
      setIsAddingNew(false);
    }
  };

  const handleDeleteRoom = (id: string) => {
    const updated = roomsList.filter(r => r.id !== id);
    setRoomsList(updated);
    onRoomsChange?.(updated);
    setDeleteConfirm(null);
  };

  const handleUpdateRoom = () => {
    if (editingRoom) {
      const updated = roomsList.map(r =>
        r.id === editingRoom.id
          ? { ...r, name: editingRoom.name, department: editingRoom.department }
          : r
      );
      setRoomsList(updated);
      onRoomsChange?.(updated);
      setEditingRoom(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, roomId: string) => {
    setDraggedId(roomId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetRoomId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetRoomId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = roomsList.findIndex(r => r.id === draggedId);
    const targetIndex = roomsList.findIndex(r => r.id === targetRoomId);

    if (draggedIndex < 0 || targetIndex < 0) return;

    const newRoomsList = Array.from(roomsList);
    const [draggedRoom] = newRoomsList.splice(draggedIndex, 1);
    newRoomsList.splice(targetIndex, 0, draggedRoom);

    setRoomsList(newRoomsList);
    onRoomsChange?.(newRoomsList);
    setDraggedId(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <GripVertical className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATING ROOMS MANAGEMENT</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            OPERAČNÍ <span className="text-white/20">SÁLY</span>
          </h1>
        </div>
      </header>

      {/* Add New Room Form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px]"
            style={{
              boxShadow: `0 15px 35px -10px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Název sálu (např. Sál č. 1)"
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Oddělení (TRA, CHIR, atd.)"
                value={newRoomData.department}
                onChange={(e) => setNewRoomData({ ...newRoomData, department: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Popis (volitelně)"
                value={newRoomData.description}
                onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleAddRoom}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all"
                whileHover={{ scale: 1.05 }}
              >
                <Check className="w-4 h-4 inline mr-2" />
                Přidat
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewRoomData({ name: '', department: '', description: '' });
                }}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                whileHover={{ scale: 1.05 }}
              >
                Zrušit
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!isAddingNew && (
        <motion.button
          onClick={() => setIsAddingNew(true)}
          className="mb-8 px-6 py-3 rounded-lg bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] hover:border-white/15 transition-all flex items-center gap-2 font-semibold"
          whileHover={{ scale: 1.02 }}
        >
          <Plus className="w-5 h-5" />
          Přidat nový sál
        </motion.button>
      )}

      {/* Rooms List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {roomsList.map((room) => {
            const deptColor = getDeptColor(room.department);
            const isEditing = editingRoom?.id === room.id;
            const isDeleting = deleteConfirm === room.id;
            const isDragging = draggedId === room.id;

            return (
              <motion.div
                key={room.id}
                draggable
                onDragStart={(e) => handleDragStart(e as any, room.id)}
                onDragOver={handleDragOver as any}
                onDrop={(e) => handleDrop(e as any, room.id)}
                onDragEnd={() => setDraggedId(null)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`group relative p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-move ${
                  isDragging ? 'opacity-50 bg-white/[0.06] border-white/20' : ''
                }`}
                style={{
                  boxShadow: `0 15px 35px -10px rgba(0,0,0,0.5)`,
                }}
                whileHover={{
                  boxShadow: !isEditing && !isDeleting ? `0 15px 35px -10px ${deptColor.color}40, inset 0 0 20px ${deptColor.color}10` : undefined,
                }}
                transition={{ duration: 0.3 }}
              >
                  {/* Gradient glow on hover */}
                  <motion.div
                    className="absolute -inset-0.5 z-0 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${deptColor.color}, transparent 70%)`,
                    }}
                  />

                  {isEditing ? (
                    // Edit Mode
                    <div className="relative z-10 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={editingRoom.name}
                          onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white focus:outline-none focus:border-white/20"
                          placeholder="Název sálu"
                        />
                        <motion.button
                          onClick={() => {
                            setSelectedDeptForRoom(editingRoom.department);
                            setShowDeptModal(true);
                          }}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08] focus:outline-none focus:border-white/20 flex items-center justify-between"
                        >
                          <span>{editingRoom.department || 'Vybrat oddělení'}</span>
                          <ChevronDown className="w-4 h-4" />
                        </motion.button>
                        <input
                          type="text"
                          value={editingRoom.description || ''}
                          onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white focus:outline-none focus:border-white/20"
                          placeholder="Popis sálu"
                        />
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={handleUpdateRoom}
                          className="px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 hover:bg-green-500/30 transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          <Check className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => setEditingRoom(null)}
                          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          <X className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    // Delete Confirmation
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-white/70">Opravdu chcete smazat <strong>{room.name}</strong>?</span>
                      </div>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Smazat
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Zrušit
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <GripVertical className="w-5 h-5 text-white/30 cursor-grab flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[9px] font-black tracking-[0.2em] uppercase mb-1"
                            style={{ color: deptColor.color }}
                          >
                            {room.department}
                          </div>
                          <h3 className="text-lg font-bold text-white truncate">{room.name}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <motion.button
                          onClick={() => setEditingRoom({ id: room.id, name: room.name, department: room.department, description: room.name })}
                          className="p-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:border-white/20 transition-all"
                          whileHover={{ scale: 1.1 }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(room.id)}
                          className="p-2 rounded-lg border border-white/10 bg-white/[0.03] text-white/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                          whileHover={{ scale: 1.1 }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {roomsList.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-white/40 text-lg">Zatím nejsou žádné sály. Přidejte první sál kliknutím na tlačítko výše.</p>
        </motion.div>
      )}

      {/* Department Selection Modal - Glassmorphism Style */}
      <AnimatePresence>
        {showDeptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
            onClick={() => setShowDeptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative overflow-hidden rounded-3xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glassmorphism Background */}
              <div className="absolute inset-0 backdrop-blur-3xl" style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 75%, rgba(255,255,255,0.12) 100%)`,
                border: `1.5px solid rgba(255,255,255,0.25)`,
                boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 4px rgba(0,0,0,0.15), 0 25px 50px -12px rgba(0,0,0,0.25)`,
              }} />

              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                  <h2 className="text-2xl font-bold text-white text-balance">Vybrat oddělení</h2>
                  <motion.button
                    onClick={() => setShowDeptModal(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.15)' }}
                  >
                    <X className="w-6 h-6 text-white/80 hover:text-white" />
                  </motion.button>
                </div>

                {/* Department Grid - Scrollable */}
                <div className="overflow-y-auto flex-1 pr-4 mb-6 space-y-3">
                  {DEFAULT_DEPARTMENTS.filter(d => d.isActive).map((dept) => (
                    <div key={dept.id}>
                      {/* Main Department */}
                      <motion.button
                        onClick={() => {
                          setEditingRoom({ ...editingRoom!, department: dept.id });
                          setShowDeptModal(false);
                        }}
                        className="w-full p-4 rounded-xl border-1.5 text-left transition-all mb-2 backdrop-blur-sm"
                        style={{
                          borderColor: `${dept.accentColor}60`,
                          backgroundColor: `${dept.accentColor}12`,
                        }}
                        whileHover={{
                          backgroundColor: `${dept.accentColor}20`,
                          borderColor: `${dept.accentColor}80`,
                          scale: 1.02,
                        }}
                      >
                        <p className="font-bold text-white">{dept.name}</p>
                        <p className="text-xs text-white/50 mt-1">{dept.description}</p>
                      </motion.button>

                      {/* Sub-departments */}
                      {dept.subDepartments.filter(s => s.isActive).length > 0 && (
                        <div className="pl-4 space-y-2 mb-2">
                          {dept.subDepartments.filter(s => s.isActive).map((subDept) => (
                            <motion.button
                              key={subDept.id}
                              onClick={() => {
                                setEditingRoom({ ...editingRoom!, department: subDept.id });
                                setShowDeptModal(false);
                              }}
                              className="w-full p-3 rounded-lg border text-left text-sm transition-all backdrop-blur-sm"
                              style={{
                                borderColor: `${dept.accentColor}40`,
                                backgroundColor: `${dept.accentColor}08`,
                              }}
                              whileHover={{
                                backgroundColor: `${dept.accentColor}15`,
                                borderColor: `${dept.accentColor}60`,
                                scale: 1.02,
                              }}
                            >
                              <p className="font-semibold text-white/90">{subDept.name}</p>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Info */}
                <div className="text-center pt-4 border-t border-white/10">
                  <p className="text-xs text-white/50">Klikněte na oddělení pro výběr</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OperatingRoomsManager;
