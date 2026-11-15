import {Matrix4,Vector3} from '../../vendor/three.module.js'
const point=new Vector3(),inverseRoot=new Matrix4()
const q=new URLSearchParams(globalThis.location?.search??'')
const cachedMatrices=q.get('groundMatrices')!=='off'&&q.get('optimizations')!=='off'

// Bone transforms and sample vertices stay identical; only invariant world matrices are cached
export function sampleGroundFloor(root,soles,cached=cachedMatrices){
 let floor=Infinity
 for(const [mesh,indices] of soles){
  if(cached){mesh.updateWorldMatrix(true,false);inverseRoot.copy(root.matrixWorld).invert()}
  for(const index of indices){
   point.fromBufferAttribute(mesh.geometry.attributes.position,index);mesh.applyBoneTransform(index,point)
   if(cached)point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot)
   else{mesh.localToWorld(point);root.worldToLocal(point)}
   floor=Math.min(floor,point.y)
  }
 }
 return floor
}
