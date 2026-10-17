import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/LoginPage.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'LoginPage.tsx',
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;

const roles = [
  ['Administrátor', 'admin@nemocnice.cz'],
  ['ARO', 'aro@nemocnice.cz'],
  ['COS', 'cos@nemocnice.cz'],
  ['Management', 'management@nemocnice.cz'],
  ['Primariát', 'primar@nemocnice.cz'],
];
const hospitals = [
  { id: 'hospital-one', hospital_name: 'Testovací zařízení jedna', hospital_short_name: 'TEST 1' },
  { id: 'hospital-two', hospital_name: 'Testovací zařízení dvě', hospital_short_name: 'TEST 2' },
];

function children(node) { return React.Children.toArray(node?.props?.children); }
function findAll(node, predicate) {
  const found = [];
  function visit(value) {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value);
    children(value).forEach(visit);
  }
  visit(node);
  return found;
}
function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return children(node).map(text).join('');
}
function hasClass(node, name) { return node.props.className?.split(/\s+/).includes(name); }
function mobile(tree) { return findAll(tree, node => hasClass(node, 'mobile-login-page'))[0]; }
function desktop(tree) { return findAll(tree, node => hasClass(node, 'app-module-background') && node.props.className.includes('md:flex'))[0]; }
function input(tree, id) { return findAll(tree, node => node.type === 'input' && node.props.id === id)[0]; }
function roleButton(tree, label, variant = 'mobile') {
  const className = variant === 'mobile' ? 'mobile-login-role' : 'login-role-tile';
  return findAll(tree, node => node.type === 'button' && hasClass(node, className) && text(node).startsWith(label))[0];
}
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); };

// Render the actual component with deterministic state/effect and auth adapters.
// This checks its form wiring and callbacks, not browser layout or real sign-in.
// No production context, token, endpoint, credential or network is imported.
function makeHarness({ hospitalList = hospitals, googleEnabled = true, native = false, loginResult = { success: true } } = {}) {
  const states = [];
  const effects = [];
  const pendingEffects = [];
  const calls = [];
  const requests = [];
  const oauthCalls = [];
  const storage = new Map();
  const focusRequests = [];
  const reloads = [];
  const timeouts = [];
  let stateIndex = 0;
  let effectIndex = 0;
  function NativeGoogleAuthOverlay() { return null; }
  const hooks = {
    __esModule: true,
    default: React,
    useState: initial => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect: (effect, deps) => {
      const index = effectIndex++;
      if (!effects[index] || deps.some((value, offset) => !Object.is(value, effects[index][offset]))) {
        effects[index] = deps;
        pendingEffects.push(effect);
      }
    },
  };
  const dependencies = {
    './login-orbit.css': {},
    '@radix-ui/react-dropdown-menu': Object.fromEntries(['Root', 'Trigger', 'Portal', 'Content', 'Label', 'RadioGroup', 'RadioItem', 'ItemIndicator'].map(name => [name, `hospital-${name}`])),
    react: hooks,
    '../contexts/AuthContext': { useAuth: () => ({ login: async (...args) => { calls.push(args); return loginResult; } }) },
    './NativeGoogleAuthOverlay': { __esModule: true, default: NativeGoogleAuthOverlay },
    '../lib/auth/native-google-client': {
      hasPendingNativeGoogleCallback: () => false,
      isNativeGoogleAuthPlatform: () => native,
      NATIVE_GOOGLE_CALLBACK_EVENT: 'test-native-google-callback',
      resolveNativeGoogleHospitalId: () => '',
    },
    '../lib/auth/google-client': {
      getGoogleAuthClient: () => ({ auth: { signInWithOAuth: async options => { oauthCalls.push(options); return { error: null }; } } }),
      getGoogleRedirectUrl: () => 'https://example.invalid/prihlaseni/spravce',
    },
    'lucide-react': Object.fromEntries([
      'Activity', 'AlertCircle', 'ArrowLeft', 'ArrowRight', 'BriefcaseBusiness', 'Building2',
      'ChevronDown', 'ClipboardList', 'Eye', 'EyeOff', 'Loader2', 'Lock', 'Moon', 'Shield', 'Stethoscope', 'Sun',
    ].map(name => [name, name])),
  };
  const globals = {
    document: {
      documentElement: { classList: { contains: () => false, toggle: () => {} } },
      getElementById: id => ({ focus: () => focusRequests.push(id) }),
    },
    window: {
      addEventListener: () => {},
      removeEventListener: () => {},
      setTimeout: callback => { timeouts.push(callback); },
      location: { reload: () => reloads.push(true) },
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    fetch: async (url, options) => {
      requests.push([url, options]);
      assert.ok(['/api/auth/google/config', '/api/hospitals'].includes(url), `Unexpected fetch: ${url}`);
      return { ok: true, json: async () => url === '/api/hospitals' ? { hospitals: hospitalList } : { enabled: googleEnabled } };
    },
  };
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), compiled)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod, ...Object.values(globals));
  const Component = mod.exports.default;
  const render = () => {
    stateIndex = 0;
    effectIndex = 0;
    return Component({ onLoginSuccess: () => reloads.push('login-success') });
  };
  return {
    render, calls, requests, oauthCalls, storage, focusRequests, timeouts, reloads, NativeGoogleAuthOverlay,
    ready: async () => { render(); pendingEffects.splice(0).forEach(effect => effect()); await settle(); return render(); },
  };
}

test('initial login offers hospital and roles without a username or unusable mobile form', async () => {
  const app = makeHarness();
  const tree = await app.ready();
  assert.equal(findAll(mobile(tree), node => node.type === 'form').length, 0);
  assert.equal(findAll(mobile(tree), node => node.type === 'input').length, 0);
  assert.equal(findAll(mobile(tree), node => node.type === 'hospital-RadioGroup').length, 1);
  assert.deepEqual(findAll(mobile(tree), node => hasClass(node, 'mobile-login-role')).map(text), roles.map(([label]) => label));
  assert.equal(findAll(tree, node => node.type === 'input' && (node.props.type === 'email' || node.props.autoComplete === 'username' || /email|username/i.test(node.props.id ?? ''))).length, 0);
  assert.equal(findAll(tree, node => node.type === 'label' && /uživatelské jméno|e-mail|email/i.test(text(node))).length, 0);
  assert.equal(findAll(desktop(tree), node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, true);
  assert.deepEqual(app.calls, []);
});

for (const variant of ['mobile', 'desktop']) {
  for (const [label, email] of roles) {
    test(`${variant}: ${label} supplies the canonical account and selected hospital, asking only for password`, async () => {
      const app = makeHarness();
      let tree = await app.ready();
      const hospitalId = variant === 'mobile' ? 'login-hospital' : 'desktop-role-hospital';
      findAll(tree, node => node.props['data-picker-id'] === hospitalId)[0].props.onValueChange('hospital-two');
      tree = app.render();
      roleButton(tree, label, variant).props.onClick();
      tree = app.render();
      const scope = variant === 'mobile' ? mobile(tree) : desktop(tree);
      const form = findAll(scope, node => node.type === 'form')[0];
      assert.ok(form, 'Selecting a role reveals its credential form');
      const fields = findAll(form, node => node.type === 'input');
      assert.equal(fields.length, 1);
      assert.equal(fields[0].props.type, 'password');
      assert.equal(fields[0].props.autoComplete, 'current-password');
      assert.equal(fields[0].props.value, '', 'A role must never prefill a password');
      fields[0].props.onChange({ target: { value: 'synthetic-test-password' } });
      tree = app.render();
      let prevented = 0;
      findAll(variant === 'mobile' ? mobile(tree) : desktop(tree), node => node.type === 'form')[0].props.onSubmit({ preventDefault: () => prevented++ });
      await settle();
      assert.equal(prevented, 1);
      assert.deepEqual(app.calls, [[email, 'synthetic-test-password', 'hospital-two']]);
      assert.deepEqual(app.reloads, ['login-success']);
      assert.equal(findAll(app.render(), node => node.type === 'input' && node.props.autoComplete === 'username').length, 0);
    });
  }
}

test('no role, empty password and missing hospital cannot invoke password authentication', async () => {
  const app = makeHarness();
  let tree = await app.ready();
  // The desktop reveal stays mounted for its animation. Even a programmatic
  // submit must not turn it into a manual/anonymous account login path.
  input(tree, 'desktop-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  tree = app.render();
  findAll(desktop(tree), node => node.type === 'form')[0].props.onSubmit({ preventDefault: () => {} });
  await settle();
  assert.deepEqual(app.calls, []);

  roleButton(tree, 'COS').props.onClick();
  tree = app.render();
  findAll(mobile(tree), node => node.type === 'form')[0].props.onSubmit({ preventDefault: () => {} });
  await settle();
  assert.deepEqual(app.calls, []);

  findAll(tree, node => node.props['data-picker-id'] === 'desktop-role-hospital')[0].props.onValueChange('');
  input(tree, 'mobile-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  tree = app.render();
  assert.equal(findAll(mobile(tree), node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, true);
  findAll(mobile(tree), node => node.type === 'form')[0].props.onSubmit({ preventDefault: () => {} });
  await settle();
  assert.deepEqual(app.calls, []);
  assert.ok(text(app.render()).includes('Vyberte zdravotnické zařízení'));

  const empty = makeHarness({ hospitalList: [] });
  const emptyTree = await empty.ready();
  assert.ok(findAll(mobile(emptyTree), node => hasClass(node, 'mobile-login-role')).every(node => node.props.disabled));
  assert.deepEqual(empty.calls, []);
});

test('mobile back clears entered password and reveal state before another role is chosen', async () => {
  const app = makeHarness();
  let tree = await app.ready();
  roleButton(tree, 'ARO').props.onClick();
  tree = app.render();
  input(tree, 'mobile-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  findAll(mobile(tree), node => node.type === 'button' && node.props['aria-label'] === 'Zobrazit heslo')[0].props.onClick();
  tree = app.render();
  assert.equal(input(tree, 'mobile-role-password').props.type, 'text');
  findAll(mobile(tree), node => node.type === 'button' && text(node) === 'Zpět')[0].props.onClick();
  tree = app.render();
  assert.equal(findAll(mobile(tree), node => node.type === 'input').length, 0);
  roleButton(tree, 'Management').props.onClick();
  tree = app.render();
  assert.equal(input(tree, 'mobile-role-password').props.value, '');
  assert.equal(input(tree, 'mobile-role-password').props.type, 'password');
  assert.deepEqual(app.calls, []);
});

test('desktop repeated role selection and Escape retain their reset behavior', async () => {
  const app = makeHarness();
  let tree = await app.ready();
  roleButton(tree, 'Primariát', 'desktop').props.onClick();
  tree = app.render();
  input(tree, 'desktop-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  roleButton(tree, 'Primariát', 'desktop').props.onClick();
  tree = app.render();
  assert.equal(findAll(tree, node => hasClass(node, 'login-password-reveal'))[0].props['aria-hidden'], true);
  assert.equal(input(tree, 'desktop-role-password').props.value, '');
  roleButton(tree, 'COS', 'desktop').props.onClick();
  tree = app.render();
  input(tree, 'desktop-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  input(tree, 'desktop-role-password').props.onKeyDown({ key: 'Escape' });
  tree = app.render();
  assert.equal(findAll(tree, node => hasClass(node, 'login-password-reveal'))[0].props['aria-hidden'], true);
  assert.equal(input(tree, 'desktop-role-password').props.value, '');
  assert.deepEqual(app.calls, []);
});

test('authentication failure remains visible without leaking or retaining a username form', async () => {
  const app = makeHarness({ loginResult: { success: false, error: 'Testovací chyba přihlášení' } });
  let tree = await app.ready();
  roleButton(tree, 'ARO').props.onClick();
  tree = app.render();
  input(tree, 'mobile-role-password').props.onChange({ target: { value: 'synthetic-test-password' } });
  tree = app.render();
  findAll(mobile(tree), node => node.type === 'form')[0].props.onSubmit({ preventDefault: () => {} });
  await settle();
  tree = app.render();
  assert.ok(text(mobile(tree)).includes('Testovací chyba přihlášení'));
  assert.equal(findAll(mobile(tree), node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, false);
  assert.deepEqual(app.reloads, []);
});

test('Google web redirect retains hospital context and does not call password login', async () => {
  const app = makeHarness();
  let tree = await app.ready();
  findAll(tree, node => node.props['data-picker-id'] === 'login-hospital')[0].props.onValueChange('hospital-two');
  tree = app.render();
  findAll(mobile(tree), node => node.type === 'button' && text(node) === 'Přihlášení superadministrátora')[0].props.onClick();
  await settle();
  assert.deepEqual(app.oauthCalls, [{
    provider: 'google',
    options: { redirectTo: 'https://example.invalid/prihlaseni/spravce', queryParams: { prompt: 'select_account' } },
  }]);
  assert.equal(app.storage.get('orm-active-hospital'), 'hospital-two');
  assert.deepEqual(app.calls, []);
});

test('native Google opens its existing overlay and authenticated callback reloads the cookie-backed app', async () => {
  const app = makeHarness({ native: true });
  let tree = await app.ready();
  findAll(mobile(tree), node => node.type === 'button' && text(node) === 'Přihlášení superadministrátora')[0].props.onClick();
  await settle();
  tree = app.render();
  const overlay = findAll(tree, node => node.type === app.NativeGoogleAuthOverlay)[0];
  assert.equal(overlay.props.open, true);
  assert.equal(overlay.props.hospitalId, 'hospital-one');
  assert.deepEqual(app.oauthCalls, []);
  assert.deepEqual(app.calls, []);
  overlay.props.onClose();
  assert.equal(findAll(app.render(), node => node.type === app.NativeGoogleAuthOverlay)[0].props.open, false);
  overlay.props.onAuthenticated();
  assert.deepEqual(app.reloads, [true]);
});
