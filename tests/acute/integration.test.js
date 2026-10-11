import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('acute module has a real route and stays hidden when disabled, including for superadmin', () => {
  const auth = source('contexts/AuthContext.tsx');
  assert.ok(auth.indexOf("moduleId === 'acute-requests'") < auth.indexOf("if (user.role === 'superadmin') return true;", auth.indexOf('const hasModuleAccess')));
  assert.match(source('constants.ts'), /label: 'Akutní výkony', id: 'acute-requests'/);
  assert.match(source('App.tsx'), /currentView === 'acute-requests'/);
  assert.match(source('App.tsx'), /onOpenAcuteRequests=\{\(\) => handleNavigate\('acute-requests'\)\}/);
  for (const path of ['components/Sidebar.tsx', 'components/MobileNav.tsx']) {
    const nav = source(path);
    assert.match(nav, /hasModuleAccess\(item.id\)/);
    assert.doesNotMatch(nav, /isSuperAdmin \|\| hasModuleAccess\(item.id\)/);
  }
});

test('new hospitals never inherit enabled acute intake and disabling warns without deleting history', () => {
  const route = source('app/api/admin/hospital/route.ts');
  assert.match(route, /row.id === 'acute-requests' \? \{ is_enabled: false \}/);
  assert.match(route, /!newModules.some\(row => row.id === 'acute-requests'\)/);
  assert.match(route, /id: 'acute-requests'[\s\S]*?is_enabled: false/);
  const settings = source('components/settings/ModulesPanel.tsx');
  assert.match(settings, /moduleId === 'acute-requests' && currentEnabled/);
  assert.match(settings, /Požadavky a historie se nesmažou/);
});

test('timeline and module scoped labels cannot override each other after both lazy modules load', () => {
  assert.match(source('components/timeline/AcuteProposalLane.tsx'), /className="acute-proposal-lane-label"/);
  assert.doesNotMatch(source('components/timeline/acute-proposal-lane.css'), /\.acute-proposal-label\b/);
});
