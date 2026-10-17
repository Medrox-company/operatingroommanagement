import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// The actual component runs against local state/effect/window adapters. No
// clinical providers, credentials, network or persistence are loaded. This is
// not a browser: rendered glass, real focus and viewport fit need separate QA.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../components/room/RapidSurgeryWarning.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'RapidSurgeryWarning.tsx',
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});
const stylesheet = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-orbit.css', import.meta.url), 'utf8'));
const scope = '.mobile-room-orbit';
const titleSelector = '.mobile-room-detail.mobile-room-reference.mobile-room-orbit .rapid-surgery-title';
const statuses = [
  { id: 'ready', name: 'Sál připraven' },
  { id: 'arrival', name: 'Příjezd na sál' },
  { id: 'anesthesia', name: 'Anestezie' },
  { id: 'surgery', name: 'Chirurgický výkon' },
  { id: 'cleaning', name: 'Úklid sálu' },
];
const arrivalMs = Date.UTC(2026, 9, 15, 7, 0);
const iso = value => new Date(value).toISOString();
const roomFor = (seconds = 120, overrides = {}) => ({
  id: 'offline-room', currentStepIndex: 3,
  operationStartedAt: iso(arrivalMs), phaseStartedAt: iso(arrivalMs + seconds * 1000),
  statusHistory: [
    { stepIndex: 1, startedAt: iso(arrivalMs) },
    { stepIndex: 3, startedAt: iso(arrivalMs + seconds * 1000) },
  ], ...overrides,
});

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

const byClass = (tree, name) => elements(tree, element => element.props.className?.split(' ').includes(name));
const sameDeps = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));

function harness(overrides = {}, thresholdMinutes = 5) {
  const state = [], memos = [], effects = [], queuedEffects = [];
  const listeners = new Map();
  let stateCursor = 0, memoCursor = 0, effectCursor = 0;
  const windowAdapter = {
    addEventListener(type, callback) {
      assert.equal(type, 'keydown', 'The passive warning may listen only for keyboard dismissal');
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  const imports = {
    react: { ...React, memo: component => component,
      useState(initial) {
        const index = stateCursor++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useMemo(compute, deps) {
        const index = memoCursor++;
        if (!memos[index] || !sameDeps(memos[index].deps, deps)) memos[index] = { deps, value: compute() };
        return memos[index].value;
      },
      useEffect(effect, deps) {
        const index = effectCursor++;
        if (!effects[index] || !sameDeps(effects[index].deps, deps)) queuedEffects.push({ index, effect, deps });
      },
    },
    'lucide-react': require('lucide-react'),
    '../../hooks/useOperationalThresholds': { useOperationalThresholds: () => ({ thresholds: { rapidSurgeryMinutes: thresholdMinutes } }) },
  };
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', 'window', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected rapid-warning dependency: ${name}`);
    return imports[name];
  }, mod.exports, mod, windowAdapter);
  const props = { room: roomFor(), statuses, ...overrides };
  return {
    props,
    listenerCount: () => listeners.get('keydown')?.size || 0,
    key(value) { for (const callback of [...(listeners.get('keydown') || [])]) callback({ key: value }); },
    dispose() { effects.forEach(effect => effect?.cleanup?.()); },
    render() {
      stateCursor = memoCursor = effectCursor = 0;
      const tree = mod.exports.RapidSurgeryWarning(props);
      while (queuedEffects.length) {
        const pending = queuedEffects.shift();
        effects[pending.index]?.cleanup?.();
        effects[pending.index] = { deps: pending.deps, cleanup: pending.effect() };
      }
      return {
        tree,
        byClass: name => byClass(tree, name),
        button(name) {
          const button = elements(tree, element => element.type === 'button' && (element.props['aria-label'] === name || content(element) === name))[0];
          assert.ok(button, `Missing warning control: ${name}`);
          return button;
        },
      };
    },
  };
}

function declarationsFor(selector) {
  const values = {};
  stylesheet.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('rapid warnings retain the strict configured 299/300-second boundary', () => {
  for (const [seconds, minutes, visible, duration] of [
    [0, 5, true, '0:00'], [59, 5, true, '0:59'], [299, 5, true, '4:59'],
    [300, 5, false], [301, 5, false], [-1, 5, false],
    [119, 2, true, '1:59'], [120, 2, false],
  ]) {
    const app = harness({ room: roomFor(seconds) }, minutes);
    const view = app.render();
    assert.equal(view.tree !== null, visible, `Wrong rapid warning at ${seconds}s / ${minutes}min`);
    assert.equal(app.listenerCount(), visible ? 1 : 0);
    if (visible) assert.equal(content(view.byClass('rapid-surgery-duration')), duration);
    app.dispose();
    assert.equal(app.listenerCount(), 0);
  }
});

test('valid history is sorted and latest surgery uses only an arrival at or before it', () => {
  const app = harness({ room: roomFor(239, {
    currentStepIndex: 4, operationStartedAt: iso(arrivalMs - 3600_000), phaseStartedAt: 'invalid',
    statusHistory: [
      { stepIndex: 1, startedAt: iso(arrivalMs + 300_000) },
      { stepIndex: 3, startedAt: 'not-a-date' },
      { stepIndex: 3, startedAt: iso(arrivalMs + 239_000) },
      { stepIndex: 1, startedAt: iso(arrivalMs) },
      { stepIndex: 3, startedAt: iso(arrivalMs - 500_000) },
    ],
  }) });
  assert.equal(content(app.render().byClass('rapid-surgery-duration')), '3:59');
  app.dispose();
  const historicalBoundary = harness({ room: roomFor(300, { phaseStartedAt: iso(arrivalMs + 1000) }) });
  assert.equal(historicalBoundary.render().tree, null, 'An authoritative five-minute history must not be replaced by a shorter current-phase fallback');
});

test('missing history uses the original phase and operation start fallbacks without fabricating a warning', () => {
  const fallback = harness({ room: roomFor(62, { statusHistory: [] }) });
  assert.equal(content(fallback.render().byClass('rapid-surgery-duration')), '1:02');
  fallback.dispose();
  for (const override of [
    { currentStepIndex: 4 }, { operationStartedAt: undefined },
    { operationStartedAt: 'invalid' }, { phaseStartedAt: 'invalid' },
    { operationStartedAt: iso(arrivalMs + 180_000) },
  ]) {
    const app = harness({ room: roomFor(62, { statusHistory: [], ...override }) });
    assert.equal(app.render().tree, null, `Invalid fallback must not show a warning: ${JSON.stringify(override)}`);
    assert.equal(app.listenerCount(), 0);
  }
  const missingPhase = harness({ statuses: [statuses[0], statuses[2], statuses[4]] });
  assert.equal(missingPhase.render().tree, null);
});

test('configured Czech phase names retain normalization and the operating-performance alias', () => {
  const app = harness({ statuses: statuses.map((status, index) => ({ ...status, name: index === 1 ? 'PŘÍJEZD NA SÁL' : index === 3 ? 'Operační výkon' : status.name })) });
  assert.equal(content(app.render().byClass('rapid-surgery-duration')), '2:00');
  app.dispose();
});

test('mobile popup retains accessible clinical text and the measured interval', () => {
  const app = harness();
  const view = app.render();
  assert.equal(view.tree.props.role, 'dialog');
  assert.equal(view.tree.props['aria-modal'], 'true');
  assert.equal(view.tree.props['aria-labelledby'], 'rapid-surgery-warning-title');
  assert.equal(view.tree.props['aria-describedby'], 'rapid-surgery-warning-description');
  assert.equal(content(view.byClass('rapid-surgery-kicker')), 'Upozornění na časový interval');
  assert.equal(content(view.byClass('rapid-surgery-title')), 'Interval kratší než 5 minut');
  assert.equal(content(view.byClass('rapid-surgery-description')), 'Od příjezdu pacienta na sál do zahájení chirurgického výkonu uplynulo pouze');
  assert.equal(view.byClass('rapid-surgery-interval')[0].props['aria-label'], 'Naměřený interval 2:00');
  assert.equal(content(view.byClass('rapid-surgery-duration')), '2:00');
  assert.equal(content(view.byClass('rapid-surgery-unit')), 'min');
  for (const id of [view.tree.props['aria-labelledby'], view.tree.props['aria-describedby']]) {
    assert.equal(elements(view.tree, element => element.props.id === id).length, 1);
  }
  assert.equal(view.button('Rozumím, zavřít').props.autoFocus, true);
  assert.ok(elements(view.tree, element => element.type === 'button').every(button => button.props.type === 'button'));
  assert.equal(view.tree.props.onClick, undefined, 'Clicking a clinical warning backdrop must not acknowledge it');
  app.dispose();
});

test('X and acknowledgment dismiss only the current event and a later event reopens the popup', () => {
  for (const label of ['Zavřít upozornění', 'Rozumím, zavřít']) {
    const app = harness();
    let view = app.render();
    view.button(label).props.onClick();
    assert.equal(app.render().tree, null);
    assert.equal(app.listenerCount(), 0);
    assert.equal(app.render().tree, null, 'An unchanged already-dismissed event must remain quiet');
    app.props.room = roomFor(120, {
      statusHistory: [
        { stepIndex: 1, startedAt: iso(arrivalMs + 3600_000) },
        { stepIndex: 3, startedAt: iso(arrivalMs + 3720_000) },
      ],
    });
    view = app.render();
    assert.ok(view.tree, 'A new surgery event must not inherit an older local dismissal');
    assert.equal(app.listenerCount(), 1);
    assert.equal(content(view.byClass('rapid-surgery-duration')), '2:00');
    app.dispose();
  }
});

test('Escape dismisses the popup and cleans up its listener without acknowledging other keys', () => {
  const app = harness();
  assert.ok(app.render().tree);
  assert.equal(app.listenerCount(), 1);
  app.key('Enter');
  assert.ok(app.render().tree, 'Enter must not become a new warning acknowledgment shortcut');
  assert.equal(app.listenerCount(), 1);
  app.key('Escape');
  assert.equal(app.render().tree, null);
  assert.equal(app.listenerCount(), 0, 'Dismissal must detach the Escape listener');
});

test('non-orbit mobile usage retains original inline styling for the existing Timeline surface', () => {
  const app = harness();
  const view = app.render();
  assert.ok(view.tree.props.style.background.includes('rgba(3,5,11,0.90)'));
  assert.equal(view.tree.props.style.backdropFilter, 'blur(16px) brightness(0.5) saturate(0.9)');
  assert.equal(view.tree.props.style.WebkitBackdropFilter, view.tree.props.style.backdropFilter);
  const card = view.byClass('rapid-surgery-card')[0];
  assert.ok(card.props.style.background.startsWith('linear-gradient(160deg,'));
  assert.ok(card.props.style.boxShadow.includes('0 40px 110px'));
  app.dispose();
});

test('rail and desktop variants retain their existing passive layouts and dismissal behavior', () => {
  for (const variant of ['rail', 'desktop']) {
    const app = harness({ variant, className: 'existing-placement' });
    const view = app.render();
    assert.equal(view.tree.type, 'section');
    assert.equal(view.tree.props.role, 'status');
    assert.equal(view.tree.props['aria-live'], 'polite');
    assert.ok(view.tree.props.className.includes('existing-placement'));
    assert.equal(elements(view.tree, element => element.props.role === 'dialog').length, 0);
    assert.equal(elements(view.tree, element => element.props.className?.includes('rapid-surgery-')).length, 0, 'New mobile hooks must not alter rail or desktop markup');
    assert.equal(app.listenerCount(), 0, 'Passive warning variants must not capture Escape');
    assert.ok(content(view.tree).includes('2:00'));
    if (variant === 'rail') {
      view.button('Skrýt upozornění').props.onClick();
      assert.equal(app.render().tree, null);
    } else {
      assert.equal(elements(view.tree, element => element.type === 'button').length, 0);
      assert.ok(view.tree.props.style.background.startsWith('linear-gradient(135deg,'));
    }
    app.dispose();
  }
});

test('rapid-warning visual overrides affect only the mobile orbit subtree', () => {
  let count = 0;
  stylesheet.walkRules(rule => {
    if (!rule.selector.includes('.rapid-surgery-')) return;
    count += 1;
    assert.ok(rule.selectors.every(selector => selector.startsWith(`${scope} .rapid-surgery-`) || selector === titleSelector), 'Do not restyle Timeline mobile warnings or desktop/rail variants');
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => /max-width:\s*767px/.test(value)), 'Rapid-warning appearance must remain mobile-only');
  });
  assert.ok(count > 10, 'Inspect the actual popup, card, content and controls');
});

test('rapid warning uses exactly the phase-confirmation glass card and inherits the current room floor', () => {
  const modal = declarationsFor(`${scope} .rapid-surgery-modal`);
  const backdrop = declarationsFor('.mobile-room-orbit ~ .step-confirm-overlay .step-confirm-bg');
  assert.equal(modal.background, backdrop.background);
  assert.equal(modal.background, 'rgba(0, 0, 0, .32)', 'The actual room must remain visible beneath the warning');
  const card = declarationsFor(`${scope} .rapid-surgery-card`);
  const confirmation = declarationsFor('.mobile-room-orbit ~ .step-confirm-overlay .msc-dialog');
  for (const property of ['background', 'border', 'box-shadow', 'border-radius', 'backdrop-filter', '-webkit-backdrop-filter']) {
    assert.equal(card[property], confirmation[property], `The warning must share confirmation ${property} rather than introducing another visual theme`);
  }
  assert.equal(card['border-radius'], '32px');
  assert.match(card.background, /var\(--mrd-orbit-glass-surface\)/);
  assert.match(card.background, /var\(--mrd-orbit-floor\) 78%, transparent/);
  assert.equal(card['--mrd-orbit-floor'], undefined, 'Blue or hygiene-orange must inherit from the real room rather than be hardcoded by the warning');
  const importantProperties = new Map([
    [`${scope} .rapid-surgery-modal`, ['background', 'backdrop-filter', '-webkit-backdrop-filter']],
    [`${scope} .rapid-surgery-card`, ['background', 'border', 'box-shadow']],
    [`${scope} .rapid-surgery-close`, ['background', 'border', 'box-shadow', 'color']],
    [`${scope} .rapid-surgery-interval`, ['background', 'border', 'box-shadow']],
    [`${scope} .rapid-surgery-acknowledge`, ['background', 'border', 'box-shadow', 'color']],
  ]);
  for (const [selector, properties] of importantProperties) {
    const important = {};
    stylesheet.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { important[declaration.prop] = declaration.important; });
    });
    for (const property of properties) assert.equal(important[property], true, `${selector} ${property} must outrank the retained legacy inline styles`);
  }
});

test('Safari prefixes precede working standard backdrop filters for both warning layers', () => {
  for (const [selector, blur] of [[`${scope} .rapid-surgery-modal`, 'blur(18px)'], [`${scope} .rapid-surgery-card`, 'blur(28px)']]) {
    const values = declarationsFor(selector);
    assert.equal(values['-webkit-backdrop-filter'], blur);
    assert.equal(values['backdrop-filter'], blur);
    const properties = [];
    stylesheet.walkRules(rule => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls(declaration => {
        if (['-webkit-backdrop-filter', 'backdrop-filter'].includes(declaration.prop)) properties.push(declaration.prop);
      });
    });
    assert.deepEqual(properties, ['-webkit-backdrop-filter', 'backdrop-filter'], 'Keep the standard filter last so the Next/Lightning build does not lose Chromium blur');
  }
});

test('small screens keep the whole warning scrollable and both dismissal targets reachable', () => {
  const modal = declarationsFor(`${scope} .rapid-surgery-modal`);
  assert.match(modal.padding, /safe-area-inset-top/);
  assert.match(modal.padding, /safe-area-inset-bottom/);
  const card = declarationsFor(`${scope} .rapid-surgery-card`);
  assert.equal(card.display, 'flex');
  assert.equal(card.flex, '0 1 auto');
  assert.equal(card['flex-direction'], 'column');
  assert.equal(card.width, '100%');
  assert.equal(card['max-width'], '400px');
  assert.equal(card['min-height'], '0');
  assert.match(card['max-height'], /100svh - 40px - env\(safe-area-inset-top, 0px\) - env\(safe-area-inset-bottom, 0px\)/);
  assert.equal(card['overflow-y'], 'auto');
  assert.equal(card['overscroll-behavior'], 'contain');
  assert.notEqual(card['justify-content'], 'center', 'An oversized warning must not center its beginning outside the reachable scroll area');
  assert.equal(declarationsFor(`${scope} .rapid-surgery-card > *`)['flex-shrink'], '0');
  const close = declarationsFor(`${scope} .rapid-surgery-close`);
  assert.equal(close.width, '44px');
  assert.equal(close.height, '44px');
  assert.equal(close['min-width'], '44px');
  assert.equal(close['min-height'], '44px');
  const acknowledge = declarationsFor(`${scope} .rapid-surgery-acknowledge`);
  assert.equal(acknowledge.width, '100%');
  assert.equal(acknowledge['min-width'], '44px');
  assert.equal(acknowledge['min-height'], '74px');
  for (const className of ['rapid-surgery-close', 'rapid-surgery-acknowledge']) {
    assert.equal(declarationsFor(`${scope} .${className}:active`).transform, 'none', 'Pressed styling must not shrink a clinical warning target');
  }
});

test('warning content and acknowledgment retain readable room typography and gentle glass accents', () => {
  const title = declarationsFor(titleSelector);
  assert.equal(title.color, 'var(--mrd-orbit-ink)');
  assert.equal(title['font-weight'], '400');
  assert.equal(title['word-break'], 'normal');
  assert.equal(title['overflow-wrap'], 'normal');
  assert.equal(title.hyphens, 'none');
  assert.equal(title.overflow, undefined, 'The complete warning title must not be clipped');
  assert.equal(declarationsFor(`${scope} .rapid-surgery-description`).color, 'var(--mrd-orbit-control-ink)');
  assert.equal(declarationsFor(`${scope} .rapid-surgery-duration`)['font-weight'], '300');
  const interval = declarationsFor(`${scope} .rapid-surgery-interval`);
  assert.equal(interval.background, 'var(--mrd-orbit-glass-surface)');
  assert.equal(interval.border, 'var(--mrd-orbit-glass-border)');
  assert.equal(interval['min-height'], '74px');
  const acknowledge = declarationsFor(`${scope} .rapid-surgery-acknowledge`);
  assert.match(acknowledge.background, /var\(--color-warning, #FFB020\) 16%, transparent/);
  assert.match(acknowledge.background, /var\(--mrd-orbit-glass-surface\)$/);
  assert.equal(acknowledge['box-shadow'], 'var(--mrd-orbit-glass-shadow)');
  assert.equal(acknowledge.color, 'var(--mrd-orbit-ink)');
  assert.equal(acknowledge['font-weight'], '400');
});

test('the warning title overrides legacy tiny uppercase dark-room headings', () => {
  const legacySelector = '.m-dark .mobile-room-detail h2';
  const legacyStyles = postcss.parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
  let legacyImportantSize = false;
  legacyStyles.walkRules(rule => {
    if (rule.selectors.includes(legacySelector)) rule.walkDecls('font-size', declaration => { legacyImportantSize ||= declaration.important; });
  });
  assert.equal(legacyImportantSize, true, 'Inspect the real legacy heading rule responsible for the regression');
  const classSpecificity = selector => (selector.match(/\.[\w-]+/g) || []).length;
  assert.ok(classSpecificity(titleSelector) > classSpecificity(legacySelector), 'The warning title must outrank the legacy dark detail h2 rule regardless of stylesheet order');
  const title = declarationsFor(titleSelector);
  assert.equal(title['font-size'], 'clamp(22px, 6.05vw, 28px)');
  assert.equal(title['font-weight'], '400');
  assert.equal(title['text-transform'], 'none', 'Retain sentence-case clinical warning text rather than legacy uppercase styling');
  assert.equal(title['letter-spacing'], '-.035em');
  const important = {};
  stylesheet.walkRules(rule => {
    if (rule.selectors.includes(titleSelector)) rule.walkDecls(declaration => { important[declaration.prop] = declaration.important; });
  });
  for (const property of ['margin', 'color', 'font-size', 'font-weight']) {
    assert.equal(important[property], true, `${property} must override the legacy important heading styling`);
  }
});

test('warning dismissal controls retain visible focus and inherited reduced-motion coverage', () => {
  for (const className of ['rapid-surgery-close', 'rapid-surgery-acknowledge']) {
    const focus = declarationsFor(`${scope} .${className}:focus-visible`);
    assert.equal(focus.outline, '2px solid #E5DDFF');
    assert.equal(focus['outline-offset'], '3px');
  }
  let covered = false;
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes('.mobile-room-orbit *')) return;
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    if (!media.some(value => value.includes('prefers-reduced-motion: reduce'))) return;
    covered = true;
    const values = {};
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    assert.equal(values.transition, 'none');
    assert.equal(values.animation, 'none');
    assert.ok(media.some(value => /max-width:\s*767px/.test(value)));
  });
  assert.ok(covered, 'The descendant popup must inherit the orbit room reduced-motion rule');
});
