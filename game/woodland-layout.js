// Visual layout only: never alters playable locations, city footprints or game state
export const WOODLAND_PATHS=[
 [[22,36],[27,36],[33,36],[39,36]],
 [[30.5,37],[30.5,40],[30.5,43.7]],
 [[10,25],[13,23],[19,22],[25,22],[30.5,23]],
 [[51,25],[48,23],[43,23],[37,23],[30.5,23]],
 [[30.5,23],[30,25],[30.5,28],[30.5,33],[30.5,36]],
 [[18,21],[19,17],[20,11],[26,8],[34,8],[40,11],[42,17],[43,21]]
]
export const forestNoise=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v)}
export function distanceToPath(x,z){let best=Infinity;for(const path of WOODLAND_PATHS)for(let i=1;i<path.length;i++){const[a,b]=[path[i-1],path[i]],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return best}
export function vegetationAllowed(state,x,z,radius=1.6){
 if(x<1||x>59||z<1||z>68)return false
 if(distanceToPath(x,z)<radius+1)return false
 if((state.locations??[]).some(p=>Math.hypot(p.x-x,p.z-z)<radius+2.6))return false
 if((state.livingClearings??[]).some(c=>c.bounds?x>c.bounds.minX-radius&&x<c.bounds.maxX+radius&&z>c.bounds.minZ-radius&&z<c.bounds.maxZ+radius:Math.hypot((c.x-x)/(c.scaleX??1),(c.z-z)/(c.scaleZ??1))<(c.radius??3)+radius))return false
 return !state.tiles.some(t=>t.type==='water'&&Math.abs(t.x-x)<radius&&Math.abs(t.z-z)<radius)
}
export function woodlandPlacements(state){
 const trees=[],shrubs=[]
 // Jittered candidates plus minimum spacing avoid both tile rows and dense rectangular blocks
 for(let z=2;z<68;z+=3.1)for(let x=2;x<59;x+=3.1){const seed=forestNoise(x,z),px=x+(forestNoise(z,x)-.5)*2.4,pz=z+(seed-.5)*2.4
  const density=.42+.17*Math.sin(px*.23+pz*.12)+.15*Math.cos(pz*.35-px*.15)
  if(seed>density||!vegetationAllowed(state,px,pz,1.5))continue
  if(trees.some(t=>Math.hypot(t.x-px,t.z-pz)<3.4))continue
  trees.push({x:px,z:pz,size:4.5+forestNoise(px+8,pz)*1.5,r:seed*Math.PI*2,kind:forestNoise(px,pz+7)>.65?'spruce':'oak'})
 }
 for(const t of trees){const a=t.r+1.4,x=t.x+Math.sin(a)*1.8,z=t.z+Math.cos(a)*1.8;if(vegetationAllowed(state,x,z,.7))shrubs.push({x,z,size:.55+forestNoise(x,z)*.4,r:a,kind:'shrub'})}
 return{trees:trees.slice(0,110),shrubs:shrubs.slice(0,80)}
}
