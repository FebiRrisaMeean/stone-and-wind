import * as T from '../vendor/three.module.js'
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js'
import {WOODLAND_PATHS,woodlandPlacements} from './woodland-layout.js?v=pages40-season-world'
import {forestCullingEnabled,woodlandCells,woodlandInstanceCells,FOREST_CELL_SIZE} from './woodland-cells.js?v=pages40-season-world'
const templates=new Map(),materials=new Map()
await Promise.all(['elder','oak','spruce','shrub'].map(async name=>{
 try{const file=name!=='elder'&&new URLSearchParams(globalThis.location?.search??'').get('forestDensity')!=='classic'?name+'-dense':name;const gltf=await new GLTFLoader().loadAsync(new URL(`./assets/night-environment/${file}.glb`,import.meta.url).href)
  const scene=gltf.scene;scene.updateMatrixWorld(true);const box=new T.Box3().setFromObject(scene),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),normalizer=new T.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new T.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z)),parts=[]
  scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(normalizer.clone().multiply(o.matrixWorld));geo.userData.sharedAsset=true;parts.push({geometry:geo,material:o.material})});templates.set(name,parts)
 }catch(e){console.warn('Woodland asset unavailable: '+name,e)}
}))
function seasonalMaterial(base,kind,season){
 const key=base.uuid+':'+kind+':'+season;if(materials.has(key))return materials.get(key)
 const m=base.clone();m.roughness=.95;m.metalness=0;if(m.map)m.map.anisotropy=4;m.userData.sharedAsset=true;m.userData.seasonInvariant=true
 const autumn=season==='AUTUMN'&&kind!=='spruce',winter=season==='WINTER',spring=season==='SPRING'
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying float forestUp;\n'+shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nforestUp=objectNormal.y;')
  shader.fragmentShader='varying float forestUp;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float foliageMask=smoothstep(0.67,0.90,diffuseColor.g/max(diffuseColor.r,0.001))*smoothstep(1.25,1.8,diffuseColor.g/max(diffuseColor.b,0.001));
   ${autumn?'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.7,0.83,0.42),foliageMask*.90);':''}
   ${spring?'diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.15,.96),foliageMask*.55);':''}
   ${winter?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.86,.85),smoothstep(.18,.8,forestUp)*.88);':''}
  `)
 }
 m.customProgramCacheKey=()=>`forest-${kind}-${season}`;materials.set(key,m);return m
}
export function createWoodlandAsset(kind,season='SUMMER',height=1){
 const parts=templates.get(kind);if(!parts)return null
 const g=new T.Group();g.name=`woodland-${kind}`;g.userData.woodlandAsset=true
 for(const p of parts){const m=new T.Mesh(p.geometry,seasonalMaterial(p.material,kind,season));m.castShadow=true;m.receiveShadow=true;g.add(m)}g.scale.setScalar(height);if(kind==='elder')g.scale.multiply(new T.Vector3(.78,1.23,.78));return g
}
export function addWoodlandAssets(view,state){
 if(!templates.has('oak')||!templates.has('spruce'))return false
 const layout=woodlandPlacements(state),spatialCulling=forestCullingEnabled(globalThis.location?.search??'');let triangles=0,calls=0
 for(const peak of state.cityScene?.decor?.mountains??[]){
  const g=new T.DodecahedronGeometry(1,1);g.scale(peak.width/2,peak.height,peak.depth/2);
  const mesh=new T.Mesh(g,view.material(state.season==='WINTER'?0xb9c3ba:0x7c8a7e));
  mesh.position.set(peak.x,view.heightAt(peak.x,peak.z)-peak.height*.35,peak.z);mesh.rotation.y=peak.x*.31;mesh.receiveShadow=true;mesh.castShadow=true;view.detail.add(mesh);
 }
 // Gateway framing is provided by the validated grove layout, never unchecked trees inside clearings
 for(const kind of ['oak','spruce','shrub']){const entries=(kind==='shrub'?layout.shrubs:layout.trees.filter(t=>t.kind===kind));if(!entries.length)continue
  const cells=woodlandCells(entries,spatialCulling)
  for(const p of templates.get(kind)??[]){
   const meshes=woodlandInstanceCells(p.geometry,seasonalMaterial(p.material,kind,state.season),cells,(x,z)=>view.heightAt(x,z),kind)
   for(const mesh of meshes)view.detail.add(mesh)
   triangles+=entries.length*(p.geometry.index?.count??p.geometry.attributes.position.count)/3;calls+=meshes.length
  }
 }
 view.woodlandStats={trees:layout.trees.length,shrubs:layout.shrubs.length,triangles,drawCalls:calls,spatialCulling,cellSize:spatialCulling?FOREST_CELL_SIZE:null};return true
}
export function addWoodlandPaths(view,state){
 const color=new T.Color(state.season==='WINTER'?0xcad0be:state.season==='AUTUMN'?0xb99869:0xc1af83)
 const points=[],indices=[],colors=[]
 for(const path of WOODLAND_PATHS){const curve=new T.CatmullRomCurve3(path.map(([x,z])=>new T.Vector3(x,0,z))),steps=Math.ceil(curve.getLength()*4),offset=points.length/3
  for(let i=0;i<=steps;i++){const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t),width=(.68+.07*Math.sin(t*37))*Math.min(1,.25+Math.sin(t*Math.PI)*4);for(const side of [-1,-.62,.62,1]){const x=p.x+d.z*width*side,z=p.z-d.x*width*side;points.push(x,view.heightAt(x,z)+.027,z);colors.push(color.r,color.g,color.b,Math.abs(side)===1?0:.66)}if(i<steps)for(let j=0;j<3;j++){const a=offset+i*4+j;indices.push(a,a+4,a+1,a+1,a+4,a+5)}}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,4));g.setIndex(indices);g.computeVertexNormals();const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,transparent:true,depthWrite:false,roughness:1,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}));mesh.receiveShadow=true;view.detail.add(mesh)
}
