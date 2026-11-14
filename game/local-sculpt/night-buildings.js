import * as T from '../../vendor/three.module.js'
import {GLTFLoader} from '../../vendor/addons/loaders/GLTFLoader.js'
import {createAssetLibrary,eagerAssetsRequested} from './lazy-assets.js'

const definitions={"Theatre": "theatre", "Twig Barge": "twig-barge", "Fairgrounds": "fairgrounds", "Evertree": "evertree", "Courthouse": "courthouse", "Castle": "castle", "Mine": "mine", "Monastery": "monastery", "Ruins": "ruins", "Post Office": "post-office", "Palace": "palace", "Dungeon": "dungeon", "Chapel": "chapel", "General Store": "general-store", "School": "school", "Cemetary": "cemetary", "Lookout": "lookout", "Storehouse": "storehouse"}
const library=createAssetLibrary(definitions,async(name,file)=>{
 try{
  const asset=await new GLTFLoader().loadAsync(new URL(`../assets/night-buildings/${file}.glb`,import.meta.url).href)
  asset.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.geometry.userData.sharedAsset=true;for(const material of [o.material].flat()){material.userData.sharedAsset=true;material.userData.seasonInvariant=true}}})
  return asset.scene
 }catch(error){console.warn(`Meshy building ${name} unavailable; preserving previous model`,error)}
})
export const preloadNightBuildings=library.preload
export const requestNightBuilding=library.request
if(eagerAssetsRequested())await preloadNightBuildings()
export function createNightBuilding(name){
 const template=library.assets.get(name);if(!template){void requestNightBuilding(name);return null}
 const root=new T.Group(),model=template.clone(true)
 root.name=`meshy-building:${name}`;root.userData.meshyBuilding=true
 // Generated front is +Z; the board turns the card wrapper towards the camera
 model.rotation.y=Math.PI;root.add(model)
 return root
}
export function animateNightBuilding(){
 // These models contain authored rigid architecture only
 // The clock's support is fused to a wheel side: do not rotate it through the ground
}
