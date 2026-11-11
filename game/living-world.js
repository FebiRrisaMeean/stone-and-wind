import * as T from '../vendor/three.module.js';
import {createCardMiniature,animateCardMiniature} from './living-models.js?v=20261111-20';
import {woodlandCottage,ancientTree} from './woodland-world.js?v=20261111-20';
import {resourceIcon} from './everdell/art.js?v=20261111-19';

const team=[0x719bb6,0xd7a073,0x97b485,0xb99ac7];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967295;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const shortest=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
function sphere(view,g,x,y,z,r,color,sx=1,sy=1,sz=1){const m=view.mesh(g,new T.SphereGeometry(r,10,7),color,x,y,z);m.scale.set(sx,sy,sz);return m;}
function disc(view,g,x,y,z,r,color,opacity=1){const m=view.mesh(g,new T.CircleGeometry(r,40),view.material(color,{transparent:opacity<1,opacity,side:T.DoubleSide,depthWrite:opacity===1}),x,y,z);m.rotation.x=-Math.PI/2;m.castShadow=false;return m;}
function foundation(view,g,item){const r=item.type==='market'?.85:.93,c=team[item.owner]??0xbeb08c;view.cylinder(g,0,.07,0,r,.08,0xbaa777,30);disc(view,g,0,.115,0,r-.08,0xd9c99e);const edge=view.ring(r-.045,r+.02,c,.68);edge.position.y=.125;g.add(edge);return g;}
function camp(view,g,item){
 const r=item.radius??8,color=team[item.owner]??team[0];
 const ground=disc(view,g,0,.015,0,r,0xc5bc8c,.12);ground.scale.z=.9;
 const boundary=view.ring(r-.05,r+.025,color,.4);boundary.position.y=.08;boundary.scale.z=.9;g.add(boundary);
 // Broken stones and flower beds make the city clearing tangible without a forced grid
 for(let i=0;i<26;i++){const a=i*Math.PI*2/26,x=Math.sin(a)*r,z=Math.cos(a)*r*.9;if(z<-r*.6)continue;const stone=sphere(view,g,x,.11,z,.15,i%3?0xb4b69b:0xe3cf9e,1.35,.42,.85);stone.rotation.y=a;}
 const hut=woodlandCottage(view,{x:0,z:0,kind:'house',id:item.id+'-camp'},true);hut.position.set(0,0,-r*.82);hut.scale.setScalar(.95);g.add(hut);
 for(let j=0;j<4;j++){const x=-.7+j*.45;view.cylinder(g,x,.13,-r*.82+1.4,.11,.22,0x98734b,8);}
 const post=view.cylinder(g,-1.4,.6,-r*.82+.35,.045,1.2,0x765139,7);view.box(g,-1.15,.95,-r*.82+.35,.53,.32,.045,color);post.userData.camp=true;
 g.traverse(o=>{delete o.userData.pick;});return g;
}
function smallObject(view,g,item){
 const color=team[item.owner]??0xb4a36b;
 if(item.type==='city-area')return camp(view,g,item);
 if(item.type==='city-slot')return foundation(view,g,item);
 if(item.type==='supplies'){
  for(let i=0;i<3;i++){view.box(g,-.5+i*.5,.23,.10,.43,.46,.43,0xac8659);for(const side of [-1,1])view.box(g,-.5+i*.5+side*.17,.24,.33,.04,.43,.025,0x674c36);}
  for(let i=0;i<5;i++){sphere(view,g,-.55+i*.24,.57,.05,.13,[0xa96a4c,0xd8a951,0x9c9e8c,0xa75875][i%4],1,.8,1);}
  view.cylinder(g,.63,.25,-.43,.3,.5,0x846947,10);return g;
 }
 if(item.type==='season'){
  const wheel=view.cylinder(g,0,.36,0,.55,.15,0x896c46,20);wheel.rotation.x=Math.PI/2;
  const face=disc(view,g,0,.36,.09,.48,0xe4d5ac);face.rotation.x=0;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;sphere(view,g,Math.sin(a)*.29,.36+Math.cos(a)*.29,.15,.11,[0x98b7bb,0xa5ba68,0xd6b966,0xba7850][i]);}
  view.cylinder(g,0,.12,0,.055,.24,0x765139,8);return g;
 }
 if(item.type==='event'){
  view.cylinder(g,0,.12,0,.60,.12,0xbca473,20);view.cylinder(g,0,.28,0,.37,.2,0xa58650,16);const scroll=view.box(g,0,.53,0,.64,.11,.48,0xe9d9ae);scroll.rotation.x=-.2;
  for(const side of [-1,1]){const roll=view.cylinder(g,side*.34,.53,0,.075,.57,0xe5d2a0,10);roll.rotation.x=Math.PI/2;}
  sphere(view,g,0,.64,.17,.12,color,1,.30,1);return g;
 }
 return foundation(view,g,item);
}
function makeObject(view,item){
 const g=new T.Group();g.position.set(item.x,view.heightAt(item.x,item.z)+.025,item.z);
 if(item.cardName){foundation(view,g,item);const miniature=createCardMiniature(view,item.cardName,item.owner??0);miniature.scale.multiplyScalar(item.modelScale??1.10);miniature.position.y=.12;g.add(miniature);g.userData.miniature=miniature;}
 else smallObject(view,g,item);
 if(item.type!=='city-area')view.tagged(g,{type:item.type,id:item.id});
 return g;
}
function labelHover(view,label,pick){
 const send=e=>{view.hoveredLiving=pick;view.onHover?.({...pick,clientX:e.clientX,clientY:e.clientY});};
 label.el.onpointerenter=send;label.el.onpointermove=send;label.el.onpointerleave=()=>{view.hoveredLiving=null;view.onHover?.(null);};
}
function objectLabel(view,item){
 if(!item.label)return;
 const type=item.type,html=`<span class="living-object-name">${esc(item.label)}</span>${item.costHtml?`<span class="living-object-cost">${item.costHtml}</span>`:''}`;
 const label=view.addLabel('living:'+item.id,item.x,item.z,html,`living-object-label living-${type}-label`,()=>view.onPick?.({type,id:item.id}),item.labelHeight??.15);
 label.living=true;label.item=item;label.hoverOnly=false;label.el.dataset.livingId=item.id;label.el.setAttribute('aria-label',item.ariaLabel??item.label);label.el.removeAttribute('title');label.el.dataset.available=String(item.available!==false);labelHover(view,label,{type,id:item.id});
 return label;
}
export function renderLivingBoard(view,state){
 const tree=state.livingTree??{x:30,z:13};
 view.syncEntity('living-tree',`${tree.x}:${tree.z}`,()=>{const g=ancientTree(view,{...tree,id:'living-elder',kind:'point'});g.scale.setScalar(1.35);view.tagged(g,{type:'tree',id:'living-tree'});return g;});
 for(const location of state.locations??[]){
  view.syncEntity('location:'+location.id,`${location.x}:${location.z}:${location.workers?.join(',')}`,()=>view.placementLocation(location));
  const gains=location.rewardIcons??{};let reward=Object.entries(gains).filter(([,n])=>n>0).map(([r,n])=>`<span><b>${n}</b>${resourceIcon(r)}</span>`).join('');
  if(!reward&&location.actualName?.includes('JOURNEY')){const n=location.actualName==='JOURNEY_TWO'?2:location.actualName==='JOURNEY_THREE'?3:location.actualName==='JOURNEY_FOUR'?4:5;reward=`<span>${n}${resourceIcon('CARD')} → ${n}${resourceIcon('VP')}</span>`;}
  const html=`<span class="living-object-name">${esc(location.name)}</span>${reward?`<span class="living-object-cost">${reward}</span>`:''}`;
  const label=view.addLabel('location:'+location.id,location.x,location.z,html,'living-object-label living-location-label',()=>view.onPick?.({type:'location',id:location.id}),.15);
  label.living=true;label.item=location;label.hoverOnly=false;label.el.removeAttribute('title');label.el.setAttribute('aria-label',location.name);label.el.dataset.available=String(location.available!==false);labelHover(view,label,{type:'location',id:location.id});
 }
 for(const item of state.livingObjects??[]){
  const entity=view.syncEntity('living:'+item.id,`${item.type}:${item.cardName??''}:${item.owner??''}:${item.x}:${item.z}:${item.radius??''}`,()=>makeObject(view,item));entity.living=item;
  objectLabel(view,item);
 }
 if(view.journeyBoard)view.journeyBoard.hidden=true;
 renderLivingPlacementPreview(view,state.placementPreview??null);
}
export function renderLivingPlacementPreview(view,preview){
 renderPlacementGhost(view,{placementPreview:preview});
 if(view.livingGhost&&preview&&Number.isFinite(preview.x)&&Number.isFinite(preview.z)){view.livingGhost.position.set(preview.x,view.heightAt(preview.x,preview.z),preview.z);view.livingGhost.visible=true;view.livingGhost.traverse(o=>{if(o.material?.color)o.material.emissive?.setHex(preview.valid===false?0x70352b:0x16301a);});}
 if(!view.livingPlacementRing){view.livingPlacementRing=view.ring(1.06,1.13,0xf0d69b,.85);view.markers.add(view.livingPlacementRing);}
 view.livingPlacementRing.visible=!!preview&&Number.isFinite(preview.x)&&Number.isFinite(preview.z);
 if(view.livingPlacementRing.visible){view.livingPlacementRing.position.set(preview.x,view.heightAt(preview.x,preview.z)+.17,preview.z);view.livingPlacementRing.material.color.setHex(preview.valid===false?0xc46d4e:0xe5cf8c);}
}
function renderPlacementGhost(view,state){
 const preview=state.placementPreview,key=preview?.cardName??'';
 if(view.livingGhostName!==key){if(view.livingGhost)view.disposeObject(view.livingGhost);view.livingGhost=null;view.livingGhostName=key;if(key){const ghost=createCardMiniature(view,key,preview.owner??0);ghost.traverse(o=>{delete o.userData.pick;if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.48;o.material.depthWrite=false;}});view.markers.add(ghost);view.livingGhost=ghost;}}
 if(view.livingGhost)view.livingGhost.visible=false;
}
export function updateLivingLabels(view){
 const w=view.container.clientWidth,h=view.container.clientHeight,labels=view.labels??[],placed=[];
 for(const label of labels){
  if(!label.living){label.el.style.visibility='hidden';continue;}
  const p=label.pos.clone();p.y=view.heightAt(p.x,p.z)+(label.pos.y??.15);p.project(view.camera);const x=(p.x*.5+.5)*w;let y=(-p.y*.5+.5)*h;
  const eventVisible=label.item?.type!=='event'||view.zoom>.83||view.hoveredLiving?.id===label.item.id;
  const visible=eventVisible&&p.z>-1&&p.z<1&&x>0&&x<w&&y>0&&y<h-12;
  if(visible){const ww=label.el.offsetWidth,hh=label.el.offsetHeight;for(let attempt=0;attempt<5&&placed.some(r=>Math.abs(r.x-x)<(r.w+ww)/2+3&&Math.abs(r.y-y)<(r.h+hh)/2+2);attempt++)y+=hh*.65+5;placed.push({x,y,w:ww,h:hh});}
  label.el.style.transform=`translate(${x}px,${y}px) translate(-50%,12px)`;label.el.style.visibility=visible?'visible':'hidden';
  label.el.style.setProperty('--living-label-scale',String(clamp(view.zoom,.72,1)));
 }
}
function idleWalk(view,entity,home,center,radius,dt,seed){
 let walk=entity.livingWalk;
 if(!walk){walk=entity.livingWalk={target:new T.Vector3(home.x,0,home.z),wait:1+hash(seed)*3,visits:0,last:entity.group.position.clone(),walking:false};}
 walk.wait-=dt;const position=entity.group.position;
 if(position.distanceToSquared(walk.target)<.12||!walk.walking){
  walk.walking=false;
  if(walk.wait<=0){walk.visits++;const returning=walk.visits%3===0,angle=hash(seed+':'+walk.visits)*Math.PI*2,d=radius*(.25+hash(seed+':d:'+walk.visits)*.65);const x=returning?home.x:center.x+Math.cos(angle)*d,z=returning?home.z:center.z+Math.sin(angle)*d;walk.target.set(x,view.heightAt(x,z),z);walk.walking=true;walk.wait=3+hash(seed+':w:'+walk.visits)*4;}
 }
 if(walk.walking){const delta=walk.target.clone().sub(position),distance=Math.hypot(delta.x,delta.z),step=Math.min(distance,dt*(entity.unit?1.7:1.1));if(distance>.025){position.x+=delta.x/distance*step;position.z+=delta.z/distance*step;const angle=Math.atan2(-delta.x,-delta.z);entity.group.rotation.y+=shortest(entity.group.rotation.y,angle)*(1-Math.exp(-dt*7));}else walk.walking=false;}
 position.y=view.heightAt(position.x,position.z)+Math.sin(view.t*3+hash(seed)*6.28)*.015;
 return walk.walking;
}
export function animateLivingBoard(view,dt){
 const state=view.state;
 for(const entity of view.entities.values()){
  if(entity.living?.cardName){
   const item=entity.living,mini=entity.group.userData.miniature;
   if(mini){animateCardMiniature(mini,view.t,dt);if(item.type==='city-card'&&item.critter){
    const center=item.roamCenter??(state.livingObjects??[]).find(o=>o.type==='city-area'&&o.owner===item.owner)??item;
    const proxy=entity.miniActor??={group:new T.Group(),livingWalk:null};
    if(!proxy.livingWalk)proxy.group.position.set(item.x,view.heightAt(item.x,item.z),item.z);
    const moving=idleWalk(view,proxy,item,center,item.roamRadius??Math.max(2,(center.radius??6)-1),dt,item.id);
    mini.position.set(proxy.group.position.x-item.x,proxy.group.position.y-entity.group.position.y+.12,proxy.group.position.z-item.z);mini.rotation.y=proxy.group.rotation.y;
    mini.traverse(o=>{if(o.userData.limb)o.rotation.x=Math.sin(view.t*(moving?9:2)+o.userData.limb.phase)*(moving?.32:.025);});
   }}
  }
  if(entity.unit&&!entity.moving){
   const u=entity.unit;if(u.locationId){entity.livingWalk=null;continue;}
   const center=u.roamCenter??(state.livingObjects??[]).find(o=>o.type==='city-area'&&o.owner===u.owner)??u.home??u,home=u.home??u;
   const moving=idleWalk(view,entity,home,center,u.roamRadius??Math.max(2,(center.radius??5)-1),dt,u.id);
   entity.group.traverse(o=>{if(o.userData.limb)o.rotation.x=Math.sin(view.t*(moving?11:2)+o.userData.limb.phase)*(moving?o.userData.limb.amplitude:.025);});
  }
 }
 if(view.livingGhost){const mouse=view.windowPointer,preview=state.placementPreview;if(Number.isFinite(preview?.x)&&Number.isFinite(preview?.z)){view.livingGhost.position.set(preview.x,view.heightAt(preview.x,preview.z),preview.z);view.livingGhost.visible=!view.inputPaused;}else if(mouse.inside&&!view.isCameraUI(document.elementFromPoint(mouse.x,mouse.y))){const point=view.groundPoint(mouse.x,mouse.y),area=(state.livingObjects??[]).find(o=>o.type==='city-area'&&o.owner===preview?.owner);const valid=point&&area&&Math.hypot(point.x-area.x,(point.z-area.z)/.9)<(area.radius??8)-.8;if(point){view.livingGhost.position.set(point.x,view.heightAt(point.x,point.z),point.z);view.livingGhost.visible=!!valid&&!view.inputPaused;}}else view.livingGhost.visible=false;}
 if(view.fallingLeaves&&state.livingTree){const delta=new T.Matrix4().makeTranslation(state.livingTree.x-30,0,state.livingTree.z-22),m=new T.Matrix4();for(let i=0;i<view.fallingLeaves.count;i++){view.fallingLeaves.getMatrixAt(i,m);m.premultiply(delta);view.fallingLeaves.setMatrixAt(i,m);}view.fallingLeaves.instanceMatrix.needsUpdate=true;}
}
export function refreshLivingHover(view){
 const mouse=view.windowPointer;if(!mouse.inside||view.pointers.size||!view.windowFocused||view.inputPaused){if(view.hoveredLiving){view.hoveredLiving=null;view.onHover?.(null);}return;}
 const target=document.elementFromPoint(mouse.x,mouse.y),label=target?.closest?.('[data-map-kind]');
 if(label?.classList.contains('living-object-label'))return;
 if(!view.pointerOverMap(target,mouse.x,mouse.y)){if(view.hoveredLiving){view.hoveredLiving=null;view.onHover?.(null);}return;}
 const pick=view.pickAt({clientX:mouse.x,clientY:mouse.y});view.hoveredLiving=pick?.type==='ground'?null:pick;
 view.onHover?.(view.hoveredLiving?{...pick,clientX:mouse.x,clientY:mouse.y}:null);
}
