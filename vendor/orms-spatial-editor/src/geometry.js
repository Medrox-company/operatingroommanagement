import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createBoundaries,generateBoundary } from './boundaries.mjs';
import { CATALOG,boundaryOffsetForFloor,roomCorners } from './model.js';
const palette={body:0x586a89,edge:0x4f6183,wallEdge:0x61718f,dark:0x18243c,shadow:0x0d1629,steel:0x788aa8,screen:0x051421,blue:0x5278d8,light:0xd3e7fc,yellow:0xffda28,door:0x374663,doorInset:0x293752,doorFrame:0x71819f,tabletFrame:0x15223a,tabletScreen:0x1264b1,amber:0xffc52e,wall:0x43516d,facade:0x384761,floor:0x45587b,wallJoint:0x34425d,floorJoint:0x314361,selectedWall:0x81785f,selectedFacade:0x776e59,selectedEdge:0xe0bd45,selectedFloor:0xaaa28b};
const surface={
 body:{metalness:0.04,roughness:0.62,envMapIntensity:0.26},edge:{metalness:0.08,roughness:0.56,envMapIntensity:0.28},wallEdge:{metalness:0.05,roughness:0.55,envMapIntensity:0.3,emissive:0x27334e,emissiveIntensity:0.045},dark:{metalness:0.05,roughness:0.74,envMapIntensity:0.18},shadow:{metalness:0,roughness:1,envMapIntensity:0.02},
 steel:{metalness:0.58,roughness:0.34,envMapIntensity:0.58,clearcoat:0.12,clearcoatRoughness:0.42},door:{metalness:0.1,roughness:0.63,envMapIntensity:0.24,emissive:0x26344f,emissiveIntensity:0.07},doorInset:{metalness:0.05,roughness:0.78,envMapIntensity:0.16,emissive:0x1e2b44,emissiveIntensity:0.05},doorFrame:{metalness:0.28,roughness:0.43,envMapIntensity:0.44,clearcoat:0.12,clearcoatRoughness:0.5},tabletFrame:{metalness:0.22,roughness:0.48,envMapIntensity:0.34},tabletScreen:{metalness:0.05,roughness:0.24,envMapIntensity:0.38,clearcoat:0.7,clearcoatRoughness:0.18,emissive:0x0d5598,emissiveIntensity:0.72},screen:{metalness:0.04,roughness:0.22,envMapIntensity:0.4,clearcoat:0.75,clearcoatRoughness:0.16,emissive:0x082f52,emissiveIntensity:0.44},light:{metalness:0,roughness:0.28,envMapIntensity:0.38,emissive:0xbcdfff,emissiveIntensity:0.62},amber:{metalness:0.02,roughness:0.32,emissive:0xffa000,emissiveIntensity:1.25},wall:{metalness:0,roughness:0.78,envMapIntensity:0.2,emissive:0x202a42,emissiveIntensity:0.018},facade:{metalness:0,roughness:0.8,envMapIntensity:0.18,emissive:0x1b263d,emissiveIntensity:0.022},floor:{metalness:0.03,roughness:0.67,envMapIntensity:0.24,clearcoat:0.06,clearcoatRoughness:0.76},wallJoint:{metalness:0,roughness:0.9,envMapIntensity:0.08},floorJoint:{metalness:0.02,roughness:0.84,envMapIntensity:0.1},
 selectedWall:{metalness:0,roughness:0.88,emissive:0x493a16,emissiveIntensity:0.42},selectedFacade:{metalness:0,roughness:0.88,emissive:0x4d3b17,emissiveIntensity:0.5},selectedEdge:{metalness:0.02,roughness:0.64,emissive:0x765700,emissiveIntensity:0.5},selectedFloor:{metalness:0,roughness:0.88,emissive:0x332b15,emissiveIntensity:0.16}
};
function material(color){const token=typeof color==='string'?color:'body',finish=surface[token]||surface.body;return new THREE.MeshPhysicalMaterial({color:palette[color]??color,dithering:true,...finish})}

/**
 * A scene-bound perimeter halo. Unlike a DOM radial gradient, this plane is
 * part of the floor group, so its perspective and silhouette follow every
 * OrbitControls rotation, pan and zoom. The rounded-box SDF fades to zero
 * before the plane boundary, which prevents a rectangular edge from showing.
 */
function createBuildingHalo(width,depth,centerX,centerZ){
 const radius=2.8,planeWidth=width+radius*2+1.2,planeDepth=depth+radius*2+1.2;
 const material=new THREE.ShaderMaterial({
  uniforms:{
   uPlaneSize:{value:new THREE.Vector2(planeWidth,planeDepth)},
   uHalfSize:{value:new THREE.Vector2(width/2+0.18,depth/2+0.18)},
   uRadius:{value:radius},
   uColor:{value:new THREE.Color(0x526bc7)},
   uOpacity:{value:0.13}
  },
  vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv; uniform vec2 uPlaneSize; uniform vec2 uHalfSize; uniform float uRadius; uniform vec3 uColor; uniform float uOpacity; void main(){vec2 p=(vUv-0.5)*uPlaneSize;vec2 q=abs(p)-uHalfSize;float signedDistance=length(max(q,0.0))+min(max(q.x,q.y),0.0);float outsideFade=1.0-smoothstep(0.0,uRadius,max(signedDistance,0.0));float insideFade=smoothstep(-1.25,0.12,signedDistance);float halo=outsideFade*insideFade;gl_FragColor=vec4(uColor,halo*uOpacity);}',
  transparent:true,
  depthWrite:false,
  depthTest:true,
  blending:THREE.AdditiveBlending,
  side:THREE.DoubleSide,
  toneMapped:false
 });
 const halo=new THREE.Mesh(new THREE.PlaneGeometry(planeWidth,planeDepth),material);
 halo.name='building perimeter halo';
 halo.userData={effect:'building-halo'};
 halo.position.set(centerX,-0.57,centerZ);
 halo.rotation.x=-Math.PI/2;
 halo.renderOrder=-10;
 halo.castShadow=false;
 halo.receiveShadow=false;
 return halo;
}

// Přesné materiálové a konstrukční hodnoty z balíčku KNL_ohraniceni_pro_Codex.
// Geometrie se generuje parametricky kolem aktuální dispozice, takže zůstává
// svázaná s editovanými rozměry místností a šířkou chodby.
const KNL_BOUNDARY_MATERIALS={
 glass:{colorLinearRGB:[0.1499597898006365,0.24228112245478564,0.5583403896257968],opacity:0.25,roughness:0.72,metalness:0},
 chrome:{colorLinearRGB:[0.3515325994898463,0.4178850708380236,0.6172065624120635],opacity:1,roughness:0.55,metalness:0.22},
 floor:{colorLinearRGB:[0.13013647668074665,0.16826940017946088,0.3231432091022285],opacity:1,roughness:0.72,metalness:0},
 steel:{colorLinearRGB:[0.46960500000000005,0.5059501,0.660895],opacity:1,roughness:0.55,metalness:0.22}
};
const KNL_BOUNDARY_PRESETS={
 bridge:{glassHeight:2.65,glassBottom:0.125,glassThickness:0.04,postHeight:3,postWidth:0.07,postDepth:0.07,postSpacingMax:1.411111111,glassMaterial:'glass',postMaterial:'chrome'},
 facade:{glassHeight:2.3,glassBottom:0.4,glassThickness:0.070555556,postHeight:3,postWidth:0.070555556,postDepth:0.141111111,postSpacingMax:3.598333333,glassMaterial:'glass',postMaterial:'steel'}
};

export function knlBoundaryLayout(rooms,floor){
 if(!rooms.length)return null;
 const corners=rooms.flatMap(roomCorners),minX=Math.min(...corners.map(point=>point[0])),maxX=Math.max(...corners.map(point=>point[0])),minZ=Math.min(...corners.map(point=>point[1])),maxZ=Math.max(...corners.map(point=>point[1])),offset=boundaryOffsetForFloor(floor,rooms);
 return {minX,maxX,minZ,maxZ,offset,outerMinX:minX-offset,outerMaxX:maxX+offset,outerMinZ:minZ-offset,outerMaxZ:maxZ+offset,centerX:(minX+maxX)/2,centerZ:(minZ+maxZ)/2};
}

function createKnlBoundary(rooms,floor){
 const layout=knlBoundaryLayout(rooms,floor);if(!layout)return new THREE.Group();
 const {minX,maxX,minZ,maxZ,outerMinX,outerMaxX,outerMinZ,outerMaxZ,centerX,centerZ,offset}=layout,preset=KNL_BOUNDARY_PRESETS[floor.knlBoundaryPreset]||KNL_BOUNDARY_PRESETS.facade,idPrefix=`${floor.id}-knl-boundary`;
 const elements=generateBoundary(preset,[[outerMinX,outerMinZ],[outerMaxX,outerMinZ],[outerMaxX,outerMaxZ],[outerMinX,outerMaxZ]],{idPrefix,floorId:floor.id,closed:true});
 const finish=(id,position,size)=>elements.push({id:`${idPrefix}-floor-${id}`,label:'Podlaha obvodové chodby',kind:'floor_finish',primitive:'box',floorId:floor.id,position,size,rotation:[0,0,0],material:'floor',visible:true,source:{status:'parametric-corridor-offset'}});
 // Čtyři samostatné pásy tvoří skutečný pochozí prstenec a nepřekrývají
 // podlahy sálů. Jeho šířka je shodná s vypočteným odstupem ohraničení.
 finish('north',[centerX,-0.09,minZ-offset/2],[outerMaxX-outerMinX,0.16,offset]);
 finish('south',[centerX,-0.09,maxZ+offset/2],[outerMaxX-outerMinX,0.16,offset]);
 finish('west',[minX-offset/2,-0.09,centerZ],[offset,0.16,maxZ-minZ]);
 finish('east',[maxX+offset/2,-0.09,centerZ],[offset,0.16,maxZ-minZ]);
 const group=createBoundaries({format:'medrox.boundaries',schemaVersion:1,name:'KNL · ohraničení operačního bloku',units:'m',coordinates:{up:'Y'},materials:KNL_BOUNDARY_MATERIALS,elements,placement:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}});
 group.userData.entity='knl-boundary';group.userData.offset=offset;group.userData.offsetMode=floor.knlBoundaryOffsetMode==='manual'?'manual':'corridor';return group;
}

function part(root,name,geometry,color,pos=[0,0,0],rotation=[0,0,0]){
 const mesh=new THREE.Mesh(geometry,material(color));mesh.name=name;mesh.userData.baseMaterialToken=color;mesh.userData.appliedMaterialToken=color;mesh.position.set(...pos);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
const box=(g,n,s,p,c='body',selectedColor)=>{const mesh=part(g,n,new RoundedBoxGeometry(...s,2,Math.min(Math.min(...s)*(surface[c]?0.075:0.09),['wall','facade','wallEdge','doorFrame','edge','selectedWall','selectedFacade','selectedEdge'].includes(c)?0.025:0.055)),c,p);if(selectedColor)mesh.userData.selectedMaterialToken=selectedColor;return mesh};
const cyl=(g,n,r,h,p,c='steel')=>part(g,n,new THREE.CylinderGeometry(r,r,h,24),c,p);
const sphere=(g,n,r,p,c='steel')=>part(g,n,new THREE.SphereGeometry(r,16,12),c,p);
function bar(g,n,a,b,r=0.035,c='steel'){
 const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
 const m=cyl(g,n,r,delta.length(),A.clone().add(B).multiplyScalar(0.5).toArray(),c);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
function wheel(g,x,z){const w=cyl(g,'caster',0.075,0.05,[x,0.09,z],'dark');w.rotation.z=Math.PI/2}
function wheeledBase(g,w,d){box(g,'base',[w,0.08,d],[0,0.18,0],'steel');for(const x of [-w/2+0.07,w/2-0.07])for(const z of [-d/2+0.06,d/2-0.06])wheel(g,x,z)}
function screen(g,x,y,z,w=0.55,h=0.37){
 box(g,'display frame',[w,h,0.08],[x,y,z],'dark');
 box(g,'display glass',[w-0.045,h-0.045,0.012],[x,y,z+0.047],'screen');
 // Geometric vital trace – decorative screen content, not patient data.
 for(let i=0;i<8;i++)box(g,'screen trace',[0.035,0.006,0.006],[x-w*0.32+i*w*0.08,y+Math.sin(i*2)*h*0.09,z+0.056],'light');
}
/** Reusable named meshes, authored in metres. Each object stays a separate group. */
export function createEquipment(kind){
 if(!CATALOG[kind])throw new Error(`Unknown equipment ${kind}`);
 const g=new THREE.Group();g.name=kind;g.userData.assetKind=kind;
 switch(kind){
 case 'table':
  wheeledBase(g,0.58,0.92);box(g,'pedestal',[0.27,0.58,0.4],[0,0.5,0],'steel');box(g,'lift',[0.42,0.1,1.8],[0,0.86,0],'steel');
  for(const [z,len] of [[-0.76,0.5],[-0.14,0.68],[0.62,0.75]])box(g,'segmented mattress',[0.62,0.13,len],[0,0.98,z],'dark');
  for(const x of [-0.36,0.36])bar(g,'rail',[x,0.92,-0.75],[x,0.92,0.77],0.018);
  box(g,'arm rest',[0.38,0.08,0.18],[-0.49,0.96,-0.38],'dark');box(g,'arm rest',[0.38,0.08,0.18],[0.49,0.96,-0.38],'dark');break;
 case 'light':
  cyl(g,'ceiling mount',0.18,0.08,[0,0.32,0]);bar(g,'suspension',[0,0.32,0],[0,-0.03,0],0.055);
  for(const [x,z] of [[0.85,0.45],[-0.7,-0.5]]){
   bar(g,'articulated arm',[0,0,0],[x*0.55,0,z],0.045);sphere(g,'joint',0.07,[x*0.55,0,z]);bar(g,'articulated arm',[x*0.55,0,z],[x,-0.25,z],0.04);
   cyl(g,'lamp housing',0.31,0.08,[x,-0.3,z],'edge');cyl(g,'lamp lens',0.27,0.012,[x,-0.349,z],'light');
   for(let i=0;i<7;i++)cyl(g,'LED module',0.05,0.014,[x+Math.cos(i*Math.PI*2/7)*0.17,-0.36,z+Math.sin(i*Math.PI*2/7)*0.17],'light');
  }break;
 case 'anesthesia':
  wheeledBase(g,0.78,0.65);box(g,'machine body',[0.68,0.85,0.54],[0,0.67,0]);
  for(let i=0;i<3;i++){box(g,'drawer',[0.54,0.16,0.02],[0,0.38+i*0.2,0.28],'edge');box(g,'handle',[0.2,0.024,0.04],[0,0.4+i*0.2,0.31],'steel')}
  box(g,'worktop',[0.85,0.07,0.72],[0,1.13,0],'edge');bar(g,'monitor arm',[0,1.15,-0.18],[0,1.42,-0.18]);screen(g,0,1.48,-0.12);
  cyl(g,'gas cylinder',0.095,0.65,[-0.43,0.66,0],'steel');cyl(g,'vaporizer',0.06,0.18,[0.27,1.28,0.04],'blue');
  {const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3,1.18,0.2),new THREE.Vector3(-0.65,0.7,0.35),new THREE.Vector3(-0.48,0.4,0.4)]);part(g,'breathing hose',new THREE.TubeGeometry(curve,20,0.03,8,false),'dark')};break;
 case 'monitor':wheeledBase(g,0.48,0.44);bar(g,'pole',[0,0.2,0],[0,1.43,0],0.035);screen(g,0,1.4,0,0.6,0.4);box(g,'shelf',[0.4,0.04,0.3],[0,0.9,0.06],'edge');break;
 case 'cabinet':
  box(g,'cabinet',[1.2,1.9,0.5],[0,1.02,0]);
  for(let i=0;i<5;i++)for(let j=0;j<4;j++)box(g,'packed supplies',[0.18,0.19,0.025],[-0.43+j*0.28,0.36+i*0.32,0.293],j%2?'body':'steel');
  for(const x of [-0.3,0.3]){box(g,'door',[0.56,1.78,0.025],[x,1.04,0.263],'dark');box(g,'handle',[0.022,0.23,0.03],[x+(x<0?0.23:-0.23),1.03,0.29],'steel')}
  for(let i=0;i<4;i++)box(g,'shelf marking',[1.04,0.01,0.015],[0,0.4+i*0.42,0.283],'body');break;
 case 'trolley':
  wheeledBase(g,0.9,0.5);for(const x of [-0.43,0.43])for(const z of [-0.22,0.22])bar(g,'leg',[x,0.18,z],[x,0.87,z],0.025);
  box(g,'lower shelf',[0.94,0.035,0.52],[0,0.38,0],'steel');box(g,'instrument tray',[1,0.04,0.55],[0,0.88,0],'steel');
  box(g,'blue drape',[0.8,0.007,0.43],[0,0.905,0],'blue');for(let i=0;i<4;i++)box(g,'instrument',[0.02,0.012,0.2],[-0.25+i*0.12,0.92,0],'steel');break;
 case 'wallScreen':screen(g,0,0,0,1.4,0.8);break;
 case 'tablet':
  box(g,'tablet wall mount',[0.34,0.46,0.055],[0,0,-0.035],'dark');
  box(g,'tablet bezel',[0.3,0.42,0.07],[0,0,0.008],'tabletFrame');
  box(g,'tablet glass',[0.236,0.316,0.012],[0,0.018,0.051],'tabletScreen');
  box(g,'tablet status header',[0.192,0.026,0.008],[-0.006,0.123,0.06],'body');
  for(let i=0;i<3;i++)box(g,'tablet ui row',[0.145-i*0.018,0.012,0.008],[-0.026,0.055-i*0.052,0.061],i===0?'light':'blue');
  box(g,'tablet status led',[0.032,0.032,0.012],[0.098,0.174,0.057],'amber');
  box(g,'tablet home sensor',[0.048,0.012,0.008],[0,-0.178,0.057],'edge');break;
 case 'sink':
  box(g,'wash unit',[1.3,0.34,0.58],[0,0.7,0],'steel');box(g,'basin',[1.13,0.02,0.42],[0,0.88,0.03],'dark');
  for(const x of [-0.32,0.32]){bar(g,'tap',[x,0.9,-0.2],[x,1.16,-0.2],0.022);bar(g,'tap',[x,1.16,-0.2],[x,1.16,0],0.022)}break;
 case 'bed':
  wheeledBase(g,0.86,1.95);box(g,'bed frame',[0.92,0.12,2.1],[0,0.62,0],'steel');box(g,'mattress',[0.86,0.18,1.95],[0,0.77,0],'edge');box(g,'pillow',[0.65,0.09,0.4],[0,0.9,-0.68],'body');
  for(const x of [-0.48,0.48]){bar(g,'rail',[x,0.78,-0.6],[x,1.02,-0.6],0.02);bar(g,'rail',[x,1.02,-0.6],[x,1.02,0.6],0.02)}break;
 case 'stool':cyl(g,'seat',0.23,0.09,[0,0.58,0],'dark');bar(g,'support',[0,0.12,0],[0,0.55,0],0.035);for(let i=0;i<5;i++){const x=Math.cos(i*1.256)*0.23,z=Math.sin(i*1.256)*0.23;bar(g,'foot',[0,0.13,0],[x,0.1,z],0.022);wheel(g,x,z)}break;
 case 'pendant':
  bar(g,'ceiling support',[0,0.45,0],[0,1.1,0],0.05);box(g,'service column',[0.35,1,0.3],[0,0.2,0]);
  for(let i=0;i<3;i++){box(g,'shelf',[0.65,0.04,0.6],[0,-0.35+i*0.35,0.1],'edge');sphere(g,'gas outlet',0.025,[0.12,-0.1+i*0.2,0.17],'blue')};break;
 }
 return g;
}
export function createRoomGeometry(r,{cutaway=true,selected=false,lowerNearWall=true}={}){
 const g=new THREE.Group();g.name=r.name;g.userData={entity:'room',entityId:r.id,selected:null};
 const w=r.width,d=r.depth,h=cutaway?2.58:r.height,t=0.28,low=cutaway?1.32:h;
 const flipped=Math.cos(r.rotation*Math.PI/180)<0;
 // Vzdálená stěna zůstává vysoká, stěna u kamery je snížena. Profil se
 // přepočítá i pro místnosti otočené o 180°, takže blok nepůsobí jako řada
 // otevřených samostatných krabic.
 const nh=cutaway&&lowerNearWall&&flipped?low:h,sh=cutaway&&lowerNearWall&&!flipped?low:h;
 box(g,'floor',[w,0.14,d],[0,-0.07,0],'floor','selectedFloor');
 if(r.type!=='corridor'){
  box(g,'wall north',[w,nh,t],[0,nh/2,-d/2],'wall','selectedWall');
  box(g,'wall west',[t,h,d],[-w/2,h/2,0],'wall','selectedWall');box(g,'wall east',[t,h,d],[w/2,h/2,0],'wall','selectedWall');
  const side=(w-r.doorWidth)/2;
  for(const sign of [-1,1])box(g,'wall south',[side,sh,t],[sign*(r.doorWidth/2+side/2),sh/2,d/2],'facade','selectedFacade');
  // Zapuštěný dvoukřídlý portál kopíruje čitelné dveřní detaily reference:
  // světlé obložky, tmavé křídlo, středová spára, práh a vstupní terminál.
  const doorH=Math.min(r.height-0.18,Math.max(1.1,sh-0.04),2.16),leafWidth=(r.doorWidth-0.08)/2;
  if(!cutaway&&r.height>doorH)box(g,'door lintel wall',[r.doorWidth,r.height-doorH,t],[0,doorH+(r.height-doorH)/2,d/2],'wall','selectedWall');
  box(g,'door recess',[r.doorWidth+0.18,doorH+0.15,0.065],[0,doorH/2,d/2+0.035],'dark');
  for(const sign of [-1,1]){
   const x=sign*(leafWidth/2+0.015);
   box(g,'sliding door leaf',[leafWidth,doorH-0.09,0.075],[x,doorH/2,d/2+0.095],'door');
   box(g,'door leaf inset',[leafWidth-0.1,doorH-0.2,0.014],[x,doorH/2,d/2+0.14],'doorInset');
  }
  box(g,'door center seal',[0.035,doorH-0.08,0.035],[0,doorH/2,d/2+0.148],'dark');
  for(const x of [-(r.doorWidth/2+0.08),r.doorWidth/2+0.08])box(g,'door frame jamb',[0.16,doorH+0.15,0.19],[x,(doorH+0.15)/2,d/2+0.025],'doorFrame','selectedEdge');
  box(g,'door frame header',[r.doorWidth+0.32,0.15,0.19],[0,doorH+0.075,d/2+0.025],'doorFrame','selectedEdge');
  box(g,'door threshold',[r.doorWidth+0.12,0.035,0.22],[0,0.025,d/2+0.04],'edge');
  box(g,'door motion sensor',[0.16,0.06,0.06],[0,doorH+0.055,d/2+0.145],'tabletFrame');
  for(let x=-w/2+1;x<w/2;x+=1){
   box(g,'wall panel joint',[0.012,nh-0.14,0.012],[x,nh/2,-d/2+t/2+0.008],'wallJoint');
   box(g,'floor seam',[0.01,0.003,d],[x,0.004,0],'floorJoint');
  }
  for(let z=-d/2+1;z<d/2;z+=1)box(g,'floor seam',[w,0.003,0.01],[0,0.004,z],'floorJoint');
  // Tenké fyzické pásy u paty stěn nahrazují plošný černý stín a dodávají
  // interiéru kontaktní hloubku i při ortografické kameře.
  box(g,'floor contact shadow north',[w-0.34,0.004,0.045],[0,0.006,-d/2+t+0.025],'shadow');
  box(g,'floor contact shadow west',[0.045,0.004,d-0.34],[-w/2+t+0.025,0.006,0],'shadow');
  box(g,'floor contact shadow east',[0.045,0.004,d-0.34],[w/2-t-0.025,0.006,0],'shadow');
  for(const sign of [-1,1])box(g,'floor contact shadow south',[Math.max(0.08,side-0.14),0.004,0.045],[sign*(r.doorWidth/2+side/2),0.006,d/2-t-0.025],'shadow');
  for(let z=-d/2+1;z<d/2;z+=1){
   box(g,'west panel joint',[0.012,h-0.14,0.012],[-w/2+t/2+0.008,h/2,z],'wallJoint');
   box(g,'east panel joint',[0.012,h-0.14,0.012],[w/2-t/2-0.008,h/2,z],'wallJoint');
  }
  for(const sign of [-1,1])for(let x=-side/2+0.9;x<side/2;x+=0.9){
   const px=sign*(r.doorWidth/2+side/2)+x;
   box(g,'front panel joint',[0.012,sh-0.14,0.012],[px,sh/2,d/2-t/2-0.008],'wallJoint');
  }
  // Horizontální spáry dokončí modulární nemocniční obklad z reference.
  for(let y=1.02;y<h-0.18;y+=1.02){
   box(g,'back horizontal panel joint',[w-0.3,0.012,0.012],[0,y,-d/2+t/2+0.008],'wallJoint');
   box(g,'west horizontal panel joint',[0.012,0.012,d-0.3],[-w/2+t/2+0.008,y,0],'wallJoint');
   box(g,'east horizontal panel joint',[0.012,0.012,d-0.3],[w/2-t/2-0.008,y,0],'wallJoint');
   if(y<sh-0.12)for(const sign of [-1,1])box(g,'front horizontal panel joint',[Math.max(0.08,side-0.14),0.012,0.012],[sign*(r.doorWidth/2+side/2),y,d/2-t/2-0.008],'wallJoint');
  }
  for(const x of [-w/2,w/2]){
   box(g,'wall coping',[t+0.045,0.04,d],[x,h+0.005,0],'wallEdge','selectedEdge');
   box(g,'skirting',[0.055,0.2,d-0.15],[x+(x<0?0.145:-0.145),0.1,0],'dark');
   box(g,'wall reveal',[0.018,0.022,d-0.18],[x+(x<0?0.151:-0.151),1.04,0],'dark');
  }
  box(g,'back coping',[w,0.04,t+0.045],[0,nh+0.005,-d/2],'wallEdge','selectedEdge');
  box(g,'back skirting',[w-0.18,0.2,0.055],[0,0.1,-d/2+t/2+0.028],'dark');
  box(g,'back reveal',[w-0.2,0.022,0.018],[0,1.04,-d/2+t/2+0.151],'dark');
  for(const sign of [-1,1]){
   box(g,'front coping',[side,0.04,t+0.045],[sign*(r.doorWidth/2+side/2),sh+0.005,d/2],'wallEdge','selectedEdge');
   box(g,'front skirting',[side-0.08,0.2,0.055],[sign*(r.doorWidth/2+side/2),0.1,d/2-t/2-0.028],'dark');
  }
  for(const x of [-w/2,w/2])for(const z of [-d/2,d/2])box(g,'wall corner pier',[t+0.1,Math.min(h,(z<0?nh:sh))+0.04,t+0.1],[x,Math.min(h,(z<0?nh:sh))/2,z],z<0?'wall':'facade',z<0?'selectedWall':'selectedFacade');
  for(let i=0;i<9;i++)box(g,'vent grille',[0.48,0.018,0.022],[-w/2+0.55,0.25+i*0.043,d/2+0.095],'dark');
  const accessX=-r.doorWidth/2-0.28;
  box(g,'access terminal housing',[0.16,0.38,0.07],[accessX,1.02,d/2+0.115],'tabletFrame');
  const panel=box(g,'entry indicator',[0.105,0.105,0.012],[accessX,1.125,d/2+0.158],'tabletScreen','amber');panel.userData.selectionIndicator=true;
  box(g,'access reader',[0.09,0.12,0.012],[accessX,0.92,d/2+0.158],'doorInset');
  box(g,'access status led',[0.032,0.032,0.012],[accessX,1.185,d/2+0.166],'amber');
  for(const x of [-w/2+0.1,w/2-0.1]){const m=box(g,'selection light',[0.065,0.022,d-0.15],[x,0.024,0],'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffca20);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;}
  for(const z of [-d/2+0.1,d/2-0.1]){const m=box(g,'selection light',[w-0.15,0.022,0.065],[0,0.024,z],'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffca20);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;}
  // Viditelné, ale subtilní světelné lišty na hraně obkladu. V referenci je
  // aktivní sál čitelný teplou linkou i při pohledu shora, nejen na podlaze.
  for(const x of [-w/2+t/2+0.014,w/2-t/2-0.014]){const m=box(g,'selection wall light',[0.032,0.045,d-0.36],[x,0.22,0],'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffbf18);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;}
  {const m=box(g,'selection wall light',[w-0.36,0.045,0.032],[0,0.22,-d/2+t/2+0.014],'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffbf18);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;}
  for(const sign of [-1,1]){const m=box(g,'selection facade light',[Math.max(0.1,side-0.18),0.045,0.032],[sign*(r.doorWidth/2+side/2),0.22,d/2-t/2-0.014],'yellow');m.userData.selectionLight=true;m.material.emissive.setHex(0xffbf18);m.material.emissiveIntensity=1.1;m.material.toneMapped=false;}
  box(g,'floor joint',[w-0.12,0.006,0.018],[0,0.006,-d/2+0.12],'floorJoint');
 }
 setRoomSelected(g,selected);
 return g;
}

/**
 * Přepne pouze materiály jednoho sálu. Výběr tak už nevyžaduje zahození a
 * znovuvytvoření celé budovy, veškerého vybavení a GPU bufferů.
 */
function replaceRoomMaterial(mesh,token,key=token){
 if(!token||mesh.userData.appliedMaterialToken===key)return;
 if(mesh.material)for(const current of Array.isArray(mesh.material)?mesh.material:[mesh.material])current.dispose();
 mesh.material=material(token);mesh.userData.appliedMaterialToken=key;
}

function applyRoomStatus(group){
 const accentHex=group.userData.statusColor;
 for(const mesh of group.children){
  if(!mesh.isMesh||!['wall','facade'].includes(mesh.userData.baseMaterialToken))continue;
  const base=mesh.userData.baseMaterialToken,key=accentHex===null||accentHex===undefined?base:`${base}-status-${accentHex}`;
  replaceRoomMaterial(mesh,base,key);
  if(accentHex!==null&&accentHex!==undefined){
   const isFrontWall=base==='facade',accentColor=new THREE.Color(accentHex);
   mesh.material.color.lerp(accentColor,isFrontWall?0.08:0.14);
   mesh.material.emissive.copy(accentColor);mesh.material.emissiveIntensity=isFrontWall?0.05:0.1;
  }
 }
}

/** Jemný živý odstín fáze pouze na stěnách sálu; null obnoví neutrální materiál. */
export function setRoomStatus(group,accent=null){
 if(!group)return;
 const accentHex=accent===null||accent===undefined?null:new THREE.Color(accent).getHex();
 if(group.userData.statusColor===accentHex)return;
 group.userData.statusColor=accentHex;applyRoomStatus(group);
}

/** Tenké žluté světlo označuje probíhající provoz, nikoli barvu konkrétní fáze. */
export function setRoomActivity(group,active){
 if(!group||group.userData.operationalActive===Boolean(active))return;
 group.userData.operationalActive=Boolean(active);
 for(const mesh of group.children){
  if(!mesh.isMesh)continue;
  const lightEnabled=Boolean(group.userData.operationalActive||group.userData.selectionLightEnabled);
  if(mesh.userData.selectionLight){mesh.visible=lightEnabled;if(lightEnabled){mesh.material.color.setHex(0xffda28);mesh.material.emissive.setHex(0xffca20);mesh.material.emissiveIntensity=1.1;}}
  if(mesh.userData.selectionIndicator){mesh.material.emissive.setHex(group.userData.operationalActive?0xffca20:group.userData.selectionLightEnabled?(group.userData.selectedAccent??0xffca20):0x3c70db);mesh.material.emissiveIntensity=0.7;}
 }
}

export function setRoomSelected(group,selected,accent=0xffda28,{tintSurfaces=true,showLight=true}={}){
 if(!group)return;
 const accentColor=new THREE.Color(accent),accentHex=accentColor.getHex(),lightEnabled=Boolean(selected&&showLight);
 if(group.userData.selected===selected&&(!selected||(group.userData.selectedAccent===accentHex&&group.userData.selectionSurfaceTint===tintSurfaces&&group.userData.selectionLightEnabled===lightEnabled)))return;
 group.userData.selected=selected;group.userData.selectedAccent=selected?accentHex:null;group.userData.selectionSurfaceTint=selected?tintSurfaces:null;group.userData.selectionLightEnabled=lightEnabled;
 for(const mesh of group.children){
  if(!mesh.isMesh)continue;
  if(mesh.userData.selectionLight){const visible=Boolean(lightEnabled||group.userData.operationalActive);mesh.visible=visible;if(visible){const color=group.userData.operationalActive?new THREE.Color(0xffda28):accentColor;mesh.material.color.copy(color);mesh.material.emissive.copy(color);mesh.material.emissiveIntensity=1.1;}continue;}
  const hasSurfaceTint=selected&&tintSurfaces&&mesh.userData.selectedMaterialToken,token=hasSurfaceTint?mesh.userData.selectedMaterialToken:mesh.userData.baseMaterialToken;
  const materialKey=hasSurfaceTint?`${token}-${accentHex}`:token;
  if(token&&mesh.userData.appliedMaterialToken!==materialKey){
   replaceRoomMaterial(mesh,token,materialKey);
   if(hasSurfaceTint){
    const mix=token==='selectedEdge'?0.78:token==='selectedFloor'?0.34:0.48;
    mesh.material.color.lerp(accentColor,mix);mesh.material.emissive.copy(accentColor);mesh.material.emissiveIntensity=token==='selectedEdge'?0.58:token==='selectedFloor'?0.14:0.32;
   }
  }
  if(mesh.userData.selectionIndicator){mesh.material.emissive.setHex(group.userData.operationalActive?0xffca20:lightEnabled?accentHex:0x3c70db);mesh.material.emissiveIntensity=0.7;}
 }
 if(!tintSurfaces)applyRoomStatus(group);
}

const pointOnEdge=(edge,distance)=>[edge.a[0]+edge.tx*distance,edge.a[1]+edge.tz*distance];
function uncoveredIntervals(length,covered){
 const merged=[];
 for(const [rawStart,rawEnd] of covered.map(([a,b])=>[Math.max(0,Math.min(a,b)),Math.min(length,Math.max(a,b))]).filter(([a,b])=>b-a>0.025).sort((a,b)=>a[0]-b[0])){
  const last=merged.at(-1);
  if(last&&rawStart<=last[1]+0.04)last[1]=Math.max(last[1],rawEnd);else merged.push([rawStart,rawEnd]);
 }
 const visible=[];let cursor=0;
 for(const [start,end] of merged){if(start-cursor>0.04)visible.push([cursor,start]);cursor=Math.max(cursor,end)}
 if(length-cursor>0.04)visible.push([cursor,length]);return visible;
}

/**
 * Vrátí pouze skutečně vnější hrany sjednocené dispozice. Sousední prostory
 * společnou hranu spotřebují, takže plášť automaticky sleduje přesuny,
 * otočení i změny velikostí a nikdy nevytváří stěny uvnitř bloku.
 */
export function externalWallSegments(rooms,tolerance=0.14){
 const edges=[];
 for(const room of rooms){
  const corners=roomCorners(room);
  for(let index=0;index<4;index++){
   const a=corners[index],b=corners[(index+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length;
   edges.push({room,index,a,b,length,tx,tz,nx:tz,nz:-tx});
  }
 }
 const segments=[];
 for(const edge of edges){
  const covered=[];
  for(const other of edges){
   if(other.room.id===edge.room.id)continue;
   const parallel=edge.tx*other.tx+edge.tz*other.tz;
   if(parallel>-0.985)continue;
   const lineDistance=Math.abs((other.a[0]-edge.a[0])*edge.tz-(other.a[1]-edge.a[1])*edge.tx);
   if(lineDistance>tolerance)continue;
   const c=(other.a[0]-edge.a[0])*edge.tx+(other.a[1]-edge.a[1])*edge.tz,d=(other.b[0]-edge.a[0])*edge.tx+(other.b[1]-edge.a[1])*edge.tz;
   covered.push([c,d]);
  }
  // Jižní dveře samostatně stojícího prostoru zůstanou průchozí i v plášti.
  if(edge.index===2&&edge.room.type!=='corridor')covered.push([edge.length/2-edge.room.doorWidth/2,edge.length/2+edge.room.doorWidth/2]);
  for(const [start,end] of uncoveredIntervals(edge.length,covered)){
   const a=pointOnEdge(edge,start),b=pointOnEdge(edge,end);
   segments.push({...edge,a,b,length:end-start,start,end});
  }
 }
 return segments;
}

function createPerimeterEnvelope(rooms,floor,{cutaway=true}={}){
 const root=new THREE.Group();root.name='Obvodový plášť budovy';root.userData={entity:'building-envelope'};
 const thickness=floor.perimeterWallThickness??0.42,fullHeight=floor.perimeterWallHeight??3;
 for(const segment of externalWallSegments(rooms)){
  const near=cutaway&&segment.nz>0.35,height=near?Math.min(1.28,fullHeight):fullHeight;
  const shell=new THREE.Group(),cx=(segment.a[0]+segment.b[0])/2+segment.nx*thickness/2,cz=(segment.a[1]+segment.b[1])/2+segment.nz*thickness/2;
  shell.name=`Obvodová stěna · ${segment.room.name}`;shell.position.set(cx,0,cz);shell.rotation.y=Math.atan2(-segment.tz,segment.tx);root.add(shell);
  box(shell,'external wall shell',[segment.length+0.06,height,thickness],[0,height/2,0],'facade');
  box(shell,'external wall base',[segment.length+0.14,0.24,thickness+0.1],[0,0.12,0],'dark');
  box(shell,'external wall coping',[segment.length+0.12,0.075,thickness+0.1],[0,height+0.015,0],'wallEdge');
  // Jemné modulové spáry a krajní pilíře sjednotí sousední prostory do fasády.
  for(let x=-segment.length/2+1.2;x<segment.length/2-0.25;x+=1.2)box(shell,'external panel joint',[0.018,Math.max(0.18,height-0.14),0.024],[x,height/2,-thickness/2-0.013],'dark');
  for(let y=1.02;y<height-0.16;y+=1.02)box(shell,'external horizontal panel joint',[segment.length-0.2,0.014,0.024],[0,y,-thickness/2-0.013],'wallJoint');
  for(const x of [-segment.length/2,segment.length/2])box(shell,'external corner pier',[thickness+0.11,height+0.045,thickness+0.11],[x,height/2,0],'facade');
 }
 return root;
}

function roomGeometrySignature(room,{cutaway,lowerNearWall}){
 const flipped=Math.cos(room.rotation*Math.PI/180)<0;
 return [room.type,room.width,room.depth,room.height,room.doorWidth,Boolean(cutaway),Boolean(lowerNearWall),flipped].join('|');
}

function cloneDashboardRoom(prototype,room){
 const group=prototype.clone(true);group.name=room.name;group.userData={...group.userData,entity:'room',entityId:room.id,selected:null};
 // Materiály, jejichž barva nebo viditelnost reaguje na živý stav sálu,
 // musí zůstat samostatné. Ostatní materiály a všechny geometrie se bezpečně
 // sdílejí mezi shodnými místnostmi a výrazně zkracují první sestavení scény.
 group.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const mutable=['wall','facade'].includes(mesh.userData.baseMaterialToken)||mesh.userData.selectionLight||mesh.userData.selectionIndicator;
  if(mutable)mesh.material=Array.isArray(mesh.material)?mesh.material.map(value=>value.clone()):mesh.material.clone();
 });
 return group;
}

export function buildFloor(project,floorId,options={}){
 const floor=project.floors.find(f=>f.id===floorId),g=new THREE.Group();g.name=floor.name;g.userData={entity:'floor',entityId:floorId};g.position.y=options.elevation?floor.elevation:0;
 const map=new Map();
 const rooms=project.rooms.filter(r=>r.floorId===floorId);
 const selectedIds=new Set(options.selectedIds||[]);if(options.selectedId)selectedIds.add(options.selectedId);
 if(rooms.length){const corners=rooms.flatMap(roomCorners),minX=Math.min(...corners.map(p=>p[0])),maxX=Math.max(...corners.map(p=>p[0])),minZ=Math.min(...corners.map(p=>p[1])),maxZ=Math.max(...corners.map(p=>p[1])),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,bw=maxX-minX,bd=maxZ-minZ;
 box(g,'building foundation',[bw+0.62,0.38,bd+0.62],[cx,-0.34,cz],'dark');
 box(g,'building service deck',[bw+0.34,0.12,bd+0.34],[cx,-0.11,cz],'floor');
 box(g,'building south plinth',[bw+0.34,0.36,0.2],[cx,0.12,maxZ+0.12],'dark');
 box(g,'building north plinth',[bw+0.34,0.36,0.2],[cx,0.12,minZ-0.12],'dark');
 box(g,'building west plinth',[0.2,0.36,bd+0.34],[minX-0.12,0.12,cz],'dark');
 box(g,'building east plinth',[0.2,0.36,bd+0.34],[maxX+0.12,0.12,cz],'dark');
 const boundaryLayout=floor.knlBoundaryEnabled===false?null:knlBoundaryLayout(rooms,floor),haloWidth=boundaryLayout?boundaryLayout.outerMaxX-boundaryLayout.outerMinX:bw,haloDepth=boundaryLayout?boundaryLayout.outerMaxZ-boundaryLayout.outerMinZ:bd;
 g.add(createBuildingHalo(haloWidth,haloDepth,cx,cz));
 if(floor.perimeterWalls!==false)g.add(createPerimeterEnvelope(rooms,floor,{cutaway:options.cutaway??true}));
 if(boundaryLayout)g.add(createKnlBoundary(rooms,floor));}

 const operatingRooms=rooms.filter(r=>r.type!=='corridor'),nearEdge=operatingRooms.length?Math.max(...operatingRooms.map(r=>{const angle=r.rotation*Math.PI/180,halfZ=Math.abs(Math.sin(angle))*r.width/2+Math.abs(Math.cos(angle))*r.depth/2;return r.z+halfZ})):-Infinity;
 const roomPrototypes=options.reuseGeometry?new Map():null,equipmentPrototypes=options.reuseGeometry?new Map():null;
 for(const r of rooms){
  const angle=r.rotation*Math.PI/180,halfZ=Math.abs(Math.sin(angle))*r.width/2+Math.abs(Math.cos(angle))*r.depth/2,lowerNearWall=r.type!=='corridor'&&r.z+halfZ>=nearEdge-0.12;
  const roomOptions={cutaway:options.cutaway??true,selected:selectedIds.has(r.id),lowerNearWall},signature=roomGeometrySignature(r,roomOptions),prototype=roomPrototypes?.get(signature);
  const group=prototype?cloneDashboardRoom(prototype,r):createRoomGeometry(r,roomOptions);if(roomPrototypes&&!prototype)roomPrototypes.set(signature,group);
  group.position.set(r.x,0,r.z);group.rotation.y=angle;g.add(group);map.set(r.id,group);
 }
 for(const a of project.items.filter(a=>a.floorId===floorId)){
  const prototype=equipmentPrototypes?.get(a.kind),item=prototype?prototype.clone(true):createEquipment(a.kind);if(equipmentPrototypes&&!prototype)equipmentPrototypes.set(a.kind,item);
  item.name=a.name;item.userData={entity:'item',entityId:a.id,assetKind:a.kind};item.position.set(a.x,a.y,a.z);item.rotation.y=a.rotation*Math.PI/180;item.scale.setScalar(a.scale);(map.get(a.roomId)||g).add(item);map.set(a.id,item);
 }
 return {group:g,entities:map};
}
export function disposeTree(g){g.traverse(o=>{if(!o.userData?.sharedSpatialGeometry)o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose()})}
