import { CAMPUS_DIRECTORY } from './liberec-campus-directory';

export const OPERATIVITY_FRAME_PROTOCOL = 'medrox-planning:v1';

const FRAME_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; media-src 'none'";

function replaceRequired(source: string, before: string, after: string): string {
  if (!source.includes(before)) throw new Error('Zdroj plánovače neodpovídá ověřené verzi.');
  return source.replace(before, after);
}

/** Adapt the reviewed, offline upstream snapshot for an opaque-origin sandbox.
 * The host owns authentication and persistent storage; this frame has neither.
 */
export function buildOperativityFrame(sourceHtml: string, options: { threeRuntime?: string } = {}): string {
  const threeRuntime = options.threeRuntime ?? '';
  if (threeRuntime.length > 4_000_000 || /<\/script\b/i.test(threeRuntime)) throw new Error('Neplatná místní 3D knihovna.');
  const start = sourceHtml.indexOf('<script>');
  const end = sourceHtml.lastIndexOf('</script>');
  if (start < 0 || end <= start) throw new Error('Chybí skript plánovače.');
  let script = sourceHtml.slice(start + '<script>'.length, end);
  // Keep upstream actions and handlers, but place shared tools beside the view title.
  script = replaceRequired(script, 'function topHTML(){', "function topHTML(){return '';}\nfunction compactToolsHTML(){");
  script = replaceRequired(script, '<div class="ph-r">${right||', '<div class="ph-r">${compactToolsHTML()}${right||');
  // Tisk je dostupný v záhlaví každé sekce, i tam, kde sekce nahrazuje pravou část vlastními prvky.
  script = replaceRequired(script, '<button class="btn sm prt" data-act="print" title="Vytisknout tuto sekci">${ico(\'printer\')}Tisk</button>', '');
  script = replaceRequired(script, '<button class="icon-btn thm" data-act="theme"',
    '<button class="btn sm prt" data-act="print" title="Vytisknout tuto sekci nebo ji uložit jako PDF">${ico(\'printer\')}<span>Tisk / PDF</span></button><button class="icon-btn thm" data-act="theme"');
  // Uvnitř rámce se tisk neodmítá: otevře se samostatná tisková stránka (stejně
  // jako tisk statistik), a když prohlížeč nové okno zablokuje, tiskne se přímo
  // z rámce původním tiskovým režimem plánovače.
  script = replaceRequired(script, 'if(window.self===window.top){if(inner==null){window.print();return;}', 'if(medroxOpenPrint(title,inner))return;{if(inner==null){window.print();return;}');
  script = replaceRequired(script, '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap">', '');
  script = replaceRequired(script, '@media print{.prt-bar{display:none!important}body{padding:0}}',
    '.print-h span{margin-left:10px;color:#43525B}.prt-bar{margin-bottom:28px!important}.prt-bar small{display:block;margin-top:2px;font-size:12px;font-weight:400;opacity:.8}.prt-act{display:flex;gap:8px;flex:none}.prt-act button+button{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.55)}\n@media print{.wt-card,.tl-card,.bc-card{break-inside:auto!important}.wt-card tr,.bc-card tr,.tl-r{break-inside:avoid}}\n@media print{.prt-bar{display:none!important}body{padding:0}}');
  script = replaceRequired(script, '<div class="prt-bar"><span>${esc(title)}</span><button onclick="print()">Tisknout</button></div>',
    '<div class="prt-bar"><span><b>${esc(title)}</b><small>A4 na šířku · pro PDF zvolte v dialogu tisku „Uložit jako PDF“</small></span><span class="prt-act"><button type="button" data-print-action="print">Tisk / Uložit PDF</button><button type="button" data-print-action="close">Zavřít</button></span></div>');
  script = replaceRequired(script, '<h2 id="pi-t">Náhled v Claude tisk neumožňuje</h2>', '<h2 id="pi-t">Tisk se nepodařilo otevřít</h2>');
  script = replaceRequired(script,
    '<ol class="info-list"><li>Otevřete soubor aplikace <b>rozpis-operativy.html</b> přímo v prohlížeči (Chrome, Edge, Safari).</li><li>Přejděte do sekce, kterou chcete tisknout, a nastavte filtry.</li><li>Klepněte na <b>Tisk</b> – vytiskne se aktuální sekce na A4 na šířku, ve světlých barvách a bez ovládacích prvků.</li></ol>',
    '<ol class="info-list"><li>Povolte v prohlížeči otevírání nových oken pro tuto aplikaci.</li><li>Klepněte znovu na <b>Tisk / PDF</b> – otevře se tisková stránka aktuální sekce na A4 na šířku, ve světlých barvách a bez ovládacích prvků.</li><li>V dialogu tisku zvolte tiskárnu, nebo <b>Uložit jako PDF</b>.</li></ol>');
  script = replaceRequired(script, '<p class="hint">Do tisku se propíše hlavička s nemocnicí, sekcí, obdobím, filtry a datem tisku. V ostré verzi aplikace bude tisk fungovat přímo.</p>',
    '<p class="hint">Do tisku se propíše hlavička s nemocnicí, sekcí, obdobím, filtry a datem tisku.</p>');
  // Hlavičky tisku a souhrny nesou skutečně přihlášenou nemocnici, ne ukázkovou KNL.
  script = replaceRequired(script, '<b>Rozpis operativy · Krajská nemocnice Liberec</b><span>${esc(t)}</span>', '<b>Rozpis operativy · ${esc(MEDROX_HOSPITAL)}</b><span>${esc(t)}</span>');
  script = replaceRequired(script, '<b>Rozpis operativy · Krajská nemocnice Liberec</b><span>Omezení operačních sálů</span>', '<b>Rozpis operativy · ${esc(MEDROX_HOSPITAL)}</b><span>Omezení operačních sálů</span>');
  script = replaceRequired(script, '<div><b>Operační program</b><span>Krajská nemocnice Liberec</span></div>', '<div><b>Operační program</b><span>${esc(MEDROX_HOSPITAL)}</span></div>');
  script = replaceRequired(script, "${S.view==='staff'||S.view==='timeline'?scope:'KNL'}", "${S.view==='staff'||S.view==='timeline'?scope:MEDROX_HOSPITAL_SHORT}");
  script = replaceRequired(script, "<small>Σ ${sites.length>1?'KNL':SITE[sites[0]].name}</small>", "<small>Σ ${sites.length>1?esc(MEDROX_HOSPITAL_SHORT):SITE[sites[0]].name}</small>");
  script = replaceRequired(script, '<tr class="tot"><th>Celkem KNL</th>', '<tr class="tot"><th>Celkem ${esc(MEDROX_HOSPITAL_SHORT)}</th>');
  script = replaceRequired(script, "if(sites.length>1)h+=block('Celkem KNL',", "if(sites.length>1)h+=block('Celkem '+esc(MEDROX_HOSPITAL_SHORT),");
  script = replaceRequired(script, "if(sites.length>1)h+=rows('Celkem KNL',", "if(sites.length>1)h+=rows('Celkem '+esc(MEDROX_HOSPITAL_SHORT),");
  script = replaceRequired(script, "${row('Nedostatek personálu','celá KNL',def)}", "${row('Nedostatek personálu','celé zařízení',def)}");
  script = replaceRequired(script, 'Kapacita celé KNL: ', 'Kapacita celého zařízení: ');
  const seedStart = script.indexOf('function seed(){');
  const stateStart = script.indexOf('\nlet D=null;');
  const seedEnd = script.lastIndexOf('\n}', stateStart);
  if (seedStart < 0 || stateStart < seedStart || seedEnd < seedStart) throw new Error('Chybí inicializace plánovače.');
  // No fixture reset or accidental fallback to the upstream hospital demo.
  script = script.slice(0, seedStart) + 'function seed(){return JSON.parse(JSON.stringify(host.data));}' + script.slice(seedEnd + 2);
  script = replaceRequired(script, 'const YEARS=[2026,2027];', 'const YEARS=host.years.slice();');
  script = replaceRequired(script,
    "const SITES=[{id:'LB',name:'Liberec',sub:'Centrální operační sály'},{id:'TU',name:'Turnov',sub:'Operační sály'},{id:'FR',name:'Frýdlant',sub:'Operační sály'}];",
    'const SITES=host.sites.map(site=>({...site}));');
  script = replaceRequired(script, "const S={view:'home',year:2027,zoom:'year',anchor:'2027-01-04'", "const S={view:'home',year:host.years[0],zoom:'year',anchor:host.years.includes(todayY)?today:host.years[0]+'-01-01'");
  script = replaceRequired(script, "tplSite:'all',theme:'light'", "tplSite:'all',theme:host.theme");
  script = replaceRequired(script, "role:'coord',roleSpec:null", "role:host.canEdit?'coord':'mgmt',roleSpec:null");
  script = replaceRequired(script, "function isCoord(){return (S.role||'coord')==='coord';}", 'function isCoord(){return host.canEdit===true;}');
  script = replaceRequired(script, 'function canAct(a,t){if(isCoord()||VIEW_ACTS.has(a))return true;', "function canAct(a,t){if(MEDROX_MASTER_ACTIONS.has(a)||['role','rolePop','resetDemo'].includes(a))return false;if(isCoord()||VIEW_ACTS.has(a))return true;");
  script = replaceRequired(script, "if(t&&CH[t.dataset.ch]){if(!isCoord()", "if(t&&CH[t.dataset.ch]){if(MEDROX_MASTER_CHANGES.has(t.dataset.ch)){toast('Údaje sálů a oborů upravujte v hlavní aplikaci.');render();return;}if(!isCoord()");
  script = replaceRequired(script, "function hoursFor(room,ds){const dh=", "function hoursFor(room,ds){if(D._medrox&&D._medrox.closedDays&&D._medrox.closedDays[room.id+'|'+ds])return {from:'00:00',split:'00:00',to:'00:00',src:'closed'};const dh=");
  script = replaceRequired(script, "if(r.block&&!(ov&&planned)){r.lost=halves.filter(Boolean).length;RC.set(k,r);return r;}", "const restrictions=D.blocks.filter(b=>b.roomIds.includes(room.id)&&ds>=b.from&&ds<=b.to);const blocked=i=>restrictions.some(b=>!b.part||b.part==='full'||b.part===(i===0?'am':'pm'));r.blocked=[blocked(0),blocked(1)];r.restrictions=restrictions;if(!blocked(0)||!blocked(1))r.block=null;if(blocked(0)&&blocked(1)&&!(ov&&planned)){r.lost=halves.filter(Boolean).length;RC.set(k,r);return r;}");
  script = replaceRequired(script, 'const b=halves[i]; if(!b) continue;', 'const b=halves[i]; if(!b) continue;if(blocked(i)){r.lost++;continue;}');
  script = replaceRequired(script, "if(r.issues.length) inner+='<b class=\"dot\"></b>';", "if(!r.pacu&&!r.block&&r.blocked)r.blocked.forEach((blocked,i)=>{if(blocked){const restriction=medroxHalfRestriction(r,i);inner+='<i class=\"x '+(i===0?'am':'pm')+'\" title=\"'+esc(restriction?restriction.type:'Omezení sálu')+'\">'+(S.zoom==='week'?'<span>'+esc(restriction?restriction.type:'Omezení sálu')+'</span>':'')+'</i>';}});if(r.issues.length) inner+='<b class=\"dot\"></b>';");
  script = replaceRequired(script, 'return [0,1].map(i=>{const h=r.h[i];if(!h)return {src:', 'return [0,1].map(i=>{if(r.blocked&&r.blocked[i])return null;const h=r.h[i];if(!h)return {src:');
  script = replaceRequired(script, 'function freeAt(room,d){const r=R(room,d),di=r.di;if(di.weekend||di.holiday)return [null,null];', 'function freeAt(room,d){const r=R(room,d),di=r.di,H=hoursFor(room,d);if(di.weekend||di.holiday||tmin(H.to)<=tmin(H.from))return [null,null];');
  script = replaceRequired(script, 'if(!h){if(working)x.free+=v;continue;}', 'if(r.blocked&&r.blocked[i]){x.blk+=v;continue;}if(!h){if(working)x.free+=v;continue;}');
  script = replaceRequired(script, 'if(working||h){b.cap+=v;dy.cap+=v;}if(!h)continue;', 'if(working||h){b.cap+=v;dy.cap+=v;}if(r.blocked&&r.blocked[i]){b.blk+=v;dy.blk+=v;continue;}if(!h)continue;');
  // The upstream yearly grid and proposal engine must use the host's working
  // days and AM/PM restrictions, just like the detailed timeline and free slots.
  script = replaceRequired(script, 'o.days++;const r=R(room,d);', 'const H=hoursFor(room,d);if(tmin(H.to)<=tmin(H.from))continue;o.days++;const r=R(room,d);');
  script = replaceRequired(script, 'for(let j=0;j<2;j++){const h=r.h[j];o.cap++;if(!h)continue;', 'for(let j=0;j<2;j++){if(halfMin(H,j)<=0)continue;const h=r.h[j];o.cap++;if(medroxHalfRestriction(r,j)){o.blk++;continue;}if(!h)continue;');
  script = replaceRequired(script, "if(!a.days){cls+=' hol';tip.push('státní svátky – bez provozu');}", "if(!a.days){cls+=' hol';tip.push(a.hol?'státní svátky – bez provozu':'bez pracovní kapacity');}");
  script = replaceRequired(script, "tyWeek(t){S.zoom='week';S.anchor=t.dataset.d;render();scrollTo({top:0,behavior:RM()?'auto':'smooth'});}", "tyWeek(t){S.zoom='week';S.anchor=t.dataset.d;render();medroxSend({type:'scroll-top'});}");
  script = replaceRequired(script, 'for(const room of rooms){const r=R(room,d);\n      if(r.block&&!(r.src===\'override\'&&(r.h[0]||r.h[1]))){if(d>to||!r.lost||!r.slot)continue;const sl=r.slot,hs=[sl.a||null,sl.split?(sl.b||null):(sl.a||null)];\n        hs.forEach((h,i)=>{if(!h||!h.s||reqFor(h.s,d,i,room.site,room.id)||done.has(`${r.block.id}|${room.id}|${d}|${i}`))return;blk.push({t:\'blk\',id:\'b|\'+plKey(room.id,d,i),room,d,i,s:h.s,an:h.an,b:r.block});});continue;}',
    'for(const room of rooms){const H=hoursFor(room,d);if(tmin(H.to)<=tmin(H.from))continue;const r=R(room,d);\n      if(d<=to&&r.lost&&r.slot){const sl=r.slot,hs=[sl.a||null,sl.split?(sl.b||null):(sl.a||null)];\n        hs.forEach((h,i)=>{const b=medroxHalfRestriction(r,i);if(!b||halfMin(H,i)<=0||!h||!h.s||reqFor(h.s,d,i,room.site,room.id)||done.has(`${b.id}|${room.id}|${d}|${i}`))return;blk.push({t:\'blk\',id:\'b|\'+plKey(room.id,d,i),room,d,i,s:h.s,an:h.an,b});});}');
  script = replaceRequired(script, "const one=(h,i,full)=>{const span=full?' f':'';if(!h)return", "const one=(h,i,full)=>{const span=full?' f':'';const restriction=medroxHalfRestriction(r,i);if(restriction)return '<span class=\"wt-b blk\"><b>'+esc(restriction.type)+'</b><small>'+halfT(H,i)+'</small></span>';if(!h)return");
  script = replaceRequired(script, 'else if(r.h[0]||r.h[1]){const a=r.h[0],b=r.h[1];inner=', 'else if(r.h[0]||r.h[1]||(r.blocked&&r.blocked.some(Boolean))){const a=r.h[0],b=r.h[1];inner=');
  script = replaceRequired(script, 'hpChip(a):hpChip(a)+hpChip(b);', 'hpChip(a):medroxHalfChip(r,a,0)+medroxHalfChip(r,b,1);');
  script = replaceRequired(script, "else{const one=(x,lab)=>{if(!x)return", "else{const one=(x,lab)=>{const restriction=medroxHalfRestriction(r,lab==='odp'?1:0);if(restriction)return '<span class=\"bc-h2 blk\">'+esc(restriction.type)+'</span>';if(!x)return");
  script = replaceRequired(script, "else if(was)st=blk?'blk':'lost';", "else if(was)st=(blk||medroxHalfRestriction(r,i))?'blk':'lost';");
  script = replaceRequired(script, "st==='blk'?r.block.type.toLowerCase()", "st==='blk'?(medroxHalfRestriction(r,i)||r.block).type.toLowerCase()");
  // Preserve the upstream procedural 3D renderer and its editor. Its libraries
  // are bundled locally; the isolated document never fetches executable code.
  const loaderStart = script.indexOf('function m3Script(src){');
  const loaderEnd = script.indexOf('function m3Init(){', loaderStart);
  if (loaderStart < 0 || loaderEnd < loaderStart) throw new Error('Chybí místní adaptace 3D knihovny.');
  script = script.slice(0, loaderStart) + "function m3Load(){if(window.THREE&&window.THREE.REVISION==='128'){M3.libs=true;return Promise.resolve();}return Promise.reject(new Error('Místní 3D knihovna není dostupná.'));}\n" + script.slice(loaderEnd);
  script = replaceRequired(script, "const M3_LIB='https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';", '');
  script = replaceRequired(script, '3D knihovnu se nepodařilo načíst. Zkontrolujte připojení k internetu a obnovte stránku.', 'Místní 3D knihovnu se nepodařilo načíst. Obnovte podklady plánovače.');
  // Keep the original model mounted, but never animate it behind the native
  // campus view. The mount guard also covers pending library-load callbacks.
  script = replaceRequired(script, 'function m3Mount(){', 'function m3Mount(){if(!medroxPresented){m3Stop();return;}');
  script = replaceRequired(script, 'function m3Loop(t){', 'function m3Loop(t){if(!medroxPresented){m3Stop();return;}');
  script = replaceRequired(script, 'function kmMount(){', 'function kmMount(){if(!medroxPresented){kmStop();return;}');
  script = replaceRequired(script, 'function kmLoop(t){', 'function kmLoop(t){if(!medroxPresented){kmStop();return;}');
  // Both campus renderers use the same public directory, not upstream's
  // shortened department lists or unverified operating-room capacities.
  const directory = JSON.stringify(CAMPUS_DIRECTORY).replace(/</g, '\\u003c');
  script = replaceRequired(script, 'const KM_OR=', `
KNL.forEach(b=>{
  const aliases={H:'HELIPORT',PD:'PARKING',CUM:'UZAVERA'};
  const entry=${directory}.find(e=>e.id===(aliases[b.id]||b.id));
  if(!entry)return;
  const rank=label=>/S2/i.test(label)?-2:/S1|suterén/i.test(label)?-1:/přízemí/i.test(label)?0:parseInt(label,10)||0;
  b.n=entry.name;
  b.f=(entry.floors||[]).map(f=>[f.label,f.departments]).sort((a,b)=>rank(a[0])-rank(b[0]));
});
const KM_OR=`);
  // Keep the existing host campus tab and room-model entry point. The new
  // upstream campus remains available inside the original renderer's tabs.
  script = replaceRequired(script, "mp:{tab:'map'", "mp:{tab:'3d'");
  script = replaceRequired(script, "if(o.tab==='map'&&o.site!=='LB')o.tab='3d';", '');
  script = replaceRequired(script, "...(o.site==='LB'?[['map','Mapa areálu']]:[])", "...([['map','Mapa Liberec · v33']])");
  // Upstream demo migrations must not add hospital master records, even when
  // restoring an older in-frame version/import without the latest flags.
  script = replaceRequired(script, 'if(!D.flags.cosgyn){', 'if(false){');
  script = replaceRequired(script, "function mpCampusSeed(site){if(site!=='LB')return {blds:[],amb:[],heli:[],links:[]};", 'function mpCampusSeed(site){return {blds:[],amb:[],heli:[],links:[]};');
  script = replaceRequired(script, "if(!M.bname)M.bname=site==='LB'?'Pavilon A – chirurgické obory':'Hlavní budova';", "if(!M.bname)M.bname='Modelová budova';");
  // Room codes are not verified building/floor identities. Await floorplans
  // and explicit ID mapping rather than silently locating clinical rooms.
  script = replaceRequired(script, "function kmGrpRooms(g){return D.rooms.filter(r=>r.site==='LB'&&r.active&&r.kind!=='pacu'&&g.re.test(r.code));}", 'function kmGrpRooms(g){return [];}');
  script = replaceRequired(script, "${mp.live?'Stav sálů živě':'Stav sálů podle plánu'}", 'Sály nejsou přiřazené k podlažím');
  script = replaceRequired(script, '<div class="m3-bot"><div class="m3-leg" id="km-leg">${kmLegHTML(kmCounts())}</div>${kmTimeHTML(tr)}</div>', '<div class="m3-bot"><p class="hint">Orientační mapa Liberec · přesné půdorysy, počty lůžek a přiřazení sálů čekají na podklady. Nezobrazuje živé kapacity.</p></div>');
  const mapViewStart = script.indexOf('function vMap(){');
  const mapKpis = script.indexOf('<div class="kpis k4">', mapViewStart);
  if (mapViewStart < 0 || mapKpis < mapViewStart) throw new Error('Chybí souhrn prostorového modelu.');
  script = script.slice(0, mapKpis) + script.slice(mapKpis).replace('<div class="kpis k4">', '<div class="kpis k4" style="${o.tab===\'map\'?\'display:none\':\'\'}">');
  const mapSeedStart = script.indexOf('function mapSeed(site){');
  const mapSeedEnd = script.indexOf('function mapOf(site){', mapSeedStart);
  if (mapSeedStart < 0 || mapSeedEnd < mapSeedStart) throw new Error('Chybí adaptace dispozice sálů.');
  script = script.slice(0, mapSeedStart) + 'function mapSeed(site){return medroxMapSeed(site);}\n' + script.slice(mapSeedEnd);
  script = replaceRequired(script, "if(!SITE[o.site])o.site='LB';", 'if(!SITE[o.site])o.site=SITES[0].id;');
  script = replaceRequired(script, 'Object.assign(o,{t0,t1,H});', "Object.assign(o,{t0,t1,H});if(t1<=t0){o.closed=true;o.why='mimo pracovní dobu';KC.set(key,o);return o;}");
  script = replaceRequired(script, "const h=r.h[i],l=bl[bl.length-1];if(h&&!h.released&&l&&l.h&&!l.h.released&&l.h.s===h.s&&l.h.an===h.an)l.b=b;else bl.push({a,b,h});", "const h=r.h[i],blocked=medroxHalfRestriction(r,i),l=bl[bl.length-1];if(b<=a)return;if(h&&!h.released&&!blocked&&l&&!l.blocked&&l.h&&!l.h.released&&l.h.s===h.s&&l.h.an===h.an)l.b=b;else bl.push({a,b,h,blocked});");
  script = replaceRequired(script, "for(const B of bl){if(!B.h||B.h.released)", "for(const B of bl){if(B.blocked){o.segs.push({a:B.a,b:B.b,k:'off',blk:B.blocked});continue;}if(!B.h||B.h.released)");
  script = replaceRequired(script, "let sub='';\n  if(g.k==='op')", "let sub='';\n  if(g.blk)sub=g.blk.type;else if(g.k==='op')");
  script = replaceRequired(script, "if(st.k==='off')return st.blk||!it.room?Infinity:20;", "if(st.k==='off')return Infinity;");
  script = replaceRequired(script, "mpFull(){const o=S.mp;o.full=!o.full;try{const de=document.documentElement;if(o.full){if(de.requestFullscreen&&!document.fullscreenElement)de.requestFullscreen().catch(()=>{});}else if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(e){}render();},", 'mpFull(){S.mp.full=!S.mp.full;render();},');
  script = replaceRequired(script, "Ukázkové rozvržení – upravte ho v editoru podle skutečné budovy.", 'Modelové rozvržení – nejde o skutečný půdorys nemocnice.');
  script = replaceRequired(script, "return ph('Provoz','Operační sály 3D',seg)+`", "return ph('Provoz','Operační sály 3D',seg)+`<div class=\"note warn medrox-model-notice\"><div><b>Modelová simulace podle plánu</b><p>Nejde o živý stav ani skutečný půdorys nemocnice. Výkony, úklid a časy transportu jsou modelové odhady, nikoli podklad pro klinické rozhodnutí.</p></div></div>");
  script = replaceRequired(script, 'Živý stav sálů podle plánu operativy:', 'Modelový stav sálů podle plánu operativy:');
  script = replaceRequired(script, "o.live?'Aktuální stav operačních sálů v reálném čase':'Stav operačních sálů podle plánu'", "o.live?'Modelová simulace · aktuální čas':'Modelová simulace podle plánu'");
  script = replaceRequired(script, '<i></i>Živě</button>', '<i></i>Teď</button>');
  // Upstream demo IDs doubled as short labels (CHI, ORT). Host department IDs
  // are opaque: resolve names at display time without changing plan keys/colors.
  const modelStart = script.indexOf('const MCELL=2;');
  const modelEnd = script.indexOf('const SR=[', modelStart);
  if (modelStart < 0 || modelEnd < modelStart) throw new Error('Chybí popisky prostorového modelu.');
  let model = script.slice(modelStart, modelEnd);
  for (const [before, after] of [
    ['${g.s} · ${g.an}', '${specName(g.s)} · ${g.an}'],
    ['${g.s} · začátek', '${specName(g.s)} · začátek'],
    ['uvolněno · ${g.rel}', 'uvolněno · ${specName(g.rel)}'],
    ["(it.specs||[]).join(' · ')", "(it.specs||[]).map(specName).join(' · ')"],
    ["it.specs.join(', ')", "it.specs.map(specName).join(', ')"],
    ["f.specs.join(', ')", "f.specs.map(specName).join(', ')"],
    ['esc(g.s)', 'esc(specName(g.s))'],
    ['esc(x.h.s)', 'esc(specName(x.h.s))'],
    ['esc(h.s)', 'esc(specName(h.s))'],
    ['esc(c.s)', 'esc(specName(c.s))'],
  ]) model = replaceRequired(model, before, after);
  script = script.slice(0, modelStart) + model + script.slice(modelEnd);
  script = replaceRequired(script, 'data:vData,', 'data:vMedroxData,');
  script = replaceRequired(script, 'timeline:vTimeline,rooms:vRooms,', 'timeline:vTimeline,rooms:vMedroxRooms,');
  script = replaceRequired(script, '<small>Krajská nemocnice Liberec</small>', '<small>${esc((SITES[0]||{}).name||\'Pracovní návrh\')}</small>');
  // Navigation belongs to the application's native toolbar, not a second shell.
  script = replaceRequired(script, "$('#side').innerHTML=sideHTML();", "$('#side').innerHTML='';");
  script = replaceRequired(script, '  savePrefs();\n}\naddEventListener(\'beforeprint\'', '  savePrefs();medroxNotifyView();medroxReportHeight();\n}\naddEventListener(\'beforeprint\'');
  script = replaceRequired(script, 'booted=true; if(!D.pub)', "if(typeof host.initialView==='string'&&medroxAllowedViews().includes(host.initialView))S.view=host.initialView;booted=true; if(!D.pub)");
  script = replaceRequired(script,
    "if(y+h>innerHeight-8&&r.top-h-6>8)y=r.top-h-6;host.style.left=x+'px';host.style.top=Math.max(8,y)+'px';}",
    "const vp=medroxViewport();if(y+h>vp.top+vp.height-8&&r.top-h-6>vp.top+8)y=r.top-h-6;host.style.left=x+'px';host.style.top=Math.max(vp.top+8,Math.min(y,vp.top+vp.height-h-8))+'px';}");
  // The updated upstream uses the same placement formula for its custom select.
  script = replaceRequired(script,
    "if(y+h>innerHeight-8&&r.top-h-6>8)y=r.top-h-6;host.style.left=x+'px';host.style.top=Math.max(8,y)+'px';}",
    "const vp=medroxViewport();if(y+h>vp.top+vp.height-8&&r.top-h-6>vp.top+8)y=r.top-h-6;host.style.left=x+'px';host.style.top=Math.max(vp.top+8,Math.min(y,vp.top+vp.height-h-8))+'px';}");
  script = replaceRequired(script,
    "function placeTip(e){const r=tip.getBoundingClientRect();let x=e.clientX+14,y=e.clientY+16;if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(8,y)+'px';}",
    "function placeTip(e){const r=tip.getBoundingClientRect(),vp=medroxViewport();let x=e.clientX+14,y=e.clientY+16;if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;if(y+r.height>vp.top+vp.height-8)y=e.clientY-r.height-14;tip.style.left=Math.max(8,x)+'px';tip.style.top=Math.max(vp.top+8,y)+'px';}");
  const extension = `
let medroxLastHeight=0,medroxVisible=null,medroxPresented=true;
const MEDROX_HOSPITAL=typeof host.hospitalName==='string'&&host.hospitalName.trim()?host.hospitalName.trim().slice(0,160):'Zdravotnické zařízení';
const MEDROX_HOSPITAL_SHORT=typeof host.hospitalShortName==='string'&&host.hospitalShortName.trim()?host.hospitalShortName.trim().slice(0,40):MEDROX_HOSPITAL;
// Tiskovou stránku otevírá hostitelská aplikace: rámec s neprůhledným původem
// nemůže zapisovat do vlastního nového okna. Když hostitel okno otevřít nemůže
// (zablokované okno), vrátí 'print-direct' a tiskne se přímo z rámce.
let medroxPendingPrint=null;
function medroxOpenPrint(title,inner){
  let doc;try{doc=printDocHTML(title,inner==null?viewPrintHTML():inner);}catch{return false;}
  medroxPendingPrint={inner};
  medroxSend({type:'print',title:String(title).slice(0,300),html:doc});
  return true;
}
function medroxPrintInFrame(){
  const pending=medroxPendingPrint;medroxPendingPrint=null;if(!pending)return;
  if(pending.inner==null){window.print();return;}
  const h=$('#prt');h.innerHTML=pending.inner;document.body.classList.add('prt-on');
  const done=()=>{document.body.classList.remove('prt-on');h.innerHTML='';removeEventListener('afterprint',done);};
  addEventListener('afterprint',done);window.print();
}
function medroxSend(message){parent.postMessage({protocol:'${OPERATIVITY_FRAME_PROTOCOL}',channel:host.channel,...message},'*');}
function medroxAllowedViews(){return navList().flatMap(([,items])=>items.map(([view])=>view)).filter(view=>Object.prototype.hasOwnProperty.call(VIEWS,view));}
function medroxNotifyView(){medroxSend({type:'view',view:S.view,allowedViews:medroxAllowedViews(),theme:S.theme,counts:{alerts:ISSUES().length,requests:D.requests.filter(q=>q.status==='pending').length,free:(D.claims||[]).filter(c=>c.status==='pending').length}});}
function medroxReportHeight(){const app=$('.app');if(!app)return;const height=Math.ceil(app.getBoundingClientRect().height);if(Number.isFinite(height)&&height>0&&height!==medroxLastHeight){medroxLastHeight=height;medroxSend({type:'resize',height});}}
function medroxViewport(){return medroxVisible||{top:0,height:Math.max(1,innerHeight)};}
function medroxReceive(message){
  if(message.type==='print-direct'){medroxPrintInFrame();return;}
  if(message.type==='print-opened'){medroxPendingPrint=null;return;}
  if(message.type==='presentation'){
    if(typeof message.visible!=='boolean'||message.visible===medroxPresented)return;
    medroxPresented=message.visible;
    if(!medroxPresented){m3Stop();kmStop();}else if(S.view==='map'){if(S.mp.tab==='3d')m3Mount();else if(S.mp.tab==='map')kmMount();}
    return;
  }
  if(message.type==='sidebar-action'){
    const action=message.action;
    if(!['cmd','bulk','newReq'].includes(action)||(!host.canEdit&&action!=='cmd'))return;
    const target={dataset:{act:action}};
    if(canAct(action,target)&&typeof ACT[action]==='function')ACT[action](target);
    return;
  }
  if(message.type==='viewport'){
    if(!Number.isFinite(message.top)||message.top<0||!Number.isFinite(message.height)||message.height<=0||message.height>20000)return;
    medroxVisible={top:message.top,height:message.height};
    document.documentElement.style.setProperty('--medrox-visible-top',message.top+'px');
    document.documentElement.style.setProperty('--medrox-visible-height',message.height+'px');
    document.documentElement.style.setProperty('--medrox-scene-height',Math.max(440,Math.min(780,Math.round(message.height*.78)))+'px');
    if(DP.id)placeDP();if(SPK.el)placeSP();return;
  }
  if(message.type!=='navigate'||typeof message.view!=='string'||!medroxAllowedViews().includes(message.view))return;
  const target={dataset:{v:message.view}};if(!canAct('go',target))return;
  S.edit=null;S.bulk=null;S.fix=null;S.help=false;S.reloc=null;S.printInfo=false;S.rolePop=false;
  closeDP();spClose();cmdClose();if(BOARD)boardClose();tip.hidden=true;renderDrawer();renderModal();ACT.go(target);
}
function medroxObserve(){const app=$('.app');if(app&&typeof ResizeObserver==='function')new ResizeObserver(medroxReportHeight).observe(app);addEventListener('resize',medroxReportHeight);medroxReportHeight();}
function vMedroxData(){return '<div class="note warn"><div><b>Verze a historie platí do zavření plánovače.</b><p>Pracovní návrh se ukládá místně. Pro trvalou samostatnou zálohu použijte Stáhnout návrh v horní liště aplikace.</p></div></div>'+vData();}
const MEDROX_MASTER_ACTIONS=new Set(['addRoom','delRoom','roomAn','specColor','addSpec','delSpec','rcSet','rcOpen','hSave','hSaveGroup','hReset','addGroup','delGroup']);
const MEDROX_MASTER_CHANGES=new Set(['roomKind','roomName','roomCode','roomSite','roomActive','roomLoc','pacuF','specName','rcCustom','groupName']);
// Guard direct command-palette callbacks as well as delegated button actions.
[...MEDROX_MASTER_ACTIONS,'role','rolePop','resetDemo'].forEach(action=>{if(ACT[action])ACT[action]=()=>toast('Přístup a údaje spravuje hlavní aplikace.');});
function medroxHalfRestriction(r,i){return (r.restrictions||[]).find(block=>!block.part||block.part==='full'||block.part===(i===0?'am':'pm'))||null;}
function medroxHalfChip(r,h,i){const restriction=medroxHalfRestriction(r,i);return restriction?'<span class="hp x">'+esc(restriction.type)+'</span>':hpChip(h);}
function vMedroxRooms(){return ph('Podklady aplikace','Sály a obory')+'<div class="stack"><section class="card"><h2>Údaje ze společné aplikace</h2><p class="hint">Názvy, vybavení a barvy jsou podklady pro čtení. Sály a obory spravujte v Nastavení hlavní aplikace; zde upravujete pouze pracovní plán.</p><div class="ovx"><table class="tb"><thead><tr><th>Sál</th><th>Skupina</th><th>Pracoviště</th></tr></thead><tbody>'+D.rooms.map(room=>'<tr><th>'+esc(room.name)+'</th><td>'+esc(gName(room.group))+'</td><td>'+esc((SITE[room.site]||{}).name||'')+'</td></tr>').join('')+'</tbody></table></div></section>'+seasonCard()+'<section class="card" id="tpl-card"><div class="card-h"><h2>Týdenní šablona provozu</h2>'+tplSel()+'</div><p class="hint">Změny této šablony jsou součástí místního pracovního návrhu.</p><div class="ovx">'+tplGrid()+'</div></section><section class="card"><h2>Operační obory</h2><div class="tags">'+D.specs.map(spec=>'<span class="chip st" style="--c:'+spec.c+'"><i></i>'+esc(spec.name)+'</span>').join('')+'</div></section></div>';}
const medroxOriginalImportCheck=impCheck;
impCheck=function(text){
  try{
    if(typeof text!=='string'||text.length>8000000)throw new Error();
    const incoming=JSON.parse(text),metadata=incoming&&incoming._medrox,canonical=host.data;
    const sameIds=(items,known)=>Array.isArray(items)&&items.length===known.length&&new Set(items.map(item=>item&&item.id)).size===known.length&&items.every(item=>item&&known.some(record=>record.id===item.id));
    if(!incoming||incoming.v!==2||!metadata||metadata.hospitalId!==canonical._medrox.hospitalId||JSON.stringify(metadata.years)!==JSON.stringify(host.years)||!sameIds(incoming.rooms,canonical.rooms)||!sameIds(incoming.specs,canonical.specs)||!incoming.staff||!incoming.staff.norm||!incoming.staff.cap)throw new Error();
    incoming.rooms=canonical.rooms.map(room=>({...room}));incoming.specs=canonical.specs.map(spec=>({...spec}));incoming._medrox=JSON.parse(JSON.stringify(canonical._medrox));
    medroxOriginalImportCheck(JSON.stringify(incoming));
  }catch{S.imp={text:typeof text==='string'?text:'',ok:false,err:'Záloha neodpovídá aktuální nemocnici, období nebo načteným sálům a oborům.'};}
};
function medroxMapSeed(site){
  const rooms=D.rooms.filter(room=>room.site===site&&room.active),ors=rooms.filter(room=>room.kind!=='pacu'),pacus=rooms.filter(room=>room.kind==='pacu');
  const count=Math.max(1,Math.ceil((ors.length+pacus.length)/6)),floors=[{lv:0,name:'1. NP · Modelové zázemí'}],items=[];let next=0;
  const add=(k,lv,x,y,w,h,more={})=>items.push({id:'medrox-map-'+site+'-'+(++next),k,lv,x,y,w,h,name:MK[k].n,...more});
  for(let lv=1;lv<=count;lv++)floors.push({lv,name:(lv+1)+'. NP · Modelové sály '+lv});
  floors.forEach(({lv})=>{add('hall',lv,1,13,46,2,{name:'Modelová hlavní chodba'});add('stair',lv,25,9,3,4,{name:'Modelové schodiště'});});
  add('elev',0,22,9,3,4,{name:'Modelový lůžkový výtah',lv1:count});
  add('ward',0,2,3,18,10,{name:'Modelová lůžková stanice',specs:D.specs.map(spec=>spec.id),beds:0});
  add('er',0,28,3,18,10,{name:'Modelový příjem',beds:0});
  add('icu',0,2,15,12,9,{name:'Modelová JIP',beds:0});
  add('pacu',0,15,15,10,9,{name:'Modelový dospávací pokoj',beds:0});
  add('other',0,28,15,18,9,{name:'Modelová centrální sterilizace'});
  [...ors,...pacus].forEach((room,index)=>{const lv=1+Math.floor(index/6),slot=index%6;add(room.kind==='pacu'?'pacu':'or',lv,2+(slot%3)*6+(slot>=3?26:0),3,6,10,{room:room.id,name:room.name});});
  for(let lv=1;lv<=count;lv++){add('staff',lv,2,15,12,9,{name:'Modelové zázemí personálu'});add('other',lv,28,15,18,9,{name:'Modelová přípravna'});}
  return {W:48,H:28,floors,items,schematic:true};
}
`;
  // Install the custom action before boot() renders or handles any interaction.
  script = replaceRequired(script, 'let booted=false;', extension + '\nlet booted=false;');
  const bridge = `
'use strict';
(()=>{
  const protocol='${OPERATIVITY_FRAME_PROTOCOL}';let initialized=false,channel=null,receive=null;
  function launch(host){
    const memory=new Map([['knl-rozpis-data-v1',JSON.stringify(host.data)]]);let launched=false;
    const localStorage={getItem:key=>memory.has(String(key))?memory.get(String(key)):null,setItem(key,value){key=String(key);value=String(value);const changed=memory.get(key)!==value;memory.set(key,value);if(launched&&host.canEdit&&changed&&key==='knl-rozpis-data-v1'){let data;try{data=JSON.parse(value);}catch{return;}parent.postMessage({protocol,type:'draft',channel:host.channel,data},'*');}},removeItem:key=>memory.delete(String(key)),clear:()=>memory.clear()};
    ${threeRuntime ? `(function(){\n${threeRuntime}\n}).call(window);` : ''}
    ${script}
    launched=true;receive=medroxReceive;medroxObserve();
  }
  addEventListener('message',event=>{
    const message=event.data;if(event.source!==parent||!message||message.protocol!==protocol)return;
    if(initialized){if(message.channel===channel&&receive)receive(message);return;}
    if(message.type!=='init'||typeof message.channel!=='string'||!message.channel||!message.data)return;
    const host=message.data;
    if(!host.data||host.data.v!==2||!Array.isArray(host.data.rooms)||!Array.isArray(host.data.specs)||!Array.isArray(host.data.groups)||!Array.isArray(host.sites)||!host.sites.length||!Array.isArray(host.years)||!host.years.length||!host.years.every(y=>Number.isInteger(y)&&y>=2020&&y<=2100)||typeof host.canEdit!=='boolean')return;
    initialized=true;channel=message.channel;
    try{launch(Object.freeze({...host,channel:message.channel,theme:host.theme==='light'?'light':'dark'}));}catch{parent.postMessage({protocol,type:'error',channel:message.channel},'*');}
  });
  parent.postMessage({protocol,type:'ready'},'*');
})();
`;
  const style = `<style>
.rolew,[data-act="resetDemo"]{display:none!important}.top .srch{display:inline-flex}
html,body{height:auto!important;min-height:0!important;background:transparent!important;background-image:none!important;overflow:hidden!important}body{padding:0!important}
.app,.app.mini{display:block!important;grid-template-columns:minmax(0,1fr)!important;max-width:none!important;margin:0!important;padding:0!important;border-radius:0!important;background:transparent!important;min-height:0!important;transition:none!important}
#side,.brand{display:none!important}.main{min-width:0;gap:18px}.panel#view{background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:0!important;padding:0!important;min-height:0!important}
#top{display:none}.bc-side,.pl-srcs{max-height:none;overflow:visible}.spk{max-height:min(420px,calc(var(--medrox-visible-height,100vh) - 24px))}
.ph{align-items:center;gap:12px;margin-bottom:20px;padding:8px 0 16px;border-bottom:1px solid var(--line)}
.ph h1{font-size:24px;line-height:1.25;letter-spacing:-.025em;margin:0}.ph .eyebrow{font-size:10px;letter-spacing:.08em;margin-bottom:4px}
.ph-r{gap:6px;align-items:center}.ph-r .top-r{gap:6px}.ph-r .yr-note,.ph-r .status,.ph-r .srch,.ph-r [data-act="bulk"]{display:none}.ph-r .years{gap:4px}.ph-r .yr{font-size:14px;padding:8px}.ph-r .btn.sm{min-height:40px;padding:8px 12px}.ph-r .icon-btn{width:40px;height:40px}.ph-r .today{font-size:12px}
@media(max-width:767px){.ph h1{font-size:22px}.ph-r{width:100%;justify-content:flex-start}.ph-r .srch,.ph-r [data-act="bulk"]{display:inline-flex}.ph .eyebrow{max-width:100%;white-space:normal}}
.dw-wrap,.mo-wrap,.cmd-wrap,.board{top:var(--medrox-visible-top,0px)!important;bottom:auto!important;height:var(--medrox-visible-height,100vh)!important;min-height:0!important}
.mo{max-height:calc(var(--medrox-visible-height,100vh) - 32px)}.cmd-wrap{padding-top:min(64px,calc(var(--medrox-visible-height,100vh) * .1))}.cmd{max-height:calc(var(--medrox-visible-height,100vh) - 96px)}
.toast{top:calc(var(--medrox-visible-top,0px) + var(--medrox-visible-height,100vh) - 22px);bottom:auto;transform:translate(-50%,-100%)}
.m3-host{height:var(--medrox-scene-height,620px)!important;min-height:0!important}.m3-card.full{top:var(--medrox-visible-top,0px)!important;bottom:auto!important;height:var(--medrox-visible-height,800px)!important}.m3-card.full .m3-host{height:100%!important}.medrox-model-notice{margin-bottom:16px}
.c>.x.am{bottom:auto;height:calc(50% - 4px)}.c>.x.pm{top:auto;height:calc(50% - 4px)}.z-y .c>.x.am,.z-y .c>.x.pm{height:calc(50% - 2.5px)}
/* Calendar-only contrast corrections; keep the upstream palette and occupancy scale. */
@media screen {
:root[data-ui="dark"] .bc-card{--ink-3:#BBC6E2;--ink-4:#BBC6E2}
:root[data-ui="dark"] .by{gap:16px;padding-top:12px}
:root[data-ui="dark"] .by-m{padding:12px;border:1px solid #3E4B70;border-radius:14px;background:#111834;min-width:0}
:root[data-ui="dark"] .by-mh{gap:6px;flex-wrap:wrap;margin-bottom:12px;color:#F2F5FE}
:root[data-ui="dark"] .by-mh b{font-size:15px}
:root[data-ui="dark"] .by-mh span{font-size:12px;color:#BBC6E2}
:root[data-ui="dark"] .by-g{gap:4px}
:root[data-ui="dark"] .by-g>span{font-size:11px;font-weight:500;color:#BBC6E2;padding-bottom:6px}
:root[data-ui="dark"] .by-d{font-size:13px;font-weight:600;color:#F2F5FE!important;background:color-mix(in srgb,var(--bg-d,var(--sunk)) 65%,#0D142A);border:1px solid #3E4B70}
:root[data-ui="dark"] .by-d.we{background:#1C2744;color:#CFD7ED!important;border-color:#3E4B70}
:root[data-ui="dark"] .by-d.hol{background:color-mix(in srgb,var(--hol) 16%,#111834);color:#FFBBA8!important}
:root[data-ui="dark"] .by-d:hover{border-color:#BBC6E2;transform:none}
:root[data-ui="dark"] .by-d:focus-visible,:root[data-ui="dark"] .by-mh:focus-visible{outline:2px solid #5EC8E4;outline-offset:2px}
:root[data-ui="dark"] .bc-h,:root[data-ui="dark"] .bc-h.we{color:#BBC6E2;font-size:12px}
:root[data-ui="dark"] .bc-d b{color:#F2F5FE;font-weight:500}
:root[data-ui="dark"] .bc-c.td .bc-d b{color:var(--raised)}
:root[data-ui="dark"] .bc-lg .sc i{background:color-mix(in srgb,var(--dot) var(--medrox-occupancy,20%),#0D142A)!important}
:root[data-ui="dark"] .bc-lg .sc i:nth-child(1){--medrox-occupancy:12.74%}
:root[data-ui="dark"] .bc-lg .sc i:nth-child(2){--medrox-occupancy:27.56%}
:root[data-ui="dark"] .bc-lg .sc i:nth-child(3){--medrox-occupancy:42.38%}
:root[data-ui="dark"] .bc-lg .sc i:nth-child(4){--medrox-occupancy:57.2%}
}
</style>`;
  const head = sourceHtml.slice(0, start).replace('<title>Rozpis operativy KNL</title>', '<title>Rozpis operativy · pracovní návrh</title>').replace(/<link\b[^>]*>/gi, '').replace(/<meta\b[^>]*http-equiv=["']?Content-Security-Policy[\s\S]*?>/gi, '');
  // CSP is first in head, before the document's inline styling or script.
  return head.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}">`)
    + style + '<script>' + bridge.replace(/<link\b[^>]*>/gi, '') + '</script>' + sourceHtml.slice(end + '</script>'.length);
}

export const buildOperativityFrameHtml = buildOperativityFrame;
