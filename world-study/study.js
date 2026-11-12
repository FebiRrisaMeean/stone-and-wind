import * as T from '../vendor/three.module.js'
import {CARD_STYLE_SAMPLE_NAMES,createCardStyleSample,animateCardStyleSample,createCardStyleClearing} from '../game/card-style-models.js?v=21'
import {prepareGameCard,gameCardFace} from '../game/game-source-cards.js?v=21'
import {SOURCE_CARD_NAMES} from '../game/source-card-map.js'

const descriptions={Architect:'Бобр, фиолетовый берет, светлая морда, чертёж и свитки',Bard:'Жёлтая птица, тёмные перья, лютня и движение крыла',Doctor:'Колючий учёный, очки, зелёный шарф, перо и синяя ягода',Crane:'Деревянная кабина, решётчатая стрела, блок и подвешенный груз','Resin Refinery':'Старое дерево, грибные полки и чаши с янтарной смолой','Clock Tower':'Каменная башня, соломенная крыша, часы и водяное колесо'}
const host=document.querySelector('#scene'),scene=new T.Scene();scene.background=new T.Color('#b4bea1');scene.fog=new T.FogExp2('#b4bea1',.035)
const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;host.appendChild(renderer.domElement)
const camera=new T.PerspectiveCamera(36,1,.1,60),target=new T.Vector3(0,.90,0)
scene.add(new T.HemisphereLight('#f9ecc9','#4c634a',2.0));const sun=new T.DirectionalLight('#ffedc1',3.3);sun.position.set(-3,7,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.025;sun.shadow.bias=-.00025;sun.shadow.radius=4;scene.add(sun)
const fill=new T.DirectionalLight('#bbd7cc',.75);fill.position.set(4,2,2);scene.add(fill)
const clearing=createCardStyleClearing();scene.add(clearing)
const models=new Map(CARD_STYLE_SAMPLE_NAMES.map(n=>{const m=createCardStyleSample(n);m.visible=false;m.scale.setScalar(1.20);scene.add(m);return[n,m]}))
const particles=new T.BufferGeometry(),positions=new Float32Array(55*3);for(let i=0;i<55;i++){positions[i*3]=Math.sin(i*9.31)*3.2;positions[i*3+1]=(i%17)/17*2.8;positions[i*3+2]=Math.cos(i*7.47)*2.6}particles.setAttribute('position',new T.BufferAttribute(positions,3));const pollen=new T.Points(particles,new T.PointsMaterial({color:'#e9dca8',size:.014,transparent:true,opacity:.56,depthWrite:false}));scene.add(pollen)
let selected='Architect',angle=.48,pitch=.28,distance=5.8,rotating=false,walking=false,far=false,drag=null,t=0,last=performance.now(),raf=0,serial=0
const nav=document.querySelector('#samples');nav.innerHTML=CARD_STYLE_SAMPLE_NAMES.map(name=>`<button type="button" data-name="${name}" aria-pressed="false">${SOURCE_CARD_NAMES[name]}</button>`).join('')
function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
function positionCamera(){camera.position.set(target.x+Math.sin(angle)*Math.cos(pitch)*distance,target.y+Math.sin(pitch)*distance,target.z-Math.cos(angle)*Math.cos(pitch)*distance);camera.lookAt(target)}
async function select(name){
 selected=name;walking=false;document.querySelector('#walk').setAttribute('aria-pressed','false');document.querySelector('#walk').disabled=!models.get(name).userData.isCritter
 for(const [n,m]of models){m.visible=n===name;m.position.set(0,0,0);m.rotation.y=0;m.userData.walking=false}
 for(const button of nav.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.name===name))
 document.querySelector('#sample-title').textContent=SOURCE_CARD_NAMES[name];document.querySelector('#art-details').textContent=descriptions[name];document.querySelector('#source-card').innerHTML=gameCardFace(name);document.querySelector('#load-error').hidden=true
 angle=.48;pitch=.28;target.y=models.get(name).userData.isCritter?.9:1.1;distance=far?9.8:5.8
 const request=++serial
 try{await prepareGameCard(name);if(request===serial)document.querySelector('#source-card').innerHTML=gameCardFace(name)}catch(error){if(request===serial){const box=document.querySelector('#load-error');box.hidden=false;box.textContent='Не удалось загрузить исходную карточку';console.error(error)}}
}
nav.addEventListener('click',e=>{const b=e.target.closest('button');if(b)select(b.dataset.name)})
document.querySelector('#front-view').onclick=()=>{angle=0;pitch=.19;distance=far?9.8:5.8;rotating=false;document.querySelector('#rotate').setAttribute('aria-pressed','false')}
document.querySelector('#rotate').onclick=e=>{rotating=!rotating;e.currentTarget.setAttribute('aria-pressed',String(rotating))}
document.querySelector('#walk').onclick=e=>{walking=!walking;e.currentTarget.setAttribute('aria-pressed',String(walking));if(!walking){models.get(selected).position.set(0,0,0);models.get(selected).rotation.y=0}}
document.querySelector('#scale').onclick=e=>{far=!far;distance=far?9.8:5.8;e.currentTarget.setAttribute('aria-pressed',String(far))}
host.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;drag={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);rotating=false;document.querySelector('#rotate').setAttribute('aria-pressed','false')})
host.addEventListener('pointermove',e=>{if(!drag)return;angle-=(e.clientX-drag.x)*.007;pitch=Math.max(.10,Math.min(.95,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY}})
host.addEventListener('pointerup',e=>{drag=null;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId)})
host.addEventListener('contextmenu',e=>e.preventDefault());host.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(3.6,Math.min(10.5,distance+e.deltaY*.005))},{passive:false})
host.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();angle+=e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0;pitch=Math.max(.10,Math.min(.95,pitch+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0)))}})
const observer=new ResizeObserver(resize);observer.observe(host)
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;if(rotating)angle+=dt*.24;const model=models.get(selected);model.userData.walking=walking
 if(walking){const a=t*.43;model.position.set(Math.sin(a)*.70,0,Math.cos(a)*.45);model.rotation.y=Math.atan2(-Math.cos(a)*.70,Math.sin(a)*.45)}
 animateCardStyleSample(model,t);pollen.rotation.y=t*.018;positionCamera();renderer.render(scene,camera);raf=requestAnimationFrame(frame)}
resize();select(selected);raf=requestAnimationFrame(frame)
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose()},{once:true})
