import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { Plus, Trash2, Edit2, GripVertical, X, Check, AlertCircle } from 'lucide-react';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-max">
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`group relative overflow-hidden rounded-3xl cursor-move transition-all duration-300 ${
                  isDragging ? 'opacity-40 scale-95' : 'hover:scale-105'
                }`}
              >
                {/* Animated gradient background */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    backgroundPosition: { duration: 8, repeat: Infinity, ease: 'linear' },
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${deptColor.color}20, ${deptColor.color}05, transparent)`,
                    backgroundSize: '200% 200%',
                  }}
                />

                {/* Glassmorphic background */}
                <div
                  className="absolute inset-0 backdrop-blur-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)`,
                    border: `1.5px solid rgba(255,255,255,0.15)`,
                    boxShadow: `inset 0 1px 2px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.1)`,
                  }}
                />

                {/* Top gradient accent */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(90deg, ${deptColor.color}, transparent)`,
                  }}
                />

                {/* Corner accent circle */}
                <div
                  className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-30 blur-2xl transition-opacity"
                  style={{
                    background: deptColor.color,
                  }}
                />

                {/* Content */}
                <div className="relative z-10 p-8 h-full flex flex-col justify-between min-h-80">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                      />
                      <input
                        type="text"
                        value={editingRoom.department}
                        onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                        className="w-full px-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                      />
                      <div className="flex gap-3 pt-4">
                        <motion.button
                          onClick={handleUpdateRoom}
                          className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-white/20 hover:bg-white/30 border border-white/30 text-white backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Uložit
                        </motion.button>
                        <motion.button
                          onClick={() => setEditingRoom(null)}
                          className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Zrušit
                        </motion.button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    // Delete Confirmation
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">Potvrzení smazání</p>
                        <p className="text-lg font-bold text-white"><strong>{room.name}</strong></p>
                      </div>
                      <div className="flex gap-3">
                        <motion.button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Smazat
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Zrušit
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex flex-col justify-between h-full">
                      {/* Top section */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-2 h-8 rounded-full"
                            style={{ background: deptColor.color }}
                          />
                          <div>
                            <p className="text-xs font-black tracking-[0.2em] uppercase opacity-70"
                              style={{ color: deptColor.color }}
                            >
                              {room.department}
                            </p>
                            <h3 className="text-2xl font-black text-white leading-tight">{room.name}</h3>
                          </div>
                        </div>
                      </div>

                      {/* Bottom action bar */}
                      <div className="flex items-center gap-2 pt-6 border-t border-white/10">
                        <GripVertical className="w-4 h-4 text-white/30 flex-shrink-0" />
                        <motion.button
                          onClick={() => setEditingRoom({ id: room.id, name: room.name, department: room.department })}
                          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Upravit
                        </motion.button>
                        <motion.button
                          onClick={() => setDeleteConfirm(room.id)}
                          className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-red-300 backdrop-blur transition-all"
                          whileHover={{ scale: 1.05 }}
                        >
                          Smazat
                        </motion.button>
                      </div>
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
          className="text-center py-12"
        >
          <p className="text-white/40 text-lg">Zatím nejsou žádné sály. Přidejte první sál kliknutím na tlačítko výše.</p>
        </motion.div>
      )}
    </div>
  );
};

export default OperatingRoomsManager;
