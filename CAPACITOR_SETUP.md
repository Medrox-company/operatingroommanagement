# Capacitor iOS Setup - Operating Room Management

## Status
Capacitor byla nainstalována a iOS projekt byl inicializován.

## Co bylo uděláno
1. ✅ Nainstalován Capacitor CLI, Core a iOS platform
   - `pnpm add -D @capacitor/core @capacitor/cli @capacitor/ios`

2. ✅ Inicializován Capacitor projekt
   - `pnpm exec cap init "Operating Room" com.operatingroom.app`

3. ✅ Přidána iOS platforma
   - `pnpm exec cap add ios`
   - iOS projekt je nyní v `/ios` adresáři

4. ✅ Nakonfigurován `capacitor.config.ts`
   - App ID: `com.operatingroom.app`
   - App Name: `Operating Room Management`
   - Web Directory: `out`

## Jak pokračovat

### Kroky pro build iOS aplikace

1. **Build Next.js aplikace (server-side rendering)**
   ```bash
   pnpm build
   pnpm start
   ```

2. **Pokud chcete, aby iOS aplikace fungovala bez internetu (offline mode)**
   - Budete muset exportovat frontend jako static HTML
   - To vyžaduje oddělení API od frontend assets

3. **Synchronizace s iOS projektem**
   ```bash
   pnpm exec cap sync ios
   ```

4. **Otevření v Xcode**
   ```bash
   pnpm exec cap open ios
   ```

5. **Build a spuštění v Xcode**
   - V Xcode vyberte target `OperatingRoom`
   - Zvolte iPhone simulator nebo device
   - Klikněte na Play button pro build a run

## Poznámky

- Aplikace komunikuje s backend serverem (Next.js API)
- Pro plně offline aplikaci bude potřeba separátní konfiguraci
- iOS projekt se nachází v `/ios` adresáři
- Při změnách web assets musíte znovu spustit `pnpm build` a `pnpm exec cap sync ios`

## Příští kroky

1. Nainstalujte Xcode: https://developer.apple.com/xcode/
2. Přihlaste se Apple Developer účtem
3. Nastavte signing certificates v Xcode
4. Vyzkoušejte build a deploy na iPhone
