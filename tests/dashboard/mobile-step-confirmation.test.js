import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// Offline component and stylesheet contracts, not a clinical app session. The
// real component is transpiled in memory; all action callbacks are local spies.
// Viewport fit, actual focus behavior and glass rendering require browser QA.
const require = createRequire(import.meta.url);
const imports = { react: React, 'lucide-react': require('lucide-react') };
const componentSource = readFileSync(new URL('../../components/StepConfirmationOverlay.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(componentSource, {
  fileName: 'StepConfirmationOverlay.tsx',
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});
const mod = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  assert.ok(Object.hasOwn(imports, name), `Unexpected confirmation dependency: ${name}`);
  return imports[name];
}, mod.exports, mod);
const StepConfirmationOverlay = mod.exports.default;
const styles = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-orbit.css', import.meta.url), 'utf8'));
const detailRoot = '.mobile-room-detail.mobile-room-reference.mobile-room-orbit';
const overlayRoot = '.mobile-room-orbit ~ .step-confirm-overlay';
const statuses = [
  { id: 'ready', name: 'Sál připraven', color: '#10B981', order_index: 0, default_duration_minutes: 8 },
  { id: 'surgery', name: 'Chirurgický výkon', color: '#EF4444', order_index: 1, default_duration_minutes: 12, default_duration: 9 },
  { id: 'cleaning', name: 'Úklid sálu', color: '#6366F1', order_index: 2, default_duration: 6 },
];

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.isValidElement(node) ? content(node.props.children) : '';
}

function byClass(node, className) {
  return elements(node, element => element.props.className?.split(' ').includes(className));
}

function render(overrides = {}) {
  const calls = [];
  const props = {
    pendingStepIndex: 2, activeDbStatuses: statuses, safeStepIndex: 1,
    validStepCount: statuses.length, elapsedSeconds: 600,
    onConfirm: () => calls.push('confirm'), onCancel: () => calls.push('cancel'), ...overrides,
  };
  const tree = StepConfirmationOverlay(props);
  const mobile = byClass(tree, 'msc-dialog')[0];
  const desktop = elements(tree, element => element.props.role === 'dialog' && element !== mobile)[0];
  return { tree, mobile, desktop, calls, props };
}

function declarationsFor(selector) {
  const values = {};
  styles.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('no pending phase renders no overlay or action callback', () => {
  const view = render({ pendingStepIndex: null });
  assert.equal(view.tree, null);
  assert.deepEqual(view.calls, []);
});

test('mobile confirmation shows the real current and target names and colors', () => {
  const view = render();
  assert.ok(view.mobile);
  assert.equal(content(byClass(view.mobile, 'msc-title')), 'Úklid sálu');
  assert.deepEqual(byClass(view.mobile, 'msc-route-item').map(content), ['Chirurgický výkon', 'Úklid sálu']);
  const dots = elements(view.mobile, element => element.type === 'i');
  assert.deepEqual(dots.map(dot => dot.props.style.background), ['#EF4444', '#6366F1']);
  assert.ok(dots.every(dot => dot.props['aria-hidden'] === true));
  assert.deepEqual(view.calls, [], 'Merely rendering the proposed transition must not change a phase');
});

test('reset and bounded targets preserve existing cycle semantics without synthetic phase labels', () => {
  const reset = render({ pendingStepIndex: 0, safeStepIndex: 2 });
  assert.equal(content(byClass(reset.mobile, 'msc-title')), 'Nový cyklus');
  assert.deepEqual(byClass(reset.mobile, 'msc-route-item').map(content), ['Úklid sálu', 'Nový cyklus']);
  assert.deepEqual(elements(reset.mobile, element => element.type === 'i').map(dot => dot.props.style.background), ['#6366F1', '#10B981']);
  const notReset = render({ pendingStepIndex: 0, safeStepIndex: 1 });
  assert.equal(content(byClass(notReset.mobile, 'msc-title')), 'Sál připraven', 'Only the configured final-step wrap starts a new cycle');
  const bounded = render({ pendingStepIndex: 99, safeStepIndex: 99 });
  assert.deepEqual(byClass(bounded.mobile, 'msc-route-item').map(content), ['Úklid sálu', 'Úklid sálu']);
  const empty = render({ activeDbStatuses: [], pendingStepIndex: 1, safeStepIndex: 0, validStepCount: 0 });
  assert.equal(content(byClass(empty.mobile, 'msc-title')), 'Další fáze');
  assert.deepEqual(byClass(empty.mobile, 'msc-route-item').map(content), ['Aktuální fáze', 'Další fáze']);
  assert.deepEqual(elements(empty.mobile, element => element.type === 'i').map(dot => dot.props.style.background), ['var(--m-muted)', 'var(--m-accent)']);
});

test('only the existing confirmation and cancellation buttons call their assigned callbacks', () => {
  const view = render();
  assert.equal(view.tree.props.onClick, undefined, 'Backdrop clicks must not silently confirm or cancel a clinical change');
  const mobileActions = elements(view.mobile, element => element.type === 'button');
  const desktopActions = elements(view.desktop, element => element.type === 'button');
  assert.equal(mobileActions.length, 2);
  assert.equal(desktopActions.length, 2);
  assert.deepEqual(mobileActions.map(content), ['Zrušit', 'Potvrdit']);
  assert.ok(mobileActions.every(button => button.props.type === 'button'));
  assert.equal(mobileActions[0].props.onClick, view.props.onCancel);
  assert.equal(mobileActions[1].props.onClick, view.props.onConfirm);
  assert.equal(desktopActions[0].props.onClick, view.props.onCancel);
  assert.equal(desktopActions[1].props.onClick, view.props.onConfirm);
  assert.equal(elements(view.tree, element => typeof element.props.onClick === 'function').length, 4, 'Restyling must not add another transition trigger');
  assert.deepEqual(view.calls, []);
  mobileActions[0].props.onClick();
  mobileActions[1].props.onClick();
  desktopActions[0].props.onClick();
  desktopActions[1].props.onClick();
  assert.deepEqual(view.calls, ['cancel', 'confirm', 'cancel', 'confirm']);
});

test('short-interval warning uses the configured strict threshold and original elapsed-time text', () => {
  for (const [elapsedSeconds, shortPhaseMinutes, expected, label] of [
    [null, undefined, false, null], [0, undefined, true, '0 s'],
    [59, undefined, true, '59 s'], [60, undefined, true, '1:00'],
    [299, undefined, true, '4:59'], [300, undefined, false, null],
    [119, 2, true, '1:59'], [120, 2, false, null], [180, 2, false, null],
  ]) {
    const view = render({ elapsedSeconds, ...(shortPhaseMinutes === undefined ? {} : { shortPhaseMinutes }) });
    const warning = byClass(view.mobile, 'msc-warning');
    assert.equal(warning.length, expected ? 1 : 0, `Incorrect short-phase warning at ${elapsedSeconds}s / ${shortPhaseMinutes ?? 5}min`);
    if (!expected) continue;
    assert.equal(warning[0].props.role, 'alert');
    const text = content(warning).replace(/\s+/g, ' ').trim();
    assert.ok(text.includes('Fáze Chirurgický výkon trvá pouze'));
    assert.ok(text.includes(`${label} — méně než ${shortPhaseMinutes ?? 5} minut`));
    assert.ok(text.includes('a kratší než průměr tohoto kroku (12 min).'));
    assert.equal(content(byClass(warning, 'msc-warning-value')), label);
    assert.deepEqual(view.calls, []);
  }
});

test('average duration retains minutes preference, legacy fallback and minimum behavior', () => {
  for (const [duration, expected] of [
    [{ default_duration_minutes: 12, default_duration: 9 }, 12],
    [{ default_duration: 9 }, 9], [{}, 5],
    [{ default_duration_minutes: -3 }, 1],
  ]) {
    const current = { id: 'custom', name: 'Vlastní fáze', color: '#ABCDEF', order_index: 0, ...duration };
    const view = render({ activeDbStatuses: [current, statuses[2]], pendingStepIndex: 1, safeStepIndex: 0, elapsedSeconds: 30 });
    assert.ok(content(byClass(view.mobile, 'msc-warning')).includes(`(${expected} min)`));
  }
});

test('mobile and desktop dialogs use their own visible heading and warning IDs', () => {
  for (const elapsedSeconds of [30, 600]) {
    const view = render({ elapsedSeconds });
    assert.ok(view.tree.props.className.split(' ').includes('step-confirm-overlay'));
    assert.equal(view.tree.props.role, undefined, 'Do not label the mobile overlay from a CSS-hidden desktop heading');
    assert.equal(view.tree.props['aria-labelledby'], undefined);
    assert.equal(elements(view.tree, element => element.props.role === 'dialog').length, 2);
    assert.ok(view.mobile.props.className.includes('md:hidden'));
    assert.ok(view.desktop.props.className.includes('hidden') && view.desktop.props.className.includes('md:flex'));
    for (const [dialog, titleId, warningId] of [
      [view.mobile, 'step-confirm-title-mobile', 'step-short-interval-warning-mobile'],
      [view.desktop, 'step-confirm-title', 'step-short-interval-warning'],
    ]) {
      assert.equal(dialog.props.role, 'dialog');
      assert.equal(dialog.props['aria-modal'], 'true');
      assert.equal(dialog.props['aria-labelledby'], titleId);
      assert.equal(elements(dialog, element => element.props.id === titleId).length, 1);
      assert.equal(dialog.props['aria-describedby'], elapsedSeconds < 300 ? warningId : undefined);
      assert.equal(elements(dialog, element => element.props.id === warningId).length, elapsedSeconds < 300 ? 1 : 0);
    }
    const ids = elements(view.tree, element => element.props.id).map(element => element.props.id);
    assert.equal(ids.length, new Set(ids).size, 'Responsive versions must not duplicate IDs');
    assert.ok(byClass(view.mobile, 'msc-box-icon').every(icon => icon.props['aria-hidden'] === true));
  }
});

test('desktop confirmation retains its two original red and green disc controls', () => {
  const view = render();
  const discs = byClass(view.desktop, 'step-confirm-action-disc');
  assert.equal(discs.length, 2);
  assert.ok(discs.every(disc => disc.props.className.includes('rounded-full')));
  assert.equal(discs[0].props.style['--confirm-color'], '#ef4444');
  assert.equal(discs[1].props.style['--confirm-color'], '#10b981');
  assert.ok(discs[0].props.style.backgroundImage.includes('rgba(229,72,77,'));
  assert.ok(discs[1].props.style.backgroundImage.includes('rgba(16,185,129,'));
  assert.ok(discs.every(disc => disc.props.style.boxShadow.includes('inset 0 0 0 5px')));
});

test('every confirmation appearance override is scoped to the open mobile orbit sibling', () => {
  let count = 0;
  styles.walkRules(rule => {
    if (!rule.selector.includes('.step-confirm-overlay')) return;
    count += 1;
    for (const selector of rule.selectors.filter(value => value.includes('.step-confirm-overlay'))) {
      assert.match(selector, /^\.mobile-room-orbit(?:\[data-(?:hygiene|locked|emergency)='true'\])? ~ \.step-confirm-overlay(?:\s|$)/, 'Only the existing mobile room states may restyle their sibling confirmation, never another room design or module');
    }
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => /max-width:\s*767px/.test(value)), 'The desktop confirmation must retain its existing visual design');
  });
  assert.ok(count > 15, 'Inspect the real card, content, action and accessibility overrides');
});

test('the confirmation and room share one glass palette including the hygiene floor', () => {
  const room = declarationsFor(detailRoot);
  const overlay = declarationsFor(overlayRoot);
  for (const token of [
    '--mrd-orbit-ink', '--mrd-orbit-muted', '--mrd-orbit-control-ink',
    '--mrd-orbit-glass-surface', '--mrd-orbit-glass-border', '--mrd-orbit-glass-shadow', '--mrd-orbit-floor',
  ]) {
    assert.ok(room[token]);
    assert.equal(overlay[token], room[token], `${token} must match the current detail instead of introducing a separate modal theme`);
    const common = [];
    styles.walkRules(rule => {
      if (!rule.selectors.includes(detailRoot) || !rule.selectors.includes(overlayRoot)) return;
      rule.walkDecls(token, declaration => common.push(declaration));
    });
    assert.equal(common.length, 1, `${token} must have a single shared source for the room and overlay`);
  }
  const hygieneOverlay = declarationsFor(".mobile-room-orbit[data-hygiene='true'] ~ .step-confirm-overlay");
  assert.equal(hygieneOverlay['--mrd-orbit-floor'], declarationsFor(`${detailRoot}[data-hygiene='true']`)['--mrd-orbit-floor']);
  assert.equal(hygieneOverlay['--mrd-orbit-floor'], '#241208');
  const backdrop = declarationsFor(`${overlayRoot} .step-confirm-bg`);
  assert.equal(backdrop.background, 'rgba(0, 0, 0, .32)', 'A transparent backdrop must retain the actual blue or hygiene-orange room beneath it');
  assert.equal(backdrop['backdrop-filter'], 'blur(18px)');
  assert.equal(backdrop['-webkit-backdrop-filter'], backdrop['backdrop-filter'], 'Backdrop blur must work in iOS Safari');
  const card = declarationsFor(`${overlayRoot} .msc-dialog`);
  assert.equal(card['border-radius'], '32px');
  assert.equal(card.border, 'var(--mrd-orbit-glass-border)');
  assert.match(card.background, /var\(--mrd-orbit-glass-surface\)/);
  assert.match(card.background, /var\(--mrd-orbit-floor\) 78%, transparent/);
  assert.equal(card['backdrop-filter'], 'blur(28px)');
  assert.equal(card['-webkit-backdrop-filter'], card['backdrop-filter']);
  for (const selector of [`${overlayRoot} .step-confirm-bg`, `${overlayRoot} .msc-dialog`]) {
    const filters = [];
    styles.walkRules(rule => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls(declaration => {
        if (['-webkit-backdrop-filter', 'backdrop-filter'].includes(declaration.prop)) filters.push(declaration.prop);
      });
    });
    assert.deepEqual(filters, ['-webkit-backdrop-filter', 'backdrop-filter'], 'Keep the standard filter last so Next/Lightning retains working Chromium blur as well as the Safari prefix');
  }
});

test('short mobile screens can scroll the entire card without shrinking its controls', () => {
  const overlay = declarationsFor(overlayRoot);
  assert.match(overlay.padding, /safe-area-inset-top/);
  assert.match(overlay.padding, /safe-area-inset-bottom/);
  const card = declarationsFor(`${overlayRoot} .msc-dialog`);
  assert.equal(card.position, 'relative');
  assert.equal(card.inset, 'auto', 'Do not retain the previous full-screen absolute card');
  assert.equal(card.width, '100%');
  assert.equal(card['max-width'], '400px');
  assert.equal(card['min-height'], '0');
  assert.match(card['max-height'], /100svh - 40px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)/);
  assert.equal(card['overflow-y'], 'auto', 'A warning or long phase name must not push either button out of reach');
  assert.equal(card['overscroll-behavior'], 'contain');
  assert.equal(card['justify-content'], 'flex-start', 'Oversized content must start at the reachable top rather than be centered outside the scroll area');
  assert.equal(declarationsFor(`${overlayRoot} .msc-dialog > *`)['flex-shrink'], '0', 'Do not squeeze the warning or action row to fit a landscape viewport');
  const actions = declarationsFor(`${overlayRoot} .msc-actions`);
  assert.equal(actions['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  const button = declarationsFor(`${overlayRoot} .msc-box`);
  assert.ok(parseFloat(button['min-width']) >= 44);
  assert.equal(button['min-height'], '74px');
  assert.equal(declarationsFor(`${overlayRoot} .msc-box:active`).transform, 'none', 'Pressed state must not shrink a clinical target');
});

test('modal typography, route and two action tiles match the room glass controls', () => {
  const title = declarationsFor(`${overlayRoot} .msc-title`);
  assert.equal(title.color, 'var(--mrd-orbit-ink)');
  assert.equal(title['font-weight'], '400');
  assert.equal(title['overflow-wrap'], 'normal');
  assert.equal(title['word-break'], 'normal');
  assert.equal(title.hyphens, 'none');
  assert.equal(title.overflow, undefined, 'Complete phase names must not be clipped');
  const important = {};
  styles.walkRules(rule => {
    if (rule.selectors.includes(`${overlayRoot} .msc-title`)) rule.walkDecls(declaration => { important[declaration.prop] = declaration.important; });
  });
  assert.equal(important['font-weight'], true, 'The room-style type weight must override the existing important modal heading style');
  const route = declarationsFor(`${overlayRoot} .msc-route`);
  assert.equal(route.background, 'var(--mrd-orbit-glass-surface)');
  assert.equal(route.border, 'var(--mrd-orbit-glass-border)');
  const tile = declarationsFor(`${overlayRoot} .msc-box`);
  assert.equal(tile['--msc-tint'], 'var(--color-success, #20C997)');
  assert.equal(declarationsFor(`${overlayRoot} .msc-box--cancel`)['--msc-tint'], 'var(--color-danger, #FF5560)');
  assert.match(tile.background, /var\(--msc-tint\) 16%, transparent/);
  assert.match(tile.background, /var\(--mrd-orbit-glass-surface\)$/);
  assert.equal(tile['box-shadow'], 'var(--mrd-orbit-glass-shadow)');
  const icon = declarationsFor(`${overlayRoot} .msc-box-icon`);
  assert.equal(icon.width, '29px');
  assert.equal(icon.height, '29px');
  assert.equal(icon.background, 'transparent', 'Do not retain the old large filled action circles');
  assert.equal(icon['box-shadow'], 'none');
  assert.equal(icon.color, 'inherit');
  const label = declarationsFor(`${overlayRoot} .msc-box-label`);
  assert.equal(label.color, 'inherit');
  assert.equal(label['font-weight'], '400');
  assert.equal(label['text-transform'], 'none');
  const warning = declarationsFor(`${overlayRoot} .msc-warning`);
  assert.notEqual(warning.display, 'none');
  assert.notEqual(warning.visibility, 'hidden');
});

test('confirmation keyboard focus and reduced-motion rules remain explicit and mobile-scoped', () => {
  const focus = declarationsFor(`${overlayRoot} .msc-box:focus-visible`);
  assert.equal(focus.outline, '2px solid #E5DDFF');
  assert.equal(focus['outline-offset'], '3px');
  let count = 0;
  styles.walkRules(rule => {
    if (!rule.selector.includes('.step-confirm-overlay')) return;
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    if (!media.some(value => value.includes('prefers-reduced-motion: reduce'))) return;
    count += 1;
    const values = {};
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    assert.equal(values.transition, 'none');
    assert.equal(values.animation, 'none');
    assert.ok(rule.selectors.every(selector => selector.startsWith(overlayRoot)));
  });
  assert.ok(count > 0, 'The sibling overlay needs its own reduced-motion coverage outside the detail subtree');
});
