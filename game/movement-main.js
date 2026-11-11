import {createMovementWorld,moveWorker,known} from './movement.js?v=20261111-13';
import {WORLD} from './data.js?v=20261111-13';
import {WorldView} from './world.js?v=20261111-13';
import {icon,portrait} from './icons.js?v=20261111-13';

const saveKey='stone-wind-movement-v1';
const workerName=u=>u.name??`Рабочий ${u.number}`;

export function mountGame(root){
  let state=createMovementWorld({seed:4811});
  try{
    const saved=JSON.parse(localStorage.getItem(saveKey)||'null');
    if(saved?.sandbox&&saved.mode==='movement'&&saved.units?.length===6&&saved.units.every(u=>u.owner===0&&u.kind==='worker'&&Number.isFinite(u.x)&&Number.isFinite(u.z))&&saved.tiles?.length===WORLD.width*WORLD.height){
      state=saved;
      state.lastMove=null;
    }
  }catch{}
  let selected=state.units[0].id,help=false,toastTimer;const activePaths=new Map();
  root.innerHTML=`<div class="game-shell movement-shell">
    <div class="world-stage" id="world-stage" aria-label="Карта для перемещения рабочих"></div>
    <header class="topbar"><div class="brand">${icon('castle')}<span>Камень <em>и</em> ветер</span></div><span class="mode-caption">Свободное перемещение</span><div class="top-actions"><span class="worker-total">${icon('people')} 6 рабочих на карте</span><button class="icon-button" data-act="reset" aria-label="Сбросить позиции" title="Вернуть рабочих к началу">${icon('rotate')}</button><button class="icon-button" data-act="help" aria-label="Управление" title="Управление">${icon('help')}</button></div></header>
    <div class="map-instruction">${icon('move')}<div><strong>Выберите рабочего → нажмите на землю</strong><small>Перетаскивайте карту для движения камеры</small></div></div>
    <div class="map-controls" aria-label="Управление камерой">
      <button data-act="zoom" data-dir="1" aria-label="Приблизить" title="Приблизить">${icon('plus')}</button><button data-act="zoom" data-dir="-1" aria-label="Отдалить" title="Отдалить">${icon('minus')}</button><span></span>
      <button data-act="rotate" data-dir="-1" aria-label="Повернуть влево" title="Повернуть влево · Q">${icon('rotate','flipped')}</button><button data-act="rotate" data-dir="1" aria-label="Повернуть вправо" title="Повернуть вправо · E">${icon('rotate')}</button>
      <button data-act="tilt" data-dir="1" aria-label="Вид сверху" title="Вид сверху">⌃</button><button data-act="tilt" data-dir="-1" aria-label="Опустить камеру" title="Опустить камеру">⌄</button><button data-act="home" aria-label="К начальной точке" title="К начальной точке">${icon('home')}</button>
    </div>
    <aside class="movement-panel" id="selection"></aside>
    <section class="minimap-panel"><div class="minimap-heading">${icon('map')} ПОГРАНИЧЬЕ</div><canvas id="minimap" width="360" height="230" role="img" aria-label="Миникарта: нажмите, чтобы переместить камеру"></canvas><small>Нажмите для перехода</small></section>
    <section class="worker-bar" aria-label="Выбор рабочих"><button class="next-worker" data-act="next-worker" aria-label="Следующий рабочий" title="Перейти к следующему рабочему">${icon('rotate')}<span>РАБОЧИЕ<b>6</b></span></button><div class="worker-list" id="workers"></div></section>
    <div class="toast" id="toast" role="status"></div><div class="overlay-host" id="overlay"></div>
  </div>`;
  const $=id=>root.querySelector('#'+id);
  const world=new WorldView($('world-stage'),pick,hover);
  const moving=id=>world.isUnitMoving(id);
  function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);}
  function focusWorker(id){const u=state.units.find(v=>v.id===id),p=world.getUnitPosition(id)??u;if(p)world.focusAt(p.x,p.z);}
  function select(id,focus=false){const u=state.units.find(v=>v.id===id);if(!u)return;selected=id;render();if(focus)focusWorker(id);}
  function next(){const i=state.units.findIndex(u=>u.id===selected);select(state.units[(i+1)%state.units.length].id,true);}
  function render(){
    world.render(state,0,{selected,menu:false});world.inputPaused=help;if(help)world.keys.clear();
    const u=state.units.find(v=>v.id===selected);
    $('selection').innerHTML=`<div class="selected-heading">${portrait('worker')}<div><span class="eyebrow">ВЫБРАН</span><h1>${workerName(u)}</h1><span class="worker-state" id="selected-status"></span></div></div><p class="selection-instruction">Нажмите на свободное место на карте — рабочий пройдёт к нему</p><div class="position-line" id="selected-position"></div><button class="focus-button" data-act="focus">${icon('focus')} Показать рабочего</button>`;
    $('workers').innerHTML=state.units.map((u,i)=>`<button class="worker-chip ${u.id===selected?'selected':''}" data-act="worker" data-id="${u.id}" aria-label="${workerName(u)}" aria-pressed="${u.id===selected}">${portrait('worker')}<div><b>${workerName(u)}</b><small data-worker-status="${u.id}"></small></div><kbd>${i+1}</kbd></button>`).join('');
    $('overlay').innerHTML=help?`<div class="modal-scrim" data-act="close-help"></div><section class="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="icon-button modal-close" data-act="close-help" aria-label="Закрыть">${icon('close')}</button><span class="eyebrow">УПРАВЛЕНИЕ</span><h2 id="help-title">Прогулка по Пограничью</h2><p>Все шесть рабочих доступны сразу. Выберите фигурку на карте или карточку внизу и нажмите на землю</p><dl><div><dt>Рабочие 1–6</dt><dd>Клавиши 1–6</dd></div><div><dt>Движение камеры</dt><dd>Перетаскивание / WASD</dd></div><div><dt>Поворот камеры</dt><dd>Правая кнопка / Q и E</dd></div><div><dt>Масштаб</dt><dd>Колесо / кнопки + и −</dd></div><div><dt>Переход по карте</dt><dd>Нажатие на миникарту</dd></div></dl><p>На телефоне: один палец перемещает камеру, два — меняют масштаб и поворот</p><button class="focus-button" data-act="close-help">Вернуться на карту</button></section>`:'';
    updateMotion();drawMinimap();
  }
  function remainingPath(id,path){const p=world.getUnitPosition(id);if(!p)return path;let best=0,distance=Infinity;for(let i=0;i<path.length;i++){const d=(path[i].x-p.x)**2+(path[i].z-p.z)**2;if(d<distance){distance=d;best=i;}}return path.slice(Math.max(0,best-1));}
  function updateMotion(){
    for(const id of activePaths.keys())if(!moving(id))activePaths.delete(id);
    for(const u of state.units){const el=root.querySelector(`[data-worker-status="${u.id}"]`);if(el){const text=moving(u.id)?'Идёт к цели':'Готов к движению';if(el.textContent!==text)el.textContent=text;}}
    const u=state.units.find(v=>v.id===selected),walk=moving(selected);
    $('selected-status').textContent=walk?'Идёт к цели':'Готов к движению';
    $('selected-position').textContent=`${walk?'Цель':'Позиция'}: ${u.x}, ${u.z}`;
  }
  function hover(obj){if(!obj||help)return;world.canvas.style.cursor=obj.type==='unit'?'pointer':'grab';}
  function pick(obj){
    if(help)return;
    if(obj.type==='unit'){select(obj.id);return;}
    if(obj.type==='building'){world.resetCamera();return;}
    if(obj.type!=='ground')return;
    if(moving(selected)){toast('Рабочий уже идёт к выбранной точке');return;}
    try{const reserved=[...activePaths].filter(([id])=>id!==selected&&moving(id)).flatMap(([id,path])=>remainingPath(id,path));state=moveWorker(state,selected,{x:obj.x,z:obj.z},{reserved});activePaths.set(selected,state.lastMove.path);persist();render();}
    catch(e){toast(e.message);}
  }
  function drawMinimap(){
    const c=$('minimap'),ctx=c.getContext('2d'),sx=c.width/WORLD.width,sz=c.height/WORLD.height;
    ctx.fillStyle='#1b292a';ctx.fillRect(0,0,c.width,c.height);
    const colors={plain:'#81946c',meadow:'#a0a37a',forest:'#415f50',rock:'#8d8d7a',road:'#c6b48a',water:'#557e86'};
    for(const t of state.tiles)if(known(state,0,t)){ctx.fillStyle=colors[t.type]??colors.plain;ctx.fillRect(t.x*sx,t.z*sz,sx+.5,sz+.5);}
    const b=WORLD.bases[0];ctx.fillStyle='#89a9d2';ctx.fillRect(b.x*sx-3,b.z*sz-3,6,6);
    for(const u of state.units){ctx.fillStyle=u.id===selected?'#fff0c2':'#a7bf9a';ctx.beginPath();const pos=world.getUnitPosition(u.id)??u;ctx.arc(pos.x*sx,pos.z*sz,u.id===selected?3:2,0,Math.PI*2);ctx.fill();}
    const cam=world.getCameraState();ctx.save();ctx.translate(cam.target.x*sx,cam.target.z*sz);ctx.rotate(-cam.yaw);ctx.strokeStyle='#f6f0d4';ctx.lineWidth=1;ctx.strokeRect(-18/cam.zoom,-12/cam.zoom,36/cam.zoom,24/cam.zoom);ctx.restore();
  }
  function miniClick(e){const r=$('minimap').getBoundingClientRect();world.focusAt((e.clientX-r.left)/r.width*WORLD.width,(e.clientY-r.top)/r.height*WORLD.height);drawMinimap();}
  function click(e){
    const el=e.target.closest('[data-act]');if(!el||el.disabled)return;
    const act=el.dataset.act;
    if(act==='worker')select(el.dataset.id,true);
    if(act==='next-worker')next();
    if(act==='focus')focusWorker(selected);
    if(act==='home')world.resetCamera();
    if(act==='zoom')world.setZoom(Number(el.dataset.dir)*.13);
    if(act==='rotate')world.rotateCamera(-Number(el.dataset.dir)*.35);
    if(act==='tilt')world.tiltCamera(Number(el.dataset.dir)*.12);
    if(act==='help'){help=true;render();$('overlay').querySelector('[aria-label="Закрыть"]').focus();}
    if(act==='close-help'){help=false;render();}
    if(act==='reset'){activePaths.clear();state=createMovementWorld({seed:state.seed});selected=state.units[0].id;help=false;world.resetScene();persist();render();toast('Все рабочие вернулись к начальной точке');}
  }
  function key(e){if(e.key==='Escape'&&help){help=false;render();return;}if(help||e.altKey||e.ctrlKey||e.metaKey)return;if(/^[1-6]$/.test(e.key)){e.preventDefault();select(state.units[Number(e.key)-1].id,true);}}
  root.addEventListener('click',click);$('minimap').addEventListener('click',miniClick);window.addEventListener('keydown',key);
  render();
  const timer=setInterval(()=>{updateMotion();drawMinimap();},150);
  return()=>{clearInterval(timer);clearTimeout(toastTimer);world.dispose();root.removeEventListener('click',click);window.removeEventListener('keydown',key);};
}
