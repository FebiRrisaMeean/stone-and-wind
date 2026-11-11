import * as T from '../vendor/three.module.js';
import { FACTIONS,TROOPS,WORLD } from './data.js?v=20261111-5';
import { count,visible,known,moveRange } from './engine.js?v=20261111-5';
const COLORS={plain:0x92ad72,meadow:0xa8bc78,forest:0x6b9568,road:0xccbd91,rock:0x9caaa0,water:0x5baeb3,mist:0x273f43};
export class WorldView{
 constructor(container,onPick,onHover){
  this.container=container;this.onPick=onPick;this.onHover=onHover;this.objects=[];this.labels=[];this.t=0;this.zoom=1;this.cameraTarget=new T.Vector3(11,0,8);
  this.scene=new T.Scene();this.scene.background=new T.Color('#142b2e');this.scene.fog=new T.Fog('#142b2e',36,75);
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;container.appendChild(this.renderer.domElement);
  this.camera=new T.OrthographicCamera(-18,18,14,-14,.1,120);this.camera.position.set(31,33,33);this.camera.lookAt(this.cameraTarget);
  this.scene.add(new T.HemisphereLight(0xdde9da,0x243c39,2.7));const sun=new T.DirectionalLight(0xffedd2,3.2);sun.position.set(-12,35,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-25;sun.shadow.camera.right=25;sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;sun.shadow.normalBias=.045;this.scene.add(sun);
  const fill=new T.DirectionalLight(0xb8dadd,.8);fill.position.set(20,10,-20);this.scene.add(fill);
  this.root=new T.Group();this.scene.add(this.root);this.dynamic=new T.Group();this.root.add(this.dynamic);this.static=new T.Group();this.root.add(this.static);
  this.labelLayer=document.createElement('div');this.labelLayer.className='world-labels';container.appendChild(this.labelLayer);
  this.selection=new T.Mesh(new T.RingGeometry(.53,.62,48),new T.MeshBasicMaterial({color:0xf5d58c,side:T.DoubleSide,transparent:true,opacity:.95}));this.selection.rotation.x=-Math.PI/2;this.selection.visible=false;this.root.add(this.selection);
  this.hoverMarker=new T.Mesh(new T.RingGeometry(.18,.23,32),new T.MeshBasicMaterial({color:0xf9edcc,side:T.DoubleSide,transparent:true,opacity:.8}));this.hoverMarker.rotation.x=-Math.PI/2;this.hoverMarker.visible=false;this.root.add(this.hoverMarker);
  this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.plane=new T.Plane(new T.Vector3(0,1,0),-.24);this.down=null;
  this.pointerHandler=e=>{const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects(this.dynamic.children,true).find(h=>h.object.userData.pick);const ground=new T.Vector3();this.raycaster.ray.intersectPlane(this.plane,ground);return hit?.object.userData.pick??{type:'ground',x:Math.round(ground.x),z:Math.round(ground.z)};};
  this.onDown=e=>{this.down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};this.renderer.domElement.setPointerCapture(e.pointerId);};this.onUp=e=>{if(this.down&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<8){this.onPick(this.pointerHandler(e));}this.down=null;};
  this.onMove=e=>{if(this.down&&Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>=8){const dx=(e.clientX-this.down.lx)*.025/this.zoom,dy=(e.clientY-this.down.ly)*.035/this.zoom;this.camera.position.x-=dx+dy;this.camera.position.z+=dx-dy;this.cameraTarget.x-=dx+dy;this.cameraTarget.z+=dx-dy;this.down.lx=e.clientX;this.down.ly=e.clientY;return;}const obj=this.pointerHandler(e);this.hoverMarker.visible=obj.type==='ground'&&obj.x>=0&&obj.x<WORLD.width&&obj.z>=0&&obj.z<WORLD.height;if(this.hoverMarker.visible)this.hoverMarker.position.set(obj.x,.36,obj.z);this.onHover?.(obj);};
  this.onWheel=e=>{e.preventDefault();this.zoom=Math.max(.7,Math.min(1.8,this.zoom+(e.deltaY>0?-.07:.07)));this.resize();};
  this.renderer.domElement.addEventListener('pointerdown',this.onDown);this.renderer.domElement.addEventListener('pointerup',this.onUp);this.renderer.domElement.addEventListener('pointermove',this.onMove);this.renderer.domElement.addEventListener('wheel',this.onWheel,{passive:false});this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
  this.animate();
 }
 material(color,roughness=.85){return new T.MeshStandardMaterial({color,roughness,metalness:.04,flatShading:true});}
 box(group,x,y,z,w,h,d,color){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),this.material(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 cylinder(group,x,y,z,r,h,color,sides=12){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,sides),this.material(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 stud(group,x,y,z,color,r=.105){return this.cylinder(group,x,y,z,r,.09,color,12);}
 tagged(group,pick){group.traverse(o=>{if(o.isMesh)o.userData.pick=pick;});}
 clear(group){while(group.children.length){const child=group.children.pop();child.traverse?.(o=>{o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});} }
 tree(parent,x,z,scale=1){const g=new T.Group();g.position.set(x,.24,z);g.scale.setScalar(scale);this.box(g,0,.4,0,.14,.8,.14,0x846b4e);for(let i=0;i<3;i++){const mesh=new T.Mesh(new T.ConeGeometry(.55-i*.1,.85,4),this.material([0x38674c,0x447b58,0x60936b][i]));mesh.position.y=.8+i*.36;mesh.rotation.y=Math.PI/4;mesh.castShadow=true;g.add(mesh);}parent.add(g);}
 castle(b,level=1){const g=new T.Group(),color=b.owner===2?0xc3c2aa:b.owner===0?0xd6d4c2:0xd6cbb1;g.position.set(b.x,.24,b.z);
  this.box(g,0,.16,0,1.9,.32,1.8,0x717d72);this.box(g,0,.74,0,1.1,1.25,1.05,color);this.box(g,0,1.42,0,1.25,.16,1.18,color);this.box(g,0,.65,.58,.35,.7,.08,0x4e574e);
  for(const x of [-.8,.8])for(const z of [-.68,.68]){this.box(g,x,.72,z,.48,1.25,.48,color);this.box(g,x,1.4,z,.58,.15,.58,color);for(const dx of [-.18,.18])for(const dz of [-.18,.18])this.box(g,x+dx,1.55,z+dz,.16,.25,.16,color);}
  for(const x of [-.4,0,.4])for(const z of [-.39,.39])this.stud(g,x,1.56,z,color,.11);
  if(level>1){this.box(g,0,1.87,0,.67,.8,.65,color);this.box(g,0,2.35,0,.78,.15,.75,color);for(const x of [-.25,.25])for(const z of [-.25,.25])this.box(g,x,2.5,z,.14,.24,.14,color);}
  this.flag(g,.45,level>1?2.4:1.65,.2,b.owner,level>1?1:0.8);this.tagged(g,{type:b.kind==='point'?'point':'building',id:b.id});return g;
 }
 flag(g,x,y,z,owner,scale=1){const color=owner===2?0xb7a576:owner===0?0x597bdd:0x4f9f82;this.cylinder(g,x,y+.4,z,.025,.95,0x73664b,6);this.box(g,x+.22*scale,y+.64,z,.42*scale,.27*scale,.035,color);this.box(g,x+.22*scale,y+.64,z+.024,.08,.10,.018,0xf1d89f);}
 building(b,active,s){if(b.kind==='castle')return this.castle(b,s.players[b.owner]?.level??1);const g=new T.Group();g.position.set(b.x,.23,b.z);const color=active?0xdccfae:0x9e9f8b,roof=b.owner===0?0x4e6b9d:0x4f8068;
  const w=b.kind==='house'?.7:1.05,d=b.kind==='house'?.65:.9;this.box(g,0,.34,0,w,.64,d,color);this.box(g,0,.05,0,w+.12,.14,d+.12,0x848d77);this.box(g,0,.17,d/2+.02,.18,.32,.03,0x73634c);
  if(b.kind==='temple'){this.box(g,0,.97,0,.22,.7,.25,color);this.box(g,0,1.42,0,.06,.35,.06,0xd7ba73);this.box(g,0,1.5,0,.27,.06,.06,0xd7ba73);this.box(g,0,.72,0,1.1,.18,1,roof);}
  else if(b.kind==='forge'){this.box(g,.3,.8,-.2,.25,.8,.25,0x8b8774);this.box(g,0,.73,0,1.2,.16,1,roof);}
  else if(b.kind==='range'){this.box(g,-.2,.8,-.18,.12,.9,.12,0x846743);const target=this.cylinder(g,.2,.7,.1,.25,.1,0xddd8bd,16);target.rotation.x=Math.PI/2;const bull=this.cylinder(g,.2,.7,.17,.09,.02,0xa6644c,12);bull.rotation.x=Math.PI/2;}
  else{const roofMesh=new T.Mesh(new T.ConeGeometry(w*.84,.43,4),this.material(roof));roofMesh.rotation.y=Math.PI/4;roofMesh.position.y=.9;roofMesh.scale.z=d/w;roofMesh.castShadow=true;g.add(roofMesh);if(b.kind==='barracks'||b.kind==='hall')this.flag(g,-.3,.75,.25,b.owner,.6);}
  if(!active){this.box(g,0,.15,.6,1.2,.12,.09,0x9b8053);this.box(g,.53,.45,0,.07,.9,1.2,0x9b8053);}
  this.tagged(g,{type:'building',id:b.id});return g;
 }
 figure(group,x,z,kind,owner){const g=new T.Group();g.position.set(x,0,z);const blue=owner===2?0x8b8166:owner===0?0x5579c3:0x4c997b;const dark=owner===2?0x5f624f:0x3d4a45;
  if(kind==='horse'){this.box(g,0,.4,0,.30,.30,.58,0x7f6451);for(const a of [-.1,.1])for(const b of [-.2,.2])this.box(g,a,.2,b,.08,.35,.08,0x594f43);this.box(g,0,.65,-.26,.2,.38,.19,0x7f6451);g.position.y=.35;}
  this.box(g,-.075,.15,0,.11,.3,.14,dark);this.box(g,.075,.15,0,.11,.3,.14,dark);this.box(g,0,.43,0,.34,.3,.2,blue);this.cylinder(g,0,.69,0,.13,.22,0xe1c690,10);
  if(kind==='guard'||kind==='sword'||kind==='hero'){this.cylinder(g,0,.82,0,.15,.12,0xafb6ab,10);this.box(g,0,.79,-.13,.27,.11,.05,0xafb6ab);}
  else this.cylinder(g,0,.82,0,.15,.08,blue,10);
  this.box(g,-.22,.43,0,.1,.31,.1,blue);this.box(g,.22,.43,0,.1,.31,.1,blue);
  if(kind==='guard'){this.box(g,-.26,.4,-.07,.07,.38,.32,blue);this.box(g,-.30,.4,-.07,.02,.25,.20,0xd9cc95);this.box(g,.25,.59,-.11,.045,.65,.045,0xbfc2b2);}
  if(kind==='sword'||kind==='hero'){this.box(g,.26,.68,-.05,.055,.8,.055,0xd3d4c6);this.box(g,.26,.4,-.05,.24,.06,.07,0xc3ae73);}
  if(kind==='bow'){const bow=new T.Mesh(new T.TorusGeometry(.23,.025,5,10,Math.PI),this.material(0xbfa270));bow.position.set(.25,.45,-.13);bow.rotation.z=-Math.PI/2;g.add(bow);}
  if(kind==='drum'){this.cylinder(g,0,.38,-.24,.19,.22,0xc4a779,12);this.box(g,.24,.6,-.14,.025,.32,.025,0x63523c);}
  if(kind==='hero'){this.box(g,0,.48,.15,.38,.43,.045,owner===0?0x2e4988:0x2a6655);this.cylinder(g,0,.93,0,.13,.1,0xdac17b,8);}
  group.add(g);
 }
 unit(u){const g=new T.Group();g.position.set(u.x,.28,u.z);const n=Math.min(5,count(u)),positions=n===1?[[0,0]]:[[-.2,-.18],[.2,-.18],[-.2,.2],[.2,.2],[0,.02]];for(let i=0;i<n;i++)this.figure(g,positions[i][0],positions[i][1],u.kind,u.owner);this.flag(g,-.42,.5,.22,u.owner,.5);this.tagged(g,{type:'unit',id:u.id});return g;}
 addLabel(x,z,html,cls='',onClick){const el=document.createElement('button');el.className='world-label '+cls;el.innerHTML=html;if(onClick){el.style.pointerEvents='auto';el.onclick=onClick;}this.labelLayer.appendChild(el);this.labels.push({el,pos:new T.Vector3(x,cls.includes('city-label')?2.5:cls.includes('point-label')?2.5:1.45,z)});}
 render(s,p,{selected=null,menu=false,build=null}={}){
  this.state=s;this.p=p;this.clear(this.static);this.clear(this.dynamic);this.labelLayer.innerHTML='';this.labels=[];this.objects=[];
  const baseBox=this.box(this.static,11,-.9,8,24,1.35,18,0x243e3b);baseBox.receiveShadow=true;
  const tiles=s.tiles,geo=new T.BoxGeometry(.98,.39,.98),material=new T.MeshStandardMaterial({roughness:.97});const inst=new T.InstancedMesh(geo,material,tiles.length);inst.receiveShadow=true;inst.castShadow=true;const dummy=new T.Object3D();
  tiles.forEach((t,i)=>{const fog=!menu&&!known(s,p,t),type=fog?'mist':t.type;dummy.position.set(t.x,(t.h??.12)-.19,t.z);dummy.scale.set(1,type==='water'?.36:1,1);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);const c=new T.Color(COLORS[type]??COLORS.plain);c.multiplyScalar(.96+((t.x*7+t.z*11)%9)*.008);inst.setColorAt(i,c);});this.static.add(inst);
  const studGeo=new T.CylinderGeometry(.105,.105,.075,8),studs=new T.InstancedMesh(studGeo,material,tiles.length*4);let si=0;
  for(const t of tiles){const fog=!menu&&!known(s,p,t);if(t.type==='water'&&!fog)continue;const color=COLORS[fog?'mist':t.type]??COLORS.plain;for(const dx of [-.22,.22])for(const dz of [-.22,.22]){dummy.position.set(t.x+dx,(fog?.12:t.h??.12)+.045,t.z+dz);dummy.scale.set(1,1,1);dummy.updateMatrix();studs.setMatrixAt(si,dummy.matrix);studs.setColorAt(si,new T.Color(color));si++;}}
  studs.count=si;studs.receiveShadow=true;this.static.add(studs);
  for(const t of tiles){const revealed=menu||known(s,p,t);if(!revealed)continue;if(t.type==='forest'&&!s.sources.some(m=>m.x===t.x&&m.z===t.z))this.tree(this.static,t.x+(t.x%2?.1:-.1),t.z,.62+((t.x+t.z)%3)*.09);if(t.type==='rock'&&!s.sources.some(m=>m.x===t.x&&m.z===t.z)){this.box(this.static,t.x,.43,t.z,.7,.5,.6,0xa3afa4);this.stud(this.static,t.x,.72,t.z,0xa3afa4,.13);}}
  for(const m of s.sources){if(!menu&&!known(s,p,m))continue;const g=new T.Group();g.position.set(m.x,.22,m.z);if(m.resource==='wood'){this.tree(g,-.2,-.1,.7);this.box(g,.25,.22,.23,.55,.25,.28,0x9e8059);}else if(m.resource==='gold'){this.box(g,0,.26,0,.75,.5,.68,0x8c917c);for(let i=0;i<3;i++)this.box(g,-.2+i*.2,.52,.1,.17,.18,.2,0xd4b66e);}else{for(let i=0;i<3;i++)this.box(g,-.22+i*.2,.18+i*.1,0,.35,.3,.45,0xc3c6b2);}
   this.tagged(g,{type:'source',id:m.id});this.dynamic.add(g);if(!menu)this.addLabel(m.x,m.z,`<span class="source-symbol">${{gold:'◈',wood:'♣',stone:'◆'}[m.resource]}</span><span>${m.workers?.length??0}/${m.slots}</span>`,m.owner===p?'owned':'',()=>this.onPick({type:'source',id:m.id}));}
  for(const b of s.buildings){if(!menu&&b.owner!==p&&!visible(s,p,b))continue;this.dynamic.add(this.building(b,b.ready<=s.round,s));if(b.kind==='castle'&&!menu)this.addLabel(b.x,b.z,`<span class="city-name">${FACTIONS[b.owner].short}</span><small>Замок ${s.players[b.owner].level}</small>`,'city-label',()=>this.onPick({type:'building',id:b.id}));}
  const point={id:'point',kind:'point',owner:s.point.owner??2,...WORLD.center};const fort=this.castle(point,1);fort.scale.set(.72,.72,.72);this.dynamic.add(fort);const ring=new T.Mesh(new T.RingGeometry(1.05,1.1,64),new T.MeshBasicMaterial({color:0xe6c785,side:T.DoubleSide,transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(11,.27,8);this.dynamic.add(ring);
  if(!menu)this.addLabel(11,8,`<span>✧</span><span>${s.point.owner===null?'Ключевая точка':`${s.point.progress}/${WORLD.hold} · ${FACTIONS[s.point.owner].short}`}</span>`,'point-label',()=>this.onPick({type:'point'}));
  for(const u of s.units){if(!menu&&u.owner!==p&&!visible(s,p,u))continue;const group=this.unit(u);this.dynamic.add(group);if(!menu){const team=u.owner===2?'neutral':u.owner===p?'friendly':'enemy';this.addLabel(u.x,u.z,`<span>${u.kind==='hero'?'♜':TROOPS[u.kind].icon}</span><b>${count(u)}</b>${u.attacked===s.round?'<i>✓</i>':''}`,team,()=>this.onPick({type:'unit',id:u.id}));}}
  const unit=s.units.find(u=>u.id===selected);this.selection.visible=!!unit;if(unit){this.selection.position.set(unit.x,.34,unit.z);if(unit.owner===p){const r=moveRange(s,unit);const reach=new T.Mesh(new T.RingGeometry(r-.025,r+.025,80),new T.MeshBasicMaterial({color:0xd4dcaf,transparent:true,opacity:.35,side:T.DoubleSide}));reach.rotation.x=-Math.PI/2;reach.position.set(unit.x,.28,unit.z);this.dynamic.add(reach);}}
  if(build){for(const t of tiles){if(Math.hypot(t.x-WORLD.bases[p].x,t.z-WORLD.bases[p].z)>3.6)continue;const m=new T.Mesh(new T.PlaneGeometry(.78,.78),new T.MeshBasicMaterial({color:0xe5ce88,transparent:true,opacity:.13,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(t.x,.4,t.z);this.dynamic.add(m);}}
 }
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);const aspect=w/h,span=14/this.zoom;this.camera.left=-span*aspect;this.camera.right=span*aspect;this.camera.top=span;this.camera.bottom=-span;this.camera.updateProjectionMatrix();}
 animate(){this.frame=requestAnimationFrame(()=>this.animate());this.t+=.016;if(this.selection.visible)this.selection.material.opacity=.6+Math.sin(this.t*3)*.25;for(const l of this.labels){const p=l.pos.clone().project(this.camera);const w=this.container.clientWidth,h=this.container.clientHeight;l.el.style.transform=`translate(${(p.x*.5+.5)*w}px,${(-p.y*.5+.5)*h}px) translate(-50%,-100%)`;l.el.style.visibility=p.z<1?'visible':'hidden';}this.renderer.render(this.scene,this.camera);}
 setZoom(delta){this.zoom=Math.max(.7,Math.min(1.8,this.zoom+delta));this.resize();}
 resetCamera(){this.zoom=1;this.cameraTarget.set(11,0,8);this.camera.position.set(31,33,33);this.camera.lookAt(this.cameraTarget);this.resize();}
 dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.clear(this.dynamic);this.clear(this.static);this.renderer.dispose();this.container.innerHTML='';}
}
