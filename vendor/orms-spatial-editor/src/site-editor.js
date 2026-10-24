import {SpatialViewer} from './viewer.js';
import {PlanViewer} from './plan-viewer.js';
import {clone,normalizeAngle,snapRoomPlacement,uid} from './model.js';
import {
 ROOFTOP_CLEARANCE,SITE_LIMITS,SITE_TYPES,STOREY_HEIGHT,SiteStore,clampSiteElement,createDefaultSiteProject,
 createSiteElement,metres,pavilionUnder,siteHeightLimits,siteSizeLimits,siteWarnings,storeysForHeight
} from './site-model.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE_HELP={pavilion:'Budova s podlažími a vstupem',heliport:'Přistávací plocha s nastavitelnou výškou',parking:'Stání pro vozidla',road:'Příjezdy a obslužné cesty',plaza:'Chodníky a nástupní plochy',green:'Park a vzrostlá zeleň'};

/**
 * Editor mapy areálu. Používá stejné rozvržení (knihovna · plátno · inspektor),
 * stejné CSS třídy a stejný 3D prohlížeč jako editor operačního bloku, takže
 * obě obrazovky vypadají a ovládají se shodně. Nečte ani nezapisuje vzdálená
 * data; ukládání řeší hostitelská aplikace přes `onChange`.
 */
export function mountSiteEditor(root,{project=createDefaultSiteProject(null),onChange=()=>{},initialSelectedId=null}={}){
 const store=new SiteStore(project);
 let selectedId=initialSelectedId,tool='translate',snap=0.5,disposed=false,bootMessage='Mapa areálu připravena';
 const floorId=()=>store.value.floors[0].id;
 root.classList.add('orms-editor','orms-site-editor');root.tabIndex=0;
 root.innerHTML=`<aside class="oe-library"><div class="oe-section-title">AREÁL</div><label>Název areálu<input data-site-prop="name" type="text" value=""></label><div class="oe-section-title">PŘIDAT OBJEKT</div><div class="oe-room-types oe-site-types">${Object.entries(SITE_TYPES).map(([k,v])=>`<button data-add-element="${k}" title="${esc(TYPE_HELP[k])}">${v}</button>`).join('')}</div><p class="oe-help">Nový objekt se vloží vedle stávající zástavby. Ploché prvky (komunikace, parkoviště, zeleň) se mohou křížit.</p></aside>
 <main class="oe-workspace"><div class="oe-title"><div><h1>Mapa areálu</h1><p data-ui="subtitle"></p></div><span class="oe-demo">EDITOVATELNÁ SCÉNA</span></div><div class="oe-toolbar"><div class="oe-segment"><button data-tool="translate">Přesun</button><button data-tool="rotate">Otočení</button><button data-tool="scale">Rozměry</button></div><button data-act="fit">3D pohled</button><button data-act="top">Shora</button><div class="oe-segment"><button data-act="undo" title="Zpět (Ctrl+Z)">Zpět</button><button data-act="redo" title="Znovu (Ctrl+Shift+Z)">Znovu</button></div><label>Přichycení <select data-field="snap"><option value="0.25">25 cm</option><option value="0.5" selected>50 cm</option><option value="1">1 m</option><option value="2">2 m</option><option value="5">5 m</option><option value="0">Volně</option></select></label></div><div class="oe-canvas" data-ui="canvas"></div><div class="oe-canvas-note">Kliknutím vyberte objekt · tažením za osy jej přesuňte · výšku heliportu nastavíte v pravém panelu</div><footer><span data-ui="status"></span><span>Metry · přichycení středů a hran · otáčení po 15°</span></footer></main>
 <aside class="oe-inspector"><div class="oe-section-title">OBJEKTY AREÁLU</div><div data-ui="objects" class="oe-objects"></div><div data-ui="inspector"></div><div class="oe-section-title">KONTROLA AREÁLU</div><div data-ui="warnings" class="oe-warnings"></div><p class="oe-help">Koncepční mapa. Rozměry a výšky odpovídají tomu, co zadáte; nejsou převzaté z katastru ani projektové dokumentace.</p></aside>`;
 const ui=name=>root.querySelector(`[data-ui="${name}"]`),status=message=>{if(!disposed)ui('status').textContent=message};
 const selected=()=>store.value.rooms.find(r=>r.id===selectedId)||null;
 const callbacks={
  onSelect:id=>{selectedId=id;render()},
  onTransform:(id,t)=>{
   commit(p=>{const r=p.rooms.find(r=>r.id===id);if(!r)return;r.x=+t.x.toFixed(3);r.z=+t.z.toFixed(3);r.rotation=+normalizeAngle(t.rotation).toFixed(3);if(Number.isFinite(t.width)&&Number.isFinite(t.depth)){r.width=t.width;r.depth=t.depth;if(r.type==='heliport'){const side=Math.max(t.width,t.depth);r.width=side;r.depth=side}}clampSiteElement(r)},t.snapped?'Objekt přichycen k sousední hraně nebo ose':tool==='scale'?'Rozměry objektu změněny':tool==='rotate'?'Otočení změněno':'Poloha změněna');
  },
  onGroupTransform:()=>{}
 };
 let viewer;
 try{viewer=new SpatialViewer(ui('canvas'),callbacks,{maxRoomSize:SITE_LIMITS.size[1],roomRotationSnap:Math.PI/12,far:4000,grid:[400,80],adaptiveShadow:true,fitScale:1.05,label:'3D mapa areálu'})}
 catch{ui('canvas').replaceChildren();viewer=new PlanViewer(ui('canvas'),callbacks);bootMessage='2D režim · pro 3D zapněte WebGL2 v prohlížeči';root.querySelector('[data-act="fit"]').textContent='Celý areál'}
 viewer.setSnap?.(snap);
 function emit(){try{onChange(clone(store.value))}catch(e){console.error('ORMS site onChange',e)}}
 function commit(fn,message='Změna uložena'){try{store.commit(fn);status(message);render();emit();return true}catch(e){status(e.message);render();return false}}
 function input(label,field,value,{type='number',step='0.5',min,max,unit}={}){return `<label>${label}${unit?` (${unit})`:''}<input data-prop="${field}" type="${type}" value="${esc(value)}" ${type==='number'?`step="${step}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''}`:''}></label>`}
 function heliportPanel(r){
  const [min,max]=siteHeightLimits('heliport'),roof=pavilionUnder(store.value,r),roofTarget=roof?+(roof.height+ROOFTOP_CLEARANCE).toFixed(2):null;
  const placement=r.height<=0.01?'Plošina leží na terénu.':roof&&r.height>=roof.height?`Plošina je ${metres(r.height-roof.height)} nad střechou objektu ${esc(roof.name)}.`:roof?`Plošina je pod úrovní střechy objektu ${esc(roof.name)} (${metres(roof.height)}).`:`Plošina stojí na samostatné konstrukci ${metres(r.height)} nad terénem.`;
  return `<section class="oe-heliport"><div class="oe-heliport-head"><b>VÝŠKA HELIPORTU</b><output data-ui="heliport-height">${metres(r.height)}</output></div>
  <input class="oe-heliport-range" data-height-range type="range" min="${min}" max="${max}" step="0.5" value="${r.height}" aria-label="Výška plošiny heliportu nad terénem">
  <div class="oe-heliport-steps"><button data-act="height-minus-5">−5 m</button><button data-act="height-minus-1">−1 m</button><button data-act="height-plus-1">+1 m</button><button data-act="height-plus-5">+5 m</button></div>
  ${input('Výška plošiny nad terénem','height',r.height,{step:0.1,min,max,unit:'m'})}
  <div class="oe-heliport-presets"><button data-act="heliport-ground">Na terén</button>${roof?`<button data-act="heliport-roof" title="Výška střechy ${esc(metres(roof.height))} + nosná konstrukce ${esc(metres(ROOFTOP_CLEARANCE))}">Na střechu · ${esc(metres(roofTarget))}</button>`:''}</div>
  <p class="oe-help">${placement}</p></section>`;
 }
 function render(){
  const p=store.value,r=selected();if(!r)selectedId=null;
  const nameInput=root.querySelector('[data-site-prop="name"]');if(document.activeElement!==nameInput)nameInput.value=p.name;
  const pavilions=p.rooms.filter(x=>x.type==='pavilion').length,heliports=p.rooms.filter(x=>x.type==='heliport');
  ui('subtitle').textContent=`${p.name} · ${p.rooms.length} objektů · ${pavilions} pavilonů${heliports.length?` · heliport ${heliports.map(h=>metres(h.height)).join(', ')}`:''}`;
  ui('objects').innerHTML=p.rooms.length?p.rooms.map(o=>`<button data-select="${esc(o.id)}" class="${o.id===selectedId?'selected active':''}">${esc(o.name)}<small>${esc(SITE_TYPES[o.type])}${o.type==='pavilion'?` · ${metres(o.height)}`:o.type==='heliport'?` · výška ${metres(o.height)}`:''}</small></button>`).join(''):'<p class="oe-help">Areál zatím neobsahuje žádný objekt.</p>';
  if(r){
   const [sizeMin,sizeMax]=siteSizeLimits(r.type),[hMin,hMax]=siteHeightLimits(r.type),square=r.type==='heliport';
   ui('inspector').innerHTML=`<div class="oe-section-title">${esc(SITE_TYPES[r.type].toLocaleUpperCase('cs'))}</div><h2>${esc(r.name)}</h2>${input('Název','name',r.name,{type:'text'})}
   ${r.type==='heliport'?heliportPanel(r):''}
   <div class="oe-form-grid">${input('X','x',r.x,{unit:'m'})}${input('Z','z',r.z,{unit:'m'})}${input('Otočení','rotation',r.rotation,{step:15,unit:'°'})}${square?input('Průměr plošiny','width',r.width,{min:sizeMin,max:sizeMax,unit:'m'}):`${input('Šířka','width',r.width,{min:sizeMin,max:sizeMax,unit:'m'})}${input('Hloubka','depth',r.depth,{min:sizeMin,max:sizeMax,unit:'m'})}`}</div>
   ${r.type==='pavilion'?`<div class="oe-section-title oe-transform-title">VÝŠKA PAVILONU</div><div class="oe-size-actions"><span>Podlaží</span><button data-act="storey-minus" aria-label="Ubrat podlaží">−</button><b class="oe-storeys">${storeysForHeight(r.height)}</b><button data-act="storey-plus" aria-label="Přidat podlaží">+</button></div><div class="oe-form-grid">${input('Výška budovy','height',r.height,{step:0.1,min:hMin,max:hMax,unit:'m'})}${input('Šířka vstupu','doorWidth',r.doorWidth,{min:1,unit:'m'})}</div><p class="oe-help">Jedno podlaží odpovídá ${metres(STOREY_HEIGHT)}. Výšku lze zadat i přesně.</p>`:''}
   <div class="oe-section-title oe-transform-title">RYCHLÉ TRANSFORMACE</div><div class="oe-transform-actions"><button data-act="rotate-left">−15°</button><button data-act="rotate-right">+15°</button><button data-act="snap-nearest">Přichytit</button></div>
   <div class="oe-row"><button data-act="duplicate">Duplikovat</button><button data-act="delete">Odstranit</button></div>`;
  }else ui('inspector').innerHTML='<p class="oe-help">Vyberte objekt v seznamu nebo kliknutím ve 3D scéně.</p>';
  const notes=siteWarnings(p);ui('warnings').innerHTML=notes.length?notes.slice(0,10).map(n=>`<p>${esc(n)}</p>`).join(''):'<p class="oe-ok">Bez kolizí pavilonů a heliportu.</p>';
  for(const b of root.querySelectorAll('[data-tool]'))b.classList.toggle('active',b.dataset.tool===tool);
  root.querySelector('[data-act="undo"]').disabled=!store.past.length;root.querySelector('[data-act="redo"]').disabled=!store.future.length;
  viewer.mode='room';viewer.cutaway=false;viewer.setProject(p,floorId(),selectedId?[selectedId]:[],selectedId);viewer.setTool(tool);
 }
 const setHeight=(value,message)=>commit(p=>{const r=p.rooms.find(r=>r.id===selectedId);r.height=+value;clampSiteElement(r)},message);
 function action(act){
  const p=store.value,r=selected();
  if(act==='undo'||act==='redo'){if(store[act]()){render();emit();status(act==='undo'?'Změna vrácena':'Změna obnovena')}return}
  if(act==='fit'||act==='top'){viewer.fit(act==='top');return}
  if(!r)return;
  if(act==='delete'){commit(p=>{p.rooms=p.rooms.filter(x=>x.id!==r.id);selectedId=null},'Objekt odstraněn · lze vrátit tlačítkem Zpět');return}
  if(act==='duplicate'){commit(p=>{const copy={...clone(r),id:uid('site'),name:`${r.name} · kopie`,x:r.x+r.width+4};p.rooms.push(copy);selectedId=copy.id},'Kopie přidána');return}
  if(act==='rotate-left'||act==='rotate-right'){commit(p=>{const v=p.rooms.find(v=>v.id===r.id);v.rotation=normalizeAngle(v.rotation+(act==='rotate-left'?-15:15))},'Objekt otočen o 15°');return}
  if(act==='snap-nearest'){const aligned=snapRoomPlacement(r,p.rooms,Math.max(1.5,snap||0));if(!aligned.snappedX&&!aligned.snappedZ){status('V dosahu není žádná hrana ani osa pro přichycení');return}commit(p=>{const v=p.rooms.find(v=>v.id===r.id);v.x=aligned.x;v.z=aligned.z},'Objekt zarovnán k nejbližší hraně nebo ose');return}
  if(act==='storey-minus'||act==='storey-plus'){const storeys=Math.max(1,storeysForHeight(r.height)+(act==='storey-plus'?1:-1));setHeight(storeys*STOREY_HEIGHT,`Pavilon má ${storeys} podlaží`);return}
  const step={'height-minus-5':-5,'height-minus-1':-1,'height-plus-1':1,'height-plus-5':5}[act];
  if(step!==undefined&&r.type==='heliport'){setHeight(r.height+step,`Výška heliportu ${step>0?'zvýšena':'snížena'}`);return}
  if(act==='heliport-ground'){setHeight(0,'Heliport umístěn na terén');return}
  if(act==='heliport-roof'){const roof=pavilionUnder(p,r);if(roof)setHeight(roof.height+ROOFTOP_CLEARANCE,`Heliport umístěn na střechu objektu ${roof.name}`);return}
 }
 function addElement(type){
  commit(p=>{
   const others=p.rooms,x=others.length?Math.max(...others.map(o=>o.x+Math.max(o.width,o.depth)/2))+8:0,element=createSiteElement(floorId(),type,0,0);
   element.x=+(x+element.width/2).toFixed(2);
   const count=p.rooms.filter(o=>o.type===type).length;if(count)element.name=`${SITE_TYPES[type]} ${count+1}`;
   p.rooms.push(element);selectedId=element.id;
  },`Objekt „${SITE_TYPES[type]}“ přidán do areálu`);
  viewer.fit();
 }
 function click(e){const b=e.target.closest('button');if(!b||!root.contains(b)||b.disabled)return;
  if(b.dataset.act){action(b.dataset.act);return}
  if(b.dataset.select){selectedId=b.dataset.select;render();return}
  if(b.dataset.tool){tool=b.dataset.tool;viewer.setTool(tool);render();return}
  if(b.dataset.addElement){addElement(b.dataset.addElement);return}
 }
 function change(e){const t=e.target;if(!root.contains(t))return;
  if(t.dataset.field==='snap'){snap=Number(t.value);viewer.setSnap(snap);return}
  if(t.dataset.siteProp==='name'){if(t.value.trim()&&t.value!==store.value.name)commit(p=>{p.name=t.value.trim()},'Název areálu změněn');else if(!t.value.trim())t.value=store.value.name;return}
  if(t.matches('[data-height-range]')){setHeight(Number(t.value),'Výška heliportu změněna');return}
  const prop=t.dataset.prop,r=selected();if(!prop||!r)return;
  const value=t.type==='number'?(t.value.trim()===''?NaN:Number(t.value)):t.value;
  if(String(r[prop]??'')===t.value)return;
  if(t.type==='number'&&!Number.isFinite(value)){status('Zadejte číselnou hodnotu');render();return}
  commit(p=>{const v=p.rooms.find(v=>v.id===r.id);if(prop==='name'){if(!String(value).trim())throw new Error('Název objektu nesmí být prázdný');v.name=String(value).trim()}else{v[prop]=prop==='rotation'?normalizeAngle(value):value;if(v.type==='heliport'&&prop==='width')v.depth=v.width}clampSiteElement(v)},prop==='height'&&r.type==='heliport'?'Výška heliportu změněna':'Změna uložena');
 }
 // Během tažení posuvníku se plošina ve 3D posouvá okamžitě; do historie
 // změn se zapíše až uvolněná hodnota.
 function preview(e){const t=e.target;if(!t.matches?.('[data-height-range]'))return;const r=selected();if(!r)return;
  const draft=clone(store.value),v=draft.rooms.find(v=>v.id===r.id);v.height=Number(t.value);clampSiteElement(v);
  const out=ui('heliport-height');if(out)out.textContent=metres(v.height);viewer.setProject(draft,floorId(),[r.id],r.id);
 }
 function blur(e){if(e.target.matches('input[data-prop],input[data-site-prop]'))change(e)}
 function key(e){if(e.target.closest('input,select,textarea')){if(e.key==='Enter'){e.preventDefault();change(e)}return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();action(e.shiftKey?'redo':'undo');return}if(e.key==='Delete'&&selectedId){e.preventDefault();action('delete')}if(e.key==='Escape'){selectedId=null;render()}}
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',preview);root.addEventListener('focusout',blur);root.addEventListener('keydown',key);
 render();viewer.fit();status(bootMessage);
 return {
  getProject:()=>clone(store.value),
  setProject:p=>{store.replace(p);selectedId=null;render();viewer.fit();emit()},
  exportGLB:()=>viewer.exportGLB(true),
  dispose(){disposed=true;viewer.dispose();root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',preview);root.removeEventListener('focusout',blur);root.removeEventListener('keydown',key);root.replaceChildren();root.classList.remove('orms-editor','orms-site-editor')}
 };
}
