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
import { Activity, LayoutGrid, Shield, User, AlertCircle } from 'lucide-react';
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 px-4 pt-4 lg:px-6">
              {[
                { label: 'Obsazené sály', value: operatingCount, color: '#FF3B30', Icon: Activity },
                { label: 'Volné sály', value: freeCount, color: '#34C759', Icon: LayoutGrid },
                { label: 'Úklid', value: cleaningCount, color: '#FBBF24', Icon: Shield },
                { label: 'Urgentní', value: emergencyCount, color: '#FF9500', Icon: AlertCircle },
              ].map(({ label, value, color, Icon }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111] border border-white/10 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <AnimatedCounter value={value} className="text-xl font-bold text-white" />
                    <p className="text-xs text-white/50">{label}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-24 lg:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                <AnimatePresence>
                  {rooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => setSelectedRoomId(room.id)}
                      onToggleEmergency={toggleEmergency}
                      onToggleLock={toggleLock}
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
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar
          currentView={currentView}
          onNavigate={setCurrentView}
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
          <RoomDetail
            room={selectedRoom}
            onClose={() => setSelectedRoomId(null)}
            onUpdateStep={updateRoomStep}
            onToggleEmergency={toggleEmergency}
            onToggleLock={toggleLock}
            onUpdateEndTime={handleUpdateRoomEndTime}
          />
        )}
      </AnimatePresence>

      <MobileNav currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;
