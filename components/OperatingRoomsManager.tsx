import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { Plus, Trash2, Edit2, GripVertical, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { MOCK_ROOMS } from '../constants';

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
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
    description: '',
  });

  const deptColors: Record<string, { color: string; accentColor: string; rgb: string }> = {
    TRA: { color: '#00D8C1', accentColor: '#00D8C1', rgb: '0, 216, 193' },
    CHIR: { color: '#7C3AED', accentColor: '#7C3AED', rgb: '124, 58, 237' },
    ROBOT: { color: '#06B6D4', accentColor: '#06B6D4', rgb: '6, 182, 212' },
    URO: { color: '#EC4899', accentColor: '#EC4899', rgb: '236, 72, 153' },
    ORL: { color: '#3B82F6', accentColor: '#3B82F6', rgb: '59, 130, 246' },
    CÉVNÍ: { color: '#F59E0B', accentColor: '#F59E0B', rgb: '245, 158, 11' },
    'HPB + PLICNÍ': { color: '#8B5CF6', accentColor: '#8B5CF6', rgb: '139, 92, 246' },
    DĚTSKÉ: { color: '#06B6D4', accentColor: '#06B6D4', rgb: '6, 182, 212' },
    MAMMO: { color: '#EC4899', accentColor: '#EC4899', rgb: '236, 72, 153' },
  };

  const getDeptColor = (dept: string) => deptColors[dept] || { color: '#64748B', accentColor: '#64748B', rgb: '100, 116, 139' };

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
            className="mb-8 p-6 rounded-2xl backdrop-blur-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Název sálu (např. Sál č. 1)"
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                className="px-4 py-3 rounded-xl backdrop-blur border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
              />
              <input
                type="text"
                placeholder="Oddělení (TRA, CHIR, atd.)"
                value={newRoomData.department}
                onChange={(e) => setNewRoomData({ ...newRoomData, department: e.target.value })}
                className="px-4 py-3 rounded-xl backdrop-blur border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
              />
              <input
                type="text"
                placeholder="Popis (volitelně)"
                value={newRoomData.description}
                onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })}
                className="px-4 py-3 rounded-xl backdrop-blur border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleAddRoom}
                className="px-6 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold backdrop-blur transition-all"
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
                className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 font-semibold backdrop-blur transition-all"
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
          className="mb-8 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold backdrop-blur transition-all flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
        >
          <Plus className="w-5 h-5" />
          Přidat nový sál
        </motion.button>
      )}

      {/* Rooms Grid - Premium Glassmorph */}
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
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`group relative overflow-hidden rounded-2xl cursor-move transition-all duration-300 ${
                  isDragging ? 'opacity-30 scale-95 rotate-2' : ''
                }`}
              >
                {/* Multi-layer Backdrop with animated gradients */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                  }}
                  transition={{
                    backgroundPosition: { duration: 15, repeat: Infinity, ease: 'easeInOut' },
                  }}
                  style={{
                    background: `linear-gradient(45deg, rgba(${deptColor.rgb}, 0.25), rgba(${deptColor.rgb}, 0.05), rgba(${deptColor.rgb}, 0.12), rgba(${deptColor.rgb}, 0.03))`,
                    backgroundSize: '300% 300%',
                  }}
                />

                {/* Premium Glassmorph Base - Super refined */}
                <motion.div
                  className="absolute inset-0 backdrop-blur-3xl"
                  whileHover={{ backdropFilter: 'blur(40px)' }}
                  transition={{ duration: 0.3 }}
                  style={{
                    background: `linear-gradient(135deg, 
                      rgba(255,255,255,0.15) 0%, 
                      rgba(255,255,255,0.06) 25%, 
                      rgba(255,255,255,0.04) 50%, 
                      rgba(255,255,255,0.08) 75%,
                      rgba(255,255,255,0.12) 100%
                    )`,
                    border: `1.5px solid rgba(255,255,255,${isEditing || isDeleting ? '0.35' : '0.22'})`,
                    boxShadow: `
                      inset 0 1px 2px rgba(255,255,255,0.3),
                      inset 0 -1px 4px rgba(0,0,0,0.15),
                      0 25px 50px -12px rgba(0,0,0,0.25),
                      0 0 40px rgba(${deptColor.rgb}, 0.15)
                    `,
                  }}
                />

                {/* Animated top accent glow line */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100"
                  animate={{
                    boxShadow: [
                      'none',
                      `0 0 15px rgba(${deptColor.rgb}, 0.8)`,
                      `0 0 30px rgba(${deptColor.rgb}, 0.4)`,
                      'none',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: `linear-gradient(90deg, 
                      rgba(${deptColor.rgb}, 0) 0%, 
                      ${deptColor.color} 50%, 
                      rgba(${deptColor.rgb}, 0) 100%
                    )`,
                  }}
                />

                {/* Corner accent glows - Dynamic */}
                <motion.div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-50"
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0, 0.4, 0.2],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  style={{ background: deptColor.color }}
                />

                <motion.div
                  className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0, 0.25, 0.1],
                  }}
                  transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                  style={{ background: deptColor.color }}
                />

                {/* Bottom accent glow */}
                <motion.div
                  className="absolute top-1/2 right-0 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-20"
                  animate={{ 
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                  style={{ background: deptColor.color }}
                />

                {/* Content Layer */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between min-h-96">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                      />
                      <input
                        type="text"
                        value={editingRoom.department}
                        onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                      />
                      <div className="flex gap-3 pt-4">
                        <motion.button
                          onClick={handleUpdateRoom}
                          className="flex-1 px-4 py-3 font-semibold rounded-lg bg-white/25 hover:bg-white/35 border border-white/40 text-white backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Uložit
                        </motion.button>
                        <motion.button
                          onClick={() => setEditingRoom(null)}
                          className="flex-1 px-4 py-3 font-semibold rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Zrušit
                        </motion.button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <p className="text-xs font-bold text-red-300 uppercase tracking-widest">Potvrzení smazání</p>
                        </div>
                        <p className="text-xl font-bold text-white">{room.name}</p>
                      </div>
                      <div className="flex gap-3">
                        <motion.button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="flex-1 px-4 py-3 font-semibold rounded-lg bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-200 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Smazat
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-4 py-3 font-semibold rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Zrušit
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-between h-full">
                      {/* Department Badge - Premium */}
                      <motion.div
                        className="mb-6"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <motion.div
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur border transition-all"
                          style={{
                            background: `rgba(${deptColor.rgb}, 0.18)`,
                            borderColor: `rgba(${deptColor.rgb}, 0.4)`,
                          }}
                          whileHover={{ scale: 1.08, boxShadow: `0 0 20px rgba(${deptColor.rgb}, 0.3)` }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles className="w-4 h-4" style={{ color: deptColor.color }} />
                          </motion.div>
                          <p className="text-[12px] font-black tracking-[0.2em] uppercase font-bold" style={{ color: deptColor.color }}>
                            {room.department}
                          </p>
                        </motion.div>
                      </motion.div>

                      {/* Room Name - Bold typography */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                      >
                        <motion.h3
                          className="text-4xl font-black text-white leading-tight tracking-tight"
                          initial={{ opacity: 0.85 }}
                          whileHover={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {room.name}
                        </motion.h3>
                      </motion.div>

                      {/* Action Bar - Bottom */}
                      <motion.div
                        className="flex items-center justify-between pt-6 border-t"
                        style={{
                          borderTopColor: `rgba(255,255,255,0.15)`,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <GripVertical className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <div className="flex gap-2 flex-1 ml-4">
                          <motion.button
                            onClick={() => setEditingRoom({ id: room.id, name: room.name, department: room.department })}
                            className="flex-1 px-3 py-2.5 text-xs font-black rounded-lg backdrop-blur border transition-all uppercase tracking-widest"
                            style={{
                              background: `rgba(${deptColor.rgb}, 0.12)`,
                              borderColor: `rgba(${deptColor.rgb}, 0.3)`,
                              color: deptColor.color,
                            }}
                            whileHover={{ 
                              scale: 1.05,
                              boxShadow: `0 0 15px rgba(${deptColor.rgb}, 0.4)`,
                            }}
                          >
                            Upravit
                          </motion.button>
                          <motion.button
                            onClick={() => setDeleteConfirm(room.id)}
                            className="flex-1 px-3 py-2.5 text-xs font-black rounded-lg bg-white/5 hover:bg-red-500/15 border border-white/15 hover:border-red-500/40 text-white/60 hover:text-red-300 backdrop-blur transition-all uppercase tracking-widest"
                            whileHover={{ scale: 1.05 }}
                          >
                            Smazat
                          </motion.button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {roomsList.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <p className="text-white/40 text-lg">Zatím nejsou žádné sály. Přidejte první sál kliknutím na tlačítko výše.</p>
        </motion.div>
      )}
    </div>
  );
};

export default OperatingRoomsManager;
