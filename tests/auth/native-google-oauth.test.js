import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function loadNativeGoogleClient({ native = true, platform = 'ios', storage = new Map() } = {}) {
  const source = readFileSync(
    new URL('../../lib/auth/native-google-client.ts', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const dispatched = [];
  const browserCalls = [];
  const oauthCalls = [];
  const supabase = {
    auth: {
      signInWithOAuth: async options => {
        oauthCalls.push(options);
        return { data: { url: 'https://example.supabase.co/auth/v1/authorize' }, error: null };
      },
    },
  };

  globalThis.window = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    dispatchEvent: event => { dispatched.push(event); return true; },
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  };

  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === '@capacitor/core') {
      return { Capacitor: { isNativePlatform: () => native, getPlatform: () => platform } };
    }
    if (name === '@capacitor/browser') {
      return {
        Browser: {
          open: async options => { browserCalls.push(['open', options]); },
          close: async () => { browserCalls.push(['close']); },
        },
      };
    }
    if (name === './google-client') return { getGoogleAuthClient: () => supabase };
    throw new Error(`Unexpected import: ${name}`);
  }, exports);

  return { client: exports, storage, dispatched, browserCalls, oauthCalls };
}

test('native callback accepts only the exact application scheme, host and path', () => {
  const { client } = loadNativeGoogleClient();
  assert.equal(client.isNativeGoogleCallbackUrl('com.operatingroom.app://auth/callback?code=one'), true);
  assert.equal(client.isNativeGoogleCallbackUrl('com.operatingroom.app://auth/callback/?code=one'), true);
  assert.equal(client.isNativeGoogleCallbackUrl('https://auth/callback?code=one'), false);
  assert.equal(client.isNativeGoogleCallbackUrl('com.operatingroom.app://evil/callback?code=one'), false);
  assert.equal(client.isNativeGoogleCallbackUrl('com.operatingroom.app://auth/other?code=one'), false);
});

test('captured callback survives cold start and is consumed exactly once', () => {
  const { client, dispatched, browserCalls } = loadNativeGoogleClient();
  const callback = 'com.operatingroom.app://auth/callback?code=single-use';

  assert.equal(client.captureNativeGoogleCallback(callback), true);
  assert.equal(client.hasPendingNativeGoogleCallback(), true);
  assert.equal(dispatched[0].detail, callback);
  assert.deepEqual(browserCalls, [['close']]);
  assert.equal(client.consumePendingNativeGoogleCallback(), callback);
  assert.equal(client.consumePendingNativeGoogleCallback(), null);
  assert.equal(client.hasPendingNativeGoogleCallback(), false);
});

test('reload does not replay the last single-use OAuth callback', () => {
  const { client, storage, dispatched, browserCalls } = loadNativeGoogleClient();
  const first = 'com.operatingroom.app://auth/callback?code=first-code';
  const next = 'com.operatingroom.app://auth/callback?code=next-code';

  assert.equal(client.captureNativeGoogleCallback(first), true);
  assert.equal(client.consumePendingNativeGoogleCallback(), first);

  // AppPlugin.getLaunchUrl() returns the same URL again after the WebView
  // reloads, even though the previous authorization code was already used.
  const afterReload = loadNativeGoogleClient({ storage });
  assert.equal(afterReload.client.captureNativeGoogleCallback(first), true);
  assert.equal(afterReload.client.hasPendingNativeGoogleCallback(), false);
  assert.equal(dispatched.length, 1);
  assert.deepEqual(browserCalls, [['close']]);
  assert.equal(afterReload.dispatched.length, 0);
  assert.deepEqual(afterReload.browserCalls, []);

  // A new sign-in receives a different PKCE code and must still be accepted.
  assert.equal(afterReload.client.captureNativeGoogleCallback(next), true);
  assert.equal(afterReload.client.consumePendingNativeGoogleCallback(), next);
  assert.equal(afterReload.dispatched.length, 1);
});

test('cold-start callback restores the hospital selected before Google redirect', () => {
  const { client } = loadNativeGoogleClient();

  client.rememberNativeGoogleHospitalId(' hospital-one ');
  assert.equal(client.resolveNativeGoogleHospitalId(''), 'hospital-one');
  assert.equal(client.resolveNativeGoogleHospitalId('hospital-two'), 'hospital-two');
});

test('native Google login uses PKCE redirect data and opens the returned URL', async () => {
  const { client, oauthCalls, browserCalls } = loadNativeGoogleClient();
  await client.openNativeGoogleLogin();

  assert.deepEqual(oauthCalls, [{
    provider: 'google',
    options: {
      redirectTo: 'com.operatingroom.app://auth/callback',
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  }]);
  assert.deepEqual(browserCalls, [[
    'open',
    {
      url: 'https://example.supabase.co/auth/v1/authorize',
      presentationStyle: 'fullscreen',
      toolbarColor: '#07162B',
    },
  ]]);
});

test('non-iOS platforms retain their existing login flow', async () => {
  const { client } = loadNativeGoogleClient({ platform: 'android' });
  assert.equal(client.isNativeGoogleAuthPlatform(), false);
  await assert.rejects(client.openNativeGoogleLogin(), /pouze v iOS/);
});

test('login page branches to the native overlay before the existing web OAuth redirect', () => {
  const source = readFileSync(
    new URL('../../components/LoginPage.tsx', import.meta.url),
    'utf8',
  );
  const handler = source.slice(
    source.indexOf('const handleGoogleLogin'),
    source.indexOf('const handleGoogleLogin') + 2200,
  );

  assert.ok(handler.indexOf('isNativeGoogleAuthPlatform()') < handler.indexOf('setGoogleLoading(true)'));
  assert.match(handler, /setNativeGoogleOpen\(true\);\s+return;/);
  assert.match(handler, /redirectTo:\s*getGoogleRedirectUrl\(\)/);
  assert.match(source, /NATIVE_GOOGLE_CALLBACK_EVENT, resumeNativeGoogle/);
  assert.match(source, /<NativeGoogleAuthOverlay/);
});

test('login page uses an SSR-stable initial hospital and restores persistence after mount', () => {
  const source = readFileSync(
    new URL('../../components/LoginPage.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /const \[selectedHospitalId, setSelectedHospitalId\] = useState\(''\);/,
  );
  assert.doesNotMatch(
    source,
    /useState\(\(\)\s*=>\s*resolveNativeGoogleHospitalId/,
  );
  assert.match(source, /const stored = resolveNativeGoogleHospitalId\(''\);/);
  assert.match(source, /next\.some\(item => item\.id === stored\)/);
});

test('login page subscribes before checking for an iOS cold-start callback', () => {
  const source = readFileSync(
    new URL('../../components/LoginPage.tsx', import.meta.url),
    'utf8',
  );
  const effect = source.slice(
    source.indexOf('const resumeNativeGoogle'),
    source.indexOf('const resumeNativeGoogle') + 650,
  );

  assert.ok(
    effect.indexOf('window.addEventListener') < effect.indexOf('hasPendingNativeGoogleCallback()'),
  );
});

test('OAuth bridge cleanup does not sign the user out on other devices', () => {
  const source = readFileSync(
    new URL('../../lib/auth/google-client.ts', import.meta.url),
    'utf8',
  );
  assert.match(source, /instance\?\.auth\.signOut\(\{ scope: 'local' \}\)/);
});
