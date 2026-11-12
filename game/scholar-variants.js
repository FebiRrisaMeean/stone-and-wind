import * as THREE from '../vendor/three.module.js'

// All three studies use -Z as the viewing direction and Y as vertical
// A single implicit skin joins torso, neck, muzzle, arms, hands, haunches and feet
// The unseen back and feet are restrained reconstructions of the card portrait
export const SCHOLAR_VARIANTS = [
  {id:'card', title:'По иллюстрации'},
  {id:'natural', title:'Естественная анатомия'},
  {id:'miniature', title:'Игровая скульптура'},
]

const V = (x,y,z) => new THREE.Vector3(x,y,z)
const configurations = {
  card: {
    body:[0,.67,.065,.335,.55,.29], neck:[0,1.04,.015,.27,.33,.265],
    head:[0,1.29,.005,.293,.365,.265], muzzle:[0,1.19,-.315,.19,.115,.285],
    nose:[0,1.20,-.572], eye:[.157,1.347,-.283], eyeSize:.029,
    glasses:[.153,1.247,-.475,.071], crown:1.62, coat:'#695246',
    shoulders:[[-.265,.94,-.015],[.265,.94,-.015]],
    elbows:[[-.46,.72,-.215],[.435,.71,-.14]],
    wrists:[[-.49,.875,-.455],[.435,.82,-.375]],
    berry:[-.49,1.065,-.475], berryRadius:.176, feather:[.435,.82,-.405],
    scarfY:1.035, scarfWidth:.313, scarfDepth:.28, quills:58, pose:[-.095,.22,-.025],
  },
  natural: {
    body:[0,.57,.17,.405,.475,.38], neck:[0,.92,-.04,.27,.24,.275],
    head:[0,1.095,-.21,.225,.225,.255], muzzle:[0,1.045,-.445,.135,.085,.265],
    nose:[0,1.025,-.716], eye:[.129,1.167,-.391], eyeSize:.019,
    glasses:[.125,1.075,-.545,.057], crown:1.31, coat:'#665143',
    shoulders:[[-.31,.84,.02],[.31,.84,.02]],
    elbows:[[-.43,.64,-.23],[.40,.58,-.205]],
    wrists:[[-.385,.74,-.50],[.355,.70,-.435]],
    berry:[-.385,.925,-.52], berryRadius:.17, feather:[.355,.70,-.455],
    scarfY:.89, scarfWidth:.32, scarfDepth:.31, quills:94, pose:[-.11,.16,-.02],
  },
  miniature: {
    body:[0,.56,.09,.43,.43,.34], neck:[0,.90,.025,.31,.24,.28],
    head:[0,1.115,-.005,.315,.285,.255], muzzle:[0,1.035,-.29,.205,.115,.24],
    nose:[0,1.025,-.512], eye:[.166,1.19,-.267], eyeSize:.028,
    glasses:[.157,1.075,-.435,.075], crown:1.39, coat:'#705346',
    shoulders:[[-.33,.80,-.005],[.33,.80,-.005]],
    elbows:[[-.46,.59,-.20],[.455,.58,-.14]],
    wrists:[[-.47,.73,-.42],[.45,.69,-.355]],
    berry:[-.47,.915,-.44], berryRadius:.17, feather:[.45,.69,-.385],
    scarfY:.88, scarfWidth:.355, scarfDepth:.30, quills:22, pose:[-.06,.17,-.02],
  },
}

function group(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g}
function mat(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.96,metalness:0,...extra})}
function surface(parent,name,geometry,material){
  const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m
}
function geometry(positions,indices,colors){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  if(indices)g.setIndex(indices)
  if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g
}
function ellipsoid(x,y,z,rx,ry,rz){
  return p=>{const a=(p.x-x)/rx,b=(p.y-y)/ry,c=(p.z-z)/rz
    const k0=Math.hypot(a,b,c),k1=Math.hypot(a/rx,b/ry,c/rz)
    return k1<1e-10?-Math.min(rx,ry,rz):k0*(k0-1)/k1}
}
function limb(a,b,r,depth=r){
  const center=V(...a).add(V(...b)).multiplyScalar(.5),axis=V(...b).sub(V(...a)),length=axis.length()
  const q=new THREE.Quaternion().setFromUnitVectors(axis.normalize(),V(0,1,0))
  const shape=ellipsoid(0,0,0,r,length*.5+r*.7,depth)
  return p=>shape(p.clone().sub(center).applyQuaternion(q))
}
function smoothMin(a,b,k=.075){const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25}
function headMatrix(c){
  const pivot=V(0,c.head[1]-.17,c.head[2]+.045)
  return new THREE.Matrix4().makeTranslation(...pivot.toArray())
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...c.pose)))
    .multiply(new THREE.Matrix4().makeTranslation(...pivot.negate().toArray()))
}
function posedShape(shape,c){const inverse=headMatrix(c).invert();return p=>shape(p.clone().applyMatrix4(inverse))}
function craniumParameters(c,id,y){
  const h=c.head,t=(y-h[1])/h[4],taper=id==='natural'?.10:id==='miniature'?.24:.40
  return {rx:h[3]*(1-taper*Math.max(0,Math.min(1,(t+.15)/1.15))),ry:h[4],rz:h[5]*(1-.10*Math.max(0,t)),
    cy:h[1],cz:h[2]+(id==='card'?.15:.07)*Math.max(0,t),power:id==='miniature'?3.6:id==='card'?2.7:2}
}
function cranium(c,id){return p=>{const q=craniumParameters(c,id,p.y),n=(Math.abs(p.x/q.rx)**q.power+Math.abs((p.y-q.cy)/q.ry)**q.power+Math.abs((p.z-q.cz)/q.rz)**q.power)**(1/q.power)
  return (n-1)*Math.min(q.rx,q.ry,q.rz)}}
function foreheadZ(c,id,x,y){const q=craniumParameters(c,id,y),v=1-Math.abs(x/q.rx)**q.power-Math.abs((y-q.cy)/q.ry)**q.power
  return q.cz-q.rz*Math.max(.001,v)**(1/q.power)}
function wedgeMuzzle(c,id){return p=>{
  const start=c.head[2]-.025,end=c.nose[2]+.035,length=start-end,t=(start-p.z)/length,u=Math.max(0,Math.min(1,t))
  const rx=(id==='natural'?.155:id==='miniature'?.22:.205)*(1-u)**.68+.024,ry=(id==='natural'?.075:.105)*(1-u)**.58+.022
  const y=c.nose[1]+.052*(1-u),power=id==='miniature'?3:2.5
  const radial=((Math.abs(p.x/rx)**power+Math.abs((p.y-y)/ry)**power)**(1/power)-1)*Math.min(rx,ry)
  return Math.max(radial,-t*length,(t-1)*length)
}}
function faceSurfaceZ(c,id,x,y){
  const head=cranium(c,id),muzzle=wedgeMuzzle(c,id),point=V(x,y,-1)
  let lo=-1,hi=c.head[2]+.15
  // First crossing from the face side, followed by a short binary refinement
  for(let i=0;i<=100;i++){const z=-1+i*(hi+1)/100;point.z=z
    if(smoothMin(head(point),muzzle(point),.065)<=0){hi=z;lo=z-(c.head[2]+1.15)/100;break}}
  for(let i=0;i<16;i++){point.z=(lo+hi)/2;if(smoothMin(head(point),muzzle(point),.065)>0)lo=point.z;else hi=point.z}
  return hi
}

// Marching tetrahedra with a shared edge cache, so the skin has continuous normals
// Broad swept fur planes are a low-amplitude part of this surface, never hair wires
function sculptSkin(c,id){
  const shapes=[ellipsoid(...c.body),ellipsoid(...c.neck),posedShape(cranium(c,id),c),posedShape(wedgeMuzzle(c,id),c)]
  if(id==='natural')shapes.push(ellipsoid(0,.875,.245,.37,.36,.31))
  for(let side=0;side<2;side++){
    shapes.push(limb(c.shoulders[side],c.elbows[side],id==='natural'?.105:.12))
    shapes.push(limb(c.elbows[side],c.wrists[side],id==='natural'?.083:.09))
    const p=c.wrists[side];shapes.push(ellipsoid(p[0],p[1],p[2],.091,.070,.105))
  }
  for(const s of [-1,1]){
    shapes.push(ellipsoid(s*.185,id==='card'?.235:.19,.055,id==='natural'?.17:.15,id==='card'?.20:.155,.175))
    shapes.push(ellipsoid(s*.19,.076,-.115,.125,.078,id==='natural'?.18:.20))
    // Feet terminate at the shared floor, with short toe planes instead of shoes
    for(let n=0;n<3;n++)shapes.push(ellipsoid(s*.19+(n-1)*.045,.046,-.265,.034,.044,.052))
  }
  const sample=p=>{
    let d=shapes[0](p);for(let i=1;i<shapes.length;i++)d=smoothMin(d,shapes[i](p),.065)
    const face=p.y>1.04&&p.z<-.20
    if(!face&&p.y>.30){
      const a=Math.atan2(p.x,p.z-.06)
      d+=(id==='miniature'?.011:.002)*Math.sin((id==='miniature'?9:18)*a+p.y*15)*Math.sin(p.y*9+p.z*5)
    }
    return Math.max(d,-p.y)
  }
  c.sampleSkin=sample
  const nx=45,ny=76,nz=52,min=V(-.67,0,-.80),step=V(1.34/nx,1.83/ny,1.47/nz)
  const points=[],values=[],index=(x,y,z)=>(y*(nz+1)+z)*(nx+1)+x
  for(let y=0;y<=ny;y++)for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){
    const p=V(min.x+x*step.x,min.y+y*step.y,min.z+z*step.z)
    points.push(p);values.push(sample(p))
  }
  const positions=[],indices=[],colors=[],edgeCache=new Map(),base=new THREE.Color(c.coat)
  const edge=(a,b)=>{
    const key=a<b?a+':'+b:b+':'+a;if(edgeCache.has(key))return edgeCache.get(key)
    const t=values[a]/(values[a]-values[b]),p=points[a].clone().lerp(points[b],t),i=positions.length/3
    positions.push(...p.toArray())
    const plane=.91+.075*Math.sin(p.y*8+p.x*3)+.045*Math.cos(p.z*9-p.y*3)
    const front=(p.z<-.10&&p.y>1.06)?.07:0
    colors.push(base.r*(plane+front),base.g*(plane+front),base.b*(plane+front))
    edgeCache.set(key,i);return i
  }
  const tetrahedra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
  const triangle=(a,b,c,inside)=>{
    const aa=V(...positions.slice(a*3,a*3+3)),bb=V(...positions.slice(b*3,b*3+3)),cc=V(...positions.slice(c*3,c*3+3))
    if(bb.sub(aa).cross(cc.sub(aa)).dot(inside.clone().sub(aa))>0)indices.push(a,c,b)
    else indices.push(a,b,c)
  }
  for(let y=0;y<ny;y++)for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){
    const cell=[index(x,y,z),index(x+1,y,z),index(x+1,y,z+1),index(x,y,z+1),index(x,y+1,z),index(x+1,y+1,z),index(x+1,y+1,z+1),index(x,y+1,z+1)]
    if(cell.every(i=>values[i]>=0)||cell.every(i=>values[i]<0))continue
    for(const tet of tetrahedra){
      const ids=tet.map(i=>cell[i]),ins=ids.filter(i=>values[i]<0),out=ids.filter(i=>values[i]>=0)
      if(ins.length===0||ins.length===4)continue
      if(ins.length===1){const v=out.map(o=>edge(ins[0],o));triangle(...v,points[ins[0]])}
      else if(ins.length===3){const v=ins.map(i=>edge(i,out[0]));triangle(...v,points[ins[0]])}
      else {const a=edge(ins[0],out[0]),b=edge(ins[0],out[1]),c=edge(ins[1],out[0]),d=edge(ins[1],out[1]);triangle(a,b,c,points[ins[0]]);triangle(b,d,c,points[ins[0]])}
    }
  }
  return geometry(positions,indices,colors)
}

// A closed, swept, tapered volume, used for quill bundles, fingers and the nose
function sweep(parent,name,centers,widths,depths,color,{segments=8,flat=false,tipColor=null}={}){
  const positions=[],indices=[],colors=[],base=new THREE.Color(color),tip=new THREE.Color(tipColor??color)
  for(let j=0;j<centers.length;j++){
    const p=V(...centers[j]),tangent=V(...centers[Math.min(j+1,centers.length-1)]).sub(V(...centers[Math.max(0,j-1)] )).normalize()
    let across=V(1,0,0);if(Math.abs(tangent.x)>.9)across=V(0,0,1)
    across.addScaledVector(tangent,-across.dot(tangent)).normalize();const up=tangent.clone().cross(across).normalize()
    for(let k=0;k<segments;k++){const a=k*Math.PI*2/segments;positions.push(...p.clone().addScaledVector(across,Math.cos(a)*widths[j]).addScaledVector(up,Math.sin(a)*depths[j]).toArray())
      const shade=base.clone().lerp(tip,Math.max(0,(j/(centers.length-1)-.68)/.32));colors.push(shade.r,shade.g,shade.b)}
  }
  for(let j=0;j<centers.length-1;j++)for(let k=0;k<segments;k++){
    const a=j*segments+k,b=j*segments+(k+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c)
  }
  // Ring winding follows the local swept frame, including the two end caps
  const start=positions.length/3;positions.push(...centers[0]);const end=positions.length/3;positions.push(...centers[centers.length-1])
  colors.push(base.r,base.g,base.b,tip.r,tip.g,tip.b)
  for(let k=0;k<segments;k++){indices.push(start,(k+1)%segments,k);const a=(centers.length-1)*segments;indices.push(end,a+k,a+(k+1)%segments)}
  return surface(parent,name,geometry(positions,indices,tipColor?colors:null),mat(tipColor?'#ffffff':color,{flatShading:flat,vertexColors:!!tipColor}))
}
function line(parent,name,points,r,color){
  const path=new THREE.CatmullRomCurve3(points.map(p=>V(...p)))
  return surface(parent,name,new THREE.TubeGeometry(path,Math.max(8,points.length*5),r,6,false),mat(color))
}
function oval(parent,name,p,radii,color){
  const g=new THREE.SphereGeometry(1,16,10);g.scale(...radii);const m=surface(parent,name,g,mat(color));m.position.set(...p);return m
}

function addFace(parent,c,id){
  const face=group(parent,'face-inlaid-eyes-and-muzzle'),[ex,ey,ez]=c.eye,r=c.eyeSize
  const faceZ=(x,y)=>faceSurfaceZ(c,id,x,y)
  for(const s of [-1,1]){
    // Small black eyes lie in their sockets, with pale over-eye markings above them
    const patchPositions=[],patchIndices=[]
    for(let k=0;k<=18;k++)for(let j=0;j<2;j++){
      const a=k/18*Math.PI,rad=r*(j?1.68:1.04),x=s*ex+Math.cos(a)*rad,y=ey+.008+Math.sin(a)*rad
      patchPositions.push(x,y,faceZ(x,y)-.005)
    }
    for(let k=0;k<18;k++){const a=k*2;patchIndices.push(a,a+1,a+2,a+1,a+3,a+2)}
    surface(face,'pale-marking-flush-with-brow-surface',geometry(patchPositions,patchIndices),mat('#d2c4aa',{side:THREE.DoubleSide}))
    const z=faceZ(s*ex,ey)
    const socket=oval(face,'recessed-eye-socket',[s*ex,ey,z-.003],[r*1.26,r*1.22,.010],'#4c3b30')
    const eye=oval(face,'small-black-eye',[s*ex-r*.14,ey-r*.08,z-.011],[r*.86,r, .009],'#181915')
    eye.userData.blink=true;eye.userData.originalScaleY=eye.scale.y
    oval(face,'eye-catchlight',[s*ex-r*.29,ey+r*.22,z-.021],[r*.15,r*.15,.002],'#d8d0b9')
    socket.rotation.y=s*.08
  }
  const [nx,ny,nz]=c.nose
  const noseWidth=id==='natural'?.043:.057
  sweep(face,'small-tapered-nose',[[nx,ny,nz+.034],[nx,ny+.003,nz-.012],[nx,ny+.006,nz-.032]],[noseWidth,noseWidth*.88,.022],[.032,.027,.016],'#44332c',{segments:id==='miniature'?6:10})
  line(face,'mouth-carved-below-muzzle',[[nx-.053,ny-.078,nz+.045],[nx,ny-.087,nz+.026],[nx+.048,ny-.072,nz+.048]],.004,'#3b3029')
  const glasses=group(parent,'spectacles-bridge-and-supported-temples'),[gx,gy,gz,gr]=c.glasses
  for(const s of [-1,1]){
    const pts=[];for(let k=0;k<=40;k++){const a=k/40*Math.PI*2,x=s*gx+Math.cos(a)*gr,y=gy+Math.sin(a)*gr*.82
      pts.push([x,y,Math.min(gz+.055*Math.cos(a)*s,faceZ(x,y)-.023)])}
    line(glasses,'low-oval-rim',pts,.0085,'#acaa91')
    line(glasses,'temple-supported-on-head',[[s*(gx+gr),gy,Math.min(gz+.055,faceZ(s*(gx+gr),gy)-.023)],[s*(gx+gr+.022),gy+.022,gz+.17],[s*(craniumParameters(c,id,gy+.055).rx-.004),gy+.055,c.head[2]+.015]],.0065,'#999981')
  }
  const bridge=[];for(let i=0;i<=8;i++){const x=(-gx+gr)+(gx-gr)*2*i/8,y=gy+.008+.007*Math.sin(i/8*Math.PI)
    bridge.push([x,y,Math.min(faceZ(x,y)-.018,gz-.055)])}
  line(glasses,'bridge-over-muzzle',bridge,.0075,'#b9b69b')
  face.applyMatrix4(headMatrix(c));glasses.applyMatrix4(headMatrix(c))
}

function addScarf(parent,c,id){
  const cloth=group(parent,'scarf-fitted-to-shoulders-and-chest'),positions=[],indices=[]
  const count=56,rows=7
  // Fit cloth to the actual combined body surface rather than a guessed cylinder
  const point=(a,u,clearance=.012)=>{
    const front=Math.max(0,-Math.cos(a)),y=c.scarfY+.095-u*(.15+front*.12)+.012*Math.sin(a*3+u*5)
    const relief=clearance-.012,designed=V(Math.sin(a)*(c.scarfWidth+u*.028+relief),y,Math.cos(a)*(c.scarfDepth+front*u*.035+relief)+.008)
    // The front is a loose drape across the chest, not cloth shrink-wrapped to the arms
    if(Math.cos(a)<=0)return designed.toArray()
    let low=0,high=1.2
    for(let step=0;step<24;step++){const radius=(low+high)*.5,p=V(Math.sin(a)*radius,y,Math.cos(a)*radius+.008);if(c.sampleSkin(p)<0)low=radius;else high=radius}
    const radius=high+clearance
    return designed.lerp(V(Math.sin(a)*radius,y,Math.cos(a)*radius+.008),Math.min(1,Math.cos(a)*4)).toArray()
  }
  for(let j=0;j<=rows;j++)for(let i=0;i<=count;i++){
    positions.push(...point(i/count*Math.PI*2,j/rows))
  }
  for(let j=0;j<rows;j++)for(let i=0;i<count;i++){const a=j*(count+1)+i,b=a+1,d=a+count+1;indices.push(a,b,d,b,d+1,d)}
  surface(cloth,'continuous-wrapped-fabric',geometry(positions,indices),mat('#355b48',{side:THREE.DoubleSide}))
  for(let f=0;f<3;f++){
    const points=[];for(let i=0;i<=20;i++)points.push(point(Math.PI*.52+i/20*Math.PI*.96,.22+f*.27,.018))
    line(cloth,'woven-fold-following-wrap',points,.007,f===1?'#547763':'#294b3d')
  }
  const x=c.scarfWidth*.72,y=c.scarfY-.03,z=-c.scarfDepth*.72
  // The loose end emerges from the shoulder wrap and stays against the torso
  sweep(cloth,'draped-scarf-end',[[x,y,z],[x*.98,y-.16,z-.035],[x*.75,y-.33,z-.035]],[.092,.085,.066],[.016,.016,.010],'#31523f',{segments:6,flat:id==='miniature'})
}

function addQuills(parent,c,id){
  const quills=group(parent,id==='miniature'?'sculpted-directional-mantle':'surface-rooted-quill-bundles')
  const color=id==='miniature'?'#725548':'#6c5345',tipColor=id==='miniature'?'#927662':'#9a826d'
  // No unsupported belts of body spikes: only the visible upper head has a quill flow
  const backRows=id==='miniature'?2:3,backCols=id==='miniature'?6:9
  for(let row=0;row<backRows;row++)for(let i=0;i<backCols;i++){
    const a=-1.36+i/(backCols-1)*2.72+Math.sin(row*1.8+i*.6)*.045
    const h=.10+row*.18+.025*Math.cos(i*.9),y=c.head[1]+c.head[4]*h,q=craniumParameters(c,id,y)
    const section=(1-h**q.power)**(1/q.power),x=Math.sin(a)*q.rx*section,z=q.cz+Math.cos(a)*q.rz*section
    const root=V(x,y,z),L=(id==='natural'?.09:id==='miniature'?.12:.15)*(1+.12*Math.cos(i*.8+row)),direction=V(Math.sin(a)*.12,.16,1).normalize()
    const width=id==='miniature'?.076:id==='natural'?.023:.030,depth=id==='miniature'?.022:.014
    const centers=[root.clone().addScaledVector(direction,-.044),root.clone().addScaledVector(direction,-.012),root.clone().addScaledVector(direction,L*.42),root.clone().addScaledVector(direction,L)]
    const tuft=sweep(quills,'scalp-rooted-backward-lock',centers.map(p=>p.toArray()),[width*.85,width,width*.46,.0007],[depth*.65,depth,depth*.62,.0007],color,{segments:id==='miniature'?5:7,flat:id==='miniature',tipColor})
    tuft.applyMatrix4(headMatrix(c))
  }
  const scalp=cranium(c,id)
  function scalpY(x,z){
    const p=V(x,0,z),top=c.head[1]+c.head[4]+.05,bottom=c.head[1]-.12;let lo=bottom,hi=top
    for(let i=0;i<=60;i++){p.y=top-(top-bottom)*i/60;if(scalp(p)<=0){lo=p.y;hi=p.y+(top-bottom)/60;break}}
    for(let i=0;i<18;i++){p.y=(lo+hi)/2;if(scalp(p)>0)hi=p.y;else lo=p.y}return lo
  }
  // Staggered locks trace the actual scalp, with wide buried roots and thin lifted ends
  const crownRows=id==='card'?3:2,crownCols=id==='miniature'?5:9
  for(let row=0;row<crownRows;row++)for(let i=0;i<crownCols;i++){
    const u=Math.max(0,Math.min(1,(i+.22*Math.sin(row*1.8+i*.7))/(crownCols-1)))
    const h=.20+row/(crownRows-1)*.52+.045*Math.sin(i*1.1+row*.8),y=c.head[1]+c.head[4]*h,q=craniumParameters(c,id,y)
    const section=Math.max(.03,1-h**q.power)**(1/q.power),x=(u-.5)*q.rx*section*1.62,z=foreheadZ(c,id,x,y)+.016
    const L=(id==='natural'?.16:id==='miniature'?.23:.26)*(1+.13*Math.cos(i*.9+row*.6)),endZ=Math.min(z+L,c.head[2]+c.head[5]*.88)
    const centers=[];for(let k=0;k<5;k++){const t=k/4,zz=z+(endZ-z)*t,xx=x+t*(u-.5)*.016
      centers.push([xx,scalpY(xx,zz)+(k===0?-.024:k===1?-.006:k===2?.004:k===3?.012:id==='card'?.041:.025),zz])}
    const width=(id==='miniature'?.079:id==='natural'?.021:.028)*(1+.1*Math.sin(i*.8+row)),depth=id==='miniature'?.020:.012
    const tuft=sweep(quills,'surface-flowing-crown-lock',centers,[width*.95,width,width*.77,width*.35,.0006],[depth*.60,depth,depth*.85,depth*.48,.0006],color,{segments:id==='miniature'?5:7,flat:id==='miniature',tipColor})
    tuft.applyMatrix4(headMatrix(c))
  }
}

function addBerry(parent,c,id){
  const props=group(parent,'left-hand-supporting-berry'),p=c.berry,r=c.berryRadius,positions=[],indices=[],lat=14,lon=22
  for(let j=0;j<=lat;j++)for(let i=0;i<=lon;i++){
    const a=i/lon*Math.PI*2,b=j/lat*Math.PI,bulge=1+.038*Math.sin(a*5)*Math.sin(b)**2
    positions.push(p[0]+Math.sin(b)*Math.cos(a)*r*bulge,p[1]+Math.cos(b)*r*.96,p[2]+Math.sin(b)*Math.sin(a)*r*bulge)
  }
  for(let j=0;j<lat;j++)for(let i=0;i<lon;i++){const a=j*(lon+1)+i,b=a+1,d=a+lon+1;indices.push(a,b,d,b,d+1,d)}
  surface(props,'blue-berry-held-in-palm',geometry(positions,indices),mat('#324d74',{flatShading:id==='miniature'}))
  const top=p[1]+r*.95
  const crown=[];for(let i=0;i<=10;i++){const a=i*Math.PI/5,rad=i%2?.024:.044;crown.push([p[0]+Math.cos(a)*rad,top-.007,p[2]+Math.sin(a)*rad])}
  line(props,'berry-recessed-calyx',crown,.006,'#243952')
  // Three curved fingers rise from the palm and contact the lower berry surface
  for(let i=0;i<3;i++){
    const x=p[0]+(i-1)*.041,z=p[2]-.075-i*.009
    sweep(props,'finger-under-berry',[[x,c.wrists[0][1]-.015,c.wrists[0][2]-.015],[x,p[1]-r*.83,z],[x,p[1]-r*.64,p[2]-.125]],[.023,.020,.013],[.020,.018,.013],c.coat)
  }
  sweep(props,'thumb-against-berry-side',[[p[0]+.066,c.wrists[0][1],p[2]+.015],[p[0]+r*.73,p[1]-r*.64,p[2]-.012],[p[0]+r*.85,p[1]-r*.39,p[2]-.025]],[.030,.026,.014],[.025,.022,.014],c.coat)
}

function addFeather(parent,c,id){
  const prop=group(parent,'right-hand-pinching-quill'),p=c.feather,points=[[p[0]-.045,p[1]-.19,p[2]],[p[0],p[1],p[2]],[p[0]+.085,p[1]+.31,p[2]+.015],[p[0]+.17,p[1]+.66,p[2]+.025]]
  line(prop,'feather-shaft-through-fingers',points,.006,'#d8cdb0')
  const positions=[],indices=[],rows=18
  for(let j=0;j<=rows;j++){
    const t=j/rows,y=p[1]+.10+t*.56,x=p[0]+.028+t*.142,z=p[2]+.007+t*.018
    const width=(id==='miniature'?.072:.060)*Math.sin(t*Math.PI)**.70*(1-.25*t)
    for(const s of [-1,0,1])positions.push(x+s*width,y-s*width*.28,z+(s===0?-.009:.004))
  }
  for(let j=0;j<rows;j++)for(let i=0;i<2;i++){const a=j*3+i,b=a+1,d=a+3;indices.push(a,b,d,b,d+1,d)}
  surface(prop,'continuous-ivory-feather-vane',geometry(positions,indices),mat('#e1d6b9',{side:THREE.DoubleSide,flatShading:id==='miniature'}))
  // Sparse surface barbs share the vane plane, no detached fine wire fringe
  for(let j=2;j<14;j+=2){const t=j/18,y=p[1]+.10+t*.56,x=p[0]+.028+t*.142,z=p[2]-.004+t*.018,w=.054*Math.sin(t*Math.PI)**.7
    for(const s of [-1,1])line(prop,'barb-engraved-on-vane',[[x,y,z],[x+s*w*.85,y+.038-s*w*.28,z+.005]],.0017,'#b9ae94')}
  for(let i=0;i<3;i++){
    const y=p[1]+.028-i*.027
    sweep(prop,'fingers-wrapped-around-shaft',[[p[0]-.035,y,p[2]+.040],[p[0]+.023,y,p[2]-.018],[p[0]+.043,y-.010,p[2]+.014]],[.022,.020,.015],[.018,.017,.013],c.coat)
  }
  sweep(prop,'opposed-feather-thumb',[[p[0]+.057,p[1]-.045,p[2]+.030],[p[0]+.022,p[1]+.015,p[2]-.030],[p[0]-.012,p[1]+.023,p[2]-.020]],[.026,.021,.013],[.022,.018,.012],c.coat)
}

export function createScholarVariant(id='card'){
  if(!configurations[id])throw new Error('Unknown scholar variant: '+id)
  const c={...configurations[id]},root=new THREE.Group();root.name='scholar-'+id
  root.userData.scholarVariant=id;root.userData.front='-Z';root.userData.floor=0
  const anatomy=group(root,'continuous-body-neck-head-and-connected-limbs')
  surface(anatomy,'unified-sculpted-skin',sculptSkin(c,id),mat('#ffffff',{vertexColors:true}))
  for(let side=0;side<2;side++)for(const [name,point]of [['shoulder',c.shoulders[side]],['elbow',c.elbows[side]],['wrist',c.wrists[side]]]){
    const anchor=group(anatomy,(side?'right-':'left-')+name+'-anchor');anchor.position.set(...point)
  }
  addQuills(root,c,id);addFace(root,c,id);addScarf(root,c,id);addBerry(root,c,id);addFeather(root,c,id)
  // Height is comparable between studies, while the natural silhouette stays low and long
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),height=bounds.max.y
  const factor=(id==='natural'?1.64:1.76)/height;root.scale.set(-factor,factor,factor)
  root.userData.blinkEyes=[];root.traverse(obj=>{if(obj.userData.blink)root.userData.blinkEyes.push(obj)})
  root.userData.assumptions={back:'restrained reconstruction',feet:'short grounded hind paws',animation:'eyelids only, all object contacts fixed'}
  return root
}

export function animateScholarVariant(root,time){
  if(!Number.isFinite(time))return
  // Only the eyes blink, so neck, scarf, fingers, glasses and held props stay attached
  const phase=((time%6.7)+6.7)%6.7,close=Math.max(0,1-Math.abs(phase-5.7)/.11)
  for(const eye of root.userData.blinkEyes??[])eye.scale.y=eye.userData.originalScaleY*(1-close*.90)
}
