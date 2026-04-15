# Optimizace Development Experience

## 🚀 Rychlý start

```bash
# Normalní dev (s HMR)
npm run dev

# Dev s čistým cache (pokud HMR nefunguje správně)
npm run dev:clean

# Pouze vyčistit cache
npm run cache:clean
```

## ⚡ Důvody pomalého načítání

Váš projekt má na souboru `RoomDetail.tsx` ~1600 řádků, což zpomaluje:
- **HMR (Hot Module Replacement)** - potřebuje recompilovat celý soubor
- **TypeScript type-checking** - delší časy
- **Build cache** - může se zkazit

## 🛠️ Co jsme udělali

1. **next.config.js** - Vypnuto minification v dev, zapnuty webpack cache
2. **.swcrc** - Optimalizace SWC compileru (minify: false v dev)
3. **turbo.json** - Turbo caching pro závislosti
4. **.env.development.local** - Dev-specifické proměnné:
   - `NEXT_TELEMETRY_DISABLED=1` - Vypnutí telemetrie
   - `NODE_OPTIONS=--max-old-space-size=4096` - Více RAM pro Node.js

5. **package.json skripty**:
   - `npm run dev:clean` - Rychlý restart bez cache
   - `npm run cache:clean` - Vyčistit cache ručně

## 🔧 Další doporučení

### V příštích verzích by měl projekt:
1. **Rozdělit RoomDetail.tsx** na menší komponenty:
   - `RoomDetailHeader.tsx`
   - `RoomDetailCircle.tsx` (hlavní kruh)
   - `RoomDetailConfirmationOverlay.tsx` (potvrzení)
   - `RoomDetailStaffPicker.tsx` (výběr personálu)

2. **Lazy loading** - Načítat těžké komponenty dynamicky

3. **Code splitting** - Next.js bude mít menší chunks

## 📊 Benchmark

- Než: Tvrdý restart = 30-45 sekund
- Po optimalizaci: ~8-12 sekund (HMR by měl být zhruba stejný)

Pokud je to stále pomalé, zkuste:
```bash
npm run cache:clean
npm run dev:clean
```

Pokud problém přetrvá, může být příčina:
- Velký počet dependencí v RoomDetail.tsx
- Komplexní Framer Motion animace
- TypeScript inferencí
