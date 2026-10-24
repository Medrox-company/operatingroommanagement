import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../public/planning/operativity-source.txt', import.meta.url), 'utf8');
const helper = readFileSync(new URL('../../lib/operativity-frame.ts', import.meta.url), 'utf8');
const exports = {};
const directory = {};
const compilerOptions = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
new Function('exports', ts.transpileModule(readFileSync(new URL('../../lib/liberec-campus-directory.ts', import.meta.url), 'utf8'), { compilerOptions }).outputText)(directory);
new Function('exports', 'require', ts.transpileModule(helper, { compilerOptions }).outputText)(exports, path => {
  assert.equal(path, './liberec-campus-directory');
  return directory;
});
const html = exports.buildOperativityFrame(source);
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));

test('new campus renderer uses the complete shared directory without invented room counts', () => {
  const buildings = new Function(script.slice(script.indexOf('const KNL='), script.indexOf('const KM_OR=')) + ';return KNL;')();
  const aliases = { H: 'HELIPORT', PD: 'PARKING', CUM: 'UZAVERA' };
  for (const building of buildings) {
    const entry = directory.CAMPUS_DIRECTORY.find(e => e.id === (aliases[building.id] || building.id));
    assert.ok(entry, building.id);
    assert.equal(building.n, entry.name);
    assert.deepEqual(building.f.flatMap(f => f[1]).sort(), (entry.floors || []).flatMap(f => f.departments).sort());
  }
  assert.equal(buildings.reduce((n, b) => n + b.f.length, 0), 82);
  assert.equal(buildings.reduce((n, b) => n + b.f.reduce((m, f) => m + f[1].length, 0), 0), 325);
});

test('compact section header retains shared actions beside the title without a duplicate top row', () => {
  assert.match(script, /function topHTML\(\)\{return '';\}/);
  assert.match(script, /function compactToolsHTML\(\)/);
  assert.ok(script.includes('<div class="ph-r">${compactToolsHTML()}${right||'));
  for (const action of ['year', 'undo', 'theme', 'print']) assert.ok(script.includes(`data-act="${action}"`));
  assert.match(html, /#top\{display:none\}/);
  assert.match(html, /@media\(max-width:767px\)/);
});

test('the reviewed upstream version 33 snapshot is pinned to its exact Git blob', () => {
  const bytes = Buffer.from(source);
  const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(hash, '9341a6191a8a4f2473eddb5fda15544240787df6');
  assert.match(script, /const VIEWS=\{plan:vPlan,/);
});

test('upstream campus supports the new renderer without guessing clinical room locations or seeding facilities', () => {
  assert.match(script, /function kmGrpRooms\(g\)\{return \[\];\}/);
  assert.match(script, /function mpCampusSeed\(site\)\{return \{blds:\[\],amb:\[\],heli:\[\],links:\[\]\};/);
  assert.doesNotMatch(script, /if\(!D.flags.cosgyn\)/);
  assert.match(script, /function kmMount\(\)\{if\(!medroxPresented\)\{kmStop\(\);return;\}/);
  assert.match(script, /function kmLoop\(t\)\{if\(!medroxPresented\)\{kmStop\(\);return;\}/);
  assert.ok(script.includes('if(!medroxPresented){m3Stop();kmStop();}'));
  assert.ok(script.includes('Sály nejsou přiřazené k podlažím'));
  for (const feature of ['mpBldAdd', 'mpCampusSVG', 'mpLinkEnds', 'kmHTML']) assert.ok(script.includes(feature));
});

test('upstream frame parses and waits for its authenticated parent before starting', () => {
  const events = {}, messages = [], parent = { postMessage: value => messages.push(value) };
  const context = vm.createContext({ parent, addEventListener: (name, callback) => { events[name] = callback; } });
  new vm.Script(script).runInContext(context);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'ready');
  assert.equal(messages[0].protocol, 'medrox-planning:v1');
  const message = { protocol: 'medrox-planning:v1', type: 'init', channel: 'frame-one', data: {} };
  events.message({ source: {}, data: message });
  events.message({ source: parent, data: message });
  assert.equal(messages.length, 1, 'foreign and incomplete initialization never launches the source');
});

test('sandbox source closes network and form access and removes demo hospital fixtures', () => {
  assert.match(html, /<head><meta http-equiv="Content-Security-Policy"/);
  for (const rule of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "frame-src 'none'", "font-src 'none'"]) assert.ok(html.includes(rule));
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /const YEARS=\[2026,2027\]|const SITES=\[\{id:'LB'/);
  assert.match(html, /function seed\(\)\{return JSON\.parse\(JSON\.stringify\(host\.data\)\);\}/);
  assert.match(html, /function isCoord\(\)\{return host\.canEdit===true;\}/);
  assert.match(html, /\['role','rolePop','resetDemo'\]\.includes\(a\)\)return false/);
  assert.match(html, /if\(S\.view==='map'&&S\.mp\.tab==='3d'\)m3Mount\(\);else m3Stop\(\)/);
  assert.match(html, /map:vMap/);
  assert.doesNotMatch(script, /m3Script|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|vMedroxMap/);
});

function storageFor(canEdit) {
  const first = script.indexOf("    const memory=new Map(");
  const last = script.indexOf("\n    \n'use strict';", first);
  assert.ok(first >= 0 && last > first, 'memory store precedes the upstream script');
  const messages = [];
  const storage = new Function('host', 'parent', 'protocol', script.slice(first, last) + '\nlaunched=true;return localStorage;')(
    { data: { v: 2 }, canEdit, channel: 'scope-one' }, { postMessage: message => messages.push(message) }, 'medrox-planning:v1',
  );
  return { storage, messages };
}

test('only changed editable plan data is sent to the host; UI, versions and logs remain ephemeral', () => {
  const { storage, messages } = storageFor(true);
  storage.setItem('knl-rozpis-ui-v1', '{"role":"coord"}');
  storage.setItem('knl-rozpis-log-v1', '[]');
  storage.setItem('knl-rozpis-versions-v1', '[]');
  storage.setItem('knl-rozpis-data-v1', '{"v":2}');
  assert.equal(messages.length, 0);
  storage.setItem('knl-rozpis-data-v1', '{"v":2,"notes":{"r1|2026-10-23":"draft"}}');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'draft');
  assert.equal(messages[0].channel, 'scope-one');
  assert.equal(messages[0].data.notes['r1|2026-10-23'], 'draft');
  const readonly = storageFor(false);
  readonly.storage.setItem('knl-rozpis-data-v1', '{"v":2,"changed":true}');
  assert.equal(readonly.messages.length, 0);
});

function kernel(blocks = []) {
  const data = { overrides: { 'r1|2026-10-23': { split: true, a: { s: 's1', an: 'CA' }, b: { s: 's2', an: 'CA' } } }, blocks, notes: {}, dayHours: {}, hours: { from: '07:00', split: '12:00', to: '15:30' }, _medrox: { closedDays: {} } };
  const room = { id: 'r1', kind: 'or', site: 'hospital-one', an: 'CA+LA' };
  const fn = script.match(/function R\(room,ds\)\{[\s\S]*?\n\}/)?.[0];
  const hours = script.match(/function hoursFor\(room,ds\)\{[^\n]+/)?.[0];
  assert.ok(fn && hours);
  const api = new Function('D', 'RC', 'DI', 'blockFor', 'reqFor', 'anOk', 'validH', `${fn}\n${hours}\nreturn {R,hoursFor};`)(
    data, new Map(), () => ({ weekend: false, holiday: null }), () => blocks[0] ?? null, () => null, () => true, () => true,
  );
  return { data, room, ...api };
}

const declarations = new Map();
const methods = new Map();
{
  const parsed = ts.createSourceFile('planner.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name) declarations.set(node.name.text, node.getText(parsed));
    if (ts.isMethodDeclaration(node) && node.name) methods.set(node.name.getText(parsed), node.getText(parsed));
    ts.forEachChild(node, visit);
  };
  visit(parsed);
}

function partialDay({ planned = false } = {}) {
  const date = '2026-10-23';
  const room = { id: 'r1', kind: 'or', site: 'hospital-one', an: 'CA+LA' };
  const block = { roomIds: ['r1'], from: date, to: date, type: 'Servis', part: 'am' };
  const data = { rooms: [room], specs: [{ id: 's1' }], overrides: { [`r1|${date}`]: planned ? { split: true, a: null, b: { s: 's1', an: 'CA' } } : null }, blocks: [block], notes: {}, dayHours: {}, hours: { from: '07:00', split: '12:00', to: '15:30' }, _medrox: { closedDays: {} } };
  const tmin = text => Number(text.slice(0, 2)) * 60 + Number(text.slice(3));
  const scope = {
    D: data, RC: new Map(), DI: () => ({ weekend: false, holiday: null, iso: 5 }), blockFor: () => block, reqFor: () => null,
    anOk: () => true, validH: () => true, occRange: () => [date, date], occRooms: () => [{ room, gk: `none:${room.site}`, site: room.site }],
    addD: (value, days) => new Date(new Date(`${value}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10),
    s2d: value => new Date(value), isoDow: () => 5, tmin, halfMin: (hours, half) => half === 0 ? tmin(hours.split) - tmin(hours.from) : tmin(hours.to) - tmin(hours.split),
    S: { zoom: 'week', specs: new Set(), an: 'all', colorBy: 'spec' }, AS_MARK: null, today: date, isCoord: () => false,
    esc: value => String(value).replaceAll('"', '&quot;'), bk: (half, part) => `<i class="b ${part}">${half.s}</i>`, dimH: () => false,
  };
  const code = ['R', 'hoursFor', 'freeAt', 'cellHTML', 'occModel', 'occExt', 'tyAgg', 'medroxHalfRestriction'].map(name => declarations.get(name)).join('\n');
  const api = new Function(...Object.keys(scope), `${code}\nreturn {R,freeAt,cellHTML,occModel,occExt,tyAgg};`)(...Object.values(scope));
  return { ...api, room, date, data };
}

test('AM and PM service/closure blocks restrict only the applicable half of the day', () => {
  for (const part of ['am', 'pm', 'full']) {
    const api = kernel([{ roomIds: ['r1'], from: '2026-10-23', to: '2026-10-23', type: 'Servis', part }]);
    const result = api.R(api.room, '2026-10-23');
    assert.equal(Boolean(result.h[0]), part === 'pm');
    assert.equal(Boolean(result.h[1]), part === 'am');
  }
});

test('a morning-only restriction remains half-sized in the real timeline and occupancy model', () => {
  for (const planned of [false, true]) {
    const api = partialDay({ planned });
    const result = api.R(api.room, api.date);
    assert.equal(result.block, null, 'whole-day block is reserved for whole-day restrictions');
    assert.deepEqual(result.blocked, [true, false]);
    assert.deepEqual(result.issues, [], 'a valid opposite-half program is not a restriction conflict');
    const cell = api.cellHTML(api.room, api.date);
    assert.match(cell, /class="x am"/);
    assert.doesNotMatch(cell, /class="x"/);
    if (planned) assert.match(cell, /class="b pm"/);
    const free = api.freeAt(api.room, api.date);
    assert.equal(free[0], null, 'the blocked half cannot be offered as free capacity');
    assert.equal(Boolean(free[1]), !planned);
    const model = api.occModel();
    assert.equal(model.T.cap, 8.5);
    assert.equal(model.T.blk, 5);
    assert.equal(model.T.free, planned ? 0 : 3.5);
    assert.equal(model.T.pl, planned ? 3.5 : 0);
    const detail = api.occExt(model);
    assert.deepEqual(detail.DY.get(api.date), { cap: 8.5, pl: planned ? 3.5 : 0, blk: 5 });
    assert.equal(model.RS[0].bb[0].blk, 5, 'new room heatmaps retain the morning restriction');
    assert.equal(model.RS[0].bb[0].cap, 8.5);
  }
});

test('the new yearly timeline counts only working days and the applicable restricted half', () => {
  const api = partialDay({ planned: true });
  for (let offset = 1; offset < 5; offset++) {
    const day = new Date(new Date(`${api.date}T00:00:00Z`).getTime() + offset * 86_400_000).toISOString().slice(0, 10);
    api.data._medrox.closedDays[`r1|${day}`] = true;
  }
  const week = api.tyAgg(api.room, api.date);
  assert.equal(week.days, 1);
  assert.equal(week.cap, 2);
  assert.equal(week.blk, 1);
  assert.equal(week.pl, 1);
  assert.equal(week.sp.s1, 1);
  api.data._medrox.closedDays[`r1|${api.date}`] = true;
  assert.equal(api.tyAgg(api.room, api.date).cap, 0, 'disabled operating days are not free yearly capacity');
});

test('opening an annual timeline week requests scrolling the unified host page, not the isolated frame', () => {
  const state = { view: 'timeline', zoom: 'year', anchor: '2026-01-01' }, calls = [];
  const openWeek = new Function('S', 'render', 'medroxSend', `return {${methods.get('tyWeek')}}.tyWeek;`)(state, () => calls.push('render'), value => calls.push(value));
  openWeek({ dataset: { d: '2026-10-19' } });
  assert.deepEqual(state, { view: 'timeline', zoom: 'week', anchor: '2026-10-19' });
  assert.deepEqual(calls, ['render', { type: 'scroll-top' }]);
});

function proposalModel() {
  const date = '2026-10-23';
  const rooms = ['source', 'restricted', 'closed', 'available'].map(id => ({ id, code: id, active: true, kind: 'or', site: 'hospital-one', an: 'CA+LA' }));
  const block = { id: 'block-am', roomIds: ['source', 'restricted'], from: date, to: date, type: 'Servis', part: 'am' };
  const data = {
    rooms, specs: [{ id: 's1' }], groups: [], template: {}, requests: [], blocks: [block], links: {}, notes: {}, dayHours: {},
    hours: { from: '07:00', split: '12:00', to: '15:30' }, _medrox: { closedDays: { [`closed|${date}`]: true } },
    overrides: Object.fromEntries(rooms.map(room => [`${room.id}|${date}`, room.id === 'source' ? { split: true, a: { s: 's1', an: 'CA' }, b: { s: 's1', an: 'CA' } } : null])),
  };
  const addD = (day, offset) => new Date(new Date(`${day}T00:00:00Z`).getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  const tmin = text => Number(text.slice(0, 2)) * 60 + Number(text.slice(3));
  const scope = {
    D: data, RC: new Map(), KC: new Map(), DV: 0, S: { year: 2026 }, ROOM: Object.fromEntries(rooms.map(room => [room.id, room])),
    plInit: () => ({ h: 8, site: 'all' }), plRange: () => [date, date], scopeSites: () => ['hospital-one'], quotaModel: () => ({ rows: [] }), waitModel: () => ({ rows: [] }),
    gOf: () => null, tplFlat: () => [], plLinks: () => ({}), plKey: (rid, day, half) => `${rid}|${day}|${half}`,
    DI: day => ({ weekend: day !== date, holiday: null, iso: 5 }), blockFor: (rid, day) => day === date && block.roomIds.includes(rid) ? block : null,
    reqFor: () => null, anOk: () => true, validH: () => true, addD, tmin,
    halfMin: (hours, half) => half === 0 ? tmin(hours.split) - tmin(hours.from) : tmin(hours.to) - tmin(hours.split),
    diffD: (a, b) => (new Date(b) - new Date(a)) / 86_400_000, claimFor: () => [], ISSUES: () => [],
  };
  const code = ['R', 'hoursFor', 'freeAt', 'medroxHalfRestriction', 'planModel'].map(name => declarations.get(name)).join('\n');
  const api = new Function(...Object.keys(scope), `${code}\nreturn {planModel};`)(...Object.values(scope));
  return { ...api, data, date, invalidate: () => scope.KC.clear() };
}

test('occupancy proposals replace only the blocked half and never offer disabled or restricted capacity', () => {
  const api = proposalModel(), model = api.planModel();
  assert.equal(model.blk.length, 1);
  const proposal = model.blk[0];
  assert.equal(proposal.room.id, 'source');
  assert.equal(proposal.i, 0);
  assert.equal(proposal.b.id, 'block-am');
  assert.equal(proposal.to.room.id, 'available');
  assert.equal(proposal.to.i, 0);
  assert.equal(model.taken.has(`restricted|${api.date}|0`), false);
  api.data._medrox.closedDays[`source|${api.date}`] = true;
  api.invalidate();
  assert.equal(api.planModel().blk.length, 0, 'a disabled source day produces no replacement proposal');
});

test('master room and specialty mutation controls are replaced with actual read-only records', () => {
  assert.match(html, /rooms:vMedroxRooms/);
  const master = declarations.get('vMedroxRooms');
  assert.ok(master);
  assert.doesNotMatch(master, /data-(?:act|ch)="(?:addRoom|delRoom|roomName|roomActive|specColor|addSpec|delSpec)"/);
  assert.match(master, /seasonCard\(\)/, 'planning templates remain editable independently of master records');
  assert.match(master, /tplGrid\(\)/);
  assert.match(html, /MEDROX_MASTER_ACTIONS\.has\(a\)/);
  assert.match(html, /MEDROX_MASTER_CHANGES\.has\(t\.dataset\.ch\)/);
  assert.match(html, /\[\.\.\.MEDROX_MASTER_ACTIONS,'role','rolePop','resetDemo'\]\.forEach\(action=>\{if\(ACT\[action\]\)ACT\[action\]=/);
});

function importCheck() {
  const canonical = { v: 2, rooms: [{ id: 'r1', name: 'Skutečný sál' }], specs: [{ id: 's1', name: 'Skutečný obor', c: '#03D1D1' }], groups: [], template: {}, requests: [], blocks: [], staff: { norm: { CA: {}, LA: {} }, cap: {} }, _medrox: { hospitalId: 'hospital-one', years: [2026, 2027] } };
  const scope = { host: { data: canonical, years: [2026, 2027] }, S: {}, impCheck: text => { const payload = JSON.parse(text); scope.S.imp = { text, ok: true, payload }; } };
  const first = script.indexOf('const medroxOriginalImportCheck=impCheck;');
  const last = script.indexOf('\nfunction medroxMapSeed(', first);
  assert.ok(first > 0 && last > first);
  const validate = new Function('host', 'S', 'impCheck', script.slice(first, last) + '\nreturn impCheck;')(scope.host, scope.S, scope.impCheck);
  return { canonical, validate, state: scope.S };
}

test('planner import accepts a raw download for the same hospital and years, preserving authoritative names and colors', () => {
  const { canonical, validate, state } = importCheck();
  const imported = JSON.parse(JSON.stringify(canonical));
  imported.rooms[0].name = 'Změněný název';
  imported.specs[0].c = '#000000';
  imported.notes = { 'r1|2026-10-23': 'Pracovní poznámka' };
  validate(JSON.stringify(imported));
  assert.equal(state.imp.ok, true);
  assert.equal(state.imp.payload.rooms[0].name, 'Skutečný sál');
  assert.equal(state.imp.payload.specs[0].c, '#03D1D1');
  assert.equal(state.imp.payload.notes['r1|2026-10-23'], 'Pracovní poznámka');
  for (const mutate of [
    draft => { draft._medrox.hospitalId = 'other'; },
    draft => { draft._medrox.years = [2027, 2028]; },
    draft => { draft.rooms.push({ id: 'other' }); },
    draft => { draft.specs[0].id = 'other'; },
    draft => { delete draft._medrox; },
  ]) {
    const invalid = JSON.parse(JSON.stringify(canonical));
    mutate(invalid); validate(JSON.stringify(invalid));
    assert.equal(state.imp.ok, false);
    assert.match(state.imp.err, /nemocnici/);
  }
});

test('a configured nonworking day has zero capacity instead of default operating hours', () => {
  const api = kernel();
  api.data._medrox.closedDays['r1|2026-10-23'] = true;
  assert.deepEqual(api.hoursFor(api.room, '2026-10-23'), { from: '00:00', split: '00:00', to: '00:00', src: 'closed' });
  assert.equal(api.hoursFor(api.room, '2026-10-24').from, '07:00');
  const partial = partialDay();
  partial.data._medrox.closedDays[`r1|${partial.date}`] = true;
  assert.deepEqual(partial.freeAt(partial.room, partial.date), [null, null], 'a disabled weekday is never advertised as free operating capacity');
});

test('changed upstream structure fails closed instead of running an unadapted source', () => {
  assert.throws(() => exports.buildOperativityFrame(source.replace('const YEARS=[2026,2027];', 'const YEARS=[2099];')));
  assert.throws(() => exports.buildOperativityFrame('<html></html>'));
});

test('the planner uses the host shell and natural content height without a second sidebar or window', () => {
  assert.match(script, /\$\('#side'\)\.innerHTML='';/);
  assert.match(script, /savePrefs\(\);medroxNotifyView\(\);medroxReportHeight\(\);/);
  assert.match(html, /#side,\.brand\{display:none!important\}/);
  assert.match(html, /\.panel#view\{[^}]*background:transparent!important[^}]*border:0!important[^}]*padding:0!important/);
  assert.match(html, /html,body\{[^}]*height:auto!important[^}]*overflow:hidden!important/);
  assert.match(html, /\.app,\.app\.mini\{display:block!important/);
  assert.match(script, /new ResizeObserver\(medroxReportHeight\)\.observe\(app\)/);
});

function frameMessageHarness() {
  const parsed = ts.createSourceFile('frame.js', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let launch;
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'launch') launch = node;
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  assert.ok(launch?.body);
  // Keep the real protocol dispatcher, while avoiding DOM boot and clinical fixtures.
  const isolated = script.slice(0, launch.body.getStart(parsed))
    + '{launches.push(host);receive=message=>received.push(message);}'
    + script.slice(launch.body.end);
  const events = {}, messages = [], launches = [], received = [];
  const parent = { postMessage: message => messages.push(message) };
  new vm.Script(isolated).runInContext(vm.createContext({ parent, launches, received, addEventListener: (name, fn) => { events[name] = fn; } }));
  const send = (data, source = parent) => events.message({ source, data });
  const init = {
    protocol: exports.OPERATIVITY_FRAME_PROTOCOL, type: 'init', channel: 'trusted-session',
    data: { data: { v: 2, rooms: [], specs: [], groups: [] }, sites: [{ id: 'hospital-one' }], years: [2026], canEdit: false },
  };
  return { send, init, launches, received, messages };
}

test('host commands require initialization, the authenticated parent and the current frame channel', () => {
  const harness = frameMessageHarness();
  const navigate = { protocol: exports.OPERATIVITY_FRAME_PROTOCOL, type: 'navigate', channel: 'trusted-session', view: 'home' };
  harness.send(navigate);
  assert.equal(harness.received.length, 0);
  harness.send(harness.init, {});
  assert.equal(harness.launches.length, 0);
  harness.send(harness.init);
  assert.equal(harness.launches.length, 1);
  assert.equal(harness.launches[0].channel, 'trusted-session');
  harness.send(navigate, {});
  harness.send({ ...navigate, channel: 'previous-session' });
  harness.send({ ...navigate, protocol: 'unrelated' });
  assert.equal(harness.received.length, 0);
  harness.send(navigate);
  assert.equal(harness.received.length, 1);
  assert.equal(harness.received[0].view, 'home');
  harness.send(harness.init);
  assert.equal(harness.launches.length, 1, 'initialization cannot replace the mounted planner');
});

test('frame presentation messages require authenticated initialization and the current parent channel', () => {
  const harness = frameMessageHarness();
  const presentation = { protocol: exports.OPERATIVITY_FRAME_PROTOCOL, type: 'presentation', channel: 'trusted-session', visible: false };
  harness.send(presentation);
  assert.equal(harness.received.length, 0);
  harness.send(harness.init);
  harness.send(presentation, {});
  harness.send({ ...presentation, channel: 'previous-session' });
  harness.send({ ...presentation, protocol: 'unrelated' });
  assert.equal(harness.received.length, 0);
  harness.send(presentation);
  assert.equal(harness.received.length, 1);
  assert.equal(harness.received[0].visible, false);
});

function navigationHarness({ canNavigate = true, canQuickAction = false } = {}) {
  const calls = [], messages = [], styles = new Map();
  const scope = {
    ISSUES: () => [{}, {}], D: { requests: [{ status: 'pending' }, { status: 'approved' }], claims: [] },
    host: { channel: 'trusted-session' }, parent: { postMessage: value => messages.push(value) },
    navList: () => [['Provoz', [['home', 'Přehled'], ['timeline', 'Časová osa'], ['__proto__', 'Neplatný']]]],
    VIEWS: { home() {}, timeline() {}, rooms() {} }, S: { view: 'home', theme: 'dark', edit: {}, bulk: {}, help: true, fix: {}, reloc: {}, printInfo: true, rolePop: true },
    canAct: action => action === 'go' ? canNavigate : canQuickAction, ACT: { go: target => { calls.push(target.dataset.v); scope.S.view = target.dataset.v; } },
    closeDP: () => calls.push('closeDP'), spClose: () => calls.push('spClose'), cmdClose: () => calls.push('cmdClose'), BOARD: null, boardClose: () => calls.push('boardClose'),
    tip: { hidden: false }, renderDrawer: () => calls.push('drawer'), renderModal: () => calls.push('modal'),
    m3Stop: () => calls.push('m3Stop'), m3Mount: () => calls.push('m3Mount'),
    kmStop: () => calls.push('kmStop'), kmMount: () => calls.push('kmMount'),
    document: { documentElement: { style: { setProperty: (key, value) => styles.set(key, value) } } }, DP: { id: null }, placeDP: () => calls.push('placeDP'), SPK: { el: null }, placeSP: () => calls.push('placeSP'), innerHeight: 800,
  };
  const code = ['medroxSend', 'medroxAllowedViews', 'medroxNotifyView', 'medroxReceive', 'medroxViewport'].map(name => declarations.get(name)).join('\n');
  const api = new Function(...Object.keys(scope), `let medroxVisible=null,medroxPresented=true;${code}\nreturn {receive:medroxReceive,notify:medroxNotifyView,viewport:medroxViewport,presented:()=>medroxPresented};`)(...Object.values(scope));
  return { ...api, calls, messages, styles, scope };
}

test('top navigation follows allowed source views and does not grant mutation or hidden-view access', () => {
  const harness = navigationHarness();
  harness.notify();
  assert.deepEqual(harness.messages[0].allowedViews, ['home', 'timeline']);
  assert.equal(harness.messages[0].view, 'home');
  assert.equal(harness.messages[0].channel, 'trusted-session');
  assert.deepEqual(harness.messages[0].counts, { alerts: 2, requests: 1, free: 0 });
  for (const view of ['rooms', '__proto__', 'constructor', 'unknown', 17]) harness.receive({ type: 'navigate', view });
  harness.receive({ type: 'addRoom', view: 'home' });
  assert.deepEqual(harness.calls, []);
  harness.receive({ type: 'navigate', view: 'timeline' });
  assert.equal(harness.calls.at(-1), 'timeline');
  assert.equal(harness.scope.S.view, 'timeline');
  assert.equal(harness.scope.S.edit, null);
  assert.equal(harness.scope.S.bulk, null);
  assert.equal(harness.scope.tip.hidden, true);
  assert.ok(harness.calls.includes('spClose'), 'select popups cannot remain open across host navigation');
  harness.notify();
  assert.equal(harness.messages.at(-1).view, 'timeline', 'internal navigation can synchronize the host toolbar');
  const denied = navigationHarness({ canNavigate: false });
  denied.receive({ type: 'navigate', view: 'timeline' });
  assert.deepEqual(denied.calls, [], 'the source permission guard also applies to host navigation');
});

test('campus presentation suspends the original animation without changing its model or plan', () => {
  const harness = navigationHarness();
  harness.scope.S.view = 'map';
  harness.scope.S.mp = { tab: '3d', play: true, t: 510, sel: 'room-1' };
  const before = JSON.stringify({ state: harness.scope.S, data: harness.scope.D });
  for (const visible of [undefined, null, 0, 1, 'false', {}, []]) harness.receive({ type: 'presentation', visible });
  assert.deepEqual(harness.calls, []);
  assert.equal(harness.presented(), true);
  harness.receive({ type: 'presentation', visible: false });
  harness.receive({ type: 'presentation', visible: false });
  assert.deepEqual(harness.calls, ['m3Stop', 'kmStop']);
  assert.equal(harness.presented(), false);
  assert.equal(JSON.stringify({ state: harness.scope.S, data: harness.scope.D }), before);
  harness.receive({ type: 'presentation', visible: true });
  harness.receive({ type: 'presentation', visible: true });
  assert.deepEqual(harness.calls, ['m3Stop', 'kmStop', 'm3Mount']);
  assert.equal(JSON.stringify({ state: harness.scope.S, data: harness.scope.D }), before);
  for (const [view, tab] of [['home', '3d'], ['map', 'ed'], ['map', 'dist']]) {
    harness.receive({ type: 'presentation', visible: false });
    harness.scope.S.view = view;
    harness.scope.S.mp.tab = tab;
    harness.receive({ type: 'presentation', visible: true });
    assert.equal(harness.calls.at(-1), 'kmStop', 'non-3D sections resume neither renderer');
  }
  harness.receive({ type: 'presentation', visible: false });
  harness.scope.S.view = 'map';
  harness.scope.S.mp.tab = 'map';
  harness.receive({ type: 'presentation', visible: true });
  assert.equal(harness.calls.at(-1), 'kmMount', 'only the visible v33 campus renderer resumes');
});

test('v33 map cannot schedule frames while hidden or infer rooms from matching upstream codes', () => {
  const calls = [];
  const code = ['kmMount', 'kmLoop', 'kmGrpRooms', 'mpCampusSeed'].map(name => declarations.get(name)).join('\n');
  const api = new Function('kmStop', `const medroxPresented=false,D={rooms:[{site:'LB',code:'P1',active:true,kind:'or'}]};${code}\nreturn {kmMount,kmLoop,kmGrpRooms,mpCampusSeed};`)(() => calls.push('stop'));
  api.kmMount(); api.kmLoop(0);
  assert.deepEqual(calls, ['stop','stop']);
  assert.deepEqual(api.kmGrpRooms({re:/^P1$/}), []);
  assert.deepEqual(api.mpCampusSeed('LB'), {blds:[],amb:[],heli:[],links:[]});
});

test('hidden original 3D cannot remount or enqueue animation after internal rendering or async loading', () => {
  const calls = [];
  const code = ['m3Mount', 'm3Loop'].map(name => declarations.get(name)).join('\n');
  const api = new Function('m3Stop', `const medroxPresented=false;${code}\nreturn {mount:m3Mount,loop:m3Loop};`)(() => calls.push('stop'));
  api.mount();
  api.loop(100);
  assert.deepEqual(calls, ['stop', 'stop']);
  assert.match(declarations.get('m3Stop'), /cancelAnimationFrame\(M3\.raf\)/);
  assert.match(declarations.get('m3Stop'), /M3\.ro\.disconnect\(\)/);
});

test('sidebar quick actions enforce both authenticated edit permission and source permissions', () => {
  const harness = navigationHarness();
  const actions = [];
  for (const action of ['cmd', 'bulk', 'newReq', 'addRoom']) harness.scope.ACT[action] = () => actions.push(action);
  // Search is still checked by canAct; mutation actions also require host.canEdit.
  for (const action of ['cmd', 'bulk', 'newReq', 'addRoom']) harness.receive({ type: 'sidebar-action', action });
  assert.deepEqual(actions, []);
  harness.scope.host.canEdit = true;
  harness.receive({ type: 'sidebar-action', action: 'bulk' });
  assert.deepEqual(actions, [], 'Source permission denial must not be bypassed');
  const allowed = navigationHarness({ canQuickAction: true });
  for (const action of ['cmd', 'bulk', 'newReq', 'addRoom']) allowed.scope.ACT[action] = () => actions.push(action);
  for (const action of ['cmd', 'bulk', 'newReq', 'addRoom']) allowed.receive({ type: 'sidebar-action', action });
  assert.deepEqual(actions, ['cmd'], 'Read-only users can search but cannot open editing actions');
  allowed.scope.host.canEdit = true;
  for (const action of ['bulk', 'newReq', 'addRoom']) allowed.receive({ type: 'sidebar-action', action });
  assert.deepEqual(actions, ['cmd', 'bulk', 'newReq'], 'Only the three explicit sidebar actions can be invoked');
});

test('visible viewport bounds place dialogs within the host page and reject malformed dimensions', () => {
  const harness = navigationHarness();
  assert.deepEqual(harness.viewport(), { top: 0, height: 800 });
  for (const bounds of [{ top: -1, height: 600 }, { top: 0, height: 0 }, { top: Infinity, height: 600 }, { top: 0, height: 999999 }, { top: '20', height: 600 }]) {
    harness.receive({ type: 'viewport', ...bounds });
  }
  assert.equal(harness.styles.size, 0);
  harness.scope.SPK.el = {};
  harness.receive({ type: 'viewport', top: 1250, height: 640 });
  assert.deepEqual(harness.viewport(), { top: 1250, height: 640 });
  assert.equal(harness.styles.get('--medrox-visible-top'), '1250px');
  assert.equal(harness.styles.get('--medrox-visible-height'), '640px');
  assert.ok(harness.calls.includes('placeSP'), 'custom select follows scrolling in the host viewport');
  assert.match(html, /\.dw-wrap,\.mo-wrap,\.cmd-wrap,\.board\{top:var\(--medrox-visible-top/);
  assert.match(html, /\.mo\{max-height:calc\(var\(--medrox-visible-height/);
  assert.match(html, /\.spk\{max-height:min\(420px,calc\(var\(--medrox-visible-height/);
  assert.match(html, /\.top \.srch\{display:inline-flex\}/, 'search remains reachable after the upstream sidebar was removed');
  assert.equal(harness.styles.get('--medrox-scene-height'), '499px');
  assert.match(html, /\.m3-card\.full\{top:var\(--medrox-visible-top/);
  assert.match(html, /\.m3-host\{height:var\(--medrox-scene-height,620px\)!important/);
});

test('upstream light and dark themes remain unchanged and the appearance switch synchronizes with the host', () => {
  const harness = navigationHarness();
  harness.notify();
  assert.equal(harness.messages[0].theme, 'dark');
  harness.scope.S.theme = 'light';
  harness.notify();
  assert.equal(harness.messages.at(-1).theme, 'light');
  assert.match(script, /theme:host\.theme/);
  assert.match(script, /data-act="theme"/);
  assert.doesNotMatch(html, /\.thm,|\[data-act="theme"\]\{display:none/);
  const palette = source.slice(source.indexOf(':root{'), source.indexOf('[hidden]'));
  assert.ok(html.includes(palette), 'original project palettes remain byte-for-byte intact');
  assert.doesNotMatch(html.slice(html.lastIndexOf('<style>')), /:root\[data-ui="dark"\]|body\{font-family:/, 'no replacement palette or typography overrides');
});

test('3D libraries are inline, deferred until authenticated initialization, and never loaded through the network', async () => {
  const embedded = exports.buildOperativityFrame(source, { threeRuntime: "window.local3dLoaded=true;" });
  const inline = embedded.slice(embedded.indexOf('<script>') + 8, embedded.lastIndexOf('</script>'));
  const events = {}, parent = { postMessage() {} }, browser = {};
  new vm.Script(inline).runInContext(vm.createContext({ window: browser, parent, addEventListener: (name, fn) => { events[name] = fn; } }));
  assert.equal(browser.local3dLoaded, undefined, 'uninitialized source does not execute its graphics runtime');
  assert.ok(inline.indexOf('window.local3dLoaded=true;') > inline.indexOf('function launch(host)'));
  assert.equal((embedded.match(/<script>/g) || []).length, (html.match(/<script>/g) || []).length, 'bundling adds no additional script element');
  assert.throws(() => exports.buildOperativityFrame(source, { threeRuntime: '</script><script>injected()</script>' }));
  assert.throws(() => exports.buildOperativityFrame(source, { threeRuntime: ' '.repeat(4_000_001) }));
  const graphics = { libs: false };
  const load = new Function('window', 'M3', `${declarations.get('m3Load')}\nreturn m3Load;`)({ THREE: { REVISION: '128' } }, graphics);
  await load();
  assert.equal(graphics.libs, true);
  const missing = new Function('window', 'M3', `${declarations.get('m3Load')}\nreturn m3Load;`)({}, { libs: false });
  await assert.rejects(missing(), /Místní 3D/);
});

test('the original 3D scene places every real room in a clearly labeled schematic and preserves edited maps', () => {
  const rooms = Array.from({ length: 15 }, (_, index) => ({ id: `real-room-${index}`, name: `Operační sál ${index + 1}`, site: 'real-hospital', active: true, kind: 'or' }));
  const data = { rooms: [...rooms, { id: 'other-room', site: 'other-hospital', active: true, kind: 'or' }], specs: [{ id: 'actual-department' }], map: {} };
  const MK = Object.fromEntries(['hall', 'stair', 'elev', 'ward', 'er', 'icu', 'pacu', 'other', 'or', 'staff'].map(kind => [kind, { n: kind }]));
  const code = ['medroxMapSeed', 'mapSeed', 'mapOf', 'mpCampusSeed'].map(name => declarations.get(name)).join('\n');
  const api = new Function('D', 'MK', `${code}\nreturn {mapOf};`)(data, MK);
  const model = api.mapOf('real-hospital');
  assert.equal(model.schematic, true);
  assert.deepEqual(model.items.filter(item => item.k === 'or').map(item => item.room), rooms.map(room => room.id));
  assert.equal(model.floors.length, 4);
  assert.equal(new Set(model.items.map(item => item.id)).size, model.items.length);
  assert.ok(model.items.every(item => item.x >= 0 && item.y >= 0 && item.x + item.w <= model.W && item.y + item.h <= model.H));
  assert.ok(model.items.some(item => item.k === 'elev' && item.lv1 === 3));
  model.items[0].name = 'Vlastní chodba';
  assert.equal(api.mapOf('real-hospital'), model, 'existing local floor-plan data is never overwritten');
  assert.equal(api.mapOf('real-hospital').items[0].name, 'Vlastní chodba');
  assert.match(declarations.get('mpInit'), /if\(!SITE\[o.site\]\)o.site=SITES\[0\].id/);
  assert.match(script, /Modelová simulace podle plánu/);
  assert.match(script, /Nejde o živý stav ani skutečný půdorys nemocnice/);
  assert.doesNotMatch(script, /Aktuální stav operačních sálů v reálném čase/);
});

test('3D day simulation and emergency candidates honor actual working hours and half-day closures', () => {
  const date = '2026-10-23', room = { id: 'r1', kind: 'or', site: 'hospital-one', an: 'CA+LA' }, item = { id: 'map-r1', room: 'r1', k: 'or' };
  const block = { id: 'service-am', roomIds: ['r1'], from: date, to: date, type: 'Servis', part: 'am' };
  const data = { overrides: { [`r1|${date}`]: null }, blocks: [block], notes: {}, dayHours: {}, hours: { from: '07:00', split: '12:00', to: '15:30' }, _medrox: { closedDays: {} } };
  const scope = {
    D: data, ROOM: { r1: room }, RC: new Map(), KC: new Map(), DI: () => ({ weekend: false, holiday: null }),
    blockFor: () => block, reqFor: () => null, anOk: () => true, validH: () => true, tplPick: () => ({ slot: null, src: 'template' }),
    tmin: time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3)), hm: value => String(value),
  };
  const code = ['R', 'hoursFor', 'medroxHalfRestriction', 'mpRnd', 'mpSched', 'mpStat', 'mpFreeIn'].map(name => declarations.get(name)).join('\n');
  const api = new Function(...Object.keys(scope), `${code}\nreturn {mpSched,mpStat,mpFreeIn};`)(...Object.values(scope));
  const morning = api.mpStat(item, date, 540);
  assert.equal(morning.k, 'off');
  assert.equal(morning.blk.id, 'service-am');
  assert.equal(api.mpFreeIn(item, date, 540), Infinity);
  assert.equal(api.mpStat(item, date, 780).k, 'free');
  assert.equal(api.mpFreeIn(item, date, 780), 0);
  assert.equal(api.mpFreeIn(item, date, 1000), Infinity, 'after-hours rooms are never proposed for a clinical emergency');
  data._medrox.closedDays[`r1|${date}`] = true;
  scope.RC.clear(); scope.KC.clear();
  assert.equal(api.mpSched(item, date).closed, true);
  assert.equal(api.mpSched(item, date).segs.length, 0);
  assert.equal(api.mpFreeIn(item, date, 780), Infinity, 'a disabled day cannot be treated as callable capacity');
});

test('3D labels resolve opaque department IDs to escaped names without changing plan identifiers', () => {
  const departmentId = 'department-f3a409c1-34e2-41a2-b176-27d2be4f2152', name = 'Robotická chirurgie <ARO>';
  const room = { id: 'actual-room', code: 'DaVinci ROBOT', name: 'DaVinci ROBOT' }, item = { id: 'map-room', k: 'or', room: room.id, lv: 1, x: 0 };
  const ward = { id: 'ward', k: 'ward', name: 'Modelová stanice', specs: [departmentId], lv: 0, w: 4, h: 5 };
  const model = { floors: [{ lv: 0, name: 'Zázemí' }, { lv: 1, name: 'Sály' }], items: [item, ward] };
  const segment = { a: 420, b: 930, k: 'op', s: departmentId, an: 'CA', n: 0 };
  const schedule = { H: {}, t0: 420, t1: 930, segs: [segment] }, tooltip = { style: {} };
  const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const scope = {
    S: { mp: { day: '2026-10-23', t: 500, site: 'actual-hospital', floor: 'all', sel: null } },
    M3: { tip: tooltip, w: 1000, h: 600, tr: [420, 930] }, MK: { ward: { n: 'Lůžková stanice' }, or: { n: 'Operační sál' } }, MCELL: 2,
    ROOM: { [room.id]: room }, SPEC: { [departmentId]: { c: '#123456' } },
    MST: { op: { c: '#123456', n: 'Výkon' }, prep: { c: '#123456', n: 'Příprava' }, free: { c: '#123456', n: 'Volný' }, off: { c: '#123456', n: 'Mimo provoz' } },
    mpSched: () => schedule, specName: id => id === departmentId ? name : id, hm: value => String(value), esc,
    mpFloorName: (m, level) => m.floors.find(floor => floor.lv === level)?.name,
    mpTitle: value => value.name || room.name, mpNearWard: () => null, isCoord: () => false, ico: () => '',
    R: () => ({ h: [{ s: departmentId, an: 'CA' }, null] }), mapOf: () => model, mapCur: () => model, mpItem: (m, id) => m.items.find(value => value.id === id),
    clampN: (value, low, high) => Math.max(low, Math.min(high, value)),
  };
  const code = ['mpStat', 'mpBoardHTML', 'mpSelHTML', 'mpGanttHTML', 'm3Tip'].map(key => declarations.get(key)).join('\n');
  const api = new Function(...Object.keys(scope), `${code}\nreturn {mpStat,mpBoardHTML,mpSelHTML,mpGanttHTML,m3Tip};`)(...Object.values(scope));
  const state = api.mpStat(item, scope.S.mp.day, 500);
  assert.equal(state.s, departmentId, 'the source planning key remains the actual department ID');
  assert.match(state.sub, /Robotická chirurgie <ARO> · CA/);
  for (const content of [api.mpBoardHTML(model, { [item.id]: state }), api.mpSelHTML(model, item, { [item.id]: state }), api.mpGanttHTML(model, { [item.id]: state })]) {
    assert.ok(content.includes('Robotická chirurgie &lt;ARO&gt;'));
    assert.ok(!content.includes(departmentId));
    assert.ok(!content.includes('<ARO>'));
  }
  api.m3Tip({ id: ward.id, x: 10, y: 50 });
  assert.ok(tooltip.innerHTML.includes('Robotická chirurgie &lt;ARO&gt;'));
  assert.ok(!tooltip.innerHTML.includes(departmentId));
  assert.match(declarations.get('m3Item'), /esc\(\(it\.specs\|\|\[\]\)\.map\(specName\)\.join\(' · '\)\)/, 'the canvas room label resolves names before HTML escaping');
  segment.k = 'prep';
  assert.match(api.mpStat(item, scope.S.mp.day, 500).sub, /Robotická chirurgie <ARO> · začátek/);
  segment.k = 'free'; segment.rel = departmentId;
  assert.equal(api.mpStat(item, scope.S.mp.day, 500).sub, `uvolněno · ${name}`);
  assert.equal(segment.s, departmentId);
});

test('new custom select menus clamp to the visible host viewport rather than the tall iframe', () => {
  const host = { hidden: false, offsetWidth: 200, offsetHeight: 280, style: {} };
  const el = { isConnected: true, getBoundingClientRect: () => ({ left: 450, top: 1420, bottom: 1460 }) };
  const place = new Function('$', 'SPK', 'spClose', 'innerWidth', 'medroxViewport', `${declarations.get('placeSP')}\nreturn placeSP;`)(
    () => host, { el }, () => assert.fail('a connected select should stay open'), 1000, () => ({ top: 1200, height: 400 }),
  );
  place();
  assert.equal(host.style.left, '450px');
  assert.equal(host.style.top, '1312px');
});

test('frame resizing reports content dimensions once per change instead of its own iframe height', () => {
  let height = 430.25;
  const messages = [];
  const app = { getBoundingClientRect: () => ({ height }) };
  const report = new Function('$', 'medroxSend', `let medroxLastHeight=0;${declarations.get('medroxReportHeight')}\nreturn medroxReportHeight;`)(selector => selector === '.app' ? app : null, message => messages.push(message));
  report(); report(); height = 430.75; report();
  assert.deepEqual(messages, [{ type: 'resize', height: 431 }]);
  height = 1060; report();
  assert.deepEqual(messages.at(-1), { type: 'resize', height: 1060 });
  for (height of [0, -1, Infinity, NaN]) report();
  assert.equal(messages.length, 2);
});

test('printing works inside the isolated frame without the upstream preview notice', () => {
  for (const banned of ['Náhled v Claude', 'rozpis-operativy.html', 'V ostré verzi aplikace', 'fonts.googleapis.com']) {
    assert.ok(!html.includes(banned), `Frame must not contain: ${banned}`);
  }
  // Tisk se předá hostitelské aplikaci; při zablokovaném okně tiskne rámec sám.
  assert.ok(script.includes('if(medroxOpenPrint(title,inner))return;{if(inner==null){window.print();return;}'));
  assert.match(script, /function medroxOpenPrint\(title,inner\)\{[\s\S]*?medroxSend\(\{type:'print',title:String\(title\)\.slice\(0,300\),html:doc\}\);/);
  assert.ok(script.includes("if(message.type==='print-direct'){medroxPrintInFrame();return;}"));
  assert.ok(script.includes("if(message.type==='print-opened'){medroxPendingPrint=null;return;}"));
  // Tlačítko je v záhlaví každé sekce (sdílené nástroje), ne jen ve výchozí pravé části.
  assert.ok(script.includes('data-act="print" title="Vytisknout tuto sekci nebo ji uložit jako PDF">${ico(\'printer\')}<span>Tisk / PDF</span>'));
  assert.equal(script.split('data-act="print"').length - 1, 1, 'One shared print button, no duplicate in the default header');
  // Tisková stránka nabízí uložení do PDF a nemá vložené obsluhy událostí.
  assert.ok(script.includes('data-print-action="print">Tisk / Uložit PDF</button>'));
  assert.ok(script.includes('pro PDF zvolte v dialogu tisku „Uložit jako PDF“'));
  assert.ok(!script.includes('<button onclick="print()">'));
});

test('print headers and totals name the signed-in hospital instead of the upstream demo', () => {
  assert.ok(!script.includes('Krajská nemocnice Liberec</b>'));
  assert.ok(!/'KNL'|Celkem KNL|celá KNL|celé KNL/.test(script));
  assert.ok(script.includes('<b>Rozpis operativy · ${esc(MEDROX_HOSPITAL)}</b>'));
  assert.match(script, /const MEDROX_HOSPITAL=typeof host\.hospitalName==='string'&&host\.hospitalName\.trim\(\)\?host\.hospitalName\.trim\(\)\.slice\(0,160\):'Zdravotnické zařízení';/);
  assert.match(script, /const MEDROX_HOSPITAL_SHORT=typeof host\.hospitalShortName==='string'/);
});

test('the host opens the planner print page itself, sanitized and script-free, with a frame fallback', () => {
  const workspace = readFileSync(new URL('../../components/OperativityPlanningWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(workspace, /event\.data\.type === 'print'/);
  assert.match(workspace, /openOperativityPrintWindow\(event\.data\.html\)/);
  assert.match(workspace, /type: opened \? 'print-opened' : 'print-direct'/);
  assert.match(workspace, /hospitalName: hospitalLabelsRef\.current\.name, hospitalShortName: hospitalLabelsRef\.current\.short/);
  const printer = readFileSync(new URL('../../lib/operativity-print.ts', import.meta.url), 'utf8');
  assert.match(printer, /script-src 'none'/);
  assert.match(printer, /default-src 'none'/);
  for (const element of ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base']) assert.match(printer, new RegExp(`REMOVED_ELEMENTS = '[^']*\\b${element}\\b`));
  assert.match(printer, /name\.startsWith\('on'\) \|\| name === 'srcdoc'/);
  assert.match(printer, /head\.prepend\(charset, csp\)/);
  assert.match(printer, /preview\.opener = null/);
});
