import * as T from '../vendor/three.module.js';
import {LOCAL_CHARACTER_RECIPES} from './local-sculpt/recipes.js';
import {createGameSculpt,animateGameSculpt,hasLocalBuilding} from './local-sculpt/game-models.js';

// Every base-game card has its own silhouette and profession props
// Models are local to the supplied group so their logical city cell never moves
const C={wood:0x75503a,lightWood:0xb99160,cream:0xefddb0,wall:0xd7bf8f,leaf:0x70884d,leafLight:0x9caf62,stone:0xa8a99c,dark:0x37382e,gold:0xd5ac54,red:0xb86055,blue:0x6c91a6,purple:0x8b708e,berry:0x985774};
const teams=[0x7294aa,0xb48963,0x91a469,0xa78aab];
const V=(x,y,z)=>new T.Vector3(x,y,z);
const critters={
 Architect:{species:'beaver',coat:0x9b7959,cloth:0x63869b,prop:'plan',hat:'beret'},
 Bard:{species:'mouse',coat:0xb7946b,cloth:0x8d647f,prop:'lute',hat:'feather'},
 'Barge Toad':{species:'toad',coat:0x80945c,cloth:0xa57550,prop:'oar',hat:'straw'},
 'Chip Sweep':{species:'squirrel',coat:0xbe7c47,cloth:0x8d9d79,prop:'broom',hat:'kerchief'},
 Doctor:{species:'owl',coat:0xbaaa83,cloth:0xc9d2b6,prop:'medicine',hat:'doctor'},
 Fool:{species:'fox',coat:0xc7844f,cloth:0xa96780,prop:'jester',hat:'jester'},
 Historian:{species:'owl',coat:0x8b795c,cloth:0x9982a7,prop:'scroll',hat:'scholar'},
 Husband:{species:'mouse',coat:0xaf8d66,cloth:0x7190a1,prop:'pitchfork',hat:'straw'},
 Innkeeper:{species:'badger',coat:0x827e72,cloth:0xb56d4f,prop:'mug',hat:'cap'},
 Judge:{species:'owl',coat:0x8e8270,cloth:0x685477,prop:'gavel',hat:'wig'},
 King:{species:'mouse',coat:0xad8861,cloth:0x9d5561,prop:'sceptre',hat:'crown'},
 'Miner Mole':{species:'mole',coat:0x79776c,cloth:0x8e9b90,prop:'pick',hat:'lamp'},
 Monk:{species:'hare',coat:0xc5b69c,cloth:0x9e795b,prop:'beads',hat:'hood'},
 Peddler:{species:'hedgehog',coat:0x9b8769,cloth:0x819669,prop:'wares',hat:'cap'},
 'Postal Pigeon':{species:'pigeon',coat:0x8b9ba6,cloth:0x9eb09c,prop:'mail',hat:'post'},
 Queen:{species:'mouse',coat:0xc9b39b,cloth:0x8685a7,prop:'fan',hat:'tiara'},
 Ranger:{species:'fox',coat:0xb87949,cloth:0x63855d,prop:'bow',hat:'feather'},
 Shepherd:{species:'hare',coat:0xd0c3a6,cloth:0x9486a2,prop:'crook',hat:'kerchief'},
 Shopkeeper:{species:'squirrel',coat:0xa7734f,cloth:0xa66d50,prop:'basket',hat:'cap'},
 Teacher:{species:'owl',coat:0xc2ab84,cloth:0x7b9a94,prop:'book',hat:'glasses'},
 Undertaker:{species:'rat',coat:0x918b80,cloth:0x666779,prop:'shovel',hat:'top'},
 Wanderer:{species:'hare',coat:0xb6a088,cloth:0x8b996a,prop:'backpack',hat:'wide'},
 Wife:{species:'mouse',coat:0xc7ae8a,cloth:0xa0788d,prop:'flowers',hat:'bonnet'},
 Woodcarver:{species:'beaver',coat:0x9f7d58,cloth:0xb69161,prop:'carving',hat:'beret'}
};
const buildings={
 Castle:'twin-turrets',Cemetary:'graveyard',Chapel:'bell-spire','Clock Tower':'clock',Courthouse:'columns',Crane:'lifting-crane',Dungeon:'barred-rock',Evertree:'living-tree',Fairgrounds:'fair-tent',Farm:'farm-crops','General Store':'awning-shop',Inn:'inn-balcony',Lookout:'watch-platform',Mine:'mine-carts',Monastery:'cloister',Palace:'palace', 'Post Office':'post-bags','Resin Refinery':'copper-still',Ruins:'ruined-arch',School:'school-bell',Storehouse:'warehouse',Theatre:'curtain-stage','Twig Barge':'loaded-barge',University:'observatory'};
export const CARD_MODEL_NAMES=Object.freeze([...Object.keys(critters),...Object.keys(buildings)].sort());
export const CARD_MODEL_DEFINITIONS=Object.freeze(Object.fromEntries(CARD_MODEL_NAMES.map(name=>[name,Object.freeze(critters[name]?{kind:'critter',...(LOCAL_CHARACTER_RECIPES[name]??{family:'spiny-scholar',prop:'berry-and-quill'}),species:LOCAL_CHARACTER_RECIPES[name]?.family??'spiny-scholar'}:{kind:'building',silhouette:buildings[name]})])));

function primitives(view,g){
 const sphere=(x,y,z,r,color,sx=1,sy=1,sz=1)=>{const m=view.mesh(g,new T.SphereGeometry(r,12,8),color,x,y,z);m.scale.set(sx,sy,sz);return m;};
 const box=(x,y,z,w,h,d,color)=>view.box(g,x,y,z,w,h,d,color);
 const cylinder=(x,y,z,r,h,color,sides=12,top=r)=>view.cylinder(g,x,y,z,r,h,color,sides,top);
 const beam=(a,b,r,color=C.wood)=>view.beam(g,V(...a),V(...b),r,color);
 const cone=(x,y,z,r,h,color,sides=12)=>view.cone(g,x,y,z,r,h,color,sides);
 const disk=(x,y,z,r,color)=>{const m=cylinder(x,y,z,r,.035,color,16);m.rotation.x=Math.PI/2;return m;};
 const ring=(x,y,z,r,color,tube=.026)=>view.mesh(g,new T.TorusGeometry(r,tube,5,18),color,x,y,z);
 return {sphere,box,cylinder,beam,cone,disk,ring};
}
function record(g,obj,type,options={}){g.userData.motions??=[];g.userData.motions.push({obj,type,base:obj.position.clone(),rotation:obj.rotation.clone(),...options});return obj;}
function window(view,g,x,y,z,r=.13){const p=primitives(view,g);p.disk(x,y,z,r*1.2,C.wood);p.disk(x,y,z+.025,r,0xe6c66d);p.box(x,y,z+.05,r*1.7,.025,.025,C.wood);p.box(x,y,z+.05,.025,r*1.7,.025,C.wood);}
function door(view,g,x,y,z,w=.3,h=.56){const p=primitives(view,g);p.box(x,y+h*.37,z,w,h*.74,.05,C.wood);const arch=p.disk(x,y+h*.70,z,w/2,C.wood);arch.scale.y=.85;p.sphere(x+w*.28,y+h*.36,z+.045,.025,C.gold);}
function roof(view,g,x,y,z,w,d,color=C.leaf,h=.45){const pivot=new T.Group();pivot.position.set(x,y,z);g.add(pivot);view.roof(pivot,w,h,d,color,0);return pivot;}
function cottage(view,g,{x=0,z=0,w=1.15,d=.90,h=.88,color=C.leaf,wall=C.wall,chimney=false}={}){const p=primitives(view,g);p.box(x,h/2+.08,z,w,h,d,wall);p.box(x,.1,z,w+.14,.12,d+.12,C.wood);roof(view,g,x,h+.08,z,w+.26,d+.22,color,.46);door(view,g,x-.12,.10,z+d/2+.025,.27,.55);window(view,g,x+w*.30,h*.65,z+d/2+.032,.115);if(chimney){p.box(x+w*.32,h+.45,z-.17,.17,.60,.18,C.wood);for(let i=0;i<3;i++){const puff=p.sphere(x+w*.32,h+.9+i*.16,z-.17,.065,view.material(0xe8dcc4,{transparent:true,opacity:.22,depthWrite:false}));record(g,puff,'smoke',{phase:i/3});}}}
function barrel(view,g,x,z,size=.22,y=0){const p=primitives(view,g);p.cylinder(x,y+size*.65,z,size,size*1.3,C.lightWood,12,size*.86);for(const h of [.30,1.03])p.cylinder(x,y+size*h,z,size*1.025,.035,C.wood,12);p.cylinder(x,y+size*1.32,z,size*.86,.025,C.cream);}
function book(view,g,x,y,z,w=.3,h=.34,color=C.red){const p=primitives(view,g);p.box(x,y,z,w,h,.075,color);p.box(x+.012,y,z-.043,w*.84,h*.88,.02,C.cream);}
function envelope(view,g,x,y,z,scale=1){const p=primitives(view,g);p.box(x,y,z,.30*scale,.20*scale,.035,C.cream);p.beam([x-.14*scale,y+.09*scale,z+.023],[x,y-.01*scale,z+.023],.008);p.beam([x+.14*scale,y+.09*scale,z+.023],[x,y-.01*scale,z+.023],.008);p.disk(x,y-.02*scale,z+.032,.025*scale,C.red);}
function tuft(view,g,x,z,color=C.leaf){const p=primitives(view,g);for(let j=0;j<3;j++){const m=p.sphere(x+(j-1)*.08,.18,z,.12,color,.35,1.8,.6);m.rotation.z=(j-1)*.3;}}
function crown(view,g,tiara=false){const p=primitives(view,g),y=1.06;p.cylinder(0,y,0,.215,.10,C.gold,12);for(let j=0;j<(tiara?3:5);j++){const a=j*Math.PI*2/5;p.cone(Math.sin(a)*.17,y+.13,Math.cos(a)*.17,.055,.22,C.gold,4);p.sphere(Math.sin(a)*.17,y+.25,Math.cos(a)*.17,.035,j%2?C.berry:C.blue);} }

function makeCritter(view,name,owner){const d=critters[name],g=new T.Group(),rig=new T.Group();g.add(rig);const p=primitives(view,rig),coat=d.coat,cloth=d.cloth,sp=d.species,bird=['owl','pigeon'].includes(sp),frog=sp==='toad';
 g.userData.isCritter=true;g.userData.species=sp;g.userData.profession=d.prop;g.userData.rig=rig;
 p.sphere(0,.44,0,.26,cloth,1,1.15,.84);p.sphere(0,.72,-.01,.24,coat,1.03,1,.92);p.sphere(0,.63,-.20,.125,C.cream,1,.7,.8);
 p.cylinder(0,.31,0,.20,.13,cloth,12);for(const side of [-1,1]){const limb=new T.Group();rig.add(limb);limb.position.set(side*.12,.22,0);const q=primitives(view,limb);q.sphere(0,-.13,-.075,.09,coat,.75,.65,1.25);record(g,limb,'limb',{phase:side<0?0:Math.PI,amplitude:.32});p.sphere(side*.25,.44,-.02,.085,coat,.8,1.25,.8);}
 const eyeY=frog?.85:.78,eyeX=frog?.16:.10;
 if(frog){for(const side of [-1,1])p.sphere(side*.17,.83,-.07,.10,coat);p.sphere(0,.62,-.22,.15,coat,1.6,.5,.7);}
 for(const side of [-1,1]){p.sphere(side*eyeX,eyeY,-.21,.033,C.dark,.8,1.1,.6);p.sphere(side*eyeX-.008,eyeY+.012,-.232,.009,C.cream);}
 if(bird){p.cone(0,.67,-.29,.065,.16,C.gold,5).rotation.x=-Math.PI/2;for(const side of [-1,1]){const wing=p.sphere(side*.27,.43,.03,.18,coat,.40,1.25,.85);record(g,wing,'wing',{side});}if(sp==='owl'){for(const side of [-1,1]){p.ring(side*.10,.79,-.22,.085,C.cream,.018);p.cone(side*.15,.96,.02,.08,.18,coat,5).rotation.z=-side*.35;}}}
 else {p.sphere(0,.66,-.30,.034,sp==='mole'?0xc99f9b:C.dark,1,.75,.85);for(const side of [-1,1])if(sp==='hare'){const ear=p.sphere(side*.12,1.04,.015,.12,coat,.50,2.4,.55);ear.rotation.z=-side*.17;p.sphere(side*.12,1.06,-.04,.07,0xd4a89d,.4,2.6,.3);}else if(sp==='fox'){const ear=p.cone(side*.17,.96,.02,.12,.31,coat,4);ear.rotation.z=-side*.22;p.cone(side*.17,.97,-.035,.063,.20,C.cream,4);}else if(!['mole','hedgehog','toad'].includes(sp)){p.sphere(side*.18,.93,.015,.115,coat,1,1,.40);p.sphere(side*.18,.93,-.029,.077,0xd8aa95,1,.9,.22);}}
 if(sp==='beaver'){p.sphere(0,.17,.34,.22,0x70553d,.8,.28,1.55);for(const side of [-1,1])p.box(side*.034,.60,-.30,.048,.072,.025,C.cream);}
 if(sp==='squirrel'){p.sphere(0,.49,.34,.27,coat,.75,1.4,.70);p.sphere(0,.79,.39,.21,0xc89762,.8,1,.7);}
 if(sp==='mouse'||sp==='rat'){const tail=new T.CatmullRomCurve3([V(0,.22,.17),V(.23,.14,.36),V(.33,.07,.51),V(.12,.08,.62)]);view.mesh(rig,new T.TubeGeometry(tail,10,.024,5,false),0xb58d7a);}
 if(sp==='badger'){p.sphere(0,.80,-.185,.16,C.cream,.80,1,.28);for(const side of [-1,1])p.sphere(side*.09,.80,-.212,.08,0x56564f,.55,1.4,.23);}
 if(sp==='fox')p.sphere(0,.30,.35,.24,coat,.55,.65,1.6);
 if(sp==='hedgehog'){p.sphere(0,.52,.16,.29,0x6f6150,1,1,.6);for(let j=0;j<11;j++){const a=j*2.4;p.cone(Math.sin(a)*.24,.43+(j%4)*.1,.16+Math.cos(a)*.15,.04,.18,0xbaa17b,5).rotation.z=Math.sin(a)*.5;}}
 // Each card has a distinct costume and working implement, independent of owner colour
 p.box(-.21,.37,.10,.14,.16,.10,teams[owner]??teams[0]);
 const hat=d.hat;
 if(hat==='crown'||hat==='tiara')crown(view,rig,hat==='tiara');
 else if(hat==='straw'||hat==='wide'){p.cylinder(0,.97,0,hat==='wide'?.36:.31,.045,hat==='wide'?C.leaf:C.lightWood);p.cone(0,1.06,0,.22,.22,hat==='wide'?C.leaf:C.lightWood);p.cylinder(0,.985,0,.20,.05,C.wood);}
 else if(hat==='top'){p.cylinder(0,.99,0,.30,.045,C.dark);p.cylinder(0,1.15,0,.19,.33,C.dark);p.cylinder(0,1.02,0,.195,.06,C.purple);}
 else if(hat==='scholar'){p.cylinder(0,1.0,0,.19,.14,C.purple,8);p.box(0,1.09,0,.49,.04,.39,C.purple);p.beam([.22,1.08,0],[.25,.90,0],.015,C.gold);}
 else if(hat==='jester'){for(const side of [-1,1]){const h=p.cone(side*.11,1.09,0,.15,.35,side<0?C.red:C.purple,7);h.rotation.z=-side*.65;p.sphere(side*.24,1.22,0,.045,C.gold);}}
 else if(hat==='hood'){p.sphere(0,.83,.10,.28,cloth,1.1,1.2,.65);}
 else if(hat==='bonnet'){p.sphere(0,.91,.07,.27,C.cream,1.15,.8,.75);p.sphere(.21,.85,-.01,.075,C.red);}
 else if(hat==='wig'){for(const side of [-1,1])for(let j=0;j<3;j++)p.sphere(side*.22,.88-j*.07,.0,.075,C.cream);}
 else if(hat==='glasses'){for(const side of [-1,1])p.ring(side*.10,.78,-.245,.074,C.gold,.012);p.beam([-.03,.78,-.245],[.03,.78,-.245],.009,C.gold);}
 else {p.sphere(0,.99,.02,.24,hat==='doctor'?C.cream:cloth,1,.38,.85);if(hat==='lamp'||hat==='doctor'){p.disk(0,1.00,-.20,.085,C.gold);p.disk(0,1.00,-.225,.055,hat==='lamp'?0xf2d986:0xd1ddd2);}if(hat==='feather'){const f=p.sphere(.17,1.12,.02,.12,C.red,.30,1.6,.45);f.rotation.z=-.35;}if(hat==='post')p.box(0,.98,-.16,.32,.045,.18,C.blue);}
 addProfession(view,rig,d.prop,g);
 record(g,rig,'breath',{phase:CARD_MODEL_NAMES.indexOf(name)*.72});return g;
}
function addProfession(view,g,prop,root){const p=primitives(view,g);
 const staff=(top=1.25,color=C.wood)=>p.beam([.33,.04,-.12],[.33,top,-.12],.024,color);
 switch(prop){
 case 'plan':{const plan=p.box(0,.43,-.36,.50,.34,.035,0xd4dbbf);plan.rotation.x=-.45;for(let j=0;j<3;j++)p.box(-.12+j*.12,.44,-.39,.025,.18,.012,C.blue);p.beam([.28,.28,-.20],[.28,.67,-.20],.018,C.gold);break;}
 case 'lute':{p.sphere(.04,.40,-.29,.20,C.lightWood,.8,1,.34);p.disk(.04,.42,-.36,.055,C.wood);p.beam([.06,.49,-.31],[.27,.85,-.31],.045,C.wood);for(let j=0;j<3;j++)p.beam([.005+j*.022,.26,-.37],[.22+j*.015,.80,-.35],.004,C.cream);break;}
 case 'oar':{staff(1.40);const blade=p.sphere(.33,.23,-.12,.17,C.lightWood,.65,1.65,.15);blade.rotation.z=.1;break;}
 case 'broom':{staff();for(let j=0;j<6;j++)p.beam([.28+j*.025,.30,-.12],[.21+j*.055,.05,-.12],.018,C.lightWood);break;}
 case 'medicine':p.box(.34,.34,-.16,.21,.20,.16,C.cream);p.box(.34,.35,-.25,.13,.037,.01,C.red);p.box(.34,.35,-.26,.035,.13,.01,C.red);p.sphere(-.31,.49,-.12,.065,C.blue);break;
 case 'jester':staff(.86,C.gold);p.sphere(.33,.92,-.12,.09,C.red);break;
 case 'scroll':{for(const side of [-1,1]){const s=p.cylinder(side*.18,.45,-.32,.05,.31,C.cream);s.rotation.z=Math.PI/2;}p.box(0,.45,-.32,.35,.28,.04,C.cream);for(let j=0;j<3;j++)p.box(-.01,.39+j*.05,-.35,.22,.012,.01,C.wood);break;}
 case 'pitchfork':staff();p.beam([.22,1.0,-.12],[.44,1.0,-.12],.020,C.wood);for(let j=0;j<3;j++)p.beam([.22+j*.11,1.0,-.12],[.22+j*.11,1.25,-.12],.016,C.wood);break;
 case 'mug':p.cylinder(.32,.44,-.20,.10,.22,C.lightWood,10);p.ring(.42,.44,-.20,.075,C.wood,.023).rotation.y=Math.PI/2;p.sphere(.32,.56,-.20,.095,C.cream,1,.2,1);break;
 case 'gavel':p.beam([.27,.33,-.22],[.40,.66,-.22],.022,C.wood);p.cylinder(.40,.67,-.22,.072,.22,C.lightWood,10).rotation.z=Math.PI/2;p.box(-.26,.35,-.26,.23,.055,.19,C.lightWood);break;
 case 'sceptre':staff(1.10,C.gold);p.sphere(.33,1.13,-.12,.09,C.berry);p.sphere(.33,1.22,-.12,.045,C.gold);p.sphere(-.29,.48,-.16,.10,C.gold);break;
 case 'pick':p.beam([.29,.22,-.14],[.42,.93,-.14],.028,C.wood);p.beam([.22,.91,-.14],[.60,1.0,-.14],.045,C.stone);break;
 case 'beads':for(let j=0;j<8;j++){const a=j*Math.PI*2/8;p.sphere(.29+Math.sin(a)*.085,.44+Math.cos(a)*.11,-.22,.024,C.wood);}book(view,g,-.26,.43,-.22,.20,.25,C.wood);break;
 case 'wares':{p.box(0,.44,.31,.48,.49,.21,C.lightWood);for(let j=0;j<3;j++)p.sphere(-.15+j*.15,.75,.31,.08,[C.berry,C.blue,C.gold][j]);p.cylinder(-.32,.28,.23,.10,.28,C.wood);break;}
 case 'mail':envelope(view,g,0,.39,-.33,1.05);p.box(.28,.34,.12,.19,.30,.20,C.wood);break;
 case 'fan':for(let j=0;j<5;j++){const blade=p.sphere(.26+Math.sin(j*.35)*.15,.47+Math.cos(j*.35)*.1,-.25,.12,j%2?C.cream:C.purple,.38,1,.12);blade.rotation.z=-j*.35;}break;
 case 'bow':{const curve=new T.CatmullRomCurve3([V(.33,.20,-.20),V(.51,.60,-.20),V(.33,1.02,-.20)]);view.mesh(g,new T.TubeGeometry(curve,12,.022,5,false),C.wood);p.beam([.33,.20,-.20],[.33,1.02,-.20],.007,C.cream);p.beam([-.23,.42,.24],[-.23,.95,.24],.045,C.wood);break;}
 case 'crook':staff(1.25);const hook=p.ring(.40,1.25,-.12,.09,C.wood,.023);hook.rotation.z=.8;p.sphere(-.25,.34,-.18,.13,C.cream,1,.8,1.2);break;
 case 'basket':p.cylinder(0,.35,-.33,.21,.24,C.lightWood,10,.25);p.ring(0,.52,-.33,.20,C.wood,.022);for(let j=0;j<5;j++)p.sphere(-.14+(j%3)*.12,.50+(j>2?.06:0),-.33+(j%2)*.08,.06,C.berry);break;
 case 'book':book(view,g,0,.45,-.32,.43,.37,C.blue);p.box(-.07,.46,-.37,.10,.20,.012,C.cream);p.box(.08,.46,-.37,.10,.20,.012,C.cream);break;
 case 'shovel':staff(1.27);p.sphere(.33,.16,-.12,.16,C.stone,.70,1.3,.17);p.ring(.33,1.30,-.12,.08,C.wood,.023);break;
 case 'backpack':{p.box(0,.47,.29,.35,.47,.24,C.wood);p.cylinder(0,.78,.30,.10,.48,C.cream,10).rotation.z=Math.PI/2;staff(1.15);p.sphere(.31,.36,.01,.09,C.gold);break;}
 case 'flowers':for(let j=0;j<5;j++){const x=-.15+j*.075,y=.55+(j%2)*.09;p.beam([0,.28,-.28],[x,y,-.28],.012,C.leaf);p.sphere(x,y,-.28,.07,j%2?C.cream:C.red);p.sphere(x,y+.015,-.33,.023,C.gold);}break;
 case 'carving':p.box(.04,.34,-.32,.36,.13,.22,C.lightWood);p.sphere(.04,.49,-.32,.12,C.lightWood,.7,1.4,.6);p.beam([.29,.31,-.20],[.34,.69,-.20],.021,C.wood);p.cone(.34,.72,-.20,.04,.12,C.stone,4);break;
 }
}

function makeBuilding(view,name){const g=new T.Group(),p=primitives(view,g);g.userData.isCritter=false;g.userData.silhouette=buildings[name];
 // A grassy, irregular foundation makes the miniature read as a place, not a toy block
 p.sphere(0,.04,0,.85,C.leaf,1,.12,.86);p.cylinder(0,.06,0,.75,.06,C.lightWood,24);tuft(view,g,-.70,.40);
 switch(name){
 case 'Castle':{cottage(view,g,{w:1.13,h:1.0,color:C.blue});for(const x of [-.58,.58]){p.cylinder(x,.78,-.10,.26,1.45,C.wall,12);p.cone(x,1.69,-.10,.36,.48,C.blue);window(view,g,x,1.02,.155,.09);}p.beam([.58,1.90,-.10],[.58,2.2,-.10],.015,C.wood);p.box(.69,2.13,-.10,.22,.14,.025,C.red);break;}
 case 'Cemetary':{p.sphere(0,.09,0,.72,0x7b8c6a,1,.15,.85);for(let j=0;j<5;j++){const x=(j%3-1)*.42,z=j<3?-.25:.31;p.box(x,.24,z,.24,.34,.13,C.stone);p.sphere(x,.41,z,.12,C.stone,1,.8,.55);p.box(x,.28,z-.07,.10,.02,.01,C.wood);}for(const x of [-.65,.65])p.cylinder(x,.42,.48,.055,.75,C.wood);p.beam([-.65,.80,.48],[0,1.04,.48],.04);p.beam([0,1.04,.48],[.65,.80,.48],.04);break;}
 case 'Chapel':{cottage(view,g,{w:.92,d:1.15,color:C.purple,h:.82});p.box(-.34,1.12,-.30,.38,.90,.40,C.wall);p.cone(-.34,1.77,-.30,.34,.54,C.purple,4);p.ring(-.34,1.32,-.08,.105,C.wood);p.cone(-.34,1.29,-.06,.073,.12,C.gold);p.beam([-.34,1.97,-.30],[-.34,2.22,-.30],.018,C.gold);p.beam([-.43,2.14,-.30],[-.25,2.14,-.30],.018,C.gold);break;}
 case 'Clock Tower':{p.cylinder(0,.91,0,.38,1.75,C.wall,10);p.cylinder(0,1.61,0,.47,.12,C.wood);p.cone(0,1.97,0,.55,.65,C.leaf);p.disk(0,1.28,.385,.255,C.wood);p.disk(0,1.28,.41,.215,C.cream);p.beam([0,1.28,.44],[0,1.45,.44],.012);p.beam([0,1.28,.44],[.13,1.22,.44],.012);for(let j=0;j<4;j++){const a=j*Math.PI/2;p.sphere(Math.sin(a)*.18,1.28+Math.cos(a)*.18,.44,.019,C.gold);}door(view,g,0,.1,.39);break;}
 case 'Courthouse':{p.box(0,.18,0,1.55,.18,1.05,C.stone);p.box(0,.70,-.25,1.25,.9,.55,C.wall);for(const x of [-.55,-.18,.18,.55])p.cylinder(x,.68,.34,.075,.97,C.cream);roof(view,g,0,1.15,0,1.65,1.20,C.red,.40);door(view,g,0,.25,.05,.37,.65);p.beam([-.18,1.63,.0],[.18,1.63,.0],.018,C.gold);p.beam([0,1.49,.0],[0,1.74,.0],.02,C.gold);break;}
 case 'Crane':{for(const x of [-.43,.43])p.beam([x,.10,-.35],[0,1.63,0],.065);p.beam([-.55,1.55,0],[.85,1.55,0],.065);p.beam([-.55,1.55,0],[0,1.90,0],.035);p.beam([0,1.90,0],[.85,1.55,0],.035);const rope=p.beam([.72,1.55,0],[.72,.55,0],.012,C.cream);record(g,rope,'sway',{phase:.5});p.ring(.72,.47,0,.10,C.wood,.03);p.cylinder(-.38,.27,.20,.22,.29,C.wood,12).rotation.z=Math.PI/2;for(let j=0;j<3;j++)p.box(-.25+j*.23,.13,.45,.18,.18,.40,C.lightWood);break;}
 case 'Dungeon':{p.sphere(0,.52,-.04,.75,0x929989,1,.8,.72);p.box(0,.36,.51,.63,.56,.06,C.dark);for(let j=0;j<5;j++)p.cylinder(-.24+j*.12,.36,.56,.021,.58,C.stone,6);p.beam([-.40,.73,.48],[.40,.73,.48],.065,C.stone);p.sphere(-.56,.27,.36,.23,C.stone);p.cylinder(.59,.40,.26,.045,.60,C.wood);p.sphere(.59,.74,.26,.09,C.gold,.6,1.5,.6);break;}
 case 'Evertree':{p.cylinder(0,1.00,0,.30,1.90,C.wood,10,.20);for(let j=0;j<5;j++){const a=j*2.4;p.beam([0,.70,0],[Math.sin(a)*.72,1.50,Math.cos(a)*.62],.08);p.sphere(Math.sin(a)*.62,1.72+(j%2)*.24,Math.cos(a)*.53,.55,j%2?C.leaf:C.leafLight,1,.72,1);}door(view,g,0,.10,.29,.27,.52);p.sphere(0,2.18,0,.65,C.leafLight,1,.60,1);for(let j=0;j<4;j++)p.beam([0,.2,0],[Math.sin(j*1.57)*.68,.08,Math.cos(j*1.57)*.68],.09);break;}
 case 'Fairgrounds':{p.cylinder(0,.49,0,.68,.73,C.cream,12);p.cone(0,1.18,0,.85,.70,C.red,12);for(let j=0;j<6;j++){const a=j*Math.PI/3;p.beam([Math.sin(a)*.66,.15,Math.cos(a)*.66],[Math.sin(a)*.66,.91,Math.cos(a)*.66],.035,C.wood);}p.box(0,.48,.68,.33,.59,.05,C.red);p.cylinder(0,1.63,0,.025,.32,C.wood);p.box(.13,1.72,0,.25,.15,.025,C.gold);break;}
 case 'Farm':{cottage(view,g,{x:-.24,z:-.15,w:.80,d:.72,h:.72,color:C.red,wall:0xc5ad77});p.box(.48,.10,.28,.42,.08,.85,C.wood);for(let j=0;j<6;j++){const z=-.07+j*.14;p.beam([.37,.15,z],[.37,.41,z],.016,C.leaf);p.sphere(.37,.43,z,.065,C.berry);p.beam([.60,.15,z],[.60,.35,z],.015,C.leaf);}for(let j=0;j<3;j++)p.beam([-.75,.20,.35+j*.15],[-.75,.55,.35+j*.15],.02);p.beam([-.75,.42,.30],[-.75,.42,.72],.025);break;}
 case 'General Store':{cottage(view,g,{w:1.25,color:C.leaf,h:.80});p.box(0,.96,.68,1.45,.075,.53,C.cream);for(let j=0;j<5;j++)p.box(-.60+j*.30,.97,.68,.15,.085,.54,C.red);for(const x of [-.62,.62])p.cylinder(x,.47,.90,.025,.89,C.wood);p.box(0,.28,.75,.91,.34,.30,C.lightWood);for(let j=0;j<5;j++)p.sphere(-.31+j*.15,.49,.75,.075,[C.berry,C.gold,C.leaf][j%3]);break;}
 case 'Inn':{cottage(view,g,{w:1.22,d:1.0,h:1.10,color:C.red,chimney:true});p.box(0,.68,.68,1.25,.10,.42,C.lightWood);for(let j=0;j<5;j++)p.cylinder(-.55+j*.27,.86,.83,.018,.35,C.wood);p.beam([-.60,1.03,.83],[.60,1.03,.83],.025);p.cylinder(-.79,.88,.16,.028,.62,C.wood);p.box(-.79,1.11,.16,.33,.26,.06,C.gold);barrel(view,g,.72,.38,.16);break;}
 case 'Lookout':{for(const x of [-.42,.42])for(const z of [-.35,.35])p.cylinder(x,.73,z,.055,1.35,C.wood);p.box(0,1.31,0,1.12,.12,.99,C.lightWood);roof(view,g,0,1.83,0,1.30,1.08,C.leaf,.40);for(const x of [-.46,.46])p.cylinder(x,1.61,.35,.03,.50,C.wood);for(let j=0;j<6;j++)p.box(0,.20+j*.20,.48-j*.08,.41,.045,.065,C.lightWood);p.beam([-.24,.12,.61],[-.24,1.35,.13],.025);p.beam([.24,.12,.61],[.24,1.35,.13],.025);break;}
 case 'Mine':{p.sphere(0,.55,-.09,.77,C.stone,1,.78,.72);p.box(0,.35,.50,.60,.58,.07,C.dark);for(const x of [-.35,.35])p.box(x,.38,.53,.09,.72,.12,C.wood);p.box(0,.73,.53,.79,.12,.16,C.wood);for(const x of [-.22,.22])p.beam([x,.10,.50],[x,.10,1.0],.022,C.stone);p.box(.15,.24,.84,.43,.28,.35,C.wood);for(const x of [-.03,.33])p.cylinder(x,.14,.84,.085,.06,C.dark,10).rotation.z=Math.PI/2;for(let j=0;j<3;j++)p.sphere(.03+j*.11,.41,.84,.10,C.stone);break;}
 case 'Monastery':{cottage(view,g,{x:-.20,w:.92,d:.95,h:.95,color:C.wood});p.box(.47,.49,.09,.31,.81,.81,C.wall);for(let j=0;j<3;j++){p.cylinder(.47,.45,-.20+j*.27,.04,.70,C.cream);p.sphere(.47,.80,-.20+j*.27,.15,C.wood,1,.18,.7);}p.cylinder(-.35,1.20,-.23,.18,.50,C.wall);p.cone(-.35,1.54,-.23,.26,.30,C.wood);p.ring(-.35,1.30,-.04,.08,C.gold,.02);break;}
 case 'Palace':{cottage(view,g,{w:1.35,h:1.05,color:C.purple});for(const x of [-.66,.66]){p.cylinder(x,.90,-.10,.20,1.65,C.cream);p.sphere(x,1.82,-.10,.29,C.purple,1,1.2,1);p.cone(x,2.07,-.10,.07,.20,C.gold);}p.box(0,1.40,0,.45,.34,.52,C.cream);p.cone(0,1.81,0,.40,.48,C.purple,8);p.sphere(0,2.08,0,.055,C.gold);break;}
 case 'Post Office':{cottage(view,g,{w:1.2,color:C.blue,h:.84});envelope(view,g,.02,.98,.54,1.4);p.cylinder(-.67,.43,.53,.045,.76,C.wood);p.box(-.67,.76,.53,.33,.29,.23,C.blue);p.box(-.67,.80,.66,.23,.025,.015,C.dark);for(let j=0;j<2;j++)p.sphere(.64,.18,.25+j*.28,.17,C.cream,.85,1.25,.85);break;}
 case 'Resin Refinery':{cottage(view,g,{x:-.28,z:-.15,w:.75,h:.73,color:C.leaf,chimney:true});p.sphere(.39,.45,.19,.29,0xba874d,1,1.05,1);p.cone(.39,.79,.19,.16,.30,0xb27d42);p.beam([.39,.91,.19],[.62,.91,.19],.035,C.gold);p.beam([.62,.91,.19],[.62,.37,.19],.035,C.gold);barrel(view,g,.59,.45,.15);p.sphere(.60,.67,.19,.055,C.gold);break;}
 case 'Ruins':{for(const x of [-.48,.48]){p.box(x,.42,0,.25,.70,.36,C.stone);p.box(x,.82,0,.29,.13,.40,C.stone);}const arch=p.ring(0,.79,0,.48,C.stone,.10);arch.scale.y=.75;for(let j=0;j<5;j++)p.box(-.55+j*.25,.11,.40,.17,.12,.25,j%2?C.wood:C.stone).rotation.y=j*.8;tuft(view,g,.53,-.31);break;}
 case 'School':{cottage(view,g,{w:1.20,h:.82,color:C.red});p.box(0,1.25,-.10,.35,.34,.33,C.wall);p.cone(0,1.56,-.10,.29,.28,C.red,4);p.cone(0,1.26,.09,.08,.13,C.gold);p.box(-.52,.38,.78,.35,.42,.045,C.wood);p.box(-.52,.39,.81,.29,.33,.02,0x4f6e5c);book(view,g,.56,.27,.64,.22,.23,C.blue);break;}
 case 'Storehouse':{cottage(view,g,{w:1.40,d:1.10,h:.83,color:C.wood});p.box(0,.43,.57,.62,.65,.05,C.lightWood);for(const x of [-.17,.17])p.beam([x-.13,.17,.61],[x+.13,.69,.61],.025);barrel(view,g,-.76,.32,.17);p.box(.74,.22,.34,.31,.32,.31,C.lightWood);p.box(.74,.43,.34,.28,.07,.29,C.wood);break;}
 case 'Theatre':{p.box(0,.18,0,1.60,.22,1.03,C.wood);p.box(0,.80,-.36,1.50,1.10,.15,C.wall);p.box(0,1.36,-.20,1.65,.14,.42,C.gold);for(const side of [-1,1])p.sphere(side*.55,.83,-.10,.36,C.red,.55,1.55,.26);p.box(0,.73,-.30,.60,.85,.02,0x5d5869);for(let j=0;j<5;j++)p.sphere(-.55+j*.27,.29,.47,.035,C.gold);p.cone(0,1.59,-.18,.18,.29,C.gold,5);break;}
 case 'Twig Barge':{const hull=p.sphere(0,.24,0,.79,C.wood,1.1,.40,.60);p.box(0,.42,0,1.20,.07,.65,C.lightWood);for(let j=0;j<5;j++){const l=p.cylinder(-.44+j*.22,.55,0,.075,.78,C.lightWood,8);l.rotation.x=Math.PI/2;p.disk(-.44+j*.22,.55,.40,.054,C.cream);}p.beam([-.56,.44,.20],[-.56,1.18,.20],.028);p.beam([-.56,1.18,.20],[.23,1.18,.20],.025);p.box(-.17,.96,.20,.67,.35,.02,C.cream);p.beam([.66,.40,-.16],[.88,.22,-.16],.04);break;}
 case 'University':{cottage(view,g,{x:-.20,w:1.05,h:1.0,color:C.blue});p.cylinder(.51,.85,-.13,.31,1.4,C.wall);p.sphere(.51,1.65,-.13,.39,C.blue,1,.60,1);p.cylinder(.51,1.72,-.13,.08,.16,C.gold);p.beam([.49,1.70,.0],[.76,1.92,.20],.085,C.gold);p.ring(.77,1.93,.21,.09,C.wood,.025);book(view,g,-.62,.38,.68,.22,.25,C.red);book(view,g,-.36,.38,.68,.20,.25,C.blue);break;}
 }
 return g;
}

export function createCardMiniature(view,cardName,owner=0){
 if(!CARD_MODEL_DEFINITIONS[cardName])throw new Error('Unknown base-game card miniature: '+cardName);
 if(critters[cardName]||hasLocalBuilding(cardName))return createGameSculpt(cardName,{critter:!!critters[cardName]});
 const group=makeBuilding(view,cardName);
 if(!group.userData.isCritter){const pole=view.cylinder(group,-.72,.63,.48,.025,.95,0x765139,7);const lamp=view.mesh(group,new T.SphereGeometry(.095,8,6),view.material(0xffd28a,{emissive:0xffa64a,emissiveIntensity:.38}),-.72,.96,.48);lamp.userData.buildingLamp={phase:cardName.length*.8};const sign=view.box(group,-.60,.76,.48,.20,.17,.035,0xcbaa68);sign.userData.buildingSign={z:sign.rotation.z,phase:cardName.length};}
 group.userData.cardName=cardName;group.userData.modelKey=cardName;group.userData.modelVersion=1;return group;
}

export function animateCardMiniature(group,time,dt=0){
 if(group.userData.localSculpt||group.userData.acceptedBuilding){animateGameSculpt(group,time);return;}
 group.traverse(o=>{if(o.userData.buildingLamp)o.material.emissiveIntensity=.34+Math.sin(time*1.7+o.userData.buildingLamp.phase)*.18;if(o.userData.buildingSign)o.rotation.z=o.userData.buildingSign.z+Math.sin(time*1.3+o.userData.buildingSign.phase)*.10;});
 const moving=group.userData.walking===true||group.userData.moving===true;
 for(const motion of group.userData.motions??[]){const {obj,base,rotation}=motion,phase=time+(motion.phase??0);
  if(motion.type==='breath'){obj.position.y=base.y+Math.sin(phase*2.5)*.012;obj.rotation.z=rotation.z+Math.sin(phase*.8)*.018;}
  if(motion.type==='limb')obj.rotation.x=rotation.x+Math.sin(phase*(moving?9:2))*(moving?motion.amplitude:.015);
  if(motion.type==='wing')obj.rotation.z=rotation.z+motion.side*(Math.sin(phase*3.2)*.06+.03);
  if(motion.type==='sway')obj.rotation.z=rotation.z+Math.sin(phase*1.8)*.035;
  if(motion.type==='smoke'){const progress=(time*.25+(motion.phase??0))%1;obj.position.copy(base).add(V(Math.sin(time+progress)*.04,progress*.55,0));obj.scale.setScalar(.70+progress*1.7);obj.material.opacity=(1-progress)*.16;}
 }
}
