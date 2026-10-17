import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Static presentation contracts only. Browser QA checks the actual line boxes;
// these tests never open a session, contact a database or alter a room status.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('components/mobile/mobile-cliniq.css'));
const scope = 'html[data-app-design="cliniq"]';
const headingSelector = `${scope} .mobile-room-overview .mobile-heading-toolbar > h1`;
const lightCardSelector = `${scope} .mro-room.m-unified-card`;
const darkCardSelector = `${scope}.m-dark .mro-room.m-unified-card`;

function rulesFor(selector) {
  const rules = [];
  css.walkRules(rule => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  assert.ok(rules.length > 0, `Missing presentation rule: ${selector}`);
  return rules;
}

function declarationsFor(selector) {
  const declarations = {};
  for (const rule of rulesFor(selector)) {
    rule.nodes.filter(node => node.type === 'decl').forEach(declaration => {
      declarations[declaration.prop] = declaration.value;
    });
  }
  return declarations;
}

function assertOptionalPhoneScope(rule) {
  for (const selector of rule.selectors) {
    assert.ok(selector.startsWith(scope), `Must not modify the original design: ${selector}`);
  }
  let ancestor = rule.parent;
  let mobileOnly = false;
  while (ancestor) {
    if (ancestor.type === 'atrule' && ancestor.name === 'media') {
      const width = ancestor.params.match(/max-width:\s*(\d+)px/);
      if (width && Number(width[1]) <= 767) mobileOnly = true;
    }
    ancestor = ancestor.parent;
  }
  assert.ok(mobileOnly, `Must not change desktop presentation: ${rule.selector}`);
}

function tokensFor(stylesheet, selector) {
  const values = {};
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.nodes.filter(node => node.type === 'decl' && node.prop.startsWith('--')).forEach(declaration => {
      values[declaration.prop] = declaration.value;
    });
  });
  return values;
}

function rgb(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i, 'Use actual concrete sRGB palette tokens');
  return hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
}

function colorValue(value, tokens) {
  const variable = value.match(/^var\((--[\w-]+)\)$/);
  return rgb(variable ? tokens[variable[1]] : value);
}

const mix = (foreground, background, alpha) => foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
function luminance(color) {
  const linear = color.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

test('Cliniq overview title wraps only between whole words without clipping or hyphenation', () => {
  const heading = declarationsFor(headingSelector);
  assert.equal(heading['overflow-wrap'], 'normal', 'Do not inherit the shared anywhere letter wrapping');
  assert.ok(['normal', 'keep-all'].includes(heading['word-break']), 'Do not split Přehled into letters');
  assert.equal(heading.hyphens, 'none');
  assert.equal(heading['-webkit-hyphens'], 'none', 'iOS Safari must preserve the same whole-word contract');
  assert.notEqual(heading['white-space'], 'nowrap', 'The title may occupy two lines at the word boundary');
  assert.notEqual(heading.overflow, 'hidden');
  assert.notEqual(heading['text-overflow'], 'ellipsis');
  assert.equal(heading['-webkit-line-clamp'], undefined);
  assert.match(read('components/mobile/MobileRoomOverview.tsx'), /<MobileHeader\s+kicker="Operační blok"\s+title="Přehled sálů"/);
});

test('overview heading protection is limited to optional Cliniq on phone-sized screens', () => {
  rulesFor(headingSelector).forEach(assertOptionalPhoneScope);
  assert.ok(headingSelector.includes('.mobile-room-overview'), 'Other module headers keep their own layout');
});

test('title and header controls can move to another row instead of forcing a word narrower than its letters', () => {
  const toolbarSelector = `${scope} .mobile-room-overview .mobile-heading-toolbar`;
  const actionSelector = `${scope} .mobile-room-overview .mobile-heading-actions`;
  const title = declarationsFor(headingSelector);
  assert.match(title.flex, /\b0\s+min-content$/, 'The title may grow, but must not shrink below its complete longest word');
  assert.equal(title['max-width'], '100%');
  assert.equal(declarationsFor(toolbarSelector)['flex-wrap'], 'wrap');
  const actions = declarationsFor(actionSelector);
  assert.equal(actions['flex-wrap'], 'wrap');
  assert.equal(actions['max-width'], '100%', 'Even the complete control group stays within a narrow display');
  rulesFor(toolbarSelector).forEach(assertOptionalPhoneScope);
  rulesFor(actionSelector).forEach(assertOptionalPhoneScope);
});

for (const [theme, selector, previous] of [
  ['light', lightCardSelector, [17, 5]],
  ['dark', darkCardSelector, [18, 0]],
]) {
  test(`Cliniq ${theme} cards have a stronger but still soft hospital-color gradient`, () => {
    const background = declarationsFor(selector).background;
    assert.match(background, /^linear-gradient\(/);
    const stops = [...background.matchAll(/color-mix\(in srgb,\s*var\(--room-phase-color\)\s+(\d+(?:\.\d+)?)%/g)]
      .map(match => Number(match[1]));
    assert.equal(stops.length, 2, 'Both ends of the card keep a phase tint rather than fading to a flat neutral surface');
    assert.ok(stops[0] > stops[1], 'A real transition remains visible across the whole card');
    stops.forEach((strength, index) => {
      assert.ok(strength > previous[index], `${theme} stop ${index + 1} must distinguish phases better than the former tint`);
      assert.ok(strength < 50, 'The card stays a legible tinted surface, not a solid saturated phase color');
    });
    assert.match(background, theme === 'light' ? /#FFFFFF/i : /var\(--m-card-solid\)/);
    rulesFor(selector).forEach(assertOptionalPhoneScope);
  });
}

test('legacy Cliniq gradients retain grid/rows support while the selected orbit uses configured workflow colors', () => {
  const gradientRules = [];
  css.walkRules(rule => {
    if (!rule.selectors.some(selector => selector.includes('.mro-room'))) return;
    const backgrounds = rule.nodes.filter(node => node.type === 'decl' && node.prop === 'background');
    if (backgrounds.some(declaration => declaration.value.includes('linear-gradient('))) gradientRules.push(rule);
  });
  assert.equal(gradientRules.length, 2, 'Keep one common light gradient and one common dark gradient');
  gradientRules.forEach(rule => {
    assert.doesNotMatch(rule.selector, /data-layout|data-emphasized|data-emergency/,
      'Layout and ready status must not bypass the common configured-color surface');
    assertOptionalPhoneScope(rule);
  });
  const overview = read('components/mobile/MobileRoomOverview.tsx');
  assert.match(overview, /const phase = mobileRoomPhase\(room, workflowStatuses\)/);
  assert.match(overview, /const configuredPhase = mobileRoomPhaseVisual\(workflowStatuses\[room\.currentStepIndex\]\)/);
  assert.match(overview, /'--room-phase-color':\s*cliniq \? configuredPhase\.color : phase\.color/, 'Only the optional orbit changes phase-color ownership; classic keeps its original warning semantics');
  assert.match(overview, /data-layout=\{cliniq \? layout : 'grid'\}/);
});

test('small card text stays at normal-text contrast across both gradient ends and the timing inset', () => {
  const globals = postcss.parse(read('app/globals.css'));
  const rootTokens = tokensFor(globals, ':root');
  const lightTokens = { ...rootTokens, ...tokensFor(css, `${scope}:not(.m-dark)`) };
  const darkTokens = { ...rootTokens, ...tokensFor(globals, '.m-dark') };

  for (const [theme, selector, tokens] of [
    ['light', lightCardSelector, lightTokens],
    ['dark', darkCardSelector, darkTokens],
  ]) {
    const background = declarationsFor(selector).background;
    const stops = [...background.matchAll(/var\(--room-phase-color\)\s+(\d+(?:\.\d+)?)%/g)].map(match => Number(match[1]) / 100);
    const base = theme === 'light' ? colorValue(background.match(/,\s*(#[\da-f]{6})\)/i)[1], tokens) : colorValue('var(--m-card-solid)', tokens);
    const commonInset = declarationsFor(`${scope} .mro-room-time`);
    const inset = theme === 'dark' ? { ...commonInset, ...declarationsFor(`${scope}.m-dark .mro-room-time`) } : commonInset;
    const channels = inset.background.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/);
    assert.ok(channels, 'Read the real timing-inset surface and alpha instead of hard-coding the former design');
    const insetColor = channels.slice(1, 4).map(Number).map(channel => channel / 255);
    const insetAlpha = Number(channels[4]);

    const textStyles = [
      ['room name', declarationsFor(`${scope} .mro-room-identity strong`).color, false],
      ['phase name', declarationsFor(`${scope} .mro-phase-label`).color, false],
      ['clinical note', declarationsFor(`${scope} .mro-room-identity small`).color, false],
      ['timing value', declarationsFor(`${scope} .mro-room-time strong`).color, true],
      ['timing caption', theme === 'dark'
        ? declarationsFor(`${scope}.m-dark .mro-room-metric > span`).color
        : declarationsFor(`${scope} .mro-room-metric > span`).color, true],
    ];
    // Black and white hospital-configured phases bound the sRGB channel range;
    // each gradient stop is checked before and after the translucent time band.
    for (const phase of ['#000000', '#FFFFFF']) {
      for (const strength of stops) {
        const card = mix(rgb(phase), base, strength);
        const timing = mix(insetColor, card, insetAlpha);
        for (const [label, color, onTiming] of textStyles) {
          const ratio = contrast(colorValue(color, tokens), onTiming ? timing : card);
          assert.ok(ratio >= 4.5, `${theme} ${label} on ${phase} at ${strength * 100}% must reach 4.5:1; actual ${ratio.toFixed(3)}:1`);
        }
      }
    }
  }
});

test('only light optional Cliniq uses a gentle neutral grey-to-white phone background', () => {
  const selector = `${scope}:not(.m-dark)`;
  const light = declarationsFor(selector);
  const background = light['--m-page-bg'];
  assert.match(background, /^linear-gradient\(180deg,/,
    'The page transitions vertically instead of using a flat surface');
  const stops = [...background.matchAll(/(#[\da-f]{6})\s+(\d+(?:\.\d+)?)%/gi)]
    .map(match => ({ color: rgb(match[1]), position: Number(match[2]) }));
  assert.equal(stops.length, 3, 'Keep a gentle intermediate shade between grey and white');
  assert.equal(stops[0].position, 0);
  assert.equal(stops.at(-1).position, 100);
  assert.deepEqual(stops.at(-1).color, [1, 1, 1], 'The lower end must be pure white');
  stops.forEach((stop, index) => {
    assert.equal(stop.color[0], stop.color[1], 'Neutral grey has no blue or colored cast');
    assert.equal(stop.color[1], stop.color[2]);
    assert.ok(stop.color[0] >= .9, 'The grey must stay a very light working surface');
    if (index > 0) {
      assert.ok(stop.position > stops[index - 1].position);
      assert.ok(luminance(stop.color) > luminance(stops[index - 1].color),
        'Each stop becomes lighter on the way to white');
    }
  });
  const fallback = rgb(light['--m-bg']);
  assert.equal(fallback[0], fallback[1]);
  assert.equal(fallback[1], fallback[2]);
  assert.ok(fallback[0] >= .9, 'The solid fallback matches the same light neutral environment');

  const backgroundOwners = [];
  css.walkRules(rule => {
    if (rule.nodes.some(node => node.type === 'decl' && ['--m-bg', '--m-page-bg'].includes(node.prop))) {
      backgroundOwners.push(rule);
    }
  });
  assert.equal(backgroundOwners.length, 1, 'Do not introduce a second override for dark or original designs');
  assert.deepEqual(backgroundOwners[0].selectors, [selector]);
  assertOptionalPhoneScope(backgroundOwners[0]);
  assert.equal(declarationsFor(`${scope} .dashboard-module`).background, 'var(--m-page-bg)');

  const globals = postcss.parse(read('app/globals.css'));
  assert.equal(tokensFor(globals, ':root')['--m-bg'], '#F3F9FD', 'Original light appearance stays intact');
  assert.equal(tokensFor(globals, ':root')['--m-page-bg'],
    'linear-gradient(180deg, #F5FAFE 0%, #EEF6FC 100%)');
  assert.equal(tokensFor(globals, '.m-dark')['--m-bg'], '#050D2D', 'Saved dark appearance stays intact');
  assert.equal(tokensFor(globals, '.m-dark')['--m-page-bg'], 'var(--app-spatial-background)');
});
