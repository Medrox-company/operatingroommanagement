import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopBar from './components/TopBar';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import PlaceholderView from './components/PlaceholderView';
import SettingsPage from './components/SettingsPage';
import AnimatedCounter from './components/AnimatedCounter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OperatingRoom } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, LayoutGrid, Shield, User, AlertCircle, Settings } from 'lucide-react';
import TimelineModule from './components/TimelineModule';
import StatisticsModule from './components/StatisticsModule';
import { fetchOperatingRooms, subscribeToOperatingRooms, updateOperatingRoom } from './lib/db';

// Main App Component - Operating Rooms Management System
// Last updated: 2026-02-22T12:00:00Z
const App: React.FC = () => {
  const [rooms, setRooms] = useState<OperatingRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [settingsResetTrigger, setSettingsResetTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load rooms from database on mount
  useEffect(() => {
    const loadRooms = async () => {
      try {
        setLoading(true);
        const data = await fetchOperatingRooms();
        setRooms(data);
        setError(null);
      } catch (err) {
        console.error('[v0] Failed to load operating rooms:', err);
        setError('Nepodařilo se načíst operační sály');
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToOperatingRooms((newRoom) => {
      setRooms((prev) =>
        prev.some((r) => r.id === newRoom.id)
          ? prev.map((r) => (r.id === newRoom.id ? newRoom : r))
          : [...prev, newRoom]
      );
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const updateRoomStep = (roomId: string, newStepIndex: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      updateOperatingRoom(roomId, { currentStepIndex: newStepIndex });
    }
  };

  const toggleEmergency = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      updateOperatingRoom(roomId, { isEmergency: !room.isEmergency });
    }
  };

  const toggleLock = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      updateOperatingRoom(roomId, { isLocked: !room.isLocked });
    }
  };

  const handleUpdateRoomEndTime = (roomId: string, newTime: Date | null) => {
    updateOperatingRoom(roomId, {
      estimatedEndTime: newTime ? newTime.toISOString() : undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D8C1] mx-auto mb-4"></div>
          <p className="text-white">Načítám operační sály...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-black">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00D8C1] text-black rounded-lg hover:bg-[#00C9B5]"
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  return (
    <ErrorBoundary>
    <div className="flex h-screen w-full font-sans overflow-hidden bg-black text-white">
      {/* Immersive Global Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=2000"
          alt="Operating Environment"
          className="w-full h-full object-cover opacity-15 grayscale scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_transparent_20%,_rgba(0,0,0,0.95)_100%)]" />

        {/* Subtle Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      {/* Atmospheric Edge Glows - Tuned Blue */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        <div className="absolute -left-40 top-0 bottom-0 w-[600px] bg-[#5B65DC] blur-[180px] opacity-25" />
        <div className="absolute -right-40 top-0 bottom-0 w-[600px] bg-[#5B65DC] blur-[180px] opacity-25" />
      </div>

      <Sidebar currentView={currentView} onNavigate={(view) => {
        if (currentView === 'settings' && view === 'settings') {
          // Reset settings module when clicking settings again
          setSettingsResetTrigger(prev => prev + 1);
        } else {
          setCurrentView(view);
          setSelectedRoomId(null);
        }
      }} />
      <MobileNav currentView={currentView} onNavigate={(view) => {
        if (currentView === 'settings' && view === 'settings') {
          // Reset settings module when clicking settings again
          setSettingsResetTrigger(prev => prev + 1);
        } else {
          setCurrentView(view);
          setSelectedRoomId(null);
        }
      }} />

      <div className="flex-1 flex flex-col relative z-20 w-full overflow-hidden">
        {/* Horní lišta se nezobrazuje – všechny moduly mají plnou stránku jako dashboard */}
        {/* <TopBar /> */}

        <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">
          <AnimatePresence mode="wait">

            {/* Dashboard — room detail */}
            {currentView === 'dashboard' && selectedRoom && (
              <motion.div key="detail"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-50">
                <RoomDetail
                  room={selectedRoom}
                  onClose={() => setSelectedRoomId(null)}
                  onStepChange={(index) => updateRoomStep(selectedRoom.id, index)}
                  onEndTimeChange={(newTime) => handleUpdateRoomEndTime(selectedRoom.id, newTime)}
                />
              </motion.div>
            )}

            {/* Dashboard — room grid */}
            {currentView === 'dashboard' && !selectedRoom && (
              <motion.div key="grid-container"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full overflow-y-auto hide-scrollbar px-8 md:pl-32 md:pr-10 py-10">
                <div className="max-w-[2400px] mx-auto w-full">
                  <header className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-6 mb-16 flex-shrink-0">
                    <div className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
                        <Shield className="w-4 h-4 text-[#00D8C1]" />
                        <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
                      </div>
                      <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                        OPERATING <span className="text-white/20">ROOM</span>
                      </h1>
                    </div>
                    <div className="flex gap-4 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                      {[
                        { label: 'AKTIVNÍ',   value: rooms.filter(r => r.currentStepIndex < 6).length,  icon: Activity,    color: 'text-red-500'      },
                        { label: 'PŘIPRAVENO', value: rooms.filter(r => r.currentStepIndex >= 6).length, icon: LayoutGrid,  color: 'text-[#00D8C1]'   },
                      ].map((stat) => (
                        <div key={stat.label} className="flex flex-col items-center justify-center px-10 py-4 rounded-3xl hover:bg-white/5 transition-all min-w-[150px] z-10">
                          <div className="flex items-center gap-2.5 mb-2 opacity-40">
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                          </div>
                          <AnimatedCounter to={stat.value} />
                        </div>
                      ))}
                    </div>
                  </header>
                  <div className="pb-20 px-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-8 gap-y-12">
                      {rooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onClick={() => setSelectedRoomId(room.id)}
                          onEmergency={() => toggleEmergency(room.id)}
                          onLock={() => toggleLock(room.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Timeline */}
            {currentView === 'timeline' && (
              <motion.div key="timeline"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full overflow-hidden">
                <TimelineModule rooms={rooms} />
              </motion.div>
            )}

            {/* Statistics */}
            {currentView === 'statistics' && (
              <motion.div key="statistics"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full overflow-y-auto hide-scrollbar">
                <div className="w-full px-8 md:pl-32 md:pr-10 py-10">
                  <StatisticsModule rooms={rooms} />
                </div>
              </motion.div>
            )}

            {/* Staff */}
            {currentView === 'staff' && (
              <motion.div key="staff"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full">
                <PlaceholderView
                  icon={User}
                  title="Personál"
                  description="Přehled personálu a přiřazení k sálům bude dostupný v nadcházející aktualizaci."
                />
              </motion.div>
            )}

            {/* Alerts */}
            {currentView === 'alerts' && (
              <motion.div key="alerts"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full">
                <PlaceholderView
                  icon={AlertCircle}
                  title="Upozornění"
                  description="Centrální upozornění a notifikace z operačních sálů budou zobrazeny zde."
                />
              </motion.div>
            )}

            {/* Settings */}
            {currentView === 'settings' && (
              <motion.div key="settings"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full overflow-y-auto hide-scrollbar">
                <SettingsPage rooms={rooms} onRoomsChange={setRooms} resetTrigger={settingsResetTrigger} />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;
