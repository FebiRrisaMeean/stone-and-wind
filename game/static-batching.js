import * as T from '../vendor/three.module.js'
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js'
// Batch only an explicitly static production-site subtree, retaining its semantic groups
export function batchProductionSite(root){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map()
 root.traverse(o=>{
  if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(o.material)||o.geometry.userData.sharedAsset||o.material.map||o.material.transparent)return
  const m=o.material,key=JSON.stringify([m.type,m.color?.getHex(),m.roughness,m.metalness,m.emissive?.getHex(),m.emissiveIntensity,m.side,m.userData.seasonInvariant??false,o.userData.pick])
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o)
 })
 let removed=0
 for(const meshes of groups.values()){
  if(meshes.length<2)continue
  const geometries=meshes.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);return g})
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)continue
  const mesh=new T.Mesh(geometry,meshes[0].material);mesh.userData={...meshes[0].userData};mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)
  for(const o of meshes){o.removeFromParent();o.geometry.dispose();if(o.material!==mesh.material)o.material.dispose()}removed+=meshes.length-1
 }
 root.userData.batchedDrawCallsSaved=removed;return root
}
