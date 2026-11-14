import * as T from '../../vendor/three.module.js'
import {GLTFLoader} from '../../vendor/addons/loaders/GLTFLoader.js'

const definitions={'Farm':'farm','University':'university','Clock Tower':'clock-tower'}
const templates=new Map()
await Promise.all(Object.entries(definitions).map(async([name,file])=>{
 try{
  const asset=await new GLTFLoader().loadAsync(new URL(`../assets/meshy-buildings-02/${file}.glb`,import.meta.url).href)
  asset.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.geometry.userData.sharedAsset=true;for(const material of [o.material].flat()){material.userData.sharedAsset=true;material.userData.seasonInvariant=true}}})
  templates.set(name,asset.scene)
 }catch(error){console.warn(`Meshy building ${name} unavailable; preserving previous model`,error)}
}))
export function createMeshyBuilding(name){
 const template=templates.get(name);if(!template)return null
 const root=new T.Group(),model=template.clone(true)
 root.name=`meshy-building:${name}`;root.userData.meshyBuilding=true
 // Generated front is +Z; the board turns the card wrapper towards the camera
 model.rotation.y=Math.PI;root.add(model)
 return root
}
export function animateMeshyBuilding(){
 // These models contain authored rigid architecture only
 // The clock's support is fused to a wheel side: do not rotate it through the ground
}
