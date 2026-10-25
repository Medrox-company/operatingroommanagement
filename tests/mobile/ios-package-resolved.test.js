import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Xcode Cloud spouští `npm ci` a `cap sync ios`. Ten zapíše do Package.swift
// přesnou verzi capacitor-swift-pm podle nainstalovaného @capacitor/ios.
// Automatické řešení závislostí je v Xcode Cloud vypnuté, takže jakýkoli
// rozdíl proti zamčenému Package.resolved archivaci iOS aplikace shodí.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const lockVersion = JSON.parse(read('package-lock.json')).packages['node_modules/@capacitor/ios']?.version;
const swiftVersion = read('ios/App/CapApp-SPM/Package.swift')
  .match(/capacitor-swift-pm\.git",\s*exact:\s*"([^"]+)"/)?.[1];
const resolvedVersion = JSON.parse(read('ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'))
  .pins.find(pin => pin.identity === 'capacitor-swift-pm')?.state?.version;
const howToFix = 'Po změně verze @capacitor/ios spusťte na Macu `npm run ios:sync`, v Xcode File → Packages → Resolve Package Versions a commitněte Package.swift i Package.resolved.';

test('Package.swift i Package.resolved odpovídají nainstalovanému @capacitor/ios', () => {
  assert.ok(lockVersion, 'package-lock.json neobsahuje @capacitor/ios');
  assert.equal(swiftVersion, lockVersion, `Package.swift: ${howToFix}`);
  assert.equal(resolvedVersion, lockVersion, `Package.resolved: ${howToFix}`);
});

test('@capacitor/ios má v package.json přesnou verzi, aby ji npm update neposunul', () => {
  const declared = JSON.parse(read('package.json')).devDependencies['@capacitor/ios'];
  assert.match(declared, /^\d+\.\d+\.\d+$/, howToFix);
  assert.equal(declared, lockVersion);
});
