import {fitLivingZone,constrainPresetFrame,livingCameraLimits,constrainLivingTarget} from './camera-framing.js?v=field19d';
import {seasonVisuals,addSeasonGroundDetails} from './seasonal-visuals.js?v=resources17';
import * as T from '../vendor/three.module.js';
import {renderLivingBoard,updateLivingLabels,animateLivingBoard,refreshLivingHover,renderLivingPlacementPreview} from './living-world.js?v=field19d';
import {resourceIcon} from './everdell/art.js?v=20261112-23';
import {FACTIONS,TROOPS,WORLD,BUILDINGS} from './data.js?v=20261112-23';
import {count,visible,known,moveRange} from './movement.js?v=20261112-23';
import {woodlandCottage,ancientTree,woodlandFigure,woodlandSource,woodlandLocation,addWoodlandTerrain,animateWoodland} from './woodland-world.js?v=field19';

const PALETTE={plain:0x7f9857,meadow:0x9eae69,forest:0x617d48,road:0xc7b589,rock:0x9da186,water:0x79b2a7,mist:0x506d59};
const TEAM=[0x617baf,0x4f8c73,0x9b8058,0x977e9d];
const SKIN=0xdcc39a,WOOD=0x795f43,STONE=0xc8c6ac,DARK=0x374343;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const noise=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const escapeLabel=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WORKER_COLORS=[0x66764a,0xa35b42,0x596f86,0xba9758,0x78604a,0x806475];
export const CAMERA_EDGE_MARGIN=24;
/** Screen-space navigation is independent of camera yaw and device pixel ratio */
export function edgePanVector(x,y,width,height,margin=CAMERA_EDGE_MARGIN){
 if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0||x<0||y<0||x>width||y>height)return{x:0,y:0};
 const m=Math.max(1,Math.min(margin,width/3,height/3));
 let dx=x<m?-(1-x/m):x>width-m?1-(width-x)/m:0;
 let dy=y<m?1-y/m:y>height-m?-(1-(height-y)/m):0;
 const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}return{x:dx,y:dy};
}
export function unitHitRegion(id,bounds){
 return{id,x:(bounds.left+bounds.right)/2,y:(bounds.top+bounds.bottom)/2,halfWidth:clamp((bounds.right-bounds.left)/2+7,20,34),halfHeight:clamp((bounds.bottom-bounds.top)/2+6,24,52)};
}
export function nearestUnitHit(regions,x,y){
 let best=null,bestDistance=Infinity;for(const r of regions){const dx=x-r.x,dy=y-r.y;if((dx/r.halfWidth)**2+(dy/r.halfHeight)**2>1)continue;const distance=dx*dx+dy*dy;if(distance<bestDistance){best=r.id;bestDistance=distance;}}return best;
}


/** Find the nearest genuinely free rectangle by sweeping all obstacle edges */
export function placeMapLabel(anchorX,anchorY,width,height,obstacles,viewportWidth,viewportHeight,gap=8){
 const margin=10,left=margin+width/2,right=viewportWidth-margin-width/2,top=margin+height,bottom=viewportHeight-margin;
 const ys=new Set([clamp(anchorY-18,top,bottom),clamp(anchorY+height+18,top,bottom),top,bottom]);
 for(const o of obstacles){ys.add(clamp(o.top-gap,top,bottom));ys.add(clamp(o.bottom+gap+height,top,bottom));}
 let best=null;
 for(const y of ys){
  const intervals=obstacles.filter(o=>y>o.top-gap&&y-height<o.bottom+gap).map(o=>[Math.max(left,o.left-gap-width/2),Math.min(right,o.right+gap+width/2)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  const free=[];let cursor=left;for(const [a,b]of intervals){if(a>cursor)free.push([cursor,a]);cursor=Math.max(cursor,b);}if(cursor<right)free.push([cursor,right]);
  for(const [a,b]of free){const x=clamp(anchorX,a,b),r={left:x-width/2,right:x+width/2,top:y-height,bottom:y},edgeX=clamp(anchorX,r.left,r.right),edgeY=clamp(anchorY,r.top,r.bottom),distance=Math.hypot(anchorX-edgeX,anchorY-edgeY),score=distance+Math.hypot(x-anchorX,y-height/2-anchorY)*.12+(y-height>anchorY?5:0);
   if(!best||score<best.score)best={x,y,r,score};
  }
 }
 return best;
}


/** Woodland miniatures retain the world-space APIs used by every game mode */
export class WorldView{
 constructor(container,onPick,onHover,onCameraChange){
  this.container=container;this.onPick=onPick;this.onHover=onHover;this.onCameraChange=onCameraChange;
  this.t=0;this.lastTime=performance.now();this.state=null;this.p=0;this.menu=true;this.selected=null;this.build=null;
  this.entities=new Map();this.labels=[];this.flags=[];this.smoke=[];this.effects=[];this.pointers=new Map();this.keys=new Set();this.staticKey='';this.lastViewer=null;this.gameSeed=null;this.followId=null;this.followHold=false;this.cameraPresetId=null;this.cameraPreset=null;this.cameraBoundaryPending=false;this.hoveredUnitId=null;this.windowPointer={x:0,y:0,inside:false,type:'mouse',target:null};this.windowFocused=true;
  this.target=new T.Vector3(WORLD.center.x,0,WORLD.center.z);this.desiredTarget=this.target.clone();
  this.yaw=Math.PI*.22;this.desiredYaw=this.yaw;this.pitch=.82;this.desiredPitch=this.pitch;this.zoom=.7;this.desiredZoom=.7;
  this.scene=new T.Scene();this.scene.background=new T.Color('#506d59');this.scene.fog=new T.FogExp2('#506d59',.007);
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
  this.canvas=this.renderer.domElement;this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Карта: тяните для движения камеры, правая кнопка для вращения, колесо для масштаба');this.canvas.style.cursor='grab';this.canvas.style.touchAction='none';container.appendChild(this.canvas);
  this.camera=new T.OrthographicCamera(-20,20,14,-14,.1,220);
  this.scene.add(new T.HemisphereLight(0xffefd1,0x526b49,2.6));
  this.sun=new T.DirectionalLight(0xffdfa8,2.7);this.sun.position.set(-15,35,18);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-22;this.sun.shadow.camera.right=22;this.sun.shadow.camera.top=22;this.sun.shadow.camera.bottom=-22;this.sun.shadow.camera.far=110;this.sun.shadow.normalBias=.07;this.sun.shadow.bias=-.0001;this.scene.add(this.sun);this.scene.add(this.sun.target);
  const fill=new T.DirectionalLight(0xc7d8d4,.75);fill.position.set(30,18,-25);this.scene.add(fill);
  this.terrain=new T.Group();this.detail=new T.Group();this.actors=new T.Group();this.markers=new T.Group();this.effectLayer=new T.Group();this.scene.add(this.terrain,this.detail,this.actors,this.markers,this.effectLayer);
  this.labelLayer=document.createElement('div');this.labelLayer.className='world-labels';container.appendChild(this.labelLayer);
  this.selection=this.ring(.58,.65,0xf0d39c,.9);this.selection.visible=false;this.markers.add(this.selection);
  this.destination=this.ring(.22,.30,0xf0d39c,.9);this.destination.visible=false;this.markers.add(this.destination);
  this.reach=this.ring(1,1.012,0xe3d49d,.28);this.reach.visible=false;this.markers.add(this.reach);
  this.hoverMarker=this.ring(.15,.21,0xffe7b1,.85);this.hoverMarker.visible=false;this.markers.add(this.hoverMarker);
  this.buildBoundary=this.ring(3.48,3.6,0xf0d69b,.65);this.buildBoundary.visible=false;this.markers.add(this.buildBoundary);this.buildHints=new T.Group();this.markers.add(this.buildHints);
  this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.groundPlane=new T.Plane(new T.Vector3(0,1,0),-.14);
  this.installInputs();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.updateCamera(1);this.animate();
 }
 material(color,options={}){return new T.MeshStandardMaterial({color,roughness:.95,metalness:0,flatShading:false,...options});}
 mesh(group,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,typeof material==='number'?this.material(material):material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 box(g,x,y,z,w,h,d,color){return this.mesh(g,new T.BoxGeometry(w,h,d),color,x,y,z);}
 cylinder(g,x,y,z,r,h,color,sides=10,top=r){return this.mesh(g,new T.CylinderGeometry(top,r,h,sides),color,x,y,z);}
 sphere(g,x,y,z,r,color,sx=1,sy=1,sz=1){const m=this.mesh(g,new T.IcosahedronGeometry(r,1),color,x,y,z);m.scale.set(sx,sy,sz);return m;}
 cone(g,x,y,z,r,h,color,sides=10){return this.mesh(g,new T.ConeGeometry(r,h,sides),color,x,y,z);}
 beam(g,a,b,r,color){const d=new T.Vector3().subVectors(b,a),m=this.cylinder(g,0,0,0,r,d.length(),color,6);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
 roof(g,w,h,d,color,y){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,steps:1});geometry.translate(0,0,-d/2);return this.mesh(g,geometry,color,0,y,0);}
 ring(inner,outer,color,opacity=1){const m=new T.Mesh(new T.RingGeometry(inner,outer,64),new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false,depthTest:false}));m.rotation.x=-Math.PI/2;m.position.y=.23;m.renderOrder=9;return m;}
 disposeObject(object){object.traverse(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});object.removeFromParent();}
 clear(group){for(const o of [...group.children])this.disposeObject(o);}
 tagged(g,pick){g.traverse(o=>{if(o.isMesh)o.userData.pick=pick;});}
 tileAt(x,z){return this.state?.tiles[Math.round(z)*WORLD.width+Math.round(x)];}
 heightAt(x,z){const t=this.tileAt(x,z);if(t?.type==='water')return-.05;return .10+Math.sin(x*.28)*Math.cos(z*.32)*.13+Math.sin(x*.72+z*.47)*.035;}
 groundPoint(x,y){const r=this.canvas.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const ground=this.raycaster.intersectObjects(this.terrain.children,true)[0];if(ground)return ground.point;const p=new T.Vector3();return this.raycaster.ray.intersectPlane(this.groundPlane,p)?p:null;}
 pickAt(e){const unit=this.pickUnitAt(e.clientX,e.clientY);if(unit)return{type:'unit',id:unit};const point=this.groundPoint(e.clientX,e.clientY);const hit=this.raycaster.intersectObjects(this.actors.children,true).find(h=>h.object.userData.pick);if(hit)return hit.object.userData.pick;if(!point)return null;return{type:'ground',x:this.state?.livingBoard?point.x:Math.round(point.x),z:this.state?.livingBoard?point.z:Math.round(point.z)};}
 unitScreenRegions(){
  this.camera.updateMatrixWorld(true);const r=this.canvas.getBoundingClientRect(),regions=[];
  for(const entity of this.entities.values()){if(!entity.unit||!entity.group.visible)continue;const box=entity.group.userData.hitBounds;if(!box)continue;entity.group.updateWorldMatrix(true,false);const points=[];
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(entity.group.matrixWorld).project(this.camera));
   if(points.every(v=>v.z<-1||v.z>1))continue;const bounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity};
   for(const v of points){const x=r.left+(v.x*.5+.5)*r.width,y=r.top+(-v.y*.5+.5)*r.height;bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);}
   if(!Object.values(bounds).every(Number.isFinite)||bounds.right<r.left-35||bounds.left>r.right+35||bounds.bottom<r.top-52||bounds.top>r.bottom+52)continue;regions.push(unitHitRegion(entity.unit.id,bounds));
  }return regions;
 }
 pickUnitAt(x,y){return nearestUnitHit(this.unitScreenRegions(),x,y);}
 isCameraUI(target){
  if(!target||typeof target.closest!=='function')return false;
  if(target.closest('[data-camera-ui],.portrait-dock,.worker-bar,.minimap-panel,.movement-panel,.map-controls,.help-modal,.modal,[role="dialog"],[role="menu"],input,textarea,select,a'))return true;
  return !!target.closest('button')&&!target.closest('.world-label');
 }
 pointerOverMap(target,x,y){const r=this.canvas.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&!this.isCameraUI(target)&&(target===this.canvas||!!target?.closest?.('.world-label,.world-labels,.world-stage'));}
 notePointerMove(e){
  if(e.pointerType&&e.pointerType!=='mouse')return;const previous=this.windowPointer,inside=e.clientX>=0&&e.clientY>=0&&e.clientX<=window.innerWidth&&e.clientY<=window.innerHeight;
  if(!previous.inside||e.clientX!==previous.x||e.clientY!==previous.y){this.releaseCameraPreset();this.cancelFollow();}
  this.windowPointer={x:e.clientX,y:e.clientY,inside,type:'mouse',target:e.target??previous.target};this.windowFocused=true;
 }
 setHoveredUnit(id){if(this.hoveredUnitId===id)return;this.hoveredUnitId=id;this.onHover?.(id?{type:'unit',id}:null);if(!this.pointers.size)this.canvas.style.cursor=id?'pointer':'grab';}
 refreshUnitHover(){
  const mouse=this.windowPointer;if(this.menu||this.inputPaused||!mouse.inside||this.pointers.size||!this.windowFocused){this.setHoveredUnit(null);return;}
  const target=document.elementFromPoint(mouse.x,mouse.y)??mouse.target;if(!this.pointerOverMap(target,mouse.x,mouse.y)){this.setHoveredUnit(null);return;}
  const label=target?.closest?.('.world-label[data-map-kind="unit"]');const visibleLabel=label&&label.style.visibility==='visible'?label.dataset.mapId:null;this.setHoveredUnit(visibleLabel&&this.entities.has('unit:'+visibleLabel)?visibleLabel:this.pickUnitAt(mouse.x,mouse.y));
 }
 installInputs(){
  this.onWindowMove=e=>this.notePointerMove(e);
  this.onWindowLeave=()=>{this.releaseCameraPreset();this.windowPointer.inside=false;this.hoverMarker.visible=false;this.keys.clear();this.pointers.clear();this.setHoveredUnit(null);this.cancelFollow();this.desiredTarget.copy(this.target);};
  this.onWindowOut=e=>{if(!e.relatedTarget&&(e.clientX<=0||e.clientY<=0||e.clientX>=window.innerWidth||e.clientY>=window.innerHeight))this.onWindowLeave();};
  this.onDown=e=>{if(this.inputPaused||e.button!==0&&e.button!==1&&e.button!==2)return;this.releaseCameraPreset();this.cancelFollow();this.canvas.focus({preventScroll:true});this.canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,button:e.button});this.canvas.style.cursor='grabbing';this.hoverMarker.visible=false;};
  this.onMove=e=>{this.notePointerMove(e);const tracked=this.pointers.get(e.pointerId);if(tracked){const dx=e.clientX-tracked.x,dy=e.clientY-tracked.y;tracked.moved||=Math.hypot(e.clientX-tracked.startX,e.clientY-tracked.startY)>5;
    if(this.pointers.size===2){const all=[...this.pointers.entries()];const other=all.find(([id])=>id!==e.pointerId)?.[1];if(other){const oldDist=Math.hypot(tracked.x-other.x,tracked.y-other.y),newDist=Math.hypot(e.clientX-other.x,e.clientY-other.y);this.desiredZoom=clamp(this.desiredZoom*(newDist/Math.max(oldDist,1)),.35,3.2);const oldAngle=Math.atan2(tracked.y-other.y,tracked.x-other.x),newAngle=Math.atan2(e.clientY-other.y,e.clientX-other.x);this.desiredYaw-=shortest(oldAngle,newAngle);this.panPixels(dx*.5,dy*.5);other.moved=true;tracked.moved=true;}}
    else if(tracked.button===2||e.shiftKey){this.cancelFollow();this.desiredYaw-=dx*.006;this.desiredPitch=clamp(this.desiredPitch+dy*.004,.35,1.28);this.boundTarget();}
    else if(tracked.moved)this.panPixels(dx,dy);
    tracked.x=e.clientX;tracked.y=e.clientY;return;}
   const obj=this.pickAt(e);this.setHoveredUnit(obj?.type==='unit'?obj.id:null);this.hoverMarker.visible=this.state?.mode!=='placement'&&!!obj&&obj.type==='ground'&&obj.x>=0&&obj.z>=0&&obj.x<WORLD.width&&obj.z<WORLD.height&&!this.menu&&!this.inputPaused;if(this.hoverMarker.visible){this.hoverMarker.position.set(obj.x,this.heightAt(obj.x,obj.z)+.12,obj.z);this.hoverMarker.material.color.setHex(this.build&&!this.canBuildAt(obj.x,obj.z)?0xc88c7a:0xffe7b1);}this.onHover?.(obj);};
  this.onUp=e=>{const tracked=this.pointers.get(e.pointerId);this.pointers.delete(e.pointerId);this.canvas.style.cursor='grab';if(!this.inputPaused&&tracked&&!tracked.moved&&tracked.button===0&&this.pointers.size===0){const obj=this.pickAt(e);if(obj)this.onPick?.(obj);}try{this.canvas.releasePointerCapture(e.pointerId);}catch{}};
  this.onCancel=e=>{this.pointers.delete(e.pointerId);this.canvas.style.cursor='grab';};
  this.onWheel=e=>{if(this.inputPaused)return;e.preventDefault();this.setZoom(-e.deltaY*.0015);};this.onContext=e=>e.preventDefault();this.onWindowWheel=(e={})=>{if(!this.isCameraUI(e.target))this.releaseCameraPreset();this.cancelFollow();};
  this.onKeyDown=e=>{if(this.menu||this.inputPaused||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??''))return;const key=e.key.toLowerCase();if(['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();this.releaseCameraPreset();this.cancelFollow();this.keys.add(key);}};
  this.onKeyUp=e=>this.keys.delete(e.key.toLowerCase());this.onBlur=()=>{this.windowFocused=false;this.keys.clear();this.pointers.clear();this.onWindowLeave();};this.onFocus=()=>{this.windowFocused=true;};this.onVisibility=()=>{if(document.hidden)this.onBlur();};
  for(const [name,fn]of [['pointerdown',this.onDown],['pointermove',this.onMove],['pointerup',this.onUp],['pointercancel',this.onCancel],['contextmenu',this.onContext]])this.canvas.addEventListener(name,fn);
  this.canvas.addEventListener('wheel',this.onWheel,{passive:false});window.addEventListener('pointermove',this.onWindowMove,true);window.addEventListener('pointerout',this.onWindowOut);document.documentElement.addEventListener('mouseleave',this.onWindowLeave);window.addEventListener('wheel',this.onWindowWheel,{passive:true,capture:true});window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);window.addEventListener('blur',this.onBlur);window.addEventListener('focus',this.onFocus);document.addEventListener('visibilitychange',this.onVisibility);
 }
 panPixels(dx,dy){this.releaseCameraPreset();this.cancelFollow();const scale=26/(this.desiredZoom*Math.max(this.container.clientHeight,1)),right=new T.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw)),forward=new T.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));this.desiredTarget.addScaledVector(right,-dx*scale).addScaledVector(forward,dy*scale/Math.max(Math.sin(this.pitch),.4));this.boundTarget();}
 boundTarget(){
  if(this.state?.livingBoard&&!this.cameraPresetId){const limits=this.livingCameraLimits();this.desiredZoom=limits.zoom;const target=constrainLivingTarget(this.desiredTarget,limits,1.1);this.desiredTarget.x=target.x;this.desiredTarget.z=target.z;this.cameraBoundaryPending=true;return;}
  if(!this.state?.livingBoard){this.desiredTarget.x=clamp(this.desiredTarget.x,-8,WORLD.width+7);this.desiredTarget.z=clamp(this.desiredTarget.z,-8,WORLD.height+7);}
 }
 livingCameraLimits(){return livingCameraLimits({width:this.container.clientWidth||1,height:this.container.clientHeight||1,zoom:this.desiredZoom,yaw:this.desiredYaw,pitch:this.desiredPitch,bottomInset:Math.min(220,(this.container.clientHeight||1)*.32)});}
 settleLivingBounds(dt){
  if(!this.state?.livingBoard||this.cameraPresetId||!this.cameraBoundaryPending)return;
  const limits=this.livingCameraLimits(),target=constrainLivingTarget(this.desiredTarget,limits),smooth=1-Math.exp(-dt*12);this.desiredZoom=limits.zoom;
  this.desiredTarget.x+=(target.x-this.desiredTarget.x)*smooth;this.desiredTarget.z+=(target.z-this.desiredTarget.z)*smooth;
  if(Math.hypot(target.x-this.desiredTarget.x,target.z-this.desiredTarget.z)<.0001){this.desiredTarget.x=target.x;this.desiredTarget.z=target.z;this.cameraBoundaryPending=false;}
 }
 focusLivingZone(id,bounds,padding={}){
  if(!this.state?.livingBoard)return false;
  const viewport={width:this.container.clientWidth,height:this.container.clientHeight,yaw:0,pitch:.95,bottomInset:Math.min(220,this.container.clientHeight*.32)},fitted=fitLivingZone(bounds,viewport,padding);if(!fitted)return false;const frame=constrainPresetFrame(fitted,viewport);
  this.cancelFollow();this.keys.clear();this.cameraBoundaryPending=false;this.cameraPresetId=id;this.cameraPreset={id,bounds:{...bounds},padding:{...padding}};
  this.desiredTarget.set(frame.target.x,0,frame.target.z);this.desiredYaw=frame.yaw;this.desiredPitch=frame.pitch;this.desiredZoom=frame.zoom;this.onCameraPresetChange?.(id);return true;
 }
 releaseCameraPreset(){
  if(!this.cameraPresetId)return false;
  this.cameraPresetId=null;this.cameraPreset=null;this.cameraBoundaryPending=false;this.desiredTarget.copy(this.target);this.desiredYaw=this.yaw;this.desiredPitch=this.pitch;this.desiredZoom=this.zoom;this.keys.clear();this.onCameraPresetChange?.(null);return true;
 }
 focusAt(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return;this.releaseCameraPreset();this.cancelFollow();this.desiredTarget.set(x,0,z);this.boundTarget();}
 rotateCamera(delta){this.releaseCameraPreset();this.cancelFollow();this.desiredYaw+=delta;this.boundTarget();}
 tiltCamera(delta){this.releaseCameraPreset();this.cancelFollow();this.desiredPitch=clamp(this.desiredPitch+delta,.35,1.28);this.boundTarget();}
 setZoom(delta){this.releaseCameraPreset();this.cancelFollow();this.desiredZoom=clamp(this.desiredZoom*Math.exp(delta),.35,3.2);this.boundTarget();}
 resetCamera(){const b=this.menu?WORLD.center:WORLD.bases[this.p]??WORLD.center;this.focusAt(b.x,b.z);this.desiredZoom=this.menu?.62:1.55;this.desiredYaw=this.p===1?-Math.PI*.22:Math.PI*.22;this.desiredPitch=.82;}
 followUnit(id){if(this.state?.livingBoard){this.cancelFollow();return false;}const entity=this.entities.get('unit:'+id);if(!entity?.unit||!entity.moving){this.cancelFollow();return false;}this.followId=id;this.followHold=false;this.desiredTarget.set(entity.group.position.x,0,entity.group.position.z);this.boundTarget();return true;}
 cancelFollow(){this.followId=null;this.followHold=false;}
 get isFollowing(){return !!this.followId;}
 get followingUnitId(){return this.followId;}
 edgePan(){
  const mouse=this.windowPointer;if(this.menu||this.inputPaused||this.cameraPresetId||this.followId||this.followHold||!this.windowFocused||!mouse.inside||this.pointers.size||mouse.type!=='mouse'||document.hidden)return{x:0,y:0};
  const target=document.elementFromPoint(mouse.x,mouse.y)??mouse.target;if(this.isCameraUI(target))return{x:0,y:0};return edgePanVector(mouse.x,mouse.y,window.innerWidth,window.innerHeight);
 }
 updateNavigation(dt){
  if(this.menu||this.inputPaused||!this.windowFocused){this.keys.clear();if(this.inputPaused)this.cancelFollow();return;}
  if(this.cameraPresetId)return;
  const edge=this.edgePan(),right=new T.Vector3(Math.cos(this.yaw),0,-Math.sin(this.yaw)),forward=new T.Vector3(-Math.sin(this.yaw),0,-Math.cos(this.yaw));
  let x=edge.x,y=edge.y;if(this.keys.has('w')||this.keys.has('arrowup'))y++;if(this.keys.has('s')||this.keys.has('arrowdown'))y--;if(this.keys.has('d')||this.keys.has('arrowright'))x++;if(this.keys.has('a')||this.keys.has('arrowleft'))x--;const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}const speed=14/this.zoom*dt;this.desiredTarget.addScaledVector(right,x*speed).addScaledVector(forward,y*speed);if(this.keys.has('q'))this.desiredYaw+=dt;if(this.keys.has('e'))this.desiredYaw-=dt;if(x||y||this.keys.has('q')||this.keys.has('e'))this.boundTarget();
 }
 updateFollow(){
  if(!this.followId)return;const entity=this.entities.get('unit:'+this.followId);if(!entity||this.selected!==this.followId||this.menu||this.inputPaused){this.cancelFollow();return;}this.desiredTarget.set(entity.group.position.x,0,entity.group.position.z);this.boundTarget();if(!entity.moving){this.followId=null;this.followHold=true;}
 }
 canBuildAt(x,z){const s=this.state,b=BUILDINGS[this.build],base=WORLD.bases[this.p],tile=x>=0&&z>=0&&x<WORLD.width&&z<WORLD.height?this.tileAt(x,z):null;return !!b&&!!tile&&b.terrain.includes(tile.type)&&Math.hypot(x-base.x,z-base.z)<=3.6&&!s.buildings.some(v=>Math.hypot(v.x-x,v.z-z)<.9)&&!s.sources.some(v=>Math.hypot(v.x-x,v.z-z)<.9)&&!s.units.some(v=>v.hp>0&&Math.hypot(v.x-x,v.z-z)<.65);}
 getUnitPosition(id){const p=this.entities.get('unit:'+id)?.group.position;return p?{x:p.x,z:p.z}:null;}
 isUnitMoving(id){return !!this.entities.get('unit:'+id)?.moving;}
 setLivingPlacementPreview(preview){
  if(!this.state?.livingBoard)return;this.state.placementPreview=preview;
  renderLivingPlacementPreview(this,preview);
 }
 resetScene(){this.gameSeed=null;}
 get busyAnimating(){return[...this.entities.values()].some(e=>e.moving);}
 getArrivalState(id){const e=this.entities.get('living:'+id);if(!e)return null;const a=e.arrival;return a?{key:a.key,progress:a.progress,style:a.style,done:a.done,position:{x:e.group.position.x+(e.group.userData.miniature?.position.x??0),z:e.group.position.z+(e.group.userData.miniature?.position.z??0)}}:null;}
 projectWorldPoint(x,y,z){
  this.camera.updateMatrixWorld(true);const r=this.canvas.getBoundingClientRect(),point=new T.Vector3(x,y,z).project(this.camera);
  return{x:r.left+(point.x*.5+.5)*r.width,y:r.top+(-point.y*.5+.5)*r.height,depth:point.z,visible:point.z>=-1&&point.z<=1};
 }
 getLivingObjectScreenRect(type,id){
  const object=type==='location'?this.state?.locations?.find(o=>o.id===id):this.state?.livingObjects?.find(o=>o.id===id&&o.type===type);if(!object)return null;
  const radius=type==='city-area'?object.radius??8:type==='location'?1.7:1.25,base=this.heightAt(object.x,object.z),height=type==='location'?2:2.7,points=[];
  for(const x of [object.x-radius,object.x+radius])for(const y of [base,base+height])for(const z of [object.z-radius,object.z+radius])points.push(this.projectWorldPoint(x,y,z));
  if(!points.some(p=>p.visible))return null;
  const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
  return{left,right,top,bottom,width:right-left,height:bottom-top,x:(left+right)/2,y:(top+bottom)/2};
 }
 getCameraState(){return{target:{x:this.target.x,z:this.target.z},yaw:this.yaw,pitch:this.pitch,zoom:this.zoom};}
 updateCamera(dt){this.settleLivingBounds(dt);const smooth=1-Math.exp(-dt*10);this.target.lerp(this.desiredTarget,smooth);this.yaw+=shortest(this.yaw,this.desiredYaw)*smooth;this.pitch+=(this.desiredPitch-this.pitch)*smooth;this.zoom+=(this.desiredZoom-this.zoom)*smooth;
  const distance=42;this.camera.position.set(this.target.x+Math.sin(this.yaw)*Math.cos(this.pitch)*distance,Math.sin(this.pitch)*distance,this.target.z+Math.cos(this.yaw)*Math.cos(this.pitch)*distance);this.camera.lookAt(this.target);const h=13/this.zoom,w=h*(this.container.clientWidth/Math.max(this.container.clientHeight,1));this.camera.left=-w;this.camera.right=w;this.camera.top=h;this.camera.bottom=-h;this.camera.updateProjectionMatrix();
  this.sun.target.position.copy(this.target);this.sun.position.copy(this.target).add(new T.Vector3(-18,35,20));if(this.t-(this.lastCameraNotify??0)>.1){this.onCameraChange?.(this.getCameraState());this.lastCameraNotify=this.t;}}
 rebuildTerrain(s,p,menu){
  this.clear(this.terrain);this.clear(this.detail);const palette=s.livingBoard?seasonVisuals(s.season):PALETTE;this.scene.background.setHex(palette.mist);this.scene.fog.color.setHex(palette.mist);const w=WORLD.width,h=WORLD.height,margin=24,nx=w+margin*2,nz=h+margin*2,verts=[],colors=[],indices=[],fog=new T.Color(palette.mist);
  const tile=(x,z)=>x>=0&&z>=0&&x<w&&z<h?s.tiles[z*w+x]:null;
  // The mist continues well beyond the playable boundary: no board edge or rectangular cutout
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
   const x=ix-margin,z=iz-margin,px=x-.5,pz=z-.5,c=new T.Color(0);let coverage=0,totalWeight=0,knownWeight=0;
   for(let dz=-2;dz<=1;dz++)for(let dx=-2;dx<=1;dx++){const t=tile(x+dx,z+dz),weight=1/(1+(dx+.5)**2+(dz+.5)**2),seen=!!t&&(menu||known(s,p,t));totalWeight+=weight;if(!seen)continue;coverage+=weight;knownWeight+=weight;const col=new T.Color(palette[t.type]??palette.plain).multiplyScalar((.97+noise(t.x,t.z)*.045)*weight);c.add(col);}
   coverage/=totalWeight;const fade=clamp((coverage-.03)/.91,0,1),alpha=fade*fade*(3-2*fade);if(knownWeight)c.multiplyScalar(1/knownWeight);else c.copy(fog);c.lerp(fog,1-alpha);const y=this.heightAt(px,pz)*alpha+.04*(1-alpha);verts.push(px,y,pz);colors.push(c.r,c.g,c.b);
   if(ix<nx&&iz<nz){const a=iz*(nx+1)+ix,b=a+1,d=(iz+1)*(nx+1)+ix,c1=d+1;if((ix+iz)%2)indices.push(a,d,b,b,d,c1);else indices.push(a,d,c1,a,c1,b);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();const terrain=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:false}));terrain.receiveShadow=true;this.terrain.add(terrain);
  const backdrop=this.mesh(this.terrain,new T.PlaneGeometry(500,500),this.material(palette.mist),(w-1)/2,-.4,(h-1)/2);backdrop.rotation.x=-Math.PI/2;backdrop.castShadow=false;
  // River highlights are continuous, translucent ribbons rather than tiled water blocks
  const waterPositions=[],waterColors=[];for(const t of s.tiles){if(t.type!=='water'||(!menu&&!known(s,p,t)))continue;const x=t.x,z=t.z,sh=.51;for(const v of [[x-sh,z-sh],[x+sh,z-sh],[x+sh,z+sh],[x-sh,z-sh],[x+sh,z+sh],[x-sh,z+sh]]){waterPositions.push(v[0],-.005,v[1]);const n=noise(v[0],v[1]);waterColors.push(.34+n*.05,.59+n*.07,.58+n*.08);}}
  if(waterPositions.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(waterPositions,3));g.setAttribute('color',new T.Float32BufferAttribute(waterColors,3));g.computeVertexNormals();this.waterMaterial=new T.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.82,roughness:.25,metalness:.08,side:T.DoubleSide});const water=new T.Mesh(g,this.waterMaterial);this.terrain.add(water);}
  addWoodlandTerrain(this,s,p,menu,known);if(s.livingBoard)addSeasonGroundDetails(this,s);
  this.staticBuilds=(this.staticBuilds??0)+1;
 }
 instances(group,geometry,material,items,transform){if(!items.length){geometry.dispose();material.dispose();return;}const mesh=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D();for(let i=0;i<items.length;i++){const v=transform(items[i]);dummy.position.set(...v.position);dummy.rotation.set(...(v.rotation??[0,0,0]));dummy.scale.set(...(v.scale??[1,1,1]));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 flag(g,x,y,z,owner,scale=1){this.cylinder(g,x,y+.42*scale,z,.022,.95*scale,WOOD,6);const geometry=new T.PlaneGeometry(.55*scale,.32*scale,8,2);geometry.translate(.55*scale/2,0,0);const flag=this.mesh(g,geometry,this.material(TEAM[owner]??TEAM[2],{side:T.DoubleSide}),x,y+.68*scale,z);flag.userData.wave={original:geometry.attributes.position.array.slice(),phase:noise(x,y)*6};return flag;}
 doorway(g,x,y,z,w=.32,h=.6){this.box(g,x,y+h*.38,z,w,h*.76,.035,0x4a5045);const arch=this.cylinder(g,x,y+h*.76,z,w/2,.04,0x4a5045,12);arch.rotation.x=Math.PI/2;}
 castle(b,level=1){return b.kind==='point'?ancientTree(this,b):woodlandCottage(this,b,true);}
 building(b,active,s){return woodlandCottage(this,b,active);}
 horseModel(){const g=new T.Group(),coat=0x8c7056;this.sphere(g,0,.67,0,.3,coat,.85,.9,1.6);this.sphere(g,0,.95,-.37,.22,coat,.7,1.7,.75);this.sphere(g,0,1.16,-.46,.18,coat,.75,.8,1.2);for(const x of [-.16,.16])for(const z of [-.30,.27]){const leg=this.cylinder(g,x,.34,z,.05,.55,0x665641,7);leg.userData.limb={phase:z<0?0:Math.PI,amplitude:.35};this.sphere(g,x,.065,z,.065,0x4c493b,1,.6,1.3);}this.box(g,0,.91,.05,.4,.12,.42,0x4e5345);this.beam(g,new T.Vector3(0,.75,.37),new T.Vector3(0,.32,.63),.045,0x494b3b);return g;}
 shield(g,x,y,z,color){const shape=new T.Shape();shape.moveTo(-.20,.25);shape.lineTo(.20,.25);shape.lineTo(.18,-.10);shape.lineTo(0,-.30);shape.lineTo(-.18,-.10);shape.closePath();const mesh=this.mesh(g,new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),color,x,y,z);this.box(g,x,y+.05,z+.065,.055,.42,.02,0xd1bd83);return mesh;}
 figure(kind,owner,phase=0,portrait=null){return woodlandFigure(this,kind,owner,phase,portrait);}
 unit(u){const g=new T.Group(),n=Math.min(u.kind==='horse'?2:3,count(u)),positions=n===1?[[0,0]]:n===2?[[-.25,.1],[.25,-.1]]:[[-.30,.20],[.30,.20],[0,-.25]];for(let i=0;i<n;i++){const figure=this.figure(u.kind,u.owner,i*1.4,u.portrait);figure.position.set(positions[i][0],0,positions[i][1]);figure.scale.multiplyScalar(u.kind==='horse'?.84:.90);g.add(figure);}if(u.kind!=='worker')this.flag(g,-.58,.65,.26,u.owner,.60);this.tagged(g,{type:'unit',id:u.id});g.updateMatrixWorld(true);g.userData.hitBounds=new T.Box3().setFromObject(g);return g;}
 source(m){return woodlandSource(this,m);}
 placementLocation(location){return woodlandLocation(this,location);}
 renderPlacementLocations(state){
  const resourceNames={wood:'древесины',stone:'камня',food:'еды',twig:'веток',resin:'смолы',pebble:'камушков',berry:'ягод'};
  const journeys=(state.locations??[]).filter(l=>(l.actualName??l.id).includes('JOURNEY'));
  if(journeys.length&&(!this.journeyBoard||!this.journeyBoard.isConnected)){
   this.journeyBoard=document.createElement('section');this.journeyBoard.className='journey-board';this.journeyBoard.setAttribute('aria-label','Путешествие');
   this.journeyBoard.innerHTML='<header><b>Путешествие</b><span>Только осенью</span></header><div class="journey-stops"></div>';
   this.labelLayer.appendChild(this.journeyBoard);
  }
  if(this.journeyBoard){this.journeyBoard.hidden=!journeys.length;this.journeyBoard.dataset.active=String(journeys.some(l=>l.available));}
  const reward=(key,value)=>`<span class="location-reward-item"><b>${value}</b>${resourceIcon(key)}</span>`;
  const paw='<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="21" rx="8" ry="7"/><ellipse cx="7" cy="12" rx="3.4" ry="4.2" transform="rotate(-25 7 12)"/><ellipse cx="14" cy="7" rx="3.4" ry="4.2"/><ellipse cx="23" cy="10" rx="3.4" ry="4.2" transform="rotate(25 23 10)"/></svg>';
  for(const location of state.locations??[]){
   const id=location.actualName??location.id,journey=id.includes('JOURNEY'),workers=location.workers??[],owner=location.owner,full=location.capacity!==null&&workers.length>=location.capacity;
   this.syncEntity('location:'+location.id,`${owner}:${workers.join(',')}`,()=>this.placementLocation(location));
   const gains=location.rewardIcons??Object.fromEntries(Object.entries(location.reward??{}).map(([key,value])=>[({wood:'TWIG',stone:'PEBBLE',food:'BERRY'})[key]??key.toUpperCase(),value]));
   if(!location.rewardIcons){if(id.includes('CARD'))gains.CARD=id.startsWith('TWO_CARDS')?2:id==='ONE_PEBBLE_THREE_CARD'?3:1;if(id==='TWO_CARDS_AND_ONE_VP')gains.VP=1;}
   let gain=Object.entries(gains).filter(([,n])=>n>0).map(([key,n])=>reward(key,n)).join('');
   if(!gain){
    if(id==='HAVEN')gain=reward('CARD',2)+'<span class="location-arrow">→</span>'+reward('ANY',1);
    else if(id==='TWO_WILD')gain=reward('ANY',2);
    else if(id==='TWO_CARDS_ONE_WILD')gain=reward('CARD',2)+reward('ANY',1);
    else if(id==='COPY_BASIC_ONE_CARD')gain=reward('CARD',1)+'<span class="location-reward-note">+ копия места</span>';
    else if(id==='DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS')gain=reward('CARD',2)+'<span class="location-reward-note">· скидка 1</span>'+resourceIcon('ANY');
    else if(id==='DISCARD_ANY_THEN_DRAW_TWO_PER_CARD')gain='<span class="location-reward-note">Сброс → ×2 карты</span>';
    else if(id==='DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD')gain='<span class="location-reward-note">До 3 карт → ресурсы</span>';
    else gain='<span class="location-reward-note">Особый эффект</span>';
   }
   if(id==='COPY_BASIC_ONE_CARD'&&Object.keys(gains).length)gain+='<span class="location-reward-note">+ копия</span>';
   const free=location.capacity===null,capacity=full?'Занято':free?'Общее место':`Место ${workers.length}/${location.capacity}`;
   let html,cls;
   if(journey){const number=Number(location.name.match(/\d+/)?.[0]??({JOURNEY_TWO:2,JOURNEY_THREE:3,JOURNEY_FOUR:4,JOURNEY_FIVE:5})[id]??2);html=`<span class="journey-stop-paw">${paw}<b>${number}</b></span><span class="journey-exchange">${number} ${resourceIcon('CARD')}<i>→</i>${number} ${resourceIcon('VP')}</span><span class="location-capacity">${full?'Занято':free?'Общее место':'1 место'}</span>`;cls='placement-label journey-stop';}
   else {html=`<span class="location-heading"><span class="location-paw">${paw}</span><b>${escapeLabel(location.name)}</b></span><span class="location-rewards">${gain}</span><span class="location-capacity">${capacity}</span>`;cls='placement-label location-plaque'+(location.locationType==='FOREST'?' forest-location':'')+(id==='HAVEN'?' haven-location':'');}
   const label=this.addLabel('location:'+location.id,location.x,location.z,html,cls+(full?' occupied':'')+(owner!==null?' private-location':''),()=>this.onPick({type:'location',id:location.id}),.45);
   label.journey=journey;label.location=true;label.el.dataset.occupied=String(full);label.el.dataset.available=String(location.available!==false);
   if(journey){label.el.style.transform='';label.el.style.visibility='visible';this.journeyBoard.querySelector('.journey-stops').appendChild(label.el);label.el.style.order=String(Number(location.name.match(/\d+/)?.[0]??2));}
   label.el.title=[location.name,location.description,owner!==null?`Только для игрока ${owner+1}`:'',full?'Место занято':free?'Общая локация':`Свободно мест: ${location.capacity-workers.length}`].filter(Boolean).join(' — ');
   label.el.setAttribute('aria-label',label.el.title);label.width=label.el.offsetWidth||150;label.height=label.el.offsetHeight||82;
  }
 }
 updateMapLabels(){
  if(this.state?.livingBoard){updateLivingLabels(this);return;}
  const w=this.container.clientWidth,h=this.container.clientHeight,placed=[],bounds=this.container.getBoundingClientRect();
  const rect=(x,y,width,height)=>({left:x-width/2,right:x+width/2,top:y-height,bottom:y});
  const overlaps=(a,b,gap=6)=>a.right>b.left-gap&&a.left<b.right+gap&&a.bottom>b.top-gap&&a.top<b.bottom+gap;
  for(const el of this.container.parentElement?.querySelectorAll('.round-info,.round-actions,.portrait-dock,.minimap-panel')??[]){const r=el.getBoundingClientRect();placed.push({left:r.left-bounds.left,right:r.right-bounds.left,top:r.top-bounds.top,bottom:r.bottom-bounds.top});}
  const journeys=this.labels.filter(l=>l.journey);
  if(this.journeyBoard&&journeys.length){
   const anchor=journeys.reduce((sum,l)=>sum.add(l.pos),new T.Vector3()).multiplyScalar(1/journeys.length);anchor.y=this.heightAt(anchor.x,anchor.z)+.45;const point=anchor.project(this.camera),x=(point.x*.5+.5)*w,y=(-point.y*.5+.5)*h,shown=point.z>-1&&point.z<1&&x>-100&&x<w+100&&y>-50&&y<h+100;
   const bw=this.journeyBoard.offsetWidth||470,bh=this.journeyBoard.offsetHeight||122,xx=clamp(x,bw/2+12,w-bw/2-12),yy=clamp(y,145+bh,h-124);
   this.journeyBoard.style.transform=`translate(${xx}px,${yy}px) translate(-50%,-100%)`;this.journeyBoard.style.visibility=shown?'visible':'hidden';if(shown)placed.push(rect(xx,yy,bw,bh));
  }
  for(const label of this.labels){
   if(label.journey)continue;
   const world=label.entity?label.entity.group.position.clone().add(new T.Vector3(0,label.pos.y,0)):label.pos.clone();if(!label.entity)world.y+=this.heightAt(world.x,world.z);const point=world.project(this.camera),anchorX=(point.x*.5+.5)*w,anchorY=(-point.y*.5+.5)*h;
   const shown=point.z>-1&&point.z<1&&anchorX>-80&&anchorX<w+80&&anchorY>0&&anchorY<h+30&&(!label.hoverOnly||label.entity?.unit?.id===this.hoveredUnitId);let x=anchorX,y=anchorY;
   if(shown){const ww=label.el.offsetWidth||label.width,hh=label.el.offsetHeight||label.height;
    if(label.location){
     const best=placeMapLabel(anchorX,anchorY,ww,hh,placed,w,h);
     if(best){x=best.x;y=best.y;placed.push(best.r);}else{x=clamp(anchorX,ww/2+10,w-ww/2-10);y=clamp(anchorY-18,hh+10,h-10);placed.push(rect(x,y,ww,hh));}
     const lineX=clamp(anchorX,x-ww/2,x+ww/2),lineY=clamp(anchorY,y-hh,y),dx=anchorX-lineX,dy=anchorY-lineY;
     label.el.style.setProperty('--leader-opacity',Math.hypot(dx,dy)>6?'1':'0');label.el.style.setProperty('--leader-start-x',`${lineX-x}px`);label.el.style.setProperty('--leader-start-y',`${lineY-y}px`);label.el.style.setProperty('--leader-x',`${anchorX-x}px`);label.el.style.setProperty('--leader-y',`${anchorY-y}px`);label.el.style.setProperty('--leader-length',`${Math.hypot(dx,dy)}px`);label.el.style.setProperty('--leader-angle',`${Math.atan2(dy,dx)}rad`);
    }else{for(let attempt=0;attempt<10;attempt++){const hit=placed.find(r=>overlaps(rect(x,y,ww,hh),r,3));if(!hit)break;y=hit.top-5;}placed.push(rect(x,y,ww,hh));}
   }
   label.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;label.el.style.visibility=shown?'visible':'hidden';
  }
 }

 addLabel(key,x,z,html,cls='',onClick,height=1.4,entity=null){let label=this.labelMap?.get(key);if(!label){const el=document.createElement('button');el.className='world-label '+cls;el.style.pointerEvents='auto';el.style.visibility='hidden';el.type='button';el.onclick=e=>{e.stopPropagation();onClick?.();};this.labelLayer.appendChild(el);label={el,pos:new T.Vector3(x,height,z),entity};this.labelMap??=new Map();this.labelMap.set(key,label);}label.el.innerHTML=html;label.el.className='world-label '+cls;label.el.dataset.mapKind=key.split(':')[0];label.el.dataset.mapId=key.split(':').slice(1).join(':');label.el.title=label.el.textContent;label.hoverOnly=key.startsWith('unit:');if(label.hoverOnly){label.el.style.background='#1d343c';label.el.style.opacity='1';label.el.style.backdropFilter='none';label.el.removeAttribute('title');}if(this.state?.sandbox&&key.startsWith('unit:')){const u=this.state.units.find(v=>v.id===key.slice(5));if(u){label.el.setAttribute('aria-label',u.name);label.el.removeAttribute('title');}}label.pos.set(x,height,z);label.entity=entity;label.seen=true;label.width=label.el.offsetWidth||70;label.height=label.el.offsetHeight||22;return label;}
 syncEntity(key,signature,build,target=null){let entity=this.entities.get(key);if(!entity||entity.signature!==signature){const previous=entity?.group.position.clone(),previousMoveSerial=entity?.moveSerial;if(entity)this.disposeObject(entity.group);const group=build();this.actors.add(group);entity={signature,group,from:null,to:null,moving:false,elapsed:0,duration:0,moveSerial:previousMoveSerial,startedMove:false};if(target){group.position.set(target.x,this.heightAt(target.x,target.z)+(target.seatHeight??0),target.z);if(previous){group.position.copy(previous);entity.from=previous;entity.to=new T.Vector3(target.x,this.heightAt(target.x,target.z)+(target.seatHeight??0),target.z);entity.duration=.6;entity.moving=previous.distanceTo(entity.to)>.08;entity.startedMove=entity.moving;}}this.entities.set(key,entity);}
  if(target){const dest=new T.Vector3(target.x,this.heightAt(target.x,target.z)+(target.seatHeight??0),target.z);if(this.state?.livingBoard&&key.startsWith('unit:')&&entity.unit&&!target.locationId&&!entity.unit.locationId){entity.seen=true;return entity;}const oldDest=entity.to??entity.group.position;if(oldDest.distanceTo(dest)>.08){entity.from=entity.group.position.clone();entity.to=dest;entity.elapsed=0;entity.duration=this.state?.livingBoard?clamp(entity.from.distanceTo(dest)*.17,.65,9):clamp(entity.from.distanceTo(dest)*.15,.45,1.15);entity.moving=true;entity.path=null;entity.startedMove=true;const diff=dest.clone().sub(entity.from);entity.facing=Math.atan2(-diff.x,-diff.z);this.spawnDust(entity.from);}}
  entity.seen=true;return entity;
 }
 spawnDust(pos){const puff=this.sphere(this.effectLayer,pos.x,.12,pos.z,.13,0xd7c89d,1,.55,1);puff.material.transparent=true;puff.material.opacity=.32;puff.material.depthWrite=false;this.effects.push({mesh:puff,start:this.t,duration:.65,type:'dust'});}
 battleEffect(b){const pos=b.target??b.position??(Number.isFinite(b.x)?b:WORLD.center);const ring=this.ring(.25,.43,b.win?0xe6c078:0xd09876,.85);ring.position.set(pos.x,this.heightAt(pos.x,pos.z)+.15,pos.z);this.effectLayer.add(ring);this.effects.push({mesh:ring,start:this.t,duration:1,type:'battle'});for(let i=0;i<8;i++){const p=this.sphere(this.effectLayer,pos.x,.45,pos.z,.045,i%2?0xe6c68a:0xb2b69c);this.effects.push({mesh:p,start:this.t,duration:.7,type:'spark',angle:i/8*Math.PI*2});}}
 render(s,p,{selected=null,menu=false,build=null}={}){
  const placement=s.mode==='placement',roundChanged=placement&&this.state&&this.state.round!==s.round,enteringGame=this.menu&&!menu,newWorld=this.gameSeed!==s.seed,changedPlayer=this.lastViewer!==p;this.state=s;this.p=p;this.menu=menu;this.selected=selected;this.build=build;
  if(newWorld){this.completedLivingArrivals=new Set();for(const entity of this.entities.values())this.disposeObject(entity.group);this.entities.clear();this.labelLayer.innerHTML='';this.labelMap=new Map();this.staticKey='';this.lastBattleKey=null;this.gameSeed=s.seed;this.releaseCameraPreset();this.cancelFollow();this.setHoveredUnit(null);}
  if((newWorld||enteringGame||changedPlayer&&!placement)&&!s.livingBoard){this.resetCamera();if(newWorld){this.target.copy(this.desiredTarget);this.zoom=this.desiredZoom;this.yaw=this.desiredYaw;this.pitch=this.desiredPitch;}this.lastViewer=p;}
  if(s.livingBoard)this.lastViewer=p;
  const explored=menu?'all':s.players[p].explored.reduce((a,b,i)=>b?(a+i*13+1)%2147483647:a,0),staticKey=`${s.seed}:${s.livingBoard?s.season:''}:${s.livingBoard?'all':p}:${menu}:${explored}:${s.buildings.length}:${placement?s.locations?.map(l=>l.id).join(','):''}`;if(this.staticKey!==staticKey){this.rebuildTerrain(s,p,menu);this.staticKey=staticKey;}
  for(const entity of this.entities.values())entity.seen=false;for(const label of this.labelMap?.values()??[])label.seen=false;
  if(s.livingBoard&&!menu)renderLivingBoard(this,s);else if(placement&&!menu)this.renderPlacementLocations(s);
  for(const m of s.sources){if(!menu&&!known(s,p,m))continue;this.syncEntity('source:'+m.id,`${m.owner}:${m.workers?.length}`,()=>this.source(m));if(!menu)this.addLabel('source:'+m.id,m.x,m.z,`<span class="source-symbol">${{gold:'◈',wood:'♣',stone:'◆'}[m.resource]}</span><span class="source-label-name">${{gold:'Золотая жила',wood:'Лесная делянка',stone:'Каменоломня'}[m.resource]}</span><span>${m.workers?.length??0}/${m.slots}</span>`,m.owner===p?'owned':'',()=>this.onPick({type:'source',id:m.id}),.98);}
  for(const b of s.buildings){if(!menu&&b.owner!==p&&!visible(s,p,b))continue;const level=s.players[b.owner]?.level??1;this.syncEntity('building:'+b.id,`${b.kind}:${b.owner}:${b.ready<=s.round}:${level}`,()=>this.building(b,b.ready<=s.round,s));}
  if(!s.sandbox&&!s.livingBoard){const point={id:'point',kind:'point',owner:s.point.owner??2,...WORLD.center};this.syncEntity('point:point',String(point.owner),()=>{const group=this.castle(point,2);group.scale.setScalar(1.06);return group;});if(!menu)this.addLabel('point:point',point.x,point.z,`<span>✧</span><span>${s.point.owner===null?'Крепость Пограничья':`${s.point.progress}/${WORLD.hold} · ${FACTIONS[s.point.owner].short}`}</span>`,'point-label',()=>this.onPick({type:'point'}),4.05);}
  for(let player=0;!s.livingBoard&&player<s.players.length;player++){const base=WORLD.bases[player];if(!base||(!menu&&player!==p&&!visible(s,p,base)))continue;const free=Math.max(0,s.players[player].workers-s.sources.filter(m=>m.owner===player).reduce((n,m)=>n+(m.workers?.length??0),0)-s.units.filter(u=>u.owner===player&&u.kind==='worker').reduce((n,u)=>n+count(u),0));if(free)this.syncEntity('citizens:'+player,String(free),()=>{const group=new T.Group();group.position.set(base.x,this.heightAt(base.x,base.z),base.z);for(let i=0;i<Math.min(3,free);i++){const citizen=this.figure('worker',player,i*1.6);citizen.position.set(-1.15+i*.46,0,1.35+(i%2)*.2);citizen.scale.setScalar(.66);citizen.userData.working={phase:i*2.3};group.add(citizen);}this.tagged(group,{type:'building',id:'castle'+player});return group;});}
  for(const u of s.units){if(s.livingBoard&&u.hiddenAtLocation)continue;if(!placement&&!menu&&u.owner!==p&&!visible(s,p,u))continue;const entity=this.syncEntity('unit:'+u.id,`${u.owner}:${u.kind}:${count(u)}:${u.portrait??''}`,()=>this.unit(u),u);entity.unit=u;entity.group.userData.unitId=u.id;if(roundChanged&&!s.livingBoard){entity.group.position.set(u.x,this.heightAt(u.x,u.z),u.z);entity.moving=false;entity.from=null;entity.to=null;entity.path=null;entity.startedMove=false;}const move=s.lastMove;if(entity.startedMove&&move?.id===u.id&&move.serial!==entity.moveSerial&&move.path?.length>1){const end=move.path.at(-1);if(Math.hypot(end.x-u.x,end.z-u.z)<.2){entity.path=[entity.from.clone(),...move.path.slice(1).map(v=>new T.Vector3(v.x,this.heightAt(v.x,v.z)+(v===move.path.at(-1)?u.seatHeight??0:0),v.z))];entity.pathLengths=[0];for(let i=1;i<entity.path.length;i++)entity.pathLengths.push(entity.pathLengths.at(-1)+entity.path[i].distanceTo(entity.path[i-1]));entity.duration=s.livingBoard?clamp(entity.pathLengths.at(-1)*.17,.8,9):s.sandbox?clamp(entity.pathLengths.at(-1)*.28,.5,14):clamp(entity.pathLengths.at(-1)*.18,.5,1.6);entity.moveSerial=move.serial;}}entity.startedMove=false;if(!menu&&!s.livingBoard){const team=u.owner===2?'neutral':u.owner===p?'friendly':'enemy',kind=TROOPS[u.kind]??{};this.addLabel('unit:'+u.id,u.x,u.z,`<span>${kind.icon??'♟'}</span><b>${s.sandbox?(u.name??TROOPS[u.kind]?.name??'Рабочий'):(u.owner===p?(kind.short??u.kind)+' · ':'')+count(u)}</b>${u.attacked===s.round?'<i>✓</i>':''}`,team+(u.id===selected?' selected':''),()=>this.onPick({type:'unit',id:u.id}),u.kind==='horse'?2.05:u.kind==='worker'?1.35:1.65,entity);}}
  for(const [key,entity]of this.entities)if(!entity.seen){this.disposeObject(entity.group);this.entities.delete(key);}for(const [key,label]of this.labelMap??[])if(!label.seen){label.el.remove();this.labelMap.delete(key);}
  this.labels=[...(this.labelMap?.values()??[])].sort((a,b)=>{const priority=l=>l.el.classList.contains('city-label')||l.el.classList.contains('point-label')?0:l.el.classList.contains('selected')?1:l.el.classList.contains('friendly')?2:3;return priority(a)-priority(b);});this.flags=[];this.smoke=[];this.actors.traverse(o=>{if(o.userData.wave)this.flags.push(o);if(o.userData.smoke)this.smoke.push(o);});
  const unit=s.units.find(u=>u.id===selected),entity=unit?this.entities.get('unit:'+unit.id):null;this.selection.visible=!!entity&&!menu;this.reach.visible=!!entity&&unit.owner===p&&!menu&&!build&&!s.sandbox&&!s.livingBoard;if(entity){this.selection.position.copy(entity.group.position);this.selection.position.y+=.1;this.reach.position.copy(this.selection.position);this.reach.scale.setScalar(moveRange(s,unit));}
  this.buildBoundary.visible=!!build&&!menu;if(build){const b=WORLD.bases[p];this.buildBoundary.position.set(b.x,this.heightAt(b.x,b.z)+.16,b.z);}
  const hintsKey=`${build}:${menu}:${s.serial}`;if(this.buildHintsKey!==hintsKey){this.clear(this.buildHints);this.buildHintsKey=hintsKey;if(build&&!menu){for(const tile of s.tiles){if(!this.canBuildAt(tile.x,tile.z))continue;const disc=new T.Mesh(new T.CircleGeometry(.37,28),new T.MeshBasicMaterial({color:0xf4d79c,transparent:true,opacity:.30,depthTest:false,depthWrite:false,side:T.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.set(tile.x,this.heightAt(tile.x,tile.z)+.13,tile.z);disc.renderOrder=7;this.buildHints.add(disc);const edge=this.ring(.32,.37,0xffdfa2,.74);edge.position.copy(disc.position);edge.renderOrder=8;this.buildHints.add(edge);}}}
  if(s.lastBattle){const key=JSON.stringify(s.lastBattle);if(!newWorld&&this.lastBattleKey!==key)this.battleEffect(s.lastBattle);this.lastBattleKey=key;}
 }
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);if(this.cameraPreset){const p=this.cameraPreset;this.focusLivingZone(p.id,p.bounds,p.padding);}else if(this.state?.livingBoard)this.boundTarget();this.updateCamera(1);}
 animate(){this.frame=requestAnimationFrame(()=>this.animate());const now=performance.now(),dt=clamp((now-this.lastTime)/1000,.001,.06);this.lastTime=now;this.t+=dt;
  this.updateNavigation(dt);animateWoodland(this);
  for(const entity of this.entities.values()){if(entity.moving&&entity.from&&entity.to){entity.elapsed+=dt;const t=clamp(entity.elapsed/entity.duration,0,1),f=t*t*(3-2*t);if(entity.path?.length>1){const d=f*entity.pathLengths.at(-1);let i=1;while(i<entity.path.length-1&&entity.pathLengths[i]<d)i++;const a=entity.path[i-1],b=entity.path[i],segment=Math.max(.001,entity.pathLengths[i]-entity.pathLengths[i-1]);entity.group.position.lerpVectors(a,b,clamp((d-entity.pathLengths[i-1])/segment,0,1));entity.facing=Math.atan2(-(b.x-a.x),-(b.z-a.z));}else entity.group.position.lerpVectors(entity.from,entity.to,f);if(entity.facing!==undefined)entity.group.rotation.y+=shortest(entity.group.rotation.y,entity.facing)*(1-Math.exp(-dt*10));if(t>=1){entity.moving=false;entity.from=null;}}
   if(entity.unit){const moving=entity.moving;entity.group.traverse(o=>{if(o.userData.limb){const limb=o.userData.limb;o.rotation.x=moving?Math.sin(this.t*12+limb.phase)*limb.amplitude:Math.sin(this.t*1.5+limb.phase)*.025;}if(o.userData.cape)o.rotation.x=o.userData.cape.base+Math.sin(this.t*2.8+o.userData.cape.phase)*.08;});if(!moving)entity.group.position.y=this.heightAt(entity.unit.x,entity.unit.z)+(entity.unit.seatHeight??0)+Math.sin(this.t*1.7+entity.unit.x)*.012;}
   else entity.group.traverse(o=>{if(o.userData.working){o.rotation.y=Math.sin(this.t*.7+o.userData.working.phase)*.22;o.traverse(part=>{if(part.userData.limb)part.rotation.x=Math.sin(this.t*2.7+part.userData.limb.phase)*.20;});}});
  }
  if(this.state?.livingBoard)animateLivingBoard(this,dt);
  this.updateFollow();this.updateCamera(dt);if(this.state?.livingBoard)refreshLivingHover(this);else this.refreshUnitHover();
  if(this.state?.sandbox){const u=this.state.units.find(v=>v.id===this.selected);this.destination.visible=!!u&&this.isUnitMoving(u.id);if(u)this.destination.position.set(u.x,this.heightAt(u.x,u.z)+.15,u.z);}
  for(const flag of this.flags){const pos=flag.geometry.attributes.position,a=flag.userData.wave.original;for(let i=0;i<pos.count;i++){const x=a[i*3];pos.setZ(i,a[i*3+2]+Math.sin(this.t*3.1+x*8+flag.userData.wave.phase)*.055*x);}pos.needsUpdate=true;}
  for(const smoke of this.smoke){const s=smoke.userData.smoke,phase=(this.t*.24+s.phase)%1;smoke.position.copy(s.base).add(new T.Vector3(Math.sin(this.t+s.phase)*.12,phase*.8,phase*.22));smoke.material.opacity=(1-phase)*.17;smoke.scale.setScalar(.65+phase);}
  if(this.waterMaterial){this.waterMaterial.opacity=.68+Math.sin(this.t*1.4)*.035;this.waterMaterial.roughness=.24+Math.sin(this.t*.8)*.08;}
  if(this.selection.visible){const entity=this.entities.get('unit:'+this.selected);if(entity){this.selection.position.copy(entity.group.position);this.selection.position.y+=.12;this.reach.position.copy(this.selection.position);}this.selection.material.opacity=.65+Math.sin(this.t*3)*.15;}
  for(const fx of [...this.effects]){const age=(this.t-fx.start)/fx.duration;if(age>=1){this.disposeObject(fx.mesh);this.effects.splice(this.effects.indexOf(fx),1);continue;}fx.mesh.material.opacity=(1-age)*(fx.type==='battle'?.85:.38);if(fx.type==='spark'){fx.mesh.position.x+=Math.cos(fx.angle)*dt*1.9;fx.mesh.position.z+=Math.sin(fx.angle)*dt*1.9;fx.mesh.position.y+=dt*(.8-age*2);}else fx.mesh.scale.setScalar(1+age*(fx.type==='battle'?4:2));}
  this.updateMapLabels();
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();for(const [name,fn]of [['pointerdown',this.onDown],['pointermove',this.onMove],['pointerup',this.onUp],['pointercancel',this.onCancel],['contextmenu',this.onContext]])this.canvas.removeEventListener(name,fn);this.canvas.removeEventListener('wheel',this.onWheel);window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);window.removeEventListener('focus',this.onFocus);window.removeEventListener('pointermove',this.onWindowMove,true);window.removeEventListener('pointerout',this.onWindowOut);window.removeEventListener('wheel',this.onWindowWheel,true);document.documentElement.removeEventListener('mouseleave',this.onWindowLeave);document.removeEventListener('visibilitychange',this.onVisibility);for(const group of [this.terrain,this.detail,this.actors,this.markers,this.effectLayer])this.clear(group);this.renderer.dispose();this.container.innerHTML='';}
}
