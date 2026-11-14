import {T,P,random,material,mesh,ell,box,cyl,rod,curve,torus,group,motion,leaf} from './card-style-primitives.js'
import {skin,branch,timber,rock,nail,grain,plankedRoof,bracket} from './card-style-buildings.js?v=pages25'

// Connected construction derived from the eleven numbered card references
// Front is -Z, all foundations sit on Y=0, hidden backs are restrained reconstructions
const TAU=Math.PI*2, WOOD=['#76563a','#856747','#644b35','#96764e'], CREAM='#d2c5a0'
function beam(g,name,a,b,w=.06,d=w,c=WOOD[0],seed=1){return timber(g,name,a,b,w,d,c,seed)}
function twig(g,name,points,radii,c='#695239',seed=1){return branch(g,name,points,radii,c,seed,20,9)}
function detail(g,name,geo,c,x=0,y=0,z=0,kind='bark'){const m=mesh(g,geo,c,x,y,z,kind);m.name=name;return m}
function slab(g,name,top,c,thick=.025){
 const a=new T.Vector3(...top[0]),normal=new T.Vector3(...top[2]).sub(a).cross(new T.Vector3(...top[1]).sub(a)).normalize()
 const center=new T.Vector3();for(const p of top)center.add(new T.Vector3(...p));center.multiplyScalar(.25)
 if(Math.abs(normal.y)>.40?normal.y<0:normal.x*center.x+normal.z*center.z<0)normal.negate()
 const v=[];for(const offset of [0,-thick])for(const p of top)v.push(p[0]+normal.x*offset,p[1]+normal.y*offset,p[2]+normal.z*offset)
 const ids=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]
 const n=new T.Vector3(...top[2]).sub(a).cross(new T.Vector3(...top[1]).sub(a))
 // Real thickness follows the panel normal, including vertical container staves
 const flip=n.dot(normal)<0
 if(flip)for(let i=0;i<ids.length;i+=3)[ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]]
 return skin(g,name,v,ids,c)
}
function polygonSlab(g,name,top,c,thick=.018){
 const v=[],ids=[],n=top.length;for(const dy of [0,-thick])for(const p of top)v.push(p[0],p[1]+dy,p[2])
 for(let i=1;i<n-1;i++){ids.push(0,i,i+1,n,n+i+1,n+i)}for(let i=0;i<n;i++){const j=(i+1)%n;ids.push(i,n+i,n+j,i,n+j,j)}
 const normal=new T.Vector3(...top[1]).sub(new T.Vector3(...top[0])).cross(new T.Vector3(...top[2]).sub(new T.Vector3(...top[0])))
 if(normal.y<0)for(let i=0;i<ids.length;i+=3)[ids[i+1],ids[i+2]]=[ids[i+2],ids[i+1]]
 return skin(g,name,v,ids,c)
}
function roundedRearRoom(g,name,cx,zFront,halfWidth,depth,floorY,topY,c,kind='bark'){
 const room=group(g,name),n=18,outer=[],inner=[]
 for(let i=0;i<=n;i++){const a=-Math.PI/2+i/n*Math.PI;outer.push([cx+Math.sin(a)*halfWidth,zFront+Math.cos(a)*depth]);inner.push([cx+Math.sin(a)*(halfWidth-.10),zFront+Math.cos(a)*Math.max(.10,depth-.10)])}
 const v=[],ids=[]
 for(let i=0;i<=n;i++)for(const [p,y]of [[outer[i],floorY],[inner[i],floorY],[outer[i],topY],[inner[i],topY]])v.push(p[0],y,p[1])
 for(let i=0;i<n;i++){const k=i*4;ids.push(k,k+4,k+6,k,k+6,k+2,k+1,k+3,k+7,k+1,k+7,k+5,k+2,k+6,k+7,k+2,k+7,k+3,k,k+1,k+5,k,k+5,k+4)}
 ids.push(0,2,3,0,3,1,n*4,n*4+1,n*4+3,n*4,n*4+3,n*4+2)
 // The inward face is real geometry and receives light from the entrance
 skin(room,name+'-curved-exterior-and-interior-wall',v,ids,c,kind)
 polygonSlab(room,name+'-solid-crown',outer.map(p=>[p[0],topY,p[1]]),c,.07)
 polygonSlab(room,name+'-closed-floor',outer.map(p=>[p[0],floorY+.035,p[1]]),'#67583e',.04)
 return room
}
function archPath(cx,y,w,h){
 const p=new T.Path(),r=w/2,cy=y+h-r
 p.moveTo(cx-r,y);p.lineTo(cx+r,y);p.lineTo(cx+r,cy);p.absarc(cx,cy,r,0,Math.PI,false);p.lineTo(cx-r,y);return p
}
function panel(g,name,outline,depth,c,x=0,y=0,z=0,holes=[],kind='bark'){
 const s=new T.Shape();s.moveTo(...outline[0]);for(const p of outline.slice(1))s.lineTo(...p);s.closePath();s.holes.push(...holes)
 return detail(g,name,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:16}),c,x,y,z,kind)
}
function frameArch(g,cx,y,z,w,h,c='#907549',thick=.035){
 const r=w/2,cy=y+h-r
 beam(g,'arched-door-left-jamb',[cx-r,y,z],[cx-r,cy,z],thick,thick,c)
 beam(g,'arched-door-right-jamb',[cx+r,y,z],[cx+r,cy,z],thick,thick,c)
 const pts=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r,z])}curve(g,pts,thick*.58,c,'bark')
}
function roundWindow(g,x,y,z,r=.13,c='#c8ae5b'){
 const disc=cyl(g,x,y,z,r,.026,c,r,24);disc.rotation.x=Math.PI/2;disc.name='recessed-round-glazing'
 torus(g,x,y,z-.019,r,.019,'#79603e');beam(g,'window-crossbar',[x-r*.80,y,z-.025],[x+r*.80,y,z-.025],.017,.024,'#725e3e');beam(g,'window-mullion',[x,y-r*.80,z-.025],[x,y+r*.80,z-.025],.017,.024,'#725e3e')
}
function plankDoor(g,x,y,z,w,h,c='#844532'){
 const door=group(g,'recessed-plank-door',x,y,z),shape=archPath(0,0,w,h),s=new T.Shape(shape.getPoints(32));detail(door,'arched-door-leaf',new T.ExtrudeGeometry(s,{depth:.038,bevelEnabled:false,curveSegments:12}),c)
 for(let i=1;i<5;i++){const xx=-w/2+i*w/5,top=h-w/2+Math.sqrt(Math.max(0,w*w/4-xx*xx));beam(door,'door-plank-joint',[xx,.02,-.005],[xx,top-.016,-.005],.006,.006,'#60442f',i)}
 for(const yy of [.18,h*.60])beam(door,'iron-door-strap',[-w*.43,yy,-.026],[-w*.12,yy,-.026],.016,.016,'#514833')
 const handle=torus(door,w*.28,h*.40,-.048,.022,.006,'#b19452');handle.name='door-ring-handle';return door
}
function deck(g,cx,y,cz,w,d,name='individual-deck-board'){
 const n=Math.ceil(w/.13);for(let i=0;i<n;i++){const x=cx-w/2+(i+.5)*w/n;beam(g,name,[x,y,cz-d/2],[x,y,cz+d/2],w/n*.95,.045,WOOD[i%4],i+50)}
 for(const z of [cz-d*.36,cz+d*.36])beam(g,'under-deck-joist',[cx-w/2,y-.055,z],[cx+w/2,y-.055,z],.07,.10,'#51402f')
}
function gableRoof(g,cx,y,cz,w,d,rise,{tiles=false,moss=false,seed=1}={}){
 const rng=random(seed),ridge=(z)=>y+rise+.025*Math.sin((z-cz)*3),roof=group(g,tiles?'overlapping-scalloped-tile-roof':'split-board-gabled-roof')
 for(const s of [-1,1]){
  if(tiles){
   slab(roof,'dark-tile-underlay',[[cx,ridge(cz-d/2),cz-d/2],[cx,ridge(cz+d/2),cz+d/2],[cx+s*w/2,y,cz+d/2],[cx+s*w/2,y,cz-d/2]],'#594c35',.035)
   const rows=5,cols=8,step=w*.5/rows,dd=d/cols
   for(let r=0;r<rows;r++)for(let i=0;i<cols;i++){
    const t0=r/rows,t1=Math.min(1,(r+1.42)/rows),x0=cx+s*w*.5*t0,x1=cx+s*w*.5*t1,z0=cz-d/2+(i+.08)*dd-(r%2)*dd*.30,z1=z0+dd*.97
    const zmid=(z0+z1)/2,yy0=ridge(zmid)-rise*t0+.018,yy1=ridge(zmid)-rise*t1+.018
    const tile=polygonSlab(roof,'rounded-overlapping-terracotta-tile',[[x0,yy0,z0],[x0,yy0,z1],[x1-s*.035,yy1+.02,z1],[x1,yy1,zmid+.025],[x1,yy1,zmid-.025],[x1-s*.035,yy1+.02,z0]],['#9b6036','#b17a49','#90603a','#a76b3c'][(i+r)%4],.018)
    // The scalloped lower edge remains visible at the eaves and between staggered courses
    tile.name='staggered-scalloped-roof-tile'
   }
  }else{
   slab(roof,'continuous-structural-roof-underlay',[[cx,ridge(cz-d/2)-.025,cz-d/2],[cx,ridge(cz+d/2)-.025,cz+d/2],[cx+s*w/2,y-.025,cz+d/2],[cx+s*w/2,y-.025,cz-d/2]],'#594c35',.035)
   for(let i=0;i<13;i++){const z0=cz-d/2+i*d/13,z1=z0+d/13*.98,j=.015*(rng()-.5);slab(roof,'rough-gabled-roof-plank',[[cx,ridge(z0),z0],[cx,ridge(z1),z1],[cx+s*(w/2+j),y-.02,z1],[cx+s*(w/2+j),y-.02,z0]],WOOD[(i+seed)%4],.033)}
  }
  beam(roof,'front-raking-fascia',[cx,y+rise+.02,cz-d/2-.012],[cx+s*w/2,y-.03,cz-d/2-.012],.07,.065,'#59462e')
  beam(roof,'rear-raking-fascia',[cx,y+rise+.02,cz+d/2+.01],[cx+s*w/2,y-.03,cz+d/2+.01],.06,.06,'#59462e')
  if(moss){
   const v=[],idx=[];for(let j=0;j<=6;j++)for(let i=0;i<=12;i++){const t=j/6,z=cz-d/2+i*d/12,x=cx+s*w*.5*t;v.push(x,y+rise*(1-t)+.045+.019*Math.sin(i*2+j),z+(j===6?.024*Math.sin(i*3):0));if(j<6&&i<12){const k=j*13+i;idx.push(...(s>0?[k,k+1,k+13,k+1,k+14,k+13]:[k,k+13,k+1,k+1,k+13,k+14]))}}skin(roof,'continuous-uneven-living-sod-roof',v,idx,'#738447','bark')
   for(let i=0;i<14;i++){const z=cz-d/2+i*d/13;branch(roof,'short-sod-eave-tuft',[[cx+s*w*.49,y+.035,z],[cx+s*w*.51,y-.04,z+.015],[cx+s*w*.52,y-.075,z+.02]],[.015,.011,.002],'#778448',i,7,6)}
  }
 }
 beam(roof,'crooked-ridge-cap',[cx,y+rise+.035,cz-d/2-.045],[cx,y+rise+.035,cz+d/2+.045],.085,.08,'#715739',5);return roof
}
function sign(g,root,x,y,z,w=.30,h=.22,kind='mug'){
 const pivot=group(g,'hinged-hanging-sign',x,y,z)
 for(const xx of [-w*.32,w*.32])rod(pivot,[xx,0,0],[xx,-.10,0],.006,P.rope)
 const board=group(pivot,'carved-sign-board',0,-.10-h/2,0);box(board,0,0,0,w,h,.035,'#a08a5a','bark');beam(board,'sign-top-binding',[-w*.5,h*.46,-.022],[w*.5,h*.46,-.022],.014,.02,'#5f4c34')
 if(kind==='mug'){box(board,0,-.01,-.027,w*.23,h*.53,.008,'#493e2d');const handle=torus(board,w*.14,-.01,-.03,h*.18,.008,'#493e2d');handle.scale.x=.75}
 if(kind==='envelope'){box(board,0,0,-.026,w*.65,h*.54,.006,'#e0c99b');rod(board,[-w*.32,h*.25,-.032],[0,-.02,-.032],.008,'#785a39');rod(board,[w*.32,h*.25,-.032],[0,-.02,-.032],.008,'#785a39')}
 motion(root,pivot,'sway',{axis:'z',amplitude:.025,speed:1.1,phase:.6});return pivot
}
function lantern(g,root,x,y,z,size=.10){
 const pivot=group(g,'supported-acorn-lantern',x,y,z);rod(pivot,[0,0,0],[0,-.10,0],.006,P.rope)
 const glass=ell(pivot,0,-.10-size*.6,0,size*.58,size*.78,size*.58,'#dec783');glass.name='warm-lantern-body'
 const cap=cyl(pivot,0,-.08,0,size*.67,size*.27,'#606345',size*.35,12,'bark');cap.name='acorn-lantern-cap'
 for(let i=0;i<4;i++){const a=i/4*TAU;rod(pivot,[Math.sin(a)*size*.55,-.1,Math.cos(a)*size*.55],[Math.sin(a)*size*.40,-.1-size*1.2,Math.cos(a)*size*.40],.008,'#645e3d')}
 motion(root,pivot,'sway',{axis:'z',amplitude:.025,speed:.85,phase:x*2});return pivot
}
function tub(g,name,x,y,z,r=.24,h=.30,c='#8a6c48'){
 const t=group(g,name,x,y,z),n=14
 for(let i=0;i<n;i++){const a=i/n*TAU,b=(i+1)/n*TAU;slab(t,'tapered-staved-container-wall',[[Math.sin(a)*r*.78,0,Math.cos(a)*r*.78],[Math.sin(a)*r,h,Math.cos(a)*r],[Math.sin(b)*r,h,Math.cos(b)*r],[Math.sin(b)*r*.78,0,Math.cos(b)*r*.78]],i%3?c:'#6f563b',.016)}
 for(const yy of [h*.18,h*.82]){const ring=torus(t,0,yy,0,r*(.78+.22*yy/h),.014,'#514b38');ring.rotation.x=Math.PI/2;ring.name='container-binding-hoop'}
 cyl(t,0,.025,0,r*.76,.03,'#564833',r*.76,14,'bark');return t
}

function theatre(root){
 root.userData.silhouette='open-plank-stage-with-rising-amphitheatre-and-strung-lights'
 const stage=group(root,'outdoor-theatre-stage');deck(stage,0,.15,-.38,1.95,.90,'wide-worn-stage-floorboard')
 const stageBase=box(stage,0,.111,-.38,1.93,.036,.89,'#51442e','bark');stageBase.name='continuous-stage-lower-deck-and-underside'
 for(const x of [-.83,.83])for(const z of [-.75,-.03])beam(stage,'stage-underside-leg',[x,.015,z],[x,.14,z],.10,.10,'#51442e')
 for(let i=0;i<3;i++){const y=.055+i*.045,z=-.94+i*.07;beam(stage,'front-stage-stair',[-.37,y,z],[.37,y,z],.07,.06,WOOD[i])}
 const seats=group(root,'rising-earth-and-timber-amphitheatre')
 for(let row=0;row<5;row++){
  const y=.17+row*.19,r=.70+row*.20,n=28,pos=[],indices=[]
  // Each whole row is a solid curved earth terrace, continuously grounded to Y=0
  // Adjacent terraces overlap slightly, so neither the seats nor their foundations float
  for(let i=0;i<=n;i++){
   const a=-1.12+i/n*2.24
   for(const [rr,yy]of [[r-.13,.005],[r+.105,.005],[r-.13,y-.035],[r+.105,y-.035]])pos.push(Math.sin(a)*rr,yy,.05+Math.cos(a)*rr*.48)
   if(i<n){const k=i*4;indices.push(k+2,k+3,k+7,k+2,k+7,k+6,k,k+2,k+6,k,k+6,k+4,k+1,k+5,k+7,k+1,k+7,k+3,k,k+4,k+5,k,k+5,k+1)}
  }
  indices.push(0,1,3,0,3,2,n*4,n*4+2,n*4+3,n*4,n*4+3,n*4+1)
  skin(seats,'continuous-curved-earth-terrace',pos,indices,row%2?'#5d6548':'#68724c','stone')
  for(let i=0;i<n;i++){
   const a=-1.12+i/n*2.24-.002,b=-1.12+(i+1)/n*2.24+.002
   beam(seats,'connected-curved-row-seat-board',[Math.sin(a)*r,y-.005,.05+Math.cos(a)*r*.48],[Math.sin(b)*r,y-.005,.05+Math.cos(b)*r*.48],.125,.055,row%2?'#706c49':'#837851',row*30+i)
  }
 }
 const poles=group(root,'actual-lighting-posts');for(const [x,z,h]of [[-1,-.12,1.60],[1,-.12,1.68],[-1.1,.86,2.0],[1.1,.86,2.08]])twig(poles,'rooted-rustic-light-pole',[[x,.015,z],[x*.99,h*.58,z],[x+.015,h,z]],[.045,.035,.022],'#69503a',Math.round(h*13))
 for(const [z,y]of [[-.12,1.60],[.86,2.0]]){
  curve(poles,[[-1.06,y,z],[-.5,y-.14,z],[0,y-.21,z],[.5,y-.12,z],[1.07,y+.06,z]],.008,'#b1a480')
  for(let i=0;i<7;i++){const x=-.91+i*.30,yy=y-.20*(1-x*x);const pivot=group(poles,'hanging-stage-light',x,yy,z);rod(pivot,[0,0,0],[0,-.045,0],.0045,'#a59c76');ell(pivot,0,-.07,0,.055,.035,.045,i%2?'#d9a48a':'#c8796b');cyl(pivot,0,-.046,0,.043,.015,'#655c43',.035,10);if(i===3)motion(root,pivot,'sway',{axis:'z',amplitude:.035,speed:1,phase:z})}
 }
}

function twigBarge(root){
 root.userData.silhouette='long-curved-wooden-barge-with-yellow-ragged-tension-canopy'
 const boat=group(root,'clinker-built-twig-barge'),n=24,v=[],idx=[]
 // A true concave hull: narrow keel, flared sides and both upturned pointed ends
 const section=(t)=>Math.pow(Math.sin(Math.PI*t),.58)
 for(let j=0;j<4;j++)for(let i=0;i<=n;i++){
  const t=i/n,x=-1.23+t*2.46,fac=section(t),y=.12+j*.105+.23*Math.pow(Math.abs(t-.5)*2,3),z=(j%2?1:-1)*(.02+(j<2?.14:.37)*fac)
  // Rings are generated below instead of four disconnected profile strips
  v.push(x,y,z)
 }
 // Separate strakes follow the long hull rather than using a generic bowl primitive
 for(const s of [-1,1])for(let row=0;row<4;row++)for(let i=0;i<n;i++){
  const pts=[];for(const [t,r]of [[i/n,row],[(i+1)/n,row],[(i+1)/n,row+1],[i/n,row+1]]){const fac=section(t),rr=r/4;pts.push([-1.23+t*2.46,.10+.30*rr+.24*Math.pow(Math.abs(t-.5)*2,3),s*(.025+(.10+.25*rr)*fac)])}
  slab(boat,'lapping-longitudinal-hull-strake',pts,WOOD[(row+1)%4],.020)
 }
 for(let i=0;i<n;i++){
  const bottom=[];for(const [t,s]of [[i/n,-1],[(i+1)/n,-1],[(i+1)/n,1],[i/n,1]])bottom.push([-1.23+t*2.46,.10+.24*Math.pow(Math.abs(t-.5)*2,3),s*(.025+.10*section(t))])
  slab(boat,'closed-barge-keel-and-bottom-plank',bottom,'#645039',.035)
 }
 for(const x of [-1.23,1.23]){const cap=box(boat,x,.49,0,.022,.31,.055,'#795b3d','bark');cap.name='closed-barge-stem-bulkhead'}
 deck(boat,0,.27,0,1.90,.47,'barge-cargo-floor')
 for(const s of [-1,1]){const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push([-1.24+t*2.48,.415+.24*Math.pow(Math.abs(t-.5)*2,3),s*(.025+.35*section(t))])}curve(boat,pts,.028,'#ae8b52','bark')}
 for(const x of [-1.20,1.20])twig(boat,'upturned-stem-post',[[x,.18,0],[x*1.04,.40,0],[x*1.08,.68,0]],[.042,.035,.018],'#927044',x>0?21:22)
 for(let i=0;i<9;i++){const a=(i-4)*.13;twig(boat,'loaded-twig',[[a-.37,.36,.10],[a-.62,.54,.10],[a-.77,.69,.11]],[.023,.020,.012],WOOD[i%4],i);if(i%2===0)twig(boat,'twig-cargo-fork',[[a-.55,.48,.10],[a-.59,.62,.19],[a-.66,.68,.23]],[.014,.010,.003],WOOD[i%4],i+30)}
 const canopy=group(boat,'four-post-tensioned-canopy')
 for(const x of [-.76,.70])for(const z of [-.23,.23])twig(canopy,'forked-canopy-post',[[x,.28,z],[x+.03,1.06,z],[x+.10,1.45+(x>0?.16:0),z]],[.033,.024,.015],'#80613b',Math.round(x*12+20))
 for(const z of [-.27,.27])twig(canopy,'canopy-long-edge-spar',[[-.78,1.43,z],[0,1.50,z],[.85,1.68,z]],[.021,.022,.012],'#877047',6)
 const fabric=group(canopy,'wind-tensioned-yellow-cloth');const pp=[],ii=[]
 for(let j=0;j<=6;j++)for(let i=0;i<=18;i++){const t=i/18,q=j/6,x=-.81+t*1.73,z=-.30+q*.60;pp.push(x,1.44+.24*t-.10*Math.sin(q*Math.PI)+.020*Math.sin(t*9+q*2),z+(i===18?.035*Math.sin(j*4):0));if(i<18&&j<6){const k=j*19+i;ii.push(k,k+19,k+1,k+1,k+19,k+20)}}const yellow=skin(fabric,'sagged-yellow-woven-canopy',pp,ii,'#c8b744','cloth');yellow.material=material('#c8b744','cloth',{side:T.DoubleSide});motion(root,fabric,'sway',{axis:'x',amplitude:.012,speed:.85,phase:.1})
 for(let i=0;i<3;i++){const x=-.45+i*.45;const fender=group(boat,'tied-acorn-hull-fender',x,.45,-.37);curve(fender,[[0,.05,.02],[.04,-.08,-.025],[.02,-.13,-.025]],.007,P.rope);ell(fender,.02,-.20,-.03,.070,.10,.06,'#ad8252');const cap=cyl(fender,.02,-.13,-.03,.08,.045,'#796344',.072,12,'bark');motion(root,fender,'sway',{axis:'z',amplitude:.035,speed:.8,phase:i})}
 curve(boat,[[-1.21,.50,-.06],[-1.29,.31,-.13],[-1.23,.15,-.27],[-1.04,.20,-.32]],.009,P.rope)
}

function university(root){
 root.userData.silhouette='cream-academic-quadrangle-with-central-stone-mouse-scholar-monument'
 const halls=group(root,'low-connected-university-halls')
 // The buildings in the illustration form the background of a courtyard, not a tower
 const blocks=[[-.63,.48,.77,1.18],[.18,.53,.72,1.30],[.80,.58,.58,1.12]]
 for(let k=0;k<blocks.length;k++){
  const [x,z,w,h]=blocks[k],front=z-.24,holes=[]
  if(k===1)holes.push(archPath(0,0,.23,.63))
  panel(halls,'cream-rendered-academic-front',[[-w/2,0],[w/2,0],[w/2,h-.12],[w*.29,h],[0,h+.05],[-w*.29,h],[-w/2,h-.12]],.46,CREAM,x,.05,front,holes,'stone')
  if(k===1){
   panel(halls,'university-closed-rear-doorway-wall',[[-w/2,0],[w/2,0],[w/2,h-.12],[0,h+.035],[-w/2,h-.12]],.055,'#c2b694',x,.05,front+.42,[],'stone')
   const hallFloor=box(halls,x,.055,z,.25,.045,.47,'#a79e7d','stone');hallFloor.name='university-doorway-interior-floor'
  }
  for(const s of [-1,1])twig(halls,'arched-facade-timber-rib',[[x+s*w*.47,.06,front-.018],[x+s*w*.46,h-.16,front-.018],[x+s*w*.25,h+.03,front-.018],[x,h+.08,front-.018]],[.028,.030,.025,.020],'#94815c',k*9+(s>0?1:2))
  gableRoof(halls,x,h-.03,z,w+.13,.64,.14,{moss:true,seed:k+10})
  if(k===1)roundWindow(halls,x,h-.24,front-.03,.074,'#8b9b76')
  else for(const xx of [-w*.18,w*.18]){box(halls,x+xx,.78,front-.012,.055,.105,.02,'#72846f');beam(halls,'narrow-window-stone-surround',[x+xx-.035,.72,front-.024],[x+xx-.035,.84,front-.024],.012,.018,'#aaa17e')}
 }
 // Statue is an architectural object on a continuous pedestal, with a restrained stone silhouette
 const monument=group(root,'courtyard-mouse-scholar-statue',-.06,0,-.28)
 for(let i=0;i<10;i++){const a=i/10*TAU;rock(monument,Math.sin(a)*.44,.055,Math.cos(a)*.36,.13,.075,.12,'#777e70',i+8)}
 cyl(monument,0,.105,0,.32,.16,'#686f62',.29,12,'stone');cyl(monument,0,.24,0,.235,.14,'#858a76',.16,14,'stone');cyl(monument,0,.37,0,.16,.13,'#797f6d',.25,16,'stone');cyl(monument,0,.46,0,.29,.07,'#8c917e',.29,18,'stone')
 const statue=group(monument,'carved-mouse-scholar',0,.50,0),sc='#737c6f'
 const robePoints=[new T.Vector2(.25,0),new T.Vector2(.20,.08),new T.Vector2(.16,.43),new T.Vector2(.17,.61),new T.Vector2(.105,.71)]
 detail(statue,'continuous-flared-carved-robe',new T.LatheGeometry(robePoints,24),sc,0,0,0,'stone')
 for(let i=0;i<9;i++){const a=i/9*TAU;curve(statue,[[Math.sin(a)*.23,.02,Math.cos(a)*.23],[Math.sin(a+.1)*.17,.30,Math.cos(a+.1)*.17],[Math.sin(a)*.13,.57,Math.cos(a)*.13]],.012,i%2?'#7d8475':'#606a60','stone')}
 ell(statue,0,.73,-.01,.12,.14,.12,sc,'stone');const head=ell(statue,.035,.91,-.055,.155,.14,.17,sc,'stone');head.rotation.z=-.13
 const muzzle=ell(statue,.10,.925,-.18,.11,.085,.12,sc,'stone');muzzle.rotation.y=-.20;ell(statue,.12,.93,-.275,.045,.034,.025,'#626c62','stone')
 for(const s of [-1,1]){ell(statue,s*.14,.98,-.003,.082,.10,.045,sc,'stone');ell(statue,s*.143,.98,-.043,.055,.065,.012,'#626b61','stone')}
 ell(statue,.131,.969,-.169,.014,.014,.010,'#4f5b53','stone')
 twig(statue,'left-attached-robe-arm',[[-.13,.59,-.01],[-.23,.48,-.05],[-.12,.43,-.16]],[.065,.061,.042],sc,20)
 twig(statue,'right-attached-robe-arm',[[.12,.59,-.01],[.21,.46,-.02],[.14,.42,-.16]],[.065,.059,.038],sc,21)
 const book=group(statue,'stone-book-held-by-both-arms',.02,.45,-.18);book.rotation.x=-.32;box(book,0,0,0,.29,.25,.04,'#59675d','stone');beam(book,'book-spine',[-.01,-.12,-.03],[-.01,.12,-.03],.015,.018,'#8b9180');box(book,0,0,-.028,.25,.21,.008,'#858c7a','stone')
 twig(statue,'stone-tail-attached-to-robe',[[-.12,.12,.14],[-.36,.24,.07],[-.48,.40,.03],[-.60,.54,.0]],[.031,.023,.015,.006],sc,24)
 // A small hall pennant is the only moving part, attached to its ridge pole
 beam(halls,'university-pennant-pole',[.81,1.29,.63],[.81,1.70,.63],.018,.018,'#6f6549')
 const pennant=group(halls,'academic-pennant',.81,1.66,.63),flag=skin(pennant,'green-cloth-pennant',[0,0,0,.23,-.045,0,.17,-.14,0,0,-.12,0],[0,2,1,0,3,2],'#748362','cloth');flag.material=material('#748362','cloth',{side:T.DoubleSide});motion(root,pennant,'sway',{axis:'z',amplitude:.035,speed:1,phase:1})
}

function tent(g,root,x,z,r,h,seed){
 const t=group(g,'pegged-canvas-pavilion',x,0,z),n=32,eave=h*.53,opening=.20,pos=[],idx=[],rng=random(seed)
 // Circumference is deliberately open at the front: no dark painted-on entrance
 for(let j=0;j<=6;j++)for(let i=0;i<=n;i++){
  const a=opening+(TAU-opening*2)*i/n,q=j/6,rr=r*(1-.17*q)*(1+.018*Math.sin(i*3)),yy=.025+(eave+(h-eave)*.11-.025)*q
  pos.push(Math.sin(a)*rr,yy, -Math.cos(a)*rr);if(j<6&&i<n){const k=j*(n+1)+i;idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2)}
 }
 const cloth=skin(t,'vertically-folded-open-canvas-wall',pos,idx,'#bfc6b3','cloth');cloth.material=material('#bfc6b3','cloth',{side:T.DoubleSide})
 const ground=cyl(t,0,.026,0,r*.99,.045,'#8a8360',r*.99,32,'bark');ground.name='closed-pavilion-ground-dais'
 for(let i=0;i<n;i+=4){const a=opening+(TAU-opening*2)*i/n;curve(t,[[Math.sin(a)*r,.03,-Math.cos(a)*r],[Math.sin(a)*r*.91,eave*.55,-Math.cos(a)*r*.91],[Math.sin(a)*r*.83,eave,-Math.cos(a)*r*.83]],.007,i%8?'#a3b09d':'#d3d5be','cloth')}
 // Each radial gore is a shaped skin; broad painted bands follow the cloth construction
 const roof=group(t,'tensioned-conical-canvas-roof')
 for(let i=0;i<n;i++){
  const a=i/n*TAU,b=(i+1)/n*TAU,v=[],id=[]
  for(let j=0;j<=7;j++){for(const aa of [a,b]){const q=j/7,rr=r*.90*Math.pow(q,.84);v.push(Math.sin(aa)*rr,h-(h-eave)*q+.014*Math.sin(q*5+i),-Math.cos(aa)*rr)}if(j<7){const k=j*2;id.push(k,k+1,k+2,k+1,k+3,k+2)}}const c=i%4<2?'#bfc5b0':'#7d9588',gore=skin(roof,'seamed-radial-canvas-gore',v,id,c,'cloth');gore.material=material(c,'cloth',{side:T.DoubleSide})
 }
 beam(t,'central-tent-mast',[0,.015,0],[0,h+.08,0],.035,.04,'#766043');const finial=ell(t,0,h+.075,0,.026,.04,.026,'#a59162');finial.name='mast-finial'
 const eavePts=[];for(let i=0;i<=40;i++){const a=i/40*TAU;eavePts.push([Math.sin(a)*r*.90,eave+.012*Math.sin(a*16),-Math.cos(a)*r*.90])}curve(t,eavePts,.015,'#778976','cloth')
 for(const a of [-.45,.45,2.20,4.08]){const ax=Math.sin(a),az=-Math.cos(a);rod(t,[ax*r*.86,eave,az*r*.86],[ax*r*1.20,.02,az*r*1.20],.0055,'#bba779');beam(t,'tent-ground-peg',[ax*r*1.20,.012,az*r*1.20],[ax*r*1.20+.013,.12,az*r*1.20],.016,.016,'#6b593d')}
 const flap=group(t,'tied-door-flap',Math.sin(opening)*r*.90,eave*.95,-Math.cos(opening)*r*.90);const pp=[0,0,0,.09,-eave*.96,.035,-.05,-eave*.96,.00,-.04,-.08,0];skin(flap,'hanging-front-canvas-flap',pp,[0,1,2,0,2,3],'#cbd0b9','cloth');motion(root,flap,'sway',{axis:'x',amplitude:.018,speed:.75,phase:seed});return t
}
function fairgrounds(root){
 root.userData.silhouette='two-asymmetric-open-striped-canvas-pavilions-with-acorn-festoon'
 const grounds=group(root,'fairground-pavilions');tent(grounds,root,.36,.24,.60,1.94,3);tent(grounds,root,-.70,.32,.34,1.36,7)
 for(const [x,z,h]of [[-1.02,-.22,1.76],[.97,-.16,2.14]])twig(grounds,'lantern-festoon-post',[[x,.015,z],[x+.02,h,z]],[.029,.018],'#6a5b3e',Math.round(h*20))
 curve(grounds,[[-1.0,1.76,-.22],[-.40,1.63,-.22],[.26,1.76,-.20],[.97,2.14,-.16]],.008,'#8e916a')
 for(const [x,y]of [[-.82,1.70],[-.42,1.65],[0,1.69],[.42,1.84],[.80,2.04]])lantern(grounds,root,x,y,-.23,.087)
 for(let i=0;i<6;i++){const x=-.76+i*.28;rock(grounds,x,.018,-.60,.13,.022,.10,i%2?'#83906e':'#a4ab7d',i)}
}

function farm(root){
 root.userData.silhouette='low-cream-barn-with-crooked-sod-gable-and-rear-wooden-silo'
 const house=group(root,'sod-roofed-farmhouse'),w=1.04,d=.91,front=-.44
 panel(house,'cream-crooked-gable-front',[[-.53,0],[.50,0],[.49,.90],[.34,1.02],[.03,1.19],[-.23,1.12],[-.51,.90]],.085,CREAM,0,.035,front,[archPath(-.035,0,.29,.63)],'stone')
 panel(house,'farm-right-side-closed-wall',[[0,0],[d,0],[d,1.01],[0,.97]],.065,'#ad9f7b',.50,.035,front+.04,[],'stone').rotation.y=-Math.PI/2
 panel(house,'farm-left-side-closed-wall',[[0,0],[d,0],[d,.97],[0,1.01]],.065,'#b8a985',-.50,.035,front+.04+d,[],'stone').rotation.y=Math.PI/2
 panel(house,'farm-closed-rear-gable',[[-.50,0],[.50,0],[.50,1.01],[.015,1.265],[-.50,1.01]],.065,'#b9ab86',0,.035,.47,[],'stone')
 const farmFloor=box(house,0,.045,.045,1.0,.07,.96,'#736044','bark');farmFloor.name='farm-continuous-ground-floor'
 for(const s of [-1,1]){
  beam(house,'farm-rear-corner-post',[s*.49,.03,.53],[s*.49,1.025,.53],.05,.055,'#76603e')
  beam(house,'farm-side-ground-sill',[s*.50,.09,-.4],[s*.50,.09,.51],.05,.055,'#77603f')
 }
 beam(house,'farm-rear-gable-tie',[-.50,.97,.54],[.50,.97,.54],.045,.055,'#77603f')
 // Side planks and all front braces connect to the sill and gable frame
 for(const x of [-.48,.47])twig(house,'crooked-corner-post',[[x,.025,front-.025],[x*.98,.71,front-.025],[x*.75,1.02,front-.02],[.03,1.28,front-.02]],[.040,.042,.034,.023],'#6f5a3a',x>0?4:5)
 for(const z of [front+.08,.15,.43])beam(house,'side-roof-support',[.49,.05,z],[.49,.95,z],.046,.05,'#76603e',Math.round(z*20+30))
 beam(house,'side-ground-sill',[.50,.09,-.4],[.50,.09,.48],.06,.06,'#77603f');beam(house,'diagonal-side-brace',[.5,.10,.36],[.5,.61,-.32],.045,.045,'#77603f')
 plankDoor(house,-.035,.04,front+.02,.26,.61,'#984c28');frameArch(house,-.035,.04,front-.028,.31,.66,'#7e633c',.035)
 box(house,.04,.97,front-.012,.18,.18,.021,'#56694d');beam(house,'attic-window-sill',[-.065,.868,front-.03],[.145,.868,front-.03],.025,.036,'#79603b')
 const shutter=slab(house,'slanted-attic-shutter',[[-.075,1.10,front-.02],[.14,1.10,front-.02],[.18,.99,front-.15],[-.035,.99,front-.15]],'#ac7136',.025)
 gableRoof(house,.015,.92,.025,1.35,1.18,.39,{moss:true,seed:18})
 // Narrow stave silo rises behind the low roof, capped by a thick grassy wooden lid
 const silo=group(root,'rear-staved-grain-silo',.37,0,.45),r=.18
 const siloLining=cyl(silo,0,.86,0,.161,1.63,'#70573b',.15,20,'bark');siloLining.name='closed-silo-lining-base-and-top'
 for(let i=0;i<15;i++){const a=i/15*TAU;beam(silo,'silo-stave',[Math.sin(a)*r,.08,Math.cos(a)*r],[Math.sin(a)*r*.92,1.68,Math.cos(a)*r*.92],.072,.034,WOOD[i%4],i)}
 for(const yy of [.28,.90,1.49]){const hoop=torus(silo,0,yy,0,r+.014,.014,'#65553a');hoop.rotation.x=Math.PI/2}
 plankedRoof(silo,0,1.66,0,.28,.26,.09,18);twig(silo,'silo-lid-handle',[[-.04,1.72,0],[-.03,1.82,0],[.04,1.84,0],[.05,1.73,0]],[.018,.019,.018,.015],'#8e7346',9)
 const produce=group(root,'farm-produce-stand',.78,0,-.63);for(const x of [-.12,.12])for(const z of [-.08,.08])beam(produce,'splayed-produce-stand-leg',[x*1.25,.02,z*1.5],[x*.65,.65,z*.5],.035,.04,'#5c4a32');const bowl=cyl(produce,0,.66,0,.15,.07,'#8e744c',.22,16,'bark');bowl.name='harvest-tray';for(let i=0;i<6;i++){const a=i*2.4;ell(produce,Math.sin(a)*.11,.72+Math.floor(i/4)*.05,Math.cos(a)*.09,.065,.058,.065,'#69536a')}
 const crop=group(house,'roof-eave-seed-sprig',-.58,1.02,-.2);twig(crop,'rooted-eave-grass',[[0,0,0],[-.06,.18,0],[-.035,.26,.01]],[.008,.006,.002],'#8b9857',3);leaf(crop,-.04,.12,0,.065,.4,'#899754');motion(root,crop,'sway',{axis:'z',amplitude:.035,speed:1,phase:1})
}

function inn(root){
 root.userData.silhouette='massive-rooted-inn-tree-with-tall-red-arched-entry-and-small-warm-windows'
 const tree=group(root,'inhabited-inn-tree'),r=.51,cy=0,ns=32,ny=18,pos=[],idx=[],colors=[]
 // The tree has true volume around a recessed entrance, rather than a detached doorway card
 for(let j=0;j<=ny;j++)for(let i=0;i<=ns;i++){
  const t=j/ny,a=i/ns*TAU,rr=(r+.16*Math.exp(-t*7))*(1-.16*t)*(1+.037*Math.sin(a*9+t*2)),cx=.12+.06*t*t,z=.22
  pos.push(cx+Math.sin(a)*rr,t*2.34,z+Math.cos(a)*rr*.83);const col=new T.Color(i%3?'#776049':'#8b6c4e');col.multiplyScalar(.94+.08*Math.sin(j+i));colors.push(col.r,col.g,col.b);if(j<ny&&i<ns){const q=j*(ns+1)+i;idx.push(q,q+1,q+ns+1,q+1,q+ns+2,q+ns+1)}
 }skin(tree,'continuous-fluted-trunk',pos,idx,'#ffffff','bark',colors)
 // Seal the actual last bark ring, including its flutes, with a cut-wood crown
 const topCenter=pos.length/3,baseCenter=topCenter+1;pos.push(.18,2.34,.22,.12,0,.22)
 const capTop=[],capBase=[],topStart=ny*(ns+1)
 for(let i=0;i<ns;i++){capTop.push(topCenter,topStart+i,topStart+i+1);capBase.push(baseCenter,i+1,i)}
 skin(tree,'inn-solid-cut-trunk-crown',pos,capTop,'#8a7751','bark');skin(tree,'inn-solid-trunk-ground-cap',pos,capBase,'#594d37','bark')
 for(let i=0;i<7;i++){const a=i/7*TAU;if(Math.cos(a)<-.55)continue;twig(tree,'load-bearing-buttress-root',[[.12+Math.sin(a)*.32,.78,.22+Math.cos(a)*.28],[.12+Math.sin(a)*.55,.25,.22+Math.cos(a)*.47],[.12+Math.sin(a)*.78,.025,.22+Math.cos(a)*.65]],[.13,.14,.018],'#80664b',i+20)}
 for(let i=0;i<12;i++){const a=i/12*TAU;const pts=[];for(let j=0;j<9;j++){const y=.24+j*.245,rr=(r+.16*Math.exp(-y/2.34*7))*(1-.16*y/2.34);pts.push([.12+.06*(y/2.34)**2+Math.sin(a)*rr*1.015,y,.22+Math.cos(a)*rr*.846])}curve(tree,pts,.011,i%3?'#584b37':'#a08159','bark')}
 const porch=group(root,'cream-and-red-inn-entrance',-.12,0,-.50)
 panel(porch,'entry-gable-with-real-door-recess',[[-.35,0],[.35,0],[.33,1.18],[.02,1.52],[-.33,1.18]],.17,'#dbcca6',0,.035,0,[archPath(0,0,.36,1.08)],'stone')
 panel(porch,'inn-entry-closed-rear-wall',[[-.33,0],[.33,0],[.33,1.17],[.02,1.46],[-.33,1.17]],.06,'#b7a784',0,.035,.31,[],'stone')
 for(const s of [-1,1]){const side=box(porch,s*.315,.59,.23,.055,1.17,.34,'#c6b58d','stone');side.name='inn-entry-closed-side-wall'}
 const porchFloor=box(porch,0,.045,.20,.65,.06,.39,'#89734d','bark');porchFloor.name='inn-entry-ground-floor'
 for(const s of [-1,1])twig(porch,'door-porch-crooked-jamb',[[s*.32,.03,-.018],[s*.31,1.12,-.018],[0,1.49,-.018]],[.036,.036,.026],'#927349',s>0?8:9)
 frameArch(porch,0,.04,-.022,.40,1.13,'#9f8b62',.047);plankDoor(porch,0,.047,.025,.355,1.07,'#994b3c');roundWindow(porch,0,1.275,-.012,.091,'#d7b65e');gableRoof(porch,0,1.13,.10,.87,.65,.40,{seed:20})
 // The few windows are set against the bark on the inhabited trunk, without a whole cottage wall
 for(const [x,y,z,ry]of [[-.15,1.82,-.245,.13],[.37,2.02,-.135,.15],[.50,1.50,-.02,.10],[.50,1.05,-.01,.085]]){
  const win=group(tree,'warm-arched-trunk-window',x,y,z);const shape=archPath(0,0,.11,ry*1.6),s=new T.Shape(shape.getPoints(24));detail(win,'recessed-amber-window',new T.ExtrudeGeometry(s,{depth:.015,bevelEnabled:false}), '#d1ae56',0,-ry*.8,0,'paint');frameArch(win,0,-ry*.8,-.014,.13,ry*1.6+.012,'#68583a',.016);beam(win,'window-divider',[0,-ry*.70,-.026],[0,ry*.65,-.026],.010,.014,'#735f3c')
 }
 bracket(tree,-.30,1.98,.05,.23,.21,10,false);bracket(tree,-.33,1.78,.03,.17,.17,13,false)
 const signpost=group(root,'inn-signpost',-.73,0,-.70);twig(signpost,'grounded-signpost',[[0,.02,0],[.02,1.40,0],[.0,1.55,0]],[.033,.028,.018],'#735b3e',3);twig(signpost,'signpost-arm',[[0,1.40,0],[-.13,1.45,0],[-.32,1.48,0]],[.023,.019,.014],'#735b3e',4);sign(signpost,root,-.22,1.42,0,.27,.25,'mug')
 rock(root,-.50,.06,-.13,.23,.09,.21,'#83816a',6);rock(root,.62,.06,-.15,.22,.08,.20,'#83816a',7)
}

function mine(root){
 root.userData.silhouette='deep-angular-rock-tunnel-with-curved-railway-and-loaded-wooden-ore-cart'
 const tunnel=group(root,'mine-rock-tunnel'),outer=[[-.92,0],[-1.03,.54],[-.95,1.40],[-.72,2.03],[-.24,2.28],[.43,2.23],[.90,1.76],[1.0,.60],[.88,0]],inner=archPath(0,0,1.20,1.82)
 panel(tunnel,'continuous-rock-portal-with-lined-tunnel',outer,.87,'#68695b',0,.02,-.02,[inner],'stone')
 panel(tunnel,'mine-rear-tunnel-extension',outer.map(([x,y])=>[x*.93,y*.96]),.50,'#626658',0,.02,.82,[archPath(.08,0,1.02,1.69)],'stone')
 panel(tunnel,'mine-solid-terminal-rock',outer.map(([x,y])=>[x*.92,y*.96]),.16,'#66695a',0,.02,1.30,[],'stone')
 const mineFloor=box(tunnel,0,.025,.64,1.22,.045,1.33,'#6a6c59','stone');mineFloor.name='mine-closed-tunnel-floor'
 for(const [x,y,sx,sy]of [[-.63,.44,.27,.39],[.58,.60,.30,.42],[-.39,1.45,.35,.35],[.43,1.43,.33,.40],[0,1.93,.39,.25]]){const outcrop=rock(tunnel,x,y,1.38,sx,sy,.17,'#747363',Math.round(y*31));outcrop.name='mine-rear-rock-outcrop'}
 // Irregular outcrops are bound to the structural portal, leaving the full bore and track clear
 for(const [x,y,z,sx,sy,sz]of [[-.79,.23,-.15,.28,.23,.23],[-.84,.72,-.12,.23,.29,.22],[-.78,1.20,-.06,.23,.35,.21],[-.60,1.78,-.02,.27,.25,.24],[-.15,2.07,-.02,.33,.18,.24],[.38,1.99,-.02,.30,.21,.24],[.73,1.52,-.04,.24,.34,.22],[.86,.83,-.13,.23,.38,.25],[.76,.24,-.16,.27,.21,.25]])rock(tunnel,x,y,z,sx,sy,sz,'#747363',Math.round(y*20))
 beam(tunnel,'inset-tunnel-support-crossbeam',[-.62,1.63,.53],[.62,1.63,.53],.10,.10,'#695339');for(const x of [-.59,.59])beam(tunnel,'tunnel-support-post',[x,.03,.53],[x,1.65,.53],.09,.09,'#695339')
 const track=group(root,'continuous-curved-mine-railway')
 for(let i=0;i<14;i++){const z=-1.00+i*.145,x=.045*Math.sin((z+.6)*2);beam(track,'railway-sleeper',[x-.30,.048,z],[x+.30,.048,z],.065,.065,WOOD[i%4],i)}
 for(const s of [-1,1]){const pts=[];for(let i=0;i<=20;i++){const z=-1.04+i*.112;pts.push([s*.225+.045*Math.sin((z+.6)*2),.105,z])}curve(track,pts,.017,'#9a9987')}
 const cart=group(root,'stationary-loaded-ore-cart',0,.13,-.22)
 for(const z of [-.22,.22]){rod(cart,[-.34,.10,z],[.34,.10,z],.023,'#4e4c3d');for(const x of [-.31,.31]){const wheel=cyl(cart,x,.10,z,.115,.048,'#494a3e',.115,16);wheel.rotation.z=Math.PI/2;torus(cart,x,.10,z,.087,.012,'#72715b').rotation.y=Math.PI/2}}
 for(const x of [-.21,.21])beam(cart,'cart-undercarriage',[x,.17,-.29],[x,.17,.29],.06,.06,'#55452f')
 // Front and back are curved U-shaped planked ends; side planks expand toward the rim
 for(const z of [-.29,.29])for(let row=0;row<6;row++){const y=.22+row*.066,w=.20+.26*Math.sin((row+1)/7*Math.PI/2);beam(cart,'ore-cart-curved-end-plank',[-w,y,z],[w,y,z],.060,.035,WOOD[(row+2)%4],row)}
 for(const s of [-1,1])for(let row=0;row<6;row++){const y=.22+row*.066,x=s*(.20+.26*Math.sin((row+1)/7*Math.PI/2));beam(cart,'ore-cart-side-plank',[x,y,-.29],[x,y,.29],.048,.044,WOOD[(row+1)%4],row+10)}
 for(const z of [-.32,.32])for(const s of [-1,1])curve(cart,[[s*.17,.19,z],[s*.32,.33,z],[s*.43,.58,z]],.016,'#534d36')
 const rng=random(26);for(let i=0;i<13;i++){const y=.60+Math.floor(i/5)*.12,x=(rng()-.5)*.58,z=(rng()-.5)*.39;rock(cart,x,y,z,.10+rng()*.035,.09+rng()*.04,.10+rng()*.02,i%3?'#8b8d7e':'#a8a897',i+30)}
 // A working lamp is a restrained reconstruction, fastened to the visible support beam
 rod(tunnel,[.45,1.63,.44],[.45,1.63,.29],.014,'#5b5140');lantern(tunnel,root,.45,1.62,.29,.075)
}

function postOffice(root){
 root.userData.silhouette='low-post-house-under-tall-three-storey-bird-mail-tower-on-braced-stilts'
 const office=group(root,'low-post-office-house'),w=1.42,front=-.35
 panel(office,'low-post-office-rendered-front',[[-.73,0],[.72,0],[.70,.73],[-.60,.78],[-.72,.58]],.60,'#b08b4e',0,.025,front,[archPath(.37,0,.23,.54)],'stone')
 panel(office,'post-office-closed-rear-wall',[[-.73,0],[.72,0],[.70,.73],[-.60,.78],[-.72,.58]],.045,'#ad8a50',0,.025,.215,[],'stone')
 const officeFloor=box(office,0,.035,-.045,1.43,.05,.61,'#997a46','bark');officeFloor.name='post-office-closed-ground-floor'
 for(const x of [-.66,.67])twig(office,'crooked-post-office-corner',[[x,.02,front-.018],[x*.98,.65,front-.018],[x*.9,.77,front-.018]],[.039,.041,.029],'#7b572e',x>0?8:9)
 beam(office,'front-roof-header',[-.72,.74,front-.03],[.75,.70,front-.03],.065,.075,'#75532c');beam(office,'front-wall-stud',[-.10,.04,front-.03],[-.10,.73,front-.03],.045,.05,'#8c6939')
 plankDoor(office,.37,.04,front+.025,.22,.52,'#a94c32');frameArch(office,.37,.035,front-.025,.26,.56,'#b69a58',.028);roundWindow(office,-.34,.33,front-.018,.13,'#d6b65f')
 // A long, crooked shallow cap matches the card, quite distinct from a steep cottage gable
 plankedRoof(office,0,.76,-.025,.88,.48,.10,32);twig(office,'low-crooked-roof-ridge',[[-.78,.86,-.02],[0,.90,-.02],[.86,.87,-.01]],[.045,.043,.026],'#815a2f',6)
 const tower=group(root,'elevated-bird-mail-tower',.16,0,.08),tw=.40,base=1.12,top=2.55
 for(const x of [-.18,.18])for(const z of [-.14,.14])beam(tower,'grounded-mail-tower-stilt',[x,.67,z],[x,base+.05,z],.053,.055,'#76572f',Math.round(x*60+z*20+30))
 for(const z of [-.15,.15]){beam(tower,'mail-tower-cross-brace',[-.18,.77,z],[.18,base,z],.041,.04,'#8d6736');beam(tower,'mail-tower-lower-tie',[-.23,base,z],[.23,base,z],.05,.065,'#74512c')}
 const holes=[];for(const y of [base+.20,base+.66,base+1.12]){const p=new T.Path();p.absarc(0,y,.082,0,TAU,false);holes.push(p)}
 panel(tower,'three-storey-mail-tower-open-front',[[-tw/2,base],[tw/2,base],[tw/2,top],[-tw/2,top]],.052,'#b9914d',0,0,-.20,holes)
 // Both side walls have smaller true pigeon holes with projecting landing shelves
 for(const s of [-1,1]){
  const sideH=[];for(const y of [base+.22,base+.68,base+1.13]){const p=new T.Path();p.absellipse(0,y,.055,.085,0,TAU,false);sideH.push(p)}
  const side=panel(tower,'mail-tower-side-with-open-holes',[[-.18,base],[.18,base],[.18,top],[-.18,top]],.045,s>0?'#aa8243':'#99703b',s*.20,0,-.01,sideH);side.rotation.y=s>0?Math.PI/2:-Math.PI/2
  for(const y of [base+.10,base+.56,base+1.01])beam(tower,'projecting-side-landing-perch',[s*.19,y,0],[s*.34,y,0],.044,.055,'#806037')
  beam(tower,'tower-front-corner-post',[s*.21,base,-.23],[s*.21,top,-.23],.045,.045,'#8b6334')
 }
 const mailBack=box(tower,0,(base+top)/2,.18,.40,top-base,.035,'#8d713e','bark');mailBack.name='mail-tower-closed-rear-wall'
 for(const yy of [base+.025,base+.46,base+.92,top-.025]){const landing=box(tower,0,yy,-.01,.40,.035,.39,'#8b6d3e','bark');landing.name='mail-tower-solid-compartment-floor'}
 for(const y of [base+.07,base+.53,base+.99])beam(tower,'front-mailbox-landing-perch',[-.06,y,-.22],[.16,y,-.34],.050,.055,'#886338')
 for(const yy of [base+.20,base+.66,base+1.12])torus(tower,0,yy,-.231,.084,.010,'#77542e')
 plankedRoof(tower,0,top+.01,0,.31,.28,.04,33)
 // Envelope emblem is carved into the suspended plate rather than replacing the whole building
 for(const x of [-.20,.20])rod(office,[x,.74,front-.06],[x,.63,front-.06],.006,P.rope)
 const plate=group(office,'suspended-post-office-envelope-plate',0,.70,front-.06);box(plate,0,-.08,0,.47,.14,.028,'#d6bb87','bark');rod(plate,[-.16,-.035,-.021],[0,-.10,-.021],.007,'#80643c');rod(plate,[.16,-.035,-.021],[0,-.10,-.021],.007,'#80643c');motion(root,plate,'sway',{axis:'z',amplitude:.018,speed:1,phase:.3})
}

function generalStore(root){
 root.userData.silhouette='dark-tree-shop-with-open-produce-porch-rough-canopy-and-log-steps'
 const shop=group(root,'tree-recess-general-store')
 panel(shop,'thick-shop-bole-with-open-arched-door',[[-.72,0],[.62,0],[.65,1.73],[.50,2.06],[.04,2.24],[-.51,2.09],[-.77,1.64]],.49,'#645d45',0,.05,.09,[archPath(-.18,.25,.48,1.10)],'bark')
 roundedRearRoom(shop,'shop-rounded-rear-room',-.03,.50,.66,.48,.285,2.13,'#645d45')
 for(const s of [-1,1])twig(shop,'shop-rear-root',[[s*.52,1.15,.71],[s*.65,.38,.82],[s*.78,.025,.85]],[.11,.14,.035],'#5d5940',s>0?12:13)
 const shopFloor=box(shop,-.17,.285,.35,.52,.045,.54,'#7b6c49','bark');shopFloor.name='shop-entrance-interior-floor'
 const rearCounter=box(shop,-.16,.53,.79,.59,.44,.16,'#766044','bark');rearCounter.name='shop-interior-rear-counter'
 frameArch(shop,-.18,.30,.067,.51,1.12,'#9b9165',.045)
 for(const x of [-.67,.59])twig(shop,'rooted-shop-tree-side',[[x*.98,.02,.21],[x,1.12,.18],[x*.91,1.88,.23],[x*.63,2.20,.26]],[.15,.115,.10,.06],'#5d5940',x>0?8:9)
 // Deep porch on actual joists and log piers, visible daylight between the rear and posts
 const porch=group(root,'open-trade-porch');deck(porch,0,.27,-.39,1.68,.97)
 for(const x of [-.70,.70])for(const z of [-.79,-.04])twig(porch,'grounded-porch-pier',[[x,.015,z],[x,.26,z]],[.09,.078],'#4e4d38',3)
 for(const x of [-.72,.72])twig(porch,'porch-canopy-tree-post',[[x,.04,-.71],[x+.015,.87,-.70],[x-.025,1.65,-.65]],[.047,.040,.025],'#6f6847',x>0?6:7)
 twig(porch,'porch-canopy-header',[[-.79,1.63,-.70],[0,1.66,-.72],[.81,1.57,-.68]],[.052,.049,.035],'#554f39',9)
 for(let i=0;i<12;i++){const x=-.88+(i+.5)*1.76/12;slab(porch,'dark-overlapping-porch-canopy-board',[[x-.073,1.92,.22],[x+.073,1.92,.22],[x+.073,1.60,-.86],[x-.073,1.60,-.86]],WOOD[(i+2)%4],.035)}
 for(const x of [-.73,.73])beam(porch,'porch-side-rail',[x,.60,-.70],[x,.60,.02],.035,.04,'#696347')
 for(let i=0;i<3;i++){const y=.07+i*.075,z=-1.07+i*.11;twig(porch,'broad-log-porch-step',[[-.41,y,z],[0,y+.008,z],[.41,y,z]],[.065,.064,.063],'#6b6247',i+21)}
 box(shop,.33,1.10,.055,.24,.31,.022,'#d2bd74');for(const x of [.22,.44])beam(shop,'shop-window-jamb',[x,.94,.035],[x,1.27,.035],.023,.035,'#7d7250');for(const y of [.96,1.10,1.25])beam(shop,'shop-window-crossbar',[.21,y,.029],[.45,y,.029],.02,.025,'#7d7250');beam(shop,'shop-window-mullion',[.33,.94,.029],[.33,1.27,.029],.016,.025,'#7d7250')
 const produce=tub(porch,'porch-left-produce-basket',-.62,.30,-.69,.23,.30,'#8b7c50');const rng=random(40);for(let i=0;i<7;i++)rock(produce,(rng()-.5)*.29,.32+rng()*.08,(rng()-.5)*.29,.075,.066,.073,i%2?'#9b9168':'#aaa178',i)
 const sack=group(porch,'berry-sack',.57,.30,-.58);const body=ell(sack,0,.17,0,.18,.19,.15,'#a19565','cloth');body.name='cloth-berry-sack';const rim=torus(sack,0,.31,0,.13,.020,'#b1a073');rim.rotation.x=Math.PI/2;for(let i=0;i<6;i++){const a=i*2.4;ell(sack,Math.sin(a)*.095,.32+Math.floor(i/4)*.05,Math.cos(a)*.08,.055,.053,.056,'#5b4b61')}
 const sticks=tub(porch,'bundle-holder',.34,.30,-.10,.15,.15,'#6f6745');for(let i=0;i<7;i++)twig(sticks,'upright-sale-twigs',[[(i-3)*.026,.10,0],[(i-3)*.04+.06,.68+i%3*.07,.025]],[.015,.010],WOOD[i%4],i)
 const crate=group(porch,'rear-goods-crate',-.10,.30,-.04);for(const x of [-.17,.17])for(const z of [-.13,.13])beam(crate,'crate-corner',[x,0,z],[x,.24,z],.029,.029,'#6b5c3d');for(let i=0;i<4;i++)beam(crate,'crate-front-slat',[-.18,.03+i*.06,-.14],[.18,.03+i*.06,-.14],.045,.024,WOOD[i%4],i)
 const sprig=group(porch,'porch-post-leaf-sprig',-.73,1.62,-.68);twig(sprig,'attached-porch-sprig',[[0,0,0],[.02,.29,0],[.08,.43,.01]],[.010,.007,.002],'#747846',4);leaf(sprig,.05,.30,.01,.12,-.5,'#75824d');motion(root,sprig,'sway',{axis:'z',amplitude:.035,speed:.85,phase:1.4})
}

function school(root){
 root.userData.silhouette='narrow-bell-schoolhouse-with-terracotta-roof-rooted-on-thick-horizontal-branch'
 const foundation=group(root,'living-branch-school-foundation')
 twig(foundation,'wide-grounded-supporting-branch',[[-1.00,.08,.12],[-.57,.31,.13],[.08,.47,.16],[.68,.36,.21],[1.05,.18,.24]],[.16,.26,.29,.23,.07],'#92794d',42)
 twig(foundation,'descending-root-support',[[-.17,.44,.17],[-.40,.22,.22],[-.60,.025,.30]],[.19,.14,.045],'#7f6846',43)
 for(let i=0;i<7;i++){const z=.10+(i-3)*.034;curve(foundation,[[-.91,.17,z],[-.50,.40,z+.04],[.10,.59,z+.06],[.63,.44,z+.08],[1,.23,z+.10]],.007,i%2?'#b3925d':'#6c593c','bark')}
 const house=group(root,'branch-top-schoolhouse',.09,.52,.10),w=.69,d=.66,front=-d/2
 const schoolFloor=box(house,0,.015,0,w,.045,d,'#79613f','bark');schoolFloor.name='school-complete-underfloor'
 panel(house,'cream-school-gable-with-arched-door',[[-w/2,0],[w/2,0],[w/2,.94],[0,1.26],[-w/2,.94]],.07,'#d2b87a',0,0,front,[archPath(-.10,0,.18,.52)],'stone')
 panel(house,'school-side-infill',[[0,0],[d,0],[d,.94],[0,.94]],.065,'#a08b5a',w/2,0,front,[],'bark').rotation.y=-Math.PI/2
 panel(house,'school-rear-infill',[[-w/2,0],[w/2,0],[w/2,.94],[0,1.24],[-w/2,.94]],.055,'#bda56f',0,0,d/2-.05,[],'stone')
 panel(house,'left-school-side-infill',[[0,0],[d,0],[d,.94],[0,.94]],.055,'#baa373',-w/2,0,d/2,[],'bark').rotation.y=Math.PI/2
 for(const s of [-1,1])twig(house,'crooked-school-corner-post',[[s*.33,0,front-.02],[s*.35,.58,front-.02],[s*.31,.96,front-.02],[0,1.27,front-.02]],[.035,.036,.030,.022],'#755938',s>0?1:2)
 frameArch(house,-.10,.015,front-.020,.21,.55,'#8a6c3f',.022);plankDoor(house,-.10,.02,front+.023,.17,.50,'#79607b');roundWindow(house,0,.99,front-.025,.095,'#9d9f75')
 for(const side of [-1,1]){
  for(const z of [-.13,.18]){
   const win=group(house,'arched-school-side-window',side*.349,.39,z);win.rotation.y=-side*Math.PI/2
   const s=new T.Shape(archPath(0,0,.13,.25).getPoints(24));detail(win,'blue-green-school-window',new T.ExtrudeGeometry(s,{depth:.012,bevelEnabled:false}), '#6f8071',0,0,0,'paint');frameArch(win,0,0,-.012,.15,.27,'#8f764d',.015);beam(win,'school-window-mullion',[0,.02,-.020],[0,.24,-.020],.008,.012,'#b69c67')
  }
  const x=side*.358
  for(const z of [-.30,.28])beam(house,'side-timber-stud',[x,.01,z],[x,.92,z],.035,.045,'#765e3b')
  beam(house,'lower-side-timber-rail',[x,.32,-.32],[x,.32,.33],.035,.043,'#765e3b');beam(house,'diagonal-side-half-timber',[x,.015,-.29],[x,.32,-.04],.032,.037,'#765e3b');beam(house,'diagonal-side-half-timber',[x,.32,.02],[x,.015,.29],.032,.037,'#765e3b');beam(house,'side-ground-sill',[x,.015,-.34],[x,.015,.34],.045,.05,'#6b5537')
 }
 gableRoof(house,0,.94,0,.92,.92,.36,{tiles:true,seed:42})
 const belfry=group(house,'small-square-bell-turret',0,1.19,.19);for(const x of [-.095,.095])for(const z of [-.085,.085])beam(belfry,'bell-turret-open-post',[x,0,z],[x,.31,z],.022,.022,'#8b693e')
 for(const z of [-.09,.09])beam(belfry,'bell-turret-lintel',[-.12,.30,z],[.12,.30,z],.029,.035,'#816039')
 const bell=group(belfry,'turret-bell-pivot',0,.25,0);cyl(bell,0,-.07,0,.065,.12,'#a18443',.032,16);ell(bell,0,-.13,0,.067,.015,.067,'#8a743a');rod(bell,[0,0,0],[0,-.16,0],.007,'#5e5138');motion(root,bell,'sway',{axis:'z',amplitude:.04,speed:1.5,phase:.7});plankedRoof(belfry,0,.32,0,.16,.15,.14,42)
 // Card's overhanging side bell is fixed to a visible curved roof bracket
 twig(house,'curved-side-bell-bracket',[[.29,1.27,.10],[.49,1.40,.10],[.62,1.40,.10]],[.021,.017,.012],'#7d6037',8)
 const outsideBell=group(house,'side-bell-pivot',.61,1.39,.10);rod(outsideBell,[0,0,0],[0,-.07,0],.007,'#5e5138');cyl(outsideBell,0,-.12,0,.052,.09,'#a98b45',.025,16);motion(root,outsideBell,'sway',{axis:'z',amplitude:.035,speed:1.5,phase:1})
 const steps=group(root,'long-branch-access-stair');const bottom=[-.95,.055,-.70],top=[-.16,.56,-.30];for(const dx of [-.14,.14])beam(steps,'branch-stair-stringer',[bottom[0]+dx,bottom[1],bottom[2]],[top[0]+dx,top[1],top[2]],.045,.045,'#775c39')
 for(let i=0;i<8;i++){const t=i/7,x=T.MathUtils.lerp(bottom[0],top[0],t),y=T.MathUtils.lerp(bottom[1],top[1],t),z=T.MathUtils.lerp(bottom[2],top[2],t);beam(steps,'individual-branch-stair-tread',[x-.17,y,z],[x+.17,y,z],.065,.04,WOOD[i%4],i)}
 beam(house,'empty-source-bird-perch',[.33,.27,.28],[.72,.27,.28],.035,.045,'#78613e')
}

function storehouse(root){
 root.userData.silhouette='hollow-tree-store-with-deep-arched-door-and-distinct-open-resource-bins'
 const trunk=group(root,'hollow-storage-tree')
 panel(trunk,'thick-hollow-bole-with-through-arched-entry',[[-.83,0],[.83,0],[.88,1.69],[.70,2.18],[.27,2.38],[-.42,2.35],[-.82,1.95]],.72,'#74614b',0,.03,.01,[archPath(.19,0,.77,1.84)],'bark')
 roundedRearRoom(trunk,'storehouse-rounded-rear-room',0,.65,.79,.49,.025,2.26,'#74614b')
 const storageFloor=box(trunk,.19,.045,.38,.78,.045,.75,'#796646','bark');storageFloor.name='storehouse-deep-entry-floor'
 frameArch(trunk,.19,.035,-.025,.83,1.91,'#a18d66',.065)
 for(const [x,z]of [[-.73,.16],[.75,.14],[-.64,.67],[.66,.67]])twig(trunk,'store-buttress-root',[[x*.80,.92,z],[x,.30,z-.07],[x*1.20,.025,z-.19]],[.16,.16,.03],'#79634a',Math.round(x*20+30))
 for(const x of [-.75,.73])twig(trunk,'vertical-tree-bark-rib',[[x,.11,.01],[x*1.03,.97,.02],[x*.92,1.79,.04],[x*.65,2.26,.10]],[.050,.041,.035,.018],'#907550',x>0?7:8)
 const door=group(trunk,'open-arched-storage-door',.60,.045,.035);door.rotation.y=-1.18
 const dp=archPath(-.37,0,.74,1.77),ds=new T.Shape(dp.getPoints(32));detail(door,'solid-plank-storage-door',new T.ExtrudeGeometry(ds,{depth:.040,bevelEnabled:false}), '#8d6b4d')
 for(let i=1;i<6;i++){const x=-.74+i*.74/6,h=1.77-.37+Math.sqrt(Math.max(0,.37**2-(x+.37)**2));beam(door,'storage-door-plank-seam',[x,.025,-.007],[x,h-.02,-.007],.007,.009,'#654e37')}
 for(const y of [.29,1.13])beam(door,'storage-door-cross-strap',[-.71,y,-.025],[-.03,y,-.025],.035,.026,'#67523b')
 // Hinged to a real jamb, with tiny permitted travel around its resting open angle
 motion(root,door,'sway',{axis:'y',amplitude:.012,speed:.7,phase:.5})
 // Horizontal shelves are built into the thick left jamb, baskets are not a painted wall pattern
 const shelves=group(root,'left-wall-berry-shelves',-.58,0,-.19)
 for(const y of [.89,1.31,1.73]){slab(shelves,'deep-wall-mounted-storage-shelf',[[-.34,y,-.23],[.31,y,-.23],[.31,y,.30],[-.34,y,.30]],'#8d7650',.045);for(const x of [-.25,.24])beam(shelves,'shelf-diagonal-bracket',[x,y-.22,.22],[x,y-.045,-.15],.027,.032,'#66533a')}
 for(let row=0;row<2;row++)for(let i=0;i<4;i++){const a=i*2.4,x=(i-1.5)*.13;ell(shelves,x,1.37+row*.42,.04+Math.cos(a)*.04,.084,.075,.077,'#67536d');ell(shelves,x+.016,1.42+row*.42,-.013,.019,.012,.013,'#352e37')}
 const timberBin=tub(root,'front-twig-bin',-.62,.03,-.65,.28,.38,'#9c8258');for(let i=0;i<10;i++){const x=(i-4.5)*.032,y=.39+(i%3)*.035,z=(i%2-.5)*.10;twig(timberBin,'stored-orange-cut-twig',[[x-.12,y,z-.05],[x+.13,y+.045,z+.01]],[.036,.030],'#af8455',i)}
 const stoneBin=tub(root,'front-stone-bin',.64,.03,-.57,.32,.42,'#775c3b'),rng=random(48);for(let i=0;i<12;i++){const x=(rng()-.5)*.42,z=(rng()-.5)*.37,y=.42+Math.floor(i/5)*.105;rock(stoneBin,x,y,z,.105+rng()*.03,.08+rng()*.025,.10+rng()*.02,i%2?'#96988a':'#b0b09d',i+40)}
 const resinBin=tub(root,'small-rear-resin-bin',-.27,.03,-.37,.17,.23,'#8b714c');for(let i=0;i<5;i++){const a=i*2.4;rock(resinBin,Math.sin(a)*.09,.25+Math.floor(i/3)*.06,Math.cos(a)*.07,.055,.05,.05,'#c29443',i+65)}
 deck(root,.18,.035,-.19,.65,.45,'doorway-threshold-plank')
}

export const TIMBER_BUILDERS={Theatre:theatre,'Twig Barge':twigBarge,University:university,Fairgrounds:fairgrounds,Farm:farm,Inn:inn,Mine:mine,'Post Office':postOffice,'General Store':generalStore,School:school,Storehouse:storehouse}
