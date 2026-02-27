import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3x3, Maximize2, Minimize2, RotateCcw, Plus, X } from 'lucide-react';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface HallGridConfig {
  hallId: string;
  hallName: string;
  rows: number;
  cols: number;
  displayMode: 'full' | 'half';
  segments: (string | null)[];
  width: number;
  height: number;
}

interface HallDisplayProps {
  config: HallGridConfig;
  onUpdateConfig: (config: HallGridConfig) => void;
  onDelete: (hallId: string) => void;
}

const TheatreHallScheduler: React.FC = () => {
  const [halls, setHalls] = useState<HallGridConfig[]>([
    {
      hallId: '1',
      hallName: 'Sál 1',
      rows: 3,
      cols: 4,
      displayMode: 'full',
      segments: Array(12).fill(null),
      width: 100,
      height: 100,
    },
    {
      hallId: '2',
      hallName: 'Sál 2',
      rows: 2,
      cols: 3,
      displayMode: 'full',
      segments: Array(6).fill(null),
      width: 100,
      height: 100,
    },
  ]);

  const [selectedHallId, setSelectedHallId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState<HallGridConfig | null>(null);

  const handleAddHall = () => {
    const newHall: HallGridConfig = {
      hallId: Date.now().toString(),
      hallName: `Sál ${halls.length + 1}`,
      rows: 2,
      cols: 2,
      displayMode: 'full',
      segments: Array(4).fill(null),
      width: 100,
      height: 100,
    };
    setHalls([...halls, newHall]);
  };

  const handleHallClick = (hallId: string) => {
    const hall = halls.find(h => h.hallId === hallId);
    if (hall) {
      setSelectedHallId(hallId);
      setTempConfig({ ...hall });
      setShowConfigModal(true);
    }
  };

  const handleDeleteHall = (hallId: string) => {
    setHalls(halls.filter(h => h.hallId !== hallId));
    if (selectedHallId === hallId) {
      setSelectedHallId(null);
      setShowConfigModal(false);
    }
  };

  const handleUpdateConfig = () => {
    if (tempConfig) {
      setHalls(halls.map(h => (h.hallId === tempConfig.hallId ? tempConfig : h)));
      setShowConfigModal(false);
    }
  };

  const handleSegmentClick = (index: number) => {
    if (tempConfig) {
      const updated = { ...tempConfig };
      updated.segments[index] = updated.segments[index] ? null : 'occupied';
      setTempConfig(updated);
    }
  };

  const handleRowsChange = (value: number) => {
    if (tempConfig) {
      const newTotal = value * tempConfig.cols;
      const updated = { ...tempConfig, rows: value, segments: Array(newTotal).fill(null) };
      setTempConfig(updated);
    }
  };

  const handleColsChange = (value: number) => {
    if (tempConfig) {
      const newTotal = tempConfig.rows * value;
      const updated = { ...tempConfig, cols: value, segments: Array(newTotal).fill(null) };
      setTempConfig(updated);
    }
  };

  const toggleDisplayMode = () => {
    if (tempConfig) {
      setTempConfig({
        ...tempConfig,
        displayMode: tempConfig.displayMode === 'full' ? 'half' : 'full',
      });
    }
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="pb-6 pt-4 px-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-purple-400/60 uppercase tracking-[0.2em] mb-1">PLÁNOVÁNÍ</p>
            <h1 className="text-4xl font-black text-white">
              PLÁNOVÁNÍ <span className="text-slate-700">SÁLŮ</span>
            </h1>
          </div>
          <motion.button
            onClick={handleAddHall}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            Přidat sál
          </motion.button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-grow overflow-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {halls.map(hall => (
            <motion.div
              key={hall.hallId}
              className="relative group"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hall Card */}
              <motion.div
                onClick={() => handleHallClick(hall.hallId)}
                className="relative cursor-pointer p-4 rounded-xl border-2 border-white/10 hover:border-purple-500/50 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all group"
                whileHover={{ scale: 1.02 }}
                style={{
                  aspectRatio: '1/1',
                }}
              >
                {/* Delete Button */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteHall(hall.hallId);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 opacity-0 group-hover:opacity-100 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>

                {/* Hall Title */}
                <h3 className="text-lg font-bold text-white mb-3">{hall.hallName}</h3>

                {/* Grid Visualization */}
                <div className="flex items-center justify-center h-[calc(100%-3rem)]">
                  <div
                    className="grid gap-1 p-2 bg-black/20 rounded-lg"
                    style={{
                      gridTemplateColumns: `repeat(${hall.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${hall.rows}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array(hall.rows * hall.cols)
                      .fill(null)
                      .map((_, i) => {
                        const isHalf = hall.displayMode === 'half';
                        const halfSize = (hall.rows * hall.cols) / 2;
                        const isInHalf = i < halfSize;
                        const shouldShow = !isHalf || isInHalf;

                        return shouldShow ? (
                          <motion.div
                            key={i}
                            className="rounded-md bg-gradient-to-br from-purple-500/30 to-purple-600/20 border border-purple-400/30 flex items-center justify-center text-xs font-bold text-purple-200"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                          >
                            {i + 1}
                          </motion.div>
                        ) : null;
                      })}
                  </div>
                </div>

                {/* Info Badge */}
                <div className="absolute bottom-2 left-4 text-xs text-white/60">
                  {hall.rows} × {hall.cols} {hall.displayMode === 'half' ? '(POLOVINA)' : ''}
                </div>
              </motion.div>
            </motion.div>
          ))}

          {/* Add Hall Card */}
          <motion.button
            onClick={handleAddHall}
            className="rounded-xl border-2 border-dashed border-white/20 hover:border-purple-400/50 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
            whileHover={{ scale: 1.02 }}
            style={{ aspectRatio: '1/1' }}
          >
            <Plus className="w-12 h-12 text-white/40 group-hover:text-purple-400 transition-colors" />
          </motion.button>
        </div>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && tempConfig && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-white">{tempConfig.hallName}</h2>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              </div>

              {/* Configuration Controls */}
              <div className="space-y-6 mb-8">
                {/* Size Mode Toggle */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-bold text-white/80">Režim zobrazení:</label>
                  <motion.button
                    onClick={toggleDisplayMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                      tempConfig.displayMode === 'full'
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-white/60'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {tempConfig.displayMode === 'full' ? (
                      <>
                        <Maximize2 className="w-4 h-4" />
                        Plná šířka
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-4 h-4" />
                        Polovina
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Rows Control */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white/80">Řady: {tempConfig.rows}</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={tempConfig.rows}
                      onChange={(e) => handleRowsChange(parseInt(e.target.value))}
                      className="flex-grow accent-purple-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={tempConfig.rows}
                      onChange={(e) => handleRowsChange(parseInt(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-center"
                    />
                  </div>
                </div>

                {/* Columns Control */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-white/80">Sloupce: {tempConfig.cols}</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={tempConfig.cols}
                      onChange={(e) => handleColsChange(parseInt(e.target.value))}
                      className="flex-grow accent-purple-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={tempConfig.cols}
                      onChange={(e) => handleColsChange(parseInt(e.target.value))}
                      className="w-16 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Preview */}
              <div className="mb-8 p-4 bg-black/20 rounded-lg">
                <h3 className="text-sm font-bold text-white/80 mb-4">Náhled</h3>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${tempConfig.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${tempConfig.rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array(tempConfig.rows * tempConfig.cols)
                    .fill(null)
                    .map((_, i) => {
                      const isHalf = tempConfig.displayMode === 'half';
                      const halfSize = (tempConfig.rows * tempConfig.cols) / 2;
                      const isInHalf = i < halfSize;
                      const shouldShow = !isHalf || isInHalf;

                      return shouldShow ? (
                        <motion.button
                          key={i}
                          onClick={() => handleSegmentClick(i)}
                          className={`aspect-square rounded-md border-2 transition-all font-bold text-sm flex items-center justify-center cursor-pointer ${
                            tempConfig.segments[i]
                              ? 'bg-purple-500/50 border-purple-400 text-white'
                              : 'bg-slate-800/50 border-slate-600 text-white/40 hover:border-purple-400'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {i + 1}
                        </motion.button>
                      ) : null;
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 justify-end">
                <motion.button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white/80 font-bold hover:bg-white/5 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Zrušit
                </motion.button>
                <motion.button
                  onClick={handleUpdateConfig}
                  className="px-6 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Uložit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TheatreHallScheduler;
