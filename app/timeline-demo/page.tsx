'use client';

import React, { useState, useEffect } from 'react';
import TimelineModuleHIG, {
  TimelineItemData,
  TimelineConfig,
} from '@/components/TimelineModuleHIG';

/* ============================================================================
   TIMELINE MODULE EXAMPLE & USAGE GUIDE
   
   Tento soubor demonstruje všechny možnosti parametrizace TimelineModuleHIG
   a jak ji integrovat do aplikace.
============================================================================ */

// ========== EXAMPLE DATA ==========
const EXAMPLE_ITEMS: TimelineItemData[] = [
  {
    id: '1',
    label: 'Surgery: John Doe',
    description: 'Orthopedic Surgery - Right Knee',
    startTime: '08:00',
    endTime: '09:30',
    status: 'completed',
    progress: 100,
    metadata: {
      roomId: 'OR1',
      surgeon: 'Dr. Smith',
      procedure: 'Arthroscopy',
    },
    tooltip: 'Completed at 09:28',
  },
  {
    id: '2',
    label: 'Emergency: Jane Doe',
    description: 'Emergency Appendectomy',
    startTime: '09:45',
    endTime: '11:15',
    status: 'active',
    progress: 65,
    metadata: {
      roomId: 'OR1',
      surgeon: 'Dr. Johnson',
      procedure: 'Appendectomy',
      isEmergency: true,
    },
    tooltip: '65% complete - Est. 11:10',
  },
  {
    id: '3',
    label: 'Surgery: Mike Johnson',
    description: 'Cardiac - Bypass Procedure',
    startTime: '11:30',
    endTime: '14:00',
    status: 'pending',
    progress: 0,
    metadata: {
      roomId: 'OR1',
      surgeon: 'Dr. Chen',
      procedure: 'Coronary Bypass',
    },
    tooltip: 'Scheduled to start at 11:30',
  },
  {
    id: '4',
    label: 'Cleaning',
    description: 'Post-operation cleaning',
    startTime: '14:00',
    endTime: '14:25',
    status: 'pending',
    metadata: {
      roomId: 'OR1',
      type: 'maintenance',
    },
  },
  {
    id: '5',
    label: 'Surgery: Sarah Williams',
    description: 'General Surgery',
    startTime: '09:00',
    endTime: '10:30',
    status: 'completed',
    progress: 100,
    metadata: {
      roomId: 'OR2',
      surgeon: 'Dr. Brown',
    },
    tooltip: 'Completed successfully',
  },
  {
    id: '6',
    label: 'Surgery: Tom Miller',
    description: 'ENT - Tonsillectomy',
    startTime: '11:00',
    endTime: '12:00',
    status: 'active',
    progress: 30,
    metadata: {
      roomId: 'OR2',
      surgeon: 'Dr. Davis',
      procedure: 'Tonsillectomy',
    },
    tooltip: '30% complete',
  },
  {
    id: '7',
    label: 'Error: System Alert',
    description: 'Equipment malfunction detected',
    startTime: '07:30',
    endTime: '08:00',
    status: 'error',
    metadata: {
      roomId: 'OR3',
      severity: 'high',
    },
  },
  {
    id: '8',
    label: 'Warning: Delay Expected',
    description: 'Anesthesia team running behind schedule',
    startTime: '10:00',
    endTime: '10:30',
    status: 'warning',
    metadata: {
      roomId: 'OR3',
      severity: 'medium',
    },
  },
];

// ========== EXAMPLE CONFIGURATIONS ==========

// Modern Apple-style (default)
const CONFIG_APPLE_MODERN: Partial<TimelineConfig> = {
  colorScheme: 'dark',
  colors: {
    background: '#0F172A',
    surface: 'rgba(255,255,255,0.03)',
    surfaceSecondary: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: 'rgba(255,255,255,0.95)',
    textSecondary: 'rgba(255,255,255,0.65)',
    accent: '#06B6D4',
  },
  statusColors: {
    idle: '#64748B',
    active: '#06B6D4',
    pending: '#F59E0B',
    completed: '#10B981',
    error: '#EF4444',
    warning: '#F97316',
  },
  animationDuration: 400,
  showAnimations: true,
  rowHeight: 56,
};

// High-contrast for medical environments
const CONFIG_HIGH_CONTRAST: Partial<TimelineConfig> = {
  colorScheme: 'dark',
  colors: {
    background: '#000000',
    surface: 'rgba(255,255,255,0.08)',
    surfaceSecondary: 'rgba(255,255,255,0.12)',
    border: 'rgba(255,255,255,0.15)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.75)',
    accent: '#00FF00',
  },
  statusColors: {
    idle: '#666666',
    active: '#00FF00',
    pending: '#FFFF00',
    completed: '#00FF00',
    error: '#FF0000',
    warning: '#FF6600',
  },
  rowHeight: 64,
};

// Light theme
const CONFIG_LIGHT: Partial<TimelineConfig> = {
  colorScheme: 'light',
  colors: {
    background: '#FFFFFF',
    surface: 'rgba(0,0,0,0.03)',
    surfaceSecondary: 'rgba(0,0,0,0.06)',
    border: 'rgba(0,0,0,0.08)',
    text: 'rgba(0,0,0,0.95)',
    textSecondary: 'rgba(0,0,0,0.65)',
    accent: '#0891B2',
  },
  statusColors: {
    idle: '#9CA3AF',
    active: '#0891B2',
    pending: '#D97706',
    completed: '#059669',
    error: '#DC2626',
    warning: '#EA580C',
  },
};

// Compact mode (for mobile/tablets)
const CONFIG_COMPACT: Partial<TimelineConfig> = {
  compactMode: true,
  rowHeight: 40,
  fontSize: {
    label: '12px',
    time: '10px',
    metadata: '9px',
  },
  timeStep: 120, // Show time markers every 2 hours
};

// ========== DEMO COMPONENT ==========
export default function TimelineDemoPage() {
  const [currentConfig, setCurrentConfig] = useState<'modern' | 'contrast' | 'light' | 'compact'>(
    'modern'
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [items, setItems] = useState(EXAMPLE_ITEMS);
  const [selectedItem, setSelectedItem] = useState<TimelineItemData | null>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getConfig = (): Partial<TimelineConfig> => {
    switch (currentConfig) {
      case 'contrast':
        return CONFIG_HIGH_CONTRAST;
      case 'light':
        return CONFIG_LIGHT;
      case 'compact':
        return CONFIG_COMPACT;
      case 'modern':
      default:
        return CONFIG_APPLE_MODERN;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Timeline Module - Apple HIG Compliant
          </h1>
          <p className="text-slate-400">
            Parameter-driven, responsive timeline for operating room scheduling
          </p>
        </div>

        {/* Configuration Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['modern', 'contrast', 'light', 'compact'].map((theme) => (
            <button
              key={theme}
              onClick={() =>
                setCurrentConfig(
                  theme as 'modern' | 'contrast' | 'light' | 'compact'
                )
              }
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentConfig === theme
                  ? 'bg-cyan-500 text-white scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {theme === 'modern' && 'Modern'}
              {theme === 'contrast' && 'High Contrast'}
              {theme === 'light' && 'Light Mode'}
              {theme === 'compact' && 'Compact'}
            </button>
          ))}
        </div>

        {/* Timeline Component */}
        <div>
          <TimelineModuleHIG
            items={items}
            config={getConfig()}
            currentTime={currentTime}
            onItemClick={(item) => setSelectedItem(item)}
          />
        </div>

        {/* Info Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Parameters Guide */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Configuration Parameters</h2>
            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  colorScheme
                </code>
                {': '}
                <span className="text-slate-400">
                  'system' | 'light' | 'dark'
                </span>
              </div>
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  statusColors
                </code>
                {': '}
                <span className="text-slate-400">
                  Override colors for idle, active, pending, completed, error, warning
                </span>
              </div>
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  rowHeight
                </code>
                {': '}
                <span className="text-slate-400">
                  Number in pixels (default: 56)
                </span>
              </div>
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  timeStep
                </code>
                {': '}
                <span className="text-slate-400">
                  Minutes between time markers (15, 30, 60, 120)
                </span>
              </div>
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  animationDuration
                </code>
                {': '}
                <span className="text-slate-400">
                  Duration in milliseconds
                </span>
              </div>
              <div>
                <code className="bg-slate-900 px-2 py-1 rounded text-cyan-400">
                  startHour / endHour
                </code>
                {': '}
                <span className="text-slate-400">
                  Timeline range (e.g. 7 to 31 for 24h starting at 7 AM)
                </span>
              </div>
            </div>
          </div>

          {/* Selected Item Details */}
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Item Details</h2>
            {selectedItem ? (
              <div className="space-y-3 text-sm text-slate-300">
                <div>
                  <span className="font-semibold text-white">ID:</span>{' '}
                  {selectedItem.id}
                </div>
                <div>
                  <span className="font-semibold text-white">Label:</span>{' '}
                  {selectedItem.label}
                </div>
                <div>
                  <span className="font-semibold text-white">Status:</span>{' '}
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: selectedItem.color || '#06B6D4',
                      opacity: 0.2,
                    }}
                  >
                    {selectedItem.status}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-white">Time:</span>{' '}
                  {selectedItem.startTime} - {selectedItem.endTime}
                </div>
                {selectedItem.progress !== undefined && (
                  <div>
                    <span className="font-semibold text-white">Progress:</span>{' '}
                    {selectedItem.progress}%
                  </div>
                )}
                {selectedItem.description && (
                  <div>
                    <span className="font-semibold text-white">Description:</span>{' '}
                    {selectedItem.description}
                  </div>
                )}
                {selectedItem.metadata && Object.keys(selectedItem.metadata).length > 0 && (
                  <div>
                    <span className="font-semibold text-white">Metadata:</span>
                    <pre className="bg-slate-900 p-2 rounded text-xs mt-1 overflow-auto">
                      {JSON.stringify(selectedItem.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">Click on a timeline item to view details</p>
            )}
          </div>
        </div>

        {/* Code Examples */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Usage Example</h2>
          <pre className="bg-slate-900 p-4 rounded text-xs text-slate-300 overflow-auto">
{`import TimelineModuleHIG from '@/components/TimelineModuleHIG';

export default function MyPage() {
  const items = [
    {
      id: '1',
      label: 'Surgery: John Doe',
      startTime: '08:00',
      endTime: '09:30',
      status: 'completed',
      progress: 100,
      metadata: { roomId: 'OR1' },
    },
    // ... more items
  ];

  const config = {
    colorScheme: 'dark',
    rowHeight: 56,
    animationDuration: 400,
    statusColors: {
      active: '#06B6D4',
      completed: '#10B981',
      pending: '#F59E0B',
      error: '#EF4444',
    },
  };

  return (
    <TimelineModuleHIG
      items={items}
      config={config}
      currentTime={new Date()}
      onItemClick={(item) => console.log(item)}
    />
  );
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
