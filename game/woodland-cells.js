import * as T from '../vendor/three.module.js'

// Keep entire models together; the renderer tests their full bounds per camera/pass
export const FOREST_CELL_SIZE=16
export function forestCullingEnabled(search=''){
 const query=new URLSearchParams(search)
 return query.get('optimizations')!=='off'&&query.get('forestCulling')!=='off'
}
export function woodlandCells(entries,enabled=true,cellSize=FOREST_CELL_SIZE){
 if(!entries.length)return []
 if(!enabled)return [{key:'all',entries}]
 const cells=new Map(),size=Number.isFinite(cellSize)&&cellSize>0?cellSize:FOREST_CELL_SIZE
 for(const entry of entries){
  const key=Math.floor(entry.x/size)+':'+Math.floor(entry.z/size)
  if(!cells.has(key))cells.set(key,{key,entries:[]})
  cells.get(key).entries.push(entry)
 }
 return [...cells.values()]
}
export function woodlandInstanceCells(geometry,material,cells,heightAt,kind){
 const dummy=new T.Object3D(),meshes=[]
 for(const cell of cells){
  const mesh=new T.InstancedMesh(geometry,material,cell.entries.length)
  mesh.name='forest-'+kind+':'+cell.key
  for(let i=0;i<cell.entries.length;i++){
   const tree=cell.entries[i]
   dummy.position.set(tree.x,heightAt(tree.x,tree.z),tree.z)
   dummy.rotation.set(0,tree.r,0);dummy.scale.setScalar(tree.size);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)
  }
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false
  // Sphere contains transformed geometry including crowns outside nominal cell edges
  mesh.computeBoundingBox();mesh.computeBoundingSphere()
  mesh.userData.forestCell={key:cell.key,kind,count:cell.entries.length}
  meshes.push(mesh)
 }
 return meshes
}
