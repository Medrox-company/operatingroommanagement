'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import {
  TimelineStatus,
  TimelineItemData,
  TimelineConfig,
  TimelineModuleProps,
  DEFAULT_CONFIG as DEFAULT_CONFIG_TYPES,
} from './timeline-types';

/* ============================================================================
   APPLE HIG-COMPLIANT TIMELINE MODULE
   
   Parametrizovatelný timeline systém dle Apple Human Interface Guidelines:
   - Clarity: Jasná vizuální hierarchie a informační struktura
   - Deference: Interfaces slouží obsahu, ne naopak
   - Depth: Subtilní vrstvení a přechody pro pocit hloubky
   
   GLOBÁLNÍ PARAMETRY:
   - config: barvy, fonty, rozestup, animační trvání
   - layout: responsive chování, orientace
   
   ITEM PARAMETRY:
   - startTime, endTime: časové rozsahy (HH:mm)
   - status: stav operace (idle, active, pending, completed, error)
   - progress: procent pokroku (0-100)
   - label, description: textové informace
   - metadata: doplňující údaje (chirurg, typ operace, atd.)
============================================================================ */

// Re-export types for convenience
export type { TimelineStatus, TimelineItemData, TimelineConfig, TimelineModuleProps };
export { DEFAULT_CONFIG as DEFAULT_CONFIG_TYPES };

// ========== DEFAULT CONFIGURATION ==========
const DEFAULT_CONFIG: TimelineConfig = {
  ...DEFAULT_CONFIG_TYPES,
};

// ========== HELPER FUNCTIONS ==========
const mergeConfig = (base: TimelineConfig, override?: Partial<TimelineConfig>): TimelineConfig => {
  return {
    ...base,
    ...override,
    colors: { ...base.colors, ...(override?.colors || {}) },
    statusColors: { ...base.statusColors, ...(override?.statusColors || {}) },
    fontSize: { ...base.fontSize, ...(override?.fontSize || {}) },
  };
};

const parseTime = (timeString: string): { hours: number; minutes: number } => {
  const [h, m] = timeString.split(':').map(Number);
  return { hours: h || 0, minutes: m || 0 };
};

const getTimePercent = (timeString: string, startHour: number, endHour: number): number => {
  const { hours, minutes } = parseTime(timeString);
  const totalHours = endHour - startHour;
  const timeInHours = hours + minutes / 60;
  const relativeHours = timeInHours - startHour;
  return (relativeHours / totalHours) * 100;
};

const formatTime = (hours: number, format: '12h' | '24h'): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (format === '12h') {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }
  
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getStatusIcon = (status: TimelineStatus) => {
  switch (status) {
    case 'active':
      return <Zap className="w-4 h-4" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    default:
      return null;
  }
};

// ========== TIME AXIS COMPONENT ==========
interface TimeAxisProps {
  config: TimelineConfig;
  currentTime: Date;
}

const TimeAxis: React.FC<TimeAxisProps> = ({ config, currentTime }) => {
  const timeMarkers = useMemo(() => {
    const markers = [];
    const start = config.startHour || 7;
    const end = config.endHour || 31;
    const step = (config.timeStep || 60) / 60;
    
    for (let h = start; h <= end; h += step) {
      markers.push(h);
    }
    return markers;
  }, [config.startHour, config.endHour, config.timeStep]);

  const currentPercent = useMemo(() => {
    const now = new Date(currentTime);
    return getTimePercent(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      config.startHour || 7,
      config.endHour || 31
    );
  }, [currentTime, config.startHour, config.endHour]);

  return (
    <div
      className="relative h-12 border-b flex items-end overflow-hidden"
      style={{
        borderColor: config.colors?.border,
        backgroundColor: config.colors?.surfaceSecondary,
      }}
    >
      {/* Time markers */}
      {timeMarkers.map((hour, idx) => (
        <motion.div
          key={idx}
          className="absolute h-full flex flex-col items-center justify-end pb-1"
          style={{
            left: `${((hour - (config.startHour || 7)) / ((config.endHour || 31) - (config.startHour || 7))) * 100}%`,
            width: '1px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: idx * 0.02 }}
        >
          {config.showTimeLabels && (
            <span
              className="text-xs font-medium px-1 whitespace-nowrap"
              style={{ color: config.colors?.textSecondary, fontSize: config.fontSize?.time }}
            >
              {formatTime(hour, config.hourFormat || '24h')}
            </span>
          )}
          <div
            className="w-px h-2"
            style={{ backgroundColor: config.colors?.border }}
          />
        </motion.div>
      ))}

      {/* Current time indicator */}
      {config.showCurrentTime && (
        <motion.div
          className="absolute top-0 bottom-0 w-1 rounded-full pointer-events-none"
          style={{
            left: `${currentPercent}%`,
            backgroundColor: config.colors?.accent,
            boxShadow: `0 0 12px ${config.colors?.accent}`,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
};

// ========== TIMELINE ITEM COMPONENT ==========
interface TimelineItemProps {
  item: TimelineItemData;
  config: TimelineConfig;
  startPercent: number;
  endPercent: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  config,
  startPercent,
  endPercent,
  isHovered,
  onHover,
  onClick,
}) => {
  const statusColor = item.color || config.statusColors?.[item.status] || '#64748B';
  const width = Math.max(2, endPercent - startPercent);

  return (
    <motion.div
      className="absolute h-10 rounded-lg cursor-pointer group overflow-hidden"
      style={{
        left: `${startPercent}%`,
        width: `${width}%`,
        backgroundColor: statusColor,
        opacity: 0.85,
        backdropFilter: 'blur(10px)',
      }}
      onHoverStart={() => onHover(true)}
      onHoverEnd={() => onHover(false)}
      onClick={onClick}
      whileHover={{ 
        scale: 1.05,
        opacity: 1,
        boxShadow: `0 8px 24px ${statusColor}40`,
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 0.85, y: 0 }}
      transition={{ duration: config.animationDuration || 300, type: 'spring' }}
    >
      {/* Progress bar if available */}
      {item.progress !== undefined && (
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            width: `${item.progress}%`,
            backgroundColor: statusColor,
            opacity: 0.4,
            transition: 'width 0.3s ease-out',
          }}
        />
      )}

      {/* Content */}
      <div className="relative h-full px-3 py-2 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getStatusIcon(item.status) && (
            <span className="text-white flex-shrink-0">
              {getStatusIcon(item.status)}
            </span>
          )}
          <div className="min-w-0">
            <p
              className="text-white font-medium truncate"
              style={{ fontSize: config.fontSize?.label }}
            >
              {item.label}
            </p>
            {item.description && isHovered && (
              <p
                className="text-white/60 text-xs truncate"
                style={{ fontSize: config.fontSize?.metadata }}
              >
                {item.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && item.tooltip && (
          <motion.div
            className="absolute bottom-full left-1/2 mb-2 px-3 py-2 rounded-lg text-xs text-white whitespace-nowrap z-50 pointer-events-none"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              transform: 'translateX(-50%)',
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 150 }}
          >
            {item.tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ========== TIMELINE ROW COMPONENT ==========
interface TimelineRowProps {
  items: TimelineItemData[];
  config: TimelineConfig;
  onItemClick: (item: TimelineItemData) => void;
  rowLabel?: string;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  items,
  config,
  onItemClick,
  rowLabel,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const startHour = config.startHour || 7;
  const endHour = config.endHour || 31;
  const totalHours = endHour - startHour;

  const itemsWithPositions = useMemo(() => {
    return items.map((item) => {
      const startPercent = getTimePercent(item.startTime, startHour, endHour);
      const endPercent = getTimePercent(item.endTime, startHour, endHour);
      return { item, startPercent, endPercent };
    });
  }, [items, startHour, endHour]);

  return (
    <div
      className="relative flex items-center gap-4 py-2 px-4 rounded-lg border transition-all duration-200"
      style={{
        backgroundColor: config.colors?.surface,
        borderColor: hoveredItemId ? config.colors?.accent : config.colors?.border,
        height: `${config.rowHeight || 56}px`,
        fontFamily: config.fontFamily,
      }}
    >
      {/* Row label */}
      {rowLabel && (
        <div
          className="flex-shrink-0 w-32"
          style={{
            color: config.colors?.text,
            fontSize: config.fontSize?.label,
            fontWeight: '500',
          }}
        >
          {rowLabel}
        </div>
      )}

      {/* Timeline container */}
      <div className="flex-1 relative h-10 bg-gradient-to-r rounded-lg overflow-hidden"
        style={{
          backgroundColor: config.colors?.surfaceSecondary,
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent calc(${(1 / totalHours) * 100}% - 1px),
            ${config.colors?.border} calc(${(1 / totalHours) * 100}% - 1px),
            ${config.colors?.border} ${(1 / totalHours) * 100}%
          )`,
        }}
      >
        {itemsWithPositions.map(({ item, startPercent, endPercent }) => (
          <TimelineItem
            key={item.id}
            item={item}
            config={config}
            startPercent={startPercent}
            endPercent={endPercent}
            isHovered={hoveredItemId === item.id}
            onHover={(hovered) =>
              setHoveredItemId(hovered ? item.id : null)
            }
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
};

// ========== MAIN TIMELINE MODULE COMPONENT ==========
const TimelineModuleHIG: React.FC<TimelineModuleProps> = ({
  items,
  config: configOverride,
  onItemClick,
  currentTime = new Date(),
  loading = false,
  error = null,
}) => {
  const config = useMemo(
    () => mergeConfig(DEFAULT_CONFIG, configOverride),
    [configOverride]
  );

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group items by room/category if needed
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItemData[]> = {};
    items.forEach((item) => {
      const key = item.metadata?.roomId || 'default';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  // Responsive: mobile vs desktop
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(() => {
    const handleResize = () => {
      // Could trigger layout changes here
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <motion.div
      className="w-full rounded-2xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: config.colors?.background,
        color: config.colors?.text,
        fontFamily: config.fontFamily,
        minHeight: '400px',
        height: 'auto',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: config.animationDuration }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
          borderColor: config.colors?.border,
          backgroundColor: config.colors?.surfaceSecondary,
        }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: config.colors?.text }}>
            Operating Room Schedule
          </h2>
          <p className="text-sm mt-1" style={{ color: config.colors?.textSecondary }}>
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <Clock className="w-5 h-5" style={{ color: config.colors?.accent }} />
      </div>

      {/* Time axis */}
      <TimeAxis config={config} currentTime={currentTime} />

      {/* Content */}
      <div
        className="overflow-auto flex-1"
        ref={scrollContainerRef}
        style={{
          minHeight: '300px',
        }}
      >
        {error && (
          <motion.div
            className="m-4 p-4 rounded-lg flex items-center gap-3 border"
            style={{
              backgroundColor: config.statusColors?.error,
              borderColor: config.statusColors?.error,
              opacity: 0.15,
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {loading ? (
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.colors?.accent }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        ) : items.length === 0 ? (
          <div
            className="text-center py-12"
            style={{ color: config.colors?.textSecondary }}
          >
            <p className="text-sm">No events scheduled</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {Object.entries(groupedItems).map(([roomKey, roomItems]) => (
              <TimelineRow
                key={roomKey}
                items={roomItems}
                config={config}
                onItemClick={(item) => {
                  onItemClick?.(item);
                }}
                rowLabel={roomKey !== 'default' ? `Room ${roomKey}` : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {items.length > 0 && (
        <motion.div
          className="px-6 py-3 border-t flex items-center justify-between text-sm"
          style={{
            borderColor: config.colors?.border,
            backgroundColor: config.colors?.surfaceSecondary,
            color: config.colors?.textSecondary,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span>
            {items.length} event{items.length !== 1 ? 's' : ''} scheduled
          </span>
          <span>
            {items.filter((i) => i.status === 'active').length} active
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TimelineModuleHIG;
