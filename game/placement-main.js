import {createPlacementWorld,placeWorker,playCard,passRound,CARDS,RESOURCES,getCardError,getPlacementError,isPlacementState} from './placement.js?v=20261111-15';
import {WORLD} from './data.js?v=20261111-15';
import {WorldView} from './world.js?v=20261111-15';

const saveKey='stone-wind-placement-v1';
const atlas=new URL('./assets/worker-portraits-v1.jpg',import.meta.url).href;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={production:'Производство',improvement:'Специалист',location:'Место работы'};
const cardIcons={farm:'♣',orchard:'❧',forester:'♧',mason:'◆',workshop:'⚒'};
const resourceText=(amount,signed=false)=>RESOURCES.filter(r=>amount?.[r.key]).map(r=>`${r.name}: ${signed&&amount[r.key]>0?'+':''}${amount[r.key]}`).join(' · ');

export function mountGame(root){
 let state=createPlacementWorld({seed:4811});
 try{const saved=JSON.parse(localStorage.getItem(saveKey)||'null');if(isPlacementState(saved))state=saved;}catch{}
 let selected=null,drawerOpen=false,tab='market',toastTimer,resetConfirm=false;
 root.innerHTML=`<div class="game-shell placement-shell"><div class="world-stage" id="world-stage" aria-label="Карта мест работы"></div><section class="round-info" id="round-info" data-camera-ui aria-label="Ход и ресурсы"></section><nav class="round-actions" data-camera-ui aria-label="Действия"><button id="cards-toggle" aria-controls="card-drawer" aria-expanded="false">Карты</button><button id="pass-round" class="pass-round">Завершить раунд</button></nav><section class="card-drawer" id="card-drawer" data-camera-ui hidden aria-label="Карты и поселение"><div class="card-toolbar"><div role="tablist" aria-label="Разделы карт"><button role="tab" id="tab-market" data-tab="market">Общие карты</button><button role="tab" id="tab-hand" data-tab="hand">На руке</button><button role="tab" id="tab-city" data-tab="city">Поселение</button></div><button class="new-game" id="new-game" title="Начать новую партию">Новая партия</button><button id="close-cards" aria-label="Закрыть карты">×</button></div><div class="card-list" id="card-list" role="tabpanel" tabindex="0"></div></section><div class="minimap-panel" data-camera-ui><canvas id="minimap" width="360" height="230" role="img" aria-label="Миникарта"></canvas></div><nav class="portrait-dock" id="workers" data-camera-ui aria-label="Рабочие текущего игрока"></nav><div class="toast" id="toast" role="status"></div><span class="sr-only" id="turn-announcement" aria-live="polite"></span></div>`;
 const $=id=>root.querySelector('#'+id);
 const world=new WorldView($('world-stage'),pick);
 function persist(){try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{}}
 function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
 function chooseAvailable(){selected=state.units.find(u=>u.owner===state.currentPlayer&&u.locationId===null)?.id??state.units.find(u=>u.owner===state.currentPlayer)?.id;}
 function select(id,focus=false){
  const u=state.units.find(v=>v.id===id);if(!u)return;
  if(u.owner!==state.currentPlayer){toast(`Сейчас ходит игрок ${state.currentPlayer+1}`);return;}
  selected=id;world.cancelFollow();render();
  if(focus){const pos=world.getUnitPosition(id)??u;world.focusAt(pos.x,pos.z);}
  if(world.isUnitMoving(id))world.followUnit(id);
 }
 function stock(amount,showZero=false){return RESOURCES.filter(r=>showZero||amount?.[r.key]).map(r=>`<span class="stock-item" title="${r.name}"><i aria-hidden="true" style="color:${r.color}">${r.icon}</i><span>${showZero?`${r.name} `:''}<b>${amount?.[r.key]??0}</b></span></span>`).join('');}
 function render(){
  const player=state.players[state.currentPlayer];
  root.querySelector('.placement-shell').dataset.player=state.currentPlayer;
  world.render(state,0,{selected,menu:false});
  $('round-info').innerHTML=`<div class="turn-line"><span class="player-dot player-${state.currentPlayer}"></span><strong>Ход игрока ${state.currentPlayer+1}</strong><span class="round-number">Раунд ${state.round}</span></div><div class="resource-stock">${stock(player.resources,true)}</div>`;
  $('turn-announcement').textContent=`Раунд ${state.round}, ход игрока ${state.currentPlayer+1}`;
  $('workers').innerHTML=state.units.filter(u=>u.owner===state.currentPlayer).map(u=>{
   const p=u.portrait??0,place=state.locations.find(l=>l.id===u.locationId);
   return `<button class="worker-portrait ${u.id===selected?'selected':''} ${place?'assigned':''}" data-worker="${u.id}" aria-label="${escapeHtml(u.name)}${place?`, ${escapeHtml(place.name)}`:''}" aria-pressed="${u.id===selected}" title="${escapeHtml(u.name)}${place?' — '+escapeHtml(place.name):''}"><span class="portrait-image" aria-hidden="true" style="background-image:url('${atlas}');background-position:${p%3*50}% ${Math.floor(p/3)*100}%">${place?'<span class="assigned-mark">✓</span>':''}</span><span class="portrait-name">${escapeHtml(u.name)}</span></button>`;
  }).join('');
  renderCards();drawMinimap();
 }
 function renderCards(){
  const player=state.players[state.currentPlayer];
  $('card-drawer').hidden=!drawerOpen;
  $('cards-toggle').setAttribute('aria-expanded',String(drawerOpen));
  $('cards-toggle').classList.toggle('active',drawerOpen);
  for(const key of ['market','hand','city']){const node=$('tab-'+key);node.setAttribute('aria-selected',String(tab===key));node.tabIndex=tab===key?0:-1;node.textContent=key==='market'?`Общие карты · ${state.market.length}`:key==='hand'?`На руке · ${player.hand.length}`:`Поселение · ${player.cards.length}`;}
  $('card-list').setAttribute('aria-labelledby','tab-'+tab);
  $('new-game').textContent=resetConfirm?'Сбросить партию?':'Новая партия';
  const list=tab==='market'?state.market:tab==='hand'?player.hand:player.cards;
  $('card-drawer').style.maxWidth=Math.max(560,Math.min(960,list.length*218+20))+'px';
  const previousScroll=$('card-list').scrollLeft;
  $('card-list').innerHTML=list.length?list.map(instance=>{
   const card=CARDS[instance.type],error=tab==='city'?null:getCardError(state,tab,instance.id);
   const shortage=RESOURCES.filter(r=>(card.cost[r.key]??0)>player.resources[r.key]).map(r=>`${r.name.toLowerCase()} — ${card.cost[r.key]-player.resources[r.key]}`).join(', ');
   const status=error==='Недостаточно ресурсов'?`Не хватает: ${shortage}`:error;
   return `<article class="game-card ${card.category}"><div class="card-heading"><span class="card-sigil" aria-hidden="true">${cardIcons[instance.type]}</span><div><span class="card-category">${categories[card.category]}</span><h2>${card.name}</h2></div></div><p class="card-effect">${card.description}</p>${tab==='city'?`<div class="card-owned">${card.unique?'Не более одного в поселении':''}</div>`:`<div class="card-cost" aria-label="Стоимость: ${resourceText(card.cost)}">${stock(card.cost)}</div><button class="play-card" data-card="${instance.id}" data-source="${tab}" ${error?'disabled':''} title="${escapeHtml(status??'Разыграть карту')}">${error?escapeHtml(status):card.category==='improvement'?'Нанять':'Построить'}</button>`}</article>`;
  }).join(''):`<p class="empty-cards">${tab==='city'?'В поселении пока нет построек и специалистов':tab==='hand'?'На руке нет карт — их можно получить на рынке':'Общие карты закончились'}</p>`;
  $('card-list').scrollLeft=previousScroll;
 }
 function commit(action){
  try{
   const old=state,previousPlayer=state.currentPlayer,next=action();state=next;resetConfirm=false;chooseAvailable();persist();render();
   if(state.round!==old.round){world.cancelFollow();toast(`Раунд ${state.round} — рабочие вернулись, производство получено`);}
   else if(state.lastAction?.type==='place'){
    const u=state.units.find(v=>v.id===state.lastAction.workerId),l=state.locations.find(v=>v.id===state.lastAction.locationId);
    const delta=Object.fromEntries(RESOURCES.map(r=>[r.key,state.players[previousPlayer].resources[r.key]-old.players[previousPlayer].resources[r.key]]));
    toast(`${u.name} → ${l.name} · ${resourceText(delta,true)}${l.draw&&state.players[previousPlayer].hand.length>old.players[previousPlayer].hand.length?' · +1 карта':''}`);world.followUnit(u.id);
   }else if(state.lastAction?.type==='card')toast(`Игрок ${previousPlayer+1}: ${CARDS[state.lastAction.cardType].name}`);
   else toast(`Игрок ${previousPlayer+1} завершил раунд`);
  }catch(e){toast(e.message);}
 }
 function pick(obj){
  if(obj.type==='unit'){select(obj.id);return;}
  const location=obj.type==='location'?state.locations.find(l=>l.id===obj.id):obj.type==='ground'?state.locations.filter(l=>Math.hypot(l.x-obj.x,l.z-obj.z)<=2.5).sort((a,b)=>Math.hypot(a.x-obj.x,a.z-obj.z)-Math.hypot(b.x-obj.x,b.z-obj.z))[0]:null;
  if(!location){if(obj.type==='ground')toast('Отправьте рабочего в место работы — нажмите на его название');return;}
  const error=getPlacementError(state,selected,location.id);if(error){toast(error);return;}
  commit(()=>placeWorker(state,selected,location.id));
 }
 function drawMinimap(){
  const c=$('minimap'),ctx=c.getContext('2d'),sx=c.width/WORLD.width,sz=c.height/WORLD.height;
  const colors={plain:'#81946c',meadow:'#a0a37a',forest:'#415f50',rock:'#8d8d7a',road:'#c6b48a',water:'#557e86'};
  ctx.fillStyle='#1b292a';ctx.fillRect(0,0,c.width,c.height);
  for(const t of state.tiles){ctx.fillStyle=colors[t.type]??colors.plain;ctx.fillRect(t.x*sx,t.z*sz,sx+.5,sz+.5);}
  for(const l of state.locations){ctx.fillStyle=l.workers.length?'#c6a86e':'#f0e2b9';ctx.fillRect(l.x*sx-2,l.z*sz-2,4,4);}
  for(const u of state.units){const pos=world.getUnitPosition(u.id)??u;ctx.fillStyle=u.id===selected?'#fff0c2':u.owner===0?'#8caee0':'#85c9a8';ctx.beginPath();ctx.arc(pos.x*sx,pos.z*sz,u.id===selected?3:2,0,Math.PI*2);ctx.fill();}
  const cam=world.getCameraState();ctx.save();ctx.translate(cam.target.x*sx,cam.target.z*sz);ctx.rotate(-cam.yaw);ctx.strokeStyle='#f6f0d4';ctx.lineWidth=1;ctx.strokeRect(-18/cam.zoom,-12/cam.zoom,36/cam.zoom,24/cam.zoom);ctx.restore();
 }
 function miniClick(e){const r=$('minimap').getBoundingClientRect();world.cancelFollow();world.focusAt((e.clientX-r.left)/r.width*WORLD.width,(e.clientY-r.top)/r.height*WORLD.height);drawMinimap();}
 function click(e){
  const worker=e.target.closest('[data-worker]');if(worker){select(worker.dataset.worker,true);return;}
  const card=e.target.closest('[data-card]');if(card){commit(()=>playCard(state,card.dataset.source,card.dataset.card));return;}
  const pane=e.target.closest('[data-tab]');if(pane){tab=pane.dataset.tab;resetConfirm=false;renderCards();$('card-list').scrollLeft=0;return;}
  if(e.target.closest('#cards-toggle')){drawerOpen=!drawerOpen;resetConfirm=false;renderCards();}
  if(e.target.closest('#close-cards')){drawerOpen=false;resetConfirm=false;renderCards();$('cards-toggle').focus();}
  if(e.target.closest('#pass-round'))commit(()=>passRound(state));
  if(e.target.closest('#new-game')){
   if(!resetConfirm){resetConfirm=true;renderCards();return;}
   state=createPlacementWorld({seed:4811});resetConfirm=false;chooseAvailable();persist();world.cancelFollow();world.gameSeed=null;render();world.focusAt(10,25);world.desiredZoom=1.0;toast('Новая партия');
  }
 }
 function key(e){
  if(e.altKey||e.ctrlKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName??''))return;
  if(/^[1-3]$/.test(e.key)){e.preventDefault();select(state.units.filter(u=>u.owner===state.currentPlayer)[Number(e.key)-1].id,true);}
  if(e.key==='Escape'&&drawerOpen){drawerOpen=false;resetConfirm=false;renderCards();$('cards-toggle').focus();}
  if(e.target.closest?.('[role="tab"]')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const tabs=['market','hand','city'];tab=tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];renderCards();$('tab-'+tab).focus();}
 }
 root.addEventListener('click',click);$('minimap').addEventListener('click',miniClick);window.addEventListener('keydown',key);
 chooseAvailable();persist();render();world.focusAt(10,25);world.desiredZoom=1.0;
 const timer=setInterval(drawMinimap,180);
 return()=>{clearInterval(timer);clearTimeout(toastTimer);world.dispose();root.removeEventListener('click',click);window.removeEventListener('keydown',key);};
}
