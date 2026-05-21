# Timeline Grid View Redesign - ACB Design System

## Overview

Transformace timeline modulu z horizontálního layoutu (24h časová osa) na moderní **grid/kanban kartičkový layout** inspirovaný ACB Fleet Management aplikací.

## Architecture

### New Components

**TimelineGridView.tsx** (194 řádků)
- Independentní komponent pro zobrazení operací v grid layoutu
- Primárně pro desktop view (>= md breakpoint)
- Flattens všechny operace z všech místností pro unified display

### Modified Components

**TimelineModule.tsx** (1951 → 1125 řádků; -42% kód)
- Removed: Horizontální timeline rendering (782 řádků)
- Added: Import TimelineGridView
- Now: Renderuje TimelineGridView místo starého room-based timeline

## Design System

### Operation Type Colors (Left Border)

```typescript
const OPERATION_TYPE_COLORS = {
  Functional: '#3B82F6',      // Modrá
  Safety: '#F97316',          // Oranžová
  Training: '#8B5CF6',        // Fialová
  Physical: '#EF4444',        // Červená
  Technical: '#06B6D4',       // Cyan
  Operational: '#10B981',     // Zelená
  Closedescence: '#EC4899',   // Růžová
};
```

### Card Layout

```
┌─────────────────────────────────────────┐
│ ┃ Functional | Room: OR-01              │
│ ┃            | 🔒 (if locked)            │
│ ┃                                         │
│ ┃ Operation Title (line-clamp 2)        │
│ ┃                                         │
│ ┃ ⏱  09:15 - 12:30                      │
│ ┃ FS-2867329 | • (status dot)           │
│ ┃                                         │
│ ┃ [D] [N]  (personnel avatars)          │
└─────────────────────────────────────────┘
```

### Responsive Grid

- **1 column**: Mobile (< md)
- **2 columns**: Tablet (md)
- **3 columns**: Desktop (lg)
- **4 columns**: Wide desktop (xl)

## Features

### Animations

- **Entry**: Staggered opacity + Y translate (delay: idx * 0.05)
- **Hover**: Scale -2px (whileHover: y: -2), shadow elevation
- **Status**: Subtle color pulse on emergency flag

### Data Display

- **Flattened Structure**: Alle operace z všech rooms v jedné collection
- **Type Categorization**: Barvy podle operationType
- **Status Indicator**: Colored dot (Active: zelená, Pending: žlutá, atd.)
- **Personnel Avatars**: D (doctor) / N (nurse) badges

### Accessibility

- Emergency flag icon (AlertTriangle) with tooltip
- Locked room indicator (CheckCircle)
- Time information with Clock icon
- Responsive font sizes and spacing

## Performance

### Optimization Strategies

- **Memoization**: useMemo pro flatten operations
- **Code Splitting**: TimelineGridView je separátní importable modul
- **Lazy Rendering**: Framer Motion AnimatePresence na kartičky

### Bundle Impact

- **Removed**: 782 řádků starého rendering kódu
- **Added**: 194 řádků nového grid komponentu
- **Net**: -588 řádků (42% redukce)

## Data Structure

```typescript
interface GridOperation {
  id: string;              // unique key
  roomId: string;          // room identifier
  roomName: string;        // "OR-01", atd.
  scheduleId: string;      // schedule ID (for display)
  stepId: string;          // step identifier
  stepIndex: number;       // position in workflow
  title: string;           // operation name
  startTime: string;       // "09:15"
  endTime: string;         // "12:30"
  status: string;          // "active", "pending", "completed"
  operationType: string;   // "Functional", "Safety", atd.
  personnel: {
    doctor?: { name: string };
    nurse?: { name: string };
  };
  emergencyFlag: boolean;
  locked: boolean;
}
```

## Migration Notes

### Removed Features (from old timeline)

- ❌ Continuous horizontal timeline (07:00 - 07:00 next day)
- ❌ Time-position based bar visualization
- ❌ Sticky room label column with overflow-x scrolling
- ❌ Current time indicator line

### Maintained Features

- ✓ Levý sidebar menu (untouched)
- ✓ Room filtering & selection
- ✓ Emergency flag tracking
- ✓ Personnel assignment display
- ✓ Mobile view (separate MobileTimelineView)
- ✓ Real-time updates via context

### New Capabilities

- ✨ Compact card-based dense display
- ✨ Faster scanning across all operations
- ✨ Better space utilization on wide screens
- ✨ Kanban-style visual organization
- ✨ Responsive grid that adapts to viewport

## Styling

### Tailwind Classes

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`
- Card: `rounded-lg bg-slate-800/50 border border-slate-700`
- Hover: `hover:border-slate-600 hover:shadow-lg`
- Border Left: `border-l-4` (color: operationType)

### Color Scheme

- **Background**: `#0F172A` (slate-900 with opacity)
- **Border**: `#334155` (slate-700)
- **Text**: `#E2E8F0` (slate-100)
- **Accent**: Based on operation type

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid support required
- Framer Motion animations supported

## Future Enhancements

1. **Filtering**: Filter by operation type / status / room
2. **Sorting**: Sort by time / type / personnel
3. **Grouping**: Group by room / type / personnel
4. **Search**: Quick search by operation ID / title
5. **Comparison View**: Side-by-side operation details
6. **Drag & Drop**: Reorder operations (if applicable)
7. **Detail Modal**: Click card for full operation details

## Testing Checklist

- [ ] Grid renders correctly at all breakpoints
- [ ] Animations smooth on lower-end devices
- [ ] All operations from all rooms displayed
- [ ] Personnel avatars show correctly
- [ ] Emergency flags visible and styled
- [ ] Status indicators accurate
- [ ] Mobile view still works (MobileTimelineView)
- [ ] No console errors in browser DevTools
