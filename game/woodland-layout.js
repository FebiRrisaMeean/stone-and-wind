import {navigationFootprint} from './city-footprints.js?v=pages42-tree-controls'
import {buildCityRoads} from './city-roads.js?v=pages42-tree-controls'
// Visual layout only: never alters playable locations, city footprints or game state
export const WOODLAND_PATHS=[
 [[16,27],[21,26.5],[26,26],[31,26.6],[36,26.5],[43,27.5]],
 [[30.5,29],[30,33],[31,37],[30.5,40],[30.5,43.7]],
 [[18,17],[23,16.5],[29.5,16],[36,16.8],[43,17.5]],
 [[17,17],[17,21],[18,26],[20,31]],
 [[44,17.5],[44,22],[44,27.5],[42,32]],
 [[29.5,16],[30,12],[30,8]]
]
// Static spokes follow edited production coordinates without changing gameplay paths
export function productionRoadSegments(state){
 const tree=state.livingTree??{x:30,z:20};
 return (state.locations??[]).flatMap(p=>{
  const target={x:p.x+.12,z:p.z-.55},dx=target.x-tree.x,dz=target.z-tree.z,length=Math.hypot(dx,dz);
  if(length<2.5)return [];
  return [{a:{x:tree.x+dx/length*1.1,z:tree.z+dz/length*1.1},b:{x:target.x-dx/length*.75,z:target.z-dz/length*.75}}];
 });
}
export const forestNoise=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v)}
export function distanceToPath(x,z){let best=Infinity;for(const path of WOODLAND_PATHS)for(let i=1;i<path.length;i++){const[a,b]=[path[i-1],path[i]],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t))}return best}
export function vegetationAllowed(state,x,z,radius=1.6){
 if(x<1||x>59||z<1||z>68)return false
 if(state.livingBoard)return denseVegetationAllowed(state,x,z,radius)
 if(distanceToPath(x,z)<radius+1)return false
 if((state.locations??[]).some(p=>Math.hypot(p.x-x,p.z-z)<radius+2.6))return false
 if((state.livingClearings??[]).some(c=>c.bounds?x>c.bounds.minX-radius&&x<c.bounds.maxX+radius&&z>c.bounds.minZ-radius&&z<c.bounds.maxZ+radius:Math.hypot((c.x-x)/(c.scaleX??1),(c.z-z)/(c.scaleZ??1))<(c.radius??3)+radius))return false
 return !state.tiles.some(t=>t.type==='water'&&Math.abs(t.x-x)<radius&&Math.abs(t.z-z)<radius)
}
// Grove centres create an irregular layered edge, rather than a uniformly dotted field
const GROVES=[{x:6,z:8,r:8},{x:17,z:3,r:9},{x:41,z:3,r:10},{x:55,z:12,r:9},{x:6,z:30,r:8},{x:55,z:34,r:9},{x:3,z:51,r:7},{x:58,z:59,r:8}]
export function woodlandPlacements(state){
 if(state.livingBoard&&new URLSearchParams(globalThis.location?.search??'').get('forestDensity')!=='classic')return denseWoodlandPlacements(state)
 if(state.livingBoard)state={...state,livingBoard:false}
 const trees=[],shrubs=[],candidates=[]
 for(let z=2;z<68;z+=3.1)for(let x=2;x<59;x+=3.1){
  const seed=forestNoise(x,z),px=x+(forestNoise(z,x)-.5)*2.4,pz=z+(seed-.5)*2.4
  const grove=Math.max(...GROVES.map(g=>Math.max(0,1-Math.hypot(px-g.x,pz-g.z)/g.r)))
  const density=.15+grove*.76
  if(seed>density||!vegetationAllowed(state,px,pz,1.5))continue
  candidates.push({x:px,z:pz,seed,grove})
 }
 // Prioritise stronger groves within the existing instance budget; no new draw calls
 candidates.sort((a,b)=>b.grove-a.grove||a.z-b.z||a.x-b.x)
 for(const t of candidates){
  if(trees.length>=100)break
  if(trees.some(p=>Math.hypot(p.x-t.x,p.z-t.z)<3.4))continue
  const rear= Math.max(0,1-t.z/23),foreground=t.z>42
  trees.push({x:t.x,z:t.z,size:(foreground?3.4:4.2)+forestNoise(t.x+8,t.z)*1.25+rear*2.2,r:t.seed*Math.PI*2,kind:forestNoise(t.x,t.z+7)>(rear>.3?.42:.73)?'spruce':'oak'})
 }
 for(const t of trees){
  const a=t.r+1.4,x=t.x+Math.sin(a)*1.8,z=t.z+Math.cos(a)*1.8
  if(shrubs.length<64&&vegetationAllowed(state,x,z,.7))shrubs.push({x,z,size:.55+forestNoise(x,z)*.4,r:a,kind:'shrub'})
 }
 return{trees,shrubs}
}

// Relief stays outside the city and production rectangles, so old placements remain level
// WorldView.heightAt adds this term after its water check
export function woodlandRelief(x,z){
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
 const edge=Math.max(smooth((7-x)/6),smooth((x-54)/6),smooth((6-z)/6))
 // Broader asymmetric shoulders frame the valley without lifting playable ground
 const ridge=1.0+1.2*Math.exp(-(((z-15)/12)**2))+.65*Math.exp(-(((z-45)/16)**2))
 const rear=1.1*Math.exp(-(((x-14)/10)**2))+1.4*Math.exp(-(((x-46)/12)**2))
 return edge*(.45+ridge*.65+.25*Math.sin(x*.19+z*.11)**2)+smooth((6-z)/6)*rear
}

const pointSegmentDistance=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t)}
export function forestLayoutKey(state){return JSON.stringify([state.livingTree,(state.locations??[]).map(p=>[p.id,p.x,p.z]),(state.livingObjects??[]).filter(p=>p.type==='city-card'&&!p.critter).map(p=>[p.id,p.cardName,p.x,p.z,p.rotation,p.modelScale])])}
function denseVegetationAllowed(state,x,z,radius){
 if(!state.livingBoard&&distanceToPath(x,z)<radius+.25)return false
 const tree=state.livingTree??{x:30,z:8};if(Math.hypot(x-tree.x,z-tree.z)<4.2+radius)return false
 // Crown clearance includes the foreground sightline to each playable miniature
 if((state.locations??[]).some(p=>Math.abs(x-p.x)<radius+1.5&&z>p.z-2-radius&&z<p.z+2.8+radius))return false
 const homes=(state.livingObjects??[]).filter(p=>p.type==='city-card'&&!p.critter)
 for(const p of homes){const b=navigationFootprint(p.cardName,p.x,p.z,(p.modelScale??1.1)/1.1,p.rotation??0);if(b&&x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius+1.4)return false}
 if((state._vegetationRoads??[]).some(p=>pointSegmentDistance(x,z,p.a,p.b)<radius+.7))return false
 if((state.livingObjects??[]).some(p=>p.type==='camp'&&Math.hypot(p.x-x,p.z-z)<radius+2))return false
 return !(state.tiles??[]).some(t=>t.type==='water'&&Math.abs(t.x-x)<radius&&Math.abs(t.z-z)<radius)
}
function denseWoodlandPlacements(state){
 const roads=[...buildCityRoads((state.livingObjects??[]).filter(p=>p.type==='city-card'&&!p.critter)).segments,...productionRoadSegments(state)],context={...state,_vegetationRoads:roads},base=[]
 for(let z=2;z<68;z+=3.4)for(let x=2;x<59;x+=3.4){const seed=forestNoise(x,z);if(seed>.94)continue;base.push({x:x+(forestNoise(z,x)-.5)*1.3,z:z+(seed-.5)*1.3,seed})}
 // Select a stable forest before cutting clearings: building never regrows trees elsewhere
 base.sort((a,b)=>a.seed-b.seed);const selected=[]
 for(const t of base){if(selected.length>=250)break;if(selected.some(p=>Math.hypot(p.x-t.x,p.z-t.z)<2.8))continue;selected.push(t)}
 const trees=[],shrubs=[]
 for(const t of selected){const nearPlay=t.x>12&&t.x<49&&t.z>10;
  if(denseVegetationAllowed(context,t.x,t.z,1.15))trees.push({x:t.x,z:t.z,size:(nearPlay?3.05:4.4)+forestNoise(t.x+8,t.z)*(nearPlay?.85:1.6),r:t.seed*Math.PI*2,kind:forestNoise(t.x,t.z+7)>.6?'spruce':'oak'})
  if(!denseVegetationAllowed(context,t.x,t.z,1.15)&&t.z<40&&denseVegetationAllowed(context,t.x,t.z,.45))trees.push({x:t.x,z:t.z,size:1.7+forestNoise(t.x+8,t.z)*.4,r:t.seed*6.28,kind:'spruce'});
  const x=t.x+1.1,z=t.z+1.2;if(shrubs.length<140&&denseVegetationAllowed(context,x,z,.45))shrubs.push({x,z,size:.65+forestNoise(x,z)*.5,r:t.seed*6.28,kind:'shrub'})
 }
 return{trees,shrubs}
}
