import * as T from '../../vendor/three.module.js'
import {createLocalScholar,animateLocalScholar} from './scholar.js'
import {createLocalCharacter,animateLocalCharacter} from './characters.js'
import {ARCHITECTURE_NAMES,createArchitecture,animateArchitecture} from '../architecture-models.js?v=pages24'

const acceptedBuildings=new Set(ARCHITECTURE_NAMES)
export function hasLocalBuilding(name){return acceptedBuildings.has(name)}
export function createGameSculpt(name,{critter=true}={}){
 const object=critter?(name==='Doctor'?createLocalScholar():createLocalCharacter(name)):createArchitecture(name)
 const bounds=new T.Box3().setFromObject(object),size=bounds.getSize(new T.Vector3())
 const root=new T.Group();root.name='card-sculpt:'+name
 // The card's logical foundation stays in place; only this inner body can roam
 const scale=Math.min((critter?1.65:2.1)/size.y,(critter?1.55:1.8)/Math.max(size.x,size.z))
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
 if(root.userData.acceptedBuilding){model.userData.walking=walking;animateArchitecture(model,t);return}
 if(root.userData.cardName==='Doctor')animateLocalScholar(model,t,{walking})
 else animateLocalCharacter(model,t,{walking})
}
