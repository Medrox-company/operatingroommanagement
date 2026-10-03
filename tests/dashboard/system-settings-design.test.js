import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const load = (path, dependencies) => {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module.exports, module);
  return module.exports;
};

const Icon = props => React.createElement('svg', { 'aria-hidden': props['aria-hidden'] });
const icons = new Proxy({}, { get: () => Icon });
const Panel = ({ children, className }) => React.createElement('div', { className }, children);
const StubPanel = name => () => React.createElement('div', { 'data-panel': name }, name);
const tabs = load('../../components/settings/settings-tabs.ts', {});
const theme = load('../../components/settings/settings-theme.ts', {});

function renderSettings({ superAdmin = true, allowed = Object.values(tabs.SETTINGS_TAB_SUBMODULE) } = {}) {
  const Component = load('../../components/SystemSettingsModule.tsx', {
    react: React,
    'framer-motion': { motion: { div: Panel }, AnimatePresence: Panel, useReducedMotion: () => true },
    'lucide-react': icons,
    './ModulePageHeading': { __esModule: true, default: () => React.createElement('h1', null, 'NASTAVENÍ SYSTÉMU') },
    '../contexts/AuthContext': { useAuth: () => ({
      isSuperAdmin: superAdmin, isAdmin: superAdmin,
      modules: [ { is_enabled: true, allowed_roles: ['admin', 'aro'] }, { is_enabled: false, allowed_roles: ['aro'] } ],
      submodules: [], hasSubmoduleAccess: sub => allowed.includes(sub),
    }) },
    '../contexts/HospitalContext': { useHospital: () => ({ hospitals: [], loading: false }) },
    '../lib/logger': { logger: {} },
    './PWAInstaller': { usePWAInstall: () => ({ isInstalled: false }) },
    './SpeedDiagnosticsPanel': { __esModule: true, default: StubPanel('diagnostics') },
    './settings/settings-theme': theme,
    './settings/HospitalPanel': { HospitalPanel: StubPanel('hospital') },
    './settings/DatabasePanel': { DatabasePanel: StubPanel('database') },
    './settings/AccessPanel': { AccessPanel: StubPanel('access') },
    './settings/ModulesPanel': { ModulesPanel: StubPanel('modules') },
    './settings/ResetConfirmModal': { ResetConfirmModal: StubPanel('reset') },
    './settings/ImportConfirmModal': { ImportConfirmModal: StubPanel('import') },
    './settings/settings-tabs': tabs,
    './settings/system-settings.css': {},
  }).default;
  return renderToStaticMarkup(React.createElement(Component));
}

test('glass settings shell retains every permitted section and real configuration totals', () => {
  const html = renderSettings();
  assert.equal((html.match(/class="system-settings-nav-item"/g) || []).length, 5);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-controls="system-settings-content"/);
  assert.match(html, /aria-labelledby="system-settings-nav-hospital"/);
  assert.match(html, /data-panel="hospital"/);
  assert.doesNotMatch(html, /data-panel="(?:database|access|reset|import)"/);
  assert.match(html, /Aktivní moduly<\/dt><dd><span>1<\/span>/);
  assert.match(html, /Vypnuté moduly<\/dt><dd><span>1<\/span>/);
  assert.match(html, /Nastavené role<\/dt><dd><span>2<\/span>/);
});

test('redesign does not expose restricted panels, including hospital to non-superadmins', () => {
  const html = renderSettings({ superAdmin: false, allowed: ['settings.modules'] });
  assert.equal((html.match(/class="system-settings-nav-item"/g) || []).length, 1);
  assert.match(html, /data-panel="modules"/);
  assert.doesNotMatch(html, /system-settings-nav-(?:hospital|database|access|diagnostics)/);
});

test('no permissions renders the existing empty state without any settings panel', () => {
  const html = renderSettings({ allowed: [] });
  assert.match(html, /Nemáte přidělenou žádnou část nastavení systému/);
  assert.doesNotMatch(html, /data-panel=/);
  assert.doesNotMatch(html, /aria-labelledby="system-settings-nav-/);
});

const { Field } = load('../../components/settings/SettingsPrimitives.tsx', { react: React });
const { HospitalPanel } = load('../../components/settings/HospitalPanel.tsx', {
  react: React, 'lucide-react': icons, './SettingsPrimitives': { Field },
});
const hospitalProps = overrides => ({
  hospital: { id: 'demo', hospital_name: 'Test hospital', hospital_city: 'Test city' },
  hospitals: [{ id: 'demo', hospital_name: 'Test hospital' }], activeHospitalId: 'demo',
  loading: false, saving: false, isAdmin: true,
  onSelectHospital() {}, onNewHospital() {}, onChange() {}, onSave() {}, ...overrides,
});

test('hospital form preserves values, all fields, save action and explicitly associated labels', () => {
  const html = renderToStaticMarkup(React.createElement(HospitalPanel, hospitalProps()));
  assert.equal((html.match(/<input /g) || []).length, 8);
  assert.equal((html.match(/<textarea /g) || []).length, 1);
  assert.equal((html.match(/<select /g) || []).length, 1);
  for (const [, id] of html.matchAll(/<label for="([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`));
  assert.equal((html.match(/<label for=/g) || []).length, 10);
  assert.match(html, /value="Test hospital"/);
  assert.match(html, /value="Test city"/);
  assert.match(html, /Uložit informace/);
});

test('hospital form still respects read-only, saving, error and loading states', () => {
  const readonly = renderToStaticMarkup(React.createElement(HospitalPanel, hospitalProps({ isAdmin: false })));
  assert.equal((readonly.match(/<input[^>]+disabled=/g) || []).length, 8);
  assert.doesNotMatch(readonly, /Přidat zařízení/);
  assert.match(readonly, /Úpravy může provádět pouze administrátor/);
  const saving = renderToStaticMarkup(React.createElement(HospitalPanel, hospitalProps({ saving: true })));
  assert.match(saving, /<button disabled="" class="system-settings-primary/);
  const error = renderToStaticMarkup(React.createElement(HospitalPanel, hospitalProps({ message: { type: 'error', text: 'Uložení se nezdařilo' } })));
  assert.match(error, /Uložení se nezdařilo/);
  const loading = renderToStaticMarkup(React.createElement(HospitalPanel, hospitalProps({ loading: true })));
  assert.doesNotMatch(loading, /<input/);
});

test('new CSS is isolated from the global background, sidebar and other modules', () => {
  const css = postcss.parse(read('../../components/settings/system-settings.css'));
  css.walkRules(rule => {
    for (const selector of rule.selectors) assert.ok(selector.startsWith('.system-settings'), selector);
  });
  assert.ok(css.nodes.some(node => node.type === 'atrule' && node.params === '(max-width: 1100px)'));
  assert.ok(css.nodes.some(node => node.type === 'atrule' && node.params === '(max-width: 600px)'));
  assert.doesNotMatch(css.toString(), /url\(|position:\s*fixed/);
});
