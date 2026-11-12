import {T,P,random,material,mesh,ell,box,cyl,rod,curve,torus,group,motion,leaf} from './card-style-primitives.js'

// Source-backed architecture: the silhouettes are built from connected load-bearing parts
// The small backs and hidden joints are restrained reconstructions of the card artwork
const TAU=Math.PI*2
function skin(parent,name,positions,indices,color,kind='bark',colors){
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices)
 const uv=[];for(let i=0;i<positions.length;i+=3)uv.push(positions[i]*1.6,positions[i+1]*1.6+positions[i+2]*.3)
 geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals()
 const obj=mesh(parent,geo,color,0,0,0,kind,colors?{vertexColors:true}:{});obj.name=name;return obj
}
function branch(parent,name,points,radii,color='#625039',seed=1,segments=44,sides=12){
 const spline=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=spline.computeFrenetFrames(segments,false),pos=[],idx=[],rng=random(seed)
 const ridges=Array.from({length:sides},()=>.90+rng()*.20)
 for(let j=0;j<=segments;j++){
  const t=j/segments,k=t*(radii.length-1),a=Math.min(radii.length-2,Math.floor(k)),r=T.MathUtils.lerp(radii[a],radii[a+1],k-a),p=spline.getPoint(t)
  for(let i=0;i<sides;i++){const ang=i/sides*TAU,rr=r*ridges[i]*(1+.027*Math.sin(j*.9+i*2));const v=p.clone().addScaledVector(frames.normals[j],Math.cos(ang)*rr).addScaledVector(frames.binormals[j],Math.sin(ang)*rr*.88);pos.push(v.x,v.y,v.z);if(j<segments){const q=j*sides+i,n=j*sides+(i+1)%sides;idx.push(q,n,q+sides,n,n+sides,q+sides)}}
 }
 for(const [j,rev]of [[0,true],[segments,false]]){const p=spline.getPoint(j/segments),c=pos.length/3;pos.push(p.x,p.y,p.z);for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides;idx.push(c,...(rev?[b,a]:[a,b]))}}
 return skin(parent,name,pos,idx,color)
}
function timber(parent,name,a,b,w,d,color='#74573c',seed=1){
 const len=new T.Vector3(...a).distanceTo(new T.Vector3(...b)),rng=random(seed),v=[],idx=[]
 for(const y of [-len/2,len/2])for(const [x,z]of [[-1,-1],[1,-1],[1,1],[-1,1]])v.push(x*w*(.46+rng()*.08),y+(rng()-.5)*.015,z*d*(.46+rng()*.08))
 idx.push(0,1,2,0,2,3,4,6,5,4,7,6,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4)
 const obj=skin(parent,name,v,idx,color);const hard=obj.geometry.toNonIndexed();obj.geometry.dispose();hard.computeVertexNormals();obj.geometry=hard;obj.position.fromArray(a).add(new T.Vector3(...b)).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...b).sub(new T.Vector3(...a)).normalize());return obj
}
function rock(parent,x,y,z,sx,sy,sz,color,seed=1){
 const geo=new T.IcosahedronGeometry(1,1),rng=random(seed),p=geo.attributes.position
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.10*Math.sin(x*11+y*7+z*9+seed);p.setXYZ(i,x*r,y*r,z*r)}geo.computeVertexNormals()
 const obj=mesh(parent,geo,color,x,y,z,'stone');obj.scale.set(sx,sy,sz);obj.rotation.set(rng()*.6,rng()*TAU,rng()*.4);return obj
}
function nail(parent,x,y,z,r=.009){const n=cyl(parent,x,y,z,r,.008,'#413d31',r,7);n.rotation.x=Math.PI/2;return n}
function grain(parent,a,b,seed=1,count=3){
 const rng=random(seed)
 for(let j=0;j<count;j++){const off=(j-(count-1)/2)*.017;curve(parent,[[a[0]+off,a[1],a[2]],[T.MathUtils.lerp(a[0],b[0],.45)+off+(rng()-.5)*.01,T.MathUtils.lerp(a[1],b[1],.45),T.MathUtils.lerp(a[2],b[2],.45)],[b[0]+off,b[1],b[2]]],.0027,j%2?'#aa8a61':'#463e2c','bark')}
}
function plankedRoof(parent,cx,y,cz,rx,rz,rise,seed=1){
 const rng=random(seed)
 // A shallow, patched hip roof, with rough ends rather than a cone or cottage gable
 for(let side=0;side<4;side++)for(let i=0;i<7;i++){
  const along=(i-3)/3.4,edge=side%2?rz:rx,width=(side%2?rx:rz)/3.15
  const ridge=side===0?[cx-rx*.14,y+rise,cz+along*rz*.25]:side===1?[cx+along*rx*.25,y+rise,cz-rz*.14]:side===2?[cx+rx*.14,y+rise,cz+along*rz*.25]:[cx+along*rx*.25,y+rise,cz+rz*.14]
  const end=side===0?[cx-rx*(.94+rng()*.1),y,cz+along*rz]:side===1?[cx+along*rx,y,cz-rz*(.94+rng()*.1)]:side===2?[cx+rx*(.94+rng()*.1),y,cz+along*rz]:[cx+along*rx,y,cz+rz*(.94+rng()*.1)]
  const direction=new T.Vector3(...end).sub(new T.Vector3(...ridge)),across=new T.Vector3(direction.z,0,-direction.x).normalize().multiplyScalar(width*.55),v=[]
  const top=[new T.Vector3(...ridge).add(across),new T.Vector3(...ridge).sub(across),new T.Vector3(...end).sub(across),new T.Vector3(...end).add(across)]
  for(const down of [0,.025])for(const p of top)v.push(p.x,p.y-down,p.z)
  const roof=skin(parent,'split-roof-board',v,[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0],['#62523d','#7a6446','#8e7652','#675b45'][i%4]);const hard=roof.geometry.toNonIndexed();roof.geometry.dispose();hard.computeVertexNormals();roof.geometry=hard
 }
}
export function crane(root){
 root.userData.silhouette='weathered-plank-cabin-trussed-timber-crane'
 const cabin=group(root,'timber-crane-house'),rng=random(202)
 // Cabin frame, deck joists and four substantial legs all meet one another
 for(const x of [.02,.54])for(const z of [-.20,.30]){
  timber(cabin,'foundation-stilt',[x,.015,z],[x,.72,z],.105,.105,'#5b432f',x*100+z*30+50)
  rock(cabin,x,.04,z,.14,.07,.13,'#7d7b68',Math.round(x*100+z*50))
 }
 for(const z of [-.28,.33])timber(cabin,'deck-long-joist',[-.15,.59,z],[.80,.59,z],.12,.11,'#503d2c',23)
 for(let i=0;i<9;i++)timber(cabin,'weathered-deck',[-.14+i*.106,.67,-.36],[-.14+i*.106,.67,.43],.09,.06,i%2?'#8a6b46':'#715437',i+5)
 timber(cabin,'stilt-brace',[.03,.15,-.22],[.54,.59,-.22],.06,.07,'#705337',12)
 timber(cabin,'stilt-brace',[.54,.16,.30],[.03,.59,.30],.06,.07,'#705337',13)
 const cx=.36,cz=.08,rx=.34,rz=.29
 // Individually bowed, edge-split vertical planks form the original narrow barrel-like cabin
 for(let i=0;i<23;i++){
  const a=i/23*TAU,front=Math.cos(a)<-.70,x=cx+Math.sin(a)*rx,z=cz+Math.cos(a)*rz
  const low=.73+rng()*.05,high=1.84+(rng()-.5)*.055
  if(front&&x>.15&&x<.57){
   timber(cabin,'window-lower-plank',[x,low,z],[x,1.43,z],.090,.042,['#684b32','#81613d','#775638'][i%3],i)
   timber(cabin,'window-header-plank',[x,1.75,z],[x,high,z],.09,.042,'#705337',i)
  }else timber(cabin,'split-cabin-plank',[x,low,z],[x+.012*Math.sin(a),high,z],.090,.044,['#705338','#95724c','#7d5a3b','#634934'][i%4],i)
  const post=cabin.children.at(-1);post.rotation.y=a
  if(!front||x<.15||x>.57)grain(cabin,[x,low+.06,z-.022],[x+.009,high-.06,z-.022],i,2)
 }
 // The source's blue glazed slit sits behind structural mullions, never pasted on a cottage wall
 box(cabin,.36,1.60,-.214,.40,.28,.016,'#456167')
 for(const x of [.16,.27,.43,.57])timber(cabin,'window-mullion',[x,1.43,-.236],[x,1.77,-.236],.027,.035,'#9b7a4e',Math.round(x*100))
 timber(cabin,'window-sill',[.11,1.42,-.238],[.60,1.42,-.238],.046,.06,'#4b3a29',3)
 for(const y of [.81,1.43,1.78]){
  const pts=[];for(let i=0;i<=30;i++){const a=i/30*TAU;pts.push([cx+Math.sin(a)*.359,y+Math.sin(a*3)*.009,cz+Math.cos(a)*.31])}curve(cabin,pts,.014,'#423b2a','bark')
 }
 plankedRoof(cabin,.36,1.84,.08,.45,.39,.10,21)
 branch(cabin,'bent-smoke-flue',[[.57,1.78,.20],[.74,1.81,.20],[.78,1.96,.20],[.76,2.08,.20]],[.050,.049,.043,.043],'#756c4d',4,25)
 const flue=cyl(cabin,.76,2.09,.20,.034,.012,'#252b23',.034,10);flue.rotation.z=.1
 // Open lattice mast: two long timbers, regular cross-members and alternating diagonal braces
 const boom=group(root,'braced-inclined-boom')
 for(const z of [-.12,.12]){
  timber(boom,'mast-main',[-.19,.47,z],[-.61,2.37,z],.075,.075,'#665035',30)
  timber(boom,'mast-main',[-.44,.47,z],[-.85,2.37,z],.073,.075,'#78603c',31)
  for(let i=0;i<7;i++){
   const y=.57+i*.26,x=-.19-(y-.47)*.22
   timber(boom,'lattice-rung',[x,y,z],[x-.25,y,z],.044,.05,'#9b7a49',i+7)
   if(i<6)timber(boom,'diagonal-brace',i%2?[x-.25,y,z]:[x,y,z],i%2?[x-.057,y+.26,z]:[x-.307,y+.26,z],.031,.039,'#635039',i+9)
  }
 }
 for(const y of [.50,1.30,2.31]){const x=-.19-(y-.47)*.22;timber(boom,'mast-depth-tie',[x-.12,y,-.15],[x-.12,y,.15],.05,.05,'#4c3b29',8)}
 timber(boom,'pivot-axle',[-.45,.51,-.22],[-.16,.51,-.22],.11,.10,'#453a29',20)
 // Cable is limited to the crane where the reference contains a real suspended load
 const pulley=group(root,'head-pulley',-.81,2.32,-.18)
 for(const z of [-.025,.025]){const disk=cyl(pulley,0,0,z,.085,.020,'#574936',.085,20);disk.rotation.x=Math.PI/2}torus(pulley,0,0,-.005,.065,.010,'#b19761')
 curve(root,[[-.27,.67,.01],[-.66,2.33,-.16],[-.81,2.39,-.19]],.007,'#c5ad76')
 const cargo=group(root,'stone-and-rope-sling',-.81,2.31,-.19);motion(root,cargo,'cargo')
 rod(cargo,[0,-.02,0],[0,-.96,0],.0085,'#a88f5c');curve(cargo,[[0,-.95,0],[.015,-1.02,0],[-.04,-1.08,0],[-.085,-1.04,0]],.015,'#4e4533')
 const stone=rock(cargo,0,-1.30,0,.19,.145,.15,'#797c70',20);stone.rotation.y=.35
 for(const s of [-1,1])curve(cargo,[[0,-1.06,0],[s*.15,-1.26,-.085],[s*.10,-1.43,-.02],[0,-1.45,.04]],.010,'#c0a374')
 for(let i=0;i<3;i++)timber(root,'stored-planks',[.28+i*.13,.13,-.45],[.22+i*.13,.13,-.76],.11,.06,'#89704a',i+33)
 for(const x of [.02,.54])for(const y of [.83,1.38])nail(cabin,x,y,-.252)
}

function bracket(parent,x,y,z,rx,depth,seed=1,amber=true){
 const rng=random(seed),pos=[],idx=[],colors=[],sides=42,bands=8
 // Fan shape grows from its narrow attachment at the trunk, with a scalloped thick lip
 for(let ring=0;ring<=bands;ring++)for(let i=0;i<=sides;i++){
  const a=-Math.PI/2+i/sides*Math.PI,r=ring/bands,wobble=1+.027*Math.sin(a*17+seed)+.015*Math.sin(a*31)
  pos.push(x+Math.sin(a)*rx*r*wobble,y+.035*Math.sin(r*Math.PI)-.022*r*r,z-Math.cos(a)*depth*r*wobble)
  const c=new T.Color(['#9d762e','#b89139','#cdac56','#927c43','#bc9442','#d1b16a','#97844a','#d2b877','#a28947'][ring]);c.multiplyScalar(.95+rng()*.10);colors.push(c.r,c.g,c.b)
  if(ring<bands&&i<sides){const p=ring*(sides+1)+i;idx.push(p,p+1,p+sides+1,p+1,p+sides+2,p+sides+1)}
 }
 const shelf=skin(parent,'growth-ring-bracket-fungus',pos,idx,'#ffffff','bark',colors)
 const under=[],ui=[];for(let i=0;i<=sides;i++){const a=-Math.PI/2+i/sides*Math.PI;for(const r of [0,1])under.push(x+Math.sin(a)*rx*r,y-.025-r*.025,z-Math.cos(a)*depth*r)}for(let i=0;i<sides;i++){const n=i*2;ui.push(n,n+2,n+1,n+1,n+2,n+3)}skin(parent,'pale-bracket-underside',under,ui,'#b5a66d')
 const rim=[];for(let i=0;i<=sides;i++){const a=-Math.PI/2+i/sides*Math.PI;rim.push([x+Math.sin(a)*rx,y-.024,z-Math.cos(a)*depth])}curve(parent,rim,.012,'#c3a75a')
 if(amber){
  const basin=ell(parent,x,y+.024,z-depth*.55,rx*.37,.012,depth*.24,'#775521');basin.name='resin-hollow'
  const resin=mesh(parent,new T.CircleGeometry(1,32),'#c89024',x,y+.031,z-depth*.55,'paint',{roughness:.24,metalness:.07});resin.rotation.x=-Math.PI/2;resin.scale.set(rx*.30,depth*.19,1);resin.name='amber-in-shelf-basin'
  const glint=ell(parent,x-rx*.08,y+.035,z-depth*.57,rx*.08,.004,depth*.035,'#dfbf64');glint.name='amber-surface-glint'
 }
 return shelf
}
export function refinery(root){
 root.userData.silhouette='ancient-living-tree-and-amber-bracket-shelves'
 const tree=group(root,'living-resin-tree'),rng=random(808),pos=[],idx=[],colors=[],nr=32,ns=64
 const trunkProfile=y=>{const t=y/2.35,taper=1-.20*T.MathUtils.smoothstep(y,.6,2.35);return {r:(.365+.205*Math.exp(-y*4)+.035*t*t)*taper,cx:.17+.038*Math.sin(t*5)+.08*t*t,cz:.18+.036*t}}
 // A continuous fluted trunk: bark ridges belong to the surface, not floating tubes
 for(let j=0;j<=nr;j++){
  const t=j/nr,y=t*2.35,{r,cx,cz}=trunkProfile(y)
  for(let i=0;i<=ns;i++){
   const a=i/ns*TAU,flute=1+.056*Math.sin(a*9+t*2)+.025*Math.sin(a*19-t*4),rr=r*flute
   pos.push(cx+Math.sin(a)*rr,y+(j===nr?.045*Math.sin(a*3)+.027*Math.sin(a*11):0),cz+Math.cos(a)*rr*.88)
   const c=new T.Color(Math.sin(a*9+t*2)>.15?'#706346':'#514a32');c.lerp(new T.Color('#667242'),Math.max(0,Math.sin(a*4+t*6))*.24);c.multiplyScalar(.94+rng()*.13);colors.push(c.r,c.g,c.b)
   if(j<nr&&i<ns){const q=j*(ns+1)+i;idx.push(q,q+1,q+ns+1,q+1,q+ns+2,q+ns+1)}
  }
 }
 skin(tree,'fluted-old-living-trunk',pos,idx,'#ffffff','bark',colors)
 // Broad buttresses physically flow into the lower trunk; all roots end on the ground
 for(let i=0;i<9;i++){
  const a=i/9*TAU,x=.17+Math.sin(a)*.81,z=.18+Math.cos(a)*.74
  branch(tree,'spreading-buttress-root',[[.17+Math.sin(a)*.25,.90+(i%3)*.11,.18+Math.cos(a)*.25],[.17+Math.sin(a)*.42,.32,.18+Math.cos(a)*.38],[x*.89,.075,z*.91],[x,.03,z]],[.115,.14,.080,.018],i%2?'#656044':'#554c34',i+80,35,14)
 }
 // Front hollows are bounded by the buttresses and the mushroom roof
 const hollow=ell(tree,-.14,.25,-.33,.14,.20,.035,'#242d22');hollow.name='dark-recess-between-roots'
 branch(tree,'hollow-left-jamb',[[-.27,.06,-.36],[-.30,.25,-.34],[-.22,.43,-.28]],[.055,.047,.038],'#777047',11)
 branch(tree,'hollow-right-jamb',[[.01,.06,-.36],[.04,.28,-.34],[-.07,.46,-.25]],[.070,.055,.037],'#777047',13)
 bracket(root,-.10,.48,-.10,.58,.57,8,true)
 bracket(root,-.04,.66,-.13,.49,.47,11,true)
 bracket(root,.34,.27,-.28,.31,.33,16,true)
 bracket(root,-.43,.12,-.28,.26,.24,19,true)
 bracket(root,-.09,.10,-.57,.23,.23,22,true)
 bracket(root,.46,.88,.0,.22,.25,27,false)
 bracket(root,.49,1.02,.04,.16,.20,28,false)
 // The source's antler-like growths are tapered, rooted wooden structures with short open tips
 branch(root,'left-upturned-growth',[[-.28,.50,-.19],[-.51,.66,-.15],[-.58,.99,-.10],[-.63,1.22,-.07]],[.092,.060,.033,.017],'#5c543b',29)
 branch(root,'left-growth-fork',[[-.54,.77,-.13],[-.68,.86,-.11],[-.70,1.02,-.12]],[.036,.025,.012],'#5c543b',30,25)
 branch(root,'right-curling-root',[[.41,.29,-.11],[.58,.58,-.14],[.53,.88,-.08],[.43,1.12,-.10],[.46,1.31,-.04]],[.15,.11,.071,.049,.026],'#5e563d',31)
 // Only short sap mouths connect tree and basin; there are no ground-to-air threads or falling long strings
 branch(root,'short-sap-spout',[[.03,.93,-.19],[-.005,.85,-.28],[-.10,.80,-.34]],[.042,.032,.022],'#776b44',35,22)
 const drop=ell(root,-.10,.755,-.34,.020,.027,.019,'#d6a035');motion(root,drop,'drop',{phase:.31})
 // Close-set bark fissures climb with the trunk and never extend beyond it
 for(let i=0;i<14;i++){
  const a=i/14*TAU,pts=[]
  for(let j=0;j<=18;j++){const t=j/18,y=.54+t*1.76,{r,cx,cz}=trunkProfile(y),aa=a+.018*Math.sin(t*8+i);pts.push([cx+Math.sin(aa)*r*1.013,y,cz+Math.cos(aa)*r*.894])}
  curve(tree,pts,.007,i%3?'#443e2c':'#8d8054','bark')
 }
 // Weathered upper wood stays thick and structural; unseen crown is cropped in the source
 const top=trunkProfile(2.35);ell(tree,top.cx,2.315,top.cz,top.r*.91,.025,top.r*.77,'#3e3d2a','bark')
 branch(tree,'upper-lateral-branch',[[.30,1.92,.20],[.50,2.12,.22],[.67,2.30,.21],[.78,2.42,.18]],[.12,.09,.06,.035],'#5b523a',61,32,14)
 branch(tree,'rear-lateral-branch',[[.12,2.0,.30],[-.12,2.17,.41],[-.28,2.30,.43]],[.11,.075,.04],'#625b3f',62,30,14)
 for(let i=0;i<14;i++){const a=i*2.4,r=.54+rng()*.22;leaf(root,Math.sin(a)*r,.04,Math.cos(a)*r,.08+rng()*.05,a,'#637543')}
}

export function clockTower(root){
 root.userData.silhouette='slender-masonry-clock-and-river-waterwheel'
 const tower=group(root,'old-river-clock'),rng=random(141),cx=-.25,cz=.08
 // Battered octagonal masonry core, squared by its broad plastered front
 const profile=[[-.24,-.23],[.24,-.23],[.28,-.17],[.28,.17],[.22,.24],[-.22,.24],[-.28,.17],[-.28,-.17]],pos=[],idx=[],colors=[]
 for(let j=0;j<=20;j++)for(let i=0;i<8;i++){
  const t=j/20,[x,z]=profile[i],s=1-.13*t+.016*Math.sin(j*1.7+i)
  pos.push(cx+x*s,j*.104+.12,cz+z*s)
  const c=new T.Color(['#868d7a','#929984','#7d8776','#848b76'][i%4]);c.multiplyScalar(.96+rng()*.065);colors.push(c.r,c.g,c.b)
  if(j<20){const a=j*8+i,b=j*8+(i+1)%8;idx.push(a,a+8,b,b,a+8,b+8)}
 }
 skin(tower,'tapered-weatherworn-plastered-stone',pos,idx,'#ffffff','stone',colors)
 // Exposed stone foot: varied angular blocks with their lower edges embedded in the river bank
 for(let row=0;row<3;row++)for(let i=0;i<8;i++){
  const a=i/8*TAU+(row%2)*.23,r=.27+(2-row)*.09
  rock(tower,cx+Math.sin(a)*r,.10+row*.14,cz+Math.cos(a)*r,.14+rng()*.035,.10+rng()*.04,.12+rng()*.03,['#66746e','#7a8479','#53675f','#8b9383'][i%4],i+row*20)
 }
 // Sparse chips expose courses; front remains a narrow continuous ancient plaster surface
 for(let i=0;i<20;i++){
  const x=cx+(rng()-.5)*.42,y=.55+rng()*1.5;if(y>1.57&&y<2.0&&Math.abs(x-cx)<.21)continue
  rock(tower,x,y,-.145,.035+rng()*.04,.012+rng()*.014,.009,i%3?'#757e6d':'#a2a28a',i+90)
 }
 // Large subdued stone face, correctly centered high on the slender shaft
 const face=cyl(tower,cx,1.82,-.155,.202,.034,'#c1bd9f',.202,40,'stone');face.rotation.x=Math.PI/2
 torus(tower,cx,1.82,-.178,.203,.011,'#626b5a')
 for(let i=0;i<12;i++){
  const a=i/12*TAU,r1=i%3?.164:.151,r2=.179
  rod(tower,[cx+Math.sin(a)*r1,1.82+Math.cos(a)*r1,-.18],[cx+Math.sin(a)*r2,1.82+Math.cos(a)*r2,-.18],i%3?.0035:.005,'#5c6252')
 }
 const hands=group(tower,'clock-movement',cx,1.82,-.188)
 timber(hands,'short-clock-hand',[0,0,0],[.082,.043,0],.012,.008,'#3e493f',1)
 const minute=group(hands,'minute-hand-pivot');timber(minute,'long-clock-hand',[0,-.015,0],[-.016,.135,0],.009,.008,'#3e493f',2);motion(root,minute,'clock')
 ell(hands,0,0,-.005,.014,.014,.008,'#525b46')
 // The rough low roof follows the card's broad, asymmetric timber cap
 const roofSupport=mesh(tower,new T.ConeGeometry(.36,.135,4),'#554c38',cx,2.25,cz,'bark');roofSupport.rotation.y=Math.PI/4;roofSupport.scale.z=.84
 plankedRoof(tower,cx,2.20,cz,.42,.36,.115,141)
 timber(tower,'crooked-ridge',[cx-.14,2.325,cz],[cx+.15,2.34,cz],.043,.04,'#574b36',50)
 // Wheel plane is YZ, axle X: both axle ends meet a real bearing rather than floating
 const wheel=group(root,'river-waterwheel',.26,.86,.10);wheel.rotation.y=Math.PI/2;motion(root,wheel,'wheel');root.userData.waterwheel=wheel
 for(const z of [-.145,.145]){
  torus(wheel,0,0,z,.776,.033,'#675c43');torus(wheel,0,0,z,.715,.021,'#97866a')
  for(let i=0;i<10;i++){const a=i/10*TAU;timber(wheel,'wheel-spoke',[0,0,z],[Math.sin(a)*.75,Math.cos(a)*.75,z],.038,.045,i%2?'#7a6b4e':'#9b8762',i+33)}
  const hub=cyl(wheel,0,0,z,.11,.075,'#544c38',.11,16);hub.rotation.x=Math.PI/2
 }
 for(let i=0;i<28;i++){
  const a=i/28*TAU,paddle=group(wheel,'water-scoop',Math.sin(a)*.756,Math.cos(a)*.756,0);paddle.rotation.z=-a
  timber(paddle,'paddle-board',[-.090,0,-.19],[.090,0,-.19],.038,.025,'#7c7154',i)
  timber(paddle,'paddle-board',[-.090,0,-.095],[.090,0,-.095],.038,.080,i%2?'#9d8e6d':'#766b50',i+1)
  timber(paddle,'paddle-board',[-.090,0,.018],[.090,0,.018],.038,.080,i%2?'#8e8061':'#73674e',i+2)
  timber(paddle,'paddle-board',[-.090,0,.135],[.090,0,.135],.038,.080,'#8f8060',i+3)
 }
 rod(root,[-.25,.86,.10],[.67,.86,.10],.046,'#5c523d')
 for(const z of [-.08,.27])timber(root,'outer-bearing-leg',[.62,.035,z],[.62,.87,.10],.071,.075,'#5e5943',z>0?10:11)
 const bearing=cyl(root,.62,.86,.10,.083,.14,'#635c45',.083,14);bearing.rotation.z=Math.PI/2
 // Two bank stones seat the outer bearing; restraint leaves the wheel bottom visible
 for(const [x,z]of [[.61,-.09],[.62,.27],[-.7,-.27]])rock(root,x,.07,z,.15,.09,.12,'#64766e',Math.round(x*30+z*40))
}
