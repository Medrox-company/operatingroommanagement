/** Canonical data model. Metres; Y up; x/z floor plane; angles in degrees. No THREE dependency. */
export const VERSION = 1;
export const ROOM_TYPES = {operating:'Operační sál',preparation:'Přípravna',storage:'Sklad',recovery:'Dospávací pokoj',corridor:'Chodba',staff:'Zázemí personálu'};
export const CATALOG = {
 table:{name:'Operační stůl',size:[0.65,1.1,2.1]},
 light:{name:'Stropní operační svítidlo',size:[2.3,0.7,1.8]},
 anesthesia:{name:'Anesteziologický přístroj',size:[0.85,1.6,0.8]},
 monitor:{name:'Monitor na pojízdném stojanu',size:[0.65,1.6,0.55]},
 cabinet:{name:'Skříň na materiál',size:[1.2,2,0.5]},
 trolley:{name:'Instrumentační stolek',size:[1,0.9,0.55]},
 wallScreen:{name:'Vestavná obrazovka',size:[1.4,0.8,0.1]},
 tablet:{name:'Tablet u dveří',size:[0.25,0.35,0.08]},
 sink:{name:'Chirurgické mytí',size:[1.3,1,0.6]},
 bed:{name:'Lůžko',size:[0.95,0.9,2.2]},
 stool:{name:'Stolička',size:[0.5,0.6,0.5]},
 pendant:{name:'Stropní přístrojový sloup',size:[0.65,1.6,0.6]}
};
let sequence=0;
export const uid = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${++sequence}`}`;
export const clone = x => structuredClone(x);
export const normalizeAngle = n => ((n%360)+360)%360;
function roomAxisHalf(r,axis){
 const a=rad(r.rotation),c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 return axis==='x'?c*r.width/2+s*r.depth/2:s*r.width/2+c*r.depth/2;
}
/**
 * Přichytí střed nebo libovolnou vnější hranu místnosti ke středu či hraně
 * sousední místnosti. Počítá i s otočením, takže stejné pravidlo funguje pro
 * sály, přípravny, sklady i další typy prostorů.
 */
export function snapRoomPlacement(room,rooms,threshold=0.22){
 const snapAxis=axis=>{
  const ownHalf=roomAxisHalf(room,axis),value=room[axis];let best=null;
  for(const other of rooms){
   if(other.id===room.id||other.floorId!==room.floorId)continue;
   const otherHalf=roomAxisHalf(other,axis);
   for(const ownOffset of [-ownHalf,0,ownHalf])for(const target of [other[axis]-otherHalf,other[axis],other[axis]+otherHalf]){
    const next=target-ownOffset,distance=Math.abs(next-value);
    if(distance<=threshold&&(!best||distance<best.distance))best={value:next,distance,guide:target,targetId:other.id};
   }
  }
  return best;
 };
 const x=snapAxis('x'),z=snapAxis('z');
 return {x:x?.value??room.x,z:z?.value??room.z,snappedX:Boolean(x),snappedZ:Boolean(z),guideX:x?.guide??null,guideZ:z?.guide??null,targetXId:x?.targetId??null,targetZId:z?.targetId??null};
}
export function createRoom(floorId,type='operating',x=0,z=0){
 const size=type==='corridor'?[21,3]:type==='storage'?[4,5]:[7,7];
 return {id:uid('room'),floorId,name:ROOM_TYPES[type],type,x,z,rotation:0,width:size[0],depth:size[1],height:3,doorWidth:1.5,externalId:''};
}
/** Corridor-derived clear distance used by the external KNL boundary. */
export function boundaryOffsetForFloor(floor,rooms){
 const corridorWidths=rooms.filter(room=>room.floorId===floor.id&&room.type==='corridor').map(room=>Math.min(room.width,room.depth)).filter(Number.isFinite);
 const corridorWidth=corridorWidths.length?Math.max(...corridorWidths):Number(floor.knlBoundaryOffset)||3;
 const requested=floor.knlBoundaryOffsetMode==='manual'?Number(floor.knlBoundaryOffset)||corridorWidth:corridorWidth;
 return Math.max(0.5,Math.min(20,requested));
}
export function createItem(floorId,roomId,kind,x=0,z=0){
 return {id:uid('item'),floorId,roomId,kind,name:CATALOG[kind].name,x,y:kind==='light'?2.6:kind==='wallScreen'?1.7:kind==='tablet'?1.4:kind==='pendant'?1.8:0,z,rotation:0,scale:1};
}
export function furnish(room){
 const w=room.width/2,d=room.depth/2;
 const specs=room.type==='operating'?
 [['table',0,0],['light',0,0],['anesthesia',-1.65,-1.9],['monitor',1.7,-1.8],['cabinet',-w+0.9,-d+0.4],['trolley',1.65,1],['wallScreen',0,-d+0.15],['tablet',1.2,d+0.12],['stool',-1.1,0.8],['pendant',2,-1]]:
 room.type==='recovery'?[['bed',-1.4,0],['bed',1.4,0],['monitor',-2.3,-1.3],['cabinet',0,-d+0.4]]:
 room.type==='preparation'?[['sink',0,-d+0.4],['trolley',1,0],['cabinet',-w+0.8,-d+0.4]]:
 room.type==='storage'?[['cabinet',-w+0.7,-d+0.4],['cabinet',w-0.7,-d+0.4]]:[];
 return specs.map(([k,x,z])=>createItem(room.floorId,room.id,k,x,z));
}
export function demoProject(){
 const floors=[
  {id:'floor-1',name:'1. patro · operační blok',elevation:0,perimeterWalls:true,perimeterWallHeight:3,perimeterWallThickness:0.42,knlBoundaryEnabled:true,knlBoundaryOffsetMode:'corridor',knlBoundaryOffset:3,knlBoundaryPreset:'solid'},
  {id:'floor-2',name:'2. patro · zázemí',elevation:4,perimeterWalls:true,perimeterWallHeight:3,perimeterWallThickness:0.42,knlBoundaryEnabled:true,knlBoundaryOffsetMode:'corridor',knlBoundaryOffset:3,knlBoundaryPreset:'solid'}
 ];
 const rooms=[],items=[];
 const c=createRoom(floors[0].id,'corridor',0,0);c.id='corridor-1';c.name='Centrální chodba';rooms.push(c);
 for(let i=0;i<6;i++){
  const r=createRoom(floors[0].id,'operating',(i%3-1)*7,i<3?-5:5);
  r.id=`or-${i+1}`;r.name=`PCHO ${i+1}`;r.rotation=i<3?0:180;rooms.push(r);items.push(...furnish(r));
 }
 for(const [i,type] of ['preparation','storage','recovery','staff'].entries()){
  const r=createRoom(floors[1].id,type,(i%2)*8-4,Math.floor(i/2)*8-4);r.name=ROOM_TYPES[type];rooms.push(r);items.push(...furnish(r));
 }
 return {schemaVersion:VERSION,id:uid('building'),name:'ORMS · modulární operační blok',units:'m',floors,rooms,items};
}
export function validateProject(p){
 const fail = msg => {throw new Error(`Neplatný projekt: ${msg}`)};
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const str=(v,label,max=160)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(label)};
 const num=(v,label,min=-10000,max=10000)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(label)};
 if(!obj(p)||p.schemaVersion!==VERSION||p.units!=='m')fail('podporováno schemaVersion 1 a jednotky m');
 str(p.id,'ID budovy');str(p.name,'název budovy');
 for(const [key,max] of [['floors',30],['rooms',200],['items',4000]])if(!Array.isArray(p[key])||p[key].length>max)fail(key);
 if(!p.floors.length)fail('chybí patro');
 const ids=new Set();const id=v=>{str(v.id,'ID');if(ids.has(v.id))fail(`duplicitní ID ${v.id}`);ids.add(v.id);str(v.name,'název')};
 for(const f of p.floors){
  if(!obj(f))fail('patro');id(f);num(f.elevation,'výška patra',-200,1000);
  if(f.perimeterWalls!==undefined&&typeof f.perimeterWalls!=='boolean')fail('obvodové stěny');
  if(f.perimeterWallHeight!==undefined)num(f.perimeterWallHeight,'výška obvodových stěn',1,10);
  if(f.perimeterWallThickness!==undefined)num(f.perimeterWallThickness,'tloušťka obvodových stěn',0.18,1.2);
  if(f.knlBoundaryEnabled!==undefined&&typeof f.knlBoundaryEnabled!=='boolean')fail('KNL ohraničení');
  if(f.knlBoundaryOffsetMode!==undefined&&!['corridor','manual'].includes(f.knlBoundaryOffsetMode))fail('režim odsazení KNL ohraničení');
  if(f.knlBoundaryOffset!==undefined)num(f.knlBoundaryOffset,'odsazení KNL ohraničení',0.5,20);
  if(f.knlBoundaryPreset!==undefined&&!['facade','bridge','solid'].includes(f.knlBoundaryPreset))fail('typ KNL ohraničení');
 }
 const floors=new Set(p.floors.map(f=>f.id));
 for(const r of p.rooms){
  if(!obj(r))fail('místnost');id(r);if(!floors.has(r.floorId)||!Object.hasOwn(ROOM_TYPES,r.type))fail('vazba/typ místnosti');
  for(const k of ['x','z','rotation'])num(r[k],k);
  num(r.width,'šířka',2,100);num(r.depth,'hloubka',2,100);num(r.height,'výška',2,10);num(r.doorWidth,'dveře',0.7,r.width-0.4);
  if(r.externalId!==undefined&&typeof r.externalId!=='string')fail('externalId');
 }
 const rooms=new Map(p.rooms.map(r=>[r.id,r]));
 for(const a of p.items){
  if(!obj(a))fail('vybavení');id(a);if(!Object.hasOwn(CATALOG,a.kind)||!floors.has(a.floorId))fail('katalog/patro vybavení');
  if(a.roomId!==null&&(!rooms.has(a.roomId)||rooms.get(a.roomId).floorId!==a.floorId))fail('vazba vybavení na místnost/patro');
  for(const k of ['x','z','rotation'])num(a[k],k);num(a.y,'výška vybavení',0,20);num(a.scale,'měřítko',0.1,5);
 }
 return p;
}
/** Preserve room-local equipment coordinates when transferring a complete room. */
export function transferRoom(p,roomId,floorId){
 if(!p.floors.some(f=>f.id===floorId))throw new Error('Patro neexistuje');
 const r=p.rooms.find(r=>r.id===roomId);if(!r)throw new Error('Místnost neexistuje');
 r.floorId=floorId;for(const a of p.items)if(a.roomId===roomId)a.floorId=floorId;
}
export function duplicateRoom(p,roomId){
 const r=p.rooms.find(r=>r.id===roomId);if(!r)throw new Error('Místnost neexistuje');
 const copy={...clone(r),id:uid('room'),name:`${r.name} · kopie`,x:r.x+r.width+1,externalId:''};
 p.rooms.push(copy);p.items.push(...p.items.filter(a=>a.roomId===roomId).map(a=>({...clone(a),id:uid('item'),roomId:copy.id})));return copy;
}
export function deleteRoom(p,id){p.rooms=p.rooms.filter(r=>r.id!==id);p.items=p.items.filter(a=>a.roomId!==id)}
export function deleteFloor(p,id){
 if(p.floors.length===1)throw new Error('Poslední patro nelze odstranit');
 if(p.rooms.some(r=>r.floorId===id)||p.items.some(a=>a.floorId===id))throw new Error('Nejdříve přesuňte nebo odstraňte obsah patra');
 p.floors=p.floors.filter(f=>f.id!==id);
}
const rad=d=>d*Math.PI/180;
export function roomCorners(r){return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>{x*=r.width/2;z*=r.depth/2;const c=Math.cos(rad(r.rotation)),s=Math.sin(rad(r.rotation));return [r.x+c*x+s*z,r.z-s*x+c*z]})}
export function roomsOverlap(a,b){
 if(a.floorId!==b.floorId)return false;
 const A=roomCorners(a),B=roomCorners(b);
 for(const r of [a,b])for(const t of [rad(r.rotation),rad(r.rotation)+Math.PI/2]){
  const axis=[Math.cos(t),-Math.sin(t)],pa=A.map(p=>p[0]*axis[0]+p[1]*axis[1]),pb=B.map(p=>p[0]*axis[0]+p[1]*axis[1]);
  if(Math.max(...pa)<=Math.min(...pb)+0.01||Math.max(...pb)<=Math.min(...pa)+0.01)return false;
 }return true;
}
export function warnings(p){
 const out=[];
 for(let i=0;i<p.rooms.length;i++)for(let j=i+1;j<p.rooms.length;j++)if(roomsOverlap(p.rooms[i],p.rooms[j]))out.push(`Překryv místností: ${p.rooms[i].name} / ${p.rooms[j].name}`);
 for(const a of p.items){const r=p.rooms.find(r=>r.id===a.roomId);if(r&&(Math.abs(a.x)>r.width/2+0.2||Math.abs(a.z)>r.depth/2+0.2))out.push(`${a.name}: střed leží mimo ${r.name}`)}
 return out;
}
export class ProjectStore{
 constructor(project){this.value=clone(validateProject(project));this.past=[];this.future=[]}
 commit(mutator){const prev=clone(this.value),next=clone(this.value);mutator(next);validateProject(next);this.past.push(prev);if(this.past.length>60)this.past.shift();this.future=[];this.value=next;return next}
 undo(){if(!this.past.length)return false;this.future.push(clone(this.value));this.value=this.past.pop();return true}
 redo(){if(!this.future.length)return false;this.past.push(clone(this.value));this.value=this.future.pop();return true}
 replace(p){return this.commit(next=>{for(const key of Object.keys(next))delete next[key];Object.assign(next,clone(validateProject(p)))})}
}
