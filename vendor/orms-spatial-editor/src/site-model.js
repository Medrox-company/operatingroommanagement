/**
 * Datový model mapy areálu. Sdílí jednotky, osy i tvar objektů s modelem
 * operačního bloku (metry, Y nahoru, půdorys v rovině x/z), takže jej umí
 * vykreslit stejný 3D prohlížeč. Objekty areálu jsou ploché nebo objemové
 * prvky terénu; vybavení místností se v areálu nepoužívá.
 */
import {VERSION,clone,uid,normalizeAngle,roomCorners,roomsOverlap} from './model.js';

export const SITE_KIND='site';
export const SITE_TYPES={pavilion:'Pavilon',heliport:'Heliport',parking:'Parkoviště',road:'Komunikace',plaza:'Zpevněná plocha',green:'Zeleň'};
/** Prvky ležící na terénu; mohou se křížit a překrývat bez varování. */
export const SITE_FLAT_TYPES=new Set(['parking','road','plaza','green']);
export const STOREY_HEIGHT=3.6;
export const SITE_LIMITS={
 size:[2,400],
 pavilionHeight:[3,150],
 heliportHeight:[0,150],
 heliportSize:[12,60],
 elements:300
};
const SIZES={pavilion:[40,18],heliport:[22,22],parking:[30,20],road:[60,7],plaza:[20,14],green:[24,16]};
const clamp=(value,[min,max])=>Math.max(min,Math.min(max,value));
/** Délka v metrech s desetinnou čárkou, např. „21,6 m“. */
export const metres=value=>`${(+Number(value).toFixed(2)).toLocaleString('cs-CZ')} m`;

export function createSiteElement(floorId,type='pavilion',x=0,z=0){
 const [width,depth]=SIZES[type]||SIZES.pavilion;
 return {id:uid('site'),floorId,name:SITE_TYPES[type],type,x,z,rotation:0,width,depth,height:type==='pavilion'?STOREY_HEIGHT*4:0,doorWidth:type==='pavilion'?4:0,externalId:''};
}

export const storeysForHeight=height=>Math.max(1,Math.round(height/STOREY_HEIGHT));

/** Rozměrové meze podle typu objektu; editor i prohlížeč je používají shodně. */
export function siteSizeLimits(type){return type==='heliport'?SITE_LIMITS.heliportSize:SITE_LIMITS.size}
export function siteHeightLimits(type){return type==='heliport'?SITE_LIMITS.heliportHeight:type==='pavilion'?SITE_LIMITS.pavilionHeight:[0,0]}
export function clampSiteElement(element){
 const size=siteSizeLimits(element.type);
 element.width=+clamp(element.width,size).toFixed(3);element.depth=+clamp(element.depth,size).toFixed(3);
 element.height=+clamp(element.height,siteHeightLimits(element.type)).toFixed(3);
 element.doorWidth=element.type==='pavilion'?+clamp(element.doorWidth,[1,Math.max(1,element.width-1)]).toFixed(3):0;
 element.rotation=+normalizeAngle(element.rotation).toFixed(3);
 return element;
}

function containsPoint(element,x,z){
 const t=element.rotation*Math.PI/180,dx=x-element.x,dz=z-element.z;
 return Math.abs(dx*Math.cos(t)-dz*Math.sin(t))<=element.width/2+1e-6&&Math.abs(dx*Math.sin(t)+dz*Math.cos(t))<=element.depth/2+1e-6;
}

/** Nejvyšší pavilon pod středem heliportu; slouží pro umístění na střechu. */
export function pavilionUnder(project,heliport){
 return project.rooms
  .filter(room=>room.type==='pavilion'&&room.floorId===heliport.floorId&&room.id!==heliport.id&&containsPoint(room,heliport.x,heliport.z))
  .sort((a,b)=>b.height-a.height)[0]||null;
}
/** Plošina na střeše stojí na nízké nosné konstrukci nad atikou. */
export const ROOFTOP_CLEARANCE=1.2;

export function createDefaultSiteProject(hospitalId,hospitalName){
 const floorId='site-ground';
 const element=(type,name,x,z,patch={})=>Object.assign(createSiteElement(floorId,type,x,z),{id:`site-${type}-${name.toLocaleLowerCase('cs').normalize('NFD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,name},patch);
 const main=element('pavilion','Pavilon A',0,0,{width:64,depth:20,height:STOREY_HEIGHT*6,doorWidth:6});
 const rooms=[
  element('road','Příjezdová komunikace',0,24,{width:120,depth:8}),
  element('road','Příjezd sanitních vozů',44,4,{width:40,depth:7,rotation:90}),
  main,
  element('pavilion','Pavilon B',-22,-30,{width:36,depth:18,height:STOREY_HEIGHT*4,doorWidth:4}),
  element('pavilion','Pavilon C',24,-30,{width:28,depth:16,height:STOREY_HEIGHT*3,doorWidth:4}),
  element('parking','Parkoviště',-38,44,{width:36,depth:22}),
  element('plaza','Vstupní plocha',0,15,{width:24,depth:10}),
  element('green','Park',30,44,{width:40,depth:22}),
  element('heliport','Heliport',22,0,{width:18,depth:18,height:main.height+ROOFTOP_CLEARANCE})
 ];
 for(const room of rooms)clampSiteElement(room);
 return validateSiteProject({schemaVersion:VERSION,kind:SITE_KIND,id:`site-${String(hospitalId||'default').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)}`,name:hospitalName?.trim()||'Areál nemocnice',units:'m',floors:[{id:floorId,name:'Areál',elevation:0,perimeterWalls:false,knlBoundaryEnabled:false}],rooms,items:[]});
}

export function validateSiteProject(p){
 const fail=msg=>{throw new Error(`Neplatná mapa areálu: ${msg}`)};
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const str=(v,label,max=160)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(label)};
 const num=(v,label,min=-10000,max=10000)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min-1e-9||v>max+1e-9)fail(label)};
 if(!obj(p)||p.kind!==SITE_KIND||p.schemaVersion!==VERSION||p.units!=='m')fail('podporován typ site, schemaVersion 1 a jednotky m');
 str(p.id,'ID areálu');str(p.name,'název areálu');
 if(!Array.isArray(p.floors)||p.floors.length!==1)fail('areál má právě jednu úroveň terénu');
 if(!Array.isArray(p.rooms)||p.rooms.length>SITE_LIMITS.elements)fail(`nejvýše ${SITE_LIMITS.elements} objektů`);
 if(!Array.isArray(p.items)||p.items.length)fail('areál neobsahuje vybavení místností');
 const floor=p.floors[0];if(!obj(floor))fail('terén');str(floor.id,'ID terénu');str(floor.name,'název terénu');num(floor.elevation,'výška terénu',-200,1000);
 const ids=new Set([floor.id]);
 for(const r of p.rooms){
  if(!obj(r))fail('objekt');str(r.id,'ID objektu');if(ids.has(r.id))fail(`duplicitní ID ${r.id}`);ids.add(r.id);str(r.name,'název objektu');
  if(r.floorId!==floor.id||!Object.hasOwn(SITE_TYPES,r.type))fail(`typ objektu ${r.name}`);
  for(const k of ['x','z','rotation'])num(r[k],`${k} · ${r.name}`);
  const size=siteSizeLimits(r.type),height=siteHeightLimits(r.type);
  num(r.width,`šířka · ${r.name}`,...size);num(r.depth,`hloubka · ${r.name}`,...size);
  num(r.height,r.type==='heliport'?`výška heliportu · ${r.name}`:`výška · ${r.name}`,...height);
  num(r.doorWidth,`šířka vstupu · ${r.name}`,0,Math.max(0,r.width-1));
  if(r.externalId!==undefined&&typeof r.externalId!=='string')fail('externalId');
 }
 return p;
}

export function siteWarnings(p){
 const out=[],rooms=p.rooms;
 const solid=rooms.filter(r=>!SITE_FLAT_TYPES.has(r.type));
 for(let i=0;i<solid.length;i++)for(let j=i+1;j<solid.length;j++){
  const a=solid[i],b=solid[j];if(!roomsOverlap(a,b))continue;
  if(a.type==='pavilion'&&b.type==='pavilion')out.push(`Překryv pavilonů: ${a.name} / ${b.name}`);
 }
 for(const heliport of rooms.filter(r=>r.type==='heliport')){
  const roof=pavilionUnder(p,heliport),touching=rooms.filter(r=>r.type==='pavilion'&&roomsOverlap(r,heliport));
  if(roof&&heliport.height<roof.height)out.push(`${heliport.name}: plošina (${metres(heliport.height)}) leží pod střechou ${roof.name} (${metres(roof.height)})`);
  else if(!roof&&touching.some(r=>heliport.height<r.height))out.push(`${heliport.name}: zasahuje do ${touching.find(r=>heliport.height<r.height).name}`);
  for(const other of rooms.filter(r=>r.type==='heliport'&&r.id!==heliport.id&&r.id>heliport.id))if(roomsOverlap(heliport,other))out.push(`Překryv heliportů: ${heliport.name} / ${other.name}`);
 }
 return out;
}

/** Ohraničující obdélník všech objektů v půdorysu (pro terén a kameru). */
export function siteBounds(rooms){
 if(!rooms.length)return null;
 const corners=rooms.flatMap(roomCorners);
 return {minX:Math.min(...corners.map(p=>p[0])),maxX:Math.max(...corners.map(p=>p[0])),minZ:Math.min(...corners.map(p=>p[1])),maxZ:Math.max(...corners.map(p=>p[1]))};
}

export class SiteStore{
 constructor(project){this.value=clone(validateSiteProject(project));this.past=[];this.future=[]}
 commit(mutator){const prev=clone(this.value),next=clone(this.value);mutator(next);validateSiteProject(next);this.past.push(prev);if(this.past.length>60)this.past.shift();this.future=[];this.value=next;return next}
 undo(){if(!this.past.length)return false;this.future.push(clone(this.value));this.value=this.past.pop();return true}
 redo(){if(!this.future.length)return false;this.past.push(clone(this.value));this.value=this.future.pop();return true}
 replace(p){return this.commit(next=>{for(const key of Object.keys(next))delete next[key];Object.assign(next,clone(validateSiteProject(p)))})}
}
