import * as THREE from 'three';
import {SCENE_LIGHTING as L} from './scene-lighting.js';
/** CPU triangle rasterizer for the same Three.js scene when WebGL2 is absent.
 * Depth buffer, smooth vertex lighting, shadow map and supersampling. No raster reference is used.
 */
export class SoftwareRenderer{
 constructor(){this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d');this.lightCamera=new THREE.OrthographicCamera(-23,23,23,-23,0.1,95);this.lightCamera.position.set(...L.key.position);this.lightCamera.lookAt(0,0,0);this.lightCamera.updateMatrixWorld();this.background=[7,14,39]}
 setSize(w,h){this.w=Math.round(w);this.h=Math.round(h);this.domElement.width=this.w;this.domElement.height=this.h}
 setQuality(){}setClearColor(){}dispose(){}
 render(scene,camera){if(!this.w||!this.h)return;scene.updateMatrixWorld(true);camera.updateMatrixWorld();const meshes=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&o.userData.effect!=='building-halo')meshes.push(o)});
  const shadowSize=640,shadow=new Float32Array(shadowSize*shadowSize).fill(Infinity),shadowVP=new THREE.Matrix4().multiplyMatrices(this.lightCamera.projectionMatrix,this.lightCamera.matrixWorldInverse);
  for(const mesh of meshes)this.raster(mesh,shadowVP,shadowSize,shadowSize,shadow,null,null,null);
  const depth=new Float32Array(this.w*this.h).fill(Infinity),pixels=new Uint8ClampedArray(this.w*this.h*4),viewProjection=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  for(const mesh of meshes)this.raster(mesh,viewProjection,this.w,this.h,depth,pixels,shadow,shadowVP);
  // Gentle contact shading using local depth discontinuities. Transparent outside geometry.
  const original=pixels.slice();for(let y=2;y<this.h-2;y++)for(let x=2;x<this.w-2;x++){const idx=y*this.w+x;if(!Number.isFinite(depth[idx]))continue;let occluded=0;for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3],[-5,-5],[5,-5],[-5,5],[5,5]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=this.w||yy>=this.h)continue;const d=depth[idx]-depth[yy*this.w+xx];if(d>0.00025&&d<0.014)occluded+=1-d/0.014}const shade=1-occluded*L.cpu.contactStrength;for(let k=0;k<3;k++)pixels[idx*4+k]=original[idx*4+k]*shade;}
  this.context.putImageData(new ImageData(pixels,this.w,this.h),0,0);
 }
 raster(mesh,vp,w,h,depth,pixels,shadow,shadowVP){const geometry=mesh.geometry,pos=geometry.attributes.position,norm=geometry.attributes.normal,index=geometry.index,mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(!pos||!mat)return;
 const m=new THREE.Matrix4().multiplyMatrices(vp,mesh.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),count=pos.count,vertices=new Float32Array(count*9),v=new THREE.Vector3(),n=new THREE.Vector3(),sp=new THREE.Vector3();const light=new THREE.Vector3(...L.key.position).normalize();
 for(let i=0;i<count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(m);const off=i*9;vertices[off]=(v.x+1)*w/2;vertices[off+1]=(1-v.y)*h/2;vertices[off+2]=v.z;
 if(pixels){n.fromBufferAttribute(norm,i).applyMatrix3(nm).normalize();vertices[off+3]=L.cpu.ambient+Math.max(0,n.dot(light))*L.cpu.diffuse;sp.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(shadowVP);vertices[off+4]=(sp.x+1)*320;vertices[off+5]=(1-sp.y)*320;vertices[off+6]=sp.z;}}
 let parent=mesh,room=null,selectedId=null;while(parent){if(parent.userData.entity==='room')room=parent;if(parent.userData.selectedRoomId)selectedId=parent.userData.selectedRoomId;parent=parent.parent;}
 const warm=room&&room.userData.entityId===selectedId;
 const tint=warm?[1.08,1.015,0.91]:L.cpu.tint;
 const color=mat.color||new THREE.Color(0x888888);const srgb=color.clone().convertLinearToSRGB();const rgb=[srgb.r*255,srgb.g*255,srgb.b*255];const tris=index?index.count:count;
 for(let i=0;i<tris;i+=3){const a=(index?index.getX(i):i)*9,b=(index?index.getX(i+1):i+1)*9,c=(index?index.getX(i+2):i+2)*9;const ax=vertices[a],ay=vertices[a+1],bx=vertices[b],by=vertices[b+1],cx=vertices[c],cy=vertices[c+1];const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(area>=-0.01)continue;
 const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));if(minX>maxX||minY>maxY)continue;
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const xx=x+0.5,yy=y+0.5,u=((bx-xx)*(cy-yy)-(by-yy)*(cx-xx))/area,t=((cx-xx)*(ay-yy)-(cy-yy)*(ax-xx))/area,k=1-u-t;if(u<0||t<0||k<0)continue;const z=u*vertices[a+2]+t*vertices[b+2]+k*vertices[c+2],idx=y*w+x;if(z>=depth[idx]||z< -1||z>1)continue;depth[idx]=z;if(!pixels)continue;
 let intensity=u*vertices[a+3]+t*vertices[b+3]+k*vertices[c+3];const sx=u*vertices[a+4]+t*vertices[b+4]+k*vertices[c+4],sy=u*vertices[a+5]+t*vertices[b+5]+k*vertices[c+5],sz=u*vertices[a+6]+t*vertices[b+6]+k*vertices[c+6];let hits=0,total=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=Math.round(sx)+dx,Y=Math.round(sy)+dy;if(X>=0&&Y>=0&&X<640&&Y<640){total++;if(sz-L.cpu.shadowBias>shadow[Y*640+X])hits++}}intensity=L.cpu.ambient+(intensity-L.cpu.ambient)*(1-(total?hits/total:0)*L.cpu.shadowStrength);
 const emissive=mat.emissive?.getHex()>0?Math.min(mat.emissiveIntensity||0,1):0;for(let channel=0;channel<3;channel++)pixels[idx*4+channel]=Math.min(255,rgb[channel]*(L.cpu.ambient*(warm?tint[channel]:[0.92,0.96,1.20][channel])+(intensity-L.cpu.ambient+emissive*0.25)*tint[channel]));pixels[idx*4+3]=255;
 }}
 }
}
