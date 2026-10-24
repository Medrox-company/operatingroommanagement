import * as THREE from 'three';
import {SCENE_LIGHTING as L} from './scene-lighting.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildFloor, disposeTree } from './geometry.js';
import {hydrateEquipmentModels} from './equipment-assets.js';
import {snapRoomPlacement} from './model.js';
export class SpatialViewer {
 constructor(host,{onSelect=()=>{},onTransform=()=>{},onGroupTransform=()=>{}}={}){
  this.host=host;this.onSelect=onSelect;this.onTransform=onTransform;this.onGroupTransform=onGroupTransform;this.mode='room';this.cutaway=true;this.snap=0.25;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#090f2a');
  this.camera=new THREE.PerspectiveCamera(38,1,0.1,500);this.camera.position.set(25,28,32);
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=L.exposure;
  {const environmentScene=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(this.renderer);this.environmentTexture=pmrem.fromScene(environmentScene,0.035).texture;this.scene.environment=this.environmentTexture;pmrem.dispose();environmentScene.dispose()}
  this.renderer.domElement.setAttribute('aria-label','3D editor budovy');this.renderer.domElement.tabIndex=0;host.append(this.renderer.domElement);
  this.orbit=new OrbitControls(this.camera,this.renderer.domElement);this.orbit.enableDamping=true;this.orbit.maxPolarAngle=Math.PI/2.05;this.orbit.target.set(0,0,0);
  this.scene.add(new THREE.HemisphereLight(L.ambient.color,L.ambient.ground,L.ambient.intensity));
  const key=new THREE.DirectionalLight(L.key.color,L.key.intensity);key.position.set(...L.key.position);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:100});key.shadow.bias=-0.0004;this.scene.add(key);
  const fill=new THREE.DirectionalLight(L.rim.color,L.rim.intensity);fill.position.set(...L.rim.position);this.scene.add(fill);
  const frontFill=new THREE.DirectionalLight(L.fill.color,L.fill.intensity);frontFill.position.set(...L.fill.position);this.scene.add(frontFill);
  this.grid=new THREE.GridHelper(100,100,0x3f527e,0x1c2a4c);this.grid.position.y=-0.17;this.scene.add(this.grid);
  this.guides={x:this.createGuide('x'),z:this.createGuide('z')};this.scene.add(this.guides.x,this.guides.z);
  this.transform=new TransformControls(this.camera,this.renderer.domElement);this.transform.setSize(0.85);this.transform.setTranslationSnap(this.snap);this.transform.setRotationSnap(Math.PI/12);this.helper=this.transform.getHelper();this.scene.add(this.helper);this.setTool('translate');
  this.transform.addEventListener('dragging-changed',e=>{this.orbit.enabled=!e.value;this.dragging=e.value;if(!e.value){this.ignoreClickUntil=performance.now()+150;this.hideGuides()}});
  this.transform.addEventListener('objectChange',()=>this.previewTransform());
  this.transform.addEventListener('mouseUp',()=>{
   const o=this.transform.object;if(!o)return;
   if(this.multiSelection){const positions=this.multiSelection.ids.map(id=>{const group=this.entities.get(id);return {id,x:group.position.x,z:group.position.z}});this.onGroupTransform(this.multiSelection.ids,{positions});this.activeSnap=null;this.hideGuides();return}
   const room=this.project?.rooms.find(r=>r.id===o.userData.entityId),payload={x:o.position.x,y:o.position.y,z:o.position.z,rotation:THREE.MathUtils.radToDeg(o.rotation.y),snapped:Boolean(this.activeSnap?.snappedX||this.activeSnap?.snappedZ)};
   if(room&&this.tool==='scale'){
    payload.width=Math.max(2,Math.min(100,room.width*Math.abs(o.scale.x)));
    payload.depth=Math.max(2,Math.min(100,room.depth*Math.abs(o.scale.z)));
   }
   this.onTransform(o.userData.entityId,payload);this.activeSnap=null;this.hideGuides();
  });
  this.down=e=>{this.start=[e.clientX,e.clientY]};
  this.up=e=>{if(this.dragging||performance.now()<(this.ignoreClickUntil||0)||!this.start||Math.hypot(e.clientX-this.start[0],e.clientY-this.start[1])>5)return;this.pick(e)};
  this.renderer.domElement.addEventListener('pointerdown',this.down);this.renderer.domElement.addEventListener('pointerup',this.up);
  this.resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h)});this.resize.observe(host);
  this.renderer.setAnimationLoop(()=>{this.orbit.update();this.renderer.render(this.scene,this.camera)});
 }
 createGuide(axis){const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x67e8f9,transparent:true,opacity:0.95,depthTest:false}));line.name=`alignment guide ${axis}`;line.visible=false;line.renderOrder=100;return line}
 hideGuides(){for(const line of Object.values(this.guides||{}))line.visible=false}
 showGuide(axis,value){
  const rooms=this.project?.rooms.filter(r=>r.floorId===this.floorId)||[];if(!rooms.length||value===null)return;
  const minX=Math.min(...rooms.map(r=>r.x-r.width/2))-5,maxX=Math.max(...rooms.map(r=>r.x+r.width/2))+5,minZ=Math.min(...rooms.map(r=>r.z-r.depth/2))-5,maxZ=Math.max(...rooms.map(r=>r.z+r.depth/2))+5,line=this.guides[axis];
  line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(axis==='x'?[new THREE.Vector3(value,0.08,minZ),new THREE.Vector3(value,0.08,maxZ)]:[new THREE.Vector3(minX,0.08,value),new THREE.Vector3(maxX,0.08,value)]);line.visible=true;
 }
 previewTransform(){
  const o=this.transform.object;if(!o||this.snapping)return;
  if(this.multiSelection){const dx=o.position.x-this.multiSelection.startAnchor.x,dz=o.position.z-this.multiSelection.startAnchor.z;for(const id of this.multiSelection.ids){const group=this.entities.get(id),start=this.multiSelection.starts.get(id);if(group&&start){group.position.x=start.x+dx;group.position.z=start.z+dz}}for(const helper of this.selectionHelpers||[])helper.update();return}
  const room=this.project?.rooms.find(r=>r.id===o.userData.entityId);if(!room)return;
  if(this.tool==='translate'){
   const draft={...room,x:o.position.x,z:o.position.z,rotation:THREE.MathUtils.radToDeg(o.rotation.y)},threshold=this.snap?Math.max(0.16,Math.min(0.3,this.snap*0.65)):0.18,result=snapRoomPlacement(draft,this.project.rooms,threshold);this.activeSnap=result;
   this.snapping=true;o.position.x=result.x;o.position.z=result.z;this.snapping=false;this.hideGuides();if(result.snappedX)this.showGuide('x',result.guideX);if(result.snappedZ)this.showGuide('z',result.guideZ);
  }else if(this.tool==='scale'){
   let width=Math.max(2,Math.min(100,room.width*Math.abs(o.scale.x))),depth=Math.max(2,Math.min(100,room.depth*Math.abs(o.scale.z)));
   if(this.snap){width=Math.max(2,Math.round(width/this.snap)*this.snap);depth=Math.max(2,Math.round(depth/this.snap)*this.snap)}
   this.snapping=true;o.scale.set(width/room.width,1,depth/room.depth);this.snapping=false;
  }
  this.selection?.update();
 }
 setProject(project,floorId,selectedIds=[],primaryId=null){
  if(!Array.isArray(selectedIds)){primaryId=selectedIds;selectedIds=selectedIds?[selectedIds]:[]}
  this.project=project;this.floorId=floorId;this.selectedIds=new Set(selectedIds);this.selectedId=primaryId||selectedIds.at(-1)||null;this.transform.detach();this.multiSelection=null;
  if(this.content){this.scene.remove(this.content);disposeTree(this.content)}
  if(this.selection){this.scene.remove(this.selection);disposeTree(this.selection);this.selection=null}
  for(const helper of this.selectionHelpers||[]){this.scene.remove(helper);disposeTree(helper)}this.selectionHelpers=[];
  if(this.multiAnchor){this.scene.remove(this.multiAnchor);this.multiAnchor=null}
  const generation=(this.modelGeneration||0)+1;this.modelGeneration=generation;const {group,entities}=buildFloor(project,floorId,{cutaway:this.cutaway,selectedIds});this.content=group;this.entities=entities;this.scene.add(group);
  void hydrateEquipmentModels(group,{shouldApply:()=>this.modelGeneration===generation&&this.content===group}).then(changed=>{if(!changed||this.modelGeneration!==generation)return;this.renderer.shadowMap.needsUpdate=true;this.selection?.update();for(const helper of this.selectionHelpers||[])helper.update();});
  const selectedRooms=selectedIds.map(id=>project.rooms.find(r=>r.id===id&&r.floorId===floorId)).filter(Boolean),selected=entities.get(this.selectedId);
  if(selectedRooms.length>1){
   const groups=selectedRooms.map(room=>entities.get(room.id)).filter(Boolean),center=groups.reduce((sum,item)=>sum.add(item.position),new THREE.Vector3()).multiplyScalar(1/groups.length),anchor=new THREE.Group();anchor.name='Skupinový výběr';anchor.userData={entity:'selection-group'};anchor.position.copy(center);this.scene.add(anchor);this.multiAnchor=anchor;
   this.multiSelection={ids:selectedRooms.map(room=>room.id),startAnchor:center.clone(),starts:new Map(groups.map(item=>[item.userData.entityId,item.position.clone()]))};
   this.selectionHelpers=groups.map(item=>{const helper=new THREE.BoxHelper(item,0x67e8f9);helper.name='group selection';this.scene.add(helper);return helper});
   this.transform.attach(anchor);this.setTool('translate');this.transform.setSpace('world');
  }else if(selected){
   this.transform.attach(selected);this.transform.setSpace(this.tool==='scale'||selected.userData.entity==='item'?'local':'world');this.transform.setRotationSnap(selected.userData.entity==='room'?Math.PI/2:Math.PI/12);
   this.selection=new THREE.BoxHelper(selected,0xffd928);this.selection.name='selection';this.scene.add(this.selection);
  }
 }
 setTool(mode){if(this.multiSelection&&mode!=='translate')mode='translate';this.tool=mode;this.transform.setMode(mode);this.transform.showX=mode==='translate'||mode==='scale';this.transform.showZ=mode==='translate'||mode==='scale';this.transform.showY=mode==='rotate';this.transform.setSpace(mode==='scale'?'local':this.transform.object?.userData.entity==='item'?'local':'world');this.hideGuides()}
 setSnap(value){this.snap=value;this.transform.setTranslationSnap(value||null)}
 pick(e){
  if(!this.content)return;
  const rect=this.renderer.domElement.getBoundingClientRect(),pointer=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(pointer,this.camera);
  for(const hit of ray.intersectObject(this.content,true)){
   let n=hit.object;while(n&&n!==this.content){if(n.userData.entity===this.mode){this.onSelect(n.userData.entityId,{toggle:e.shiftKey||e.ctrlKey||e.metaKey});return}n=n.parent}
  }
  this.onSelect(null,{toggle:e.shiftKey||e.ctrlKey||e.metaKey});
 }
 fit(top=false){
  const bounds=new THREE.Box3().setFromObject(this.content);if(bounds.isEmpty()){bounds.set(new THREE.Vector3(-8,0,-8),new THREE.Vector3(8,3,8))}
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),distance=Math.max(size.x,size.z,10)*1.75;
  this.orbit.target.copy(center);this.camera.position.copy(center).add(top?new THREE.Vector3(0,distance,0.01):new THREE.Vector3(distance*0.58,distance*0.68,distance*0.85));this.orbit.update();
 }
 async exportGLB(allFloors=false){
  const root=new THREE.Group();root.name=this.project.name;
  for(const floor of this.project.floors.filter(f=>allFloors||f.id===this.floorId))root.add(buildFloor(this.project,floor.id,{cutaway:false,elevation:allFloors}).group);
  root.updateMatrixWorld(true);
  try{return await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true})}finally{disposeTree(root)}
 }
 dispose(){this.renderer.setAnimationLoop(null);this.resize.disconnect();this.orbit.dispose();this.transform.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.down);this.renderer.domElement.removeEventListener('pointerup',this.up);this.environmentTexture?.dispose();disposeTree(this.scene);this.renderer.dispose();this.renderer.domElement.remove()}
}
