import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopBar from './components/TopBar';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import PlaceholderView from './components/PlaceholderView';
import AnimatedCounter from './components/AnimatedCounter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_ROOMS } from './constants';
import { OperatingRoom } from './types';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Activity, LayoutGrid, Shield, User, AlertCircle, Settings } from 'lucide-react';
import TimelineModule from './components/TimelineModule';

const App: React.FC = () => {
  const [rooms, setRooms] = useState<OperatingRoom[]>(MOCK_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  const updateRoomStep = (roomId: string, newStepIndex: number) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, currentStepIndex: newStepIndex } : room
    ));
  };

  const toggleEmergency = (roomId: string) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isEmergency: !room.isEmergency } : room
    ));
  };

  const toggleLock = (roomId: string) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, isLocked: !room.isLocked } : room
    ));
  };

  const handleUpdateRoomEndTime = (roomId: string, newTime: Date | null) => {
    setRooms(prev => prev.map(room =>
      room.id === roomId
        ? { ...room, estimatedEndTime: newTime ? newTime.toISOString() : undefined }
        : room
    ));
  };

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
        setCurrentView(view);
        if (view === 'dashboard') setSelectedRoomId(null);
      }} />
      <MobileNav currentView={currentView} onNavigate={(view) => {
        setCurrentView(view);
        if (view === 'dashboard') setSelectedRoomId(null);
      }} />

      <div className="flex-1 flex flex-col relative z-20 w-full overflow-hidden">
        {/* Horní lišta se nezobrazuje – všechny moduly mají plnou stránku jako dashboard */}
        {/* <TopBar /> */}

        <main className="flex-1 overflow-hidden relative pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              selectedRoom ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="absolute inset-0 z-50"
                >
                  <RoomDetail
                    room={selectedRoom}
                    onClose={() => setSelectedRoomId(null)}
                    onStepChange={(index) => updateRoomStep(selectedRoom.id, index)}
                    onEndTimeChange={(newTime) => handleUpdateRoomEndTime(selectedRoom.id, newTime)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="grid-container"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full overflow-y-auto hide-scrollbar px-8 md:pl-32 md:pr-10 py-10"
                >
                  <div className="max-w-[2400px] mx-auto w-full">

                    {/* Non-fixed Header that scrolls with content */}
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

                      {/* Global Stats Bar */}
                      <div className="flex gap-4 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        {[
                          { label: 'AKTIVNÍ', value: rooms.filter(r => r.currentStepIndex < 6).length, icon: Activity, color: 'text-red-500' },
                          { label: 'PŘIPRAVENO', value: rooms.filter(r => r.currentStepIndex >= 6).length, icon: LayoutGrid, color: 'text-[#00D8C1]' },
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

                    {/* Grid following the header */}
                    <div className="pb-20 px-2">
                      <LayoutGroup>
                        <motion.div
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-8 gap-y-12"
                          layout
                        >
                          {rooms.map((room) => (
                            <RoomCard
                              key={room.id}
                              room={room}
                              onClick={() => setSelectedRoomId(room.id)}
                              onEmergency={() => toggleEmergency(room.id)}
                              onLock={() => toggleLock(room.id)}
                            />
                          ))}
                        </motion.div>
                      </LayoutGroup>
                    </div>

                  </div>
                </motion.div>
              )
            )}

            {currentView === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full overflow-hidden">
                <TimelineModule rooms={rooms} />
              </motion.div>
            )}

            {currentView === 'staff' && (
              <PlaceholderView
                key="staff"
                icon={User}
                title="Personál"
                description="Přehled personálu a přiřazení k sálům bude dostupný v nadcházející aktualizaci."
              />
            )}
            {currentView === 'alerts' && (
              <PlaceholderView
                key="alerts"
                icon={AlertCircle}
                title="Upozornění"
                description="Centrální upozornění a notifikace z operačních sálů budou zobrazeny zde."
              />
            )}
            {currentView === 'settings' && (
              <PlaceholderView
                key="settings"
                icon={Settings}
                title="Nastavení"
                description="Konfigurace systému a preferencí bude k dispozici v této sekci."
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;