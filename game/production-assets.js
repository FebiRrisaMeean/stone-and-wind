import * as T from '../vendor/three.module.js'
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js'

// Shared static asset, loaded without delaying the game; old site remains on failure
let parts=null,revision=0
export const productionAssetRevision=()=>revision
const enabled=new URLSearchParams(globalThis.location?.search??'').get('productionModels')!=='off'
if(enabled)new GLTFLoader().loadAsync(new URL('./assets/production/berry-bush.glb',import.meta.url).href).then(gltf=>{
 const scene=gltf.scene;scene.updateMatrixWorld(true)
 const box=new T.Box3().setFromObject(scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3())
 if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid berry bounds')
 const scale=1/Math.max(size.x,size.z),normalize=new T.Matrix4().makeScale(scale,scale,scale).multiply(new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z))
 const prepared=[]
 scene.traverse(o=>{if(!o.isMesh)return
  const geometry=o.geometry.clone();geometry.applyMatrix4(normalize.clone().multiply(o.matrixWorld));geometry.userData.sharedAsset=true
  const material=o.material;material.roughness=.92;material.metalness=0;material.userData.sharedAsset=true;material.userData.seasonInvariant=true
  prepared.push({geometry,material});o.geometry.dispose()
 })
 parts=prepared;revision++;globalThis.dispatchEvent?.(new Event('stone-assets-ready'))
}).catch(error=>console.warn('Berry pilot unavailable; retaining procedural bushes',error))

export function createBerryProductionAsset(){
 if(!parts?.length)return null
 const root=new T.Group();root.name='berry-production-pilot';root.userData.productionAsset='berry-v1'
 for(const part of parts){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)}
 // Back of the clearing stays separate from the reward piles and worker seats
 root.scale.setScalar(2.05);root.position.set(.12,.17,-.55)
 return root
}
