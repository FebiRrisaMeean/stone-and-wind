import {T} from './card-style-primitives.js'
import {createCardStyleSample,animateCardStyleSample} from './card-style-models.js'
import {TIMBER_BUILDERS} from './architecture-timber.js'
import {STONE_BUILDERS} from './architecture-stone.js'
import {batchStaticHierarchy} from './local-sculpt/mesh-optimizer.js?v=pages24'

const approved=new Set(['Crane','Resin Refinery','Clock Tower'])
const builders={...TIMBER_BUILDERS,...STONE_BUILDERS}
export const ARCHITECTURE_NAMES=Object.freeze([...approved,...Object.keys(builders)])
export const ARCHITECTURE_PROFILES=Object.freeze({
 Crane:'weathered-plank-cabin-trussed-timber-crane','Resin Refinery':'living-tree-amber-bracket-shelves','Clock Tower':'slender-masonry-clock-river-waterwheel',
 Theatre:'open-timber-stage-tiered-amphitheatre','Twig Barge':'long-wooden-hull-yellow-canopy',University:'pale-arched-campus-statue',Fairgrounds:'paired-striped-pavilions',
 Evertree:'broad-branching-tree-hanging-lanterns',Farm:'low-turf-roof-cottage-crooked-chimney',Inn:'tree-trunk-arched-red-portal',Courthouse:'weathered-log-classical-portico',
 Castle:'fortified-stump-palisade',Mine:'hollow-rock-mouth-ore-cart',Monastery:'carved-tree-face-hanging-bells',Ruins:'broken-hollow-stump',
 'Post Office':'tall-dovecote-on-stilts','Palace':'luminous-vine-wrapped-trunk',Dungeon:'dark-rooted-stump-barred-entrance',Chapel:'weathered-timber-chapel-bell-spire',
 'General Store':'open-timber-shop-in-tree-niche',School:'small-belfry-school-on-branch',Cemetary:'tree-embraced-carved-stone-graves',Lookout:'stacked-bark-observation-tower',Storehouse:'arched-tree-store-with-bins'
})
const templates=new Map()
export function createArchitectureRaw(name){
 if(approved.has(name))return createCardStyleSample(name)
 if(!builders[name])throw new Error('Unknown architecture: '+name)
 const root=new T.Group();root.name=name;root.userData={cardName:name,modelKey:name,modelVersion:5,isCritter:false,motions:[],sourceBacked:true}
 builders[name](root);return root
}
function template(name){
 if(templates.has(name))return templates.get(name)
 const root=createArchitectureRaw(name)
 batchStaticHierarchy(root)
 // Store only plain data in templates: Object3D.clone serializes userData
 const motionKeys=new Map()
 const specs=root.userData.motions.map((m,index)=>{
  if(!motionKeys.has(m.obj))motionKeys.set(m.obj,index)
  m.obj.userData.architectureMotionKey=motionKeys.get(m.obj)
  const {obj,position,rotation,scale,...rest}=m
  return {...rest,key:motionKeys.get(obj),position:position.toArray(),rotation:rotation.toArray(),scale:scale.toArray()}
 })
 delete root.userData.waterwheel
 delete root.userData.motions
 root.userData.motionSpecs=specs
 root.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.userData.sharedAsset=true;m.userData.seasonInvariant=true}}})
 templates.set(name,root);return root
}
export function createArchitecture(name){
 const root=template(name).clone(true),targets=new Map()
 root.traverse(o=>{if(o.userData.architectureMotionKey!==undefined)targets.set(o.userData.architectureMotionKey,o)})
 root.userData.motions=root.userData.motionSpecs.map(({key,position,rotation,scale,...rest})=>({...rest,obj:targets.get(key),position:new T.Vector3().fromArray(position),rotation:new T.Euler().fromArray(rotation),scale:new T.Vector3().fromArray(scale)}))
 return root
}
export function animateArchitecture(root,time){
 animateCardStyleSample(root,time)
 for(const m of root.userData.motions){
  if(m.type==='sway'){const axis=m.axis??'z';m.obj.rotation[axis]=m.rotation[axis]+Math.sin(time*(m.speed??1)+(m.phase??0))*(m.amplitude??.025)}
  if(m.type==='glow')m.obj.scale.copy(m.scale).multiplyScalar(1+Math.sin(time*(m.speed??1.4)+(m.phase??0))*(m.amplitude??.025))
 }
}
