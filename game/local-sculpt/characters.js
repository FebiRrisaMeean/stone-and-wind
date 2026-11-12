import * as T from '../../vendor/three.module.js'
import {part, add, ell, tube, leaf, sculpt, surface, batch} from './geometry.js'
import {LOCAL_CHARACTER_RECIPES, LOCAL_CHARACTER_NAMES} from './recipes.js'
export {LOCAL_CHARACTER_RECIPES, LOCAL_CHARACTER_NAMES}

const C={dark:'#262924', pink:'#b67a69', cream:'#d9cba8', wood:'#755332', gold:'#b68d37', page:'#d5caa5'}
const cache=new Map()
const B=(p,r)=>({p,r})
function box(p,at,size,color,rot=[0,0,0]){const g=new T.BoxGeometry(...size);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));g.translate(...at);return add(p,g,color)}
function ring(p,at,r,color,axis='z',thick=.014){const g=new T.TorusGeometry(r,thick,5,22);if(axis==='y')g.rotateX(Math.PI/2);g.translate(...at);return add(p,g,color,'brass')}
function cone(p,at,r1,r2,h,color){const g=new T.CylinderGeometry(r1,r2,h,18);g.translate(...at);return add(p,g,color)}
function stroke(p,points,r,color){return tube(p,points,r,color,'matte',Math.max(8,points.length*4))}
function eye(p,x,y,z,{size=.038,color='#1e241b',sx=1}={}){
  ell(p,[x,y,z],[size*sx,size*.92,size*.48],color,'eye')
  ell(p,[x-size*.22,y+size*.23,z-size*.41],[size*.18,size*.18,size*.12],'#d9d8bd','eye')
}
function brows(p,x,y,z,width,color,stern=false){for(const s of [-1,1])stroke(p,[[s*(x-width),y+(stern?.02:-.01),z],[s*x,y+.035,z-.008],[s*(x+width),y+(stern?-.02:0),z+.018]],.017,color)}
function smallMouth(p,y,z,w=.11){stroke(p,[[-w,y+.005,z],[0,y-.018,z-.016],[w,y+.005,z]],.009,C.dark)}
function paw(p,at,r,color,{digits=3,claws=false}={}){
 ell(p,at,r,color);for(let i=0;i<digits;i++){const x=at[0]+(i-(digits-1)/2)*r[0]*.48;ell(p,[x,at[1]-.015,at[2]-r[2]*.72],[r[0]*.23,r[1]*.65,r[2]*.43],color);if(claws)leaf(p,[[x,at[1]-.008,at[2]-r[2]],[x,at[1]-.018,at[2]-r[2]-.06]],.016,.01,C.cream,{steps:4,sides:5})}
}
function fabric(p,at,width,height,color,{radius=.35,back=true}={}){
  // Slightly tapered solid garment with rolled hems and long directional folds
  const top=at[1]+height*.5,bot=at[1]-height*.5
  surface(p,(u,v)=>{const a=u*Math.PI*2,rr=radius*(1.14-.28*v)+.015*Math.cos(a*9)*(1-v);return [at[0]+Math.sin(a)*width*rr,bot+height*v,at[2]+Math.cos(a)*rr]},color,28,10)
  for(let i=-2;i<=2;i++)stroke(p,[[i*width*radius*.31,top-.07,at[2]-.94*radius],[i*width*radius*.37,at[1],at[2]-radius-.014],[i*width*radius*.4,bot+.04,at[2]-radius*1.08]],.012,color)
  ell(p,[at[0],bot+.018,at[2]],[width*radius*1.14,.025,radius*1.14],color)
}
function scarf(p,r,{long=false}={}){
 ell(p,[0,1.24,-.012],[.31,.095,.275],r.cloth)
 leaf(p,[[.17,1.23,-.21],[.16,1.03,-.38],[.24,long?.55:.86,-.33]],.105,.035,r.cloth,{steps:10})
}
function backTail(body,r){
 const tail=part(body,'tail',[0,.43,.24]);const f=r.family
 if(['mouse','rabbit'].includes(f)){
  if(f==='rabbit')ell(tail,[0,.43,.4],[.14,.14,.14],r.light)
  else stroke(tail,[[0,.4,.2],[.21,.24,.45],[.39,.11,.48],[.48,.13,.29]],.028,C.pink)
 }else if(['squirrel','chipmunk','skunk','fox'].includes(f)){
  const pts=f==='skunk'?[[0,.4,.22],[-.18,.58,.65],[-.25,1.12,.79],[-.15,1.51,.63]]:f==='fox'?[[0,.44,.24],[.23,.38,.58],[.38,.81,.83],[.31,1.19,.8]]:[[0,.35,.22],[.28,.56,.58],[.24,1.14,.75],[.01,1.35,.6]]
  leaf(tail,pts,f==='fox'?.24:.3,.2,r.fur,{steps:18,sides:12})
  if(f==='skunk')leaf(tail,pts.map((v,i)=>[v[0]-.025,v[1]+.06,v[2]-.12]),.19,.085,r.light,{steps:18,sides:10})
  if(f==='fox')leaf(tail,[[.35,.8,.81],[.34,1.02,.83],[.31,1.21,.8]],.18,.14,r.light)
  for(let i=0;i<5;i++)leaf(tail,[[.12,.74+i*.08,.61],[.3,.95+i*.08,.76],[.19,1.12+i*.055,.72]],.075,.025,i%2?r.fur:r.light,{steps:7,sides:6})
 }else if(f==='beaver'){
  sculpt(tail,[B([0,.43,.26],[.13,.16,.13]),B([-.13,.55,.37],[.17,.22,.12])],'#594735',{step:.048,blend:.045})
  ell(tail,[-.27,.91,.46],[.25,.52,.075],'#66533e','matte',[0,0,-.18])
  for(let i=-2;i<=2;i++)stroke(tail,[[-.18+i*.065,.54,.38],[-.27+i*.075,.86,.38],[-.34+i*.055,1.23,.385]],.009,'#4e4030')
 }else if(f==='mustelid')leaf(tail,[[0,.45,.24],[.24,.38,.52],[.46,.42,.55]],.09,.07,r.fur)
}
function mammalHead(body,r){
 const f=r.family
 const z=f==='fox'?-.08:-.025,hy=f==='rabbit'?1.49:f==='mustelid'?1.56:1.48
 const head=part(body,'head',[0,hy-.12,z])
 let size=[.32,.32,.29],muzzle=[.23,.14,.18],mz=-.32,my=hy-.1
 if(['beaver','marmot'].includes(f)){size=[.4,.34,.32];muzzle=[.3,.21,.2];mz=-.35;my=hy-.13}
 if(f==='beaver'){size=[.41,.33,.32];muzzle=[.34,.21,.22];mz=-.37;my=hy-.12}
 if(f==='badger'){size=[.32,.32,.31];muzzle=[.2,.14,.25];mz=-.39}
 if(f==='mole'){size=[.3,.28,.28];muzzle=[.16,.12,.25];mz=-.39;my=hy-.08}
 if(f==='fox'){size=[.29,.3,.29];muzzle=[.15,.12,.31];mz=-.38;my=hy-.1}
 if(f==='mustelid'){size=[.23,.27,.25];muzzle=[.17,.11,.2];mz=-.31;my=hy-.09}
 if(f==='rabbit'){size=[.26,.3,.27];muzzle=[.2,.15,.15];mz=-.31;my=hy-.13}
 if(f==='skunk'){size=[.28,.24,.29];muzzle=[.15,.1,.25];mz=-.35;my=hy-.02}
 sculpt(head,[B([0,hy,z],size),B([0,my,mz],muzzle),B([-.17,my+.01,-.24],[.15,.15,.16]),B([.17,my+.01,-.24],[.15,.15,.16]),B([0,my-.12,-.25],[.17,.1,.14])],r.fur,{step:.047,blend:.055})
 // Pale cheek/muzzle islands follow the skull instead of enlarging the eyes
 const pale=['mouse','beaver','marmot','mustelid','fox','badger','rabbit','squirrel','chipmunk'].includes(f)
 if(pale){ell(head,[0,my-.03,mz-.07],[muzzle[0]*.94,muzzle[1]*.8,muzzle[2]*.77],r.light);for(const s of [-1,1])ell(head,[s*size[0]*.62,my-.005,-.24],[.13,.105,.12],r.light)}
 if(f==='beaver')for(const s of [-1,1])ell(head,[s*.245,my-.02,-.34],[.2,.155,.15],r.light)
 const noseZ=mz-muzzle[2]*.8
 ell(head,[0,my+.045,noseZ],[f==='beaver'?.105:f==='mole'?.07:.052,f==='beaver'?.064:.045,f==='beaver'?.06:.047],f==='mouse'?C.pink:C.dark,'eye')
 stroke(head,[[0,my+.02,noseZ],[0,my-.04,noseZ+.009]],.01,C.dark);smallMouth(head,my-.06,noseZ+.018,muzzle[0]*.4)
 if(f==='beaver'){
  ell(head,[0,my-.125,-.595],[.088,.06,.023],'#42392b');box(head,[-.036,my-.14,-.621],[.06,.105,.035],C.cream);box(head,[.036,my-.14,-.621],[.06,.105,.035],C.cream)
 }else if(['marmot','squirrel'].includes(f)){box(head,[-.025,my-.1,noseZ+.015],[.043,.075,.035],C.cream);box(head,[.025,my-.1,noseZ+.015],[.043,.075,.035],C.cream)}
 const ex=f==='mole'?.16:f==='mustelid'?.135:f==='rabbit'?.14:size[0]*.62,ey=hy+.055,ez=f==='fox'?-.295:-.27
 for(const s of [-1,1]){ell(head,[s*ex,ey,ez],[.066,.062,.035],r.fur);eye(head,s*ex,ey,ez-.025,{size:f==='mole'?.021:.036,sx:f==='fox'?1.2:1});stroke(head,[[s*(ex-.045),ey+.035,ez-.017],[s*ex,ey+.045,ez-.028],[s*(ex+.045),ey+.026,ez]],.012,r.light)}
 brows(head,ex,ey+.055,ez,.05,r.light,['stern','focused','watchful'].includes(r.mood))
 // Ear shape and placement are major species cues
 for(const s of [-1,1]){
  if(f==='rabbit'){
   leaf(head,[[s*.14,hy+.2,-.03],[s*.21,hy+.56,-.025],[s*.32,hy+.92,.02]],.115,.045,r.fur,{steps:15,sides:10});leaf(head,[[s*.16,hy+.29,-.073],[s*.22,hy+.57,-.07],[s*.3,hy+.83,-.025]],.075,.012,C.pink,{steps:12})
  }else if(['fox','squirrel','chipmunk'].includes(f)){
   leaf(head,[[s*.2,hy+.15,.015],[s*.27,hy+.37,.02],[s*.28,hy+.52,.02]],.12,.065,r.fur,{steps:10});leaf(head,[[s*.21,hy+.22,-.04],[s*.26,hy+.37,-.038],[s*.28,hy+.45,-.02]],.075,.012,C.pink,{steps:8})
  }else if(f==='beaver'){
   leaf(head,[[s*.29,hy+.16,.015],[s*.4,hy+.2,-.005],[s*.45,hy+.14,-.04]],.065,.036,r.fur,{steps:8});stroke(head,[[s*.32,hy+.17,-.035],[s*.4,hy+.17,-.045]],.015,r.light)
  }else if(f!=='mole'){
   const er=f==='mouse'?.185:.095,xx=f==='mouse'?.295:size[0]*.82
   ell(head,[s*xx,hy+.22,.015],[er,er,er*.33],r.fur);ell(head,[s*xx,hy+.22,-.037],[er*.73,er*.73,.018],f==='mouse'?C.pink:r.light)
  }
 }
 if(f==='badger')for(const s of [-1,1])leaf(head,[[s*.18,hy+.24,-.12],[s*.16,hy+.06,-.28],[s*.09,my,-.44]],.07,.018,'#35382e',{steps:10})
 if(f==='chipmunk')for(const s of [-1,1]){stroke(head,[[s*.29,hy+.14,-.16],[s*.24,hy+.03,-.28],[s*.23,my-.02,-.3]],.027,'#4b3829');stroke(head,[[s*.32,hy+.17,-.11],[s*.29,hy+.04,-.25],[s*.28,my-.02,-.27]],.014,r.light)}
 if(f==='skunk')leaf(head,[[0,hy+.2,.12],[0,hy+.22,-.11],[0,my+.07,-.47]],.095,.017,r.light)
 if(f==='fox')for(const s of [-1,1])leaf(head,[[s*.21,my+.08,-.23],[s*.3,my-.015,-.24],[s*.37,my-.09,-.17]],.075,.03,r.light)
 if(r.glasses)glasses(head,hy+.055,ez-.067,ex)
 head.userData.restRotation=[0,0,0]
 return head
}
function glasses(p,y,z,x=.19){for(const s of [-1,1]){ring(p,[s*x,y,z],.073,'#88764c');stroke(p,[[s*(x+.065),y+.01,z+.02],[s*(x+.1),y+.025,z+.13],[s*(x+.08),y+.015,z+.23]],.009,'#88764c')}stroke(p,[[-x+.07,y+.015,z],[0,y+.035,z-.015],[x-.07,y+.015,z]],.01,'#88764c')}
function mammal(root,r){
 const f=r.family,body=part(root,'body',[0,.65,0]);let w=.35,h=.44,d=.25
 if(['beaver','marmot','badger'].includes(f)){w=.43;h=.43;d=.31}
 if(f==='mustelid'){w=.24;h=.49;d=.2}
 if(f==='fox'){w=.29;h=.46;d=.26}
 if(f==='rabbit'){w=.27;h=.46;d=.24}
 sculpt(body,[B([0,.68,.035],[w,h,d]),B([0,1.08,.01],[w*.75,.24,d*.83]),B([0,1.28,-.005],[w*.49,.24,d*.64])],r.fur,{step:.052,blend:.065})
 ell(body,[0,.68,-d*.73],[w*.72,h*.82,d*.4],f==='beaver'?r.fur:r.light)
 for(const s of [-1,1]){
  const leg=part(root,s<0?'left-leg':'right-leg',[s*w*.57,.4,.04]);sculpt(leg,[B([s*w*.57,.35,.045],[.12,.24,.13]),B([s*w*.6,.13,-.09],[.13,.1,.2])],r.fur,{step:.045,blend:.045});paw(leg,[s*w*.6,.08,-.115],[.13,.075,.18],r.fur,{claws:f==='mole'});leg.userData.restRotation=[0,0,0]
 }
 backTail(body,r);mammalHead(body,r)
 if(['Monk','Ranger','King','Queen','Shopkeeper'].includes(root.userData.cardName))fabric(body,[0,.7,.025],f==='fox'?.9:1,.98,r.cloth,{radius:w*1.05})
 else if(f==='beaver'){
  sculpt(body,[B([0,.79,.01],[.448,.31,.333]),B([0,1.03,.015],[.375,.2,.3])],r.cloth,{step:.05,blend:.045})
  stroke(body,[[0,.51,-.275],[0,.76,-.327],[0,1.1,-.275]],.012,'#4f3f50');for(const y of [.62,.78,.95])ell(body,[.045,y,-.327],[.018,.018,.012],'#a18b67')
  stroke(body,[[-.15,1.21,-.19],[-.06,1.08,-.287],[0,1.11,-.28],[.06,1.08,-.287],[.15,1.21,-.19]],.024,r.cloth)
 }else if(r.apron){fabric(body,[0,.75,-.13],.8,.83,r.cloth,{radius:w*.78});box(body,[0,.97,-d-.028],[w*1.28,.37,.035],r.cloth);stroke(body,[[-w*.48,1.18,-.17],[-w*.53,1.04,-d-.04]],.028,r.cloth);stroke(body,[[w*.48,1.18,-.17],[w*.53,1.04,-d-.04]],.028,r.cloth)}
 else if(r.cloth){ell(body,[0,.95,.005],[w*1.035,.29,d*1.04],r.cloth);stroke(body,[[0,.7,-d-.026],[0,1.07,-d-.015]],.014,r.light)}
 if(['Fool','Wanderer'].includes(root.userData.cardName))scarf(body,r)
 if(r.hood)hood(body,r,w)
 arm(body,r,-1);arm(body,r,1)
 hat(body,r);props(body,r)
 return root
}
function arm(body,r,s){
 const f=r.family,w=['beaver','marmot','badger'].includes(f)?.4:f==='mustelid'?.23:.3
 const root=part(body,s<0?'left-arm':'right-arm',[s*w,1.1,-.015])
 // Elbow turns forward; overlapping shoulder, forearm, palm form one weight-bearing chain
 const hand=[s*(r.prop==='plan'?.35:.36),.94,-.42]
 sculpt(root,[B([s*w,1.065,-.045],[.12,.19,.13]),B([s*(w+.09),.89,-.15],[.105,.17,.12]),B([s*(w+.035),.87,-.3],[.105,.105,.2])],r.fur,{step:.05,blend:.05})
 if(!['Fool','King','Queen'].includes(body.parent.userData.cardName))ell(root,[s*w,1.065,-.015],[.13,.155,.14],r.cloth)
 paw(root,hand,[.1,.085,.11],r.fur,{claws:f==='mole'})
 root.userData.restRotation=[0,0,0];return root
}
function hood(body,r,w){
 const h=part(body,'hood',[0,1.41,.03]);ell(h,[0,1.49,.12],[w*1.22,.36,.3],r.cloth)
 // Open front is a thick rolled rim surrounding the visible face, never an opaque face mask
 stroke(h,[[-w*.96,1.34,-.24],[-w*1.06,1.59,-.2],[-w*.72,1.79,-.13],[0,1.84,-.13],[w*.72,1.79,-.13],[w*1.06,1.59,-.2],[w*.96,1.34,-.24]],.055,r.cloth)
 // Back cape remains on the torso while head looks around
 fabric(body,[0,.69,.13],1,.99,r.cloth,{radius:w*1.13})
}
function hat(body,r){
 const head=body.getObjectByName('head');if(!head||!r.hat)return
 const y=r.family==='mouse'?1.84:1.82
 if(r.hat==='beret'){ell(head,[0,y,.015],[.33,.115,.28],r.cloth,'matte',[.08,0,-.16]);ell(head,[.06,y+.09,.02],[.055,.045,.05],r.cloth)}
 if(r.hat==='jester'){
  ell(head,[0,y-.11,0],[.29,.09,.24],r.cloth);leaf(head,[[0,y-.08,0],[.04,y+.23,.02],[-.17,y+.28,-.015],[-.27,y+.1,-.08]],.16,.11,'#c8b570',{steps:15});ell(head,[-.27,y+.1,-.08],[.055,.055,.055],'#b4823b')
 }
 if(r.hat==='lamp'){ell(head,[0,y-.16,.015],[.31,.13,.27],'#916d48');box(head,[0,y-.07,-.25],[.16,.24,.09],'#b48839');ell(head,[0,y-.05,-.31],[.065,.085,.025],'#e3c97b');stroke(head,[[-.08,y-.17,-.28],[-.08,y+.05,-.27],[.08,y+.05,-.27],[.08,y-.17,-.28]],.018,'#b48839')}
 if(r.hat==='crown'){
  cone(head,[0,y+.005,.015],.235,.24,.105,C.gold);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;leaf(head,[[Math.sin(a)*.21,y+.035,Math.cos(a)*.21],[Math.sin(a)*.25,y+.22,Math.cos(a)*.25]],.058,.025,C.gold,{steps:6});ell(head,[Math.sin(a)*.25,y+.215,Math.cos(a)*.25],[.036,.039,.036],i%2?'#8d4043':'#5c7266')}
 }
 if(r.hat==='berry-crown')for(let i=0;i<7;i++){const a=i/7*Math.PI*2;stroke(head,[[Math.sin(a)*.18,y-.03,Math.cos(a)*.18],[Math.sin(a)*.22,y+.13,Math.cos(a)*.22]],.016,'#566447');ell(head,[Math.sin(a)*.22,y+.13,Math.cos(a)*.22],[.049,.046,.045],'#78415b');leaf(head,[[Math.sin(a)*.16,y,Math.cos(a)*.16],[Math.sin(a)*.24,y+.2,Math.cos(a)*.24]],.045,.015,'#4c6850')}
}
function bell(p,at,size=.15){
 cone(p,[at[0],at[1],at[2]],size*.47,size,size*1.2,C.gold);ring(p,[at[0],at[1]-size*.6,at[2]],size,C.gold,'y',.014);ell(p,[at[0],at[1]-size*.66,at[2]],[.028,.042,.028],C.gold);ring(p,[at[0],at[1]+size*.75,at[2]],size*.25,C.gold)
}
function book(p,at,size=.4,open=false){
 if(open){for(const s of [-1,1]){box(p,[at[0]+s*size*.23,at[1],at[2]],[size*.49,size*.68,.07],'#597077',[0,s*.19,0]);box(p,[at[0]+s*size*.23,at[1]+.008,at[2]-.043],[size*.44,size*.61,.016],C.page,[0,s*.19,0]);for(let j=0;j<4;j++)stroke(p,[[at[0]+s*.025,at[1]+.08-j*.05,at[2]-.06],[at[0]+s*size*.38,at[1]+.08-j*.05,at[2]-.09]],.003,'#94876a')}}
 else{box(p,at,[size*.65,size,.095],'#6c5943');box(p,[at[0]+.015,at[1],at[2]-.05],[size*.5,size*.88,.016],C.page)}
}
function staff(p,x,y=1.8,z=-.42,crook=false){
 const ps=[[x,.06,z],[x+.025,.7,z],[x,1.4,z],[x-.03,y,z+.015]]
 if(crook)ps.push([x+.08,y+.17,z],[x+.23,y+.12,z],[x+.2,y-.02,z])
 stroke(p,ps,.027,C.wood);for(let i=0;i<2;i++)stroke(p,[[x-.03,.92+i*.06,z-.03],[x+.04,.92+i*.06,z-.025]],.012,'#bea777')
 if(crook){stroke(p,[[x+.19,y-.02,z],[x+.19,y-.13,z]],.009,C.gold);bell(p,[x+.19,y-.22,z],.08)}
}
function props(body,r){
 const name=body.parent.userData.cardName, left=body.getObjectByName('left-arm')||body, right=body.getObjectByName('right-arm')||body
 const p=r.prop
 if(p==='plan'){
  surface(left,(u,v)=>[.03+u*.6,.64+v*.59,-.54-.04*Math.sin(u*Math.PI)],C.page,10,8)
  for(let j=0;j<4;j++)stroke(left,[[.14,.75+j*.09,-.581],[.48,.75+j*.09,-.576]],.0035,'#9b8d65')
  stroke(left,[[.25,.73,-.587],[.26,1.05,-.587],[.36,1.16,-.587],[.45,1.05,-.587],[.45,.73,-.587]],.004,'#9b8d65')
  stroke(right,[[-.43,.94,-.47],[-.15,1.05,-.48]],.014,C.wood)
  const pack=part(body,'architect-plan-pack',[.3,.99,.22]);ell(pack,[.31,1.025,.24],[.185,.265,.145],'#625044');stroke(body,[[.25,1.24,.17],[.29,1.12,-.18],[.29,.72,-.21]],.028,'#9a8664');stroke(pack,[[.15,1.16,.29],[.31,1.2,.35],[.47,1.16,.29]],.024,'#9a8664')
  for(let i=0;i<2;i++){stroke(pack,[[.28+i*.1,1.07,.2],[.4+i*.1,1.65,.22]],.043,C.page);ring(pack,[.4+i*.1,1.65,.22],.039,'#aa9870','y',.006)}
 }
 if(['staff','pitchfork','paddle','broom','pick','crook','shovel'].includes(p)){
  const x=-.36,z=-.42;staff(left,x,p==='pitchfork'?1.92:p==='broom'?1.65:1.81,z,p==='crook')
  if(p==='pitchfork'){stroke(left,[[x-.17,1.6,z],[x-.17,1.92,z]],.018,C.dark);stroke(left,[[x+.17,1.6,z],[x+.17,1.92,z]],.018,C.dark);stroke(left,[[x-.17,1.61,z],[x,1.58,z],[x+.17,1.61,z]],.022,C.dark)}
  if(p==='paddle'){
   leaf(left,[[x,.08,z],[x,.25,z],[x,.58,z]],.13,.035,'#9b8058')
   // A compact tied bundle is held by the other hand, rather than floating beside it
   for(let i=0;i<8;i++){const dx=(i-3.5)*.028,dz=(i%3-1)*.035;stroke(right,[[.36+dx*.5,.83,-.42+dz],[.43+dx,1.16,-.36+dz],[.47+dx*1.65,1.53+(i%3)*.07,-.29+dz]],.017,i%2?'#65533a':'#897247');if(i%2===0)stroke(right,[[.45+dx,1.35,-.325+dz],[.37+dx,1.47,-.32+dz]],.011,'#65533a')}
   for(const y of [.99,1.1])stroke(right,[[.32,y,-.45],[.35,y-.025,-.33],[.52,y,-.29],[.55,y+.02,-.38],[.32,y,-.45]],.012,'#b09a5c')
  }
  if(p==='broom')for(let i=0;i<11;i++){const t=(i-5)/5;stroke(left,[[x,.35,z],[x+t*.09,.18,z-.015],[x+t*.2,.035,z-.015+Math.abs(t)*.03]],.016,i%2?'#b19855':'#867c43')}
  if(p==='pick'){stroke(left,[[x-.3,1.6,z],[x-.13,1.72,z],[x+.08,1.73,z],[x+.29,1.62,z]],.038,'#6f7368');ell(right,[.36,.97,-.48],[.105,.09,.08],'#c5c8b0');for(let j=0;j<3;j++)leaf(right,[[.31+j*.04,.93,-.51],[.33+j*.03,1.05,-.52],[.37+j*.015,.97,-.54]],.025,.012,'#e2ddbd')}
  if(p==='shovel'){box(left,[x,1.65,z],[.17,.16,.04],C.wood);box(left,[x,.19,z],[.25,.3,.055],'#62695c');leaf(left,[[x-.1,.1,z],[x,.02,z],[x+.1,.1,z]],.055,.024,'#62695c')}
 }
 if(p==='basket'){
  const bag=part(right,'basket',[.43,.7,-.4]);ell(bag,[.46,.68,-.39],[.25,.22,.2],'#9c7542');stroke(bag,[[.22,.75,-.4],[.25,1.04,-.4],[.46,1.12,-.4],[.68,1.04,-.4],[.7,.75,-.4]],.027,'#b38c52')
  for(let j=0;j<3;j++)ring(bag,[.46,.58+j*.08,-.39],.22-j*.008,'#b5925c','y',.009)
  for(let i=0;i<5;i++)ell(bag,[.33+(i%3)*.1,.87+(i>2?.04:0),-.45+(i%2)*.1],[.067,.064,.06],i%2?'#76507d':'#8b4674')
 }
 if(p==='tray'){
  ell(body,[0,.9,-.5],[.48,.035,.24],'#94764f');for(const x of [-.22,.2]){cone(body,[x,1.03,-.5],.1,.085,.23,'#bb9e6b');ring(body,[x+.115,1.04,-.5],.065,'#aa8d5e','z',.018);ell(body,[x,1.15,-.5],[.095,.016,.09],'#d5c7a0')}
 }
 if(p==='gavel'){
  stroke(left,[[-.36,.94,-.45],[-.43,1.22,-.46]],.025,C.wood);const g=new T.CylinderGeometry(.08,.08,.26,12);g.rotateZ(Math.PI/2);g.translate(-.43,1.25,-.46);add(left,g,'#79532e')
 }
 if(p==='bell'){stroke(body,[[-.36,.94,-.44],[-.17,1.01,-.5],[.05,.99,-.5],[.35,.94,-.44]],.016,C.gold);bell(body,[0,.84,-.5],.15)}
 if(p==='book'){book(body,[0,.91,-.49],.53,true)}
 if(p==='pack'){
  const pack=part(body,'pack',[0,.92,.3]);ell(pack,[0,1.02,.39],[.39,.43,.24],'#775b3e');stroke(body,[[-.26,1.26,.2],[-.29,1.1,-.24],[-.3,.72,-.18]],.045,'#8d8261');stroke(body,[[.26,1.26,.2],[.29,1.1,-.24],[.3,.72,-.18]],.045,'#8d8261')
  for(let i=0;i<4;i++)stroke(pack,[[-.34,1.39+i*.028,.34],[0,1.43+i*.028,.38],[.35,1.4+i*.028,.37]],.024,C.wood)
  ell(pack,[.22,1.57,.38],[.145,.17,.12],'#b78a4b');for(const s of [-1,1])ell(pack,[s*.39,.98,.39],[.12,.17,.13],'#ad9671');staff(left,-.36,1.3,-.42)
 }
 if(p==='sceptre'){staff(left,-.36,1.43,-.42);ell(left,[-.36,1.48,-.42],[.073,.085,.065],C.gold)}
 if(p==='carving-tools'){
  stroke(left,[[-.36,.94,-.43],[-.4,1.16,-.44]],.023,C.wood);box(left,[-.4,1.19,-.44],[.23,.15,.12],'#765532',[0,0,-.25]);stroke(right,[[.36,.94,-.44],[.3,1.12,-.48]],.016,'#777c70');box(right,[.31,1.1,-.48],[.06,.07,.055],C.wood)
 }
}
// Bird anatomy: breast, shoulder-wing, keeled tail and two distinct scaled legs
function bird(root,r){
 const f=r.family,owl=f==='owl',crow=f==='crow',pigeon=f==='pigeon'
 const body=part(root,'body',[0,.7,0]),w=owl?.39:pigeon?.36:.32
 sculpt(body,[B([0,.85,.04],[w,.46,.3]),B([0,1.15,-.005],[w*.78,.26,.24]),B([0,.55,.08],[w*.65,.22,.24])],r.fur,{step:.053,blend:.055})
 ell(body,[0,.94,-.2],[w*.83,.31,.13],r.light)
 const head=part(body,'head',[0,1.34,-.03]),hy=owl?1.5:1.47,hr=owl?.34:.25
 sculpt(head,[B([0,hy,-.035],[hr,owl?.34:.265,.26]),B([0,hy-.18,-.14],[hr*.73,.14,.19])],r.fur,{step:.047,blend:.05})
 if(owl){
  for(const s of [-1,1]){ell(head,[s*.15,1.52,-.247],[.165,.22,.05],r.light);ell(head,[s*.15,1.55,-.29],[.094,.11,.035],'#a78b45');eye(head,s*.15,1.55,-.317,{size:.064,sx:.8});leaf(head,[[s*.27,1.62,-.1],[s*.31,1.83,-.06],[s*.25,1.89,-.04]],.085,.04,r.fur);stroke(head,[[s*.29,1.68,-.25],[s*.15,1.74,-.29],[s*.045,1.65,-.28]],.022,r.light)}
  leaf(head,[[0,1.57,-.26],[0,1.48,-.38],[0,1.36,-.3]],.06,.04,'#6a6341')
 }else{
  const beak=crow?.24:pigeon?.13:.15
  leaf(head,[[0,hy-.02,-.23],[0,hy-.06,-.26-beak],[0,hy-.1,-.25]],crow?.06:.07,.045,crow?'#484c3a':'#a68f4e',{steps:8})
  stroke(head,[[-.06,hy-.07,-.27],[0,hy-.085,-.3-beak*.6],[.06,hy-.07,-.27]],.007,C.dark)
  for(const s of [-1,1])eye(head,s*.16,hy+.055,-.222,{size:crow?.031:.034})
  if(f==='songbird')for(const s of [-1,1])leaf(head,[[s*.09,hy+.07,-.23],[s*.17,hy+.11,-.19],[s*.23,hy+.09,-.07]],.057,.022,'#3e4836')
  if(pigeon){ell(head,[0,1.28,-.07],[.24,.11,.22],'#697661');ell(head,[0,1.235,-.1],[.25,.055,.22],'#847181')}
 }
 for(const s of [-1,1]){
  const wing=part(body,s<0?'left-arm':'right-arm',[s*w*.85,1.12,.03]);ell(wing,[s*w*.85,.92,.03],[.135,.34,.24],r.fur,'matte',[0,0,s*.18])
  for(let i=0;i<5;i++)leaf(wing,[[s*w*.88,1.11,.07+i*.03],[s*(w+.07),.87,.1+i*.035],[s*(w+.01),.56,.08+i*.055]],.07,.024,i%2?r.fur:r.light,{steps:9,sides:6})
  // Pincer-like wing fingers explicitly grip books/instrument/staff
  if(r.prop)leaf(wing,[[s*w*.8,1.05,-.08],[s*.37,.94,-.33],[s*.32,.94,-.46]],.08,.035,r.fur,{steps:8})
  const leg=part(root,s<0?'left-leg':'right-leg',[s*.14,.38,.025]);stroke(leg,[[s*.14,.42,.025],[s*.15,.21,.005],[s*.15,.07,-.03]],.033,crow?'#4b4a37':'#998451')
  for(let j=-1;j<=1;j++)stroke(leg,[[s*.15,.075,-.025],[s*.15+j*.058,.046,-.15],[s*.15+j*.074,.035,-.24+Math.abs(j)*.035]],.018,crow?'#4b4a37':'#998451');stroke(leg,[[s*.15,.075,-.025],[s*.19,.045,.11]],.016,'#86794e')
 }
 const tail=part(body,'tail',[0,.55,.24]);for(let i=-2;i<=2;i++)leaf(tail,[[i*.05,.65,.18],[i*.09,.44,.44],[i*.1,.3,crow?.8:.65]],.08,.035,i%2?r.fur:r.light,{steps:10})
 if(owl){scarf(body,r,{long:true});props(body,r)}
 if(crow){scarf(body,r);book(body,[0,.96,-.46],.28,false)}
 if(pigeon){stroke(body,[[-.25,1.18,-.04],[.03,.87,-.28],[.25,.66,-.07]],.025,'#77634a');box(body,[.28,.71,-.06],[.21,.22,.14],'#826849');box(body,[.3,.77,-.145],[.17,.1,.015],C.page)}
 if(f==='songbird'){
  const lute=part(body,'lute',[0,.9,-.38]);ell(lute,[-.04,.94,-.4],[.2,.24,.09],'#bc8f3e');ell(lute,[-.04,.96,-.49],[.15,.19,.008],'#cca951');ell(lute,[-.04,1.01,-.505],[.044,.048,.006],'#574a2f');box(lute,[.2,1.19,-.4],[.075,.4,.065],'#8b6e37',[0,0,-.6]);for(let i=-1;i<=1;i++)stroke(lute,[[-.04+i*.018,.8,-.51],[.31+i*.014,1.36,-.44]],.003,'#e0cd89');for(const s of [-1,1])for(let j=0;j<2;j++)ell(lute,[.3+s*.045,1.32+j*.04,-.4],[.033,.012,.02],'#8e7645')
 }
 return root
}
function frog(root,r){
 const body=part(root,'body',[0,.64,0]);sculpt(body,[B([0,.72,.035],[.34,.44,.27]),B([0,1.11,.01],[.25,.3,.23])],r.fur,{step:.051,blend:.065});ell(body,[0,.75,-.22],[.27,.34,.09],r.light)
 const head=part(body,'head',[0,1.39,-.03]);sculpt(head,[B([0,1.45,-.045],[.4,.23,.29]),B([0,1.34,-.15],[.34,.16,.25]),B([-.25,1.6,-.02],[.14,.16,.15]),B([.25,1.6,-.02],[.14,.16,.15])],r.fur,{step:.045,blend:.045})
 ell(head,[0,1.3,-.2],[.32,.09,.19],r.light);stroke(head,[[-.33,1.43,-.23],[-.2,1.385,-.33],[0,1.37,-.37],[.2,1.385,-.33],[.33,1.43,-.23]],.012,'#52613c')
 for(const s of [-1,1]){ell(head,[s*.255,1.625,-.115],[.087,.092,.048],r.light);eye(head,s*.255,1.63,-.158,{size:.043});ell(head,[s*.085,1.49,-.324],[.016,.012,.007],'#5b6740')}
 for(const s of [-1,1]){
  const leg=part(root,s<0?'left-leg':'right-leg',[s*.25,.38,.08]);sculpt(leg,[B([s*.3,.35,.07],[.2,.22,.2]),B([s*.31,.16,-.09],[.1,.16,.16])],r.fur,{step:.05,blend:.04});paw(leg,[s*.29,.055,-.22],[.16,.05,.21],r.fur,{digits:3})
  const arm=part(body,s<0?'left-arm':'right-arm',[s*.27,1.12,.01]);stroke(arm,[[s*.28,1.12,0],[s*.4,.89,-.12],[s*.36,.94,-.4]],.065,r.fur);paw(arm,[s*.36,.94,-.42],[.086,.056,.095],r.fur,{digits:3})
 }
 if(root.userData.cardName==='Barge Toad'){ell(body,[0,1,.03],[.34,.24,.27],r.cloth);for(const s of [-1,1])stroke(body,[[s*.2,1.19,-.16],[s*.18,.93,-.26],[s*.27,.77,-.2]],.04,'#536044')}
 else scarf(body,r)
 props(body,r);return root
}
function turtle(root,r){
 const body=part(root,'body',[0,.66,.02]);ell(body,[0,.89,.2],[.42,.52,.25],'#4a4d35');ell(body,[0,.85,-.085],[.34,.46,.22],'#a48c53');
 for(let j=0;j<3;j++)stroke(body,[[-.28,.62+j*.18,-.19],[0,.59+j*.18,-.3],[.28,.62+j*.18,-.19]],.015,'#7a6f40')
 for(const s of [-1,1])stroke(body,[[s*.16,.46,.21],[s*.33,.7,.36],[s*.34,1.06,.35],[s*.15,1.34,.21]],.013,'#727249')
 const head=part(body,'head',[0,1.43,-.04]);sculpt(head,[B([0,1.49,-.015],[.22,.32,.22]),B([0,1.63,-.17],[.26,.19,.23]),B([0,1.39,-.2],[.2,.22,.17])],r.fur,{step:.043,blend:.045});ell(head,[0,1.43,-.3],[.15,.15,.08],r.light)
 for(const s of [-1,1]){eye(head,s*.15,1.72,-.3,{size:.026,sx:1.3});ell(head,[s*.15,1.755,-.287],[.09,.035,.04],r.fur)}
 smallMouth(head,1.54,-.377,.13);glasses(head,1.72,-.331,.15)
 for(const s of [-1,1]){const leg=part(root,s<0?'left-leg':'right-leg',[s*.2,.38,0]);sculpt(leg,[B([s*.21,.31,.04],[.12,.24,.14]),B([s*.21,.085,-.1],[.15,.08,.2])],r.fur,{step:.048,blend:.045});paw(leg,[s*.21,.065,-.14],[.15,.06,.16],r.fur,{claws:true});const arm=part(body,s<0?'left-arm':'right-arm',[s*.31,1.09,0]);stroke(arm,[[s*.31,1.09,0],[s*.44,.88,-.18],[s*.36,.94,-.4]],.09,r.fur);paw(arm,[s*.36,.94,-.42],[.1,.07,.1],r.fur)}
 leaf(body,[[0,1.24,-.23],[0,1.1,-.38],[0,.98,-.31]],.14,.035,C.cream);for(let i=-1;i<=1;i++)stroke(body,[[i*.04,1.19,-.325],[i*.05,1.04,-.35]],.011,'#b8b39a');props(body,r);return root
}
function bat(root,r){
 const body=part(root,'body',[0,.67,0]);sculpt(body,[B([0,.78,.035],[.28,.44,.23]),B([0,1.12,.02],[.22,.24,.19])],r.fur,{step:.049,blend:.055});ell(body,[0,.8,-.17],[.22,.32,.1],r.light)
 const head=part(body,'head',[0,1.37,-.04]);sculpt(head,[B([0,1.47,-.04],[.29,.28,.245]),B([0,1.37,-.26],[.2,.15,.13]),B([-.17,1.37,-.18],[.11,.14,.13]),B([.17,1.37,-.18],[.11,.14,.13])],r.fur,{step:.045,blend:.04})
 ell(head,[0,1.4,-.35],[.09,.065,.04],'#5b5447');for(const s of [-1,1]){
  leaf(head,[[s*.18,1.59,.01],[s*.32,1.88,.015],[s*.24,2.03,.035]],.13,.055,'#4c4d43',{steps:12});leaf(head,[[s*.2,1.66,-.035],[s*.29,1.87,-.025],[s*.24,1.96,0]],.075,.015,'#a08c77')
  eye(head,s*.14,1.51,-.25,{size:.029});stroke(head,[[s*.22,1.55,-.2],[s*.15,1.58,-.24],[s*.075,1.55,-.26]],.018,r.light)
 }
 smallMouth(head,1.32,-.344,.1);glasses(head,1.5,-.292,.145)
 for(const s of [-1,1]){
  const wing=part(body,s<0?'left-arm':'right-arm',[s*.23,1.14,.025])
  // Folded bat fingers support continuous membranes around the body's sides
  const rows=[[[s*.22,1.2,.025],[s*.46,1.15,-.03],[s*.5,.75,.025],[s*.35,.3,.1]],[[s*.22,1.2,.025],[s*.37,1.04,-.035],[s*.43,.7,.02],[s*.35,.3,.1]],[[s*.22,1.2,.025],[s*.29,1.02,-.08],[s*.32,.66,-.035],[s*.35,.3,.1]]]
  const membrane=(u,v)=>{const a=new T.CatmullRomCurve3(rows[0].map(p=>new T.Vector3(...p))).getPoint(v),b=new T.CatmullRomCurve3(rows[2].map(p=>new T.Vector3(...p))).getPoint(v);return a.lerp(b,u).toArray()}
  surface(wing,membrane,'#3d4240',8,14)
  // Reverse winding exposes the inner membrane from all camera directions
  surface(wing,(u,v)=>membrane(1-u,v),'#3d4240',8,14)
  for(const ps of rows)stroke(wing,ps,.016,'#65665b')
  stroke(wing,[[s*.23,1.14,-.015],[s*.35,1.01,-.27],[s*.28,.93,-.47]],.045,r.fur);paw(wing,[s*.28,.93,-.47],[.075,.047,.07],r.fur)
  const leg=part(root,s<0?'left-leg':'right-leg',[s*.13,.37,.025]);stroke(leg,[[s*.13,.4,.025],[s*.15,.17,.025],[s*.14,.07,-.055]],.047,r.fur);paw(leg,[s*.14,.052,-.1],[.08,.047,.12],r.fur,{claws:true})
 }
 book(body,[0,.92,-.48],.51,true);return root
}
function beetle(root,r){
 const body=part(root,'body',[0,.7,0]);ell(body,[0,.82,.065],[.27,.42,.23],r.fur);ell(body,[-.12,.82,.13],[.15,.4,.16],'#32372f');ell(body,[.12,.82,.13],[.15,.4,.16],'#353a31');stroke(body,[[0,1.21,.24],[0,.85,.3],[0,.44,.17]],.012,'#1b241f');ell(body,[0,1.16,-.015],[.25,.15,.22],'#3c4033')
 const head=part(body,'head',[0,1.43,-.04]);sculpt(head,[B([0,1.46,-.015],[.23,.25,.2]),B([0,1.34,-.14],[.18,.12,.15])],r.fur,{step:.045,blend:.04})
 for(const s of [-1,1]){
  ell(head,[s*.17,1.5,-.13],[.07,.08,.042],'#4e5841','eye');eye(head,s*.17,1.51,-.168,{size:.023})
  stroke(head,[[s*.12,1.66,-.005],[s*.27,1.86,.005],[s*.3,2.08,.015]],.021,'#373e30');ell(head,[s*.3,2.08,.015],[.027,.035,.026],'#4d5540')
  leaf(head,[[s*.085,1.33,-.21],[s*.16,1.26,-.27],[s*.05,1.23,-.29]],.045,.023,'#575a42',{steps:8})
  const leg=part(root,s<0?'left-leg':'right-leg',[s*.16,.43,.06]);stroke(leg,[[s*.16,.45,.06],[s*.26,.25,.08],[s*.25,.045,-.03],[s*.34,.027,-.13]],.029,'#343b2e')
  const middle=part(body,s<0?'left-middle-leg':'right-middle-leg',[s*.24,.83,.07]);stroke(middle,[[s*.24,.83,.07],[s*.4,.61,.02],[s*.39,.3,-.03],[s*.46,.16,-.12]],.025,'#343b2e')
  const arm=part(body,s<0?'left-arm':'right-arm',[s*.23,1.13,0]);stroke(arm,[[s*.23,1.13,0],[s*.42,1.01,-.18],[s*.36,.94,-.42]],.027,'#414635');paw(arm,[s*.36,.94,-.42],[.052,.04,.055],'#414635',{digits:2})
 }
 props(body,r);return root
}
function construct(name){
 const r=LOCAL_CHARACTER_RECIPES[name];if(!r)throw new RangeError(`Unknown local character: ${name}`)
 const root=new T.Group();root.name='local-'+name.toLowerCase().replaceAll(' ','-');root.userData={origin:[0,0,0],cardName:name,localSculpt:true,family:r.family,sourceCardId:r.id,forward:[0,0,-1],recipeVersion:1}
 if(['songbird','pigeon','crow','owl'].includes(r.family))bird(root,r)
 else if(r.family==='frog')frog(root,r)
 else if(r.family==='turtle')turtle(root,r)
 else if(r.family==='bat')bat(root,r)
 else if(r.family==='beetle')beetle(root,r)
 else mammal(root,r)
 batch(root)
 root.traverse(o=>{if(o.isGroup){o.userData.restPosition=o.position.toArray();o.userData.restRotation=o.rotation.toArray().slice(0,3)}if(o.isMesh)o.frustumCulled=true})
 const bounds=new T.Box3().setFromObject(root);root.userData.authoredBounds={min:bounds.min.toArray(),max:bounds.max.toArray()}
 root.userData.animation={head:'head',body:'body',feet:['left-leg','right-leg'],arms:['left-arm','right-arm'],tail:'tail',prop:r.prop||null}
 return root
}
export function createLocalCharacter(cardName){
 if(!cache.has(cardName))cache.set(cardName,construct(cardName))
 return cache.get(cardName).clone(true)
}
// All animation is absolute from saved transforms, so it can be sampled/replayed safely
// Names rather than Object3D refs keep userData serializable and clone-independent
export function animateLocalCharacter(group,time,{walking=false}={}){
 const r=LOCAL_CHARACTER_RECIPES[group.userData.cardName];if(!r)return
 const t=Number.isFinite(time)?time:0,phase=t*(walking?5.8:1.5)
 const apply=(name,fn)=>{const node=group.getObjectByName(name);if(!node)return;const p=node.userData.restPosition,q=node.userData.restRotation;if(p)node.position.fromArray(p);if(q)node.rotation.set(...q);fn(node)}
 apply('body',n=>{n.position.y+=walking?Math.abs(Math.sin(phase))*.018:(Math.sin(phase)+(r.family==='beetle'?1:0))*.008;n.rotation.z+=walking?Math.sin(phase)*.017:Math.sin(phase*.7)*.006})
 apply('head',n=>{n.rotation.y+=Math.sin(t*.61)*.055;n.rotation.x+=Math.sin(t*1.1)*.018})
 for(const [i,name]of ['left-leg','right-leg'].entries())apply(name,n=>{if(walking){const s=Math.sin(phase+i*Math.PI);n.rotation.x=s*.105;n.position.y+=Math.max(s,0)*.018+Math.max(-s,0)*(r.family==='frog'?.045:.022)}})
 // Arm-held props remain gripped; free hands get a small natural swing
 if(!r.prop)for(const [i,name]of ['left-arm','right-arm'].entries())apply(name,n=>{n.rotation.x+=(walking?.09:.012)*Math.sin(phase+i*Math.PI)})
 apply('tail',n=>{n.rotation.y+=Math.sin(t*1.2)*.025})
 for(const [i,name]of ['left-middle-leg','right-middle-leg'].entries())apply(name,n=>{if(walking)n.rotation.x+=Math.sin(phase+i*Math.PI)*.055})
}
