import {T,random,material,mesh,ell,box,cyl,rod,curve,torus,group,motion,mergeStaticScenery} from './card-style-primitives.js'

// Fur is rooted on each sculpted surface, tapered along its growth direction
// Small grouped ribbons carry the silhouette; they are not detached rods
function coat(parent,{x=0,y=0,z=0,rx,ry,rz,color,length=.035,count=900,seed=1,flow=-1,mask=()=>true}){
 const base=ell(parent,x,y,z,rx,ry,rz,color,'fur');base.name='continuous-fur-surface'
 const rng=random(seed),positions=[],colors=[],c=new T.Color(color),uv=[]
 for(let i=0;i<count*2.2;i++){
  const v=1-2*rng(),a=rng()*Math.PI*2,s=Math.sqrt(1-v*v),n=new T.Vector3(Math.cos(a)*s,v,Math.sin(a)*s)
  if(!mask(n))continue
  const p=new T.Vector3(x+n.x*rx,y+n.y*ry,z+n.z*rz),normal=new T.Vector3(n.x/rx,n.y/ry,n.z/rz).normalize()
  const axis=new T.Vector3(normal.z,0,-normal.x).normalize();if(axis.length()<.1)axis.set(1,0,0)
  const l=length*(.6+rng()*.85),width=l*(.04+rng()*.06)
  const root=p.clone().addScaledVector(normal,-.0015),mid=p.clone().addScaledVector(normal,l*.30).add(new T.Vector3(n.x*.003,flow*l*.24,.002)),tip=p.clone().addScaledVector(normal,l*.50).add(new T.Vector3(n.x*.01,flow*l*.82,.004))
  const left=root.clone().addScaledVector(axis,width),right=root.clone().addScaledVector(axis,-width),ml=mid.clone().addScaledVector(axis,width*.55),mr=mid.clone().addScaledVector(axis,-width*.55)
  const shade=c.clone().multiplyScalar(.88+rng()*.24)
  for(const [j,pnt]of [left,right,ml,right,mr,ml,ml,mr,tip].entries()){positions.push(...pnt.toArray());colors.push(shade.r,shade.g,shade.b);uv.push(j%2,j/9)}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals()
 const hair=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1}));hair.castShadow=hair.receiveShadow=true;parent.add(hair);return base
}
function paw(g,pos,size,color,seed=1){const [x,y,z]=pos;coat(g,{x,y,z,rx:size*.9,ry:size*.70,rz:size,color,length:.023,count:180,seed});for(let i=0;i<3;i++){const xx=x+(i-1)*size*.40;ell(g,xx,y-.014,z-size*.7,size*.22,size*.26,size*.38,color,'fur');rod(g,[xx,y-.016,z-size*.93],[xx,y-.028,z-size*1.1],.006,'#8b8069',.001)}}
function naturalEye(g,x,y,z,r,color='#211b13'){
 ell(g,x,y,z,r*1.15,r*.83,r*.68,'#3c3020');ell(g,x,y+.002,z-.009,r*.78,r*.68,r*.65,color,'skin');ell(g,x-r*.20,y+r*.20,z-r*.59,r*.13,r*.13,r*.08,'#b6b4a3')
 curve(g,[[x-r,y+.005,z-.004],[x,y+r*.70,z-.006],[x+r,y+.005,z-.004]],r*.13,'#77674e')
}
function ankle(root,parent,x,color,seed){
 const leg=group(parent,'connected-haunch-and-foot',x,.30,.06);motion(root,leg,'leg',{phase:x<0?0:Math.PI,amplitude:.13})
 coat(leg,{x:0,y:0,z:0,rx:.16,ry:.23,rz:.20,color,length:.035,count:320,seed})
 coat(leg,{x:0,y:-.15,z:-.12,rx:.115,ry:.14,rz:.13,color,length:.025,count:150,seed:seed+1})
 const foot=ell(leg,0,-.24,-.19,.13,.065,.22,color,'fur');foot.name='foot-joined-to-ankle'
 for(let k=0;k<4;k++){const xx=(k-1.5)*.045;ell(leg,xx,-.245,-.34,.025,.034,.055,color,'fur');rod(leg,[xx,-.245,-.37],[xx,-.25,-.405],.008,'#746b53',.002)}
}
function parchment(g,x,y,z){
 const page=group(g,'plan-gripped-at-right-edge',x,y,z);page.rotation.z=.13;const pos=[],uv=[],idx=[],w=.48,h=.68,nx=12,ny=18
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny;pos.push((u-.5)*w,(v-.5)*h,.035*Math.sin(u*Math.PI)+.023*Math.sin(v*Math.PI*2));uv.push(u,v)}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*(nx+1)+i;idx.push(k,k+1,k+nx+1,k+1,k+nx+2,k+nx+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();mesh(page,geo,'#d5c59f',0,0,0,'paper',{side:T.DoubleSide})
 for(const y of [-h/2,h/2]){const r=cyl(page,0,y,.012,.017,w+.014,'#c3b28c',.017,14,'paper');r.rotation.z=Math.PI/2}
 const ink='#8d8a71';const line=(a,b)=>rod(page,a,b,.0018,ink)
 for(let i=0;i<4;i++){const yy=-.22+i*.10;line([-.17,yy,-.012],[.17,yy,-.012])}
 line([-.12,-.22,-.014],[-.12,.19,-.014]);line([.11,-.22,-.014],[.11,.19,-.014]);line([-.17,.19,-.014],[0,.29,-.014]);line([0,.29,-.014],[.17,.19,-.014]);line([-.02,-.20,-.014],[-.02,.04,-.014]);line([.05,-.20,-.014],[.05,.04,-.014]);return page
}
export function architect(root){
 root.userData.species='beaver';const pelvis=group(root,'grounded-pelvis');ankle(root,pelvis,-.19,'#302e24',91);ankle(root,pelvis,.19,'#302e24',94)
 coat(pelvis,{x:0,y:.43,z:.07,rx:.37,ry:.34,rz:.34,color:'#2d3029',length:.055,count:1700,seed:12})
 const tail=group(pelvis,'tail-attached-to-sacrum',.27,.24,.28);tail.rotation.z=-.26;tail.rotation.x=-.16
 ell(tail,0,.26,.07,.17,.40,.055,'#403c2d','skin');ell(tail,-.03,.04,-.04,.13,.15,.14,'#33342b','fur')
 for(let i=0;i<14;i++){const y=-.04+i*.042,span=.17*Math.sqrt(Math.max(0,1-((y-.26)/.40)**2));curve(tail,[[-span,y,.016],[0,y+.02,.006],[span,y,.016]],.0025,'#635c42')}
 for(let i=-3;i<=3;i++)curve(tail,[[i*.038,-.02,.02],[i*.045,.27,.005],[i*.030,.59,.02]],.002,'#655d43')
 const torso=group(root,'anatomical-torso');motion(root,torso,'breath')
 coat(torso,{x:0,y:.76,z:.04,rx:.32,ry:.36,rz:.27,color:'#31352b',length:.04,count:850,seed:14})
 // Tailored vest fitted to the torso, with open armholes and a shaped hem
 const vest=ell(torso,0,.80,.035,.337,.286,.278,'#65505e','cloth');vest.scale.y*=.94
 curve(torso,[[-.32,.66,-.10],[-.15,.59,-.225],[.12,.60,-.239],[.29,.68,-.12]],.012,'#3b3440','cloth')
 for(const s of [-1,1]){const l=box(torso,s*.12,.92,-.222,.11,.24,.027,'#79616d','cloth');l.rotation.z=s*.32}
 for(let i=0;i<3;i++){ell(torso,.035,.69+i*.055,-.246,.013,.013,.006,'#9f9273')}
 coat(torso,{x:0,y:1.04,z:.015,rx:.23,ry:.21,rz:.23,color:'#383c2f',length:.06,count:700,seed:18})
 const head=group(torso,'beaver-head');head.rotation.x=-.035
 coat(head,{x:0,y:1.24,z:-.025,rx:.271,ry:.24,rz:.255,color:'#ad9c77',length:.035,count:1400,seed:21})
 for(const s of [-1,1]){coat(head,{x:s*.195,y:1.145,z:-.16,rx:.13,ry:.165,rz:.15,color:'#b2a17c',length:.045,count:450,seed:s+30});ell(head,s*.225,1.40,.015,.065,.066,.044,'#786c50','fur');ell(head,s*.225,1.40,-.019,.037,.039,.018,'#a39572');naturalEye(head,s*.145,1.32,-.244,.027)}
 coat(head,{x:0,y:1.105,z:-.212,rx:.155,ry:.13,rz:.125,color:'#a08e68',length:.025,count:300,seed:24})
 for(const s of [-1,1])coat(head,{x:s*.066,y:1.20,z:-.265,rx:.10,ry:.073,rz:.074,color:'#9f9777',length:.020,count:180,seed:s+40})
 ell(head,0,1.25,-.319,.063,.045,.038,'#333b2d','skin');curve(head,[[-.056,1.15,-.306],[0,1.138,-.32],[.055,1.15,-.306]],.004,'#454634')
 for(const s of [-1,1]){const tooth=box(head,s*.018,1.107,-.304,.029,.042,.018,'#c7bba0');tooth.rotation.x=.12}
 coat(head,{x:0,y:1.02,z:-.15,rx:.19,ry:.10,rz:.16,color:'#545945',length:.075,count:650,seed:27})
 // Each whisker starts inside the corresponding muzzle pad
 for(const s of [-1,1])for(let i=0;i<3;i++)curve(head,[[s*.095,1.20-i*.016,-.29],[s*.18,1.20-i*.02,-.32],[s*(.27+i*.017),1.21-i*.026,-.32]],.0016,'#ada88b')
 const cap=ell(head,-.025,1.47,.023,.27,.055,.23,'#584052','cloth');cap.rotation.z=-.15;const brim=[];for(let i=0;i<=40;i++){const a=i*Math.PI/20;brim.push([-.025+Math.sin(a)*.245,1.447-Math.sin(a)*.037,.023+Math.cos(a)*.207])}curve(head,brim,.009,'#bdab76');ell(head,-.045,1.525,.018,.025,.020,.020,'#655066')
 // Rolls sit inside a leather document case, attached with a visible shoulder strap
 const caseG=group(torso,'leather-plan-case',-.27,.83,.23);caseG.rotation.z=.32;const tube=cyl(caseG,0,0,0,.10,.48,'#665238',.115,18,'leather');tube.name='roll-container'
 torus(caseG,0,.24,0,.107,.012,'#927851').rotation.x=Math.PI/2
 for(let i=0;i<3;i++){const x=(i-1)*.057;const roll=cyl(caseG,x,.35,0,.025,.47,'#c7b693',.025,16,'paper');const rim=torus(caseG,x,.586,0,.020,.003,'#857659');rim.rotation.x=Math.PI/2}
 curve(torso,[[-.28,.67,.28],[-.30,1.01,.14],[-.20,1.07,-.12],[.19,.64,-.22]],.015,'#706045','leather')
 // Right shoulder → elbow → forearm → fingers actually enclosing the page edge
 coat(torso,{x:-.28,y:.88,z:-.03,rx:.14,ry:.18,rz:.15,color:'#353c2d',count:400,length:.04,seed:49})
 coat(torso,{x:-.33,y:.74,z:-.16,rx:.10,ry:.16,rz:.13,color:'#353c2d',count:400,length:.04,seed:50})
 const page=parchment(torso,-.31,.79,-.40);paw(torso,[-.485,.79,-.37],.075,'#3c4231',51)
 for(let i=0;i<3;i++)curve(torso,[[-.48,.83-i*.025,-.36],[-.50,.83-i*.025,-.43],[-.465,.82-i*.025,-.446]],.013,'#555b42')
 // Left arm bends across chest, pencil held by fingers, nib meets the drawing
 coat(torso,{x:.27,y:.85,z:-.05,rx:.13,ry:.19,rz:.14,color:'#343a2d',count:400,length:.04,seed:52})
 const forearm=group(torso,'writing-forearm',.24,.74,-.18);motion(root,forearm,'write',{amplitude:.018})
 coat(forearm,{x:-.07,y:.02,z:-.07,rx:.17,ry:.095,rz:.11,color:'#333c2d',count:400,length:.04,seed:54});paw(forearm,[-.16,.04,-.13],.065,'#4b5139',55)
 rod(forearm,[-.10,.065,-.17],[-.33,.08,-.22],.010,'#a88c5b',.007);rod(forearm,[-.33,.08,-.22],[-.37,.083,-.23],.008,'#332e22',.001)
 root.userData.contactNotes=['feet connected through haunches','page enclosed by right fingers','scrolls inside strap-mounted case','whiskers originate in muzzle']
}
function feather(g,a,b,width,color){
 const p=new T.Vector3(...a),q=new T.Vector3(...b),axis=q.clone().sub(p),side=new T.Vector3(axis.y,-axis.x,.02).normalize().multiplyScalar(width),mid=p.clone().lerp(q,.55);mid.z-=.02
 const pos=[p.clone().addScaledVector(side,.22),p.clone().sub(side.clone().multiplyScalar(.22)),mid.clone().sub(side),q,mid.clone().add(side)];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos.flatMap(x=>x.toArray()),3));geo.setAttribute('uv',new T.Float32BufferAttribute([.5,0,.4,0,0,.5,.5,1,1,.5],2));geo.setIndex([0,1,2,0,2,4,4,2,3]);geo.computeVertexNormals();const m=mesh(g,geo,color,0,0,0,'feather',{side:T.DoubleSide});rod(g,a,b,.0019,'#c2aa6c',.0007);return m
}
export function bard(root){
 root.userData.species='songbird';const torso=group(root,'songbird-torso');motion(root,torso,'breath')
 coat(torso,{x:0,y:.65,z:.045,rx:.255,ry:.32,rz:.23,color:'#b4954f',length:.013,count:2000,seed:201})
 coat(torso,{x:0,y:.56,z:-.13,rx:.21,ry:.22,rz:.105,color:'#b8b69a',length:.018,count:950,seed:202})
 coat(torso,{x:0,y:.99,z:-.02,rx:.165,ry:.183,rz:.17,color:'#ca9d3d',length:.010,count:900,seed:203})
 coat(torso,{x:0,y:.88,z:-.145,rx:.128,ry:.125,rz:.035,color:'#d4cba3',length:.015,count:500,seed:204})
 for(const s of [-1,1]){ell(torso,s*.127,1.03,-.118,.030,.031,.018,'#343427','feather');naturalEye(torso,s*.131,1.033,-.135,.015)
 const leg=group(root,'connected-bird-leg',s*.10,.43,.025);motion(root,leg,'leg',{phase:s<0?0:Math.PI,amplitude:.19});rod(leg,[0,0,0],[s*.017,-.13,.015],.027,'#8a815c',.019);rod(leg,[s*.017,-.13,.015],[s*.012,-.34,-.06],.016,'#635f45',.012);ell(leg,s*.012,-.34,-.06,.026,.022,.035,'#726c4e');for(let j=-1;j<=1;j++)curve(leg,[[s*.012,-.34,-.06],[j*.04,-.38,-.13],[j*.06,-.39,-.19]],.009,'#777355');curve(leg,[[0,-.35,-.045],[.025,-.38,.04],[.035,-.39,.075]],.008,'#777355')}
 // Open short wedge bill rather than a cone beak
 const bill=new T.BufferGeometry();bill.setAttribute('position',new T.Float32BufferAttribute([-.037,1.02,-.16,.037,1.02,-.16,0,1.04,-.272,0,1.06,-.177,-.032,.996,-.16,.032,.996,-.16,0,.989,-.24,0,.98,-.17],3));bill.setIndex([0,3,2,3,1,2,0,2,1,4,6,7,7,6,5,4,5,6]);bill.computeVertexNormals();mesh(torso,bill,'#504735')
 const tail=group(torso,'tail-root',0,.40,.20);for(let i=0;i<7;i++)feather(tail,[(i-3)*.026,.04,0],[(i-3)*.048,-.19,.52],.037,i%2?'#393e30':'#84743c')
 const farWing=group(torso,'folded-wing',-.20,.78,.06);ell(farWing,0,-.10,0,.08,.20,.10,'#706237','feather');for(let i=0;i<9;i++)feather(farWing,[.012+i*.008,-.02-i*.014,-.07],[-.04+i*.014,-.35-i*.008,.13],.032,i<4?'#b58d39':'#484d34')
 const lute=group(torso,'lute-held-against-breast',-.02,.64,-.22);lute.rotation.z=.60
 ell(lute,0,-.025,0,.18,.205,.074,'#77502e','wood');ell(lute,0,-.025,-.067,.165,.19,.015,'#b9914e','wood');ell(lute,0,.028,-.084,.044,.047,.009,'#302c20');torus(lute,0,.028,-.091,.050,.003,'#cfaf70');box(lute,0,.27,-.005,.045,.39,.035,'#725a36','wood');box(lute,0,.46,-.009,.065,.08,.035,'#9b7540');box(lute,0,-.13,-.088,.105,.014,.018,'#554029');for(let i=0;i<4;i++)rod(lute,[(i-1.5)*.009,-.13,-.10],[(i-1.5)*.009,.48,-.03],.0014,'#c3ba98');for(let i=0;i<3;i++)rod(lute,[-.046,.43+i*.024,-.004],[.046,.43+i*.024,-.004],.006,'#84704b')
 curve(torso,[[.19,.91,.07],[.21,.88,-.17],[.08,.54,-.26],[-.16,.48,-.19]],.010,'#66543c','leather')
 const wing=group(torso,'playing-wing-shoulder',.22,.80,-.005);motion(root,wing,'strum',{amplitude:.055})
 ell(wing,-.025,-.06,-.055,.10,.15,.10,'#c59c45','feather');const upper=ell(wing,-.11,-.08,-.22,.17,.10,.045,'#bd963f','feather');upper.rotation.y=-.35;for(let i=0;i<11;i++)feather(wing,[-.03,-.02-i*.009,-.18],[-.22-i*.008,-.10-i*.010,-.33],.027,i%3?'#b18b3c':'#c7a052')
 const grip=group(torso,'wing-grip-on-lute-neck',-.21,.89,-.24);for(let i=0;i<4;i++)feather(grip,[0,.04,0],[.03+i*.012,-.04,-.07],.016,'#a68b45')
}
export function doctor(root){
 root.userData.species='porcupine';ankle(root,root,-.17,'#665548',301);ankle(root,root,.17,'#665548',304)
 const torso=group(root,'porcupine-torso');motion(root,torso,'breath');coat(torso,{x:0,y:.52,z:.08,rx:.32,ry:.38,rz:.29,color:'#776354',length:.04,count:1600,seed:309})
 coat(torso,{x:0,y:.96,z:.03,rx:.255,ry:.28,rz:.23,color:'#8e7567',length:.045,count:1400,seed:310})
 const rng=random(311),quills=group(torso,'quills-rooted-in-back-and-crown')
 for(let i=0;i<260;i++){const a=(rng()-.5)*Math.PI*1.85,b=rng(),x=Math.sin(a)*(.20+b*.032),y=.62+b*.61,z=.05+Math.cos(a)*.18;if(z<-.09&&y<1.08)continue;const base=[x,y,z],end=[x*(1.35+rng()*.22),y+.08+rng()*.22,z+.13+rng()*.12];rod(quills,base,end,.007+rng()*.005,i%4?'#65584f':'#b3a396',.0004,'fur')}
 const merged=mergeStaticScenery(quills);torso.remove(quills);torso.add(merged)
 coat(torso,{x:0,y:.89,z:-.18,rx:.16,ry:.14,rz:.17,color:'#a88a7b',length:.025,count:500,seed:312});ell(torso,0,.94,-.333,.075,.055,.048,'#806052','skin')
 for(const s of [-1,1]){ell(torso,s*.118,1.075,-.166,.048,.052,.015,'#b09b83');naturalEye(torso,s*.118,1.077,-.183,.023,'#322c26');torus(torso,s*.118,1.077,-.211,.044,.004,'#a59c83');coat(torso,{x:s*.20,y:1.15,z:.02,rx:.053,ry:.065,rz:.04,color:'#ad9786',length:.02,count:90,seed:s+315})}
 rod(torso,[-.072,1.077,-.211],[.072,1.077,-.211],.004,'#a59c83');coat(torso,{x:0,y:.79,z:-.19,rx:.125,ry:.075,rz:.09,color:'#c2b8a1',length:.045,count:270,seed:320});curve(torso,[[-.05,.85,-.30],[0,.83,-.31],[.06,.85,-.30]],.004,'#635246')
 const scarf=ell(torso,0,.74,.01,.29,.095,.245,'#385747','cloth');for(let i=0;i<3;i++)curve(torso,[[-.25,.76-i*.025,-.12],[0,.72-i*.025,-.24],[.24,.78-i*.025,-.14]],.008,'#6a7a5e','cloth');const end=box(torso,-.19,.61,-.23,.11,.27,.026,'#425e4c','cloth');end.rotation.z=-.23
 // Both forearms overlap shoulders; the raised palm cups the berry
 coat(torso,{x:.26,y:.69,z:-.04,rx:.14,ry:.21,rz:.14,color:'#806b5c',length:.04,count:400,seed:321})
 const arm=group(torso,'raised-berry-forearm',.31,.63,-.17);motion(root,arm,'inspect',{amplitude:.03});coat(arm,{x:.03,y:.10,z:-.07,rx:.095,ry:.17,rz:.10,color:'#8c7463',length:.025,count:300,seed:322});paw(arm,[.02,.20,-.11],.075,'#9d8370',323)
 const berry=ell(arm,.015,.32,-.11,.115,.12,.113,'#354d68','skin');for(let i=0;i<6;i++){const a=i*Math.PI/3;const l=ell(arm,.015+Math.sin(a)*.026,.427,-.11+Math.cos(a)*.026,.013,.007,.028,'#23354c');l.rotation.y=a}ell(arm,.015,.429,-.11,.017,.009,.017,'#142c43')
 coat(torso,{x:-.27,y:.67,z:-.02,rx:.13,ry:.21,rz:.14,color:'#826b5d',length:.035,count:400,seed:324});coat(torso,{x:-.28,y:.56,z:-.17,rx:.10,ry:.10,rz:.14,color:'#947b68',length:.03,count:200,seed:325});paw(torso,[-.28,.57,-.26],.070,'#aa8d76',326)
 const pen=group(torso,'quill-gripped-in-paw',-.28,.58,-.28);rod(pen,[.015,-.11,-.01],[-.13,.45,.045],.006,'#b1a486',.002);for(let i=0;i<25;i++){const t=i/25,y=.13+t*.32,x=-.04-t*.092,w=.045*Math.sin(Math.PI*t);for(const s of [-1,1])rod(pen,[x,y,.03],[x+s*w,y+.032,.03],.003,'#c4bda7',.0006)}
}
