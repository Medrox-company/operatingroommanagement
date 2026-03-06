import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import TopBar from './components/TopBar';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import PlaceholderView from './components/PlaceholderView';
import SettingsPage from './components/SettingsPage';
import AnimatedCounter from './components/AnimatedCounter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_ROOMS } from './constants';
import { OperatingRoom } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, LayoutGrid, User, AlertCircle } from 'lucide-react';
import TimelineModule from './components/TimelineModule';
import StatisticsModule from './components/StatisticsModule';

// Main App Component - Operating Rooms Management System
const App: React.FC = () => {
  const [rooms, setRooms] = useState<OperatingRoom[]>(MOCK_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [settingsResetTrigger, setSettingsResetTrigger] = useState(0);

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

  const operatingCount = rooms.filter(r => r.status === 'BUSY').length;
  const freeCount = rooms.filter(r => r.status === 'FREE').length;
  const cleaningCount = rooms.filter(r => r.status === 'CLEANING').length;
  const emergencyCount = rooms.filter(r => r.isEmergency).length;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="flex flex-col h-full">
            {/* Header with title and stats */}
            <div className="flex justify-between items-start px-6 pt-6 pb-4">
              <div>
                <p className="text-[10px] font-black tracking-[0.4em] text-[#00D8C1] uppercase mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#00D8C1] rounded-full"></span>
                  OPERATINGROOM CONTROL
                </p>
                <h1 className="text-5xl font-black tracking-tight uppercase">
                  <span className="text-white">OPERATING</span>
                  <span className="text-white/30">ROOM</span>
                </h1>
              </div>
              
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex gap-8">
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-yellow-400" />
                    <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">Aktivní</span>
                  </div>
                  <AnimatedCounter value={operatingCount} className="text-3xl font-black text-white" />
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="w-4 h-4 text-[#00D8C1]" />
                    <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">Připraveno</span>
                  </div>
                  <AnimatedCounter value={freeCount} className="text-3xl font-black text-white" />
                </div>
              </div>
            </div>

            {/* Room cards grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 lg:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
                <AnimatePresence>
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => setSelectedRoomId(room.id)}
                      onEmergency={(e) => { e.stopPropagation(); toggleEmergency(room.id); }}
                      onLock={(e) => { e.stopPropagation(); toggleLock(room.id); }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );
      case 'timeline':
        return <TimelineModule rooms={rooms} />;
      case 'statistics':
        return <StatisticsModule rooms={rooms} />;
      case 'staff':
        return <PlaceholderView icon={User} title="Správa personálu" description="Přehled operačního personálu a jejich přiřazení k sálům." />;
      case 'alerts':
        return <PlaceholderView icon={AlertCircle} title="Upozornění" description="Kritické výstrahy a notifikace vyžadující pozornost." />;
      case 'settings':
        return (
          <ErrorBoundary>
            <SettingsPage key={settingsResetTrigger} />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar currentView={currentView} onNavigate={(view) => { setSelectedRoomId(null); setCurrentView(view); }} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          currentView={currentView}
          onNavigate={(view) => { setSelectedRoomId(null); setCurrentView(view); }}
          onSettingsReset={() => setSettingsResetTrigger(t => t + 1)}
        />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full overflow-y-auto"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:left-24"
          >
            <RoomDetail
              room={selectedRoom}
              onClose={() => setSelectedRoomId(null)}
              onStepChange={(index) => updateRoomStep(selectedRoom.id, index)}
              onEndTimeChange={(newTime) => handleUpdateRoomEndTime(selectedRoom.id, newTime)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <MobileNav currentView={currentView} onNavigate={(view) => { setSelectedRoomId(null); setCurrentView(view); }} />
    </div>
  );
};

export default App;
