import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Static presentation contracts: no browser, session, database or clinical writes.
// Existing component/handler tests separately cover permissions and room actions.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const stylesheet = path => postcss.parse(read(path));
const globals = stylesheet('app/globals.css');
const shell = stylesheet('components/mobile/mobile-shell.css');
const overview = stylesheet('components/mobile/mobile-overview.css');
const detail = stylesheet('components/mobile/mobile-room-detail.css');
const spatial = stylesheet('components/spatial/mobile-spatial-dashboard.css');

function declarationsFor(css, selector, { excludeContainers = false } = {}) {
  const result = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    if (excludeContainers) {
      let ancestor = rule.parent;
      while (ancestor) {
        if (ancestor.type === 'atrule' && ancestor.name === 'container') return;
        ancestor = ancestor.parent;
      }
    }
    rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

test('shared mobile geometry has one 20px card, 16px inset and 17px semibold title contract', () => {
  const tokens = declarationsFor(globals, ':root');
  assert.equal(tokens['--m-card-radius'], '20px');
  assert.equal(tokens['--m-card-padding'], '16px');
  assert.equal(tokens['--m-card-title-size'], '17px');
  assert.equal(tokens['--m-card-title-weight'], '600');
  assert.equal(tokens['--m-page-title-size'], '28px');
  assert.equal(tokens['--m-page-gutter'], '20px');
  const card = declarationsFor(shell, '.m-unified-card');
  assert.equal(card['border-radius'], 'var(--m-card-radius)');
  assert.equal(card.background, 'var(--m-card)');
  const title = declarationsFor(shell, '.m-unified-card-title');
  assert.equal(title['font-size'], 'var(--m-card-title-size)');
  assert.equal(title['font-weight'], 'var(--m-card-title-weight)');
  assert.equal(title.margin, '0');
  assert.equal(title['text-transform'], 'none');
  assert.equal(title['overflow-wrap'], 'anywhere');
});

test('dark structural surfaces stay blue, while real clinical status colors are independent', () => {
  const tokens = declarationsFor(globals, '.m-dark');
  for (const key of ['--m-bg', '--m-card', '--m-card-solid', '--m-card-2', '--m-chip-track', '--m-control-surface']) {
    const value = tokens[key];
    assert.match(value, /^#[0-9a-f]{6}$/i, `${key} needs a concrete surface color`);
    const [red, green, blue] = value.slice(1).match(/../g).map(channel => parseInt(channel, 16));
    assert.ok(blue > green && green > red, `${key} must be navy/blue, not green or teal`);
  }
  assert.equal(tokens['--m-card'], tokens['--m-card-solid']);
  assert.match(tokens['--m-page-bg'], /^linear-gradient\(180deg,/);
  // Surface unification must not erase per-room colors that convey live state.
  assert.match(read('components/mobile/MobileRoomOverview.tsx'), /className="mro-status-dot" style=\{\{ background:\s*phase\.color/);
  assert.match(read('components/RoomDetail.tsx'), /'--room-phase-color':\s*activeColor/);
});

test('shared header puts one left-aligned 28px title in the 44px top toolbar without a kicker', () => {
  const source = read('components/mobile/MobileShell.tsx');
  const start = source.indexOf('export const MobileHeader:');
  const end = source.indexOf('export const MobileThemeToggle:');
  const header = source.slice(start, end);
  assert.ok(header.indexOf('mobile-heading-toolbar') < header.indexOf('mobile-heading-copy'));
  assert.ok(header.indexOf('<h1>') < header.indexOf('mobile-heading-actions'));
  assert.match(header, /<h1>\{title\}<\/h1>/);
  assert.equal((header.match(/<h1>/g) || []).length, 1);
  assert.doesNotMatch(header, /mobile-heading-kicker|\{kicker\}/);
  assert.match(header, /\{\(description \|\| secondary\) && \(/);
  assert.match(header, /\{showThemeToggle && <MobileThemeToggle \/>\}/);
  assert.equal(declarationsFor(shell, '.mobile-heading-toolbar')['min-height'], '44px');
  assert.equal(declarationsFor(shell, '.mobile-ios-header h1')['font-size'], 'var(--m-page-title-size)');
  for (const path of ['components/mobile/MobileRoomOverview.tsx', 'components/spatial/SpatialDashboardView.tsx', 'components/PlaceholderView.tsx']) {
    assert.match(read(path), /<MobileHeader\s/, `${path} should share header markup`);
  }
});

test('overview and module cards put the common title first, with a 16px content inset', () => {
  const source = read('components/mobile/MobileRoomOverview.tsx');
  assert.match(source, /className="mro-room m-unified-card"/);
  assert.match(source, /<strong className="m-unified-card-title">\{room\.name\}<\/strong>\s*<span className="mro-phase-label"/);
  assert.equal(declarationsFor(overview, '.mro-room-open').padding, 'var(--m-card-padding)');
  const shared = read('components/mobile/MobileShell.tsx');
  assert.match(shared, /className="m-unified-card mobile-header-metric min-w-0 p-4"/);
  assert.match(shared, /m-unified-card mobile-glass-card[^\n]*p-4/);
  for (const path of ['components/mobile/MobileFlowView.tsx', 'components/mobile/MobileTimelineView.tsx']) {
    const module = read(path);
    assert.match(module, /m-unified-card-header/);
    assert.match(module, /m-unified-card-title/);
    assert.match(module, /<MobileModuleHeader\s/);
  }
  const placeholder = read('components/PlaceholderView.tsx');
  assert.match(placeholder, /<MobileCard>\s*<h2 className="m-unified-card-title">/);
  assert.match(placeholder, /hidden md:flex/);
  assert.match(read('App.tsx'), /className="mobile-module-container/);
});

test('room detail retains shared surfaces and horizontal insets while adapting vertical density', () => {
  for (const [css, selector] of [
    [detail, '.mobile-room-reference .mrd-phase-card'],
    [detail, '.mobile-room-reference .mrd-time-card'],
    [detail, '.mobile-room-reference .mrd-staff'],
    [spatial, '.spatial-mobile-dashboard .spatial-room-panel'],
  ]) {
    const card = declarationsFor(css, selector, { excludeContainers: true });
    assert.equal(card['border-radius'], 'var(--m-card-radius)', selector);
    if (css === detail) {
      assert.match(card.padding, /^clamp\([^)]*cqh[^)]*\) var\(--m-card-padding\)$/, selector);
    } else {
      assert.equal(card.padding, 'var(--m-card-padding)', selector);
    }
    assert.equal(card.background, 'var(--m-card)', selector);
  }
  for (const [css, selector] of [
    [detail, '.mobile-room-detail.mobile-room-reference .mrd-phase-copy h2'],
    [detail, '.mobile-room-reference .mrd-time-label'],
    [spatial, '.spatial-mobile-dashboard .spatial-room-panel-heading h2'],
  ]) {
    const title = declarationsFor(css, selector, { excludeContainers: true });
    assert.equal(title['font-size'], 'var(--m-card-title-size)', selector);
    assert.equal(title['font-weight'], 'var(--m-card-title-weight)', selector);
    assert.equal(title.margin, '0', selector);
  }
  assert.equal(declarationsFor(spatial, '.spatial-mobile-dashboard .spatial-room-panel-heading > div')['padding-top'], '0');
  const source = read('components/RoomDetail.tsx');
  assert.match(source, /className="mrd-phase-copy">\s*<h2>/);
  assert.match(source, /className="mobile-room-detail mobile-room-reference flex md:hidden/);
});

test('all shared-card and room presentation rules remain phone-only, including short screens', () => {
  for (const css of [shell, overview, detail, spatial]) {
    css.walkRules(rule => {
      let ancestor = rule.parent;
      let phoneOnly = false;
      while (ancestor) {
        if (ancestor.type === 'atrule' && ancestor.name === 'media') {
          const maxWidth = ancestor.params.match(/max-width:\s*(\d+)px/);
          if (maxWidth && Number(maxWidth[1]) <= 767) phoneOnly = true;
        }
        ancestor = ancestor.parent;
      }
      assert.ok(phoneOnly, `${rule.selector} must not change desktop presentation`);
    });
  }
});
