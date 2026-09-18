import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = postcss.parse(read('../../components/mobile/mobile-statistics.css'));
const stats = read('../../components/StatisticsModule.tsx');
const mobile = stats.slice(stats.indexOf('{/* ========== MOBILE'), stats.indexOf('{/* ========== DESKTOP'));
const rules = [];
css.walkRules(rule => rules.push(rule));
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));

test('statistics and personnel adapters cannot affect desktop or paper reports', () => {
  assert.ok(rules.length > 0);
  for (const rule of rules) {
    let ancestor = rule.parent;
    while (ancestor && !(ancestor.type === 'atrule' && ancestor.name === 'media')) ancestor = ancestor.parent;
    assert.ok(ancestor, `Unscoped selector: ${rule.selector}`);
    assert.match(ancestor.params, /\bscreen\b/);
    assert.match(ancestor.params, /max-width:\s*767px/);
  }
});

test('both mobile statistics themes derive their complete neutral palette from shared mobile tokens', () => {
  const rule = rules.find(item => item.selector === '.statistics-module.statistics-settings.mobile-statistics.mobile-unified-statistics');
  assert.ok(rule);
  const actual = declarations(rule);
  const expected = {
    '--stats-bg': '--m-bg', '--stats-surface': '--m-card',
    '--stats-surface-2': '--m-card-2', '--stats-surface-3': '--m-card-solid',
    '--stats-surface-hover': '--m-control-surface', '--stats-surface-active': '--m-accent-soft',
    '--stats-border': '--m-border', '--stats-border-hover': '--m-border', '--stats-border-active': '--m-accent',
    '--stats-text': '--m-text', '--stats-text-strong': '--m-text-strong',
    '--stats-muted': '--m-muted', '--stats-faint': '--m-faint', '--stats-ghost': '--m-track',
    '--stats-modal-bg': '--m-card-solid',
  };
  for (const [name, token] of Object.entries(expected)) assert.equal(actual[name], `var(${token})`);
  assert.match(mobile, /mobile-unified-statistics/);
  assert.doesNotMatch(mobile, /['"]--stats-[^'"]+['"]\s*:/, 'Inline light-theme values must not override the common palette');
});

test('cards use common surfaces, radii and padding while flush tables keep their own overflow layout', () => {
  const surface = rules.find(rule => rule.selector.includes('.stats-shared-card, .m-unified-card'));
  assert.equal(declarations(surface).background, 'var(--m-card)');
  assert.equal(declarations(surface)['border-radius'], 'var(--m-card-radius)');
  const padded = rules.find(rule => rule.selector.includes('.stats-shared-card:not(.stats-shared-card--flush)'));
  assert.equal(declarations(padded).padding, 'var(--m-card-padding)');
  assert.ok(rules.some(rule => rule.selector.includes('.stats-shared-card--flush > .stats-card-header')));
});

test('only explicit card titles receive unified typography; metric values are not treated as subtitles', () => {
  const title = rules.find(rule => rule.selector === '.statistics-settings.mobile-statistics.mobile-unified-statistics .stats-card-title');
  const actual = declarations(title);
  assert.equal(actual['font-size'], 'var(--m-card-title-size)');
  assert.equal(actual['font-weight'], 'var(--m-card-title-weight)');
  assert.equal(actual['text-align'], 'left');
  assert.equal(actual.order, '-1');
  const copy = rules.find(rule => rule.selector.includes('> p:not(.stats-card-title)'));
  assert.match(copy.selector, /:has\(> :is\(h2, h3\)\.stats-card-title\)/);
  assert.doesNotMatch(copy.selector, /:has\(> \.stats-card-title\)/,
    'KPI labels are p elements; their sibling values must retain their large numeric typography');
});

test('shared and custom statistics headings expose scoped hooks without changing exports or tab actions', () => {
  const shared = read('../../components/statistics/shared.tsx');
  assert.match(shared, /stats-shared-card--flush/);
  assert.match(shared, /<HeadingTag className="stats-card-title /);
  assert.match(shared, /<h2 className="stats-card-title /);
  for (const file of ['FinanceTab', 'RoomsTab', 'PhasesTab', 'NotificationsTab']) {
    const source = read(`../../components/statistics/${file}.tsx`);
    for (const heading of source.matchAll(/<h[23]\b[^>]*className="([^"]*)"/g)) {
      assert.ok(heading[1].includes('stats-card-title'), `${file}: unmarked card heading`);
    }
  }
  assert.match(mobile, /onClick=\{handlePrint\}/);
  assert.match(mobile, /onClick=\{handleExportPdf\}/);
  assert.match(mobile, /<StatisticsNavigation value=\{tab\} onChange=\{setTab\}/);
  for (const tab of ['prehled', 'saly', 'faze', 'finance', 'sazby', 'notifikace', 'zarizeni']) {
    assert.ok(mobile.includes(`tab === '${tab}'`));
  }
});

test('personnel cards and mobile filters preserve real assignments, selection and accessible controls', () => {
  const staff = read('../../components/StaffOverviewModule.tsx');
  assert.match(staff, /mobile-unified-staff/);
  assert.match(staff, /m-unified-card-title[^\n]*>\{room.name\}/);
  assert.match(staff, /aria-pressed=\{isSelected\}/);
  assert.match(staff, /onClick=\{onSelect\}/);
  assert.match(staff, /onStaffChange\?\.\(picker.roomId, dbRole, staffId, staffName\)/);
  assert.match(staff, /onStaffChange\?\.\(picker.roomId, dbRole, '', ''\)/);
  const filter = staff.slice(staff.indexOf('mobile-staff-filters'), staff.indexOf('{loading ?'));
  assert.match(filter, /aria-pressed=\{active\}/);
  assert.match(filter, /aria-label="Hledat sál nebo člena týmu"/);
  assert.match(filter, /h-11[^\n]*text-\[16px\]/);
  assert.doesNotMatch(filter, /!isMobileDark/);
  assert.equal(declarations(rules.find(rule => rule.selector.endsWith('.mobile-staff-avatar'))).order, '1');
  assert.equal(declarations(rules.find(rule => rule.selector.endsWith('.mobile-staff-card-copy'))).order, '-1');
});
