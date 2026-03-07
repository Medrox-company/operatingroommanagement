import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import RoomCard from './components/RoomCard';
import RoomDetail from './components/RoomDetail';
import PlaceholderView from './components/PlaceholderView';
import SettingsPage from './components/SettingsPage';
import AnimatedCounter from './components/AnimatedCounter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MOCK_ROOMS } from './constants';
import { OperatingRoom } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, LayoutGrid, User, AlertCircle, Settings } from 'lucide-react';
import TimelineModule from './components/TimelineModule';
import StatisticsModule from './components/StatisticsModule';

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

  const handleNavigate = (view: string) => {
    if (currentView === 'settings' && view === 'settings') {
      setSettingsResetTrigger(prev => prev + 1);
    } else {
      setCurrentView(view);
      setSelectedRoomId(null);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden font-sans">

      {/* Immersive Global Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(30,41,80,0.6)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_100%_100%,rgba(20,30,60,0.4)_0%,transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='0' y='0' width='1' height='1' fill='white'/%3E%3C/svg%3E\")",
            backgroundSize: '4px 4px',
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>

      {/* Sidebar - always on top */}
      <Sidebar currentView={currentView} onNavigate={handleNavigate} />
      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Main content area - offset by sidebar */}
      <main className="absolute inset-0 lg:left-[72px] overflow-hidden">

        {/* Dashboard — room detail overlay */}
        <AnimatePresence>
          {currentView === 'dashboard' && selectedRoom && (
            <RoomDetail
              key={selectedRoom.id}
              room={selectedRoom}
              onClose={() => setSelectedRoomId(null)}
              onStepChange={(index) => updateRoomStep(selectedRoom.id, index)}
              onEndTimeChange={(newTime) => handleUpdateRoomEndTime(selectedRoom.id, newTime)}
            />
          )}
        </AnimatePresence>

        {/* Dashboard — room grid */}
        {currentView === 'dashboard' && !selectedRoom && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div>
                <p className="text-[10px] font-black tracking-[0.4em] text-[#00D8C1] uppercase mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00D8C1] inline-block" />
                  OPERATINGROOM CONTROL
                </p>
                <h1 className="text-5xl lg:text-6xl font-black tracking-tight uppercase leading-none">
                  <span className="text-white">OPERATING</span>
                  <span className="text-white/20"> ROOM</span>
                </h1>
              </div>

              {/* Stats box - top right */}
              <div className="hidden sm:flex items-center gap-0 bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                {[
                  { label: 'AKTIVNÍ', value: rooms.filter(r => r.currentStepIndex < 6).length, Icon: Activity, color: 'text-red-500' },
                  { label: 'PŘIPRAVENO', value: rooms.filter(r => r.currentStepIndex >= 6).length, Icon: LayoutGrid, color: 'text-[#00D8C1]' },
                ].map((stat, i) => (
                  <div key={stat.label} className={`flex flex-col items-center px-8 py-4 ${i === 0 ? 'border-r border-white/[0.08]' : ''}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <stat.Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                      <span className="text-[9px] font-black tracking-[0.25em] text-white/40 uppercase">{stat.label}</span>
                    </div>
                    <AnimatedCounter value={stat.value} className="text-4xl font-black text-white" />
                  </div>
                ))}
              </div>
            </div>

            {/* Room Grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 lg:pb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
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
          </motion.div>
        )}

        {/* Timeline */}
        {currentView === 'timeline' && (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
            <TimelineModule rooms={rooms} />
          </motion.div>
        )}

        {/* Statistics */}
        {currentView === 'statistics' && (
          <motion.div key="statistics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
            <StatisticsModule rooms={rooms} />
          </motion.div>
        )}

        {/* Staff */}
        {currentView === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
            <PlaceholderView icon={User} title="Personál" description="Správa personálu operačního bloku." />
          </motion.div>
        )}

        {/* Alerts */}
        {currentView === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
            <PlaceholderView icon={AlertCircle} title="Upozornění" description="Přehled upozornění a notifikací." />
          </motion.div>
        )}

        {/* Settings */}
        {currentView === 'settings' && (
          <motion.div key={`settings-${settingsResetTrigger}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto">
            <ErrorBoundary>
              <SettingsPage resetTrigger={settingsResetTrigger} />
            </ErrorBoundary>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default App;
