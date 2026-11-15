// Static, terrain-following geometry: no textures, particles or per-frame work
const lerp=(a,b,t)=>a+(b-a)*t
const noise=(x,z)=>Math.sin(x*2.17+z*.71)*.5+Math.sin(z*4.13-x*1.31)*.25
const palette={WINTER:[[.53,.48,.39],[.72,.71,.64]],SPRING:[[.46,.36,.24],[.43,.46,.28]],SUMMER:[[.52,.42,.28],[.47,.49,.29]],AUTUMN:[[.49,.36,.23],[.56,.45,.28]]}
export function cityRoadSurface(segments,heightAt,season='SUMMER'){
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
