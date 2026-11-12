import * as T from '../vendor/three.module.js'
import {SCHOLAR_VARIANTS,createScholarVariant,animateScholarVariant} from '../game/scholar-variants.js?v=1'

const stages=[],controls=document.querySelector('.controls'),silhouetteMaterial=new T.MeshBasicMaterial({color:'#27342c',side:T.DoubleSide})
let yaw=-.52,pitch=.16,distance=4.5,rotation=false,silhouette=false,animated=true,drag=null,last=performance.now(),clock=0,raf
const target=new T.Vector3(0,.88,-.12)
document.getElementById('source-toggle').onclick=e=>{const full=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(full));e.currentTarget.textContent=full?'Только иллюстрация':'Карточка целиком';const box=full?[0,0,344,483]:[52,7,286,253];document.getElementById('source-crop').setAttribute('viewBox',box.join(' '));['x','y','width','height'].forEach((key,i)=>document.querySelector('#source-boundary rect').setAttribute(key,box[i]))}
function setup(variant){
 const host=document.getElementById('view-'+variant.id),scene=new T.Scene()
 scene.background=new T.Color('#d6d8ce')
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.appendChild(renderer.domElement)
 const camera=new T.PerspectiveCamera(33,1,.05,25)
 scene.add(new T.HemisphereLight('#f5f4ed','#666b5f',2.2))
 const key=new T.DirectionalLight('#fff5e4',3.1);key.position.set(-3,5,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-2.5,right:2.5,top:3,bottom:-2.5,near:.1,far:15});key.shadow.normalBias=.025;scene.add(key)
 const fill=new T.DirectionalLight('#e4e9f0',1.0);fill.position.set(4,3,1);scene.add(fill)
 const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#c7c9ba',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.013;floor.receiveShadow=true;scene.add(floor)
 const model=createScholarVariant(variant.id);scene.add(model)
 model.traverse(obj=>{if(obj.isMesh){obj.userData.originalMaterial=obj.material;obj.castShadow=true;obj.receiveShadow=true}})
 const stage={host,scene,renderer,camera,model};stages.push(stage)
 const resize=()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(host);stage.observer=observer;resize()
 host.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;drag={host,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);rotation=false;updateControls()})
 host.addEventListener('pointermove',e=>{if(drag?.host!==host)return;yaw-=(e.clientX-drag.x)*.008;pitch=T.MathUtils.clamp(pitch+(e.clientY-drag.y)*.005,-.03,.68);drag.x=e.clientX;drag.y=e.clientY;clearView()})
 const release=e=>{drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId)};host.addEventListener('pointerup',release);host.addEventListener('pointercancel',release)
 host.addEventListener('contextmenu',e=>e.preventDefault())
 host.addEventListener('wheel',e=>{e.preventDefault();distance=T.MathUtils.clamp(distance+e.deltaY*.004,3.25,6.6)},{passive:false})
 host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();yaw+=e.key==='ArrowLeft'?.16:e.key==='ArrowRight'?-.16:0;pitch=T.MathUtils.clamp(pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),-.03,.68);rotation=false;clearView();updateControls()})
}
function clearView(){for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed','false')}
function updateControls(){document.getElementById('rotate').setAttribute('aria-pressed',String(rotation));document.getElementById('silhouette').setAttribute('aria-pressed',String(silhouette));document.getElementById('animation').setAttribute('aria-pressed',String(animated))}
controls.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return
 if(b.dataset.view){yaw={reference:-.52,front:0,side:-Math.PI/2,back:Math.PI}[b.dataset.view];pitch=b.dataset.view==='reference'?.16:.10;rotation=false;clearView();b.setAttribute('aria-pressed','true')}
 if(b.id==='rotate'){rotation=!rotation;clearView()}
 if(b.id==='animation')animated=!animated
 if(b.id==='silhouette'){silhouette=!silhouette;for(const {model}of stages)model.traverse(o=>{if(o.isMesh)o.material=silhouette?silhouetteMaterial:o.userData.originalMaterial})}
 updateControls()
})
try{SCHOLAR_VARIANTS.forEach(setup)}catch(error){document.getElementById('load-error').hidden=false;document.getElementById('load-error').textContent='Не удалось открыть 3D-этюды';console.error(error)}
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(animated)clock+=dt;if(rotation)yaw+=dt*.28;const viewDistance=distance*Math.max(1,.78/Math.min(...stages.map(s=>s.camera.aspect)));for(const s of stages){animateScholarVariant(s.model,clock);s.camera.position.set(Math.sin(yaw)*Math.cos(pitch)*viewDistance,target.y+Math.sin(pitch)*viewDistance,-Math.cos(yaw)*Math.cos(pitch)*viewDistance);s.camera.lookAt(target);s.renderer.render(s.scene,s.camera)}raf=requestAnimationFrame(frame)}
raf=requestAnimationFrame(frame)
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);for(const s of stages){s.observer.disconnect();s.renderer.dispose();s.scene.traverse(o=>o.geometry?.dispose())}silhouetteMaterial.dispose()},{once:true})
