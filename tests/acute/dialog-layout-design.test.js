import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

// Production source contracts complement browser checks; no clinical API calls.
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const dialogs = source('../../components/acute/AcuteDialogs.tsx');
const view = source('../../components/AcuteRequestsModule.tsx');
const css = postcss.parse(source('../../components/acute/acute-requests.css'));
const rules = [];
css.walkRules(rule => rules.push(rule));
const base = selector => {
  const rule = rules.find(rule => rule.selector === selector && rule.parent === css);
  assert.ok(rule, `Missing base rule: ${selector}`);
  return rule;
};
const value = (rule, prop) => rule.nodes.filter(node => node.type === 'decl' && node.prop === prop).at(-1)?.value;

test('create, edit, request detail, recorded cycle detail and reorder reuse the actual Timeline popup shell', () => {
  assert.equal((dialogs.match(/return <AcuteDialog /g) ?? []).length, 4);
  assert.match(dialogs, /<Dialog\.Overlay className="acute-dialog-overlay timeline-popup-overlay"/);
  assert.match(dialogs, /acute-dialog timeline-popup-panel/);
  assert.match(dialogs, /acute-dialog-heading timeline-popup-header/);
  assert.match(dialogs, /acute-icon-button timeline-popup-close/);
  assert.equal((dialogs.match(/className="timeline-popup-metric"/g) ?? []).length, 8);
  assert.match(dialogs, /data-acute-cycle-evidence=""/);
  assert.match(dialogs, /export function AcuteCycleDetailDialog/);
  for (const prop of ['background', 'border', 'border-radius', 'box-shadow', 'backdrop-filter']) {
    assert.equal(value(base('.acute-dialog'), prop), undefined, `Panel must inherit Timeline ${prop}`);
  }
  for (const prop of ['background', 'backdrop-filter']) {
    assert.equal(value(base('.acute-dialog-overlay'), prop), undefined, `Overlay must inherit Timeline ${prop}`);
  }
});

test('dialog header stays accessible while its body scrolls independently', () => {
  assert.match(dialogs, /<Dialog\.Title>/);
  assert.match(dialogs, /<Dialog\.Description>/);
  assert.match(dialogs, /onCloseAutoFocus=\{onCloseAutoFocus\}/);
  assert.match(dialogs, /<div className="acute-dialog-body">\{children\}<\/div>/);
  assert.equal(value(base('.acute-dialog'), 'display'), 'flex');
  assert.equal(value(base('.acute-dialog-heading'), 'flex-shrink'), '0');
  assert.equal(value(base('.acute-dialog-body'), 'min-height'), '0');
  assert.equal(value(base('.acute-dialog-body'), 'overflow-y'), 'auto');
  assert.match(value(base('.acute-dialog'), 'max-height'), /100dvh/);
  assert.match(value(base('.acute-dialog-wide'), 'width'), /100vw/);
});

test('Acute page inherits shared heading placement without a second centered width limit', () => {
  assert.match(view, /<header className="acute-page-header app-module-page-header">/);
  assert.match(view, /<ModulePageHeading /);
  for (const prop of ['max-width', 'margin-inline', 'padding-left', 'padding-top']) {
    assert.equal(value(base('.acute-module'), prop), undefined, `Shared page shell owns ${prop}`);
  }
  assert.equal(value(base('.acute-module'), 'width'), '100%');
});

test('modal fields keep 44px targets and Timeline inner corners', () => {
  const fields = base('.acute-field input, .acute-field select, .acute-field textarea');
  assert.equal(value(fields, 'min-height'), '44px');
  assert.equal(value(fields, 'border-radius'), '8px');
  assert.equal(value(fields, 'min-width'), '0');
  assert.equal(value(base('.acute-dialog-heading-copy'), 'min-width'), '0');
});

test('intake uses its own landscape two-column workspace without resizing other Timeline-style dialogs', () => {
  assert.equal(value(base('.acute-dialog-intake'), 'width'), 'min(1320px, calc(100vw - 48px))');
  assert.equal(value(base('.acute-dialog-wide'), 'width'), 'min(780px, calc(100vw - 32px))');
  assert.equal(value(base('.acute-intake-workspace'), 'display'), 'grid');
  assert.match(value(base('.acute-intake-workspace'), 'grid-template-columns'), /minmax\(0, 1fr\) minmax\(300px/);
  assert.equal(value(base('.acute-intake-notes textarea'), 'resize'), 'none');
  assert.equal(value(base('.acute-dialog-intake .acute-room-option'), 'min-height'), '52px');
  assert.equal(value(base('.acute-dialog-intake .acute-urgency-option'), 'min-height'), '96px');
  const narrow = rules.find(rule => rule.selector === '.acute-intake-workspace' && rule.parent.type === 'atrule');
  assert.match(narrow.parent.params, /max-width:\s*899px/);
  assert.equal(value(narrow, 'grid-template-columns'), 'minmax(0, 1fr)');
});

test('light phone popup remains light with readable descriptive copy', () => {
  const light = rules.find(rule => rule.selector === ':root:not(.m-dark) .acute-dialog');
  assert.match(light.parent.params, /max-width:\s*767px/);
  assert.equal(value(light, 'color-scheme'), 'light');
  assert.equal(value(light, 'background'), '#edf3fc');
  const description = rules.find(rule => rule.selector === ':root:not(.m-dark) .acute-dialog-heading p');
  assert.equal(value(description, 'color'), 'var(--acute-muted)');
  assert.equal(description.nodes.find(node => node.prop === 'color').important, true);
});
