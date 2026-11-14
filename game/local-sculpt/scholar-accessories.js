import * as T from '../../vendor/three.module.js'
const berryMaterial=new T.MeshStandardMaterial({color:0x465780,roughness:.86}),crownMaterial=new T.MeshStandardMaterial({color:0x29354e,roughness:1}),featherMaterial=new T.MeshStandardMaterial({color:0xeee3c9,roughness:.93}),shaftMaterial=new T.MeshStandardMaterial({color:0xc8b58c,roughness:.9})
let berryTemplate,quillTemplate
function shared(root){root.traverse(o=>{if(o.isMesh){o.geometry.userData.sharedAsset=true;o.material.userData.sharedAsset=true;o.material.userData.seasonInvariant=true;o.castShadow=true}});return root}
function berry(){if(berryTemplate)return berryTemplate.clone(true);const g=new T.Group();g.name='ScholarBlueberry';const fruit=new T.Mesh(new T.SphereGeometry(.054,20,14),berryMaterial);fruit.scale.y=.94;g.add(fruit);const crown=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.008:.019;const x=Math.sin(a)*r,y=Math.cos(a)*r;if(!i)crown.moveTo(x,y);else crown.lineTo(x,y)}crown.closePath();const top=new T.Mesh(new T.ShapeGeometry(crown),crownMaterial);top.rotation.x=-Math.PI/2;top.position.y=.051;g.add(top);berryTemplate=shared(g);return g.clone(true)}
function quill(){if(quillTemplate)return quillTemplate.clone(true);const g=new T.Group();g.name='ScholarQuill';const shape=new T.Shape();shape.moveTo(0,.025);shape.quadraticCurveTo(-.035,.095,.004,.20);shape.quadraticCurveTo(.034,.13,.018,.07);shape.lineTo(0,.025);const vane=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.002,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.001,bevelThickness:.001,curveSegments:10}),featherMaterial);const stem=new T.Mesh(new T.CylinderGeometry(.0012,.002,.20,7),shaftMaterial);stem.position.y=.08;g.add(vane,stem);quillTemplate=shared(g);return g.clone(true)}
export function attachScholarAccessories(root,model){
 const attachments=[];root.updateMatrixWorld(true)
 for(const [name,make,offset] of [['RightHand',berry,new T.Vector3(0,.025,-.070)],['LeftHand',quill,new T.Vector3(0,-.015,-.065)]]){
  const hand=model.getObjectByName(name);if(!hand)continue
  const object=make(),p=hand.getWorldPosition(new T.Vector3());root.worldToLocal(p);object.position.copy(p).add(offset);root.add(object);root.updateMatrixWorld(true);hand.attach(object);attachments.push({hand,object})
 }
 return attachments
}
