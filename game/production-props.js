import * as T from '../vendor/three.module.js';

const TEAM_COLORS=[0x558dc1,0xdf8b4a,0xd19b63,0xb39bb7];
const GROUND_Y=.18,SEAT_TOP=.31;
const TYPES=new Set(['TWIG','RESIN','PEBBLE','BERRY','CARD','VP','ANY']);
const LAYOUTS=[[],[{x:.72,z:1.02}],[{x:.27,z:1.13},{x:1.03,z:.84}],[{x:.12,z:1.15},{x:.79,z:1.02},{x:1.32,z:.59}]];
const vec=(x,y,z)=>new T.Vector3(x,y,z);

// Seats describe display capacity only; the rules engine remains responsible for admission
export function workerSeats(location){
 const capacity=location?.capacity;
 const count=capacity===null?3:Number.isFinite(capacity)?Math.min(3,Math.max(0,Math.floor(capacity))):0;
 return LAYOUTS[count].map(p=>({...p}));
}

export function workerSeatPosition(location,index){
 const seats=workerSeats(location),validIndex=Number.isInteger(index)&&index>=0;
 const seatIndex=validIndex&&seats.length?index%seats.length:0;
 const seat=seats[seatIndex]??{x:0,z:0};
 return {x:(location?.x??0)+seat.x,z:(location?.z??0)+seat.z,seatIndex,yOffset:SEAT_TOP,hidden:!validIndex||index>=seats.length};
}

function round(view,g,x,y,z,r,color,sx=1,sy=1,sz=1){
 const mesh=view.mesh(g,new T.SphereGeometry(r,12,8),color,x,y,z);
 mesh.scale.set(sx,sy,sz);return mesh;
}

function resourceModel(view,type){
 const g=new T.Group();g.userData.resourceType=type;
 if(type==='TWIG'){
  view.beam(g,vec(-.20,.07,.09),vec(.21,.09,-.08),.064,0x75412b);
  view.beam(g,vec(.01,.08,0),vec(.09,.13,.16),.034,0x9a6138);
  const cut=view.cylinder(g,.21,.09,-.08,.048,.016,0xf0c88c,10);cut.rotation.z=Math.PI/2;
 }else if(type==='RESIN'){
  const amber=view.material(0xec9727,{roughness:.28,metalness:.08});
  const drop=view.mesh(g,new T.IcosahedronGeometry(.20,0),amber,0,.19,0);drop.scale.set(.9,1.05,.9);
  const tip=view.mesh(g,new T.ConeGeometry(.11,.17,7),amber,0,.35,0);tip.rotation.z=-.18;
  round(view,g,-.055,.24,.10,.033,0xffe79b,.6,1.2,.5);
 }else if(type==='PEBBLE'){
  const rock=view.mesh(g,new T.SphereGeometry(.19,16,10),view.material(0x7f8194,{roughness:.4}),0,.13,0);rock.scale.set(1.22,.78,.86);rock.rotation.set(.15,.4,.18);
  round(view,g,-.065,.23,.08,.055,0xc9c7d2,1.3,.3,.7);
 }else if(type==='BERRY'){
  round(view,g,0,.16,0,.17,view.material(0xa72983,{roughness:.3}),1,.95,1);
  view.beam(g,vec(0,.27,0),vec(.03,.34,.01),.018,0x6a653a);
  const leaf=round(view,g,.08,.29,.01,.085,0x70934b,1,.18,.5);leaf.rotation.z=.24;
  round(view,g,-.06,.23,.12,.038,0xf18bc7,.7,1,.3);
 }else if(type==='CARD'){
  const paper=view.box(g,0,.042,0,.27,.05,.37,0xf1dfb7);paper.rotation.y=-.08;
  const back=view.box(g,0,.071,0,.235,.012,.335,0x254e3d);back.rotation.y=-.08;
  const leaf=round(view,g,0,.082,0,.077,0xb4a567,.7,.08,1.3);leaf.rotation.y=.48;
 }else if(type==='VP'){
  view.cylinder(g,0,.04,0,.15,.065,view.material(0xe7bf59,{roughness:.43,metalness:.3}),20);
  const rim=view.mesh(g,new T.TorusGeometry(.115,.009,4,20),0xffdfa0,0,.077,0);rim.rotation.x=-Math.PI/2;
  const crest=view.mesh(g,new T.CircleGeometry(.045,5),0xffe7a0,0,.079,0);crest.rotation.x=-Math.PI/2;
 }else if(type==='ANY'){
  // A basket of different goods indicates a choice, not four guaranteed resource rewards
  view.cylinder(g,0,.09,0,.22,.18,0xa97a48,12,.25);
  const rim=view.mesh(g,new T.TorusGeometry(.24,.025,5,16),0xd8ae75,0,.185,0);rim.rotation.x=-Math.PI/2;
  for(const [resource,x,z]of [['TWIG',-.09,-.07],['RESIN',.08,-.07],['PEBBLE',-.08,.09],['BERRY',.09,.09]]){
   const mini=resourceModel(view,resource);mini.scale.setScalar(.55);mini.position.set(x,.16,z);mini.userData.choiceSample=true;g.add(mini);
  }
 }
 return g;
}

function rewardSpecs(location){
 const explicit=Object.entries(location.rewardIcons??{}).filter(([type,n])=>TYPES.has(type)&&Number.isFinite(n)&&n>0).map(([type,amount])=>({type,amount,previewOnly:false}));
 if(explicit.length)return explicit;
 const name=location.actualName??location.id??'';
 if(name==='TWO_WILD')return [{type:'ANY',amount:2,previewOnly:false}];
 if(name==='TWO_CARDS_ONE_WILD')return [{type:'CARD',amount:2,previewOnly:false},{type:'ANY',amount:1,previewOnly:false}];
 // Variable exchanges show the goods involved; their actual quantities stay in the hover recipe
 if(name==='HAVEN'||name==='DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD')return [{type:'CARD',previewOnly:true},{type:'ANY',previewOnly:true}];
 if(name.includes('JOURNEY'))return [{type:'CARD',previewOnly:true},{type:'VP',previewOnly:true}];
 if(name.includes('DRAW')||name.includes('DISCARD')||name.includes('COPY'))return [{type:'CARD',previewOnly:true}];
 return [];
}

function addSeat(view,g,location,index,position){
 const seat=new T.Group();seat.position.set(position.x,GROUND_Y,position.z);
 const workerId=location.workers?.[index],occupied=workerId!==undefined;
 const owner=view.state?.units?.find(u=>u.id===workerId)?.owner;
 seat.userData.workerSeat={index,occupied,workerId:workerId??null};
 view.cylinder(seat,0,.055,0,.235,.11,0x79513a,10,.21);
 view.cylinder(seat,0,.12,0,.21,.02,occupied?(TEAM_COLORS[owner]??0xb88953):0xe1bd82,14);
 const grain=view.mesh(seat,new T.TorusGeometry(.135,.009,4,18),occupied?0xf3dec0:0xa47b4c,0,.133,0);grain.rotation.x=-Math.PI/2;
 for(let j=0;j<5;j++){
  const a=j*Math.PI*2/5;
  view.beam(seat,vec(Math.sin(a)*.22,.015,Math.cos(a)*.22),vec(Math.sin(a)*.207,.10,Math.cos(a)*.207),.014,0x5e402d);
 }
 g.add(seat);
}

export function addProductionProps(view,group,location){
 const props=new T.Group();props.name='production-props';props.userData.productionProps=true;
 const specs=rewardSpecs(location).slice(0,3);
 const anchors=specs.length===1?[{x:-.76,z:.82}]:specs.length===2?[{x:-1.05,z:.69},{x:-.50,z:1.16}]:[{x:-1.20,z:.47},{x:-.92,z:1.04},{x:-.38,z:1.25}];
 for(let i=0;i<specs.length;i++){
  const spec=specs[i],pile=new T.Group(),count=spec.previewOnly?1:Math.max(1,Math.min(3,Math.floor(spec.amount)));
  pile.position.set(anchors[i].x,GROUND_Y,anchors[i].z);
  pile.userData.rewardDisplay={type:spec.type,amount:spec.amount??null,displayedCount:count,previewOnly:spec.previewOnly};
  // Large saturated silhouettes remain readable at overview distance, without a HUD plaque
  const scale=(specs.length===1?2.25:specs.length===2?1.85:1.65)*(spec.type==='ANY'&&count>1?.74:1);
  for(let j=0;j<count;j++){
   const mini=resourceModel(view,spec.type);mini.scale.setScalar(scale);
   if(spec.type==='CARD'||spec.type==='VP')mini.position.set((j-1)*.045,j*.09,(j-1)*.025);
   else if(spec.type==='TWIG'&&count>1){mini.position.set(0,j*.07,(j-(count-1)/2)*.21);mini.rotation.y=(j-1)*.14;}
   else if(count>1){mini.position.set((j-(count-1)/2)*(spec.type==='ANY'?.63:.35),0,(j%2)*.15-.06);mini.rotation.y=(j-1)*.22;}
   pile.add(mini);
  }
  props.add(pile);
 }
 workerSeats(location).forEach((position,index)=>addSeat(view,props,location,index,position));
 // Resource identity and occupied team colours must survive seasonal landscape recolouring
 props.traverse(object=>{
  object.userData.seasonInvariant=true;
  const materials=object.material?(Array.isArray(object.material)?object.material:[object.material]):[];
  for(const material of materials)material.userData.seasonInvariant=true;
 });
 group.add(props);return props;
}
