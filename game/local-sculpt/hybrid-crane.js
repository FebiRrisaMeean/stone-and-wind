import * as T from '../../vendor/three.module.js'
import {GLTFLoader} from '../../vendor/addons/loaders/GLTFLoader.js'
let template=null
const states=new WeakMap()
try{
 template=await new GLTFLoader().loadAsync(new URL('../assets/crane/crane-meshy-v2.glb',import.meta.url).href)
 template.scene.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;o.castShadow=true;for(const m of [o.material].flat()){m.userData.sharedAsset=true;m.userData.seasonInvariant=true}}})
}catch(error){console.warn('Meshy crane unavailable; using previous crane',error)}
export function createHybridCrane(){
 if(!template)return null
 const root=new T.Group(),model=template.scene.clone(true);root.name='Crane-meshy-v2';root.userData.hybridCrane=true;root.userData.craneVersion=2
 // Board wrappers rotate by PI, whereas this GLB faces +Z
 model.rotation.y=Math.PI;root.add(model);root.updateMatrixWorld(true)
 states.set(root,{platform:model.getObjectByName('CraneTurntable'),cargo:model.getObjectByName('CargoPivot')})
 return root
}
export function animateHybridCrane(root,time){
 const state=states.get(root);if(!state)return
 if(state.platform)state.platform.rotation.y=Math.sin(time*.55)*.08
 if(state.cargo)state.cargo.rotation.z=Math.sin(time*1.2)*.018
}
