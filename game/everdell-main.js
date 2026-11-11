import {cardArt,portraitStyle,placeArt,resourceIcon} from './everdell/art.js?v=20261111-17';
import {createGame,stepGame,serializeGame,restoreGame,getPaymentOptions,getScores,Card,Location,Event,CardName,LocationOccupancy,GameInputType,Season,CardType,PlayerStatus} from './everdell/engine.js?v=20261111-17';
import {CARD_NAMES,CARD_TEXT,LOCATION_NAMES,LOCATION_TEXT,EVENT_NAMES,EVENT_TEXT,SEASONS,CARD_TYPES,RESOURCE_NAMES,translateText} from './everdell/locale.js?v=20261111-17';
import {createMovementWorld,moveWorker} from './movement.js?v=20261111-17';
import {WORLD} from './data.js?v=20261111-17';
import {WorldView} from './world.js?v=20261111-17';

const SAVE='stone-wind-everdell-v1';
const RESOURCE_KEYS=['TWIG','RESIN','PEBBLE','BERRY'];
const SYMBOL={TWIG:'♣',RESIN:'⬟',PEBBLE:'◆',BERRY:'●',VP:'✧',CARD:'▱',ANY:'◇'};
const COLORS={TWIG:'#a6b98b',RESIN:'#e3b77a',PEBBLE:'#c4ced0',BERRY:'#dc9691',VP:'#ecd797'};
const CATEGORY={PRODUCTION:'production',GOVERNANCE:'improvement',DESTINATION:'location',PROSPERITY:'prosperity',TRAVELER:'traveler'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=s=>translateText(s??'').replace(/[.。]+\s*$/,'');
const cn=name=>CARD_NAMES[name]??name;
const ln=name=>LOCATION_NAMES[name]??name;
const en=name=>EVENT_NAMES[name]??name;
const stock=(resources,zero=false)=>[...RESOURCE_KEYS,'VP'].filter(r=>zero? r!=='VP'||resources[r]>0:resources?.[r]>0).map(r=>`<span class="stock-item" title="${esc(RESOURCE_NAMES[r]??r)}">${resourceIcon(r)}<b>${resources?.[r]??0}</b>${zero?`<span>${esc(RESOURCE_NAMES[r]??r)}</span>`:''}</span>`).join('');
const fmt=parts=>tr(parts);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const placeKey=w=>w.location?'l:'+w.location:w.event?'e:'+w.event:'c:'+w.playedCard?.cardOwnerId+':'+w.playedCard?.cardName;

export function mountGame(root){
 let game=createGame({playerCount:2}),drawing=null,selected=null,tab='meadow',open=false,cityPlayer=null,pendingIndex=0,promptChoice=[],promptResources={},payment=null,menu=false,toastTimer,actions=new Map(),actionCounter=0;
 try{const saved=JSON.parse(localStorage.getItem(SAVE)||'null');if(saved)game=restoreGame(saved);}catch{}
 const baseMap=createMovementWorld({seed:4811}),names=['Данила','Еремей','Ефим','Тихон','Иван','Терентий','Мирон','Савва','Матвей','Яков','Игнат','Пётр','Борис','Глеб','Назар','Лукьян','Прохор','Роман','Семён','Фёдор','Кузьма','Андрей','Степан','Елисей'];
 root.innerHTML=`<div class="game-shell placement-shell everdell-shell"><div class="world-stage" id="world-stage" aria-label="Карта Эверделла"></div><section class="round-info" id="round-info" data-camera-ui aria-label="Игрок, сезон и ресурсы"></section><nav class="round-actions" data-camera-ui aria-label="Действия"><button id="cards-toggle" aria-controls="card-drawer" aria-expanded="false">Карты</button><button id="season-action"></button><button id="game-menu" aria-label="Настройки партии">☰</button></nav><section class="card-drawer" id="card-drawer" data-camera-ui hidden><div class="card-toolbar"><div role="tablist" aria-label="Разделы игры">${[['meadow','Поляна'],['hand','Рука'],['city','Города'],['events','События'],['places','Места']].map(([id,name])=>`<button role="tab" id="tab-${id}" data-tab="${id}">${name}</button>`).join('')}</div><button id="close-cards" aria-label="Закрыть карты">×</button></div><div id="panel-extra"></div><div class="card-list" id="card-list" role="tabpanel" tabindex="0"></div></section><div class="minimap-panel" data-camera-ui><canvas id="minimap" width="360" height="230" role="img" aria-label="Миникарта"></canvas></div><nav class="portrait-dock" id="workers" data-camera-ui aria-label="Работники текущего игрока"></nav><div id="decision-layer"></div><div class="toast" id="toast" role="status"></div><span class="sr-only" id="turn-announcement" aria-live="polite"></span></div>`;
 const $=id=>root.querySelector('#'+id);
 const world=new WorldView($('world-stage'),pick);
 const player=()=>game.getActivePlayer();
 const cardText=name=>name===CardName.FOOL&&game.gameOptions.solo?'В одиночной игре сбросьте шута и выбранную карту из города Ругворта':CARD_TEXT[name];
 const playerIndex=()=>game.players.findIndex(p=>p.playerId===game.activePlayerId);
 function save(){try{localStorage.setItem(SAVE,JSON.stringify(serializeGame(game)));}catch{}}
 function toast(s){$('toast').textContent=tr(s);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3600);}
 function command(data){const id='a'+(++actionCounter);actions.set(id,data);return id;}
 function labelForWorkerPlace(w){return w.location?ln(w.location):w.event?en(w.event):cn(w.playedCard.cardName);}
 function allowed(type){return game.getPossibleGameInputs().some(i=>i.inputType===type);}
 function activeTemplate(type){return game.getPossibleGameInputs().find(i=>i.inputType===type);}
 function project(){
  const old=drawing,view=structuredClone(baseMap);view.mode='placement';view.seed=4811;view.round=1+game.players.reduce((n,p)=>n+[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN].indexOf(p.currentSeason),0);view.serial=game.gameStateId;view.lastMove=null;view.locations=[];view.units=[];view.currentPlayer=playerIndex();
  view.players=game.players.map((p,i)=>({id:i,level:1,workers:0,gifts:[],explored:Array(WORLD.width*WORLD.height).fill(true)}));
  const locations=Object.keys(game.locationsMap),basics=locations.filter(n=>Location.fromName(n).type==='BASIC'),forests=locations.filter(n=>Location.fromName(n).type==='FOREST');
  const coords=[[3,16],[8,13],[14,14],[19,18],[21,24],[18,31],[12,35],[5,34]],fcoords=[[3,9],[13,7],[23,10],[26,16]];
  const locCoords=new Map();basics.forEach((n,i)=>locCoords.set(n,coords[i]));forests.forEach((n,i)=>locCoords.set(n,fcoords[i]));locCoords.set('HAVEN',[3,26]);['JOURNEY_TWO','JOURNEY_THREE','JOURNEY_FOUR','JOURNEY_FIVE'].forEach((n,i)=>locCoords.set(n,[22+i*2,37]));
  for(const n of locations){const loc=Location.fromName(n),pos=locCoords.get(n);if(!pos)continue;
   const gain=loc.resourcesToGain??{},reward={};for(const r of RESOURCE_KEYS)if(gain[r])reward[r.toLowerCase()]=gain[r];
   let capacity=loc.occupancy==='UNLIMITED'?null:loc.occupancy==='EXCLUSIVE_FOUR'&&game.players.length===4?2:1;
   view.locations.push({id:'ever:'+n,name:ln(n),x:pos[0],z:pos[1],capacity,owner:null,workers:[],reward,cost:{},description:LOCATION_TEXT[n]??fmt(loc.description??loc.shortName),kind:n.includes('TWIG')||n.includes('RESIN')?'wood':n.includes('STONE')||n.includes('PEBBLE')?'stone':n==='HAVEN'?'house':'food',effectText:'',actualName:n});
  }
  // Worker identity is visual only; the rules engine owns every placement
  for(let pi=0;pi<game.players.length;pi++){
   const p=game.players[pi],pj=p.toJSON(true),previous=old?.units.filter(u=>u.owner===pi&&u.number<=pj.numWorkers)??[],used=new Set(),assignments=[];
   for(const w of pj.placedWorkers){const key=placeKey(w);let oldUnit=previous.find(u=>u.placementKey===key&&!used.has(u.id));
    if(!oldUnit&&selected){const candidate=previous.find(u=>u.id===selected&&u.locationId===null&&!used.has(u.id));if(candidate&&candidate.owner===pi)oldUnit=candidate;}
    if(!oldUnit)oldUnit=previous.find(u=>u.locationId===null&&!used.has(u.id));
    let num=oldUnit?.number??1;while(used.has(`e-${pi}-${num}`))num++;
    const id=`e-${pi}-${num}`;used.add(id);assignments.push({w,id,num,key,oldUnit});
   }
   for(let num=1;num<=pj.numWorkers;num++){
    const id=`e-${pi}-${num}`,a=assignments.find(x=>x.id===id),home={x:4+(num-1)*2,z:22+pi*2};
    let x=home.x,z=home.z,locationId=null;
    if(a){const l=a.w.location?view.locations.find(l=>l.actualName===a.w.location):null;locationId=l?.id??a.key;
     if(l){const existing=view.units.filter(u=>u.locationId===l.id).length;x=l.x+(existing%3)-1;z=l.z+1+Math.floor(existing/3);l.workers.push(id);}
     else{x=23+pi*2;z=22+(num-1)*2;}
    }
    if(view.tiles[z*WORLD.width+x]?.type==='water')x-=2;
    view.units.push({id,number:num,name:names[pi*6+num-1],portrait:(num-1)%6,owner:pi,kind:'worker',x,z,home,hp:baseMap.units[0].hp,ready:1,attacked:0,locationId,placementKey:a?.key??null});
   }
  }
  if(old){const moved=view.units.find(u=>{const before=old.units.find(v=>v.id===u.id);return before&&u.locationId!==null&&u.placementKey!==before.placementKey;});
   if(moved){const before=old.units.find(u=>u.id===moved.id),temp=structuredClone(view);const v=temp.units.find(u=>u.id===moved.id);v.x=before.x;v.z=before.z;v.owner=0;
    try{const movedState=moveWorker(temp,moved.id,{x:moved.x,z:moved.z},{reserved:view.locations.map(l=>({x:l.x,z:l.z}))});view.lastMove={...movedState.lastMove,serial:game.gameStateId};}catch{}
   }
  }
  drawing=view;
 }
 function selectAvailable(){const p=playerIndex();if(!drawing.units.some(u=>u.id===selected&&u.owner===p&&u.locationId===null))selected=drawing.units.find(u=>u.owner===p&&u.locationId===null)?.id??drawing.units.find(u=>u.owner===p)?.id??null;}
 function step(input){
  try{game=stepGame(game,input);payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;project();selectAvailable();save();render();if(drawing.lastMove)world.followUnit(drawing.lastMove.id);else if(input.inputType===GameInputType.PREPARE_FOR_SEASON)world.cancelFollow();if(game.isGameOver())toast('Партия завершена');}
  catch(e){toast(String(e.message).split('\n')[0]);}
 }
 function pick(obj){
  if(menu||payment||game.pendingGameInputs.length||game.isGameOver())return;
  if(obj.type==='unit'){const u=drawing.units.find(u=>u.id===obj.id);if(u?.owner===playerIndex()){selected=u.id;world.cancelFollow();render();}return;}
  let l=obj.type==='location'?drawing.locations.find(l=>l.id===obj.id):obj.type==='ground'?drawing.locations.find(l=>Math.hypot(l.x-obj.x,l.z-obj.z)<2):null;
  if(!l)return;
  const u=drawing.units.find(u=>u.id===selected);if(!u||u.locationId){toast('Выберите свободного работника');return;}
  step({inputType:GameInputType.PLACE_WORKER,clientOptions:{location:l.actualName}});
 }
 function workerDock(){return drawing.units.filter(u=>u.owner===playerIndex()).map(u=>`<button class="worker-portrait ${u.id===selected?'selected':''} ${u.locationId?'assigned':''}" data-worker="${u.id}" aria-label="${u.name}${u.locationId?', занят':''}" aria-pressed="${u.id===selected}"><span class="portrait-image" aria-hidden="true" style="${portraitStyle(u.portrait)}">${u.locationId?'<span class="assigned-mark">✓</span>':''}</span><span class="portrait-name">${u.name}</span></button>`).join('');}
 function render(){
  actions=new Map();const p=player(),idx=playerIndex();
  root.querySelector('.everdell-shell').dataset.player=idx;
  world.render(drawing,0,{selected,menu:false});
  $('round-info').innerHTML=`<div class="turn-line"><span class="player-dot player-${idx}"></span><strong>${esc(p.name)}</strong><span class="round-number">${SEASONS[p.currentSeason]??p.currentSeason}</span></div><div class="resource-stock">${stock(p.getResources(),true)}</div><div class="player-seasons">${game.players.map((q,i)=>`<span class="${q.playerId===p.playerId?'current':''}" title="${esc(q.name)}">${esc(q.name)} · ${q.getStatus()===PlayerStatus.GAME_ENDED?'Завершил':SEASONS[q.currentSeason]}</span>`).join('')}</div>`;
  $('turn-announcement').textContent=`Ход: ${p.name}, ${SEASONS[p.currentSeason]}`;
  const seasons=[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN],seasonButton=$('season-action');
  seasonButton.textContent=p.currentSeason===Season.AUTUMN?'Завершить игру':`Перейти: ${SEASONS[seasons[seasons.indexOf(p.currentSeason)+1]]}`;
  seasonButton.disabled=game.isGameOver()||!!game.pendingGameInputs.length||!allowed(p.currentSeason===Season.AUTUMN?GameInputType.GAME_END:GameInputType.PREPARE_FOR_SEASON);
  seasonButton.title=seasonButton.disabled&&!game.isGameOver()?'Сначала разместите всех работников и завершите текущий эффект':'';
  $('workers').innerHTML=workerDock();renderPanel();renderDecision();drawMini();
 }
 function cardHtml(name,{source,index,played,owner,optionIndex}={}){
  const c=Card.fromName(name),blocked=source==='MEADOW'&&game.gameOptions.solo?.blockedMeadow?.includes(index),playable=!blocked&&source&&game.getPlayableCards().some(x=>x.card===name&&x.source===source&&(x.sourceIdx===undefined||x.sourceIdx===index)),visitable=played&&game.getVisitableDestinationCards().some(x=>same(x,played));
  const association=c.associatedCard?.type==='CARD'?cn(c.associatedCard.cardName):c.associatedCard?.type==='HUSBAND_WIFE'?'Муж или жена':c.associatedCard?.type==='ANY'?'Любое существо':null;
  return `<article class="game-card ${CATEGORY[c.cardType]??''}">${cardArt(name)}<div class="card-heading"><span class="card-sigil" aria-hidden="true">${c.isCritter?'♧':'⌂'}</span><div><span class="card-category">${c.isUnique?'Уникальное':'Обычное'} ${c.isCritter?'существо':'сооружение'}</span><h2>${esc(cn(name))}</h2></div><span class="base-points" title="Базовые победные очки">${c.baseVP} ✧</span></div><span class="effect-category">${CARD_TYPES[c.cardType]}</span><p class="card-effect">${esc(cardText(name)??fmt(c.cardDescription))}</p>${association?`<div class="card-association">${c.isCritter?'Бесплатно через':'Принимает'}: ${esc(association)}${played?.usedForCritter?' · занято':''}</div>`:''}${played?.resources&&Object.values(played.resources).some(Boolean)?`<div class="card-storage">На карте: ${stock(played.resources)}</div>`:''}<div class="card-cost" aria-label="Стоимость">${stock(c.baseCost)||'<span class="card-free">Бесплатно</span>'}</div>${optionIndex!==undefined?'':source?`<button class="play-card" data-command="${command({kind:'play',name,source,index})}" ${playable&&!game.pendingGameInputs.length?'':'disabled'}>${blocked?'Занято Ругвортом':playable?'Разыграть':'Недоступно сейчас'}</button>`:played&&c.maxWorkerSpots>0?`<button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:played}}})}" ${visitable&&!game.pendingGameInputs.length?'':'disabled'}>${visitable?'Разместить работника':played.workers?.length?'Занято':'Недоступно сейчас'}</button>`:''}</article>`;
 }
 function renderPanel(){
  const p=player();$('card-drawer').hidden=!open;$('cards-toggle').setAttribute('aria-expanded',String(open));
  for(const name of ['meadow','hand','city','events','places']){const n=$('tab-'+name);n.setAttribute('aria-selected',String(name===tab));n.tabIndex=name===tab?0:-1;}
  $('tab-meadow').textContent=`Поляна · ${game.meadowCards.length}`;$('tab-hand').textContent=`Рука · ${p.numCardsInHand}/8`;
  $('card-list').setAttribute('aria-labelledby','tab-'+tab);let html='',extra='';
  if(tab==='meadow')html=game.meadowCards.map((name,index)=>cardHtml(name,{source:'MEADOW',index})).join('');
  if(tab==='hand')html=p.getCardsInHand().map((name,index)=>cardHtml(name,{source:'HAND',index})).join('')||'<p class="empty-cards">На руке нет карт</p>';
  if(tab==='city'){
   const q=game.players.find(q=>q.playerId===cityPlayer)??p;extra=`<div class="city-picker">${game.players.map(x=>`<button data-city="${x.playerId}" class="${x.playerId===q.playerId?'active':''}">${esc(x.name)}</button>`).join('')}<span>${q.getNumOccupiedSpacesInCity()}/15 ячеек</span></div>`;
   html=q.getPlayedCards().map(played=>cardHtml(played.cardName,{played,owner:q})).join('')||'<p class="empty-cards">Город пока пуст</p>';
  }
  if(tab==='events')html=Object.entries(game.eventsMap).map(([name,owner])=>{const e=Event.fromName(name),available=game.getClaimableEvents().includes(name),by=game.players.find(p=>p.playerId===owner);return `<article class="game-card prosperity event-card">${cardArt(e.requiredCards?.[0]??'Fairgrounds','event-art')}<span class="card-category">${e.type==='BASIC'?'Основное':'Особое'} событие</span><h2>${esc(en(name))}</h2><p class="card-effect">${esc(EVENT_TEXT[name]??fmt(e.eventDescription))}</p>${e.requiredCards?`<div class="card-association">Нужны: ${e.requiredCards.map(cn).map(esc).join(' + ')}</div>`:''}<button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.CLAIM_EVENT,clientOptions:{event:name}}})}" ${available&&!game.pendingGameInputs.length?'':'disabled'}>${by?esc(by.name):available?'Разместить работника':'Условия не выполнены'}</button></article>`;}).join('');
  if(tab==='places')html=Object.keys(game.locationsMap).map(name=>{const l=Location.fromName(name),available=game.getPlayableLocations().includes(name),count=game.locationsMap[name].length;return `<article class="game-card location place-card">${cardArt(placeArt(name),'place-art')}<span class="card-category">${l.type==='FOREST'?'Лес':l.type==='JOURNEY'?'Путешествие':'Место работы'}</span><h2>${esc(ln(name))}</h2><p class="card-effect">${esc(LOCATION_TEXT[name]??fmt(l.description??l.shortName))}</p><div class="card-association">${l.occupancy==='UNLIMITED'?'Общее место':l.occupancy==='EXCLUSIVE_FOUR'&&game.players.length===4?'Два места, по одному на игрока':'Одно место'} · занято ${count}</div><button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.PLACE_WORKER,clientOptions:{location:name}}})}" ${available&&!game.pendingGameInputs.length?'':'disabled'}>${available?'Разместить работника':'Недоступно сейчас'}</button></article>`;}).join('');
  $('panel-extra').innerHTML=extra;const scroll=$('card-list').scrollLeft;$('card-list').innerHTML=html;$('card-list').scrollLeft=scroll;
 }
 function showPayment(name,source,index){
  try{const choices=getPaymentOptions(game,name,source,index);if(!choices.length){toast('Нет доступного способа оплаты');return;}
   if(choices.length===1){step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:name,source,sourceIdx:index,paymentOptions:choices[0]}});return;}
   payment={name,source,index,choices};renderDecision();
  }catch(e){toast(e.message);}
 }
 function paymentLabel(p){return [p.useAssociatedCard?'Заселить свободное сооружение':null,p.cardToUse?`Использовать: ${cn(p.cardToUse)}`:null,p.cardToDungeon?`В темницу: ${cn(p.cardToDungeon)}`:null,RESOURCE_KEYS.filter(k=>p.resources[k]).map(k=>`${RESOURCE_NAMES[k]}: ${p.resources[k]}`).join(' · ')||'Без ресурсов'].filter(Boolean).join(' — ');}
 function renderDecision(){
  const layer=$('decision-layer');world.inputPaused=!!payment||menu||game.pendingGameInputs.length>0||game.isGameOver();
  if(menu){layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="menu-title"><h2 id="menu-title">Новая партия</h2><p>Текущая партия будет заменена</p><label class="setup-field">Режим<select id="player-count" aria-label="Режим"><option value="2">Два игрока за одним компьютером</option><option value="3">Три игрока</option><option value="4">Четыре игрока</option><option value="solo1">Ругворт — первый год</option><option value="solo2">Ругворт — второй год</option><option value="solo3">Ругворт — третий год</option></select></label><div class="decision-footer"><button data-dialog="cancel">Отмена</button><button data-dialog="new" class="primary">Начать</button></div></section></div>`;return;}
  if(game.isGameOver()){
   const scores=getScores(game).sort((a,b)=>b.total-a.total||b.eventCount-a.eventCount||b.resources-a.resources);
   const winners=scores.filter(s=>s.total===scores[0].total&&s.eventCount===scores[0].eventCount&&s.resources===scores[0].resources);
   layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal results" role="dialog" aria-modal="true" aria-labelledby="result-title"><h2 id="result-title">${winners.length===1?`Победитель: ${esc(winners[0].name)}`:'Ничья'}</h2><table><thead><tr><th>Игрок</th><th>Карты</th><th>Жетоны</th><th>События</th><th>Путь</th><th>Итого</th></tr></thead><tbody>${scores.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.cards}</td><td>${s.tokens}</td><td>${s.events}</td><td>${s.journey}</td><td><strong>${s.total}</strong></td></tr>`).join('')}</tbody></table><p>При равенстве очков учитываются события, затем оставшиеся ресурсы</p><button data-dialog="menu" class="primary">Новая партия</button></section></div>`;return;
  }
  if(payment){layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><h2 id="payment-title">${esc(cn(payment.name))}: способ оплаты</h2><div class="payment-options">${payment.choices.map((p,i)=>`<button data-payment="${i}">${esc(paymentLabel(p))}</button>`).join('')}</div><button data-dialog="cancel">Назад</button></section></div>`;return;}
  const pending=game.pendingGameInputs;if(!pending.length){layer.innerHTML='';return;}
  if(pendingIndex>=pending.length)pendingIndex=0;const input=pending[pendingIndex],type=input.inputType,context=input.cardContext?cn(input.cardContext):input.playedCardContext?cn(input.playedCardContext.cardName):input.locationContext?ln(input.locationContext):input.eventContext?en(input.eventContext):'Выбор действия';
  const titles={SELECT_CARDS:'Выберите карты',SELECT_CARDS_WITH_SOURCE:'Выберите карты',SELECT_PLAYED_CARDS:'Выберите карты города',DISCARD_CARDS:'Выберите карты для сброса',SELECT_PLAYER:'Выберите игрока',SELECT_RESOURCES:input.toSpend?'Выберите ресурсы для оплаты':'Выберите ресурсы',SELECT_PAYMENT_FOR_CARD:`Оплата: ${cn(input.card)}`,SELECT_OPTION_GENERIC:'Выберите действие',SELECT_WORKER_PLACEMENT:'Выберите размещённого работника',SELECT_LOCATION:'Выберите место работы'};
  const info=optionsFor(input);let body='';
  if(type==='SELECT_RESOURCES'||type==='SELECT_PAYMENT_FOR_CARD'){
   body=`<div class="resource-choice">${RESOURCE_KEYS.filter(k=>(!input.specificResource||input.specificResource===k)&&input.excludeResource!==k).map(k=>`<label><span style="color:${COLORS[k]}">${resourceIcon(k)} ${RESOURCE_NAMES[k]}</span><input type="number" data-resource="${k}" min="0" max="${input.toSpend||type==='SELECT_PAYMENT_FOR_CARD'?player().getResources()[k]:input.maxResources??99}" step="1" value="${promptResources[k]??0}" aria-label="${RESOURCE_NAMES[k]}"></label>`).join('')}</div>${type==='SELECT_RESOURCES'?`<p>Количество ресурсов: ${input.minResources}–${input.maxResources}</p>`:`<p>Обычная стоимость: ${RESOURCE_KEYS.filter(k=>Card.fromName(input.card).baseCost[k]).map(k=>`${RESOURCE_NAMES[k]}: ${Card.fromName(input.card).baseCost[k]}`).join(' · ')}<br>Учтите скидку указанного эффекта</p>`}`;
  }else{
   body=`<div class="choice-grid">${info.options.map((option,i)=>`<label class="choice-item ${promptChoice.includes(i)?'checked':''}"><input type="${info.max===1?'radio':'checkbox'}" name="effect-choice" data-choice="${i}" ${promptChoice.includes(i)?'checked':''}><span>${optionHtml(option,type)}</span></label>`).join('')}</div>${info.min===0?'<p>Можно ничего не выбирать</p>':''}<p>Выбрано <span id="choice-count">${promptChoice.length}</span> · нужно ${info.min}–${info.max}</p>`;
  }
  layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="effect-title"><div class="pending-switch">${pending.length>1?pending.map((p,i)=>`<button data-pending="${i}" class="${i===pendingIndex?'active':''}">${esc(p.cardContext?cn(p.cardContext):p.playedCardContext?cn(p.playedCardContext.cardName):'Эффект '+(i+1))}</button>`).join(''):''}</div><span class="card-category">${esc(context)}</span><h2 id="effect-title">${esc(titles[type]??'Завершите действие')}</h2>${input.label?`<p class="effect-instruction">${esc(fmt(input.label)).replace(/\n/g,'<br>')}</p>`:''}${body}<div id="decision-error" role="alert"></div><div class="decision-footer">${allowed(GameInputType.UNDO)?'<button data-dialog="undo">Отменить действие</button>':''}<button data-dialog="submit" class="primary">Подтвердить</button></div></section></div>`;
 }
 function optionsFor(input){switch(input.inputType){
  case 'SELECT_CARDS':case 'SELECT_CARDS_WITH_SOURCE':case 'SELECT_PLAYED_CARDS':return{options:input.cardOptions,min:input.minToSelect,max:input.maxToSelect,field:'selectedCards'};
  case 'DISCARD_CARDS':return{options:player().getCardsInHand(),min:input.minCards,max:input.maxCards,field:'cardsToDiscard'};
  case 'SELECT_PLAYER':return{options:input.playerOptions,min:input.mustSelectOne?1:0,max:1,field:'selectedPlayer',single:true};
  case 'SELECT_WORKER_PLACEMENT':return{options:input.options,min:input.mustSelectOne?1:0,max:1,field:'selectedOption',single:true};
  case 'SELECT_OPTION_GENERIC':return{options:input.options,min:1,max:1,field:'selectedOption',single:true};
  case 'SELECT_LOCATION':return{options:input.locationOptions,min:1,max:1,field:'selectedLocation',single:true};
  default:return{options:[],min:0,max:0};
 }}
 function optionHtml(option,type){
  if(type==='SELECT_PLAYER')return esc(game.getPlayer(option).name);
  if(type==='SELECT_LOCATION')return `<b>${esc(ln(option))}</b><small>${esc(LOCATION_TEXT[option]??'')}</small>`;
  if(type==='SELECT_WORKER_PLACEMENT')return esc(labelForWorkerPlace(option));
  if(type==='SELECT_OPTION_GENERIC')return esc(tr(option));
  const name=typeof option==='string'?option:option.cardName??option.card;
  if(name==='FROM_DECK')return 'Взять из колоды';
  const card=Card.fromName(name),owner=option?.cardOwnerId?game.getPlayer(option.cardOwnerId).name:null;
  return `<b>${esc(cn(name))}${owner?' · '+esc(owner):''}</b><small>${esc(cardText(name)??'')}</small><span>${card.baseVP} ✧ · ${stock(card.baseCost)}</span>`;
 }
 function submitPending(){
  const input=structuredClone(game.pendingGameInputs[pendingIndex]);if(!input)return;
  if(input.inputType==='SELECT_RESOURCES')input.clientOptions.resources={...promptResources};
  else if(input.inputType==='SELECT_PAYMENT_FOR_CARD')input.clientOptions.paymentOptions={...input.clientOptions.paymentOptions,resources:{...promptResources}};
  else{const info=optionsFor(input);if(promptChoice.length<info.min||promptChoice.length>info.max){$('decision-error').textContent=`Выберите от ${info.min} до ${info.max}`;return;}const values=promptChoice.map(i=>info.options[i]);input.clientOptions[info.field]=info.single?(values[0]??null):values;}
  step(input);
 }
 function drawMini(){if(!drawing)return;const c=$('minimap'),ctx=c.getContext('2d'),sx=c.width/WORLD.width,sz=c.height/WORLD.height,colors={plain:'#96a35c',meadow:'#b5b977',forest:'#3d6547',rock:'#aaa48a',road:'#c9ad72',water:'#578f8b'};for(const t of drawing.tiles){ctx.fillStyle=colors[t.type]??colors.plain;ctx.fillRect(t.x*sx,t.z*sz,sx+.5,sz+.5);}for(const l of drawing.locations){ctx.fillStyle='#e7d6a4';ctx.fillRect(l.x*sx-2,l.z*sz-2,4,4);}for(const u of drawing.units){const p=world.getUnitPosition(u.id)??u;ctx.fillStyle=u.id===selected?'#fff0c2':['#8caee0','#85c9a8','#d3af7c','#cb9bc7'][u.owner];ctx.beginPath();ctx.arc(p.x*sx,p.z*sz,2.3,0,Math.PI*2);ctx.fill();}}
 function click(e){
  const choice=e.target.closest('[data-choice]');if(choice){const i=Number(choice.dataset.choice),info=optionsFor(game.pendingGameInputs[pendingIndex]);promptChoice=info.max===1?[i]:choice.checked?[...promptChoice,i]:promptChoice.filter(n=>n!==i);const count=$('choice-count');if(count)count.textContent=promptChoice.length;for(const el of root.querySelectorAll('.choice-item'))el.classList.toggle('checked',el.querySelector('input').checked);return;}
  const pending=e.target.closest('[data-pending]');if(pending){pendingIndex=Number(pending.dataset.pending);promptChoice=[];promptResources={};renderDecision();return;}
  const pay=e.target.closest('[data-payment]');if(pay){const p=payment;step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:p.name,source:p.source,sourceIdx:p.index,paymentOptions:p.choices[Number(pay.dataset.payment)]}});return;}
  const cmd=e.target.closest('[data-command]');if(cmd){const data=actions.get(cmd.dataset.command);if(data?.kind==='play')showPayment(data.name,data.source,data.index);if(data?.kind==='input')step(data.input);return;}
  const w=e.target.closest('[data-worker]');if(w){selected=w.dataset.worker;world.cancelFollow();render();const pos=world.getUnitPosition(selected);if(pos)world.focusAt(pos.x,pos.z);return;}
  const pane=e.target.closest('[data-tab]');if(pane){tab=pane.dataset.tab;renderPanel();$('card-list').scrollLeft=0;return;}
  const city=e.target.closest('[data-city]');if(city){cityPlayer=city.dataset.city;renderPanel();$('card-list').scrollLeft=0;return;}
  if(e.target.closest('#cards-toggle')){open=!open;renderPanel();}
  if(e.target.closest('#close-cards')){open=false;renderPanel();$('cards-toggle').focus();}
  if(e.target.closest('#season-action'))step({inputType:player().currentSeason===Season.AUTUMN?GameInputType.GAME_END:GameInputType.PREPARE_FOR_SEASON});
  if(e.target.closest('#game-menu')){menu=true;renderDecision();}
  const dialog=e.target.closest('[data-dialog]')?.dataset.dialog;
  if(dialog==='cancel'){menu=false;payment=null;renderDecision();}
  if(dialog==='menu'){menu=true;renderDecision();}
  if(dialog==='submit')submitPending();
  if(dialog==='undo')step({inputType:GameInputType.UNDO});
  if(dialog==='new'){
   const mode=$('player-count').value;try{game=createGame(mode.startsWith('solo')?{soloYear:Number(mode.slice(4))}:{playerCount:Number(mode)});menu=false;payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;tab='meadow';open=false;clearTimeout(toastTimer);$('toast').classList.remove('show');$('toast').textContent='';drawing=null;world.gameSeed=null;project();selectAvailable();save();render();world.focusAt(13,23);world.desiredZoom=.8;}catch(e){toast(e.message);}
  }
 }
 function change(e){if(e.target.matches('[data-resource]')){const value=Number(e.target.value);promptResources[e.target.dataset.resource]=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;}}
 function key(e){if(e.altKey||e.metaKey||e.ctrlKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='Escape'){if(menu||payment){menu=false;payment=null;renderDecision();}else{open=false;renderPanel();}return;}if(/^[1-6]$/.test(e.key)&&!world.inputPaused){const u=drawing.units.filter(u=>u.owner===playerIndex())[Number(e.key)-1];if(u){selected=u.id;render();const pos=world.getUnitPosition(u.id)??u;world.focusAt(pos.x,pos.z);}}}
 root.addEventListener('click',click);root.addEventListener('input',change);window.addEventListener('keydown',key);$('minimap').addEventListener('click',e=>{if(world.inputPaused)return;const r=$('minimap').getBoundingClientRect();world.focusAt((e.clientX-r.left)/r.width*WORLD.width,(e.clientY-r.top)/r.height*WORLD.height);});
 project();selectAvailable();save();render();world.focusAt(13,23);world.desiredZoom=.8;const timer=setInterval(drawMini,200);
 return()=>{clearInterval(timer);clearTimeout(toastTimer);root.removeEventListener('click',click);root.removeEventListener('input',change);window.removeEventListener('keydown',key);world.dispose();};
}
