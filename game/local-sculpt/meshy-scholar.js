import * as T from '../../vendor/three.module.js'
import {GLTFLoader} from '../../vendor/addons/loaders/GLTFLoader.js'
import {clone} from '../../vendor/addons/utils/SkeletonUtils.js'
let template=null
const states=new WeakMap()
const point=new T.Vector3()
function aimBone(bone,target,child){
 const start=bone.getWorldPosition(new T.Vector3()),end=child.getWorldPosition(new T.Vector3())
 const delta=new T.Quaternion().setFromUnitVectors(end.sub(start).normalize(),target.clone().sub(start).normalize())
 const parentQ=bone.parent.getWorldQuaternion(new T.Quaternion()),worldQ=bone.getWorldQuaternion(new T.Quaternion())
 bone.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));bone.updateWorldMatrix(false,true)
}
function clearScholarArms(state,root){
 for(const arm of state.arms){
  root.updateMatrixWorld(true)
  const wrist=root.worldToLocal(arm.hand.getWorldPosition(new T.Vector3()))
  const torso=root.worldToLocal(state.torso.getWorldPosition(new T.Vector3()))
  const dz=wrist.z-torso.z,dy=wrist.y-(torso.y-.025)
  const envelope=1-(dz/.25)**2-(dy/.28)**2
  let clearance=envelope>0?.245*Math.sqrt(envelope)+.025:0
  // The hanging scarf ends occupy space below the chest envelope
  if(wrist.y>.23&&wrist.y<.58&&dz>-.32&&dz<.13)clearance=Math.max(clearance,.285)
  if(arm.sign*(wrist.x-torso.x)>=clearance)continue
  const start=arm.upper.getWorldPosition(new T.Vector3())
  const elbowOriginal=arm.fore.getWorldPosition(new T.Vector3())
  const target=root.localToWorld(wrist.clone().setX(torso.x+arm.sign*clearance))
  const l1=start.distanceTo(elbowOriginal),l2=elbowOriginal.distanceTo(arm.hand.getWorldPosition(new T.Vector3()))
  const direction=target.clone().sub(start),d=T.MathUtils.clamp(direction.length(),Math.abs(l1-l2)+.0001,(l1+l2)*.985);direction.normalize();target.copy(start).addScaledVector(direction,d)
  const bend=elbowOriginal.sub(start);bend.addScaledVector(direction,-bend.dot(direction))
  if(bend.lengthSq()<1e-8)continue
  bend.normalize()
  const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),elbow=start.clone().addScaledVector(direction,along).addScaledVector(bend,height)
  aimBone(arm.upper,elbow,arm.fore);aimBone(arm.fore,target,arm.hand)
 }
}
function ground(state,root){
 state.model.position.y=0;root.updateMatrixWorld(true)
 let floor=Infinity
 for(const [mesh,indices] of state.soles){for(const index of indices){point.fromBufferAttribute(mesh.geometry.attributes.position,index);mesh.applyBoneTransform(index,point);mesh.localToWorld(point);root.worldToLocal(point);floor=Math.min(floor,point.y)}}
 if(Number.isFinite(floor))state.model.position.y=-floor
 root.updateMatrixWorld(true)
}
try {
 template=await new GLTFLoader().loadAsync(new URL('../assets/scholar/scholar-cloth-walk.glb',import.meta.url).href)
 template.scene.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;for(const m of [o.material].flat()){m.userData.sharedAsset=true;m.userData.seasonInvariant=true}o.castShadow=true;o.frustumCulled=false}})
} catch(error) {console.warn('Scholar GLB unavailable; using local fallback',error)}
export function createMeshyScholar(){
 if(!template)return null
 const root=new T.Group(),model=clone(template.scene)
 root.name='scholar-meshy-cloth-v2';root.userData.meshyScholar=true
 model.rotation.y=Math.PI;root.add(model)
 const mixer=new T.AnimationMixer(model),action=mixer.clipAction(template.animations[0]);action.play();mixer.setTime(0)
 root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();o.computeBoundingSphere()}})
 const soles=[]
 model.traverse(o=>{if(!o.isSkinnedMesh||o.name==='ScholarScarf')return;const pos=o.geometry.attributes.position,indices=[];for(let i=0;i<pos.count;i++)if(pos.getY(i)<.12)indices.push(i);soles.push([o,indices])})
 // Author a neutral bind stance instead of freezing one lifted-leg walk frame
 const skeletons=new Set();model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});for(const skeleton of skeletons){
  skeleton.pose()
  // Three's pose() leaves root bones in bind-world coordinates when their parent is not a bone
  for(let i=0;i<skeleton.bones.length;i++){const bone=skeleton.bones[i];if(bone.parent&&!bone.parent.isBone){bone.parent.updateWorldMatrix(true,false);new T.Matrix4().copy(bone.parent.matrix).invert().multiply(new T.Matrix4().copy(skeleton.boneInverses[i]).invert()).decompose(bone.position,bone.quaternion,bone.scale)}}
 }
 const arms=[['Right',1],['Left',-1]].map(([side,sign])=>({sign,upper:model.getObjectByName(side+'Arm'),fore:model.getObjectByName(side+'ForeArm'),hand:model.getObjectByName(side+'Hand')}))
 const idle=[];model.traverse(o=>{if(o.isBone)idle.push({bone:o,q:o.quaternion.clone(),p:o.position.clone(),s:o.scale.clone()})})
 mixer.setTime(.1);for(const pose of idle)if(/arm|hand|finger|thumb|index|middle|ring|pinky/i.test(pose.bone.name))pose.q.copy(pose.bone.quaternion)
 for(const pose of idle){pose.bone.quaternion.copy(pose.q);pose.bone.position.copy(pose.p);pose.bone.scale.copy(pose.s)}
 const state={torso:model.getObjectByName('Spine01'),mixer,action,model,soles,arms,idle,blend:0,elapsed:0,lastTime:null,walking:false};clearScholarArms(state,root);ground(state,root)
 root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();o.computeBoundingSphere()}})
 states.set(root,state)
 return root
}
export function animateMeshyScholar(root,time,{walking=false}={}){
 const state=states.get(root);if(!state)return
 const dt=state.lastTime===null?0:Math.max(0,Math.min(.05,time-state.lastTime));state.lastTime=time
 state.elapsed+=dt*.75;state.mixer.setTime(state.elapsed)
 state.blend+=(Number(walking)-state.blend)*(1-Math.exp(-dt*9))
 for(const pose of state.idle){pose.bone.quaternion.copy(pose.q.clone().slerp(pose.bone.quaternion,state.blend));pose.bone.position.lerpVectors(pose.p,pose.bone.position,state.blend);pose.bone.scale.copy(pose.s)}
 const head=state.model.getObjectByName('Head');if(head&&!walking)head.rotateY(Math.sin(time*.65)*.018)
 clearScholarArms(state,root)
 ground(state,root)
 state.walking=walking
}
