import {createNightCharacter,animateNightCharacter} from './night-characters.js'
import {createNightBuilding} from './night-buildings.js'
import {createMeshyPilot,animateMeshyPilot} from './meshy-pilots.js'
import {createMeshyBuilding,animateMeshyBuilding} from './meshy-buildings.js'
import {createHybridCrane,animateHybridCrane} from './hybrid-crane.js'
import * as T from '../../vendor/three.module.js'
import {createMeshyScholar,animateMeshyScholar} from './meshy-scholar.js'
import {createLocalScholar,animateLocalScholar} from './scholar.js'
import {createLocalCharacter,animateLocalCharacter} from './characters.js'
import {ARCHITECTURE_NAMES,createArchitecture,animateArchitecture} from '../architecture-models.js?v=pages25'

const acceptedBuildings=new Set(ARCHITECTURE_NAMES)
export function hasLocalBuilding(name){return acceptedBuildings.has(name)}
export function createGameSculpt(name,{critter=true}={}){
 const nightCharacter=critter?createNightCharacter(name):null
 const object=nightCharacter??createNightBuilding(name)??createMeshyBuilding(name)??createMeshyPilot(name)??(critter?(name==='Doctor'?(createMeshyScholar()??createLocalScholar()):createLocalCharacter(name)):(name==='Crane'?(createHybridCrane()??createArchitecture(name)):createArchitecture(name)))
 if(nightCharacter)object.userData.nightCharacter=true
 const bounds=new T.Box3().setFromObject(object),size=bounds.getSize(new T.Vector3())
 const root=new T.Group();root.name='card-sculpt:'+name
 // The card's logical foundation stays in place; only this inner body can roam
 const scale=Math.min((critter?1.65:2.1)/size.y,(critter?1.55:1.8)/Math.max(size.x,size.z))*(critter?1:2.2)
 object.scale.multiplyScalar(scale);object.position.y-=bounds.min.y*scale
 root.add(object)
 root.userData={cardName:name,modelKey:name,modelVersion:5,isCritter:critter,localSculpt:critter,acceptedBuilding:!critter,architecture:!critter}
 object.traverse(o=>{if(o.isMesh){if(critter)o.geometry.userData.sharedAsset=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.userData.sharedAsset=true;m.userData.seasonInvariant=true}}})
 return root
}
export function animateGameSculpt(root,time){
 const model=root.children[0],walking=root.userData.walking===true||root.userData.moving===true
 if(!model)return
 const t=time+(root.id%73)*.29
 if(model.userData.nightCharacter){animateNightCharacter(model,t,{walking,running:root.userData.running===true});return}
 if(model.userData.meshyPilot){animateMeshyPilot(model,t,{walking,running:root.userData.running===true});return}
 if(model.userData.meshyBuilding){animateMeshyBuilding(model,t);return}
 if(model.userData.hybridCrane){animateHybridCrane(model,t);return}
 if(root.userData.acceptedBuilding){model.userData.walking=walking;animateArchitecture(model,t);return}
 if(model.userData.meshyScholar)animateMeshyScholar(model,t,{walking})
 else if(root.userData.cardName==='Doctor')animateLocalScholar(model,t,{walking})
 else animateLocalCharacter(model,t,{walking})
}
