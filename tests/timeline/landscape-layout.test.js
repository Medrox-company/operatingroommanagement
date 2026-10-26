import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Časová osa na iPhonu na šířku: žádný text se nesmí překrývat a na počítači
// ani iPadu se rozvržení nemění.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const SHORT = '(min-width: 768px) and (max-height: 520px)';
const css = postcss.parse(read('components/timeline/timeline-landscape.css'));
const timeline = read('components/TimelineModule.tsx');
const row = read('components/timeline/TimelineRoomRow.tsx');

function rulesIn(media) {
  const rules = new Map();
  css.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name === 'container') return;
    const parent = rule.parent.type === 'atrule' && rule.parent.name === 'media' ? rule.parent.params : null;
    if (parent !== media) return;
    const values = {};
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value + (declaration.important ? ' !important' : ''); });
    rules.set(rule.selectors.join(', '), values);
  });
  return rules;
}

test('sloupec sálů, osa, mřížka i čára „teď" sdílejí jednu šířku', () => {
  const constants = read('components/timeline/constants.ts');
  assert.match(constants, /export const ROOM_LABEL_WIDTH = 320;/);
  assert.match(constants, /export const ROOM_LABEL_WIDTH_CSS = `var\(--tl-label-w, \$\{ROOM_LABEL_WIDTH\}px\)`;/);
  for (const path of ['components/TimelineModule.tsx', 'components/timeline/TimelineRoomRow.tsx',
    'components/timeline/TimelineAxisHeader.tsx', 'components/timeline/AcuteProposalLane.tsx']) {
    const source = read(path).replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(source, /\bROOM_LABEL_WIDTH\b(?!_CSS)/, `${path} nesmí počítat s pevnými 320 px`);
  }
  assert.match(timeline, /left: `calc\(\$\{ROOM_LABEL_WIDTH_CSS\} \+ \(\(100% - \$\{ROOM_LABEL_WIDTH_CSS\}\) \* \$\{nowPercent \/ 100\}\)\)`/);
  assert.match(timeline, /style=\{\{ left: ROOM_LABEL_WIDTH_CSS, right: 0 \}\}/);
  assert.match(timeline, /const labelWidth = roomLabelWidthPx\(e\.currentTarget\);/);
  assert.match(timeline, /import '\.\/timeline\/timeline-landscape\.css';/);
});

test('na nízké obrazovce je hlavička v jednom řádku a řádky mají výšku dotykového cíle', () => {
  const short = rulesIn(SHORT);
  assert.equal(short.get('.timeline-desktop-workspace')['--tl-label-w'], '196px');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-commandbar')['grid-template-columns'], 'max-content minmax(0, 1fr) max-content');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-commandbar .timeline-status-group:has(.timeline-status-tile)')['grid-column'], 'auto');
  const rowRule = short.get('.timeline-desktop-workspace .timeline-room-row');
  assert.equal(rowRule['min-height'], '44px !important');
  assert.equal(rowRule.flex, '1 0 auto !important', 'řádek nesmí být nižší než jeho obsah');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-rows-canvas, .timeline-desktop-workspace .timeline-rows').height, 'auto !important');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-room-filter')['font-size'], '11px');
  assert.match(timeline, /timeline-rows-canvas relative/);
  assert.match(timeline, /timeline-rows relative z-10 flex flex-col/);
});

test('stav sálu je pod názvem místo karty přes osu; popisky úseků jen tam, kam se vejdou', () => {
  assert.equal(rulesIn(null).get('.timeline-desktop-workspace .timeline-room-status-line').display, 'none',
    'na počítači a iPadu zůstává karta vpravo');
  const short = rulesIn(SHORT);
  for (const selector of ['.timeline-room-availability-summary', '.timeline-room-department', '.timeline-now-chip', '.timeline-overrun-label']) {
    assert.equal(short.get(`.timeline-desktop-workspace ${selector}`).display, 'none', selector);
  }
  assert.equal(short.get('.timeline-desktop-workspace .timeline-room-status-line').display, 'flex');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-operation-block')['container-type'], 'inline-size');
  const containers = [];
  css.walkAtRules('container', rule => {
    rule.walkRules(inner => containers.push([rule.params, inner.selector, inner.first.value]));
  });
  assert.deepEqual(containers, [
    ['(max-width: 72px)', '.timeline-desktop-workspace .timeline-operation-label', 'none'],
    ['(max-width: 190px)', '.timeline-desktop-workspace .timeline-remaining-pill', 'none'],
    ['(max-width: 190px)', '.timeline-desktop-workspace .timeline-overrun-label', 'inline'],
  ]);
  assert.doesNotMatch(row.slice(row.indexOf('const roomStatusLine'), row.indexOf('const availabilityBadge')),
    /<p[^>]*aria-hidden/, 'stav pod názvem čte i čtečka obrazovky');
  assert.equal((row.match(/\{roomStatusLine\}/g) ?? []).length, 2, 'běžný i nouzový řádek');
  assert.match(row, /className="timeline-room-status-line[^"]*"[\s\S]*?\{availabilityStatus\.label\}/);
  assert.match(row, /className="timeline-remaining-pill /);
  assert.match(row, /className="timeline-overrun-label /);
});

test('se dvěma stavovými dlaždicemi se hlavička vejde bez překryvu', () => {
  const short = rulesIn(SHORT);
  assert.equal(short.get('.timeline-desktop-workspace .timeline-commandbar:has(.timeline-acute-control) :is(.timeline-status-icon, .timeline-acute-icon, .timeline-clock-clean)').display, 'none');
  assert.equal(short.get('.timeline-desktop-workspace .timeline-status-group:has(.timeline-acute-control)').display, 'flex');
  assert.equal((timeline.match(/timeline-status-icon /g) ?? []).length, 2, 'ikona ARO v obou stavech');
});

test('pomocná funkce vrací skutečnou šířku sloupce z CSS proměnné', async () => {
  const ts = (await import('typescript')).default;
  const { outputText } = ts.transpileModule(read('components/timeline/constants.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const run = getComputedStyle => {
    const module = { exports: {} };
    new Function('module', 'exports', 'getComputedStyle', outputText)(module, module.exports, getComputedStyle);
    return module.exports.roomLabelWidthPx;
  };
  const style = value => () => ({ getPropertyValue: name => (name === '--tl-label-w' ? value : '') });
  assert.equal(run(style(' 196px'))({}), 196, 'na nízké obrazovce');
  assert.equal(run(style(''))({}), 320, 'bez proměnné výchozích 320 px');
  assert.equal(run(style('196px'))(null), 320);
});
