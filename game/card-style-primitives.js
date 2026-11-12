import * as T from '../vendor/three.module.js'
export {T}
export const P={ink:'#302b23',wood:'#775039',bark:'#66533a',cut:'#b69158',moss:'#657645',leaf:'#829450',cream:'#decba2',fur:'#544434',paleFur:'#b6a47c',purple:'#69516c',gold:'#cc932d',amber:'#d5a03d',stone:'#858b80',green:'#385c49',blue:'#425979',rope:'#ba9b67'}
const mats=new Map(),textures=new Map()
export function random(seed){let n=seed>>>0;return()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296)}
function paintTexture(kind){
 if(textures.has(kind))return textures.get(kind)
 if(typeof document==='undefined')return null
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512
 const ctx=canvas.getContext('2d'),rng=random(kind.length*113+kind.charCodeAt(0));ctx.fillStyle='#e0e0e0';ctx.fillRect(0,0,512,512)
 const fibrous=['fur','feather','bark','cloth'].includes(kind)
 for(let i=0;i<6000;i++){
  const x=rng()*512,y=rng()*512,d=rng()*(fibrous?65:10)+2;ctx.strokeStyle=rng()>.53?'rgba(36,34,29,.13)':'rgba(255,255,255,.22)';ctx.lineWidth=.4+rng()*(kind==='bark'?3:1.3)
  ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+2,y+d*.5,x+(fibrous?rng()*4-2:d),y+(fibrous?d:d*.4));ctx.stroke()
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;textures.set(kind,tex);return tex
}
export function material(color,kind='paint',extra={}){
 const key=color+kind+JSON.stringify(extra);if(!mats.has(key)){const map=paintTexture(kind);mats.set(key,new T.MeshStandardMaterial({color,map,bumpMap:map,bumpScale:kind==='bark'?.035:kind==='stone'?.024:.008,roughness:kind==='cloth'?.98:.85,metalness:0,...extra}))}return mats.get(key)
}
export function mesh(g,geo,color,x=0,y=0,z=0,kind='paint',extra={}){const m=new T.Mesh(geo,material(color,kind,extra));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m}
export function ell(g,x,y,z,rx,ry,rz,c,kind='paint'){const m=mesh(g,new T.SphereGeometry(1,24,16),c,x,y,z,kind);m.scale.set(rx,ry,rz);return m}
export function box(g,x,y,z,w,h,d,c,kind='paint'){return mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z,kind)}
export function cyl(g,x,y,z,r,h,c,rt=r,segments=16,kind='paint'){return mesh(g,new T.CylinderGeometry(rt,r,h,segments),c,x,y,z,kind)}
export function rod(g,a,b,r,c,rt=r,kind='paint'){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),m=cyl(g,...aa.clone().add(bb).multiplyScalar(.5).toArray(),r,aa.distanceTo(bb),c,rt,10,kind);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bb.sub(aa).normalize());return m}
export function curve(g,pts,r,c,kind='paint'){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),24,r,7,false),c,0,0,0,kind)}
export function torus(g,x,y,z,r,t,c){return mesh(g,new T.TorusGeometry(r,t,7,32),c,x,y,z)}
export function group(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g}
export function motion(root,obj,type,values={}){root.userData.motions.push({obj,type,position:obj.position.clone(),rotation:obj.rotation.clone(),scale:obj.scale.clone(),...values});return obj}
export function eye(g,x,y,z,r=.045){ell(g,x,y,z,r,r*1.2,r*.75,P.ink);ell(g,x-r*.22,y+r*.32,z-r*.55,r*.22,r*.22,r*.19,'#f9efcc')}
export function leaf(g,x,y,z,size,angle=0,c=P.leaf){const m=ell(g,x,y,z,size*.4,size*.08,size,c);m.rotation.set(.28,angle,.25);return m}
export function furTufts(g,rng,count,{y=.8,rx=.42,ry=.5,rz=.28,c=P.fur}={}){
 for(let i=0;i<count;i++){const a=rng()*Math.PI*2,b=rng()*Math.PI;const x=Math.sin(a)*Math.sin(b)*rx,yy=y+Math.cos(b)*ry,z=Math.cos(a)*Math.sin(b)*rz;const tuft=ell(g,x,yy,z,.022,.07,.025,c);tuft.rotation.z=-x*.9}
}
export function scroll(g,x,y,z,w=.5,h=.67){const page=group(g,'rolled-plan',x,y,z);page.rotation.x=-.13;box(page,0,0,0,w,h,.015,'#dbc99c');for(const yy of [-h/2,h/2]){const r=cyl(page,0,yy,.015,.035,w+.05,'#ccb689');r.rotation.z=Math.PI/2}for(let i=0;i<4;i++)rod(page,[-w*.32,-h*.30+i*.12,-.011],[w*.25,-h*.30+i*.12,-.011],.0035,'#9c9776');rod(page,[-w*.25,-h*.32,-.014],[-w*.25,h*.28,-.014],.004,'#989574');return page}
export function bark(g,x,y,z,r,h,seed=4){const trunk=cyl(g,x,y+h/2,z,r,h,P.bark,r*.82,15,'bark'),rng=random(seed);for(let i=0;i<16;i++){const a=i*Math.PI/8;curve(g,[[x+Math.sin(a)*r,y,z+Math.cos(a)*r],[x+Math.sin(a+.06)*r*.94,y+h*.45,z+Math.cos(a+.06)*r*.94],[x+Math.sin(a+.02)*r*.83,y+h,z+Math.cos(a+.02)*r*.83]],.012+rng()*.014,i%3?'#594530':'#94804d','bark')}return trunk}
export function mergeStaticScenery(root){
 root.updateMatrixWorld(true);const batches=new Map(),result=new T.Group();result.name=root.name
 root.traverse(m=>{if(!m.isMesh)return;const geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrixWorld);const batch=batches.get(m.material)??[];batch.push(geo);batches.set(m.material,batch)})
 for(const [mat,geometries]of batches){const merged=new T.BufferGeometry();for(const key of ['position','normal','uv']){const count=geometries.reduce((n,g)=>n+g.getAttribute(key).array.length,0),data=new Float32Array(count);let offset=0;for(const geo of geometries){const values=geo.getAttribute(key).array;data.set(values,offset);offset+=values.length}merged.setAttribute(key,new T.BufferAttribute(data,key==='uv'?2:3))}const m=new T.Mesh(merged,mat);m.castShadow=m.receiveShadow=true;result.add(m);geometries.forEach(g=>g.dispose())}
 root.traverse(m=>m.geometry?.dispose());return result
}
