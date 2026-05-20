# Operating Room Management - Kompletní Řešení

Moderní systém pro správu operačních sálů s web a mobilní verzí.

## Projekty

### Web Aplikace (`/`)
Next.js 16 aplikace s:
- Dashboard s live sály
- Timeline modul
- Přehled personálu
- Statistiky a grafy
- Admin management

**Spuštění:**
```bash
npm install
npm run dev
# http://localhost:3000
```

### Mobilní Aplikace (`/operatingroom-mobile`)
iOS/Android Expo aplikace se všemi funkcionalitami web verze.

**Spuštění:**
```bash
cd operatingroom-mobile
npm install
npm start
```

Poté v Expo Go aplikaci naskenujte QR kód.

## Stack

- **Frontend Web:** Next.js 16, React, TypeScript, Tailwind CSS
- **Frontend Mobile:** React Native, Expo, Expo Router, NativeWind
- **Backend:** Supabase (PostgreSQL)
- **Real-time:** Supabase Realtime subscriptions
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS (web), NativeWind (mobile)

## Funkcionalita

### Web Verze
- Dashboard s grid operačních sálů
- Live statistiky a metriky
- Timeline historie operací
- Přehled personálu s filtrováním
- Admin panel pro konfiguraci
- Dark mode design

### Mobilní Verze
- Přihlášení přes Supabase
- Dashboard s live daty
- Interaktivní sály s detail viewem
- Timeline se 24-hodinovým streamem
- Personál s filtrováním podle role
- Statistiky s grafy
- Realtime updates
- Tab navigace

## Začínáme

### Požadavky
- Node.js 18+
- npm/yarn/pnpm
- Expo CLI (pro mobilní app): `npm install -g expo-cli`
- Supabase projekt (sdílený mezi web a mobilem)

### Instalace Web

```bash
# Install dependencies
npm install

# Create .env.local s Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Run development server
npm run dev
```

### Instalace Mobile

```bash
cd operatingroom-mobile
npm install

# Create .env.local s Supabase credentials
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Start Expo development
npm start

# Na fyzickém zařízení: Naskenujte QR kód v Expo Go
# Na emulátoru/simulátoru: Stiskněte 'a' (Android) nebo 'i' (iOS)
```

## Build & Deploy

### Web - Vercel
```bash
npm run build
vercel deploy
```

### Mobilní - EAS Build (Expo)

#### iOS Build
```bash
eas build --platform ios --auto-submit
```

#### Android Build
```bash
eas build --platform android --auto-submit
```

Vyžaduje:
- Apple Developer Account ($99/rok, iOS)
- Google Play Developer Account ($25, Android)
- Expo Account (zdarma, s limitací)

## Databáze

Supabase schéma zahrnuje:
- `operating_rooms` - Operační sály
- `staff` - Personál (lékaři, sestry, anesteziolgy)
- `room_status_history` - Historie stavu sálů
- `users` - Uživatelské účty

## Autentizace

Obě verze (web i mobile) používají Supabase Auth.

**Demo přihlášení:**
- Email: `admin@example.com`
- Heslo: `password`

Hesla byste měli změnit v produkci!

## Realtime Updates

Aplikace používá Supabase Realtime subscriptions:
- Dashboard se automaticky aktualizuje
- Timeline se doplňuje novými eventy
- Personál se načítá live
- Všechny změny v databázi jsou vidět okamžitě

## Trouble Shooting

### Mobile: "Ekspo Go not found"
- Stáhněte Expo Go z App Store (iOS) nebo Play Store (Android)
- Ujistěte se, že jste na stejné síti jako dev server

### Mobile: "SUPABASE credentials missing"
- Zkontrolujte `.env.local` v `/operatingroom-mobile`
- Ujistěte se, že máte `EXPO_PUBLIC_` prefix

### Web: "Build error"
- Vymažte `.next/` folder a zkuste znovu
- `npm run dev`

## Struktura Projektu

```
operatingroom-management/
├── app/                          # Web Next.js aplikace
│   ├── components/              # React komponenty
│   ├── (auth)/                  # Autentizace
│   ├── (app)/                   # Hlavní aplikace
│   ├── api/                     # API routy
│   └── layout.tsx
├── operatingroom-mobile/        # iOS/Android Expo app
│   ├── app/
│   │   ├── (auth)/             # Login screen
│   │   ├── (app)/              # Tab navigace
│   │   │   ├── dashboard.tsx
│   │   │   ├── timeline.tsx
│   │   │   ├── staff.tsx
│   │   │   ├── statistics.tsx
│   │   │   ├── settings.tsx
│   │   │   └── room/[id].tsx   # Detail sálu
│   │   └── _layout.tsx
│   ├── components/             # Reusable komponenty
│   ├── contexts/               # React contexts
│   ├── app.json                # Expo konfigurace
│   └── package.json
├── lib/                         # Utilities
├── public/                      # Static assets
└── README.md
```

## Příspěvky

Pokyn pro přispěvatele:
1. Vytvořte feature branch: `git checkout -b feature/nova-funkcionalita`
2. Commitujtě s popisnými zprávami
3. Pushujte a vytvořte Pull Request

## Licence

Interní projekt - Medrox Company

## Kontakt

Otázky či problémy? Obraťte se na tým.
