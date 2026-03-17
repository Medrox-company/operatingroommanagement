import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { MOCK_ROOMS } from '../constants';
import { Plus, Trash2, Edit2, GripVertical, X, Check, AlertCircle } from 'lucide-react';

interface OperatingRoomsManagerProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
}

interface EditingRoom {
  id: string;
  name: string;
  department: string;
}

const OperatingRoomsManager: React.FC<OperatingRoomsManagerProps> = ({
  rooms: initialRooms,
  onRoomsChange,
}) => {
  const [roomsList, setRoomsList] = useState<OperatingRoom[]>(initialRooms || MOCK_ROOMS);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRoom, setEditingRoom] = useState<EditingRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
  });

  const deptColors: Record<string, string> = {
    TRA: '#00D8C1',
    CHIR: '#7C3AED',
    ROBOT: '#06B6D4',
    URO: '#EC4899',
    ORL: '#3B82F6',
    CÉVNÍ: '#F59E0B',
    'HPB + PLICNÍ': '#8B5CF6',
    DĚTSKÉ: '#06B6D4',
    MAMMO: '#EC4899',
  };

  const getDeptColor = (dept: string) => deptColors[dept] || '#64748B';

  const handleAddRoom = () => {
    if (!newRoomData.name || !newRoomData.department) {
      setError('Vyplnte prosim vsechna povinna pole');
      return;
    }

    const newRoom: OperatingRoom = {
      id: `room-${Date.now()}`,
      name: newRoomData.name,
      department: newRoomData.department,
      status: RoomStatus.FREE,
      queueCount: 0,
      operations24h: 0,
      currentStepIndex: 6,
      isEmergency: false,
      isLocked: false,
    };

    const updatedRooms = [...roomsList, newRoom];
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setNewRoomData({ name: '', department: '' });
    setIsAddingNew(false);
    setError(null);
  };

  const handleDeleteRoom = (id: string) => {
    const updatedRooms = roomsList.filter(r => r.id !== id);
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setDeleteConfirm(null);
  };

  const handleUpdateRoom = () => {
    if (!editingRoom) return;
    const updatedRooms = roomsList.map(r =>
      r.id === editingRoom.id
        ? { ...r, name: editingRoom.name, department: editingRoom.department }
        : r
    );
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setEditingRoom(null);
  };

  return (
    <div className="w-full">
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <GripVertical className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATING ROOMS MANAGEMENT</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            OPERACNI <span className="text-white/20">SALY</span>
          </h1>
        </div>
      </header>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Nazev salu (napr. Sal c. 1)"
                value={newRoomData.name}
                onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Oddeleni (TRA, CHIR, atd.)"
                value={newRoomData.department}
                onChange={(e) => setNewRoomData({ ...newRoomData, department: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddRoom}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Pridat
              </button>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setNewRoomData({ name: '', department: '' });
                }}
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
          Pridat novy sal
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roomsList.map((room) => (
          <motion.div
            key={room.id}
            className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                <p className="text-sm text-white/60">{room.department}</p>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getDeptColor(room.department) }}
              />
            </div>

            <div className="space-y-2 mb-4 text-sm text-white/60">
              <p>Status: <span className="text-white">{room.status}</span></p>
              <p>Queue: <span className="text-white">{room.queueCount || 0}</span></p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditingRoom({ id: room.id, name: room.name, department: room.department })}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Upravit
              </button>
              <button
                onClick={() => setDeleteConfirm(room.id)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Smazat
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Upravit sal</h2>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Nazev"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
                <input
                  type="text"
                  placeholder="Oddeleni"
                  value={editingRoom.department}
                  onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateRoom}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 transition-all"
                >
                  Ulozit
                </button>
                <button
                  onClick={() => setEditingRoom(null)}
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
              <p className="text-white/70 mb-6">Opravdu chcete smazat tento sal?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteRoom(deleteConfirm)}
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

export default OperatingRoomsManager;
