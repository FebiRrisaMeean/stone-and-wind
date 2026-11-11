import * as T from '../vendor/three.module.js';
import {WORLD} from './data.js?v=20261111-14';

// All geometry is local to the miniature so world-space placement and picking stay unchanged
const bark=0x765039,moss=0x587c43,cream=0xf2ddac,soil=0x77654b;
const foliage=[0x61894a,0x71964e,0x839f56,0x527d48];
const team=[0x7794ad,0x95a973,0xd19b63,0xb39bb7];
const n=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
const v=(x,y,z)=>new T.Vector3(x,y,z);
const rounded=(view,g,x,y,z,r,color,sx=1,sy=1,sz=1)=>{const m=view.mesh(g,new T.SphereGeometry(r,14,10),color,x,y,z);m.scale.set(sx,sy,sz);return m;};
const glow=view=>view.material(0xffd795,{emissive:0xffaf4d,emissiveIntensity:.65,roughness:.8});
function disc(view,g,x,y,z,r,color){const d=view.cylinder(g,x,y,z,r,.045,color,24);d.rotation.x=Math.PI/2;return d;}
function window(view,g,x,y,z,r=.13){disc(view,g,x,y,z,r*1.22,bark);disc(view,g,x,y,z+.028,r,glow(view));view.box(g,x,y,z+.06,r*1.85,.025,.025,bark);view.box(g,x,y,z+.06,.025,r*1.85,.025,bark);}
function leaf(view,g,x,y,z,size,color,angle=0){const l=rounded(view,g,x,y,z,size,color,.52,.17,1);l.rotation.set(.25,angle,.12);return l;}
function mushroom(view,g,x,z,size=1,color=0xbd7657){view.cylinder(g,x,.13*size,z,.045*size,.27*size,cream,8);rounded(view,g,x,.28*size,z,.18*size,color,1,.5,1);for(let j=0;j<3;j++){const a=j*2.1;rounded(view,g,x+Math.cos(a)*.10*size,.335*size,z+Math.sin(a)*.10*size,.026*size,cream,1,.4,1);}}
function log(view,g,x,y,z,length=.9,angle=Math.PI/2){const a=view.cylinder(g,x,y,z,.13,length,bark,12);a.rotation.z=angle;const end=view.cylinder(g,x+length*.5,y,z,.105,.018,0xd7ad73,14);end.rotation.z=Math.PI/2;const ring=view.mesh(g,new T.TorusGeometry(.063,.008,4,16),0x9b764b,x+length*.515,y,z);ring.rotation.y=Math.PI/2;}
function bush(view,g,x,z,scale=.65,berries=false){for(let j=0;j<4;j++){const a=j*2.4;rounded(view,g,x+Math.sin(a)*scale*.36,.33*scale+j*.06,z+Math.cos(a)*scale*.36,scale*.45,foliage[j]);}if(berries)for(let j=0;j<9;j++){const a=j*2.399;rounded(view,g,x+Math.sin(a)*scale*.46,.27*scale+(j%3)*scale*.16,z+Math.cos(a)*scale*.46,.065*scale,0x9c4962);}}
function tree(view,g,x,z,size=1,seed=0){const trunk=view.cylinder(g,x,.72*size,z,.16*size,1.45*size,bark,9,.10*size);trunk.rotation.z=Math.sin(seed)*.09;for(let j=0;j<3;j++){const a=j*2.1+seed;view.beam(g,v(x,.7*size,z),v(x+Math.sin(a)*.42*size,1.45*size,z+Math.cos(a)*.42*size),.075*size,bark);rounded(view,g,x+Math.sin(a)*.40*size,(1.53+j*.17)*size,z+Math.cos(a)*.40*size,.67*size,foliage[j],1,.82,1);}rounded(view,g,x,2.05*size,z,.65*size,foliage[2],1,.82,1);}
function lantern(view,g,x,y,z){view.beam(g,v(x,y+.24,z),v(x,y+.45,z),.012,bark);view.cylinder(g,x,y+.12,z,.08,.22,glow(view),6);view.cone(g,x,y+.27,z,.13,.12,bark,6);view.cylinder(g,x,y,z,.10,.035,bark,6);}

export function woodlandCottage(view,b,active=true){const g=new T.Group();g.position.set(b.x,view.heightAt(b.x,b.z),b.z);const large=b.kind==='castle'||b.kind==='hall',scale=large?1.5:1;g.scale.setScalar(scale);
 rounded(view,g,0,.04,0,.86,moss,1,.17,.83);rounded(view,g,0,.54,0,.66,0xc2a16e,1,.88,.83);
 // Rounded turf roof with overlapping leaf shingles and a timber rim
 rounded(view,g,0,1.04,0,.76,bark,1,.27,.87);rounded(view,g,0,1.12,0,.78,0x6f894b,1,.33,.88);
 for(let j=0;j<7;j++){const a=j*Math.PI*2/7;leaf(view,g,Math.sin(a)*.42,1.19+(j%2)*.05,Math.cos(a)*.35,.37,foliage[j%4],a);}
 disc(view,g,-.12,.37,.55,.255,bark);disc(view,g,-.12,.37,.577,.205,0x9c7147);view.box(g,-.12,.37,.606,.018,.36,.02,0x795337);rounded(view,g,.005,.38,.62,.025,0xe9c478);
 window(view,g,.35,.65,.48,.14);window(view,g,-.43,.67,.41,.095);
 for(let j=0;j<3;j++)rounded(view,g,-.12,.06,.78+j*.22,.18,0xc8b99b,1,.16,.65);
 view.cylinder(g,-.40,1.19,-.25,.10,.53,bark,9);rounded(view,g,-.40,1.48,-.25,.15,0x9d7153,1,.4,1);
 for(let i=0;i<3;i++){const smoke=rounded(view,g,-.40,1.65+i*.17,-.25,.06,0xe1d5ba,1,1.35,1);smoke.material.transparent=true;smoke.material.opacity=.15;smoke.material.depthWrite=false;smoke.userData.smoke={phase:i/3,base:smoke.position.clone()};}
 mushroom(view,g,-.77,.32,.7);mushroom(view,g,-.88,.15,.45,0xd1a275);bush(view,g,.68,-.25,.45,true);lantern(view,g,-.58,.55,.58);
 if(b.kind==='forge'||b.kind==='unique'){view.box(g,.88,.40,.25,.58,.08,.40,bark);log(view,g,.88,.51,.25,.50);}
 if(b.kind==='house'){view.box(g,.62,.22,.67,.42,.08,.29,bark);for(let i=0;i<4;i++)rounded(view,g,.50+i*.08,.30,.67,.065,i%2?0xa24863:0xe7b76c);}
 if(!active){view.beam(g,v(-.7,.1,-.4),v(-.7,1.4,.4),.035,0xc8a76d);}
 view.tagged(g,{type:'building',id:b.id});return g;
}

export function ancientTree(view,b){const g=new T.Group();g.position.set(b.x,view.heightAt(b.x,b.z),b.z);
 rounded(view,g,0,.07,0,2.25,moss,1,.10,.85);
 const trunk=view.cylinder(g,0,2.05,0,.80,4.1,bark,12,.44);trunk.rotation.z=-.07;
 for(let j=0;j<8;j++){const a=j*Math.PI/4+.15,r=1.75+(j%2)*.3;view.beam(g,v(Math.sin(a)*r,.03,Math.cos(a)*r),v(Math.sin(a)*.27,1.0,Math.cos(a)*.27),.20,bark);rounded(view,g,Math.sin(a)*r*.75,.10,Math.cos(a)*r*.75,.28,moss,1,.22,1);}
 for(let j=0;j<7;j++){const a=j*2.399,r=1.4+(j%3)*.45,by=3.2+(j%3)*.45;view.beam(g,v(0,2.5,0),v(Math.sin(a)*r,by,Math.cos(a)*r),.20,bark);rounded(view,g,Math.sin(a)*r,by+.7,Math.cos(a)*r,1.35,foliage[j%4],1,.65,1);}
 rounded(view,g,-.15,5.25,0,1.55,foliage[2],1,.66,1);
 disc(view,g,0,.65,.75,.43,0x4c3828);disc(view,g,0,.65,.79,.33,0xaa7749);window(view,g,-.36,1.8,.66,.16);window(view,g,.33,2.7,.50,.13);
 for(let j=0;j<9;j++){const a=-1.2+j*.3;view.box(g,Math.sin(a)*1.02,.09+j*.115,Math.cos(a)*1.02,.40,.12,.23,0xb28d5a);}
 const balcony=view.cylinder(g,.45,2.2,.70,.72,.10,0xb28d5a,16);balcony.scale.z=.65;
 for(let j=0;j<4;j++){const a=j*.6;view.beam(g,v(-1.4+j*.7,2.25+Math.sin(a)*.28,1.0),v(-.7+j*.7,2.25+Math.sin(a+.6)*.28,1.0),.015,bark);lantern(view,g,-1.4+j*.7,1.89+Math.sin(a)*.28,1.0);}
 for(let j=0;j<6;j++)mushroom(view,g,Math.sin(j*2.4)*1.7,Math.cos(j*2.4)*1.6,.65+(j%3)*.2,j%2?0xcc805b:0xb79964);
 view.tagged(g,{type:b.kind==='point'?'point':'building',id:b.id});return g;
}

export function woodlandFigure(view,kind,owner,phase=0,portrait=null){const g=new T.Group(),species=((portrait??owner)%6+6)%6,coat=[0xb69b7a,0xbf7a49,0x8c816b,0xc9baa2,0x77756f,0x9b7758][species],cloth=team[owner]??team[0];
 g.userData.species=['mouse','squirrel','hedgehog','hare','mole','beaver'][species];
 // Rounded body, tiny feet and paws distinguish the critters even at board scale
 rounded(view,g,0,.43,.03,.25,coat,.95,1.25,.83);rounded(view,g,0,.39,-.12,.19,cream,.75,1,.45);
 for(const side of [-1,1]){const foot=new T.Group();foot.position.set(side*.12,.22,0);rounded(view,foot,0,-.15,-.09,.095,coat,.72,.60,1.35);foot.userData.limb={phase:phase+(side<0?0:Math.PI),amplitude:.5};g.add(foot);const arm=new T.Group();arm.position.set(side*.23,.54,-.015);rounded(view,arm,0,-.11,-.025,.08,coat,.68,1.4,.8);arm.userData.limb={phase:phase+(side<0?Math.PI:0),amplitude:.35};g.add(arm);}
 rounded(view,g,0,.82,-.03,.235,coat,1,.96,.93);rounded(view,g,0,.75,-.22,.125,cream,1,.65,.75);rounded(view,g,0,.78,-.33,.042,0x534138,.85,.68,.80);
 for(const side of [-1,1]){rounded(view,g,side*.122,.86,-.213,.030,0x292e25,.7,1,.66);rounded(view,g,side*.128,.875,-.233,.009,0xfff5dc);if(species===3){const ear=rounded(view,g,side*.12,1.14,.0,.13,coat,.55,2.25,.55);ear.rotation.z=-side*.20;const inner=rounded(view,g,side*.12,1.15,-.051,.088,0xd8a78f,.45,2.45,.35);inner.rotation.z=-side*.2;}else if(species!==2&&species!==4){rounded(view,g,side*.185,1.00,.00,.135,coat,1,1,.36);rounded(view,g,side*.185,1.00,-.042,.092,0xdba990,1,.92,.26);}}
 const scarf=view.cylinder(g,0,.65,-.02,.21,.075,cloth,12);scarf.scale.z=.86;const tailScarf=view.box(g,.15,.53,-.16,.09,.23,.045,cloth);tailScarf.rotation.z=-.22;
 if(species===0){const points=[v(0,.26,.19),v(.26,.18,.34),v(.34,.08,.55),v(.15,.08,.62)];view.mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points),12,.025,5,false),0xb88c77);}
 if(species===1){const tail=rounded(view,g,.05,.55,.34,.28,0xb56e3b,.8,1.45,.65);tail.rotation.x=.48;rounded(view,g,.05,.87,.40,.22,0xce925b,.8,1,.68);}
 if(species===2){rounded(view,g,0,.55,.15,.31,0x6e604e,1,.98,.75);for(let j=0;j<16;j++){const a=j*2.399,r=.10+((j%3)/3)*.2;const spine=view.cone(g,Math.sin(a)*r,.55+(j%4)*.07,.24+Math.cos(a)*r*.50,.045,.14,0xb7a17c,5);spine.rotation.x=.45;spine.rotation.z=Math.sin(a)*.5;}}
 if(species===3)rounded(view,g,.0,.30,.23,.12,cream);
 if(species===4){rounded(view,g,0,.76,-.30,.075,0xc7a39a,1.12,.76,1);for(const side of [-1,1]){rounded(view,g,side*.24,.34,-.08,.11,0xbab1a0,1.2,.55,.8);for(let j=0;j<3;j++)view.cone(g,side*.24+(j-1)*.045,.32,-.17,.015,.09,cream,5).rotation.x=-Math.PI/2;}}
 if(species===5){const paddle=rounded(view,g,0,.15,.45,.22,0x66513e,.80,.23,1.55);paddle.rotation.x=-.25;for(const side of [-1,1])view.box(g,side*.035,.67,-.31,.055,.075,.035,cream);}

 // A small satchel carries the player colour without any soldier equipment
 rounded(view,g,-.23,.37,.12,.105,0x987044,.8,1.05,.65);view.beam(g,v(-.19,.67,.1),v(-.21,.39,.12),.017,0xd0b57e);
 return g;
}

export function woodlandSource(view,m){const g=new T.Group();g.position.set(m.x,view.heightAt(m.x,m.z),m.z);rounded(view,g,0,.035,0,.88,moss,1,.11,.8);
 if(m.resource==='wood'||m.resource==='twig'){tree(view,g,-.35,-.35,.75,.2);for(let j=0;j<3;j++)log(view,g,.16,.16+j*.12,.32,.80);for(let j=0;j<4;j++)view.beam(g,v(-.45+j*.14,.15,.55),v(-.20+j*.11,.20,.05),.025,0xc29964);}
 else if(m.resource==='resin'||m.resource==='gold'){tree(view,g,0,-.2,.85,1.4);for(let j=0;j<4;j++)rounded(view,g,-.10+(j%2)*.18,.39+Math.floor(j/2)*.18,-.01,.10,view.material(0xe8ad42,{emissive:0x9c5715,emissiveIntensity:.13,transparent:true,opacity:.91}),.7,1.25,.65);rounded(view,g,.45,.12,.35,.21,0xe4af4e,1,.6,.7);}
 else if(m.resource==='berry'||m.resource==='food'){bush(view,g,-.37,-.10,.8,true);bush(view,g,.37,.15,.7,true);view.cylinder(g,.05,.15,.63,.18,.26,0xbe955e,12,.22);for(let j=0;j<5;j++)rounded(view,g,-.12+j*.055,.30,.63,.055,0xa34d68);}
 else{const pool=rounded(view,g,0,.04,0,.68,view.material(0x77b7ae,{transparent:true,opacity:.7,roughness:.22}),1,.04,.65);pool.receiveShadow=false;for(let j=0;j<7;j++){const a=j*2.4;rounded(view,g,Math.sin(a)*(.30+(j%2)*.3),.13,Math.cos(a)*.36,.19,0xb6b6a0,1.2,.54,.9);}for(let j=0;j<3;j++)leaf(view,g,-.6+j*.1,.14,-.29,.18,foliage[0],j);}
 mushroom(view,g,-.68,.45,.5);view.tagged(g,{type:'source',id:m.id});return g;
}

export function woodlandLocation(view,l){const id=l.actualName??l.id;let g;
 if(id==='HAVEN'||l.id==='market'||l.kind==='house'||l.id.startsWith('workshop'))g=woodlandCottage(view,{...l,kind:l.id.startsWith('workshop')?'forge':'house'},true);
 else if(id.includes('JOURNEY')){g=new T.Group();g.position.set(l.x,view.heightAt(l.x,l.z),l.z);for(let i=0;i<5;i++)rounded(view,g,-.5+i*.25,.04,-.22+Math.sin(i)*.14,.18,0xd2bc8e,1,.15,.65);view.cylinder(g,.1,.57,-.42,.05,1.14,bark,8);const board=view.box(g,.12,.96,-.42,.83,.21,.09,0xb69a64);board.rotation.z=.08;view.cone(g,.57,.96,-.42,.15,.25,0xb69a64,3).rotation.z=-Math.PI/2;view.cylinder(g,-.5,.16,.40,.17,.30,0x98734b,12);rounded(view,g,-.5,.30,.40,.15,0xd1b988,1,.2,1);bush(view,g,.6,-.45,.45);}
 else if(['TWO_BERRY_ONE_CARD','TWO_WILD','DISCARD_ANY_THEN_DRAW_TWO_PER_CARD','COPY_BASIC_ONE_CARD','ONE_PEBBLE_THREE_CARD','ONE_TWIG_RESIN_BERRY','THREE_BERRY','TWO_RESIN_ONE_TWIG','TWO_CARDS_ONE_WILD','DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD','DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'].includes(id)||id.startsWith('F_')||id.includes('FOREST')||l.id==='forest'){g=woodlandSource(view,{...l,resource:'twig'});tree(view,g,.55,-.35,.65,2.4);mushroom(view,g,-.55,.62,.8,0xbaa56b);lantern(view,g,.68,.45,.38);}
 else {const rewards=l.reward??{},resource=id.includes('RESIN')?'resin':id.includes('PEBBLE')||id.includes('STONE')?'pebble':id.includes('TWIG')?'twig':rewards.resin?'resin':rewards.pebble||l.kind==='stone'?'pebble':rewards.twig||l.kind==='wood'?'twig':'berry';g=woodlandSource(view,{...l,resource});}
 const occupant=l.capacity===null?null:view.state.units.find(u=>l.workers?.includes(u.id)),owner=occupant?.owner??l.owner;
 const ring=view.ring(.88,.935,owner==null?0xd8c991:team[owner]??team[0],.62);ring.position.y=.08;g.add(ring);view.tagged(g,{type:'location',id:l.id});return g;
}

export function addWoodlandTerrain(view,s,p,menu,known){const trees=[],rocks=[],ferns=[],flowers=[],stems=[],caps=[],spots=[];
 const lily=[],bank=[];
 for(const t of s.tiles){if(!menu&&!known(s,p,t))continue;if(t.type==='water'){if(n(t.x,t.z)>.84)lily.push({x:t.x+.18,y:.025,z:t.z-.16,size:.65+n(t.z,t.x)*.4,r:n(t.x,t.z)*6});continue;}const besideWater=[[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dz])=>s.tiles[(t.z+dz)*WORLD.width+t.x+dx]?.type==='water');if(besideWater&&n(t.x,t.z)>.55)bank.push({x:t.x,y:view.heightAt(t.x,t.z)+.07,z:t.z,size:.25+n(t.z,t.x)*.3,r:0});const near=(s.locations??[]).some(l=>Math.hypot(l.x-t.x,l.z-t.z)<1.45)||s.buildings.some(b=>Math.hypot(b.x-t.x,b.z-t.z)<1.9)||s.sources.some(m=>Math.hypot(m.x-t.x,m.z-t.z)<.9)||(s.mode==='placement'&&Math.hypot(t.x-30,t.z-22)<3.3);if(near||t.type==='water')continue;
  const seed=n(t.x,t.z),ground=view.heightAt(t.x,t.z);
  if(t.type==='forest'){const size=.72+n(t.z,t.x)*.55;trees.push({x:t.x,z:t.z,y:ground,size,r:seed*6.28});}
  if(t.type==='rock')rocks.push({x:t.x,z:t.z,y:ground+.16,size:.5+seed*.65,r:seed*6.28});
  if(t.type==='plain'||t.type==='meadow'||t.type==='forest'){
   if(seed>.36)for(let j=0;j<3;j++){const a=j*2.1+seed*6,dist=.10+j*.045;ferns.push({x:t.x+Math.sin(a)*dist,y:ground+.12,z:t.z+Math.cos(a)*dist,r:a,size:.7+seed*.5});}
   if(seed>.84&&t.type!=='forest')for(let j=0;j<3;j++){const x=t.x+Math.sin(j*2.4)*.23,z=t.z+Math.cos(j*2.4)*.23;flowers.push({x,y:ground+.24,z,r:seed,size:.65+j*.15});}
   if(t.type==='forest'&&seed>.68){const x=t.x+.38,z=t.z+.22,size=.55+seed*.5;stems.push({x,y:ground+.10*size,z,size});caps.push({x,y:ground+.21*size,z,size});spots.push({x:x+.04,y:ground+.27*size,z,size});}
  }
 }
 const trunks=trees.map(t=>({...t,y:t.y+.65*t.size})),low=[],high=[];
 for(const t of trees){for(let j=0;j<3;j++){const a=t.r+j*2.1;low.push({...t,x:t.x+Math.sin(a)*.32*t.size,z:t.z+Math.cos(a)*.32*t.size,y:t.y+(1.40+j*.10)*t.size});}high.push({...t,y:t.y+1.98*t.size});}
 const transform=t=>({position:[t.x,t.y,t.z],scale:[t.size,t.size,t.size],rotation:[0,t.r??0,0]});
 view.instances(view.detail,new T.CylinderGeometry(.09,.14,1.3,8),view.material(bark),trunks,transform);
 view.instances(view.detail,new T.SphereGeometry(.61,10,8),view.material(foliage[0]),low,t=>({...transform(t),scale:[t.size,t.size*.78,t.size]}));
 view.instances(view.detail,new T.SphereGeometry(.63,10,8),view.material(foliage[2]),high,t=>({...transform(t),scale:[t.size,t.size*.80,t.size]}));
 view.instances(view.detail,new T.SphereGeometry(.35,9,6),view.material(0xa8aa95),rocks,t=>({...transform(t),scale:[t.size,t.size*.62,t.size*1.12]}));
 view.instances(view.detail,new T.SphereGeometry(.18,6,4),view.material(0x70924f),ferns,t=>({...transform(t),rotation:[.34,t.r,.4],scale:[t.size*.35,t.size*.27,t.size*1.5]}));
 view.instances(view.detail,new T.SphereGeometry(.07,7,5),view.material(0xe5c985),flowers,transform);
 view.instances(view.detail,new T.CylinderGeometry(.025,.032,.20,6),view.material(cream),stems,transform);
 view.instances(view.detail,new T.SphereGeometry(.14,9,6),view.material(0xc18a63),caps,t=>({...transform(t),scale:[t.size,t.size*.48,t.size]}));
 view.instances(view.detail,new T.SphereGeometry(.025,5,4),view.material(cream),spots,transform);
 view.instances(view.detail,new T.SphereGeometry(.23,10,6),view.material(0x72935a),lily,t=>({...transform(t),scale:[t.size,.055,t.size*.85]}));
 view.instances(view.detail,new T.SphereGeometry(.28,8,6),view.material(0xc3c2a5),bank,t=>({...transform(t),scale:[t.size,t.size*.5,t.size*.8]}));
 // Woodland silhouette around the existing terrain, without introducing new board obstacles
 if(s.mode==='placement'){const elder=ancientTree(view,{x:30,z:22,id:'elder',kind:'decoration'});elder.traverse(o=>{delete o.userData.pick;});view.detail.add(elder);}
 const fireflies=[];for(let i=0;i<38;i++){const x=2+n(i,4)*29,z=6+n(i,8)*32;fireflies.push({x,y:.5+n(i,11)*1.7,z,phase:n(i,19)*6.28});}
 const swarm=new T.InstancedMesh(new T.SphereGeometry(.025,5,4),view.material(0xffe7a1,{emissive:0xffd969,emissiveIntensity:1.7,transparent:true,opacity:.82,depthWrite:false}),fireflies.length);swarm.castShadow=false;swarm.userData.fireflies=fireflies;view.detail.add(swarm);view.fireflies=swarm;
 const falling=new T.InstancedMesh(new T.SphereGeometry(.085,5,4),view.material(0xd8bc66,{transparent:true,opacity:.75,depthWrite:false}),15);falling.castShadow=false;view.detail.add(falling);view.fallingLeaves=falling;
}

export function animateWoodland(view){if(!view.fireflies)return;const dummy=new T.Object3D();view.fireflies.userData.fireflies.forEach((f,i)=>{dummy.position.set(f.x+Math.sin(view.t*.24+f.phase)*.4,f.y+Math.sin(view.t*.6+f.phase)*.23,f.z+Math.cos(view.t*.20+f.phase)*.3);const size=.50+Math.pow((1+Math.sin(view.t*1.3+f.phase))*.5,2)*1.1;dummy.scale.setScalar(size);dummy.updateMatrix();view.fireflies.setMatrixAt(i,dummy.matrix);});view.fireflies.instanceMatrix.needsUpdate=true;
 if(view.fallingLeaves){for(let i=0;i<view.fallingLeaves.count;i++){const phase=(view.t*.065+i/15)%1,a=i*2.399;dummy.position.set(30+Math.sin(a)*2.3+Math.sin(phase*6+a)*.45,4.1-phase*3.8,22+Math.cos(a)*1.8+phase*.7);dummy.rotation.set(view.t*.4+a,a,Math.sin(view.t+i)*.7);dummy.scale.set(.6,.14,1.3);dummy.updateMatrix();view.fallingLeaves.setMatrixAt(i,dummy.matrix);}view.fallingLeaves.instanceMatrix.needsUpdate=true;}}

