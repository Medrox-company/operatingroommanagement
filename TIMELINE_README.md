# 📅 TimelineModuleHIG - Apple HIG-Compliant Operating Room Timeline

## ✨ Overview

`TimelineModuleHIG` je moderní, plně parametrizovatelný timeline komponent pro plánování a správu operací v operačních sálech, vytvořený dle **Apple Human Interface Guidelines** s podporou více designových témat a responsivního layoutu.

**Klíčové vlastnosti:**
- 🎨 **Hybrid Design System** - Kombinace minimalisty a moderního skla s glow efekty
- 🔧 **Plně Parametrizovatelný** - Všechny aspekty konfigurovatelné bez úpravy kódu
- 📱 **Responsivní** - Automatické přizpůsobení pro mobil, tablet, desktop
- 🎬 **Smooth Animations** - Framer Motion integrace pro elegantní přechody
- 🌈 **Multi-Theme** - Apple Modern, High Contrast, Light Mode, Compact
- ⚡ **Real-time Updates** - Live progress tracking a status updates
- ♿ **Accessible** - ARIA labels, semantic HTML, keyboard support
- 💾 **Type-Safe** - Complete TypeScript support s IntelliSense

## 📦 Balíček Souborů

```
├── components/
│   ├── TimelineModuleHIG.tsx          # Hlavní komponent (634 řádků)
│   └── timeline-types.ts              # Type definitions & helpers (372 řádků)
├── app/
│   └── timeline-demo/
│       └── page.tsx                   # Live demo s příklady (459 řádků)
├── docs/
│   └── TIMELINE_MODULE_HIG.md         # Úplná dokumentace (443 řádků)
└── TIMELINE_QUICK_REFERENCE.md        # Quick reference (249 řádků)
```

## 🚀 Quick Start

### 1. Import
```tsx
import TimelineModuleHIG from '@/components/TimelineModuleHIG';
import type { TimelineItemData } from '@/components/timeline-types';
```

### 2. Data
```tsx
const items: TimelineItemData[] = [
  {
    id: '1',
    label: 'Surgery: Patient A',
    description: 'Orthopedic - Right Knee',
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
  // ... více položek
];
```

### 3. Render
```tsx
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

## 🎨 Designové Motivy

### 1. **Apple Modern** (Default)
Moderní, transparentní design s глас efekty a subtilními animacemi.
```tsx
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.APPLE_MODERN} />
```

### 2. **High Contrast** (Medicínský Standard)
Vysoký kontrast pro medicínská prostředí s výrazným rozlišením stavů.
```tsx
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.HIGH_CONTRAST} />
```

### 3. **Light Mode**
Světlý režim pro denní používání a tisknuté materiály.
```tsx
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.LIGHT} />
```

### 4. **Compact Mode** (Mobile)
Optimalizované pro mobilní zařízení s zmenšenými prvky.
```tsx
<TimelineModuleHIG items={items} config={CONFIG_PRESETS.COMPACT} />
```

## ⚙️ Konfigurace

Všechny parametry jsou **volitelné**. Zde jsou nejčastěji používané:

```tsx
const config = {
  // Designu
  colorScheme: 'dark' as const,
  colors: {
    background: '#0F172A',
    accent: '#06B6D4',
  },
  
  // Timeline
  startHour: 7,                      // Začátek (07:00)
  endHour: 31,                       // Konec (07:00 příštího dne)
  timeStep: 60,                      // Značka každých 60 minut
  rowHeight: 56,                     // Výška řádku
  
  // Chování
  hourFormat: '24h',
  showCurrentTime: true,             // Zobrazit "now" indikátor
  showTimeLabels: true,              // Zobrazit časy
  
  // Animace
  animationDuration: 300,            // v ms
  showAnimations: true,
};

<TimelineModuleHIG items={items} config={config} />
```

## 📚 Stav Položky (Status)

```
idle       → Šedá (#64748B)         Nevyužívá se
active     → Cyan (#06B6D4)         Právě probíhá
pending    → Amber (#F59E0B)        Čeká na start
completed  → Zelená (#10B981)       Hotovo
error      → Červená (#EF4444)      Chyba/Problém
warning    → Oranžová (#F97316)     Varování
```

## 🔧 Helper Funkce

```tsx
import {
  formatTime,
  getTimePercent,
  calculateDuration,
  calculateRemainingTime,
  validateTimelineItem,
} from '@/components/timeline-types';

// Formátuj čas
formatTime(14.5, '24h')  // "14:30"
formatTime(14.5, '12h')  // "2:30 PM"

// Pozice na timeline (%)
getTimePercent('09:30', 7, 31)  // 10.42%

// Trvání operace (minuty)
calculateDuration('08:00', '09:30')  // 90

// Zbývající čas do konce (minuty)
calculateRemainingTime('14:00', new Date())

// Validuj data
validateTimelineItem(item)  // true | false
```

## 🎯 Příklady Použití

### Real-time Progress Updates
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setItems(prev => prev.map(item => ({
      ...item,
      progress: calculateProgress(item.startTime, item.endTime),
    })));
  }, 10000);
  return () => clearInterval(interval);
}, []);
```

### Custom Event Handler
```tsx
<TimelineModuleHIG
  items={items}
  onItemClick={(item) => {
    if (item.status === 'error') {
      showErrorNotification(item);
    } else {
      router.push(`/rooms/${item.metadata?.roomId}`);
    }
  }}
/>
```

### Filtrování & Vyhledávání
```tsx
const filteredItems = items.filter(item => 
  item.metadata?.roomId === selectedRoom &&
  item.status !== 'completed'
);

<TimelineModuleHIG items={filteredItems} />
```

## 📱 Responsive Design

Komponenta se automaticky přizpůsobuje:

| Zařízení | Chování |
|----------|---------|
| **Mobile** (<480px) | Kompaktní režim, vertikální seznam, skryté detaily |
| **Tablet** (481-768px) | Vyvážený layout, střední rowHeight |
| **Desktop** (>768px) | Plný layout, maximální detaily |

## 🎬 Apple HIG Principy

### Clarity (Jasnost)
- Jasná vizuální hierarchie
- Srozumitelné barvy pro stavy
- Čitelná typografie

### Deference (Podřízenost)
- Interface slouží datům
- Minimální zbytečná výzdoba
- Přirozené interakce

### Depth (Hloubka)
- Subtilní vrstvení s transparentností
- Glass morphism efekty
- Smysluplné animace

## 📚 Další Materiály

- 📖 **[Úplná Dokumentace](docs/TIMELINE_MODULE_HIG.md)** - Detailní reference
- ⚡ **[Quick Reference](TIMELINE_QUICK_REFERENCE.md)** - Rychlá pomůcka
- 🎮 **[Live Demo](/timeline-demo)** - Interaktivní příklady

## 🛠️ Technologický Stack

```json
{
  "react": "^18.3.1",
  "framer-motion": "^12.38.0",
  "lucide-react": "^1.14.0",
  "typescript": "^5.8.2",
  "tailwindcss": "^3.4.1"
}
```

## 🧪 Testování

```bash
# Build
npm run build

# Dev server
npm run dev

# Navštiv http://localhost:3000/timeline-demo
```

## 📊 Struktura Dat

```tsx
interface TimelineItemData {
  id: string;                      // Jedinečné ID
  label: string;                   // Název (viditelný)
  startTime: string;               // HH:mm (povinné)
  endTime: string;                 // HH:mm (povinné)
  status: TimelineStatus;          // idle|active|pending|completed|error|warning
  description?: string;            // Podrobný popis (hover)
  progress?: number;               // 0-100 pro progress bar
  metadata?: Record<string, any>;  // Vlastní data
  color?: string;                  // Přepsání výchozí barvy
  tooltip?: string;                // Text na hover
  onClick?: () => void;            // Vlastní handler
}
```

## ✅ Checklist pro Integraci

- [ ] Importuji `TimelineModuleHIG` a types
- [ ] Připravím data s vyžadovanými poli
- [ ] Nastavím konfiguraci (nebo použiju výchozí)
- [ ] Připojím `onItemClick` handler (pokud třeba)
- [ ] Testuji na mobilu/tabletu/desktopu
- [ ] Ověřuji dostupnost (ARIA labels, keyboard)

## 🚀 Deployment

Komponenta je production-ready:
- ✅ TypeScript type-safe
- ✅ Performance optimized (useMemo, React.memo)
- ✅ Accessibility compliant
- ✅ Cross-browser tested
- ✅ Mobile-optimized

## 📝 Licence

Část projektu Operating Room Management Medrox Company.

---

**Vytvořeno:** 5. května 2026  
**Status:** ✅ Production Ready  
**Verze:** 1.0.0
