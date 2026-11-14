import {T,random,mesh,ell,rod,curve,group,bark,mergeStaticScenery} from './card-style-primitives.js'
import {architect,bard,doctor} from './card-style-characters.js'
import {crane,refinery,clockTower} from './card-style-buildings.js?v=pages25'
export const CARD_STYLE_SAMPLE_NAMES=Object.freeze(['Architect','Bard','Doctor','Crane','Resin Refinery','Clock Tower'])
export function createCardStyleSample(name){
 if(!CARD_STYLE_SAMPLE_NAMES.includes(name))throw new Error('Unknown source-backed sample: '+name)
 const root=new T.Group();root.name=name;root.userData={cardName:name,modelKey:name,modelVersion:3,isCritter:['Architect','Bard','Doctor'].includes(name),motions:[],sourceBacked:true}
 ;({Architect:architect,Bard:bard,Doctor:doctor,Crane:crane,'Resin Refinery':refinery,'Clock Tower':clockTower})[name](root)
 return root
}
export function animateCardStyleSample(root,time){
 for(const m of root.userData.motions){const {obj,rotation,position,scale}=m
  if(m.type==='breath'){obj.scale.y=1+Math.sin(time*1.5)*.003;obj.rotation.z=rotation.z+Math.sin(time*.7)*.001}
  if(m.type==='write')obj.rotation.z=rotation.z+Math.sin(time*2.5)*(m.amplitude??.10)
  if(m.type==='strum')obj.rotation.x=rotation.x+Math.sin(time*5)*(m.amplitude??.15)
  if(m.type==='inspect')obj.rotation.z=rotation.z+Math.sin(time*1.1)*(m.amplitude??.10)
  if(m.type==='cargo')obj.rotation.z=rotation.z+Math.sin(time*.9)*.055
  if(m.type==='wheel')obj.rotation.z=rotation.z-time*.12
  if(m.type==='clock')obj.rotation.z=rotation.z-time*.014
  if(m.type==='drop'){const p=(time*.7+m.phase)%1;obj.position.y=position.y-p*.20;obj.scale.y=scale.y*(.8+p*.5);obj.visible=p<.86}
  if(m.type==='foot'){const stride=root.userData.walking?Math.sin(time*8+m.phase):0;obj.position.z=position.z+stride*.065;obj.position.y=position.y+Math.max(0,stride)*.045}
  if(m.type==='leg')obj.rotation.x=rotation.x+(root.userData.walking?Math.sin(time*9+m.phase)*(m.amplitude??.36):0)
 }
}

// Restrained forest floor: irregular leaves and stones, grounded branched trees
// The stage remains quiet enough to read the model, without toy-like leaf disks
export function createCardStyleClearing(){
 const root=new T.Group();root.name='natural-forest-study';const rng=random(224)
 const ground=new T.PlaneGeometry(18,18,72,72);ground.rotateX(-Math.PI/2);const p=ground.attributes.position
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,-.045+Math.sin(x*1.5)*Math.cos(z*1.7)*.025+Math.sin(x*8+z*3)*.005)}ground.computeVertexNormals();mesh(root,ground,'#544c3a',0,0,0,'soil')
 for(let i=0;i<100;i++){const a=rng()*6.283,r=1.1+rng()*3.8,x=Math.sin(a)*r,z=Math.cos(a)*r;const size=.025+rng()*.09
  if(i%4===0){const g=new T.DodecahedronGeometry(size,1);const pos=g.attributes.position;for(let j=0;j<pos.count;j++){pos.setX(j,pos.getX(j)*(1+.15*Math.sin(pos.getY(j)*60)));pos.setY(j,pos.getY(j)*.55)}g.computeVertexNormals();mesh(root,g,i%3?'#6c6b5a':'#797766',x,size*.30-.015,z,'stone');continue}
  const verts=[0,0,0,-size,.008,size*.7,-size*.7,.006,size*1.4,0,.015,size*2.1,size*.7,.007,size*1.4,size,.004,size*.7];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute([.5,0,0,.3,0,.7,.5,1,1,.7,1,.3],2));geo.setIndex([0,1,2,0,2,3,0,3,4,0,4,5]);geo.computeVertexNormals();const leaf=mesh(root,geo,['#685333','#897142','#4f5136'][i%3],x,.005,z,'leaf',{side:T.DoubleSide});leaf.rotation.y=a
 }
 for(const [x,z,r,h]of [[-3.4,3.4,.22,5],[3.5,3.9,.28,5.8],[-1.6,5.0,.19,5.1],[1.1,5.8,.24,6]]){
  bark(root,x,-.06,z,r,h,Math.round(h*103));for(let j=0;j<5;j++){const a=j*1.256;curve(root,[[x,.48,z],[x+Math.sin(a)*r*1.1,.13,z+Math.cos(a)*r*1.1],[x+Math.sin(a)*r*2.7,-.015,z+Math.cos(a)*r*2.7]],.04,'#514534','bark')}
  for(let j=0;j<5;j++){const a=j*2.4,end=[x+Math.sin(a)*1.2,h*.65+.3*j,z+Math.cos(a)*.8];curve(root,[[x,h*.46,z],[x+Math.sin(a)*.65,h*.60+.3*j,z+Math.cos(a)*.35],end],.045,'#4c4436','bark')}
 }
 for(let i=0;i<28;i++){const x=(rng()-.5)*8,z=1.5+rng()*4;for(let j=0;j<5;j++){const a=j*1.256;const points=[[x,.01,z],[x+Math.sin(a)*.09,.17,z+Math.cos(a)*.09],[x+Math.sin(a)*.19,.12,z+Math.cos(a)*.19]];curve(root,points,.0035,'#516044');for(let k=1;k<6;k++){const t=k/6;for(const s of [-1,1])rod(root,[x+Math.sin(a)*t*.16,t*.16,z+Math.cos(a)*t*.16],[x+Math.sin(a)*t*.16+Math.cos(a)*s*.06*(1-t),t*.16+.015,z+Math.cos(a)*t*.16-Math.sin(a)*s*.06*(1-t)],.007,'#66704a',.001)}}}
 return mergeStaticScenery(root)
}
