// Presentation-only city roads: rebuild when buildings move, never in the frame loop
import {navigationFootprint,isBuildingFootprint,rotateCityPoint} from './city-footprints.js?v=pages30-production'
import {expandedObstacles,nearestFree,planRoute} from './city-navigation.js?v=pages30-production'
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const pathLength=(start,route)=>route.reduce((sum,p,i)=>sum+distance(i?route[i-1]:start,p),0)
export function cityRoadEntrance(building,radius=.85){
 const bounds=navigationFootprint(building.cardName,building.x,building.z,(building.modelScale??1.1)/1.1,building.rotation??0)
 if(!bounds)return null
 // In-game QA: Farm, Chapel and Inn doors face +Z at canonical PI model rotation
 // Per-model entrance directions may override this without changing placement or the graph
 const front=building.entranceDirection??[0,1],v=rotateCityPoint(front[0],front[1],building.rotation??0),length=Math.hypot(...v)||1,dx=v[0]/length,dz=v[1]/length
 const tx=Math.abs(dx)<1e-8?Infinity:((dx>0?bounds.maxX:bounds.minX)-building.x)/dx
 const tz=Math.abs(dz)<1e-8?Infinity:((dz>0?bounds.maxZ:bounds.minZ)-building.z)/dz
 const reach=Math.min(tx,tz)+radius+.12
 return{x:building.x+dx*reach,z:building.z+dz*reach}
}
export function buildCityRoads(buildings,{obstacles=null,radius=.85,previous=null}={}){
 const homes=buildings.filter(b=>!b.critter&&isBuildingFootprint(b.cardName)).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))
 const blocked=obstacles??homes.map(b=>({id:b.id,...navigationFootprint(b.cardName,b.x,b.z,(b.modelScale??1.1)/1.1,b.rotation??0)}))
 const key=JSON.stringify([homes.map(b=>[b.id,b.cardName,b.x,b.z,b.rotation??0,b.modelScale??1.1,b.entranceDirection]),blocked,radius])
 if(previous?.key===key)return previous
 const clearance=expandedObstacles(blocked,radius),entrances=homes.map(b=>({id:b.id,point:nearestFree(cityRoadEntrance(b,radius),clearance)})).filter(e=>e.point)
 const segments=[],connections=[],unconnected=[],seen=new Set(),connected=new Set(entrances.length?[0]:[]),routes=new Map()
 const routeFor=(i,j)=>{const k=[Math.min(i,j),Math.max(i,j)].join(':');if(!routes.has(k)){const a=entrances[Math.min(i,j)].point,b=entrances[Math.max(i,j)].point,route=planRoute(a,b,clearance);routes.set(k,route?{path:[a,...route],length:pathLength(a,route)}:null)}return routes.get(k)}
 while(connected.size<entrances.length){
  let best=null
  for(const i of connected)for(let j=0;j<entrances.length;j++)if(!connected.has(j)){const route=routeFor(i,j);if(route&&(!best||route.length<best.route.length))best={i,j,route}}
  if(!best)break
  connected.add(best.j);connections.push([entrances[best.i].id,entrances[best.j].id])
  for(let i=1;i<best.route.path.length;i++){const a=best.route.path[i-1],b=best.route.path[i];if(distance(a,b)<1e-5)continue;const token=[a,b].map(p=>p.x.toFixed(5)+','+p.z.toFixed(5)).sort().join('|');if(!seen.has(token)){seen.add(token);segments.push({a:{...a},b:{...b}})}}
 }
 entrances.forEach((e,i)=>{if(!connected.has(i))unconnected.push(e.id)})
 return{key,segments,connections,entrances,unconnected,radius}
}
