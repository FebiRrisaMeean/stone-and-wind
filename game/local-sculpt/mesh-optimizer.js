import * as T from '../../vendor/three.module.js'

// Bake static child transforms and merge by material inside each moving group
// Animation targets retain object identity and their own draw calls
export function batchStaticChildren(root,protectedObjects=new Set()){
 const animated=new Set([...protectedObjects,...(root.userData.motions??[]).map(m=>m.obj)])
 const visit=group=>{
  for(const child of group.children)if(child.isGroup)visit(child)
  const buckets=new Map()
  for(const child of group.children){
   if(!child.isMesh||animated.has(child)||Array.isArray(child.material))continue
   const geo=child.geometry,keys=Object.keys(geo.attributes).sort().join(',')
   const key=child.material.uuid+'|'+keys+'|'+child.castShadow+'|'+child.receiveShadow
   if(!buckets.has(key))buckets.set(key,[])
   buckets.get(key).push(child)
  }
  for(const meshes of buckets.values()){
   if(meshes.length<2)continue
   const geometries=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix)})
   const merged=new T.BufferGeometry(),keys=Object.keys(geometries[0].attributes)
   for(const key of keys){
    const attributes=geometries.map(g=>g.attributes[key]),size=attributes[0].itemSize
    const array=new Float32Array(attributes.reduce((n,a)=>n+a.count*size,0));let offset=0
    for(const a of attributes){array.set(a.array,offset);offset+=a.array.length}
    merged.setAttribute(key,new T.BufferAttribute(array,size))
   }
   const indices=[];let offset=0
   for(const g of geometries){if(g.index)for(const i of g.index.array)indices.push(i+offset);else for(let i=0;i<g.attributes.position.count;i++)indices.push(i+offset);offset+=g.attributes.position.count}
   merged.setIndex(indices);merged.computeBoundingSphere()
   const mesh=new T.Mesh(merged,meshes[0].material);mesh.name=group.name+'-batch';mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow
   for(let i=0;i<meshes.length;i++){group.remove(meshes[i]);meshes[i].geometry.dispose();geometries[i].dispose()}
   group.add(mesh)
  }
 }
 visit(root);return root
}

// Merge across static groups while keeping each animation's local coordinate frame
export function batchStaticHierarchy(root){
 const animated=new Set((root.userData.motions??[]).map(m=>m.obj)),buckets=new Map()
 root.updateMatrixWorld(true)
 root.traverse(object=>{
  if(!object.isMesh||animated.has(object)||Array.isArray(object.material))return
  let anchor=object.parent
  while(anchor!==root&&!animated.has(anchor))anchor=anchor.parent
  const keys=Object.keys(object.geometry.attributes).sort().join(',')
  const key=anchor.uuid+'|'+object.material.uuid+'|'+keys+'|'+object.castShadow+'|'+object.receiveShadow
  if(!buckets.has(key))buckets.set(key,{anchor,objects:[]})
  buckets.get(key).objects.push(object)
 })
 for(const {anchor,objects} of buckets.values()){
  if(objects.length<2)continue
  const inverse=anchor.matrixWorld.clone().invert()
  const geometries=objects.map(o=>o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)))
  const merged=new T.BufferGeometry()
  for(const key of Object.keys(geometries[0].attributes)){
   const attrs=geometries.map(g=>g.attributes[key]),first=attrs[0]
   const data=new first.array.constructor(attrs.reduce((n,a)=>n+a.array.length,0));let offset=0
   for(const a of attrs){data.set(a.array,offset);offset+=a.array.length}
   merged.setAttribute(key,new T.BufferAttribute(data,first.itemSize,first.normalized))
  }
  const indices=[];let offset=0
  for(const g of geometries){if(g.index)for(const i of g.index.array)indices.push(i+offset);else for(let i=0;i<g.attributes.position.count;i++)indices.push(i+offset);offset+=g.attributes.position.count}
  merged.setIndex(indices);merged.computeBoundingSphere()
  const mesh=new T.Mesh(merged,objects[0].material);mesh.name=anchor.name+'-surface-batch';mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=objects[0].receiveShadow
  for(const object of objects){object.removeFromParent();if(!object.geometry.userData.sharedAsset)object.geometry.dispose()}
  geometries.forEach(g=>g.dispose());anchor.add(mesh)
 }
 return root
}
