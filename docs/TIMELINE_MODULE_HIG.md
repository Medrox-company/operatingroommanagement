# Timeline Module - Apple HIG Compliant

Tento dokument popisuje nový `TimelineModuleHIG` komponent postavený podle **Apple Human Interface Guidelines** s plnou parametrizací.

## 📋 Obsah

1. [Přehled](#přehled)
2. [Instalace & Import](#instalace--import)
3. [Základní Použití](#základní-použití)
4. [API Reference](#api-reference)
5. [Parametry Konfigurace](#parametry-konfigurace)
6. [Příklady](#příklady)
7. [Design Principy (Apple HIG)](#design-principy-apple-hig)

## 🎯 Přehled

`TimelineModuleHIG` je flexibilní, parametrizovatelný timeline komponent pro plánování operací. Umožňuje:

- ✅ **Responsivní design** - Automatické přizpůsobení mobilu/tabletu/desktopu
- ✅ **Pokročilé parametry** - Změna barev, animací, rozvržení bez psaní kódu
- ✅ **Apple HIG compliance** - Clarity, Deference, Depth
- ✅ **Hybrid design systém** - Kombinace minimalisty a moderního skla
- ✅ **Status management** - idle, active, pending, completed, error, warning
- ✅ **Progress tracking** - Dynamický progress bar
- ✅ **Real-time updates** - Aktualizace v reálném čase
- ✅ **Accessibility** - ARIA labels, keyboard support

## 🚀 Instalace & Import

```tsx
import TimelineModuleHIG, {
  TimelineItemData,
  TimelineConfig,
  TimelineStatus,
} from '@/components/TimelineModuleHIG';
```

## 💡 Základní Použití

```tsx
export default function Page() {
  const items: TimelineItemData[] = [
    {
      id: '1',
      label: 'Operation: Patient A',
      startTime: '08:00',
      endTime: '09:30',
      status: 'completed',
      progress: 100,
      metadata: { roomId: 'OR1' },
    },
  ];

  return (
    <TimelineModuleHIG
      items={items}
      currentTime={new Date()}
      onItemClick={(item) => console.log(item)}
    />
  );
}
```

## 📚 API Reference

### TimelineModuleHIG Props

```tsx
interface TimelineModuleProps {
  items: TimelineItemData[];                    // Pole položek na timeline
  config?: Partial<TimelineConfig>;             // Konfigurace (všechny parametry volitelné)
  onItemClick?: (item: TimelineItemData) => void;
  currentTime?: Date;                           // Aktuální čas (default: now)
  loading?: boolean;                            // Stav načítání
  error?: string | null;                        // Chybová zpráva
}
```

### TimelineItemData

```tsx
interface TimelineItemData {
  id: string;                           // Jedinečný identifikátor
  label: string;                        // Název položky
  description?: string;                 // Popis (viditelný na hover)
  startTime: string;                    // Čas startu (HH:mm)
  endTime: string;                      // Čas konce (HH:mm)
  status: TimelineStatus;               // 'idle' | 'active' | 'pending' | 'completed' | 'error' | 'warning'
  progress?: number;                    // 0-100 pro progress bar
  metadata?: Record<string, any>;       // Volné údaje (roomId, surgeon, atd.)
  color?: string;                       // Přepsání výchozí barvy statusu
  isInteractive?: boolean;              // Výchozí: true
  onClick?: () => void;                 // Callback na klik
  tooltip?: string;                     // Text tooltipuupon hover
}
```

### TimelineStatus

```tsx
type TimelineStatus = 'idle' | 'active' | 'pending' | 'completed' | 'error' | 'warning';
```

## ⚙️ Parametry Konfigurace

```tsx
interface TimelineConfig {
  // ========== DESIGN ==========
  colorScheme: 'system' | 'light' | 'dark';     // Výchozí: 'dark'
  colors?: {
    background?: string;                        // Pozadí kontejneru
    surface?: string;                           // Primární povrch
    surfaceSecondary?: string;                  // Sekundární povrch
    border?: string;                            // Hranice
    text?: string;                              // Primární text
    textSecondary?: string;                     // Sekundární text
    accent?: string;                            // Akcentní barva (current time, highlights)
  };
  statusColors?: Record<TimelineStatus, string>; // Barvy pro každý status
  
  // ========== TYPOGRAFIE ==========
  fontFamily?: string;                          // Výchozí: system font stack
  fontSize?: {
    label?: string;                             // Default: '14px'
    time?: string;                              // Default: '12px'
    metadata?: string;                          // Default: '11px'
  };
  
  // ========== LAYOUT ==========
  startHour?: number;                           // Počáteční hodina (default: 7)
  endHour?: number;                             // Konečná hodina (default: 31 = 7:00 příštího dne)
  timeStep?: number;                            // Minuty mezi markery (15, 30, 60, 120)
  rowHeight?: number;                           // Výška řádku v px (default: 56)
  compactMode?: boolean;                        // Kompaktní režim pro mobile (default: false)
  
  // ========== ANIMACE ==========
  animationDuration?: number;                   // ms (default: 300)
  showAnimations?: boolean;                     // Default: true
  
  // ========== CHOVÁNÍ ==========
  showCurrentTime?: boolean;                    // Indikátor aktuálního času (default: true)
  showTimeLabels?: boolean;                     // Popisky času (default: true)
  hourFormat?: '12h' | '24h';                   // Formát času (default: '24h')
  timezone?: string;                            // Timezone pro časy (default: local)
}
```

## 💾 Výchozí Konfigurace

```tsx
const DEFAULT_CONFIG: TimelineConfig = {
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
    idle: '#64748B',        // Slate
    active: '#06B6D4',      // Cyan
    pending: '#F59E0B',     // Amber
    completed: '#10B981',   // Emerald
    error: '#EF4444',       // Red
    warning: '#F97316',     // Orange
  },
  startHour: 7,
  endHour: 31,
  timeStep: 60,
  rowHeight: 56,
  animationDuration: 300,
  showAnimations: true,
  showCurrentTime: true,
  showTimeLabels: true,
  hourFormat: '24h',
};
```

## 📖 Příklady

### 1️⃣ Příklad: Modern Apple Dark Theme

```tsx
<TimelineModuleHIG
  items={items}
  config={{
    colorScheme: 'dark',
    colors: {
      background: '#0F172A',
      accent: '#06B6D4',
      text: 'rgba(255,255,255,0.95)',
    },
    statusColors: {
      active: '#06B6D4',
      completed: '#10B981',
      error: '#EF4444',
    },
    animationDuration: 400,
    rowHeight: 56,
  }}
  currentTime={new Date()}
/>
```

### 2️⃣ Příklad: Vysoký Kontrast (Medical Environment)

```tsx
<TimelineModuleHIG
  items={items}
  config={{
    colorScheme: 'dark',
    colors: {
      background: '#000000',
      surface: 'rgba(255,255,255,0.12)',
      text: '#FFFFFF',
      accent: '#00FF00',
    },
    statusColors: {
      active: '#00FF00',
      error: '#FF0000',
      warning: '#FFFF00',
    },
    rowHeight: 64,
  }}
/>
```

### 3️⃣ Příklad: Light Theme

```tsx
<TimelineModuleHIG
  items={items}
  config={{
    colorScheme: 'light',
    colors: {
      background: '#FFFFFF',
      surface: 'rgba(0,0,0,0.03)',
      text: 'rgba(0,0,0,0.95)',
      accent: '#0891B2',
    },
  }}
/>
```

### 4️⃣ Příklad: Kompaktní Režim (Mobile)

```tsx
<TimelineModuleHIG
  items={items}
  config={{
    compactMode: true,
    rowHeight: 40,
    fontSize: {
      label: '12px',
      time: '10px',
      metadata: '9px',
    },
    timeStep: 120,  // Každé 2 hodiny
  }}
/>
```

### 5️⃣ Příklad: Vlastní Barvy & Metadata

```tsx
const customItems: TimelineItemData[] = [
  {
    id: 'op1',
    label: 'Plastika obličeje',
    description: 'Rekonstrukční operace',
    startTime: '08:00',
    endTime: '11:30',
    status: 'active',
    progress: 45,
    color: '#A78BFA', // Vlastní fialová
    metadata: {
      roomId: 'OR1',
      surgeon: 'Dr. Novotná',
      procedure: 'Face Lift',
      patientId: 'P12345',
      isEmergency: false,
    },
    tooltip: 'Probíhá - zbývá ~2h',
    onClick: () => console.log('Clicked!'),
  },
];

<TimelineModuleHIG items={customItems} onItemClick={(item) => handleClick(item)} />
```

## 🎨 Design Principy (Apple HIG)

Komponenta se řídí třemi klíčovými principy Apple Human Interface Guidelines:

### 1. **Clarity** (Jasnost)

- Jasná vizuální hierarchie
- Srozumitelné stavy a přechody
- Čitelné typografie bez zbytečné výzdoby
- Intuitivní informační struktura

```tsx
// Implementace:
- Výrazné stavové barvy
- Jasné časové značky
- Hierarchické písmo (label, description, metadata)
```

### 2. **Deference** (Podřízenost)

- Uživatele klienti na prvním místě
- Interfaces slouží obsahu (nejsou ústředním bodem)
- Minimální rozptylování
- Fokus na data a operace

```tsx
// Implementace:
- Glass morphism efekty (subtle, ne dominantní)
- Prostor kolem obsahu
- Přirozené interakce (hover, click)
```

### 3. **Depth** (Hloubka)

- Subtilní vrstvení (layering)
- Smysluplné animace
- Vizuální hierarchie pomocí transparentnosti
- Glow efekty pro emphasis

```tsx
// Implementace:
- Framer Motion animace
- Translucent backgrounds (Glass UI)
- Box shadows pro elevation
- Color glows na active items
```

## 🎯 Responsivní Design

Komponenta automaticky adaptuje layout podle velikosti obrazovky:

```tsx
// Desktop (>768px)
- Horizontální scrollovatelná timeline
- Plné descriptions a metadata
- Standardní rowHeight

// Tablet (481-767px)
- Vrstvené zobrazení s kompresí
- Zkrácené labels
- Zvýšený rowHeight pro přístupnost

// Mobile (<480px)
- Vertikální seznam s progress barem
- Skrytá metadata (tooltip na tap)
- Kompaktní režim (rowHeight = 40px)
```

## 🔧 Pokročilé Tipy

### Dynamické Barvy

```tsx
const config = {
  statusColors: {
    active: items.some(i => i.isEmergency) ? '#FF0000' : '#06B6D4',
  },
};
```

### Scheduling Algoritmus

```tsx
const calculateProgress = (startTime: string, endTime: string, now: Date) => {
  // Vlastní logika
  return (elapsed / total) * 100;
};

const items = items.map(item => ({
  ...item,
  progress: calculateProgress(item.startTime, item.endTime, new Date()),
}));
```

### Real-time Updates

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        progress: calculateProgress(item.startTime, item.endTime, new Date()),
      }))
    );
  }, 10000); // Každých 10s
  return () => clearInterval(interval);
}, []);
```

## 📱 Integrace do Aplikace

Viz `app/timeline-demo/page.tsx` pro kompletný příklad implementace.

## ✨ Features

| Feature | Popis |
|---------|-------|
| 🎨 **Theme Support** | Dark, Light, High Contrast |
| 📱 **Responsive** | Auto-adaptace na mobile/tablet/desktop |
| ⚡ **Performance** | Optimizované re-renders s useMemo |
| 🎬 **Animations** | Smooth transitions s Framer Motion |
| ♿ **Accessibility** | ARIA labels, semantic HTML |
| 🔧 **Parameters** | Plně konfigurabilní všechny aspekty |
| 📊 **Real-time** | Live progress tracking |
| 💾 **Metadata** | Volné údaje na každou položku |

## 🐛 Troubleshooting

### Timeline není vidět
- Zkontroluj, zda má items
- Ověř startTime/endTime formát (HH:mm)
- Zkontroluj z-index a overflow settings

### Barvy se nezobrazují správně
- Ověř hexadecimální formáty v config.colors
- Zkontroluj specifičnost CSS selektorů
- Vyčisti Tailwind cache

### Animace nejsou hladké
- Snížit animationDuration (méně je víc)
- Zkontrolovat performanci (DevTools)
- Zvyšit rowHeight pro lepší renderování

---

**Vytvořeno:** 2026  
**Poslední aktualizace:** 5. května 2026  
**Status:** Production Ready ✅
