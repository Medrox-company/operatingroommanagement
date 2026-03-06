import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { Plus, Trash2, Edit2, GripVertical, X, Check, AlertCircle, ChevronDown, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchOperatingRooms, createOperatingRoom, updateOperatingRoom, deleteOperatingRoom } from '../lib/db';

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
  rooms: initialRooms,
  onRoomsChange,
}) => {
  const [roomsList, setRoomsList] = useState<OperatingRoom[]>(initialRooms || []);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRoom, setEditingRoom] = useState<EditingRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
    description: '',
  });

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

  // Load operating rooms on mount
  useEffect(() => {
    loadRooms();
    setupRealtimeSubscription();
  }, []);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const data = await fetchOperatingRooms();
      setRoomsList(data);
      onRoomsChange?.(data);
      setError(null);
    } catch (err) {
      console.error('Error loading rooms:', err);
      setError('Chyba při načítání sálů');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('operating_rooms_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operating_rooms' },
        (payload: any) => {
          console.log('[v0] Real-time update:', payload);
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleAddRoom = async () => {
    if (!newRoomData.name || !newRoomData.department) {
      setError('Vyplňte prosím všechna povinná pole');
      return;
    }

    try {
      const newRoom: Omit<OperatingRoom, 'id' | 'created_at' | 'updated_at'> = {
        name: newRoomData.name,
        department: newRoomData.department,
        status: RoomStatus.FREE,
        queue_count: 0,
        operations_24h: 0,
        current_step_index: 6,
        is_emergency: false,
        is_locked: false,
        doctor_id: null,
        nurse_id: null,
        anesthesiologist_id: null,
        current_patient_id: null,
        current_procedure_id: null,
        is_septic: false,
        estimated_end_time: null,
      };

      await createOperatingRoom(newRoom);
      setNewRoomData({ name: '', department: '', description: '' });
      setIsAddingNew(false);
      setError(null);
      await loadRooms();
    } catch (err) {
      console.error('Error adding room:', err);
      setError('Chyba při přidávání sálu');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      await deleteOperatingRoom(id);
      setDeleteConfirm(null);
      setError(null);
      await loadRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
      setError('Chyba při mazání sálu');
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;

    try {
      await updateOperatingRoom(editingRoom.id, {
        name: editingRoom.name,
        department: editingRoom.department,
      });
      setEditingRoom(null);
      setError(null);
      await loadRooms();
    } catch (err) {
      console.error('Error updating room:', err);
      setError('Chyba při aktualizaci sálu');
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
            <GripVertical className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATING ROOMS MANAGEMENT</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            OPERAČNÍ <span className="text-white/20">SÁLY</span>
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
          className="mb-8 px-6 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold hover:bg-green-500/30 transition-all flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <Plus className="w-4 h-4" />
          Přidat nový sál
        </motion.button>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {roomsList.map((room) => (
            <motion.div
              key={room.id}
              draggable
              onDragStart={(e) => handleDragStart(e as any, room.id)}
              onDragOver={handleDragOver as any}
              onDrop={(e) => handleDrop(e as any, room.id)}
              className="p-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-move"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                  <p className="text-sm text-white/60">{room.department}</p>
                </div>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getDeptColor(room.department).color }}
                />
              </div>

              <div className="space-y-2 mb-4 text-sm text-white/60">
                <p>Status: <span className="text-white">{room.status}</span></p>
                <p>Queue: <span className="text-white">{room.queue_count || 0}</span></p>
              </div>

              <div className="flex gap-2">
                <motion.button
                  onClick={() => setEditingRoom({ id: room.id, name: room.name, department: room.department })}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <Edit2 className="w-3 h-3" />
                  Upravit
                </motion.button>
                <motion.button
                  onClick={() => setDeleteConfirm(room.id)}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <Trash2 className="w-3 h-3" />
                  Smazat
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
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
              <h2 className="text-xl font-bold text-white mb-4">Upravit sál</h2>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Název"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                />
                <input
                  type="text"
                  placeholder="Oddělení"
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
                  Uložit
                </button>
                <button
                  onClick={() => setEditingRoom(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrušit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
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
              <h2 className="text-xl font-bold text-white mb-4">Potvrdit smazání</h2>
              <p className="text-white/70 mb-6">Opravdu chcete smazat tento sál?</p>
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

export default OperatingRoomsManager;
