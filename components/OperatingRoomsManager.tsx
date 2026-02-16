import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus } from '../types';
import { Plus, Edit2, Trash2, GripVertical, X, Check, Building2, MapPin, FileText } from 'lucide-react';

interface OperatingRoomsManagerProps {
  rooms: OperatingRoom[];
  onRoomsChange: (rooms: OperatingRoom[]) => void;
}

interface EditingRoom extends Partial<OperatingRoom> {
  description?: string;
}

export default function OperatingRoomsManager({ rooms, onRoomsChange }: OperatingRoomsManagerProps) {
  const [editingRoom, setEditingRoom] = useState<EditingRoom | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const statusColors: Record<RoomStatus, { bg: string; text: string; border: string }> = {
    [RoomStatus.FREE]: { bg: '#34C75940', text: '#34C759', border: '#34C75960' },
    [RoomStatus.BUSY]: { bg: '#FF3B3040', text: '#FF3B30', border: '#FF3B3060' },
    [RoomStatus.CLEANING]: { bg: '#FBBF2440', text: '#FBBF24', border: '#FBBF2460' },
    [RoomStatus.MAINTENANCE]: { bg: '#818CF840', text: '#818CF8', border: '#818CF860' },
  };

  const handleAdd = () => {
    setEditingRoom({
      id: Date.now().toString(),
      name: '',
      department: '',
      status: RoomStatus.FREE,
      queueCount: 0,
      operations24h: 0,
      staff: { doctor: { name: null, role: 'DOCTOR' }, nurse: { name: null, role: 'NURSE' } },
      currentStepIndex: 0,
      description: '',
    });
    setShowForm(true);
  };

  const handleEdit = (room: OperatingRoom) => {
    setEditingRoom({ ...room, description: '' });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!editingRoom || !editingRoom.name?.trim()) return;

    const updatedRooms = rooms.some(r => r.id === editingRoom.id)
      ? rooms.map(r => r.id === editingRoom.id ? { ...editingRoom as OperatingRoom } : r)
      : [...rooms, editingRoom as OperatingRoom];

    onRoomsChange(updatedRooms);
    setShowForm(false);
    setEditingRoom(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Opravdu chcete smazat tento sál?')) {
      onRoomsChange(rooms.filter(r => r.id !== id));
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIndex = rooms.findIndex(r => r.id === draggedId);
    const targetIndex = rooms.findIndex(r => r.id === targetId);

    if (draggedIndex < 0 || targetIndex < 0) return;

    const newRooms = Array.from(rooms);
    const [draggedRoom] = newRooms.splice(draggedIndex, 1);
    newRooms.splice(targetIndex, 0, draggedRoom);

    onRoomsChange(newRooms);
    setDraggedId(null);
  };

  return (
    <div className="relative z-20 w-full h-full rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="relative z-10 p-8 border-b border-white/5 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Operační sály</h2>
          <p className="text-sm text-white/40">Správa a konfigurace operačních sálů v systému</p>
        </div>
        <motion.button
          onClick={handleAdd}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-semibold hover:shadow-lg transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          Přidat sál
        </motion.button>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-3">
          <AnimatePresence>
            {rooms.map((room, index) => {
              const status = statusColors[room.status];
              return (
                <motion.div
                  key={room.id}
                  draggable
                  onDragStart={() => handleDragStart(room.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(room.id)}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`group p-4 rounded-xl border transition-all cursor-move ${
                    draggedId === room.id 
                      ? 'opacity-50 bg-white/5 border-white/10' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="w-5 h-5 text-white/30 group-hover:text-white/50" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-bold text-white truncate">{room.name}</h3>
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
                          style={{
                            backgroundColor: status.bg,
                            color: status.text,
                            border: `1px solid ${status.border}`,
                          }}
                        >
                          {room.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {room.department || 'Neuvedeno'}
                        </span>
                        <span>Fronta: {room.queueCount}</span>
                        <span>Operací za 24h: {room.operations24h}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button
                        onClick={() => handleEdit(room)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDelete(room.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {rooms.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Building2 className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/40">Žádné sály nejsou přidány</p>
              <p className="text-xs text-white/20 mt-1">Klikněte na "Přidat sál" pro vytvoření prvního sálu</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showForm && editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 rounded-[2.5rem]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {rooms.some(r => r.id === editingRoom.id) ? 'Upravit sál' : 'Nový sál'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Název sálu</label>
                  <input
                    type="text"
                    value={editingRoom.name || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
                    placeholder="Sál č. 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Oddělení</label>
                  <input
                    type="text"
                    value={editingRoom.department || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
                    placeholder="TRA, URO, ORL..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Status</label>
                  <select
                    value={editingRoom.status || RoomStatus.FREE}
                    onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as RoomStatus })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 transition-all"
                  >
                    {Object.values(RoomStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Popis sálu</label>
                  <textarea
                    value={editingRoom.description || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all resize-none"
                    placeholder="Například: vybavení, kapacita..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowForm(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  Zrušit
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Uložit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
