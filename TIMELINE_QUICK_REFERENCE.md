# Timeline Module - Quick Reference Card

## 🚀 Quick Start

```tsx
import TimelineModuleHIG from '@/components/TimelineModuleHIG';
import type { TimelineItemData } from '@/components/timeline-types';

const items: TimelineItemData[] = [
  {
    id: '1',
    label: 'Operation',
    startTime: '08:00',
    endTime: '09:30',
    status: 'active',
    progress: 45,
    metadata: { roomId: 'OR1', surgeon: 'Dr. Smith' },
  },
];

export default function Page() {
  return (
    <TimelineModuleHIG
      items={items}
      currentTime={new Date()}
      onItemClick={(item) => console.log(item)}
    />
  );
}
```

## 📋 Types Cheat Sheet

```tsx
// Status
type TimelineStatus = 'idle' | 'active' | 'pending' | 'completed' | 'error' | 'warning';

// Item
interface TimelineItemData {
  id: string;                                    // Required
  label: string;                                 // Required
  startTime: string;  // HH:mm                   // Required
  endTime: string;    // HH:mm                   // Required
  status: TimelineStatus;                        // Required
  description?: string;                          // Hover tooltip
  progress?: number;  // 0-100                   // Optional
  metadata?: Record<string, any>;                // Optional
  color?: string;     // Hex override            // Optional
  tooltip?: string;                              // Optional
  onClick?: () => void;                          // Optional
}

// Config
interface TimelineConfig {
  colorScheme: 'system' | 'light' | 'dark';     // Default: 'dark'
  colors?: { ... };                              // Custom colors
  statusColors?: Record<TimelineStatus, string>;
  fontFamily?: string;
  fontSize?: { label?, time?, metadata? };
  startHour?: number;        // Default: 7
  endHour?: number;          // Default: 31
  timeStep?: number;         // Default: 60 (minutes)
  rowHeight?: number;        // Default: 56 (px)
  compactMode?: boolean;     // Default: false
  animationDuration?: number; // Default: 300 (ms)
  showCurrentTime?: boolean; // Default: true
  showTimeLabels?: boolean;  // Default: true
  hourFormat?: '12h' | '24h'; // Default: '24h'
}
```

## 🎨 Pre-built Configs

```tsx
import { CONFIG_PRESETS } from '@/components/timeline-types';

// Apple Modern (default)
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.APPLE_MODERN} />

// High Contrast (medical)
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.HIGH_CONTRAST} />

// Light Theme
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.LIGHT} />

// Compact (mobile)
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.COMPACT} />
```

## 🛠️ Helper Functions

```tsx
import {
  formatTime,
  getTimePercent,
  calculateDuration,
  calculateRemainingTime,
  validateTimelineItem,
} from '@/components/timeline-types';

// Format time
formatTime(14.5, '24h') // "14:30"
formatTime(14.5, '12h') // "2:30 PM"

// Get position on timeline
getTimePercent('09:30', 7, 31) // 10.42% (position on timeline)

// Calculate duration
calculateDuration('08:00', '09:30') // 90 (minutes)

// Calculate remaining
calculateRemainingTime('14:00', new Date()) // Minutes until 14:00

// Validate item
validateTimelineItem(item) // true | false
```

## 🎯 Common Patterns

### Minimal Setup
```tsx
<TimelineModuleHIG items={items} />
```

### With Color Customization
```tsx
<TimelineModuleHIG
  items={items}
  config={{
    statusColors: {
      active: '#FF0000',
      completed: '#00FF00',
    },
  }}
/>
```

### Mobile-Optimized
```tsx
<TimelineModuleHIG
  items={items}
  config={{
    compactMode: true,
    rowHeight: 40,
    timeStep: 120,
  }}
/>
```

### Real-time Updates
```tsx
const [items, setItems] = useState<TimelineItemData[]>([...]);

useEffect(() => {
  const interval = setInterval(() => {
    setItems(prev => prev.map(item => ({
      ...item,
      progress: calculateProgress(item),
    })));
  }, 10000);
  return () => clearInterval(interval);
}, []);

return <TimelineModuleHIG items={items} />;
```

### Custom Event Handler
```tsx
<TimelineModuleHIG
  items={items}
  onItemClick={(item) => {
    if (item.status === 'error') {
      showErrorDialog(item);
    } else {
      navigateToRoom(item.metadata?.roomId);
    }
  }}
/>
```

## 🎬 Status Colors Reference

```
├─ idle       → Gray (#64748B)   — Nevyužito
├─ active     → Cyan (#06B6D4)   — Probíhá
├─ pending    → Amber (#F59E0B)  — Čeka
├─ completed  → Green (#10B981)  — Hotovo
├─ error      → Red (#EF4444)    — Chyba
└─ warning    → Orange (#F97316) — Varování
```

## 📱 Responsive Behavior

```
Mobile (<480px)
├─ Compact mode activated
├─ Row height: 40px
├─ Hidden descriptions
├─ Vertical scroll
└─ Tooltips on tap

Tablet (481-768px)
├─ Medium row height: 48px
├─ Partial descriptions
├─ Horizontal scroll
└─ Hover tooltips

Desktop (>768px)
├─ Full row height: 56px+
├─ All content visible
├─ Horizontal scroll
└─ Full interactions
```

## 🐛 Debug Tips

```tsx
// Log item details
config={{ 
  colors: { accent: '#FF00FF' } // Makes everything visible
}}

// Check time values
console.log(getTimePercent('09:30', 7, 31)) // Should be 0-100

// Validate data
items.forEach(item => {
  if (!validateTimelineItem(item)) {
    console.error('Invalid item:', item);
  }
});
```

## 📚 Full Documentation

See `docs/TIMELINE_MODULE_HIG.md` for complete reference.

## 🔗 Files

- `/components/TimelineModuleHIG.tsx` — Main component
- `/components/timeline-types.ts` — Type definitions & helpers
- `/app/timeline-demo/page.tsx` — Live demo page
- `/docs/TIMELINE_MODULE_HIG.md` — Full documentation

---

**Quick Links:**  
📖 [Full Docs](../docs/TIMELINE_MODULE_HIG.md) | 🎮 [Demo Page](/timeline-demo) | 💻 [Types](timeline-types.ts)
