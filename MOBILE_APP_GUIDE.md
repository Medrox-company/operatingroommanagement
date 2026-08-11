# Mobilní aplikace — iOS a Android

Nativní aplikace staví na **Capacitoru 8** a sdílí **stejný React kód** jako web.
Není to samostatný projekt: `App.tsx` a všechny komponenty jsou společné, jen se
místo Next.js serveru balí do statické SPA, která se nainstaluje do telefonu.

> Pozn.: `app.json`, `eas.json` a prázdná složka `operatingroom-mobile/` jsou
> pozůstatky po dřívějším pokusu s Expem. Na build se nepoužívají a lze je
> smazat.

## Jak to funguje

| Vrstva | Soubor | Účel |
|---|---|---|
| Vstupní bod | `mobile/main.tsx` | Nabootuje `App.tsx`, nastaví tmavý motiv, StatusBar, klávesnici a tlačítko Zpět (Android) |
| HTML shell | `mobile/index.html` | `viewport-fit=cover` kvůli výřezu a safe-area |
| Build | `vite.mobile.config.ts` | Vite build → `mobile-dist/` (obchází Next.js server) |
| Náhrada Next.js | `mobile/next-dynamic.tsx` | Alias za `next/dynamic`, aby fungoval lazy-loading modulů |
| Síť | `mobile/native-api.ts` | Volání `/api/*` přesměruje na produkční backend a posílá cookies |
| Konfigurace | `capacitor.config.ts` | appId, pluginy, nastavení pro iOS i Android |

UI běží **lokálně v telefonu**, na server jdou jen API volání. Aplikace tedy
naskočí okamžitě i na slabé síti.

## Požadavky

- Node 26 (viz `.nvmrc`), `npm install`
- **iOS:** macOS, Xcode 16+, CocoaPods
- **Android:** Android Studio (Ladybug+), JDK 21, Android SDK 35

## iOS

```bash
npm run ios:sync     # build webu + cap sync ios
npm run ios:open     # otevře Xcode
npm run ios:build    # sync + otevření Xcode
npm run ios:verify   # zkompiluje pro simulátor bez podpisu (CI kontrola)
```

Podepisování a nahrání na TestFlight se řeší v Xcode (Signing & Capabilities →
tvůj Apple Developer tým).

## Android

Nativní projekt se vytvoří jednorázově:

```bash
npm install          # doinstaluje @capacitor/android
npm run android:add  # vygeneruje složku android/ (jen poprvé)
```

Běžná práce:

```bash
npm run android:sync    # build webu + cap sync android
npm run android:open    # otevře Android Studio
npm run android:build   # sync + otevření Android Studia
npm run android:verify  # ./gradlew assembleDebug (CI kontrola)
```

Podpis release buildu (`.aab` pro Google Play) se nastavuje v
`android/app/build.gradle` přes `signingConfigs` a keystore, který **nepatří do
gitu** (je v `.gitignore`).

## Po každé změně kódu

Nativní aplikace nese vlastní kopii webu. Po úpravách je nutné znovu zabalit:

```bash
npm run mobile:sync   # build + sync do iOS i Androidu naráz
```

Bez toho zůstane v telefonu stará verze rozhraní.

## Co je specifické pro nativní běh

- **Tmavý motiv** je výchozí; volba světlého se ukládá do `localStorage`
  (`or-mobile-theme`) a přežije restart.
- **Safe-area** — obsah respektuje výřez přes `env(safe-area-inset-*)`,
  na Androidu kreslí StatusBar přes WebView (`overlaysWebView`).
- **Tlačítko Zpět (Android)** — komponenty mohou odchytit událost
  `nativeBackButton` a zavolat `preventDefault()`, čímž zavřou detail místo
  odchodu z aplikace. Na kořeni aplikaci ukončí.
- **Návrat do popředí** — aplikace vyšle `nativeAppResumed`, na což lze navázat
  obnovení dat.
- **Detekce platformy** — na `<html>` přibude třída `capacitor-native` a
  `platform-ios` / `platform-android`.
