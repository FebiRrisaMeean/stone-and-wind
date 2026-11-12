import * as T from '../vendor/three.module.js'

// The six source-backed prototypes share this mesh API with market/city miniatures
// Visible identities follow PDF art; unseen backs are restrained reconstruction
export const CARD_STYLE_SAMPLE_NAMES=Object.freeze(['Architect','Bard','Doctor','Crane','Resin Refinery','Clock Tower'])
const P={ink:'#302b23',wood:'#775039',bark:'#66533a',cut:'#b69158',moss:'#657645',leaf:'#829450',cream:'#decba2',fur:'#544434',paleFur:'#b6a47c',purple:'#69516c',gold:'#cc932d',amber:'#d5a03d',stone:'#858b80',green:'#385c49',blue:'#425979',rope:'#ba9b67'}
const mats=new Map(),textures=new Map()
function random(seed){let n=seed>>>0;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)}
function paintTexture(kind){
 if(textures.has(kind))return textures.get(kind)
 if(typeof document==='undefined')return null
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256
 const ctx=canvas.getContext('2d'),rng=random(kind.length*113+kind.charCodeAt(0));ctx.fillStyle='#d9d4c1';ctx.fillRect(0,0,256,256)
 for(let i=0;i<950;i++){
  const x=rng()*256,y=rng()*256,d=rng()*26+3;ctx.strokeStyle=rng()>.5?'rgba(65,53,32,.055)':'rgba(255,250,226,.10)';ctx.lineWidth=1+rng()*5
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(kind==='bark'?rng()*6-3:d),y+(kind==='bark'?d*3:d*.4));ctx.stroke()
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;textures.set(kind,tex);return tex
}
function material(color,kind='paint',extra={}){
 const key=color+kind+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,map:paintTexture(kind),roughness:.96,metalness:0,...extra}));return mats.get(key)
}
function mesh(g,geo,color,x=0,y=0,z=0,kind='paint',extra={}){const m=new T.Mesh(geo,material(color,kind,extra));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m}
function ell(g,x,y,z,rx,ry,rz,c,kind='paint'){const m=mesh(g,new T.SphereGeometry(1,24,16),c,x,y,z,kind);m.scale.set(rx,ry,rz);return m}
function box(g,x,y,z,w,h,d,c,kind='paint'){return mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z,kind)}
function cyl(g,x,y,z,r,h,c,rt=r,segments=16,kind='paint'){return mesh(g,new T.CylinderGeometry(rt,r,h,segments),c,x,y,z,kind)}
function rod(g,a,b,r,c,rt=r,kind='paint'){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),m=cyl(g,...aa.clone().add(bb).multiplyScalar(.5).toArray(),r,aa.distanceTo(bb),c,rt,10,kind);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bb.sub(aa).normalize());return m}
function curve(g,pts,r,c,kind='paint'){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),24,r,7,false),c,0,0,0,kind)}
function torus(g,x,y,z,r,t,c){return mesh(g,new T.TorusGeometry(r,t,7,32),c,x,y,z)}
function group(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g}
function motion(root,obj,type,values={}){root.userData.motions.push({obj,type,position:obj.position.clone(),rotation:obj.rotation.clone(),...values});return obj}
function eye(g,x,y,z,r=.045){ell(g,x,y,z,r,r*1.2,r*.75,P.ink);ell(g,x-r*.22,y+r*.32,z-r*.55,r*.22,r*.22,r*.19,'#f9efcc')}
function leaf(g,x,y,z,size,angle=0,c=P.leaf){const m=ell(g,x,y,z,size*.4,size*.08,size,c);m.rotation.set(.28,angle,.25);return m}
function furTufts(g,rng,count,{y=.8,rx=.42,ry=.5,rz=.28,c=P.fur}={}){
 for(let i=0;i<count;i++){const a=rng()*Math.PI*2,b=rng()*Math.PI;const x=Math.sin(a)*Math.sin(b)*rx,yy=y+Math.cos(b)*ry,z=Math.cos(a)*Math.sin(b)*rz;const tuft=ell(g,x,yy,z,.022,.07,.025,c);tuft.rotation.z=-x*.9}
}
function scroll(g,x,y,z,w=.5,h=.67){const page=group(g,'rolled-plan',x,y,z);page.rotation.x=-.13;box(page,0,0,0,w,h,.015,'#dbc99c');for(const yy of [-h/2,h/2]){const r=cyl(page,0,yy,.015,.035,w+.05,'#ccb689');r.rotation.z=Math.PI/2}for(let i=0;i<4;i++)rod(page,[-w*.32,-h*.30+i*.12,-.011],[w*.25,-h*.30+i*.12,-.011],.0035,'#9c9776');rod(page,[-w*.25,-h*.32,-.014],[-w*.25,h*.28,-.014],.004,'#989574');return page}
function architect(root){
 root.userData.species='beaver';const body=group(root,'beaver-body');body.scale.x=-1;motion(root,body,'breath');const rng=random(102)
 ell(body,0,.59,.05,.34,.43,.29,P.fur,'fur');ell(body,0,.40,.12,.37,.23,.34,'#3d392f','fur');ell(body,0,.22,.46,.24,.065,.43,'#534431','bark')
 for(let i=0;i<8;i++)rod(body,[-.18,.27,.23+i*.05],[.18,.27,.23+i*.05],.005,'#79623e')
 for(const s of [-1,1])motion(root,ell(body,s*.18,.12,-.13,.15,.09,.22,P.fur,'fur'),'foot',{phase:s<0?0:Math.PI})
 ell(body,0,.75,.055,.37,.28,.30,P.purple,'cloth');const lapel=ell(body,-.18,.83,-.22,.12,.24,.05,'#806882');lapel.rotation.z=-.35
 box(body,.06,.60,-.24,.20,.12,.02,'#695064','cloth');rod(body,[-.30,.56,-.16],[.31,.56,-.16],.014,'#382f30')
 ell(body,0,1.14,-.015,.32,.30,.28,P.paleFur,'fur');ell(body,0,1.05,-.20,.26,.21,.23,'#bcac87','fur');ell(body,0,1.10,-.40,.09,.065,.06,'#302e25')
 for(const s of [-1,1]){ell(body,s*.25,1.32,.01,.075,.075,.05,'#9d8c66');eye(body,s*.145,1.24,-.25,.033);box(body,s*.035,.91,-.38,.051,.084,.025,'#e9dabb')}
 furTufts(body,rng,65,{y:1.1,rx:.30,ry:.25,rz:.27,c:'#af9d77'})
 // Long cheek and chin fur carries the source silhouette, not a round toy face
 for(let i=0;i<44;i++){const side=i%2?-1:1,y=.97+rng()*.27,x=side*(.19+rng()*.09),z=-.16-rng()*.12;rod(body,[x,y,z],[x+side*(.015+rng()*.035),y-.10-rng()*.11,z-.025],.015,i%4?'#ad9b73':'#c4b18b',.001,'fur')}
 ell(body,0,.88,-.15,.25,.13,.18,'#4c4735','fur');for(let i=0;i<20;i++){const x=(rng()-.5)*.40;rod(body,[x,.96,-.29],[x,.78+rng()*.08,-.24],.014,i%3?'#655c43':'#9d906c',.002,'fur')}
 const cap=ell(body,.04,1.43,.04,.29,.075,.24,'#654d6b','cloth');cap.rotation.z=.22;curve(body,[[-.23,1.40,-.13],[.03,1.39,-.23],[.28,1.41,-.08]],.018,'#bdac72');ell(body,.06,1.51,.03,.045,.025,.04,P.purple)
 const left=group(body,'writing-paw',-.28,.82,-.16);ell(left,0,0,0,.13,.17,.12,P.fur,'fur');rod(left,[-.03,-.02,-.14],[.20,-.05,-.20],.014,P.cut);motion(root,left,'write')
 const plan=scroll(body,.33,.69,-.40,.47,.72);plan.rotation.z=-.13
 for(let i=0;i<3;i++){const roll=cyl(body,.34+i*.09,1.08,.12,.04,.6,'#dcc99d');roll.rotation.z=-.45-i*.12}
 furTufts(body,rng,32,{y:.43,rx:.32,ry:.27,rz:.26,c:'#514534'})
}
function bard(root){
 root.userData.species='songbird';const body=group(root,'golden-songbird');motion(root,body,'breath');
 ell(body,0,.62,0,.30,.39,.26,'#d6a43f','feather');ell(body,0,.49,-.15,.24,.28,.16,'#d2c7a3','feather');ell(body,0,1.00,-.02,.195,.22,.21,'#d8aa44','feather');ell(body,0,.88,-.17,.17,.14,.055,'#e4d3a2')
 for(const s of [-1,1]){ell(body,s*.15,1.03,-.15,.068,.075,.04,'#473d2a');eye(body,s*.15,1.05,-.18,.031);const leg=group(body,'bird-leg',s*.12,.29,0);rod(leg,[0,0,0],[0,-.18,-.02],.023,'#706542');for(let j=-1;j<=1;j++)rod(leg,[0,-.18,-.02],[j*.07,-.225,-.16],.014,'#706542');motion(root,leg,'leg',{phase:s<0?0:Math.PI})}
 const beak=mesh(body,new T.ConeGeometry(.053,.24,8),'#796029',0,1.01,-.30);beak.rotation.x=-Math.PI/2
 const wing=group(body,'strumming-wing',-.23,.67,-.08);motion(root,wing,'strum');ell(wing,-.015,0,0,.12,.25,.10,'#d4a24a','feather');for(let i=0;i<7;i++){const f=ell(wing,-.025+i*.023,-.10-i*.02,-.045,.030,.19,.025,i<3?'#e2b45c':'#695a35');f.rotation.z=.25+i*.055}
 const farWing=ell(body,.24,.64,.08,.12,.31,.14,'#665b3b','feather');farWing.rotation.z=-.13
 for(let i=0;i<6;i++){const t=ell(body,(i-2.5)*.045,.30,.33,.041,.045,.35,i%2?'#626045':'#a28a40','feather');t.rotation.x=.26}
 const lute=group(body,'lute',.09,.55,-.28);lute.rotation.z=-.38;ell(lute,0,0,0,.20,.23,.07,'#ba8032','bark');ell(lute,0,0,-.064,.175,.20,.025,'#d3aa5c');ell(lute,0,.035,-.087,.055,.064,.009,'#4a3924');box(lute,0,.29,0,.057,.40,.045,'#70502c');box(lute,0,-.12,-.10,.14,.02,.02,'#6c4626');for(let i=0;i<4;i++)rod(lute,[(i-1.5)*.012,-.12,-.104],[(i-1.5)*.012,.47,-.032],.0025,'#efdab0');for(let i=0;i<3;i++)rod(lute,[-.06,.39+i*.045,0],[.06,.39+i*.045,0],.009,P.cut)
 ell(body,.28,.76,-.24,.07,.10,.06,'#b79954')
}
function doctor(root){
 root.userData.species='porcupine';const body=group(root,'quilled-scholar');motion(root,body,'breath');const rng=random(901)
 ell(body,0,.50,.06,.35,.38,.29,'#796454','fur');ell(body,0,.92,.0,.29,.30,.24,'#8e7766','fur');ell(body,0,.82,-.20,.20,.15,.17,'#9f8470');ell(body,0,.86,-.34,.07,.05,.05,'#644e40')
 for(const s of [-1,1]){motion(root,ell(body,s*.14,.10,-.10,.15,.08,.18,'#655548'),'foot',{phase:s<0?0:Math.PI});eye(body,s*.115,.98,-.20,.032);torus(body,s*.115,.99,-.252,.075,.009,'#c2bb9e');ell(body,s*.19,1.11,-.015,.058,.06,.035,'#b69e8b')}
 rod(body,[-.04,.99,-.252],[.04,.99,-.252],.008,'#c2bb9e')
 for(let i=0;i<100;i++){const a=(rng()-.5)*Math.PI*1.45,b=rng();const x=Math.sin(a)*(.22+b*.10),y=.63+b*.62,z=.04+Math.cos(a)*.19;const end=[x*1.45,y+.18+rng()*.16,z+.15+rng()*.07];rod(body,[x,y,z],end,.013,i%3?'#796658':'#c0ad93',.002)}
 ell(body,0,.73,-.04,.32,.09,.24,P.green,'cloth');const scarf=ell(body,.16,.60,-.24,.10,.23,.032,'#466750','cloth');scarf.rotation.z=-.22
 const paw=group(body,'berry-paw',-.33,.70,-.14);ell(paw,0,0,0,.13,.11,.12,'#8e7766','fur');const berry=ell(paw,-.04,.17,-.05,.125,.13,.12,P.blue);for(let j=0;j<5;j++){const a=j*1.256;ell(paw,-.04+Math.sin(a)*.025,.28,-.05+Math.cos(a)*.025,.014,.012,.022,'#263b53')}motion(root,paw,'inspect')
 ell(body,.31,.58,-.19,.10,.11,.09,'#927c66');rod(body,[.28,.55,-.24],[.39,1.10,-.16],.012,'#bcad8d');for(let i=0;i<13;i++){let y=.84+i*.025;rod(body,[.34+(y-.84)*.2,y,-.18],[.40+(y-.84)*.2,y+.045,-.18],.008,'#d1c7a4')}
}
function bark(g,x,y,z,r,h,seed=4){const trunk=cyl(g,x,y+h/2,z,r,h,P.bark,r*.82,15,'bark'),rng=random(seed);for(let i=0;i<16;i++){const a=i*Math.PI/8;curve(g,[[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(a+.06)*r*.94,y+h*.45,z+Math.cos(a+.06)*r*.94],[x+Math.sin(a+.02)*r*.83,y+h,z+Math.cos(a+.02)*r*.83]],.012+rng()*.014,i%3?'#594530':'#94804d','bark')}return trunk}
function crane(root){
 root.userData.silhouette='timber-cabin-lattice-boom';const base=group(root,'raised-timber-cabin');
 for(const x of [-.34,.34])for(const z of [-.24,.24])rod(base,[x,.06,z],[x,.59,z],.06,P.wood,.052,'bark')
 for(let i=0;i<8;i++)box(base,-.45+i*.13,.49,0,.12,.07,.75,i%2?'#85613b':'#6e4b31','bark')
 cyl(base,.18,1.02,.10,.35,.90,P.wood,.34,13,'bark');for(let i=0;i<14;i++){const a=i*Math.PI/7;rod(base,[.18+Math.sin(a)*.35,.59,.10+Math.cos(a)*.35],[.18+Math.sin(a)*.34,1.45,.10+Math.cos(a)*.34],.018,'#4e3929')}
 box(base,.18,1.24,-.253,.33,.27,.02,'#374745');for(const x of [.02,.18,.34])rod(base,[x,1.10,-.27],[x,1.37,-.27],.014,'#b08b52')
 const roof=mesh(base,new T.ConeGeometry(.48,.29,10),'#715037',.18,1.58,.1,'bark');roof.rotation.y=.15;for(let i=0;i<10;i++){const a=i*Math.PI/5;rod(base,[.18,1.73,.10],[.18+Math.sin(a)*.47,1.44,.10+Math.cos(a)*.47],.017,'#9a754a')}
 const boom=group(root,'inclined-lattice-boom');for(const z of [-.12,.12]){rod(boom,[-.26,.35,z],[-.74,2.12,z],.048,'#65462d');rod(boom,[.01,.35,z],[-.47,2.12,z],.048,'#65462d');for(let i=0;i<7;i++){const y=.42+i*.24,x=-.04-(y-.35)*.271;rod(boom,[x,y,z],[x-.27,y,z],.026,'#ab8450');if(i<6)rod(boom,[x-.27,y,z],[x-.065,y+.24,z],.022,'#705335')}}
 rod(boom,[-.72,2.13,-.12],[-.72,2.13,.12],.04,'#3a3329');const pulley=cyl(boom,-.72,2.08,-.17,.09,.07,'#4d4130');pulley.rotation.x=Math.PI/2
 const cargo=group(root,'suspended-stone-sling',-.75,1.82,-.16);motion(root,cargo,'cargo');rod(cargo,[0,0,0],[0,-.68,0],.008,P.rope);torus(cargo,0,-.72,0,.055,.013,'#42392c');ell(cargo,0,-1.00,0,.22,.17,.18,'#6e6f60');for(const s of [-1,1])curve(cargo,[[0,-.77,0],[s*.19,-.96,.07],[0,-1.12,.07]],.012,P.rope);ell(cargo,-.05,-.91,-.01,.15,.10,.12,'#959181')
 for(let i=0;i<3;i++)box(root,.45-i*.18,.12,-.46,.16,.17,.28,'#a48653','bark')
}
function fungus(g,x,y,z,rx,rz,c){const f=ell(g,x,y,z,rx,.075,rz,c);ell(g,x,y-.035,z,rx*.91,.027,rz*.94,'#c8ad68');return f}
function refinery(root){
 root.userData.silhouette='tree-root-amber-shelves';const trunk=group(root,'old-resin-tree');bark(trunk,.18,0,.24,.45,1.95,81)
 for(let i=0;i<7;i++){const a=i*Math.PI*2/7;curve(trunk,[[.18,1.1,.24],[.18+Math.sin(a)*.43,.27,.24+Math.cos(a)*.43],[.18+Math.sin(a)*.76,.04,.24+Math.cos(a)*.68]],.08,P.bark,'bark')}
 ell(root,-.16,.30,-.31,.33,.29,.11,'#443e2a');box(root,-.15,.22,-.405,.20,.34,.025,'#252d21');for(const x of [-.30,.02])rod(root,[x,.06,-.42],[x,.42,-.42],.035,'#b6904c')
 fungus(root,-.15,.57,-.31,.54,.39,'#b28b3d');fungus(root,-.15,.68,-.29,.41,.31,'#cc9c37');fungus(root,.42,.25,-.20,.30,.26,'#a37e36');fungus(root,-.40,.10,.05,.28,.22,'#c39a40')
 for(let i=0;i<5;i++)fungus(root,.48,.86+i*.17,.07,.20-i*.02,.18,'#999148')
 curve(root,[[-.55,.60,-.12],[-.64,.97,-.18],[-.65,1.30,-.17]],.034,'#99834a');curve(root,[[.46,1.18,-.04],[.56,.98,-.20],[.36,.76,-.36]],.031,'#ac904c')
 for(const [x,z] of [[-.45,-.57],[.28,-.58]]){const bowl=ell(root,x,.13,z,.19,.08,.16,'#8a6c36');ell(root,x,.17,z,.15,.024,.12,'#d5a139');const drop=ell(root,x,.39,z,.027,.046,.027,'#e0b650');motion(root,drop,'drop',{phase:x+1})}
 for(let i=0;i<12;i++){const a=i*2.4;leaf(root,Math.sin(a)*.65,.07,Math.cos(a)*.65,.18,a,'#7c8a43')}
 // Cut top remains organic; no invented copper boiler or cottage
 cyl(trunk,.18,1.955,.24,.37,.025,'#b29861',.37,15);for(let i=0;i<3;i++){const ring=torus(trunk,.18,1.975,.24,.11+i*.07,.007,'#847044');ring.rotation.x=Math.PI/2}
}
function clockTower(root){
 root.userData.silhouette='stone-clock-waterwheel';const rng=random(14),tower=group(root,'river-clock-tower');
 cyl(tower,-.18,.92,.08,.29,1.65,'#8c8e7b',.255,12,'stone');for(let i=0;i<45;i++){const a=rng()*Math.PI*2,y=.19+rng()*1.39;const stone=ell(tower,-.18+Math.sin(a)*.28,y,.08+Math.cos(a)*.28,.06,.037,.022,i%2?'#959886':'#6b7568','stone');stone.rotation.y=a}
 for(let i=0;i<16;i++){const a=i*2.4,r=.32+rng()*.16;ell(tower,-.18+Math.sin(a)*r,.09+rng()*.10,.08+Math.cos(a)*r,.12+rng()*.08,.12,.11,'#6e7b73','stone')}
 const roof=mesh(tower,new T.ConeGeometry(.43,.24,9),'#6c6046',-.18,1.83,.08,'bark');for(let i=0;i<32;i++){const a=i*Math.PI/16;rod(tower,[-.18,1.95,.08],[-.18+Math.sin(a)*.46,1.70+rng()*.07,.08+Math.cos(a)*.46],.012,'#988465')}
 const face=cyl(tower,-.18,1.40,-.20,.209,.044,'#cec8ad');face.rotation.x=Math.PI/2;torus(tower,-.18,1.40,-.23,.205,.015,'#6d6c59');for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(tower,[-.18+Math.sin(a)*.153,1.4+Math.cos(a)*.153,-.23],[-.18+Math.sin(a)*.177,1.4+Math.cos(a)*.177,-.23],.004,'#4b5048')}
 const hands=group(tower,'clock-hands',-.18,1.40,-.245);rod(hands,[0,0,0],[.075,.06,0],.008,'#41483f');const minute=rod(hands,[0,0,0],[0,.143,0],.006,'#41483f');motion(root,minute,'clock')
 const wheel=group(root,'external-waterwheel',.38,.72,.10);wheel.rotation.y=Math.PI/2;motion(root,wheel,'wheel');for(const z of [-.15,.15]){torus(wheel,0,0,z,.63,.039,'#665840');torus(wheel,0,0,z,.49,.025,'#9d8962');for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(wheel,[0,0,z],[Math.sin(a)*.60,Math.cos(a)*.60,z],.020,'#8a7956')}}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;const paddle=box(wheel,Math.sin(a)*.63,Math.cos(a)*.63,0,.14,.028,.37,i%2?'#807455':'#ab9770','bark');paddle.rotation.z=-a}
 rod(root,[.10,.72,.10],[.63,.72,.10],.05,'#5f553e');root.userData.waterwheel=wheel
}
export function createCardStyleSample(name){
 if(!CARD_STYLE_SAMPLE_NAMES.includes(name))throw new Error('Unknown source-backed sample: '+name)
 const root=new T.Group();root.name=name;root.userData={cardName:name,modelKey:name,modelVersion:2,isCritter:['Architect','Bard','Doctor'].includes(name),motions:[],sourceBacked:true}
 ;({Architect:architect,Bard:bard,Doctor:doctor,Crane:crane,'Resin Refinery':refinery,'Clock Tower':clockTower})[name](root)
 return root
}
export function animateCardStyleSample(root,time){
 for(const m of root.userData.motions){const {obj,rotation,position}=m
  if(m.type==='breath'){obj.position.y=position.y+Math.sin(time*2)*.012;obj.rotation.z=rotation.z+Math.sin(time*.7)*.012}
  if(m.type==='write')obj.rotation.z=rotation.z+Math.sin(time*2.5)*.10
  if(m.type==='strum')obj.rotation.x=rotation.x+Math.sin(time*5)*.15
  if(m.type==='inspect')obj.rotation.z=rotation.z+Math.sin(time*1.1)*.10
  if(m.type==='cargo')obj.rotation.z=rotation.z+Math.sin(time*.9)*.055
  if(m.type==='wheel')obj.rotation.z=rotation.z-time*.12
  if(m.type==='clock')obj.rotation.z=rotation.z-time*.014
  if(m.type==='drop'){const p=(time*.7+m.phase)%1;obj.position.y=position.y-p*.20;obj.scale.y=.8+p*.5;obj.visible=p<.86}
  if(m.type==='foot'){const stride=root.userData.walking?Math.sin(time*8+m.phase):0;obj.position.z=position.z+stride*.065;obj.position.y=position.y+Math.max(0,stride)*.045}
  if(m.type==='leg')obj.rotation.x=rotation.x+(root.userData.walking?Math.sin(time*9+m.phase)*.36:0)
 }
}
export function createCardStyleClearing(){
 const root=new T.Group();root.name='painted-forest-clearing';const rng=random(421)
 ell(root,0,-.12,0,3.6,.16,3.05,'#7c8654','moss');ell(root,0,-.13,0,3.65,.13,3.10,'#5d5939','bark');ell(root,0,-.015,0,1.32,.025,1.20,'#979367','moss')
 for(let i=0;i<105;i++){
  const a=rng()*Math.PI*2,r=1.5+rng()*1.9,x=Math.sin(a)*r,z=Math.cos(a)*r*.82
  if(i%5===0){ell(root,x,.03,z,.08+rng()*.12,.06,.10,'#92977d','stone');continue}
  const stem=group(root,'fern',x,.015,z);stem.rotation.y=rng()*6.28;for(let j=0;j<5;j++){const h=.025+j*.035;for(const s of [-1,1])leaf(stem,s*(.12-j*.019),h,0,.07-j*.007,s*.65,i%2?'#7d914e':'#536e42')}
 }
 for(const [x,z,r,h] of [[-2.6,1.9,.24,2.6],[2.5,1.4,.32,3.2],[-1.5,2.4,.17,2.1]]){bark(root,x,0,z,r,h,Math.round(h*100));for(let i=0;i<4;i++){const a=i*Math.PI/2;curve(root,[[x,.60,z],[x+Math.sin(a)*.30,.13,z+Math.cos(a)*.30],[x+Math.sin(a)*.60,.01,z+Math.cos(a)*.60]],.055,P.bark);rod(root,[x,h*.70,z],[x+Math.sin(a)*.74,h+.12,z+Math.cos(a)*.65],.08,P.bark,.025)}for(let i=0;i<72;i++){const a=i*2.4,r=.12+rng()*.85;leaf(root,x+Math.sin(a)*r,h-.18+rng()*.65,z+Math.cos(a)*r,.19+rng()*.19,a,['#455d36','#708748','#87984f'][i%3])}}
 for(let i=0;i<16;i++){const a=rng()*6.28,r=1.5+rng()*1.4,x=Math.sin(a)*r,z=Math.cos(a)*r*.80;rod(root,[x,0,z],[x,.12,z],.009,'#9eaa68');ell(root,x,.15,z,.045,.018,.042,i%2?'#d9c78c':'#bfbb96')}
 return mergeStaticScenery(root)
}
// Hundreds of painted leaves retain their geometry but share a few draw calls
function mergeStaticScenery(root){
 root.updateMatrixWorld(true);const batches=new Map(),result=new T.Group();result.name=root.name
 root.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrixWorld);const batch=batches.get(m.material)??[];batch.push(geo);batches.set(m.material,batch)})
 for(const [mat,geometries]of batches){const merged=new T.BufferGeometry();for(const key of ['position','normal','uv']){const count=geometries.reduce((n,g)=>n+g.getAttribute(key).array.length,0),data=new Float32Array(count);let offset=0;for(const geo of geometries){const values=geo.getAttribute(key).array;data.set(values,offset);offset+=values.length}merged.setAttribute(key,new T.BufferAttribute(data,key==='uv'?2:3))}const m=new T.Mesh(merged,mat);m.castShadow=m.receiveShadow=true;result.add(m);geometries.forEach(g=>g.dispose())}
 root.traverse(m=>m.geometry?.dispose());return result
}
