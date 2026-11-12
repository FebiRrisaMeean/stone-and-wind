import * as T from '../../vendor/three.module.js'
import {part,ell,tube,leaf,sculpt,surface,batch} from './geometry.js'

export const SCHOLAR_RECIPE = Object.freeze({
  id:'scholar-a-local-2', reference:'approved Scholar A', front:'-Z', height:2.6,
  parts:['connected body','two planted legs','sculpted head and muzzle','swept quill groups','eyelids and brows','supported glasses','draped scarf','berry arm and fingers','quill arm and grip'],
  textures:0, dependencies:'bundled Three.js only', status:'autonomous simplified game adaptation'
})
let template
const B=(p,r)=>({p,r})
const fur=['#70513d','#836047','#946c4c','#674936','#a47d58']
function makeLeg(parent,s) {
  const leg=part(parent,s>0?'leg-right':'leg-left',[s*.25,.51,.03])
  sculpt(leg,[B([s*.25,.42,.04],[.22,.29,.23]),B([s*.27,.20,-.04],[.16,.21,.17]),B([s*.28,.10,-.17],[.18,.10,.27])],'#875536',{step:.048,blend:.075})
  for(let i=0;i<3;i++){
    const x=s*.28+(i-1)*.09
    ell(leg,[x,.075,-.35],[.054,.058,.095],'#a57652')
    leaf(leg,[[x,.08,-.38],[x,.067,-.425],[x,.045,-.45]],.025,.018,'#d2b99a',{steps:5,sides:6})
  }
  leg.scale.y=.70; leg.position.y=.36
  return leg
}
function makeCrown(head){
  // Solid broad tufts grow from the skull; their tips sweep towards the back
  for(let row=0;row<4;row++) {
    const n=10+row*2,theta=.24+row*.27
    for(let i=0;i<n;i++){
      const phi=-Math.PI+.13+(i/(n-1))*(Math.PI*2-.26)
      // The face is open: only the upper row crosses the forehead
      if(row>0&&Math.cos(phi)<-.38)continue
      const x=Math.sin(phi)*(.31+row*.065),y=2.13-row*.16,z=.08+Math.cos(phi)*(.24+row*.025)
      const dx=Math.sin(phi)*(.13+row*.026),len=.26-row*.025
      leaf(head,[[x*.88,y-.10,z-.035],[x+dx*.42,y+.11,z+.075],[x+dx,y+len,z+.30]],.093+row*.006,.060,fur[(i+row)%fur.length],{steps:10,sides:8})
    }
  }
  // Forehead's main silhouette, built as combed overlapping masses
  for(let i=-4;i<=4;i++){
    const x=i*.09,y=2.15-Math.abs(i)*.022
    leaf(head,[[x*.86,y-.08,-.22+Math.abs(i)*.01],[x*1.11,y+.15,-.12],[x*1.25,y+.31-Math.abs(i)*.017,.35]],.083,.061,fur[(i+7)%fur.length],{steps:11,sides:8})
  }
  for(const s of [-1,1])for(let j=0;j<4;j++) {
    const y=2.12-j*.14
    leaf(head,[[s*.32,y,-.22],[s*.49,y+.025,-.11],[s*(.66-j*.015),y-.025,.20]],.085,.055,fur[(j+1)%fur.length],{steps:10,sides:8})
  }
  for(let i=-2;i<=2;i++)leaf(head,[[i*.075,2.015,-.29],[i*.082,2.12,-.27],[i*.09,2.24,-.12]],.045,.022,fur[(i+5)%fur.length],{steps:7,sides:6})
  // Cheek tufts continue the cheekbone volume instead of floating whiskers
  for(const s of [-1,1])for(let j=0;j<4;j++){
    const y=1.74-j*.095
    leaf(head,[[s*.34,y,-.35],[s*.48,y-.012,-.25],[s*(.61-j*.012),y-.10,.005]],.069,.045,fur[(j+2)%fur.length],{steps:8,sides:8})
  }
}
function makeEye(head,s){
  const x=s*.25,y=1.875,z=-.358
  ell(head,[x,y,z],[.132,.120,.060],'#563b2a')
  const eye=part(head,s>0?'eye-right':'eye-left',[x,y,z-.024])
  ell(eye,[x,y,z-.036],[.089,.089,.050],'#8b5f32','eye')
  // Both eyes look toward the berry on the anatomical right
  ell(eye,[x+.026,y-.009,z-.078],[.054,.064,.020],'#34271d','eye')
  ell(eye,[x+.029,y-.008,z-.095],[.028,.045,.008],'#120f0c','eye')
  ell(eye,[x+.010,y+.026,z-.104],[.013,.017,.006],'#f7e7ca','eye')
  tube(head,[[x-s*.105,y-.025,z-.047],[x-s*.10,y+.075,z-.055],[x,y+.090,z-.056],[x+s*.11,y+.045,z-.037]],.026,'#9d6842', 'matte',18)
  tube(head,[[x-.09,y-.059,z-.058],[x,y-.101,z-.063],[x+.09,y-.052,z-.058]],.014,'#bc905e','matte',14)
  for(let j=0;j<3;j++){
    const start=[x-s*.11,y+.09+j*.018,z-.002]
    leaf(head,[start,[x+s*.006,y+.15+j*.016,z-.025],[x+s*(.14+j*.006),y+.10+j*.005,z+.025]],.034-j*.004,.026,'#e5ceaa',{steps:10,sides:8})
  }
}
function makeGlasses(head){
  for(const s of [-1,1]){
    const x=s*.25,y=1.737,z=-.547,w=.16,h=.084,r=.034
    const pts=[[x-w+r,y-h,z],[x+w-r,y-h,z],[x+w,y-h+r,z+.005],[x+w,y+h-r,z+.018],[x+w-r,y+h,z+.018],[x-w+r,y+h,z],[x-w,y+h-r,z-.005],[x-w,y-h+r,z],[x-w+r,y-h,z]]
    tube(head,pts,.012,'#b49351','brass',36)
    ell(head,[x,y,z+.008],[.145,.074,.012],'#e4e2c4','glass')
    tube(head,[[x+s*w,y+.035,z+.014],[s*.48,1.79,-.39],[s*.54,1.87,-.10],[s*.52,1.91,.035]],.009,'#9e7e45','brass',20)
  }
  tube(head,[[-.08,1.77,-.568],[0,1.803,-.59],[.08,1.77,-.568]],.011,'#b49351','brass',12)
}
function makeHead(torso){
  const head=part(torso,'head',[0,1.44,.02])
  sculpt(head,[B([0,1.81,.035],[.48,.51,.37]),B([-.29,1.65,-.22],[.25,.28,.23]),B([.29,1.65,-.22],[.25,.28,.23]),B([0,1.54,-.27],[.33,.22,.23]),B([0,1.62,-.405],[.25,.17,.19]),B([-.25,1.87,-.24],[.23,.22,.17]),B([.25,1.87,-.24],[.23,.22,.17])],'#9d6842',{step:.036,blend:.09})
  for(const s of [-1,1]){
    ell(head,[s*.48,1.97,.045],[.115,.145,.075],'#8c5737','matte',[0,s*.24,-s*.30])
    ell(head,[s*.48,1.98,-.010],[.064,.084,.028],'#5d3829','matte',[0,s*.24,-s*.30])
  }
  makeCrown(head)
  sculpt(head,[B([-.14,1.536,-.434],[.19,.12,.115]),B([.14,1.536,-.434],[.19,.12,.115]),B([0,1.456,-.38],[.23,.11,.15])],'#cfb38b',{step:.029,blend:.045})
  // Rounded nose has a bridged upper plane and full nostril wings
  sculpt(head,[B([0,1.651,-.552],[.177,.103,.115]),B([-.086,1.631,-.564],[.073,.061,.060]),B([.086,1.631,-.564],[.073,.061,.060]),B([0,1.603,-.595],[.092,.065,.068])],'#b77857',{step:.023,blend:.035})
  for(const s of [-1,1])ell(head,[s*.098,1.628,-.627],[.025,.015,.014],'#794b38')
  tube(head,[[0,1.557,-.58],[0,1.52,-.556],[.055,1.498,-.532]],.009,'#765137','matte',12)
  tube(head,[[0,1.52,-.556],[-.055,1.498,-.532]],.008,'#765137','matte',8)
  for(const s of [-1,1])for(let j=0;j<3;j++)leaf(head,[[s*.04,1.49-j*.019,-.511],[s*.16,1.47-j*.02,-.506],[s*.27,1.46-j*.02,-.43]],.032,.025,'#e0c6a0',{steps:8,sides:8})
  for(let i=-2;i<=2;i++)leaf(head,[[i*.062,1.466,-.423],[i*.074,1.36,-.44],[i*.06,1.285+Math.abs(i)*.035,-.385]],.048,.035,i%2?'#dcc39e':'#ecd5b1',{steps:9,sides:8})
  for(const s of [-1,1])makeEye(head,s)
  makeGlasses(head)
  return head
}
function makeScarf(torso){
  const scarf=part(torso,'scarf',[0,1.22,0])
  // A thick closed cloth band with continuous draped folds, not separate ropes
  const cloth=(u,v,inside=false)=>{
    const a=u*Math.PI*2,front=(1-Math.cos(a))*.5
    const fold=.019*Math.cos(v*Math.PI*5+front*.7)+.007*Math.sin(a*3+v*4)
    const rx=.48+Math.sin(v*Math.PI)*.035+(inside?-.022:0)+fold
    const rz=.33+Math.sin(v*Math.PI)*.035+(inside?-.022:0)+fold
    return [Math.sin(a)*rx,1.46-v*.28-front*(.12+.13*v)+.045*Math.sin(a)*(v+.6),Math.cos(a)*rz-.005]
  }
  surface(scarf,(u,v)=>cloth(u,v),'#3e614d',64,22)
  surface(scarf,(u,v)=>cloth(1-u,v,true),'#345440',64,8)
  surface(scarf,(u,v)=>{const p=cloth(u,0),q=cloth(u,0,true);return p.map((n,i)=>n+(q[i]-n)*v)},'#55725a',64,1)
  surface(scarf,(u,v)=>{const p=cloth(u,1),q=cloth(u,1,true);return q.map((n,i)=>n+(p[i]-n)*v)},'#345440',64,1)
  // Attached fabric tail lies against flank, with actual thickness
  for(const side of [1,-1])surface(scarf,(u,v)=>{
    const w=.16*(1-.20*v),x=.40+(u-.5)*w+.11*Math.sin(v*1.7),y=1.35-v*.57+.025*Math.sin(u*Math.PI),z=.10+.08*Math.sin(v*2.8)+.02*Math.sin(u*Math.PI*4)+(side>0?.014:-.014)
    return side>0?[x,y,z]:[.40+(1-u-.5)*w+.11*Math.sin(v*1.7),y,.10+.08*Math.sin(v*2.8)+.02*Math.sin((1-u)*Math.PI*4)-.014]
  },'#43664d',12,16)
}
function brushColour(root){
  // Low-amplitude baked colour variation adds material depth without texture maps
  root.traverse(o=>{if(!o.isMesh||o.material.transparent||o.material.metalness>.1)return
    const p=o.geometry.attributes.position,c=o.geometry.attributes.color
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i)
      const shade=.96+.04*Math.sin(x*23+y*15+z*9)*Math.sin(y*31-z*17)
      c.setXYZ(i,c.getX(i)*shade,c.getY(i)*shade,c.getZ(i)*shade)
    }
  })
}
function makeBerryArm(torso){
  const arm=part(torso,'berry-arm',[.40,1.18,.02])
  sculpt(arm,[B([.43,1.12,.01],[.19,.23,.21]),B([.55,.99,-.13],[.16,.19,.18]),B([.67,1.12,-.32],[.125,.25,.15]),B([.72,1.32,-.43],[.14,.12,.145])],'#98633e',{step:.036,blend:.075})
  const hand=part(arm,'berry-hand',[.72,1.32,-.43])
  ell(hand,[.73,1.355,-.48],[.138,.06,.145],'#a77852')
  // Four attached fingers cup the underside and rise around the lower front of the berry
  for(let i=0;i<3;i++){
    const x=.73+(i-1)*.09
    tube(hand,[[x,1.29,-.43],[x,1.32,-.56],[x,1.40,-.65],[x,1.46,-.64]],.033,'#ad7b54','matte',12)
    ell(hand,[x,1.449,-.655],[.023,.035,.009],'#c29672')
  }
  tube(hand,[[.84,1.32,-.40],[.895,1.37,-.45],[.90,1.45,-.49]],.043,'#a77852','matte',12)
  const berry=part(hand,'berry',[.73,1.555,-.49])
  ell(berry,[.73,1.555,-.49],[.197,.205,.194],'#486785')
  ell(berry,[.73,1.75,-.49],[.053,.008,.053],'#24394e')
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,dx=Math.sin(a),dz=Math.cos(a)
    leaf(berry,[[.73+dx*.061,1.725,-.49+dz*.061],[.73+dx*.041,1.756,-.49+dz*.041],[.73+dx*.015,1.745,-.49+dz*.015]],.020,.009,'#334d65',{steps:5,sides:6})
  }
  for(let i=0;i<4;i++)leaf(arm,[[.49+i*.026,1.12-i*.037,-.24],[.55+i*.025,1.04-i*.03,-.24],[.60+i*.03,.99-i*.03,-.16]],.048,.023,fur[i],{steps:7,sides:6})
}
function makeQuillArm(torso){
  const arm=part(torso,'quill-arm',[-.40,1.18,.02])
  sculpt(arm,[B([-.44,1.10,.015],[.20,.24,.21]),B([-.54,.91,-.13],[.16,.18,.18]),B([-.57,1.0,-.32],[.14,.13,.20]),B([-.57,1.075,-.47],[.135,.13,.12])],'#96613c',{step:.037,blend:.07})
  const pen=part(arm,'writing-quill',[-.58,1.07,-.49])
  const a=[-.50,.83,-.51],b=[-.92,1.98,-.48]
  tube(pen,[a,[-.67,1.29,-.49],b],.012,'#c6aa78','matte',26)
  // Lenticular feather vane, both faces modelled; the shaft stays between fingers
  const axis=new T.Vector3(...b).sub(new T.Vector3(...a)),side=new T.Vector3(axis.y,-axis.x,0).normalize()
  surface(pen,(u,v)=>{
    const t=.29+v*.71,width=.105*Math.pow(Math.sin(v*Math.PI),.8),p=new T.Vector3(...a).lerp(new T.Vector3(...b),t).addScaledVector(side,(u*2-1)*width)
    p.z-=.019*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);return p.toArray()
  },'#ead8b6',10,24)
  surface(pen,(u,v)=>{
    const t=.29+v*.71,width=.105*Math.pow(Math.sin(v*Math.PI),.8),p=new T.Vector3(...a).lerp(new T.Vector3(...b),t).addScaledVector(side,(1-u*2)*width)
    p.z+=.019*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);return p.toArray()
  },'#d7bf96',10,24)
  for(let i=1;i<=9;i++){
    const v=i/11,t=.29+v*.71,p=new T.Vector3(...a).lerp(new T.Vector3(...b),t),w=.105*Math.pow(Math.sin(v*Math.PI),.8)
    for(const s of [-1,1]){const q=p.clone().addScaledVector(side,s*w*.90).addScaledVector(axis,.018);p.z=-.51;q.z=-.505;tube(pen,[p.toArray(),q.toArray()],.003,'#c4ad87','matte',3)}
  }
  for(let i=0;i<3;i++){
    const y=1.12-i*.055
    tube(arm,[[-.65,y,-.47],[-.60,y,-.57],[-.52,y-.015,-.56]],.026,'#ad7b54','matte',10)
  }
  tube(arm,[[-.48,1.10,-.46],[-.51,1.15,-.53],[-.57,1.145,-.55]],.039,'#b4845b','matte',10)
}
function build(){
  const root=new T.Group();root.name='scholar-local';root.userData.recipe=SCHOLAR_RECIPE
  makeLeg(root,-1);makeLeg(root,1)
  const torso=part(root,'torso',[0,.58,.02])
  const bodyMesh=sculpt(torso,[B([0,.76,.07],[.47,.46,.34]),B([0,1.09,.055],[.42,.31,.30]),B([0,.55,.07],[.44,.25,.32]),B([0,1.33,.04],[.26,.21,.24])],'#8e5a37',{step:.044,blend:.10})
  // Vertex paint follows the same continuous belly surface, without an added oval plate
  const positions=bodyMesh.geometry.attributes.position,colors=bodyMesh.geometry.attributes.color
  const chestColor=new T.Color('#af8054'),bodyColor=new T.Color('#8e5a37')
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i)+.58,z=positions.getZ(i)+.02
    const weight=Math.max(0,Math.min(1,(-z-.07)/.23))*Math.exp(-x*x/.14-(y-.79)**2/.17)*.9
    const c=bodyColor.clone().lerp(chestColor,weight);colors.setXYZ(i,c.r,c.g,c.b)
  }
  makeScarf(torso);makeHead(torso);makeBerryArm(torso);makeQuillArm(torso)
  torso.position.y=.43
  root.position.y=.02
  brushColour(root);batch(root)
  root.userData.height=2.6;root.userData.textures=0;root.userData.animationMode='idle'
  return root
}
export function createLocalScholar(){if(!template)template=build();return template.clone(true)}
export function animateLocalScholar(root,t,{walking=false}={}){
  const head=root.getObjectByName('head'),body=root.getObjectByName('torso'),berry=root.getObjectByName('berry-arm'),quill=root.getObjectByName('quill-arm')
  if(!head)return
  const breath=Math.sin(t*1.6)
  body.position.y=.43+breath*.003+(walking?Math.abs(Math.sin(t*5))*.025:0)
  head.rotation.y=-.10+.025*Math.sin(t*.63);head.rotation.x=-.035+.012*Math.sin(t*.83)
  berry.rotation.x=.025*Math.sin(t*.91);berry.rotation.z=.012*Math.sin(t*.7)
  quill.rotation.x=.014*Math.sin(t*.8+1)
  const phase=(t+1)%5.3,blink=phase<.16?1-.96*Math.sin(phase/.16*Math.PI):1
  for(const name of ['eye-right','eye-left'])root.getObjectByName(name).scale.y=blink
  for(const [name,s]of [['leg-right',1],['leg-left',-1]]){
    const leg=root.getObjectByName(name);leg.rotation.x=walking?Math.sin(t*5)*.16*s:0
    leg.position.y=.36+(walking?.015:0)+(walking?Math.max(0,Math.sin(t*5)*s)*.06+Math.max(0,-Math.sin(t*5)*s)*.05:0)
  }
}
