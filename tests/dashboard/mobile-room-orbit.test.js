import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Structural layout contracts only. Pixel fidelity, viewport fit and real focus
// behavior are checked in the browser; these tests never mount a clinical app.
const stylesheet = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-orbit.css', import.meta.url), 'utf8'));
const scope = '.mobile-room-reference.mobile-room-orbit';
const root = '.mobile-room-detail.mobile-room-reference.mobile-room-orbit';

function declarationsFor(selector, condition = null, compact = false) {
  const result = {};
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    // The base reference and height-constrained composition are distinct
    // cascades; do not apply a short-phone override to a tall-screen contract.
    if (!compact && media.some(value => /max-height:/.test(value))) return;
    if (condition && !media.some(value => condition.test(value))) return;
    rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

test('every orbit appearance rule is restricted to an open phone-sized room detail', () => {
  let count = 0;
  stylesheet.walkRules(rule => {
    count += 1;
    assert.ok(rule.selectors.every(selector => selector.includes('.mobile-room-orbit')), `${rule.selector} must not style other modules or desktop`);
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => {
      const match = value.match(/max-width:\s*(\d+)px/);
      return match && Number(match[1]) <= 767;
    }), `${rule.selector} must remain below the desktop breakpoint`);
  });
  assert.ok(count > 20, 'The actual reference stylesheet must be inspected');
});

test('short phones size the real orbit from remaining space without scaling or clipping controls', () => {
  const compact = selector => declarationsFor(selector, null, true);
  assert.equal(compact(`${root} > .mrd-scroll-content`).flex, '1 0 auto');
  assert.match(compact(`${root} > .mrd-scroll-content`).padding, /84px \+ 2.98svh \+ env\(safe-area-inset-bottom/);
  const viewport = compact('.mobile-room-orbit .mrd-orbit-viewport');
  assert.equal(viewport.container, 'orbit-viewport / size');
  assert.equal(viewport.flex, '1 0 200px');
  assert.equal(viewport['min-height'], '200px', 'Keep readable diagram geometry when exceptional content needs scrolling');
  const stage = compact(`${root} .mrd-phase-card.mrd-orbit-stage`);
  assert.equal(stage.width, 'min(100cqw, 111.4286cqh)');
  assert.equal(stage['aspect-ratio'], '390 / 350');
  assert.equal(stage.transform, 'translate(-50%, -50%)');
  assert.equal(compact(root)['overflow-y'], 'auto', 'Do not hide alerts or enlarged text to fake a viewport fit');
  assert.ok(parseFloat(compact(`${scope} .mrd-action`)['min-height']) >= 44);
  assert.ok(parseFloat(compact(`${scope} .mrd-staff-row`)['min-height']) >= 44);
  assert.ok(parseFloat(compact(`${scope} .mrd-orbit-adjustments button`)['min-height']) >= 44);
  const source = readFileSync(new URL('../../components/RoomDetail.tsx', import.meta.url), 'utf8');
  assert.match(source, /className="mrd-orbit-viewport">\s*<section\s+className="mrd-phase-card mrd-orbit-stage"/);
});

test('the room scrolls vertically while the content reserves one dock and safe-area inset', () => {
  const shell = declarationsFor(root);
  assert.equal(shell.display, 'flex');
  assert.equal(shell['min-height'], '0');
  assert.equal(shell['overflow-y'], 'auto', 'Short screens must be able to reach every clinical control');
  assert.equal(shell['overflow-x'], 'hidden');
  assert.equal(shell.container, 'room-orbit / inline-size', 'Legacy height queries must not override the new composition');
  const content = declarationsFor(`${root} > .mrd-scroll-content`);
  assert.equal(content.display, 'flex');
  assert.equal(content.flex, '0 0 auto');
  assert.equal(content.overflow, 'visible');
  assert.match(content.padding, /calc\(100px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.equal(content['max-width'], '480px');
});

test('the live ring scales from available width without shrinking the clinical controls', () => {
  const stage = declarationsFor(`${root} .mrd-phase-card.mrd-orbit-stage`);
  assert.equal(stage.position, 'relative');
  assert.equal(stage['aspect-ratio'], '390 / 350');
  assert.equal(stage['min-width'], '0');
  assert.equal(stage['min-height'], '0');
  assert.equal(stage.overflow, 'visible');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-chart')['pointer-events'], 'none');
  assert.equal(declarationsFor(`${scope} .mrd-phase-steps.mrd-orbit-steps`)['pointer-events'], 'none');
  stylesheet.walkDecls('transform', declaration => {
    if (!/\bscale(?:3d|X|Y|Z)?\s*\(/i.test(declaration.value)) return;
    // Only the passive role image may compensate for padding inside its raster
    // asset. Scaling a button, label rail, chart or layout container is unsafe.
    assert.deepEqual(declaration.parent.selectors, [`${scope} .mrd-staff-row .mrd-staff-icon`]);
    const enlargement = declaration.value.match(/^scale\(\s*(\d+(?:\.\d+)?)\s*\)$/)?.[1];
    assert.ok(enlargement && Number(enlargement) >= 1, 'Decorative role images may enlarge, never shrink a clinical target');
  });
});

test('only the outer tick annulus gets a subtle passive reinforcement without changing the clinical ring', () => {
  const selector = '.mobile-room-orbit .mrd-orbit-stage::before';
  const outer = declarationsFor(selector);
  const dial = declarationsFor('.mobile-room-orbit .mrd-orbit-dial');
  assert.match(outer.content, /^(?:''|"")$/, 'The extra ticks must remain decoration rather than another field');
  for (const property of ['position', 'left', 'top', 'width', 'aspect-ratio', 'transform']) {
    assert.equal(outer[property], dial[property], `Reinforced ticks must preserve the existing dial ${property}`);
  }
  assert.equal(outer.background, "url('/images/mobile-orbit-dial.png') center / contain no-repeat");
  assert.equal(outer.opacity, '.1', 'The outer ticks should become only slightly stronger');
  assert.equal(dial.opacity, '.3', 'Do not brighten the inner tick ring or existing dial artwork');
  assert.equal(outer.filter, 'grayscale(1)');
  assert.equal(outer['pointer-events'], 'none', 'The overlay must not intercept clinical controls');
  const mask = 'radial-gradient(circle closest-side, transparent 89%, #000 90%)';
  assert.equal(outer['-webkit-mask-image'], mask);
  assert.equal(outer['mask-image'], mask, 'Keep the inner eighty-nine percent fully untouched');
  for (const property of ['box-shadow', 'text-shadow', 'border', 'stroke', 'stroke-width']) {
    assert.equal(outer[property], undefined, `Do not add ${property} or change tick thickness`);
  }
  let matchingRules = 0;
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    matchingRules += 1;
    assert.deepEqual(rule.selectors, [selector], 'The reinforcement is exclusive to the open orbit detail');
    const masks = [];
    rule.walkDecls(declaration => {
      if (['-webkit-mask-image', 'mask-image'].includes(declaration.prop)) masks.push(declaration.prop);
    });
    assert.deepEqual(masks, ['-webkit-mask-image', 'mask-image'], 'Keep the Safari prefix before the standard mask');
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => /max-width:\s*767px/.test(value)), 'Do not change the desktop dial');
  });
  assert.equal(matchingRules, 1);
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-track')['stroke-width'], '.75');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-progress')['stroke-width'], '2.1');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-progress').stroke, '#B6ADFF');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-active-segment')['stroke-width'], '6');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-active-segment').stroke, 'var(--mrd-orbit-accent)');
});

test('full room and phase names wrap only between words and remain visible', () => {
  for (const selector of [
    `${root} .mrd-room-name h1`,
    `${scope} .mrd-orbit-steps .mrd-step-name`,
    '.mobile-room-orbit .mrd-orbit-phase-title',
  ]) {
    const values = declarationsFor(selector);
    assert.equal(values['overflow-wrap'], 'normal');
    assert.equal(values['word-break'], 'normal');
    assert.notEqual(values.display, 'none');
    assert.notEqual(values.visibility, 'hidden');
    assert.notEqual(values.overflow, 'hidden');
    assert.equal(values['-webkit-line-clamp'], undefined);
  }
  const label = declarationsFor(`${scope} .mrd-orbit-steps .mrd-step-name`);
  assert.equal(label.hyphens, 'none');
  assert.equal(label['clip-path'], 'none');
  assert.equal(label['white-space'], 'normal');
});

test('the four reference actions, two timings and two personnel assignments retain their grids', () => {
  for (const [name, count] of [['mrd-actions', 4], ['mrd-timing', 2], ['mrd-staff-list', 2]]) {
    const values = declarationsFor(`${scope} .${name}`);
    assert.equal(values.display, 'grid');
    assert.equal(values['grid-template-columns'], `repeat(${count}, minmax(0, 1fr))`);
    assert.ok(!['fixed', 'absolute'].includes(values.position), `${name} must remain in normal flow`);
  }
  for (const selector of [
    `${scope} .mrd-back`,
    `${scope} .mrd-icon-button`,
    `${root} .mrd-phase-advance.mrd-orbit-current`,
    `${scope} .mrd-orbit-adjustments button`,
    `${scope} .mrd-action`,
    `${scope} .mrd-staff-row`,
  ]) {
    const values = declarationsFor(selector);
    assert.ok(parseFloat(values['min-width']) >= 44, `${selector} needs a 44px minimum width`);
    assert.ok(parseFloat(values['min-height']) >= 44, `${selector} needs a 44px minimum height`);
  }
});

test('all four action buttons use pale lavender tiles while personnel retains its original glass', () => {
  const tokens = declarationsFor(root);
  assert.equal(tokens['--mrd-orbit-action-surface'], 'linear-gradient(165deg, #EEECFF 0%, #C8C9FF 48%, #B9BFFF 100%)');
  assert.equal(tokens['--mrd-orbit-action-border'], '1px solid rgba(246, 243, 255, .85)');
  assert.equal(tokens['--mrd-orbit-action-shadow'], 'inset 0 1px 0 rgba(255, 255, 255, .65), 0 6px 18px rgba(8, 6, 35, .16)');
  assert.equal(tokens['--mrd-orbit-glass-surface'], 'rgba(146, 141, 190, .08)');
  assert.equal(tokens['--mrd-orbit-glass-border'], '.7px solid rgba(163, 153, 239, .25)');
  assert.equal(tokens['--mrd-orbit-glass-shadow'], 'inset 0 1px 0 rgba(255, 255, 255, .025)');
  const action = declarationsFor(`${scope} .mrd-action`, /max-width:\s*767px/);
  assert.equal(action.background, 'var(--mrd-orbit-action-surface)');
  assert.equal(action.border, 'var(--mrd-orbit-action-border)');
  assert.equal(action['box-shadow'], 'var(--mrd-orbit-action-shadow)');
  const staff = declarationsFor(`${scope} .mrd-staff`);
  assert.equal(staff.background, 'var(--mrd-orbit-glass-surface)', 'The new action tiles must not alter the personnel surface');
  assert.equal(staff.border, 'var(--mrd-orbit-glass-border)');
  assert.equal(staff['box-shadow'], 'var(--mrd-orbit-glass-shadow)');
  assert.equal(action.width, '100%');
  assert.equal(action['min-width'], '44px');
  assert.equal(action['min-height'], '78px');
  assert.equal(action.padding, '7px 2px');
  assert.equal(action.gap, '5px');
  assert.equal(action['border-radius'], '22px');
  const row = declarationsFor(`${scope} .mrd-actions`);
  assert.equal(row['grid-template-columns'], 'repeat(4, minmax(0, 1fr))');
  assert.equal(row.margin, '14px 12px 0');
});

test('lavender action labels and icons inherit dark ink with readable palette contrast', () => {
  const ink = 'var(--mrd-orbit-action-ink)';
  const tokens = declarationsFor(root);
  assert.equal(tokens['--mrd-orbit-action-ink'], '#100C62');
  assert.equal(declarationsFor(root)['--mrd-orbit-control-ink'], '#D3CEFF');
  assert.equal(declarationsFor(`${scope} .mrd-action`).color, ink);
  assert.equal(declarationsFor(`${scope} .mrd-staff-row strong`).color, 'var(--mrd-orbit-control-ink)', 'Keep light personnel text on its unchanged dark glass');
  for (const selector of [`${scope} .mrd-action svg`, `${scope} .mrd-action > span`, `${scope} .mrd-action small`]) {
    assert.equal(declarationsFor(selector).color, 'inherit', `${selector} must follow the enabled, disabled or active action ink`);
  }
  const rgb = hex => hex.match(/[\da-f]{2}/gi).map(channel => Number.parseInt(channel, 16) / 255);
  const luminance = channels => channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [.2126, .7152, .0722][index], 0);
  const text = luminance(rgb(tokens['--mrd-orbit-action-ink']));
  const surfaces = [...tokens['--mrd-orbit-action-surface'].matchAll(/#[\da-f]{6}/gi)].map(match => rgb(match[0]));
  assert.equal(surfaces.length, 3);
  for (const surface of surfaces) {
    assert.ok((luminance(surface) + .05) / (text + .05) >= 4.5, 'Dark action ink must remain readable on every lavender gradient stop');
    const disabledText = luminance(rgb(declarationsFor(`${scope} .mrd-action:disabled`).color));
    assert.ok((luminance(surface) + .05) / (disabledText + .05) >= 4.5, 'Muted disabled labels must remain readable on the lavender base');
    for (const tint of ['#20C997', '#5B8DEF', '#FFB020'].map(rgb)) {
      for (const strength of [.12, .42, .68]) {
        const activeSurface = surface.map((channel, index) => channel * (1 - strength) + tint[index] * strength);
        assert.ok((luminance(activeSurface) + .05) / (text + .05) >= 4.5, 'Dark ink must remain readable across the bounded active-gradient palette samples');
      }
    }
  }
});

test('each action tint uses its semantic color token without tinting inactive lavender controls', () => {
  for (const [action, tint] of [
    ['call', 'var(--color-success, #20C997)'],
    ['arrival', 'var(--color-info, #5B8DEF)'],
    ['hygiene', 'var(--color-warning, #FFB020)'],
    ['pause', 'var(--color-info, #5B8DEF)'],
  ]) {
    const values = declarationsFor(`${scope} .mrd-action[data-action="${action}"]`);
    assert.equal(values['--mrd-orbit-action-tint'], tint, `${action} must use its requested semantic action color`);
    assert.equal(values.background, undefined, 'A tint identity alone must not color an inactive action');
    assert.equal(values['border-color'], undefined, 'A tint identity alone must not change the inactive pale outline');
  }
  assert.doesNotMatch(declarationsFor(`${scope} .mrd-action`).background, /--mrd-orbit-action-tint/);
  stylesheet.walkDecls(declaration => {
    if (!/^background(?:-|$)/.test(declaration.prop) || !declaration.value.includes('--mrd-orbit-action-tint')) return;
    assert.ok(declaration.parent.selectors.every(selector => selector.includes('.mrd-action.is-active')), 'Only an active action may apply the tint overlay');
  });
});

test('active actions add a nonuniform color gradient over lavender and disabled states preserve it', () => {
  for (const selector of [
    `${scope} .mrd-action:disabled`,
    `${scope} .mrd-action.is-active:disabled`,
  ]) {
    const values = declarationsFor(selector);
    assert.equal(values.background, undefined, `${selector} must not override the lavender base or active color gradient`);
    assert.ok(values['box-shadow'] === undefined || values['box-shadow'] === 'var(--mrd-orbit-action-shadow)', `${selector} must preserve the action tile shading`);
    assert.ok(values.opacity === undefined || values.opacity === '1', `${selector} must not change the shared fill by fading the entire control`);
  }
  const active = declarationsFor(`${scope} .mrd-action.is-active`);
  const disabled = declarationsFor(`${scope} .mrd-action:disabled`);
  const activeDisabled = declarationsFor(`${scope} .mrd-action.is-active:disabled`);
  assert.equal(active['border-color'], 'color-mix(in srgb, var(--mrd-orbit-action-tint) 45%, rgba(220, 214, 255, .9))');
  assert.match(active.background, /^linear-gradient\(135deg,/);
  const overlays = [...active.background.matchAll(/color-mix\(in srgb, var\(--mrd-orbit-action-tint\) (\d+)%, transparent\) (\d+)%/g)];
  assert.equal(overlays.length, 3, 'Use the requested visible gradient rather than a uniform tint veil');
  assert.deepEqual(overlays.map(match => [Number(match[1]), Number(match[2])]), [[28, 0], [62, 55], [84, 100]]);
  assert.match(active.background, /,\s*var\(--mrd-orbit-action-surface\)$/, 'The active gradient must retain the pale action tile underneath');
  assert.doesNotMatch(active.background, /--mrd-orbit-(?:phase-color|accent)/, 'Action state tint must be independent of the current workflow phase color');
  assert.equal(active['box-shadow'], 'var(--mrd-orbit-action-shadow)');
  assert.equal(active.color, 'var(--mrd-orbit-action-ink)', 'Active gradients retain the same readable dark icon and text ink');
  assert.equal(disabled.opacity, '1');
  assert.equal(disabled.color, '#51496F');
  assert.equal(activeDisabled.opacity, '1');
  assert.equal(activeDisabled.color, active.color, 'An active disabled action must retain its readable active-state ink');
});

test('the hygiene action uses its existing alpha artwork as a tintable iOS-compatible mask', () => {
  const glyph = declarationsFor('.mobile-room-orbit .mrd-action-hygiene-icon');
  assert.equal(glyph['background-color'], 'currentColor');
  const mask = "url('/images/mobile-orbit-hygiene.png') center / contain no-repeat";
  assert.equal(glyph.mask, mask);
  assert.equal(glyph['-webkit-mask'], mask, 'The hygiene glyph must remain visible and tintable in iOS Safari');
  assert.equal(glyph.width, '45px');
  assert.equal(glyph.height, '45px');
  assert.equal(glyph.margin, '-8px 0');
  assert.ok(statSync(new URL('../../public/images/mobile-orbit-hygiene.png', import.meta.url)).size > 1000);
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-action > img').width, undefined, 'The old dark raster image must not style the tintable hygiene glyph');
});

test('reference artwork is a local backdrop, not a remote screenshot replacing interactive controls', () => {
  const shell = declarationsFor(root);
  const assetPath = shell.background.match(/url\(['"](\/images\/mobile-orbit-background(?:-v\d+)?\.png)['"]\)/)?.[1];
  assert.ok(assetPath, 'The background shorthand must retain the local reference artwork');
  assert.ok(statSync(new URL(`../../public${assetPath}`, import.meta.url)).size > 1000);
  assert.equal(shell['background-size'], '100% 100%, 100% auto', 'The veil covers the canvas while the reference artwork retains its width-scaled proportions');
  assert.equal(shell['background-attachment'], 'local', 'The reference artwork must scroll with the full room detail');

  // Regression: the legacy dark-theme shorthand resets background-image to
  // none, even when its unlayered stylesheet is imported before this file.
  const important = {};
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes(root)) return;
    rule.walkDecls(declaration => { important[declaration.prop] = declaration.important; });
  });
  assert.equal(important.background, true, 'A plain background-image loses to the legacy important shorthand');
  assert.equal(important['background-size'], true);
  const legacySelector = '.m-dark .mobile-room-detail';
  const legacyStyles = postcss.parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
  let legacyImportant = false;
  legacyStyles.walkRules(rule => {
    if (rule.selectors.includes(legacySelector)) rule.walkDecls('background', declaration => { legacyImportant ||= declaration.important; });
  });
  if (legacyImportant) {
    const classSpecificity = selector => (selector.match(/\.[\w-]+/g) || []).length;
    assert.ok(classSpecificity(root) > classSpecificity(legacySelector), 'The reference background must outrank the important dark-theme reset');
  }
  stylesheet.walkDecls(declaration => assert.doesNotMatch(declaration.value, /https?:\/\//));
  assert.equal(declarationsFor(`${root} .mrd-phase-card.mrd-orbit-stage`).background, 'transparent');
});

test('the continuous blue canvas remains independent of the live phase color', () => {
  const shell = declarationsFor(root);
  assert.equal(shell['--mrd-orbit-floor'], '#0B102C', 'The slightly darker navy floor must remain fixed');
  assert.match(shell.background, /^linear-gradient\(to bottom,/, 'Darken only the backdrop with a native gradient veil');
  assert.match(shell.background, /var\(--mrd-orbit-floor\) url\(/, 'The artwork and its continuation must share the same navy floor');
  assert.doesNotMatch(shell.background, /var\(--mrd-orbit-(?:phase-color|accent)\)/, 'Phase identity belongs to the ring and icon, not the restored blue canvas');
  assert.equal(shell['background-blend-mode'], undefined, 'Do not recolor the reference artwork by luminosity blending');
  assert.match(shell.background, /\/\s*100% auto no-repeat$/, 'Do not crop, stretch or tile the raster artwork to hide its bottom edge');
  assert.equal(shell['background-color'], undefined, 'Do not replace the fixed shorthand color with a phase fill');
  assert.equal(shell.filter, undefined, 'Do not tint text and clinical controls by filtering the entire room');
  assert.equal(shell['mix-blend-mode'], undefined, 'Do not blend the restored room canvas or its contents');
});

test('only enhanced hygiene recolors the complete mobile backdrop to dark orange', () => {
  const selector = `${root}[data-hygiene='true']`;
  const hygiene = declarationsFor(selector);
  const base = declarationsFor(root);
  assert.equal(hygiene['--mrd-orbit-floor'], '#241208');
  assert.match(hygiene.background, /#7A390D url\('/, 'Apply the orange fill to the complete room canvas, not an added banner or field');
  assert.equal(hygiene['background-blend-mode'], 'normal, luminosity', 'Preserve the artwork light and wave detail while recoloring only its raster layer');
  assert.equal(hygiene.filter, undefined, 'Do not recolor clinical controls or text with a full-UI filter');
  assert.equal(hygiene['mix-blend-mode'], undefined);
  assert.equal(hygiene.color, undefined, 'Keep the existing readable foreground colors');
  assert.equal(hygiene['--mrd-orbit-accent'], undefined);
  assert.equal(hygiene['--mrd-orbit-phase-color'], undefined, 'Hygiene must not erase the actual workflow phase identity');
  assert.doesNotMatch(hygiene.background, /--mrd-orbit-(?:phase-color|accent)/);
  const asset = value => value.match(/url\(['"]([^'"]+)['"]\)/)?.[1];
  assert.equal(asset(hygiene.background), asset(base.background), 'Reuse the same background artwork rather than adding a clinical information block');
  assert.match(hygiene.background, /\/\s*100% auto no-repeat$/, 'Preserve the reference artwork proportions in hygiene mode');
  assert.equal(hygiene['background-size'], base['background-size'], 'Keep the full-canvas veil and proportional raster layer geometry unchanged');
  assert.match(hygiene.background, /^linear-gradient\(to bottom,/);
  assert.match(hygiene.background, /rgba\(0,\s*0,\s*0,\s*\.24\)\s+calc\(var\(--mrd-orbit-art-height\) - 184px\)/);
  assert.match(hygiene.background, /var\(--mrd-orbit-floor\)\s+calc\(var\(--mrd-orbit-art-height\) - 24px\)/, 'Hygiene must keep the continuous lower feather instead of reintroducing a raster seam');

  let blendRules = 0;
  stylesheet.walkDecls('background-blend-mode', declaration => {
    blendRules += 1;
    assert.deepEqual(declaration.parent.selectors, [selector], 'Background recoloring is allowed only on the actual hygiene-mode mobile root');
  });
  assert.equal(blendRules, 1);
  let important = false;
  stylesheet.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls('background', declaration => { important ||= declaration.important; });
  });
  assert.equal(important, true, 'The real hygiene canvas must outrank the legacy dark-theme shorthand');
});

test('the raster fades continuously into the navy floor before its bottom edge', () => {
  const shell = declarationsFor(root);
  const assetPath = shell.background.match(/url\(['"](\/images\/mobile-orbit-background(?:-v\d+)?\.png)['"]\)/)?.[1];
  assert.ok(assetPath);
  const png = readFileSync(new URL(`../../public${assetPath}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', 'Measure the actual local artwork rather than assuming its aspect ratio');
  const artworkWidth = png.readUInt32BE(16);
  const artworkHeight = png.readUInt32BE(20);
  const artHeight = shell['--mrd-orbit-art-height'].match(/^(\d+(?:\.\d+)?)vw$/);
  assert.ok(artHeight, 'The fade must follow the width-scaled artwork height, not the viewport height');
  const heightPerViewportWidth = Number(artHeight[1]);
  assert.ok(Math.abs(heightPerViewportWidth - artworkHeight / artworkWidth * 100) < .0001, 'The fade must stay aligned with the real artwork aspect ratio');

  const veil = [...shell.background.matchAll(/rgba\(0,\s*0,\s*0,\s*(\.\d+|\d+(?:\.\d+)?)\)/g)].map(match => Number(match[1]));
  assert.equal(veil.length, 2, 'Keep a stable slight dark veil before the bottom feather');
  assert.equal(veil[0], veil[1]);
  assert.equal(veil[0], .12, 'Only the room detail uses the brighter reference background');
  const fadeStart = shell.background.match(/rgba\(0,\s*0,\s*0,\s*(?:\.\d+|\d+(?:\.\d+)?)\)\s+calc\(var\(--mrd-orbit-art-height\) - (\d+)px\)/)?.[1];
  const fadeEnd = shell.background.match(/var\(--mrd-orbit-floor\)\s+calc\(var\(--mrd-orbit-art-height\) - (\d+)px\)/)?.[1];
  assert.ok(fadeStart && fadeEnd, 'A feather must end with the same opaque floor used beneath the raster');
  assert.ok(Number(fadeStart) - Number(fadeEnd) >= 100, 'Keep a real gradual transition instead of a hard color stop');
  assert.ok(Number(fadeEnd) >= 24, 'Finish the opaque fade before the raster edge, allowing for scrollbar width');
  for (const width of [320, 390, 418, 430, 767]) {
    const displayedArtworkHeight = width * heightPerViewportWidth / 100;
    const start = displayedArtworkHeight - Number(fadeStart);
    const end = displayedArtworkHeight - Number(fadeEnd);
    assert.ok(start > 0 && start < end && end < displayedArtworkHeight, `The feather must cover the artwork edge at ${width}px`);
  }
});

test('the active phase owns the ring and readable icon tint, independent of operational warning colors', () => {
  assert.equal(declarationsFor(root)['--mrd-orbit-accent'], 'var(--mrd-orbit-phase-color, #7890A8)');
  assert.equal(declarationsFor(root)['--mrd-orbit-phase-ink'], '#D3CEFF');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-active-segment').stroke, 'var(--mrd-orbit-accent)');
  assert.equal(declarationsFor(`${scope} .mrd-orbit-steps .is-current .mrd-step-marker`).background, 'var(--mrd-orbit-accent)');
  assert.equal(declarationsFor('.mobile-room-orbit .mrd-orbit-phase-icon').color, 'var(--mrd-orbit-phase-ink)');
  stylesheet.walkRules(rule => {
    if (/data-(?:emergency|locked|paused)/.test(rule.selector)) {
      rule.walkDecls('--mrd-orbit-accent', () => assert.fail('Warnings must remain separate from phase identity'));
      rule.walkDecls('--mrd-orbit-phase-color', () => assert.fail('Warnings must not override the configured phase identity'));
      // Child warning badges may retain their own explicit contrast color, but
      // an operational state must never replace the restored blue root canvas.
      if (rule.selectors.some(selector => /^\.mobile-room(?:-detail|-reference|-orbit)[^\s>+~]*\[data-(?:emergency|locked|paused)/.test(selector))) {
        rule.walkDecls(declaration => {
          assert.ok(!/^background(?:-|$)/.test(declaration.prop), 'Operational state selectors must not replace the reference blue backdrop');
        });
      }
    }
  });
  const mask = declarationsFor('.mobile-room-orbit .mrd-orbit-phase-mask');
  assert.equal(mask['background-color'], 'currentColor');
  assert.match(mask.mask, /var\(--mrd-orbit-phase-mask\)/);
  assert.match(mask['-webkit-mask'], /var\(--mrd-orbit-phase-mask\)/, 'The alpha artwork must work in iOS Safari');
  for (const [kind, filename] of [['table', 'operating-table'], ['scalpel', 'scalpel']]) {
    const values = declarationsFor(`.mobile-room-orbit .mrd-orbit-phase-mask--${kind}`);
    assert.equal(values['--mrd-orbit-phase-mask'], `url('/images/mobile-orbit-${filename}.png')`);
    assert.ok(statSync(new URL(`../../public/images/mobile-orbit-${filename}.png`, import.meta.url)).size > 1000);
  }
});

test('reduced-motion preferences disable decorative transitions and animations', () => {
  const rules = [];
  stylesheet.walkRules(rule => {
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('prefers-reduced-motion: reduce'))) parent = parent.parent;
    if (parent) rules.push(rule);
  });
  assert.ok(rules.length > 0);
  const values = {};
  rules.forEach(rule => rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; }));
  assert.equal(values.animation, 'none');
  assert.equal(values.transition, 'none');
});
