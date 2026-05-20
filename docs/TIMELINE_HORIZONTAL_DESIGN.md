# Timeline Modul - Horizontální Design (Medrox inspirace)

## Přehled

Nový horizontální timeline design pro zobrazení operačních sálů s chronologickým průběhem operací. Design je inspirován moderní Medrox aplikací a optimalizován pro healthcare management.

## Architektura

### Komponenty

- **TimelineModule.tsx** - Wrapper komponenta (21 řádků)
- **TimelineModuleHorizontal.tsx** - Hlavní implementace (269 řádků)
- **MobileTimelineView.tsx** - Zachován pro mobilní zařízení

### Struktura Layoutu

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (240px)        │ Time Header (25 markers: 07:00-07:00) │
│ - Room labels          │ - Current time indicator (vertical red line)
│ - Specializations      │ - Animated time markers
│ - Status indicators    │ - Blue gradient background
└─────────────────────────────────────────────────────────────┘
│ Sidebar (240px)        │ Timeline Content Area (scrollable)     │
│ - OR-01, OR-02, ...    │ - Barevné kartičky operací (NO TEXT)   │
│ - Status badges (LIVE) │ - LIVE indikátory (zelené pulsující)   │
│ - Room status (●●●)    │ - Status bar na levé straně (G/Y)      │
└─────────────────────────────────────────────────────────────┘
```

## Klíčové Vlastnosti

### 1. Horizontální Timeline
- **Rozměr**: 07:00 - 07:00 (24 hodin)
- **Time markery**: 25 hodinových značek
- **Scroll**: Horizontální scroll pro dlouhé operace
- **Auto-scroll**: Automatické scrollování na aktuální čas

### 2. Levý Sidebar
- **Šířka**: 240px (fixní)
- **Položky**: Operační sály s jejich statusem
- **Status indikátor**: Pulsující zelená tečka = aktivní, šedá = volný
- **LIVE badge**: Zeleného badge pro probíhající operace
- **Specializace**: Typ sálu (Kardiochirurgie, Neurochirurgie, atd.)

### 3. Operation Bary
- **Bez textu**: Klíčová změna - operační kartičky nemají texty
- **Barevné kódování**: 7 barev pro rozlišení sálů
- **LIVE indikátor**: Zelená pulsující tečka v pravém horním rohu
- **Status bar**: Levý border (zelená=active, žlutá=other)
- **Hover efekty**: Scale 1.08, glow shadow

### 4. Current Time Indicator
- **Vertikální červená linie**: Aktuální čas
- **Animace**: Pulsující opacity pro viditelnost
- **Auto-follow**: Sleduje scroll

## Barvy a Styling

### Design Tokeny
```javascript
const C = {
  accent: '#00D9FF',        // Vivid cyan
  green: '#00F5A0',         // Success/Active
  orange: '#FF9F43',        // Warning
  red: '#FF6B6B',           // Error
  yellow: '#FFE66D',        // Secondary
  purple: '#A78BFA',        // Accent
  
  border: 'rgba(255,255,255,0.08)',
  muted: 'rgba(255,255,255,0.45)',
  text: 'rgba(255,255,255,0.85)',
};
```

### Room Colors (7-color palette)
- Orange, Purple, Pink, Blue, Green, Red, Cyan
- Dynamicky přiřazeny podle pořadí sálu

## Funkcionality

### Zachované Funkcionality
✓ Real-time updates z databáze  
✓ Room filtering a selection  
✓ Status-based visualization  
✓ Mobile responsiveness  
✓ Auto-scroll na aktuální čas  
✓ Workflow status context integration  

### Nové Funkcionality
✓ Horizontální layout optimalizovaný pro vizualizaci  
✓ LIVE indikátory s animací  
✓ Pulsující status indikátory  
✓ Time marker highlighting  
✓ Smooth hover transitions  
✓ Auto-scroll s calc na scroll position  

## Performance

- **Render optimalizace**: useMemo pro statusByRoom a sortedRooms
- **Animation**: Framer Motion pro smooth transitions
- **Scroll**: Native HTML scroll pro perfor mance
- **Update intervaly**: 1s pro time updates

## Responsive Design

- **Desktop**: Plný horizontální timeline (hidden md:flex)
- **Mobile**: MobileTimelineView (md:hidden)
- **Breakpoints**: Tailwind md breakpoint (768px)

## Budoucí Vylepšení

1. **Tooltip s detaily**: Hover na kartičku ukáže operaci
2. **Drag-to-reschedule**: Přetáhnutí kartičky pro změnu času
3. **Search/Filter**: Vyhledávání sálů a operací
4. **Export**: Export timeline jako PDF/PNG
5. **Zoom**: Zoom in/out na timeline
6. **Keyboard shortcuts**: Arrow keys pro navigaci

## Technické Detaily

- **Framework**: React + Framer Motion
- **Styling**: Tailwind CSS + Inline styles
- **State**: React hooks (useState, useEffect, useMemo)
- **Context**: WorkflowStatusesContext pro data
- **Performance**: ~60fps animations, smooth scrolling
