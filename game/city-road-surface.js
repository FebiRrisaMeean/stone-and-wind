// Static, terrain-following geometry: no textures, particles or per-frame work
const lerp=(a,b,t)=>a+(b-a)*t
const noise=(x,z)=>Math.sin(x*2.17+z*.71)*.5+Math.sin(z*4.13-x*1.31)*.25
const palette={WINTER:[[.53,.48,.39],[.72,.71,.64]],SPRING:[[.46,.36,.24],[.43,.46,.28]],SUMMER:[[.52,.42,.28],[.47,.49,.29]],AUTUMN:[[.49,.36,.23],[.56,.45,.28]]}
export function earthRoadSurface(segments,heightAt,season='SUMMER'){
 const positions=[],colors=[],[earth,edge]=palette[String(season).toUpperCase()]??palette.SUMMER
 const vertex=(x,z,band)=>{
  positions.push(x,heightAt(x,z)+.035,z)
  const grain=noise(x*3,z*3)*.028+noise(x*.8,z*.8)*.018,t=Math.abs(band)>.8?.75:Math.abs(band)>.55?.25:0
  colors.push(...earth.map((v,i)=>Math.max(0,Math.min(1,lerp(v,edge[i],t)+grain))))
 }
 const bands=[-1,-.73,0,.73,1]
 for(const {a,b}of segments){
  const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<1e-5)continue
  const nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length,steps=Math.max(2,Math.ceil(length/.65))
  const rows=[]
  for(let i=0;i<=steps;i++){
   const t=i/steps,x=lerp(a.x,b.x,t),z=lerp(a.z,b.z,t),width=.43+noise(x,z)*.045
   rows.push(bands.map(k=>({x:x+nx*width*k,z:z+nz*width*k,k})))
  }
  for(let i=0;i<steps;i++)for(let j=0;j<bands.length-1;j++){
   const points=[rows[i][j],rows[i][j+1],rows[i+1][j],rows[i+1][j+1]]
   for(const n of [0,1,2,2,1,3]){const p=points[n];vertex(p.x,p.z,p.k)}
  }
  // Rounded tips avoid the previous ruler-cut rectangular ends
  for(const [p,sign]of [[a,-1],[b,1]]){
   const width=.43+noise(p.x,p.z)*.045,angle=Math.atan2(b.z-a.z,b.x-a.x)+(sign===-1?Math.PI:0)
   for(let n=0;n<8;n++){
    const start=angle-Math.PI/2+n*Math.PI/8,end=start+Math.PI/8
    vertex(p.x,p.z,0);vertex(p.x+Math.cos(start)*width,p.z+Math.sin(start)*width,1);vertex(p.x+Math.cos(end)*width,p.z+Math.sin(end)*width,1)
   }
  }
 }
 return {positions,colors}
}


const stoneHash=(x,z,salt=0)=>{const v=Math.sin(x*127.1+z*311.7+salt*74.7)*43758.5453;return v-Math.floor(v)}
const stonePalettes={
 WINTER:[[.58,.61,.59],[.72,.75,.72],[.48,.53,.52],[.64,.65,.61]],
 SPRING:[[.48,.50,.42],[.61,.58,.48],[.40,.45,.41],[.55,.54,.47]],
 SUMMER:[[.51,.50,.43],[.65,.60,.49],[.43,.46,.42],[.57,.55,.47]],
 AUTUMN:[[.53,.49,.40],[.65,.57,.46],[.44,.45,.39],[.58,.52,.43]]
}
export function roadSurfaceStyle(search=globalThis.location?.search??''){
 return new URLSearchParams(search).get('roadStyle')==='earth'?'earth':'cobblestone'
}
// Each road is still a single static draw call; bevelled stones share its vertex-colour mesh
// Two staggered courses, open joints and muted variation keep the small city scale readable
export function cityRoadSurface(segments,heightAt,season='SUMMER',search=globalThis.location?.search??''){
 if(roadSurfaceStyle(search)==='earth')return earthRoadSurface(segments,heightAt,season)
 const surface=earthRoadSurface(segments,heightAt,season),{positions,colors}=surface
 const winter=String(season).toUpperCase()==='WINTER',tones=stonePalettes[String(season).toUpperCase()]??stonePalettes.SUMMER
 // Dark joints below the stones, without a second material or texture
 for(let i=0;i<colors.length;i++)colors[i]*=winter?.83:.76
 let stones=0
 const centres=[]
 const vertex=(p,color)=>{positions.push(p.x,heightAt(p.x,p.z)+p.h,p.z);colors.push(...color.map(v=>Math.max(0,Math.min(1,v))))}
 const triangle=(a,b,c,color)=>{
  if((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)>0)[b,c]=[c,b]
  vertex(a,color);vertex(b,color);vertex(c,color)
 }
 for(const {a,b}of segments){
  const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.16)continue
  const dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,nx=-dz,nz=dx,step=.61
  for(let row=0;row<2;row++)for(let t=.15+row*step*.5;t<length-.08;t+=step){
   if(stones>=2048)break
   const x=a.x+dx*t,z=a.z+dz*t,h=stoneHash(x,z,row),offset=(row?1:-1)*(.207+(h-.5)*.018)
   const cx=x+nx*offset,cz=z+nz*offset
   if(centres.some(p=>(p.x-cx)**2+(p.z-cz)**2<.21**2))continue
   centres.push({x:cx,z:cz});stones++
   const halfLength=Math.min(.265+(h-.5)*.024,t-.025,length-t-.025),halfWidth=.17+(stoneHash(x,z,3)-.5)*.018,bevel=Math.min(.035,halfLength*.3)
   const height=.075+stoneHash(x,z,4)*.025,angle=(stoneHash(x,z,5)-.5)*.10,co=Math.cos(angle),si=Math.sin(angle)
   const tone=tones[Math.floor(stoneHash(x,z,6)*tones.length)].map(v=>v+(h-.5)*.065)
   const ring=[[-1,-.66],[-.78,-1],[.78,-1],[1,-.66],[1,.66],[.78,1],[-.78,1],[-1,.66]]
   const point=(u,v,height)=>{const along=u*co-v*si,across=u*si+v*co;return{x:cx+dx*along+nx*across,z:cz+dz*along+nz*across,h:height}}
   const outer=ring.map(([u,v])=>point(u*halfLength,v*halfWidth,.042))
   const inner=ring.map(([u,v])=>point(u*(halfLength-bevel),v*(halfWidth-bevel),height))
   const centre={x:cx,z:cz,h:height+.013}
   for(let i=0;i<8;i++){
    const j=(i+1)%8,light=.94+stoneHash(cx,cz,i+10)*.10
    triangle(centre,inner[i],inner[j],tone.map(v=>v*light))
    const edgeTone=tone.map(v=>v*(.68+.08*Math.sin(i*.8)))
    triangle(inner[i],outer[i],outer[j],edgeTone);triangle(inner[i],outer[j],inner[j],edgeTone)
   }
  }
 }
 surface.style='cobblestone';surface.stoneCount=stones
 return surface
}
