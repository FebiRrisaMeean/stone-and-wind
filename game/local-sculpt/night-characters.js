import * as T from '../../vendor/three.module.js'
import {GLTFLoader} from '../../vendor/addons/loaders/GLTFLoader.js'
import {clone as cloneSkeleton} from '../../vendor/addons/utils/SkeletonUtils.js'

const assets=new Map(),states=new WeakMap(),point=new T.Vector3()
const definitions={"Husband": {"file": "husband/rigged", "critter": true}, "Wife": {"file": "wife/rigged", "critter": true}, "Shopkeeper": {"file": "shopkeeper/rigged", "critter": true}, "Barge Toad": {"file": "barge-toad/rigged", "critter": true}, "Chip Sweep": {"file": "chip-sweep/rigged", "critter": true}, "Innkeeper": {"file": "innkeeper/rigged", "critter": true}, "Fool": {"file": "fool/rigged", "critter": true}, "Judge": {"file": "judge/rigged", "critter": true}, "King": {"file": "king/rigged", "critter": true}, "Miner Mole": {"file": "miner-mole/rigged", "critter": true}, "Monk": {"file": "monk/rigged", "critter": true}, "Peddler": {"file": "peddler/rigged", "critter": true}, "Queen": {"file": "queen/rigged", "critter": true}, "Ranger": {"file": "ranger/rigged", "critter": true}, "Wanderer": {"file": "wanderer/rigged", "critter": true}, "Woodcarver": {"file": "woodcarver/rigged", "critter": true}, "Bard": {"file": "bard/rigged", "critter": true}, "Historian": {"file": "historian/rigged", "critter": true}, "Postal Pigeon": {"file": "postal-pigeon/rigged", "critter": true}, "Shepherd": {"file": "shepherd/rigged", "critter": true}, "Teacher": {"file": "teacher/rigged", "critter": true}, "Undertaker": {"file": "undertaker/rigged", "critter": true}}
const loader=new GLTFLoader()
async function load(file){
 try{return await loader.loadAsync(new URL(`../assets/night-characters/${file}.glb`,import.meta.url).href)}
 catch(error){console.warn(`Meshy pilot ${file} unavailable; preserving previous model`,error);return null}
}
function share(scene){scene.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;o.castShadow=true;for(const m of [o.material].flat()){m.userData.sharedAsset=true;m.userData.seasonInvariant=true}if(o.isSkinnedMesh)o.frustumCulled=false}})}
function inPlace(source){
 const clip=source.clone()
 for(const track of clip.tracks){
  // Keep vertical gait, but let the board own horizontal movement
  if(/(?:hips|pelvis|root|armature)\.position$/i.test(track.name))for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2]}
 }
 return clip
}
await Promise.all(Object.entries(definitions).map(async([name,definition])=>{
 const main=await load(definition.file);if(!main)return
 let walk=null,run=null
 if(definition.critter){[walk,run]=await Promise.all([load(definition.file.replace("rigged","walk")),load(definition.file.replace("rigged","run"))])}
 let hasRig=false;main.scene.traverse(o=>{hasRig ||= !!o.isSkinnedMesh})
 // Meshy's animation file also contains the full rigged model
 const model=hasRig?main:(walk??main)
 share(model.scene)
 assets.set(name,{...definition,model,walk:walk?.animations[0]??model.animations[0],run:run?.animations[0]})
}))
function sampleSoles(model){
 const soles=[]
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return
  const p=mesh.geometry.attributes.position,skin=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight
  const footBones=new Set(mesh.skeleton.bones.map((bone,i)=>/foot|toe/i.test(bone.name)?i:-1).filter(i=>i>=0))
  let candidates=[]
  if(footBones.size&&skin&&weight)for(let i=0;i<p.count;i++){
   let footWeight=0;for(let k=0;k<4;k++)if(footBones.has(skin.getComponent(i,k)))footWeight+=weight.getComponent(i,k)
   if(footWeight>.45)candidates.push(i)
  }
  if(!candidates.length){let min=Infinity,max=-Infinity;for(let i=0;i<p.count;i++){min=Math.min(min,p.getY(i));max=Math.max(max,p.getY(i))}for(let i=0;i<p.count;i++)if(p.getY(i)<min+(max-min)*.09)candidates.push(i)}
  // Sampling keeps grounding bounded even with many residents on the board
  const stride=Math.max(1,Math.ceil(candidates.length/96)),selected=candidates.filter((_,i)=>i%stride===0);for(const [axis,sign] of [['X',1],['X',-1],['Y',1],['Z',1],['Z',-1]]){let best=candidates[0];for(const i of candidates)if(p['get'+axis](i)*sign<p['get'+axis](best)*sign)best=i;if(best!==undefined)selected.push(best)}soles.push([mesh,[...new Set(selected)]])
 })
 return soles
}
function ground(state,root){
 state.model.position.y=state.baseY;root.updateMatrixWorld(true)
 let floor=Infinity
 for(const [mesh,indices] of state.soles)for(const index of indices){point.fromBufferAttribute(mesh.geometry.attributes.position,index);mesh.applyBoneTransform(index,point);mesh.localToWorld(point);root.worldToLocal(point);floor=Math.min(floor,point.y)}
 if(Number.isFinite(floor))state.model.position.y-=floor
 root.updateMatrixWorld(true)
}
// Keep stock humanoid arm swings outside this beaver's broad clothed torso
function aimAt(bone,target,child){
 const start=bone.getWorldPosition(new T.Vector3()),end=child.getWorldPosition(new T.Vector3())
 const delta=new T.Quaternion().setFromUnitVectors(end.sub(start).normalize(),target.clone().sub(start).normalize())
 const parentQ=bone.parent.getWorldQuaternion(new T.Quaternion()),worldQ=bone.getWorldQuaternion(new T.Quaternion())
 bone.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));bone.updateWorldMatrix(false,true)
}
function clearArchitectArms(state,root){
 if(!state.arms)return
 root.updateMatrixWorld(true)
 const torso=root.worldToLocal(state.torso.getWorldPosition(new T.Vector3()))
 for(const arm of state.arms){
  // Preserve the authored gait; only move a wrist that enters the vest envelope
  const wrist=root.worldToLocal(arm.hand.getWorldPosition(new T.Vector3()))
  const dz=wrist.z-torso.z,dy=wrist.y-(torso.y-.035)
  const envelope=1-(dz/.22)**2-(dy/.28)**2
  const clearance=envelope>0?.255*Math.sqrt(envelope)+.035:0
  if(arm.sign*(wrist.x-torso.x)>=clearance)continue
  const target=root.localToWorld(wrist.clone().setX(torso.x+arm.sign*clearance))
  const start=arm.upper.getWorldPosition(new T.Vector3())
  const elbowOriginal=arm.fore.getWorldPosition(new T.Vector3())
  const l1=start.distanceTo(elbowOriginal),l2=elbowOriginal.distanceTo(arm.hand.getWorldPosition(new T.Vector3()))
  const dir=target.clone().sub(start),d=T.MathUtils.clamp(dir.length(),Math.abs(l1-l2)+.0001,(l1+l2)*.985);dir.normalize();target.copy(start).addScaledVector(dir,d)
  const bend=elbowOriginal.sub(start);bend.addScaledVector(dir,-bend.dot(dir))
  if(bend.lengthSq()<1e-8)continue
  bend.normalize()
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),elbow=start.clone().addScaledVector(dir,along).addScaledVector(bend,height)
  aimAt(arm.upper,elbow,arm.fore);aimAt(arm.fore,target,arm.hand)
 }
}
export function createNightCharacter(name){
 const asset=assets.get(name);if(!asset)return null
 const root=new T.Group(),model=asset.critter?cloneSkeleton(asset.model.scene):asset.model.scene.clone(true)
 root.name=`meshy-pilot:${name}`;root.userData.meshyPilot=true;root.userData.pilotName=name
 model.rotation.y=Math.PI;root.add(model);root.updateMatrixWorld(true)
 if(!asset.critter)return root
 const mixer=new T.AnimationMixer(model)
 const walk=asset.walk?mixer.clipAction(inPlace(asset.walk)):null,run=asset.run?mixer.clipAction(inPlace(asset.run)):null
 walk?.play();run?.play();if(run)run.setEffectiveWeight(0)
 const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)})
 for(const skeleton of skeletons){
  skeleton.pose()
  for(let i=0;i<skeleton.bones.length;i++){const bone=skeleton.bones[i];if(bone.parent&&!bone.parent.isBone){bone.parent.updateWorldMatrix(true,false);new T.Matrix4().copy(bone.parent.matrix).invert().multiply(new T.Matrix4().copy(skeleton.boneInverses[i]).invert()).decompose(bone.position,bone.quaternion,bone.scale)}}
 }
 // Take relaxed arm rotations from gait, retaining the grounded bind stance of legs
 const idle=[];model.traverse(o=>{if(o.isBone)idle.push({bone:o,q:o.quaternion.clone(),p:o.position.clone(),s:o.scale.clone()})})
 if(walk){mixer.setTime(0);for(const pose of idle)if(/arm|hand|finger|thumb|index|middle|ring|pinky/i.test(pose.bone.name))pose.q.copy(pose.bone.quaternion)}
 for(const pose of idle){pose.bone.quaternion.copy(pose.q);pose.bone.position.copy(pose.p);pose.bone.scale.copy(pose.s)}
 const state={model,mixer,walk,run,idle,soles:sampleSoles(model),baseY:model.position.y,blend:0,lastTime:null,elapsed:0}
 if(name==='Architect'){
  state.torso=model.getObjectByName('Spine01')
  state.arms=[['Left',-1],['Right',1]].map(([side,sign])=>({sign,upper:model.getObjectByName(side+'Arm'),fore:model.getObjectByName(side+'ForeArm'),hand:model.getObjectByName(side+'Hand')}))
  if(!state.torso||state.arms.some(a=>!a.upper||!a.fore||!a.hand))state.arms=null
 }
 clearArchitectArms(state,root);ground(state,root);model.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();o.computeBoundingSphere()}})
 state.repairTail=model.getObjectByName('RepairTail');state.repairTailRest=state.repairTail?.quaternion.clone();
 state.armMotionFactor=1;
 state.anatomyArms=['Left','Right'].map((side,i)=>({sign:i===0?1:-1,upper:model.getObjectByName('Anatomy'+side+'Upper'),fore:model.getObjectByName('Anatomy'+side+'Fore'),hand:model.getObjectByName('Anatomy'+side+'Hand')})).filter(a=>a.upper&&a.fore&&a.hand);
 for(const a of state.anatomyArms){a.rest=a.upper.quaternion.clone();a.foreRest=a.fore.quaternion.clone();a.handRest=a.hand.quaternion.clone()}
 state.foldedWings=['Bard','Historian','Postal Pigeon','Shepherd','Teacher'].includes(name);states.set(root,state);return root
}
export function animateNightCharacter(root,time,{walking=false,running=false}={}){
 const state=states.get(root);if(!state)return // Static buildings retain their exact authored pose
 const dt=state.lastTime===null?0:Math.max(0,Math.min(.05,time-state.lastTime));state.lastTime=time;state.elapsed+=dt
 if(state.walk)state.walk.setEffectiveWeight(running&&state.run?0:1)
 if(state.run)state.run.setEffectiveWeight(running?1:0)
 state.running=running;state.mixer.setTime(state.elapsed)
 state.blend+=(Number(walking||running)-state.blend)*(1-Math.exp(-dt*9))
 for(const pose of state.idle){pose.bone.quaternion.slerp(pose.q,1-state.blend);pose.bone.position.lerp(pose.p,1-state.blend);pose.bone.scale.copy(pose.s)}
 if(state.foldedWings)for(const pose of state.idle)if(/Arm|Hand/.test(pose.bone.name))pose.bone.quaternion.slerp(pose.q,.88)
 if(state.armMotionFactor<1)for(const pose of state.idle)if(/Arm|ForeArm|Hand/.test(pose.bone.name))pose.bone.quaternion.slerp(pose.q,1-state.armMotionFactor);
 if(state.repairTail){state.repairTail.quaternion.copy(state.repairTailRest);state.repairTail.rotateY(Math.sin(state.elapsed*(running?5:3))*.025*state.blend)}
 for(const arm of state.anatomyArms){
  const phase=state.elapsed*(running?8:5)+(arm.sign<0?Math.PI:0),swing=Math.sin(phase)*state.blend
  const lower=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-arm.sign*1.12)
  const travel=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),swing*(running?.45:.30))
  arm.upper.quaternion.copy(arm.rest).multiply(travel.multiply(lower))
  arm.fore.quaternion.copy(arm.foreRest).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-arm.sign*(.22+Math.max(0,swing)*.12)))
  arm.hand.quaternion.copy(arm.handRest)
 }
 clearArchitectArms(state,root);ground(state,root)
}
