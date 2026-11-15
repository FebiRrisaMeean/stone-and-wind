import * as T from '../vendor/three.module.js'
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js'

// Add only downloaded, reviewed game assets; never request missing model files
const assets={berry:'berry-bush.glb'}
const parts=new Map(),pending=new Set()
let revision=0
const enabled=new URLSearchParams(globalThis.location?.search??'').get('productionModels')!=='off'
export const productionAssetRevision=()=>revision
export function productionAssetKind(name){
 if(name==='HAVEN')return 'haven'
 if(name.includes('JOURNEY')||name==='COPY_BASIC_ONE_CARD')return 'trail'
 if(['TWO_WILD','ONE_TWIG_RESIN_BERRY','DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD','DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'].includes(name))return 'exchange'
 if(/PEBBLE|STONE/.test(name))return 'pebbles'
 if(/BERRY/.test(name))return 'berry'
 if(/RESIN/.test(name))return 'resin'
 if(/TWIG/.test(name))return 'timber'
 return 'archive'
}
function request(kind){
 if(!enabled||!assets[kind]||pending.has(kind)||parts.has(kind))return
 pending.add(kind)
 new GLTFLoader().loadAsync(new URL('./assets/production/'+assets[kind],import.meta.url).href).then(gltf=>{
  const scene=gltf.scene;scene.updateMatrixWorld(true)
  const box=new T.Box3().setFromObject(scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3())
  if(!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid production asset bounds')
  const scale=1/Math.max(size.x,size.z),normalize=new T.Matrix4().makeScale(scale,scale,scale).multiply(new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z)),prepared=[]
  scene.traverse(o=>{if(!o.isMesh)return
   const geometry=o.geometry.clone();geometry.applyMatrix4(normalize.clone().multiply(o.matrixWorld));geometry.userData.sharedAsset=true
   const material=o.material
   for(const m of Array.isArray(material)?material:[material]){m.roughness=.92;m.metalness=0;m.userData.sharedAsset=true;m.userData.seasonInvariant=true}
   prepared.push({geometry,material});o.geometry.dispose()
  })
  parts.set(kind,prepared);revision++;globalThis.dispatchEvent?.(new Event('stone-assets-ready'))
 }).catch(error=>console.warn('Production asset unavailable; retaining local model',kind,error))
}
export function createProductionAsset(kind){
 request(kind)
 if(!parts.get(kind)?.length)return null
 const root=new T.Group();root.name=kind+'-production';root.userData.productionAsset=kind
 for(const part of parts.get(kind)){const mesh=new T.Mesh(part.geometry,part.material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh)}
 root.scale.setScalar(kind==='trail'?1.45:kind==='haven'?2.3:2.05);root.position.set(.12,.17,-.55)
 return root
}
export const createBerryProductionAsset=()=>createProductionAsset('berry')
