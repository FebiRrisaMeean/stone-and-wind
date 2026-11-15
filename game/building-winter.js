import * as T from '../vendor/three.module.js';
const enabled=new URLSearchParams(globalThis.location?.search??'').get('winterBuildings')!=='off';
// A surface coating, not extra geometry: textures, silhouettes and rigid parts stay intact
export function applyBuildingWinter(root,season){
 if(!enabled)return;
 const winter=String(season).toUpperCase()==='WINTER';
 if(root.userData.buildingWinter===winter)return;
 root.userData.buildingWinter=winter;
 root.updateWorldMatrix(true,true);
 const box=new T.Box3();root.traverse(mesh=>{if(mesh.isMesh&&!mesh.isSkinnedMesh&&mesh.geometry){mesh.geometry.computeBoundingBox();box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}});
 if(box.isEmpty())return;const height=Math.max(.1,box.max.y-box.min.y);
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isSkinnedMesh||!mesh.material)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  const result=materials.map(source=>{
   if(source.userData.snowUniforms){source.userData.snowUniforms.amount.value=winter?1:0;return source;}
   if(!winter||!source.isMeshStandardMaterial)return source;
   const material=source.clone();material.userData={...source.userData,sharedAsset:false};
   const uniforms={amount:{value:1},base:{value:box.min.y},height:{value:height}};
   material.userData.snowUniforms=uniforms;
   const previous=source.onBeforeCompile;
   material.onBeforeCompile=shader=>{
    previous?.call(material,shader);
    shader.uniforms.snowAmount=uniforms.amount;shader.uniforms.snowBase=uniforms.base;shader.uniforms.snowHeight=uniforms.height;
    shader.vertexShader='varying vec3 vSnowWorld;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSnowWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 vSnowWorld; uniform float snowAmount; uniform float snowBase; uniform float snowHeight;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     vec3 snowNormal=inverseTransformDirection(normal,viewMatrix);
     float grain=sin(vSnowWorld.x*12.7+sin(vSnowWorld.z*9.1))*sin(vSnowWorld.z*14.3+vSnowWorld.y*8.2);
     float upward=smoothstep(.36,.78,snowNormal.y+grain*.08);
     float raised=smoothstep(.16,.42,(vSnowWorld.y-snowBase)/snowHeight);
     float snowMask=upward*raised*snowAmount;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.90,.94)+grain*.025,snowMask*.94);
    `);
   };
   material.customProgramCacheKey=()=> 'everdell-building-snow-v1';
   material.needsUpdate=true;return material;
  });
  mesh.material=Array.isArray(mesh.material)?result:result[0];
 });
}
