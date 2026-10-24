import * as THREE from 'three';
import { bar, box, createBuildingHalo, cyl, part, setRoomSelected } from './geometry.js';
import { STOREY_HEIGHT, pavilionUnder, siteBounds } from './site-model.js';

/**
 * Mapa areálu ve stejném vizuálním jazyce jako operační blok: tmavě modré
 * hmoty, světlé hrany, spáry a žluté světelné lišty výběru. Každý objekt je
 * skupina s `entity: 'room'`, takže výběr, přesun, otočení i změna rozměrů
 * fungují stejným 3D prohlížečem jako u sálů.
 */
const flat=(g,n,s,p,c,selected)=>{const mesh=box(g,n,s,p,c,selected);mesh.castShadow=false;return mesh};

function selectionFrame(g,w,d,y,inset=0.12){
 const strip=(size,pos)=>{const m=box(g,'selection light',size,pos,'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffca20);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;m.castShadow=false;return m};
 for(const x of [-w/2+inset,w/2-inset])strip([0.14,0.03,Math.max(0.2,d-inset*2)],[x,y,0]);
 for(const z of [-d/2+inset,d/2-inset])strip([Math.max(0.2,w-inset*2),0.03,0.14],[0,y,z]);
}

function selectionRing(g,radius,y){
 const m=part(g,'selection light',new THREE.RingGeometry(radius,radius+0.28,64),'yellow',[0,y,0],[-Math.PI/2,0,0]);
 m.userData.selectionLight=true;m.material.emissive.setHex(0xffca20);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;m.castShadow=false;return m;
}

function createPavilion(r){
 const g=new THREE.Group(),w=r.width,d=r.depth,h=r.height,storeys=Math.max(1,Math.round(h/STOREY_HEIGHT)),storey=h/storeys;
 box(g,'pavilion plinth',[w+0.5,0.45,d+0.5],[0,0.22,0],'dark');
 box(g,'pavilion body',[w,h,d],[0,h/2,0],'wall','selectedWall');
 // Pásová okna a stropní římsy dávají hmotě čitelné měřítko podlaží.
 for(let i=0;i<storeys;i++){
  const y=i*storey+storey*0.55,bandH=Math.min(1.5,storey*0.42);
  for(const sign of [-1,1]){
   box(g,'window band',[Math.max(0.5,w-1.4),bandH,0.08],[0,y,sign*(d/2+0.03)],'glass');
   box(g,'window band',[0.08,bandH,Math.max(0.5,d-1.4)],[sign*(w/2+0.03),y,0],'glass');
  }
  if(i>0)box(g,'storey cornice',[w+0.16,0.16,d+0.16],[0,i*storey,0],'wallEdge','selectedEdge');
 }
 for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,'pavilion corner pier',[0.5,h+0.04,0.5],[x,h/2,z],'facade','selectedFacade');
 // Atika, střešní plocha a technologie na střeše.
 box(g,'roof deck',[w-0.5,0.08,d-0.5],[0,h+0.04,0],'floor','selectedFloor');
 for(const sign of [-1,1]){
  box(g,'roof parapet',[w+0.12,0.7,0.24],[0,h+0.35,sign*(d/2-0.06)],'wallEdge','selectedEdge');
  box(g,'roof parapet',[0.24,0.7,d+0.12],[sign*(w/2-0.06),h+0.35,0],'wallEdge','selectedEdge');
 }
 const plantW=Math.min(8,w*0.22),plantD=Math.min(5,d*0.3);
 box(g,'roof plant room',[plantW,2.2,plantD],[-w/2+plantW/2+2,h+1.1,-d/2+plantD/2+1.6],'facade','selectedFacade');
 for(let i=0;i<Math.min(4,Math.floor(w/10));i++)cyl(g,'roof air handler',0.55,0.9,[-w/2+plantW+4+i*2.2,h+0.5,-d/2+2.2],'steel');
 // Hlavní vstup s markýzou na jižní straně (+Z), stejně jako dveře sálu.
 const door=Math.min(r.doorWidth,w-1);
 box(g,'entrance canopy',[door+2.4,0.3,3],[0,Math.min(h-0.4,3.4),d/2+1.5],'doorFrame','selectedEdge');
 box(g,'entrance doors',[door,Math.min(h-0.6,2.8),0.1],[0,Math.min(h-0.6,2.8)/2+0.45,d/2+0.08],'door');
 box(g,'entrance door seal',[0.06,Math.min(h-0.6,2.8),0.12],[0,Math.min(h-0.6,2.8)/2+0.45,d/2+0.1],'dark');
 for(const sign of [-1,1])cyl(g,'canopy column',0.12,Math.min(h-0.4,3.4),[sign*(door/2+1),Math.min(h-0.4,3.4)/2,d/2+2.8],'steel');
 selectionFrame(g,w+1.2,d+1.2,0.47);
 return g;
}

function createHeliport(r,{baseHeight=0}={}){
 const g=new THREE.Group(),radius=Math.min(r.width,r.depth)/2,top=Math.max(0.14,r.height),deckY=top-0.14,base=Math.min(baseHeight,top);
 // Nosná konstrukce vede od terénu nebo od střechy pavilonu až pod plošinu.
 const span=top-0.28-base;
 if(span>0.4){
  cyl(g,'heliport core',Math.max(0.9,radius*0.16),span,[0,base+span/2,0],'wall').userData.selectedMaterialToken='selectedWall';
  for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
   bar(g,'heliport leg',[sx*radius*0.58,base,sz*radius*0.58],[sx*radius*0.32,top-0.3,sz*radius*0.32],0.22,'steel');
   if(span>4)bar(g,'heliport brace',[sx*radius*0.5,base+span*0.35,sz*radius*0.5],[-sx*radius*0.2,top-0.4,sz*radius*0.2],0.1,'steel');
  }
  if(span>6)box(g,'heliport stair tower',[2.6,span,2.6],[radius*0.62,base+span/2,0],'facade','selectedFacade');
 }
 part(g,'heliport deck',new THREE.CylinderGeometry(radius,radius*0.97,0.28,64),'floor',[0,deckY,0]).userData.selectedMaterialToken='selectedFloor';
 part(g,'heliport deck edge',new THREE.CylinderGeometry(radius+0.08,radius+0.08,0.12,64,1,true),'wallEdge',[0,deckY+0.04,0]).userData.selectedMaterialToken='selectedEdge';
 part(g,'safety net',new THREE.RingGeometry(radius+0.1,radius+1.4,64),'steel',[0,deckY-0.04,0],[-Math.PI/2,0,0]);
 const markY=deckY+0.145;
 part(g,'touchdown circle',new THREE.RingGeometry(radius*0.46,radius*0.54,64),'amber',[0,markY,0],[-Math.PI/2,0,0]).castShadow=false;
 part(g,'deck perimeter marking',new THREE.RingGeometry(radius*0.9,radius*0.94,64),'marking',[0,markY,0],[-Math.PI/2,0,0]).castShadow=false;
 const hSize=radius*0.36;
 for(const sign of [-1,1])flat(g,'heliport H',[hSize*0.22,0.02,hSize*1.6],[sign*hSize*0.55,markY,0],'marking');
 flat(g,'heliport H',[hSize*1.1,0.02,hSize*0.22],[0,markY,0],'marking');
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;cyl(g,'perimeter light',0.13,0.12,[Math.cos(a)*radius*0.97,deckY+0.2,Math.sin(a)*radius*0.97],'amber').castShadow=false}
 // Větrný rukáv u okraje plošiny.
 bar(g,'windsock mast',[radius+0.9,deckY,radius*0.3],[radius+0.9,deckY+3.2,radius*0.3],0.05,'steel');
 const sock=part(g,'windsock',new THREE.ConeGeometry(0.32,1.4,16,1,true),'amber',[radius+0.9-0.75,deckY+3,radius*0.3],[0,0,Math.PI/2]);sock.castShadow=false;
 selectionRing(g,radius+1.5,deckY+0.02);
 return g;
}

function createRoad(r){
 const g=new THREE.Group(),w=r.width,d=r.depth;
 flat(g,'road surface',[w,0.12,d],[0,0.06,0],'asphalt','selectedFloor');
 for(const sign of [-1,1])flat(g,'road curb',[w,0.2,0.28],[0,0.1,sign*(d/2-0.14)],'edge','selectedEdge');
 for(let x=-w/2+2;x<w/2-2;x+=6)flat(g,'lane marking',[3,0.012,0.16],[x+1.5,0.127,0],'marking');
 for(const sign of [-1,1])flat(g,'edge marking',[w-0.6,0.012,0.12],[0,0.127,sign*(d/2-0.55)],'marking');
 selectionFrame(g,w,d,0.22,0.1);
 return g;
}

function createParking(r){
 const g=new THREE.Group(),w=r.width,d=r.depth,stall=2.5,length=5;
 flat(g,'parking surface',[w,0.1,d],[0,0.05,0],'asphalt','selectedFloor');
 for(const sign of [-1,1])flat(g,'parking curb',[w,0.18,0.24],[0,0.09,sign*(d/2-0.12)],'edge','selectedEdge');
 for(const sign of [-1,1])flat(g,'parking curb',[0.24,0.18,d],[sign*(w/2-0.12),0.09,0],'edge','selectedEdge');
 const rows=d>=12?[-d/2+0.3+length/2,d/2-0.3-length/2]:[0];
 for(const z of rows){
  for(let x=-w/2+0.6;x<=w/2-0.6+1e-6;x+=stall)flat(g,'parking stall line',[0.12,0.012,length],[x,0.107,z],'marking');
 }
 if(rows.length>1&&d>=14)for(let x=-w/2+3;x<w/2-3;x+=5)flat(g,'aisle marking',[2.4,0.012,0.14],[x+1.2,0.107,0],'marking');
 selectionFrame(g,w,d,0.2,0.1);
 return g;
}

function createPlaza(r){
 const g=new THREE.Group(),w=r.width,d=r.depth;
 flat(g,'plaza surface',[w,0.16,d],[0,0.08,0],'floor','selectedFloor');
 for(let x=-w/2+3;x<w/2-0.5;x+=3)flat(g,'paving joint',[0.04,0.006,d-0.2],[x,0.163,0],'floorJoint');
 for(let z=-d/2+3;z<d/2-0.5;z+=3)flat(g,'paving joint',[w-0.2,0.006,0.04],[0,0.163,z],'floorJoint');
 selectionFrame(g,w,d,0.2,0.1);
 return g;
}

function createGreen(r){
 const g=new THREE.Group(),w=r.width,d=r.depth;
 flat(g,'lawn',[w,0.24,d],[0,0.12,0],'lawn','selectedFloor');
 for(const sign of [-1,1]){
  flat(g,'lawn edge',[w+0.1,0.28,0.16],[0,0.14,sign*(d/2)],'edge','selectedEdge');
  flat(g,'lawn edge',[0.16,0.28,d+0.1],[sign*(w/2),0.14,0],'edge','selectedEdge');
 }
 // Stromy v pravidelném, lehce rozvolněném rastru. Bez náhody, aby se scéna
 // při každém překreslení neměnila.
 const spacing=6,cols=Math.max(1,Math.floor((w-2)/spacing)),rows=Math.max(1,Math.floor((d-2)/spacing));let count=0;
 for(let i=0;i<cols&&count<80;i++)for(let j=0;j<rows&&count<80;j++,count++){
  const jitter=((i*7+j*13)%5-2)*0.35,x=-((cols-1)*spacing)/2+i*spacing+jitter,z=-((rows-1)*spacing)/2+j*spacing-jitter,scale=0.85+((i+j)%3)*0.12;
  cyl(g,'tree trunk',0.18*scale,1.6*scale,[x,0.24+0.8*scale,z],'trunk');
  part(g,'tree crown',new THREE.IcosahedronGeometry(1.5*scale,1),'tree',[x,0.24+2.6*scale,z]);
 }
 selectionFrame(g,w,d,0.3,0.12);
 return g;
}

const BUILDERS={pavilion:createPavilion,heliport:createHeliport,road:createRoad,parking:createParking,plaza:createPlaza,green:createGreen};

export function createSiteElementGeometry(r,{selected=false,baseHeight=0}={}){
 const g=(BUILDERS[r.type]||createPlaza)(r,{baseHeight});
 g.name=r.name;g.userData={entity:'room',entityId:r.id,selected:null,siteType:r.type};
 setRoomSelected(g,selected);
 return g;
}

export function buildSite(project,floorId,options={}){
 const floor=project.floors.find(f=>f.id===floorId)||project.floors[0],g=new THREE.Group();g.name=floor.name;g.userData={entity:'floor',entityId:floor.id};
 const map=new Map(),rooms=project.rooms.filter(r=>r.floorId===floor.id),selectedIds=new Set(options.selectedIds||[]);if(options.selectedId)selectedIds.add(options.selectedId);
 const bounds=siteBounds(rooms);
 if(bounds){
  const margin=14,bw=bounds.maxX-bounds.minX+margin*2,bd=bounds.maxZ-bounds.minZ+margin*2,cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
  box(g,'site terrain',[bw,0.5,bd],[cx,-0.25,cz],'dark').castShadow=false;
  box(g,'site terrain edge',[bw+0.4,0.2,bd+0.4],[cx,-0.42,cz],'shadow').castShadow=false;
  g.add(createBuildingHalo(bw,bd,cx,cz));
 }
 for(const r of rooms){
  const roof=r.type==='heliport'?pavilionUnder(project,r):null,baseHeight=roof&&r.height>=roof.height?roof.height:0;
  const group=createSiteElementGeometry(r,{selected:selectedIds.has(r.id),baseHeight});
  group.position.set(r.x,0,r.z);group.rotation.set(0,r.rotation*Math.PI/180,0);g.add(group);map.set(r.id,group);
 }
 return {group:g,entities:map};
}
