import {BUILDING_FOOTPRINTS} from './city-footprint-data.js?v=pages44-elder'
export const BUILDING_CLEARANCE=1.8
export function isBuildingFootprint(name){return Object.hasOwn(BUILDING_FOOTPRINTS,name)}
// Lower model hull excludes roofs and hanging branches; navigation keeps its own taller envelope
export function cityFootprint(name){return BUILDING_FOOTPRINTS[name]?.hull??Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*.55,Math.sin(i*Math.PI/4)*.55])}
// rotation is an additional Three.js Y rotation relative to the established model facing
export function normalizeCityRotation(rotation=0){return Number.isFinite(rotation)?((rotation%(Math.PI*2))+Math.PI*2)%(Math.PI*2):0}
export function rotateCityPoint(x,z,rotation=0){const r=normalizeCityRotation(rotation),c=Math.cos(r),s=Math.sin(r);return[x*c+z*s,z*c-x*s]}
export function footprintAt(name,x,z,rotation=0){return cityFootprint(name).map(([dx,dz])=>{const [rx,rz]=rotateCityPoint(dx,dz,rotation);return[x+rx,z+rz]})}
export function hullsOverlap(a,b,clearance=BUILDING_CLEARANCE){
 for(const shape of [a,b])for(let i=0;i<shape.length;i++){
  const q=shape[i],r=shape[(i+1)%shape.length],dx=r[0]-q[0],dz=r[1]-q[1],length=Math.hypot(dx,dz)
  if(length<1e-8)continue
  const axis=[-dz/length,dx/length],aa=a.map(p=>p[0]*axis[0]+p[1]*axis[1]),bb=b.map(p=>p[0]*axis[0]+p[1]*axis[1])
  if(Math.max(...aa)+clearance<=Math.min(...bb)||Math.max(...bb)+clearance<=Math.min(...aa))return false
 }
 return true
}
export function footprintFitsBounds(hull,bounds,margin=.15){return hull.every(([x,z])=>x>=bounds.minX+margin&&x<=bounds.maxX-margin&&z>=bounds.minZ+margin&&z<=bounds.maxZ-margin)}

export function navigationFootprint(name,x,z,scale=1,rotation=0){
 const b=BUILDING_FOOTPRINTS[name]?.navigationBounds;if(!b)return null
 // Conservative AABB of the rotated envelope keeps all existing lightweight navigation safe
 const corners=[[b[0],b[2]],[b[1],b[2]],[b[1],b[3]],[b[0],b[3]]].map(([dx,dz])=>rotateCityPoint(dx*scale,dz*scale,rotation))
 return{minX:x+Math.min(...corners.map(p=>p[0]))-.12,maxX:x+Math.max(...corners.map(p=>p[0]))+.12,minZ:z+Math.min(...corners.map(p=>p[1]))-.12,maxZ:z+Math.max(...corners.map(p=>p[1]))+.12}
}
export function navigationPassageClear(a,b){if(!a||!b)return true;const gap=1.8;return a.maxX+gap<=b.minX||b.maxX+gap<=a.minX||a.maxZ+gap<=b.minZ||b.maxZ+gap<=a.minZ}
