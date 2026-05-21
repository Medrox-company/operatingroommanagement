# Timeline Design Enhancement Documentation

## Overview
Kompletní redesign timeline modulu na profesionální healthcare standard inspirovaný Medrox Operating Theatres aplikací.

## Design Philosophy
- **Professional Healthcare Aesthetic**: Tmavá modrá (#0F172A) s zdravotnickou cyan (#06B6D4)
- **Clear Visual Hierarchy**: Snadno čitelné operační kartičky s jasnou hierarchií informací
- **Smooth Animations**: Framer Motion animace pro lepší UX (pulsování, hover efekty, transitions)
- **Accessible Colors**: Zdravotnické standardní barvy (červená pro kritické, zelená pro ok, žlutá pro varování)

## Changes Summary

### 1. Design Tokens (část 1)
**File**: `components/TimelineModule.tsx`

Nová profesionální paleta barev:
- Primary: Cyan (#06B6D4) - zdravotnická modrá
- Success: Green (#10B981) - aktivní operace
- Warning: Amber (#F59E0B) - příprava/čistění
- Alert: Orange (#F97316) - varování
- Critical: Red (#EF4444) - zpoždění/kritické
- Planning: Purple (#8B5CF6) - plánování
- Special: Pink (#EC4899) - speciální procedury
- Info: Blue (#3B82F6) - informace

Podloží:
- Dark background: #0F172A (deep navy)
- Subtle surfaces s healthcare-optimized opacitami
- Profesionální border a glass effecty

### 2. Header & Stats (část 1)
- Upgrading gradient background na tmavší, profesionálnější look
- Stat boxes s novými barvami (zelená/oranžová/cyan/žlutá)
- Subtle ambient glow efekt (cyan)
- Better spacing a typografie

### 3. Timeline Visualizations (část 2)
**Klíčové vylepšení vizuálů**:

#### Current Time Indicator
- Zdravotnická červená (#EF4444) místo neon žluté
- Animovaný glow efekt s Framer Motion (opacity pulsace)
- Lepší viditelnost a presnost

#### Time Header
- Profesionální time markers s subtle grid
- Current hour: Cyan box s pulsující animací (scale 1-1.05)
- Night hours (19:00-7:00): Subtilnější visual (text-white/25)
- Day hours: Jasnější visual (text-white/55)
- Gradient separators mezi hodinami

### 4. Sidebar Room Labels (část 3)
**Animations & Styling**:

#### Room Label Container
- Motion wrapper s whileHover efektem
- Gradient background: Cyan (#06B6D4) místo neon
- Professional border styling
- Subtle transition na hover

#### ARO Overtime Badge
- Zdravotnické žluté barvy (#F59E0B)
- Pulsující animace (scale 1-1.05, duration 2s)
- Font: semibold tracking pro čitelnost

#### Patient Called Badge
- Modrý styl (#3B82F6)
- Pulsující opacita animace
- Phone icon pro vizuální identifikaci

#### Patient Arrived Badge
- Zelený styl (#10B981)
- Pulsující animace
- Checkmark icon pro potvrzení

## Technical Implementation

### Framer Motion Animations
```typescript
// Current hour marker - pulsace
animate={{ scale: [1, 1.05, 1] }}
transition={{ duration: 2, repeat: Infinity }}

// ARO badge - pulsace
animate={{ scale: [1, 1.05, 1] }}
transition={{ duration: 2, repeat: Infinity }}

// Room label hover
whileHover={{ background: `linear-gradient(...)` }}

// Current time indicator - opacity
animate={{ opacity: [0.8, 1, 0.8] }}
transition={{ duration: 1.5, repeat: Infinity }}
```

### Color System
- Design tokens v `C` objektu pro globální konzistenci
- Room colors s improved contrast a glows
- Step colors mapované na healthcare statusy
- Subtle surface opacities pro depth

## Responsive Design
- Mobile view: Zachovany beze změn (via MobileTimelineView)
- Desktop: Plný horizontální timeline s vylepšeným designem
- Touch-friendly badges a interactive elementy

## Performance Optimizations
- Optimalizované Framer Motion animace (repeat: Infinity)
- Subtle blur/glow efekty pro visual appeal bez performance hit
- Efficient CSS gradients

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Tailwind CSS 3.0+
- Framer Motion v10+
- Lucide React icons

## Future Enhancements
1. Theme customization system
2. Dark/light mode toggle
3. Additional animation presets
4. Accessibility improvements (ARIA labels)
5. Performance metrics tracking
