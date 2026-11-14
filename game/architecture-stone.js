import {T,random,mesh,box,cyl,rod,curve,torus,group,motion,leaf} from './card-style-primitives.js'
import {skin,branch,timber,rock,nail} from './card-style-buildings.js?v=pages25'

// Exact card sources: 17, 22, 24, 28, 30, 34, 36, 38, 44 and 46
// These are wooden woodland structures, including the cards named Castle and Palace
// Keep the unseen backs quiet; source analysis and uncertainty live in stone-inventory.json
const TAU=Math.PI*2
const BARK=['#514936','#63573f','#77634a','#5d533d']
const DARK=['#343a32','#41483b','#505342','#3c4035']
const GREY=['#655f58','#777168','#57564e','#807c6e']
const setName=(o,n)=>(o.name=n,o)
const angleDist=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))

// A genuinely hollow bark shell, with a thick reveal at every cut-out
// Rings are continuous surfaces, with longitudinal flutes rather than added floating rods
function trunk(g,{name='hollow-old-trunk',h=2,r=.4,base=.24,cx=0,cz=0,lean=.04,palette=BARK,seed=1,holes=[],jag=.06,frontPale=false,ns=56,nr=32}={}){
 const p=[],idx=[],colors=[]
 const radius=(y,a)=>{const t=y/h;return(r+base*Math.exp(-t*7))*(1-.12*t)*(1+.065*Math.sin(a*9+t*2+seed)+.025*Math.sin(a*19-t*4))}
 const centre=y=>cx+lean*(y/h)**1.5
 const point=(y,a,inner=false)=>{
  const rr=radius(y,a)-(inner?.055:0),t=y/h,s=Math.abs(Math.sin(a))<1e-12?0:Math.sin(a),c=Math.abs(Math.cos(a))<1e-12?0:Math.cos(a)
  return[centre(y)+s*rr,y+(t>.97?jag*(Math.sin(a*7+seed)+.40*Math.sin(a*17)):0),cz+c*rr*.83]
 }
 // Complete welded rings carry the back and side walls
 // Smooth window contours live in small independent annular patches, never in a
 // whole-cylinder UV triangulation that can bridge the angular seam
 const patches=holes.map(o=>({...o,ac:o.a??Math.PI,x0:(o.a??Math.PI)-o.w*.65-.012,x1:(o.a??Math.PI)+o.w*.65+.012,y0:Math.max(.002,o.y-o.h*.56-.008),y1:Math.min(h-.002,o.y+o.h*.56+.008)}))
 const unique=values=>[...new Map(values.map(v=>[v.toFixed(10),v])).values()].sort((a,b)=>a-b)
 const angles=unique([...Array.from({length:ns+1},(_,i)=>i/ns*TAU),...patches.flatMap(o=>[o.x0,o.x1])])
 const levels=unique([...Array.from({length:nr+1},(_,i)=>i/nr*h),...patches.flatMap(o=>[o.y0,o.y1])])
 const vertexMap=new Map()
 function vertex(a,y,inner=false){
  a=Math.abs(a-TAU)<1e-8?0:a
  const key=(inner?'i':'o')+a.toFixed(10)+':'+y.toFixed(10)
  if(vertexMap.has(key))return vertexMap.get(key)
  const index=p.length/3;vertexMap.set(key,index);p.push(...point(y,a,inner))
  const t=a/TAU*palette.length,k=Math.floor(t),c=inner?new T.Color('#34392c'):new T.Color(palette[k%palette.length]).lerp(new T.Color(palette[(k+1)%palette.length]),t-k)
  if(frontPale&&!inner&&Math.abs(angleDist(a,Math.PI))<.88&&y>.25&&y<h*.93)c.set('#a89a74')
  c.multiplyScalar(.98+.02*Math.sin(a*7+y*1.4));colors.push(c.r,c.g,c.b)
  return index
 }
 const face=(a,b,c)=>{idx.push(vertex(...a),vertex(...b),vertex(...c),vertex(...a,true),vertex(...c,true),vertex(...b,true))}
 const extrasH=new Map(),extrasV=new Map(),register=(map,key,value)=>{const id=key.toFixed(10),list=map.get(id)??[];list.push(value);map.set(id,list)}
 for(const o of patches){
  const boundary=[]
  const add=(a,y)=>boundary.push([a,y])
  // Every existing grid intersection remains a vertex of the patch boundary
  for(const a of angles)if(a>=o.x0-1e-9&&a<=o.x1+1e-9){add(a,o.y0);add(a,o.y1)}
  for(const y of levels)if(y>=o.y0-1e-9&&y<=o.y1+1e-9){add(o.x0,y);add(o.x1,y)}
  for(let i=0;i<32;i++){
   const t=i/32*TAU,dx=Math.sin(t)*o.w*.5,dy=Math.cos(t)*o.h*.5
   const sx=dx>1e-10?(o.x1-o.ac)/dx:dx< -1e-10?(o.x0-o.ac)/dx:Infinity
   const sy=dy>1e-10?(o.y1-o.y)/dy:dy< -1e-10?(o.y0-o.y)/dy:Infinity
   const s=Math.min(sx,sy);add(o.ac+dx*s,o.y+dy*s)
  }
  const ring=[...new Map(boundary.map(v=>[v.map(n=>n.toFixed(10)).join(':'),v])).values()].sort((a,b)=>Math.atan2((a[0]-o.ac)/(o.w*.5),(a[1]-o.y)/(o.h*.5))-Math.atan2((b[0]-o.ac)/(o.w*.5),(b[1]-o.y)/(o.h*.5)))
  const inner=ring.map(([a,y])=>{
   const t=Math.atan2((a-o.ac)/(o.w*.5),(y-o.y)/(o.h*.5)),taper=o.shape==='teardrop'?(.45+.55*(1-Math.cos(t))*.5):1
   return[o.ac+Math.sin(t)*o.w*.5*taper,Math.max(.004,o.y+Math.cos(t)*o.h*.5)]
  })
  ring.forEach(([a,y])=>{
   if(Math.abs(y-o.y0)<1e-8||Math.abs(y-o.y1)<1e-8)register(extrasH,y,a)
   if(Math.abs(a-o.x0)<1e-8||Math.abs(a-o.x1)<1e-8)register(extrasV,a,y)
  })
  for(let i=0;i<ring.length;i++){
   const j=(i+1)%ring.length;face(ring[i],inner[i],inner[j]);face(ring[i],inner[j],ring[j])
   // The cavity-facing reveal connects the same inner and outer contour vertices
   const a=vertex(...inner[i]),b=vertex(...inner[j]),ai=vertex(...inner[i],true),bi=vertex(...inner[j],true);idx.push(a,ai,b,b,ai,bi)
  }
 }
 const between=(map,key,lo,hi)=>unique((map.get(key.toFixed(10))??[]).filter(v=>v>lo+1e-9&&v<hi-1e-9))
 for(let j=0;j<levels.length-1;j++)for(let i=0;i<angles.length-1;i++){
  const a=angles[i],b=angles[i+1],y=levels[j],z=levels[j+1]
  if(patches.some(o=>(a+b)*.5>o.x0&&(a+b)*.5<o.x1&&(y+z)*.5>o.y0&&(y+z)*.5<o.y1))continue
  const poly=[[a,y],...between(extrasH,y,a,b).map(v=>[v,y]),[b,y],...between(extrasV,b,y,z).map(v=>[b,v]),[b,z],...between(extrasH,z,a,b).reverse().map(v=>[v,z]),[a,z],...between(extrasV,a,y,z).reverse().map(v=>[a,v])]
  if(poly.length===4){face(poly[0],poly[1],poly[2]);face(poly[0],poly[2],poly[3])}
  else{const c=[(a+b)*.5,(y+z)*.5];for(let k=0;k<poly.length;k++)face(c,poly[k],poly[(k+1)%poly.length])}
 }
 // Only top and bottom annular rims remain open to the hollow interior
 for(let i=0;i<angles.length-1;i++)for(const y of [0,h]){
  const a=vertex(angles[i],y),b=vertex(angles[i+1],y),ai=vertex(angles[i],y,true),bi=vertex(angles[i+1],y,true)
  idx.push(...(y===0?[a,ai,b,b,ai,bi]:[a,b,ai,b,bi,ai]))
 }
 const o=skin(g,name,p,idx,'#ffffff','bark',colors)
 return{object:o,radius,point,centre,h,r,cz,cx}
}

function roots(g,{r=.4,extent=.9,h=.8,cx=0,cz=0,count=7,palette=BARK,seed=1,thick=.105,clearFront=0}={}){
 for(let i=0;i<count;i++){
  const a=i/count*TAU+.13,rx=Math.sin(a),rz=Math.cos(a)*.86
  if(clearFront&&Math.abs(angleDist(a,Math.PI))<clearFront)continue
  branch(g,'continuous-buttress-root',[[cx+rx*r*.70,h,cz+rz*r*.70],[cx+rx*(r+.08),h*.40,cz+rz*(r+.08)],[cx+rx*extent*.75,.11,cz+rz*extent*.75],[cx+rx*extent,.035,cz+rz*extent]],[thick*.68,thick,thick*.70,.018],palette[i%palette.length],seed+i,22,10)
 }
}

function fissures(g,shell,count=15,seed=1,palette=['#3f3a2d','#97825c']){
 for(let i=0;i<count;i++){
  const a=i/count*TAU+.07,pts=[]
  for(let j=0;j<=10;j++){const y=.15+j/10*(shell.h-.22),aa=a+.015*Math.sin(j*.8+i);const v=shell.point(y,aa);v[0]+=.003*Math.sin(a);v[2]+=.003*Math.cos(a);pts.push(v)}
  // Keep fissures away from the cut-outs to avoid drawing across an opening
  if(Math.abs(angleDist(a,Math.PI))>.63)curve(g,pts,.0045,palette[i%palette.length],'bark')
 }
}

function moss(g,x,y,z,s=.13,seed=1){
 const rng=random(seed)
 for(let i=0;i<4;i++)rock(g,x+(rng()-.5)*s,y+rng()*.014,z+(rng()-.5)*s,s*(.35+rng()*.25),.012,s*(.25+rng()*.25),i%2?'#6c7948':'#536744',seed+i)
}

function pointedDoor(g,x,y,z,w,h,color='#5d465a'){
 const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.70);s.lineTo(0,h);s.lineTo(-w/2,h*.70);s.closePath()
 const d=mesh(g,new T.ExtrudeGeometry(s,{depth:.028,bevelEnabled:false}),color,x,y,z,'bark');d.name='recessed-pointed-plank-door'
 for(let i=-1;i<=1;i++)timber(g,'door-vertical-joint',[x+i*w*.25,y+.025,z-.005],[x+i*w*.25,y+h*(i? .77:.95),z-.005],.009,.009,'#352e2b',i+3)
 const pts=[[-w*.56,0],[-w*.56,h*.73],[0,h*1.05],[w*.56,h*.73],[w*.56,0]].map(([a,b])=>[x+a,y+b,z-.035])
 curve(g,pts,.025,'#ac9263','bark');nail(g,x+w*.27,y+h*.37,z-.035,.012)
 return d
}

function bell(root,parent,x,y,z,s=.12,animate=true){
 const pivot=group(parent,'bell-hanging-pivot',x,y,z)
 rod(pivot,[0,0,0],[0,-s*.28,0],s*.045,'#6e5730')
 const profile=[[.03,0],[.15,-.10],[.23,-.44],[.28,-.66],[.44,-.82],[.45,-.91],[.36,-.93],[.24,-.71],[.17,-.42],[.10,-.15],[.03,-.11]].map(([r,h])=>new T.Vector2(r*s*2,h*s*2))
 const b=mesh(pivot,new T.LatheGeometry(profile.reverse(),16),'#b39148',0,-s*.25,0,'paint',{metalness:.36,roughness:.58});b.name='hollow-cast-bronze-bell'
 rod(pivot,[0,-s*.8,0],[0,-s*2.0,0],s*.055,'#665337')
 const clapper=cyl(pivot,0,-s*2,0,s*.11,s*.17,'#86713f',s*.11,8);clapper.name='bell-clapper'
 if(animate)motion(root,pivot,'sway',{axis:'z',amplitude:.025,speed:.9,phase:x*3+z})
 return pivot
}

function lantern(root,parent,x,y,z,s=.13){
 const g=group(parent,'hanging-caged-lantern',x,y,z)
 rod(g,[0,0,0],[0,-s*.52,0],.007,'#9d8650')
 const glow=mesh(g,new T.SphereGeometry(1,12,8),'#e4c87e',0,-s*1.28,0,'paint',{emissive:'#c29034',emissiveIntensity:.35});glow.scale.set(s*.36,s*.60,s*.36);glow.name='lantern-warm-glass'
 for(const yy of [-.73,-1.84])cyl(g,0,s*yy,0,s*.61,s*.10,'#77613c',s*.61,12)
 for(let i=0;i<4;i++){const a=i/4*TAU;rod(g,[Math.sin(a)*s*.35,-s*.76,Math.cos(a)*s*.35],[Math.sin(a)*s*.46,-s*1.78,Math.cos(a)*s*.46],s*.045,'#826c3d')}
 const cap=mesh(g,new T.ConeGeometry(s*.63,s*.60,6),'#6d5a3d',0,-s*.43,0,'bark');cap.name='lantern-pitched-cap'
 motion(root,g,'sway',{axis:'z',amplitude:.018,speed:.8,phase:x*2})
 return g
}

function flag(root,parent,x,y,z,w=.17,h=.31,color='#776080'){
 timber(parent,'banner-mast',[x,y-h-.10,z],[x,y+.08,z],.025,.026,'#70593f',3)
 const p=group(parent,'attached-banner',x,y,z)
 const pos=[0,0,0,w,0,.018,w*.98,-h*.68,.025,w*.46,-h,0,0,-h*.76,0]
 skin(p,'weathered-cloth-pennant',pos,[0,1,2,0,2,3,0,3,4],color,'cloth')
 // Cloth has a backed face, because the free camera can see it from behind
 skin(p,'pennant-back',pos,[0,2,1,0,3,2,0,4,3],color,'cloth')
 motion(root,p,'sway',{axis:'x',amplitude:.028,speed:1.1,phase:x*4})
 return p
}

function slab(g,name,x,y,z,rx,rz,h,seed=1,color='#514c42'){
 const rng=random(seed),n=15,p=[],idx=[],radii=Array.from({length:n},()=>.90+rng()*.15)
 // The same perimeter at every height avoids folded side quads; flat inset caps and
 // a small bevel keep stacked strata readable under grazing light
 for(const [yy,s]of [[-h/2,.94],[-h*.29,1],[h*.29,1],[h/2,.94]])for(let i=0;i<n;i++){const a=i/n*TAU;p.push(Math.sin(a)*rx*radii[i]*s,yy,Math.cos(a)*rz*radii[i]*s)}
 for(let row=0;row<3;row++)for(let i=0;i<n;i++){const j=(i+1)%n,a=row*n+i,b=row*n+j;idx.push(a,b,a+n,b,b+n,a+n)}
 for(let i=1;i<n-1;i++)idx.push(0,i+1,i,3*n,3*n+i,3*n+i+1)
 const o=skin(g,name,p,idx,color,'stone'),hard=o.geometry.toNonIndexed();o.geometry.dispose();hard.computeVertexNormals();o.geometry=hard;o.position.set(x,y,z);return o
}

function evertree(root){
 root.userData.silhouette='ancient-branching-tree-with-hanging-lanterns-and-high-platforms'
 const g=group(root,'lantern-bearing-living-tree')
 const shell=trunk(g,{h:2.40,r:.30,base:.20,lean:-.20,seed:17,palette:['#5b523a','#706044','#81704a','#655e3e'],jag:.015})
 roots(g,{r:.34,extent:.88,h:.88,palette:BARK,seed:17,count:7})
 // Forks emerge continuously from the main trunk and form the visible Y silhouette
 branch(g,'major-right-fork',[[.04,.65,.10],[.35,1.17,.10],[.58,1.78,.14],[.75,2.30,.12]],[.23,.20,.14,.075],'#65583e',17,35,12)
 branch(g,'left-upward-bough',[[-.12,1.28,.05],[-.50,1.57,.06],[-.78,2.02,.09],[-.87,2.39,.10]],[.18,.14,.09,.045],'#65583e',18,32,12)
 branch(g,'right-lantern-arm',[[.40,1.52,.1],[.71,1.76,-.01],[.98,1.84,-.03]],[.105,.07,.032],'#695a3d',19,25,10)
 branch(g,'left-platform-arm',[[-.07,1.1,0],[-.45,1.14,-.15],[-.74,1.21,-.18]],[.15,.085,.045],'#716144',20,25,10)
 branch(g,'upper-cropped-bough',[[-.15,1.95,.05],[.15,2.19,.02],[.37,2.43,-.02]],[.15,.09,.05],'#5a5139',21,25,10)
 fissures(g,shell,18,17)
 for(const [x,y,z,w]of [[-.63,1.24,-.18,.35],[.60,1.78,.12,.36],[-.18,.54,-.28,.30]]){
  for(let i=0;i<6;i++)timber(g,'branch-supported-small-deck',[x-w/2+i*w/5,y,z-.14],[x-w/2+i*w/5,y,z+.13],w/5*.90,.035,i%2?'#9c8556':'#7d6b46',i+17)
  branch(g,'deck-under-brace',[[x*.75,y-.32,z+.06],[x,y-.04,z]],[.045,.035],'#584d33',22,15,8)
 }
 // Short rope bridge physically terminates on the two high forks
 for(let i=0;i<8;i++){const t=i/7,x=-.40+t*.90,y=1.93-.13*Math.sin(t*Math.PI);timber(g,'high-rope-bridge-plank',[x,y,.10],[x,y,.28],.058,.022,'#8e784e',i+30)}
 for(const z of [.075,.30])curve(g,[[-.47,2.03,z],[-.20,1.90,z],[.17,1.89,z],[.54,2.01,z]],.010,'#af9663')
 lantern(root,g,.92,1.84,-.04,.14);lantern(root,g,-.68,1.20,-.17,.11);lantern(root,g,.57,1.72,-.25,.09)
 for(const [x,y,z]of [[-.27,.38,-.30],[.26,.20,-.31],[-.57,.10,.12]])moss(g,x,y,z,.19,Math.round(y*100))
}

function courthouse(root){
 root.userData.silhouette='fallen-log-courthouse-with-four-ancient-wood-columns-and-pediment'
 const g=group(root,'hollow-log-court-house')
 // Large lateral fallen tree is the enclosure, not an unrelated classical stone temple
 branch(g,'massive-fallen-log',[[-1.03,.70,.29],[-.57,.70,.30],[.14,.75,.32],[1.03,.81,.32]],[.37,.38,.38,.32],'#66563b',22,36,16)
 // Bark grain is carried by the log material; detached approximate fibre tubes are omitted
 // The dark chamber is behind the portico; doorway jambs have visible side depth
 box(g,0,.75,-.055,.76,1.23,.31,'#302f23','bark').name='deep-unoccupied-court-entrance'
 for(const x of [-.43,.43])timber(g,'entrance-heavy-jamb',[x,.15,-.24],[x,1.44,-.24],.115,.19,'#665a3e',x<0?2:3)
 timber(g,'inner-door-lintel',[-.46,1.44,-.25],[.46,1.44,-.25],.12,.18,'#837047',4)
 const warm=box(g,0,.80,.098,.54,1.12,.01,'#b39c55');warm.name='warm-interior-back-wall'
 for(const x of [-.70,-.30,.30,.70]){
  branch(g,'weathered-portico-column',[[x,.10,-.51],[x+.015,.56,-.50],[x-.015,1.12,-.48],[x,1.67,-.46]],[.085,.074,.068,.081],x<0?'#7c7958':'#8b825b',Math.round((x+1)*50),30,12)
  for(let i=0;i<3;i++){const xx=x+(i-1)*.024;curve(g,[[xx,.19,-.588],[xx+.012,.85,-.575],[xx,1.58,-.553]],.0045,i%2?'#a39b6b':'#56543c','bark')}
  cyl(g,x,.105,-.51,.115,.09,'#777653',.11,10,'bark');box(g,x,1.64,-.46,.21,.085,.22,'#7d7751','bark')
 }
 // Timber pediment is a real triangular enclosure with a recessed inner tympanum
 const triangle=(w,h,depth,color,name)=>{
  const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(0,h);s.closePath()
  return setName(mesh(g,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false}),color,0,1.71,-.51,'bark'),name)
 }
 triangle(1.79,.44,.34,'#796f4e','thick-wooden-pediment');const inlay=triangle(1.40,.31,.022,'#514c36','recessed-triangular-pediment-field');inlay.position.set(0,1.77,-.535)
 timber(g,'pediment-lower-moulding',[-.93,1.72,-.56],[.93,1.72,-.56],.105,.12,'#9b8c61',7)
 for(const side of [-1,1])timber(g,'sloping-pediment-moulding',[side*.94,1.73,-.56],[0,2.19,-.56],.083,.115,'#9a8b61',side+12)
 for(let i=0;i<10;i++)timber(g,'court-threshold-plank',[-.78+i*.17,.12,-.74],[-.78+i*.17,.12,-.12],.15,.06,'#716044',i+4)
 for(const y of [.05,.09])timber(g,'front-step',[-.82,y,-.82-y],[.82,y,-.82-y],.08,.11,'#7b7353',30)
 for(const x of [-.86,.85]){moss(g,x,.15,-.42,.27,x<0?22:23);rock(g,x,.04,-.68,.22,.05,.12,'#68764a',40)}
 // The little blue flowers flanking the portico are present on the card
 for(const x of [-.91,.91]){
  const flower=group(g,'small-blue-woodland-flower',x,.10,-.31)
  rod(flower,[0,0,0],[.012,.12,0],.005,'#5f7547')
  for(let i=0;i<5;i++){const a=i/5*TAU;const petal=mesh(flower,new T.SphereGeometry(1,8,6),'#5b8590',.012+Math.sin(a)*.025,.12,Math.cos(a)*.025);petal.scale.set(.018,.006,.027);petal.rotation.y=-a}
  motion(root,flower,'sway',{axis:'z',amplitude:.025,speed:.9,phase:x})
 }
}

function castle(root){
 root.userData.silhouette='rooted-hollow-stump-fortress-with-palisade-and-purple-pennants'
 const g=group(root,'wooden-stump-castle')
 const shell=trunk(g,{h:2.08,r:.40,base:.27,seed:24,jag:.11,palette:['#9b794b','#89683e','#b18a56','#80613d'],holes:[{a:Math.PI,y:.47,h:.78,w:.56},{a:Math.PI,y:1.32,h:.21,w:.14},{a:Math.PI+.36,y:1.49,h:.23,w:.12}]})
 roots(g,{r:.44,extent:1.05,h:1.22,count:8,seed:24,palette:['#987b4d','#80643f','#ad8953'],thick:.12,clearFront:.72})
 fissures(g,shell,17,24,['#644c31','#c09b62'])
 pointedDoor(g,.02,.08,-.346,.21,.69,'#6e536e')
 // Split staves extend beyond the core, creating an irregular crown
 for(let i=0;i<16;i++){const a=i/16*TAU,x=Math.sin(a)*.35,z=Math.cos(a)*.30;branch(g,'broken-crown-stave',[[x,1.82,z],[x*1.05,2.06+(i%4)*.046,z*1.05],[x*1.10,2.13+(i%4)*.043,z*1.08]],[.045,.035,.006],i%2?'#987443':'#b18c56',i+24,12,7)}
 for(const side of [-1,1]){
  for(let i=0;i<10;i++){const x=side*(.55+i*.070),z=.22+.12*Math.sin(i*.18),h=1.12+(i%3)*.055;branch(g,'palisade-sharpened-timber',[[x,.03,z],[x,h-.10,z],[x+.012,h,z]],[.047,.039,.004],'#7c7250',i+46,12,7)}
  for(const y of [.36,.84])timber(g,'palisade-horizontal-rail',[side*.51,y,.27],[side*1.21,y,.37],.055,.057,'#665c40',32)
  flag(root,g,side*.56,1.02,-.52,.15,.27)
 }
 // High heraldic banner hangs against the stump, source fleur is simplified to three leaves
 const banner=flag(root,g,-.14,2.02,-.346,.27,.42,'#796381')
 for(const x of [.075,.135,.195]){const f=leaf(banner,x,-.20,-.012,.040,x<.13?-.45:.45,'#c1ae75');f.rotation.x=Math.PI/2}
 flag(root,g,.19,2.35,.03,.25,.09,'#a46f61')
 for(let i=0;i<4;i++)rock(g,-.34+i*.22,.04,-.78,.16,.045,.10,'#858c80',i+28)
}

function monastery(root){
 root.userData.silhouette='carved-living-trunk-sanctuary-with-golden-bells-on-red-cords'
 const g=group(root,'bell-hung-trunk-monastery')
 const shell=trunk(g,{h:2.30,r:.51,base:.13,lean:.06,seed:28,jag:.035,frontPale:true,holes:[{y:.68,h:.64,w:.65},{y:1.38,h:.30,w:.26},{a:Math.PI-.57,y:1.33,h:.26,w:.20},{a:Math.PI+.57,y:1.33,h:.26,w:.20},{a:Math.PI-.35,y:1.72,h:.12,w:.11},{a:Math.PI+.35,y:1.72,h:.12,w:.11}]})
 roots(g,{r:.48,extent:.86,h:.67,count:6,seed:28,thick:.09,clearFront:.65})
 fissures(g,shell,20,28)
 // Carved fissures bound the pale sanctuary face; no conventional separate stone monastery
 for(const side of [-1,1])curve(g,[[side*.18,.23,-.46],[side*.36,.46,-.40],[side*.40,1.05,-.35],[side*.37,1.49,-.33],[side*.24,1.89,-.36]],.009,'#675b3f','bark')
 curve(g,[[-.25,1.88,-.36],[0,1.95,-.43],[.28,1.89,-.36]],.012,'#706344','bark')
 // A thin canopy follows the oval entrance bottom and stays attached to the trunk
 for(let i=0;i<16;i++){const a=-1.2+i/15*2.4,x=Math.sin(a)*.41,z=-.38-Math.cos(a)*.18;timber(g,'radial-entrance-thatch',[x*.82,.31,z+.10],[x,.24,z],.035,.026,'#6d6745',i+28)}
 // Each red line terminates at a trunk peg, the bells hang from real cord points
 const cords=[[[-.46,2.23,-.20],[-.17,2.08,-.47],[.20,2.20,-.40]],[[.15,2.20,-.40],[.45,1.99,-.23],[.56,2.12,.04]],[[-.47,1.99,-.21],[-.14,1.91,-.49],[.24,1.84,-.41],[.54,1.93,-.15]]]
 for(const pts of cords){curve(g,pts,.010,'#a85b38','cloth');for(const [x,y,z]of [pts[0],pts.at(-1)])rod(g,[x,y,z+.06],[x,y,z-.035],.017,'#6b5639')}
 for(const [x,y,z,s]of [[-.43,2.19,-.25,.075],[-.19,2.08,-.47,.09],[.17,2.17,-.41,.08],[.44,1.99,-.24,.075],[-.35,1.94,-.33,.075],[.03,1.86,-.49,.12],[.30,1.86,-.35,.075],[.53,1.92,-.16,.10]])bell(root,g,x,y,z,s,Math.abs(x)>.30)
 box(g,0,.61,-.12,.24,.42,.04,'#3c412b','bark').name='dark-monastic-interior'
 moss(g,-.47,.16,-.38,.20,28)
}

function ruins(root){
 root.userData.silhouette='weathered-broken-stump-with-empty-gothic-openings-and-jagged-spikes'
 const g=group(root,'abandoned-stump-ruins')
 const shell=trunk(g,{h:1.93,r:.39,base:.25,lean:.15,seed:30,jag:.20,palette:GREY,holes:[{y:.31,h:.46,w:.62},{y:1.31,h:.40,w:.21},{a:Math.PI+.48,y:1.35,h:.28,w:.18},{a:Math.PI-.45,y:1.26,h:.24,w:.16},{y:.89,h:.28,w:.18},{a:1.8,y:1.49,h:.32,w:.18}]})
 roots(g,{r:.42,extent:1.02,h:.98,count:7,seed:30,palette:GREY,thick:.10})
 fissures(g,shell,19,30,['#3e403b','#999387'])
 // A torn half-trunk beside the main shell remains grounded and physically attached
 for(let i=0;i<7;i++){const a=.10+i*.26,x=.46+Math.sin(a)*.27,z=.19+Math.cos(a)*.22,h=.86+(i%3)*.16;branch(g,'splintered-lower-side-wall',[[x,.03,z],[x-.13,h*.57,z-.06],[x-.18,h,z-.10]],[.10,.074,.005],GREY[i%4],i+30,16,8)}
 for(let i=0;i<13;i++){const a=i/13*TAU,x=.13+Math.sin(a)*.35,z=Math.cos(a)*.30,h=1.90+(i%4)*.095;branch(g,'ragged-upper-splinter',[[x,1.63,z],[x+.02,h-.08,z],[x+.025,h,z-.015]],[.045,.024,.002],GREY[i%4],i+45,12,7)}
 const twig=group(g,'flexible-attached-ruin-twig',.58,.80,.16)
 branch(twig,'fine-broken-twig-tip',[[0,0,0],[.10,.28,.01],[.14,.47,.015]],[.025,.014,.002],'#646052',30,16,7)
 motion(root,twig,'sway',{axis:'z',amplitude:.009,speed:.8,phase:.3})
 // Broken lintel fragment and chips belong to the stump; distant snowy landscape is omitted
 for(let i=0;i<5;i++){const x=-.65+i*.27,z=-.64+(i%2)*.10;slab(g,'fallen-wooden-ruin-fragment',x,.05,z,.13,.07,.07,i+30,GREY[i%4])}
}

function palace(root){
 root.userData.silhouette='tall-living-trunk-palace-with-luminous-teardrop-openings-and-curling-boughs'
 const g=group(root,'enchanted-living-palace')
 const holes=[{y:.25,h:.47,w:.55},{y:.84,h:.26,w:.18},{a:Math.PI+.36,y:.95,h:.23,w:.18},{a:Math.PI-.36,y:.95,h:.23,w:.18},{y:1.34,h:.23,w:.18},{a:Math.PI+.28,y:1.62,h:.19,w:.17},{a:Math.PI-.28,y:1.62,h:.19,w:.17},{a:Math.PI+.17,y:1.96,h:.20,w:.15},{a:Math.PI-.17,y:1.96,h:.20,w:.15}].map(o=>({...o,shape:'teardrop'}))
 const shell=trunk(g,{h:2.44,r:.34,base:.25,seed:34,jag:.035,palette:['#354f47','#41614e','#3c5949','#4c624c'],holes})
 roots(g,{r:.38,extent:1.12,h:.91,count:8,seed:34,palette:['#355544','#49684a','#304a3e'],thick:.11,clearFront:.72})
 fissures(g,shell,17,34,['#293e36','#6b8056'])
 // Luminous interiors sit recessed behind shell apertures, never on the bark surface
 for(const [i,o]of holes.entries()){
  const a=o.a??Math.PI,y=o.y,rad=shell.radius(y,a)-.10,x=shell.centre(y)+Math.sin(a)*rad,z=Math.cos(a)*rad*.83
  const glow=mesh(g,new T.SphereGeometry(1,12,10),'#d5fff4',x,y,z,'paint',{emissive:'#9ef1e4',emissiveIntensity:.72});glow.name='recessed-pale-cyan-palace-window';glow.scale.set(i===0?.115:.037,o.h*.44,.027);glow.rotation.y=-angleDist(a,Math.PI)
  if(i===0)motion(root,glow,'glow',{amplitude:.012,speed:1.3,phase:0})
 }
 // Helical heavy boughs wrap the tree and taper into visible upward curling tips
 for(let level=0;level<3;level++){
  const y=.43+level*.58,pts=[]
  for(let j=0;j<=28;j++){const a=-Math.PI*.9+j/28*Math.PI*2.05,r=.40+.34*Math.sin(j/28*Math.PI);pts.push([Math.sin(a)*r,y+(j/28-.5)*.34,Math.cos(a)*r*.76])}
  branch(g,'sweeping-spiral-palace-bough',pts,[.08,.10,.075,.045,.018],level%2?'#486a4c':'#385c49',level+34,48,10)
 }
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const y=.78+i*.63
  branch(g,'upturned-curling-bough',[[side*.29,y,.08],[side*.70,y+.18,.09],[side*.87,y+.40,.03],[side*.74,y+.52,-.03],[side*.65,y+.43,-.03]],[.10,.074,.046,.025,.009],i%2?'#375b48':'#45644b',i+50,28,10)
 }
 // Pointed grown doorway surround echoes the source's bright central arch
 curve(g,[[-.15,.03,-.40],[-.18,.24,-.39],[0,.58,-.35],[.18,.24,-.39],[.15,.03,-.40]],.025,'#658467','bark')
 for(const [x,y,z]of [[-.42,.52,-.24],[.52,.84,.1],[-.45,1.34,.10],[.28,1.92,.08]])moss(g,x,y,z,.14,Math.round(y*100))
}

function dungeon(root){
 root.userData.silhouette='dark-root-bound-broken-stump-with-warm-barred-oval-entrance'
 const g=group(root,'root-cellar-dungeon')
 const shell=trunk(g,{h:1.72,r:.47,base:.35,lean:.03,seed:36,jag:.14,palette:DARK,holes:[{y:.59,h:.62,w:.69},{a:Math.PI-.62,y:1.30,h:.26,w:.14},{a:Math.PI+.83,y:1.26,h:.31,w:.17},{a:Math.PI+.38,y:1.54,h:.18,w:.13}]})
 roots(g,{r:.50,extent:1.17,h:1.19,count:9,palette:DARK,seed:36,thick:.14,clearFront:.72})
 fissures(g,shell,24,36,['#252d26','#666e4c'])
 // Deep orange recess and forked dark bars, the signature warm source detail
 const warm=mesh(g,new T.SphereGeometry(1,16,12),'#ce914a',0,.59,-.32,'paint',{emissive:'#af682e',emissiveIntensity:.24});warm.scale.set(.18,.27,.035);warm.name='warm-recess-behind-cell-bars'
 for(const x of [-.12,0,.12]){
  branch(g,'root-iron-door-bar',[[x,.32,-.465],[x*.97,.61,-.459],[x*.77,.80,-.429]],[.014,.014,.011],'#423c2c',Math.round(x*100+70),14,7)
  if(x)branch(g,'forked-cell-bar',[[x,.60,-.46],[x*.40,.72,-.45],[0,.84,-.42]],[.010,.009,.007],'#423c2c',72,12,6)
 }
 curve(g,[[-.19,.34,-.47],[-.22,.61,-.44],[-.13,.83,-.41],[0,.90,-.40],[.17,.81,-.41],[.22,.55,-.44],[.17,.33,-.47]],.034,'#725d3c','bark')
 for(let i=0;i<12;i++){const a=i/12*TAU,x=Math.sin(a)*.41,z=Math.cos(a)*.35;branch(g,'rotten-crown-spike',[[x,1.46,z],[x+.02,1.74+(i%3)*.065,z],[x+.012,1.84+(i%3)*.065,z-.02]],[.05,.026,.003],DARK[i%4],i+36,12,7)}
 for(const [x,z]of [[-.64,-.32],[.66,-.19],[.32,.60],[-.24,.56]])moss(g,x,.13,z,.26,Math.round(x*100+90))
 const fern=group(g,'root-attached-dungeon-fern',.66,.08,-.52)
 rod(fern,[0,0,0],[.25,.16,.02],.009,'#506844')
 for(let i=0;i<5;i++)leaf(fern,i*.065,.02+i*.035,(i%2)*.04,.14,.55+i*.5,'#446b43')
 motion(root,fern,'sway',{axis:'z',amplitude:.025,speed:.8,phase:.7})
}

function gableRoof(g,{x=0,y=1,z=0,w=1,d=.9,rise=.43,seed=1}={}){
 const rng=random(seed)
 for(const side of [-1,1])for(let i=0;i<13;i++){
  const zz=z-d/2+i*d/12,endX=x+side*w/2,endY=y+(rng()-.5)*.025,half=d/24*.98
  const p=[];for(const down of [0,.028])p.push(x,y+rise-down,zz-half,endX,endY-down,zz-half,endX,endY-down,zz+half,x,y+rise-down,zz+half)
  const indices=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]
  if(side===1)for(let n=0;n<indices.length;n+=3)[indices[n+1],indices[n+2]]=[indices[n+2],indices[n+1]]
  skin(g,'individual-mossy-roof-plank',p,indices,['#6c6c46','#8b8655','#777a4c','#a09460'][i%4],'bark')
 }
 timber(g,'long-roof-ridge',[x,y+rise+.018,z-d/2-.035],[x,y+rise+.018,z+d/2+.035],.068,.065,'#6c6545',seed)
 for(const zz of [z-d/2,z+d/2])for(const side of [-1,1])timber(g,'gable-barge-board',[x,y+rise,zz],[x+side*w/2,y,zz],.072,.068,'#6a6542',seed+4)
}

function chapel(root){
 root.userData.silhouette='slender-timber-chapel-with-mossy-plank-roof-and-open-bell-spire'
 const g=group(root,'riverside-wooden-chapel')
 // The building stands on its timber sill; river and waterfall stay out of the miniature
 for(const x of [-.43,.43])timber(g,'continuous-foundation-sill',[x,.13,-.51],[x,.13,.62],.12,.13,'#5d5b3e',x<0?4:5)
 box(g,0,.185,.12,.86,.055,1.10,'#77704f','bark').name='closed-chapel-timber-floor'
 box(g,0,.63,-.41,.83,.96,.075,'#b5ac80','bark').name='pale-front-gable-wall'
 box(g,0,.63,.62,.83,.96,.075,'#b5ac80','bark').name='pale-rear-gable-wall'
 box(g,0,.64,.12,.66,.88,.92,'#454936','bark').name='dark-chapel-interior'
 for(const x of [-.43,.43])for(const z of [-.43,.65])timber(g,'structural-corner-post',[x,.17,z],[x,1.13,z],.07,.07,'#696448',Math.round((x+1)*30))
 // Front is the narrow gable end, side wall is long with small deeply framed windows
 pointedDoor(g,0,.16,-.431,.25,.66,'#795b3b')
 for(const side of [-1,1]){
  const x=side*.39
  box(g,x,.40,.12,.075,.50,1.04,'#b5ac80','bark').name='solid-wall-below-window-line'
  box(g,x,.99,.12,.075,.28,1.04,'#b5ac80','bark').name='solid-wall-above-window-line'
  const gaps=[[-.40,-.194],[-.106,.106],[.194,.406],[.494,.64]]
  for(const [a,b]of gaps)box(g,x,.75,(a+b)/2,.075,.20,b-a,'#b5ac80','bark').name='wall-panel-between-real-window-apertures'
  for(let i=0;i<3;i++){
   const z=-.15+i*.30
   box(g,side*.352,.75,z,.012,.19,.087,'#303f32').name='dark-interior-behind-side-window'
   for(const zz of [z-.045,z+.045])timber(g,'window-depth-jamb',[side*.425,.64,zz],[side*.425,.85,zz],.023,.038,'#77744d',i+4)
   for(const yy of [.65,.85])timber(g,'window-lintel-and-sill',[side*.425,yy,z-.045],[side*.425,yy,z+.045],.025,.038,'#77744d',i+4)
  }
 }
 for(const side of [-1,1]){timber(g,'side-timber-sill',[side*.45,.30,-.46],[side*.45,.30,.68],.065,.065,'#71674a',4);timber(g,'long-wall-rail',[side*.44,.98,-.44],[side*.44,.98,.67],.04,.04,'#7a7450',5)}
 // Filled gables keep the roof attached to the frame
 for(const z of [-.435,.65]){
  const shape=new T.Shape();shape.moveTo(-.415,1.1);shape.lineTo(.415,1.1);shape.lineTo(0,1.58);shape.closePath()
  const gable=mesh(g,new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false}),'#b5ac80',0,0,z-.0275,'bark');gable.name='closed-plastered-gable'
 }
 gableRoof(g,{y:1.10,z:.11,w:1.02,d:1.27,rise:.49,seed:38})
 // The source tower rises through the front roof slope and has an open timber upper stage
 const tower=group(g,'square-open-bell-tower',0,0,-.27)
 for(const x of [-.16,.16])for(const z of [-.16,.16])timber(tower,'bell-tower-upright',[x,1.28,z],[x,2.08,z],.045,.045,'#686648',Math.round(x*100+z*30+50))
 for(const yy of [1.45,1.72,2.07])for(const z of [-.17,.17])timber(tower,'tower-horizontal-tie',[-.18,yy,z],[.18,yy,z],.04,.045,'#6a6748',12)
 for(const x of [-.17,.17])for(const yy of [1.45,1.72,2.07])timber(tower,'tower-side-tie',[x,yy,-.17],[x,yy,.17],.04,.045,'#6a6748',12)
 for(const z of [-.17,.17])timber(tower,'tower-diagonal-brace',[-.15,1.46,z],[.15,1.72,z],.023,.03,'#77704c',9)
 const spire=mesh(tower,new T.ConeGeometry(.30,.47,4),'#656b44',0,2.29,0,'bark');spire.rotation.y=Math.PI/4;spire.name='four-sided-mossy-timber-spire'
 // External crooked bell arm and its knee brace meet the tower frame
 timber(tower,'external-bell-arm',[-.16,2.02,0],[-.60,2.08,0],.045,.045,'#696542',12)
 timber(tower,'bell-arm-knee-brace',[-.17,1.82,0],[-.46,2.06,0],.033,.033,'#79764c',13)
 bell(root,tower,-.56,2.065,0,.12,true)
 for(let i=0;i<7;i++)rock(g,-.33+i*.11,.055,-.51,.10,.045,.09,'#707c5d',i+38)
 moss(g,.43,.20,.53,.26,38)
}

function cemetery(root){
 root.userData.silhouette='tree-framed-engraved-funerary-slab-with-small-front-gravestones'
 const g=group(root,'tree-held-cemetery-sanctuary')
 // Tall weathered memorial is held inside a living root arch, not a generic church
 const s=new T.Shape();s.moveTo(-.45,0);s.lineTo(.45,0);s.lineTo(.44,1.38);s.quadraticCurveTo(.35,1.76,0,1.88);s.quadraticCurveTo(-.35,1.76,-.44,1.38);s.closePath()
 const memorial=mesh(g,new T.ExtrudeGeometry(s,{depth:.16,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1}),'#8f9b88',0,.18,.15,'stone');memorial.name='weathered-carved-stone-memorial'
 // Repeated pointed relief bands have real narrow depth and a dark central doorway
 pointedDoor(g,0,.24,.103,.17,.59,'#343d35')
 for(const [w,h,z]of [[.63,1.00,.097],[.47,.86,.081]])curve(g,[[-w/2,.20,z],[-w/2,.20+h*.72,z],[0,.20+h,z],[w/2,.20+h*.72,z],[w/2,.20,z]],.014,'#626f60','stone')
 curve(g,[[-.11,1.39,.096],[-.11,1.64,.096],[0,1.75,.096],[.11,1.64,.096],[.11,1.39,.096]],.012,'#687567','stone')
 for(const side of [-1,1])for(let i=0;i<3;i++)timber(g,'memorial-carved-short-ray',[side*.15,1.43+i*.09,.09],[side*(.30-i*.035),1.41+i*.14,.09],.011,.009,'#73806d',i+4)
 // Main roots clasp the stone along its actual edges; crown frames the top
 for(const side of [-1,1]){
  branch(g,'thick-enclosing-memorial-root',[[side*.86,.03,.28],[side*.57,.29,.29],[side*.51,.99,.31],[side*.42,1.76,.30],[side*.23,2.09,.27],[side*.03,2.17,.24]],[.14,.17,.14,.13,.11,.065],'#745640',side<0?44:45,38,12)
  branch(g,'splayed-foreground-root',[[side*.53,.55,.21],[side*.67,.16,-.11],[side*.96,.035,-.38]],[.12,.085,.018],'#795b43',47,24,10)
  branch(g,'bell-bearing-twig',[[side*.47,1.72,.29],[side*.70,1.81,.13],[side*.84,1.79,-.01]],[.060,.030,.012],'#6c503b',48,20,8)
  bell(root,g,side*.78,1.79,.01,.060,true)
 }
 for(let i=0;i<3;i++)slab(g,'memorial-front-step',0,.055+i*.04,-.055-i*.08,.25-i*.015,.10,.06,44+i,'#939b89')
 // Graves, not characters, form the low foreground; restrained earthen plot only
 const graves=[[-.52,-.64,.24],[-.18,-.75,.22],[.30,-.66,.29],[.66,-.48,.25],[-.67,-.27,.19],[.10,-.33,.21]]
 for(const [i,[x,z,h]]of graves.entries()){
  const q=new T.Shape();q.moveTo(-.105,0);q.lineTo(.105,0);q.lineTo(.105,h*.70);q.quadraticCurveTo(.10,h,-0,h);q.quadraticCurveTo(-.10,h,-.105,h*.70);q.closePath()
  const tomb=mesh(g,new T.ExtrudeGeometry(q,{depth:.055,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1}),'#9ba595',x,.025,z,'stone');tomb.name='individual-rounded-gravestone';tomb.rotation.z=(i%3-1)*.07
  for(let j=0;j<2;j++)box(tomb,0,h*.47+j*.045,-.011,.071,.009,.006,'#68766c','stone').name='gravestone-worn-engraving'
  slab(g,'grave-earth-mound',x,.015,z-.14,.14,.20,.025,i+44,'#765d43')
 }
 for(const [x,z]of [[-.77,-.59],[.53,-.79],[.70,-.12]])moss(g,x,.04,z,.13,44)
}

function lookout(root){
 root.userData.silhouette='narrow-stacked-dark-slate-bark-lookout-with-open-timber-rail'
 const g=group(root,'layered-woodland-lookout')
 // Source material is ambiguous between dark layered bark and stone: retain both strata and muted grain
 for(let i=0;i<19;i++){
  const t=i/18,rx=.40-.09*t+.025*Math.sin(i*1.8),rz=.35-.06*t,y=.075+i*.099
  const o=slab(g,'irregular-overlapping-dark-stratum',Math.sin(i*.7)*.018,y,Math.cos(i*.8)*.012,rx,rz,.085,i+46,['#686659','#747161','#55574b','#7e7b69'][i%4]);o.rotation.y=i*.47
  // Each shelf touches the next; the central core fills the interstices
 }
 cyl(g,0,.92,0,.26,1.80,'#363b31',.25,14,'bark').name='continuous-lookout-core'
 slab(g,'upper-flat-observation-platform',0,1.96,0,.40,.34,.095,68,'#787563')
 for(const [x,z]of [[-.30,-.20],[.30,-.20],[-.30,.20],[.30,.20]]){
  branch(g,'rough-timber-railing-upright',[[x,1.98,z],[x*.98,2.22,z]],[.023,.019],'#716746',46,12,7)
 }
 // Front is deliberately open at the centre, as in the illustration's spare parapet
 for(const z of [-.20,.20])branch(g,'observation-platform-long-rail',[[-.37,2.19,z],[0,2.23,z+.018],[.37,2.20,z]],[.023,.026,.016],'#766e4d',48,16,8)
 for(const x of [-.30,.30])branch(g,'observation-platform-side-rail',[[x,2.20,-.24],[x,2.22,.02],[x,2.20,.24]],[.019,.022,.014],'#766e4d',49,16,8)
 for(let i=0;i<9;i++){const x=-.25+(i%2)*.015,z=.13-i*.004,y=.18+i*.145;rock(g,x,y,z,.14,.026,.075,'#78725b',i+46)}
 for(const [i,[x,y,z]]of [[-.37,.31,.09],[-.31,.62,.10],[-.30,.88,.12]].entries()){
  moss(g,x,y,z,.12,i+46)
  const ivy=group(g,'rooted-small-ivy-leaf',x,y,z);rod(ivy,[0,0,0],[-.035,.025,0],.005,'#617046');leaf(ivy,-.055,.025,0,.11,-.7,'#63784c')
  if(i===1)motion(root,ivy,'sway',{axis:'x',amplitude:.025,speed:1,phase:.6})
 }
}

export const STONE_BUILDERS={Evertree:evertree,Courthouse:courthouse,Castle:castle,Monastery:monastery,Ruins:ruins,Palace:palace,Dungeon:dungeon,Chapel:chapel,Cemetary:cemetery,Lookout:lookout}
