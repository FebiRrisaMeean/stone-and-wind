import {createMovementWorld,moveWorker,known,assignWorkerIdentity} from './movement.js?v=20261111-14';
import {WORLD} from './data.js?v=20261111-14';
import {WorldView} from './world.js?v=20261111-14';

const saveKey='stone-wind-movement-v1';
const atlas=new URL('./assets/worker-portraits-v1.jpg',import.meta.url).href;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountGame(root){
  let state=createMovementWorld({seed:4811});
  try{
    const saved=JSON.parse(localStorage.getItem(saveKey)||'null');
    if(saved?.sandbox&&saved.mode==='movement'&&saved.units?.length===6&&saved.units.every(u=>u.owner===0&&u.kind==='worker'&&Number.isFinite(u.x)&&Number.isFinite(u.z))&&saved.tiles?.length===WORLD.width*WORLD.height)state=assignWorkerIdentity(saved);
  }catch{}
  let selected=state.units[0].id,toastTimer;
  const activePaths=new Map();
  root.innerHTML=`<div class="game-shell movement-shell"><div class="world-stage" id="world-stage" aria-label="Карта для перемещения рабочих"></div><div class="minimap-panel" data-camera-ui><canvas id="minimap" width="360" height="230" role="img" aria-label="Миникарта"></canvas></div><nav class="portrait-dock" id="workers" data-camera-ui aria-label="Выбор рабочих"></nav><div class="toast" id="toast" role="status"></div></div>`;
  const $=id=>root.querySelector('#'+id);
  const world=new WorldView($('world-stage'),pick);
  const moving=id=>world.isUnitMoving(id);
  function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
  function focusWorker(id){const u=state.units.find(v=>v.id===id),p=world.getUnitPosition(id)??u;if(p)world.focusAt(p.x,p.z);}
  function select(id,focus=false){
    const u=state.units.find(v=>v.id===id);if(!u)return;
    world.cancelFollow();selected=id;render();
    if(focus)focusWorker(id);
    if(moving(id))world.followUnit(id);
  }
  function render(){
    world.render(state,0,{selected,menu:false});
    $('workers').innerHTML=state.units.map(u=>{
      const p=Number.isInteger(u.portrait)?u.portrait:0;
      return `<button class="worker-portrait ${u.id===selected?'selected':''}" data-worker="${u.id}" aria-label="${escapeHtml(u.name)}" aria-pressed="${u.id===selected}" title="${escapeHtml(u.name)}"><span class="portrait-image" aria-hidden="true" style="background-image:url('${atlas}');background-position:${p%3*50}% ${Math.floor(p/3)*100}%"></span><span class="portrait-name">${escapeHtml(u.name)}</span></button>`;
    }).join('');
    drawMinimap();
  }
  function remainingPath(id,path){
    const p=world.getUnitPosition(id);if(!p)return path;
    let best=0,distance=Infinity;
    for(let i=0;i<path.length;i++){const d=(path[i].x-p.x)**2+(path[i].z-p.z)**2;if(d<distance){distance=d;best=i;}}
    return path.slice(Math.max(0,best-1));
  }
  function pick(obj){
    if(obj.type==='unit'){select(obj.id);return;}
    if(obj.type!=='ground')return;
    if(moving(selected)){toast('Дождитесь, пока рабочий дойдёт до цели');return;}
    try{
      const reserved=[...activePaths].filter(([id])=>id!==selected&&moving(id)).flatMap(([id,path])=>remainingPath(id,path));
      state=moveWorker(state,selected,{x:obj.x,z:obj.z},{reserved});
      activePaths.set(selected,state.lastMove.path);persist();render();world.followUnit(selected);
    }catch(e){toast(e.message);}
  }
  function drawMinimap(){
    const c=$('minimap'),ctx=c.getContext('2d'),sx=c.width/WORLD.width,sz=c.height/WORLD.height;
    ctx.fillStyle='#1b292a';ctx.fillRect(0,0,c.width,c.height);
    const colors={plain:'#81946c',meadow:'#a0a37a',forest:'#415f50',rock:'#8d8d7a',road:'#c6b48a',water:'#557e86'};
    for(const t of state.tiles)if(known(state,0,t)){ctx.fillStyle=colors[t.type]??colors.plain;ctx.fillRect(t.x*sx,t.z*sz,sx+.5,sz+.5);}
    const b=WORLD.bases[0];ctx.fillStyle='#89a9d2';ctx.fillRect(b.x*sx-3,b.z*sz-3,6,6);
    for(const u of state.units){const p=world.getUnitPosition(u.id)??u;ctx.fillStyle=u.id===selected?'#fff0c2':'#a7bf9a';ctx.beginPath();ctx.arc(p.x*sx,p.z*sz,u.id===selected?3:2,0,Math.PI*2);ctx.fill();}
    const cam=world.getCameraState();ctx.save();ctx.translate(cam.target.x*sx,cam.target.z*sz);ctx.rotate(-cam.yaw);ctx.strokeStyle='#f6f0d4';ctx.lineWidth=1;ctx.strokeRect(-18/cam.zoom,-12/cam.zoom,36/cam.zoom,24/cam.zoom);ctx.restore();
  }
  function miniClick(e){
    const r=$('minimap').getBoundingClientRect();world.cancelFollow();
    world.focusAt((e.clientX-r.left)/r.width*WORLD.width,(e.clientY-r.top)/r.height*WORLD.height);drawMinimap();
  }
  function click(e){const el=e.target.closest('[data-worker]');if(el)select(el.dataset.worker,true);}
  function key(e){
    if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??''))return;
    if(/^[1-6]$/.test(e.key)){e.preventDefault();select(state.units[Number(e.key)-1].id,true);}
  }
  root.addEventListener('click',click);$('minimap').addEventListener('click',miniClick);window.addEventListener('keydown',key);
  persist();render();
  const timer=setInterval(()=>{for(const id of activePaths.keys())if(!moving(id))activePaths.delete(id);drawMinimap();},150);
  return()=>{clearInterval(timer);clearTimeout(toastTimer);world.dispose();root.removeEventListener('click',click);window.removeEventListener('keydown',key);};
}
