import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Při contentInset 'automatic' iOS odsadí celé webové zobrazení od výřezu a
// spodní lišty; nahoře i dole pak zůstanou pruhy v barvě pozadí obalu.
test('iOS aplikace zobrazuje obsah přes celou obrazovku jako web', () => {
  assert.match(read('capacitor.config.ts'), /ios:\s*\{[\s\S]*?contentInset:\s*'never'/);
  assert.match(read('mobile/index.html'), /viewport-fit=cover/);
});

test('po spuštění se ukáže rovnou aplikace, bez úvodního obrázku s logem', () => {
  const config = read('capacitor.config.ts');
  assert.match(config, /SplashScreen:\s*\{[\s\S]*?launchShowDuration:\s*0,/);
  const launch = read('ios/App/App/Base.lproj/LaunchScreen.storyboard');
  assert.doesNotMatch(launch, /<imageView|image="Splash"/, 'iOS úvodní obrazovka je jen plocha v barvě pozadí');
  assert.match(launch, /<color key="backgroundColor" red="0\.02745\d*" green="0\.09411\d*" blue="0\.24705\d*"/, 'barva #07183F jako pozadí obalu');
  assert.match(config, /ios:\s*\{[\s\S]*?backgroundColor:\s*'#07183F'/);
});

test('mobilní obrazovky odsazují obsah od výřezu i spodní lišty samy', () => {
  const shell = read('components/mobile/MobileShell.tsx');
  assert.match(shell, /env\(safe-area-inset-top/);
  assert.match(shell, /env\(safe-area-inset-bottom/);
  assert.match(read('components/mobile/mobile-orbit-navigation.css'), /env\(safe-area-inset-bottom/);
  assert.match(read('components/mobile/mobile-room-orbit.css'), /env\(safe-area-inset-top/);
  assert.match(read('components/mobile/mobile-login-wheel.css'), /env\(safe-area-inset-top/);
});

test('iPhone zůstává na výšku, iPad se dál otáčí', () => {
  const plist = read('ios/App/App/Info.plist');
  const orientations = key => {
    const block = plist.match(new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`));
    assert.ok(block, key);
    return [...block[1].matchAll(/<string>([^<]+)<\/string>/g)].map(match => match[1]);
  };
  assert.deepEqual(orientations('UISupportedInterfaceOrientations'), ['UIInterfaceOrientationPortrait']);
  // iPad potřebuje všechny orientace kvůli multitaskingu; časová osa je navržená na šířku.
  assert.deepEqual(orientations('UISupportedInterfaceOrientations~ipad'), [
    'UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight',
  ]);
});
