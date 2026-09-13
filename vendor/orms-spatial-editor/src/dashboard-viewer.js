import * as THREE from 'three';
import {SCENE_LIGHTING as L} from './scene-lighting.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoftwareRenderer } from './software-renderer.js';
import {buildFloor,disposeTree,setRoomActivity,setRoomSelected,setRoomStatus} from './geometry.js';
import {hydrateEquipmentModels} from './equipment-assets.js';
import {hydrateOperatingRoomModels} from './room-assets.js';
import {fitOrthographicCamera} from './camera-framing.js';
export class DashboardViewer{
 constructor(host,labels,onSelect){
  this.host=host;this.labels=labels;this.onSelect=onSelect;
  this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-17,17,12,-12,0.1,250);
  this.scene.add(new THREE.HemisphereLight(L.ambient.color,L.ambient.ground,L.ambient.intensity));
  const light=new THREE.DirectionalLight(L.key.color,L.key.intensity);light.position.set(...L.key.position);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:110});light.shadow.bias=-0.00015;light.shadow.normalBias=0.012;light.shadow.radius=4;light.shadow.blurSamples=8;this.scene.add(light,light.target);this.keyLight=light;
  const rim=new THREE.DirectionalLight(L.rim.color,L.rim.intensity);rim.position.set(...L.rim.position);this.scene.add(rim,rim.target);this.rimLight=rim;
  // A broad camera-side fill keeps the near facade legible without turning the
  // coping into white rails. This recreates the reference model's soft studio light.
  const fill=new THREE.DirectionalLight(L.fill.color,L.fill.intensity);fill.position.set(...L.fill.position);this.scene.add(fill,fill.target);this.fillLight=fill;
  this.activeLights=new Map();
  try{this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,depth:true,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:false});this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));this.renderer.setClearColor(0x02071d,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.VSMShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=L.exposure;const environmentScene=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.environmentTexture=pmrem.fromScene(environmentScene,0.035).texture;this.scene.environment=this.environmentTexture;this.scene.environmentIntensity=L.environmentIntensity;pmrem.dispose();environmentScene.dispose();}catch{this.software=true;this.renderer=new SoftwareRenderer();this.renderer.setQuality('low');this.renderer.setClearColor(0x030923,0);}
  // Contact AO is baked into the shared room atlas. No full-screen AO buffers
  // or extra per-frame geometry pass are needed while orbiting the building.
  this.renderer.domElement.setAttribute('aria-label','Prostorový model operačních sálů');host.append(this.renderer.domElement);
  // Ortografická projekce zachovává stejnou velikost předních i zadních stěn.
  // OrbitControls přitom ponechává přirozené mírné natočení a volnou rotaci.
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=false;this.orbit.maxPolarAngle=Math.PI/2.1;this.orbit.addEventListener('change',()=>this.draw());
  this.start=e=>{this.down=[e.clientX,e.clientY]};this.end=e=>{if(!this.content||!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>5)return;const r=host.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),this.camera);for(const hit of ray.intersectObject(this.content,true)){let n=hit.object;while(n&&n!==this.content){if(n.userData.entity==='room'){this.onSelect(n.userData.entityId);return}n=n.parent}}};
  host.addEventListener('pointerdown',this.start);host.addEventListener('pointerup',this.end);this.resizeFrame=0;this.resize=new ResizeObserver(()=>{if(this.resizeFrame)return;this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;this.fit(this.top)})});this.resize.observe(host);
 }
 async setProject(project,floorId,id,roomVisuals,onProgress=()=>{}){this.project=project;this.floorId=floorId;const generation=(this.modelGeneration||0)+1;this.modelGeneration=generation;if(this.content){this.scene.remove(this.content);disposeTree(this.content)}
  // Architektonický řez snižuje jen stěnu nejblíže kameře. Rozměry půdorysu
  // zůstávají přesné, ale stejně jako v referenci jsou vidět stoly a přístroje.
  const built=buildFloor(project,floorId,{cutaway:true,reuseGeometry:true});this.content=built.group;this.entities=built.entities;this.roomById=new Map(project.rooms.filter(r=>r.floorId===floorId).map(r=>[r.id,r]));this.labelByRoom=new Map();this.id=null;
  for(const group of this.entities.values()){
   if(group.userData.entity!=='room')continue;
   group.userData.hideActivityStrips=true;
   for(const mesh of group.children)if(mesh.userData.selectionLight)mesh.visible=false;
  }
  this.scene.add(this.content);this.renderer.shadowMap&&(this.renderer.shadowMap.needsUpdate=true);this.labels.replaceChildren();for(const r of project.rooms.filter(r=>r.floorId===floorId&&r.type!=='corridor')){const b=document.createElement('button');b.textContent=r.name;b.dataset.room=r.id;b.onclick=()=>this.onSelect(r.id);this.labels.append(b);this.labelByRoom.set(r.id,b)}this.setRoomVisuals(roomVisuals,false);this.setSelectedRoom(id,false);
  if(!this.software){const current=()=>this.modelGeneration===generation&&this.content===built.group;let changed=await hydrateOperatingRoomModels(this.entities,project.rooms.filter(r=>r.floorId===floorId),{onProgress,shouldApply:current});if(!changed&&current())changed=await hydrateEquipmentModels(this.content,{onProgress,shouldApply:current});if(changed&&current()){this.setRoomVisuals(this.roomVisuals,false,true);this.renderer.shadowMap.needsUpdate=true;this.fit(this.top)}}
  return this.modelGeneration===generation;
 }
 setRoomVisuals(roomVisuals,redraw=true,force=false){this.roomVisuals=roomVisuals||new Map();for(const [roomId,visual] of this.roomVisuals){const group=this.entities?.get(roomId);if(group?.userData.entity!=='room')continue;setRoomStatus(group,visual?.statusColor??null,force);setRoomActivity(group,Boolean(visual?.active));}this.syncActiveLights();if(this.id)this.setSelectedRoom(this.id,redraw);else if(redraw)this.draw();}
 syncActiveLights(){const activeIds=new Set();for(const [roomId,visual] of this.roomVisuals||[]){if(!visual?.active)continue;const room=this.roomById?.get(roomId);if(!room)continue;activeIds.add(roomId);let light=this.activeLights.get(roomId);if(!light){light=new THREE.PointLight(L.selected.color,L.selected.intensity,L.selected.distance,L.selected.decay);light.name=`Aktivní sál · ${room.name}`;this.activeLights.set(roomId,light);this.scene.add(light)}light.position.set(room.x,2.45,room.z)}for(const [roomId,light] of this.activeLights){if(activeIds.has(roomId))continue;this.scene.remove(light);this.activeLights.delete(roomId)}this.renderer.domElement.dataset.activeLights=String(activeIds.size)}
 setSelectedRoom(id,redraw=true){if(!this.content)return;const chosen=id?this.roomById?.get(id):null,nextId=chosen?.floorId===this.floorId?id:null;const previous=this.id&&this.id!==nextId?this.entities?.get(this.id):null;if(previous?.userData.entity==='room')setRoomSelected(previous,false,0xffda28,{tintSurfaces:false,showLight:false});const next=nextId?this.entities?.get(nextId):null;if(next?.userData.entity==='room')setRoomSelected(next,true,0xffda28,{tintSurfaces:false,showLight:false});this.id=nextId;this.content.userData.selectedRoomId=nextId;for(const [roomId,label] of this.labelByRoom||[])label.classList.toggle('selected',roomId===nextId);if(redraw)this.draw();
 }
 fit(top=false){
  if(!this.content)return;
  this.top=top;
  const w=this.host.clientWidth,h=this.host.clientHeight;
  if(!w||!h)return;
  this.renderer.setSize(w,h);
  this.content.updateMatrixWorld(true);
  const box=new THREE.Box3(),meshBounds=new THREE.Box3();
  this.content.traverseVisible(object=>{
   if(!object.isMesh||!object.geometry||object.userData.effect||object.userData.selectionLight)return;
   if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
   meshBounds.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
   box.union(meshBounds);
  });
  if(box.isEmpty())box.set(new THREE.Vector3(-4,0,-4),new THREE.Vector3(4,3,4));
  const size=box.getSize(new THREE.Vector3()),center=fitOrthographicCamera(this.camera,box,w,h,top);
  this.orbit.target.copy(center);
  const shadowSpan=Math.max(size.x,size.z)*0.64+4;
  for(const light of [this.keyLight,this.rimLight,this.fillLight]){
   const settings=light===this.keyLight?L.key:light===this.rimLight?L.rim:L.fill;
   light.position.copy(center).add(new THREE.Vector3(...settings.position));
   light.target.position.copy(center);light.target.updateMatrixWorld();
  }
  Object.assign(this.keyLight.shadow.camera,{left:-shadowSpan,right:shadowSpan,top:shadowSpan,bottom:-shadowSpan});
  this.keyLight.shadow.camera.updateProjectionMatrix();
  this.orbit.update();
  this.renderer.shadowMap&&(this.renderer.shadowMap.needsUpdate=true);this.draw();
 }
 draw(){if(!this.content)return;this.scene.updateMatrixWorld(true);this.renderer.render(this.scene,this.camera);const w=this.host.clientWidth,h=this.host.clientHeight;for(const b of this.labels.children){const r=this.roomById.get(b.dataset.room);if(!r)continue;const v=new THREE.Vector3(r.x,Math.max(2.5,r.height||3)+0.15,r.z).project(this.camera);b.style.left=`${(v.x+1)*w/2}px`;b.style.top=`${(1-v.y)*h/2}px`;b.hidden=v.z>1}}
 dispose(){this.modelGeneration=(this.modelGeneration||0)+1;this.content=null;this.resize.disconnect();if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.orbit.dispose();this.host.removeEventListener('pointerdown',this.start);this.host.removeEventListener('pointerup',this.end);this.activeLights.clear();this.keyLight.shadow.dispose();this.environmentTexture?.dispose();disposeTree(this.scene);this.renderer.dispose?.();this.host.replaceChildren();this.labels.replaceChildren()}
}
