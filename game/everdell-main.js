import {cardArt,portraitStyle,placeArt,resourceIcon,cardTypeIcon} from './everdell/art.js?v=20261111-21';
import {createGame,stepGame,serializeGame,restoreGame,getPaymentOptions,getScores,Card,Location,Event,CardName,LocationOccupancy,GameInputType,Season,CardType,PlayerStatus} from './everdell/engine.js?v=20261111-21';
import {CARD_NAMES,CARD_TEXT,LOCATION_NAMES,LOCATION_TEXT,EVENT_NAMES,EVENT_TEXT,SEASONS,CARD_TYPES,RESOURCE_NAMES,translateText} from './everdell/locale.js?v=20261111-21';
import {tableHtml,fitTable} from './everdell-table.js?v=20261111-21';
const SAVE='stone-wind-everdell-table-v1';
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
 let game=createGame({playerCount:2}),tab='hand',open=false,cityPlayer=null,pendingIndex=0,promptChoice=[],promptResources={},payment=null,menu=false,inspection=null,toastTimer,actions=new Map(),actionCounter=0;
 try{const saved=JSON.parse(localStorage.getItem(SAVE)||'null');if(saved?.players?.length===2&&!saved.gameOptions?.solo)game=restoreGame(saved);}catch{}
 root.innerHTML=`<div class="game-shell everdell-shell table-shell"><div class="table-viewport" id="table-viewport" aria-label="Неподвижный игровой стол"></div><button id="cards-toggle" hidden></button><section class="card-drawer" id="card-drawer" hidden><div class="card-toolbar"><div role="tablist" aria-label="Разделы игры">${[['meadow','Поляна'],['hand','Рука'],['city','Города'],['events','События'],['places','Места']].map(([id,name])=>`<button role="tab" id="tab-${id}" data-tab="${id}">${name}</button>`).join('')}</div><button id="close-cards" aria-label="Закрыть карты">×</button></div><div id="panel-extra"></div><div class="card-list" id="card-list" role="tabpanel" tabindex="0"></div></section><div id="decision-layer"></div><div class="toast" id="toast" role="status"></div><span class="sr-only" id="turn-announcement" aria-live="polite"></span></div>`;
 const $=id=>root.querySelector('#'+id);
 const player=()=>game.getActivePlayer();
 const cardText=name=>CARD_TEXT[name];
 function save(){try{localStorage.setItem(SAVE,JSON.stringify(serializeGame(game)));}catch{}}
 function toast(s){$('toast').textContent=tr(s);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3600);}
 function command(data){const id='a'+(++actionCounter);actions.set(id,data);return id;}
 function labelForWorkerPlace(w){return w.location?ln(w.location):w.event?en(w.event):cn(w.playedCard.cardName);}
 function allowed(type){return game.getPossibleGameInputs().some(i=>i.inputType===type);}
 function step(input){try{game=stepGame(game,input);payment=null;inspection=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;save();render();}catch(e){toast(String(e.message).split('\n')[0]);}}
 function render(){actions=new Map();$('table-viewport').innerHTML=tableHtml(game,{command,stock});fitTable($('table-viewport'));$('turn-announcement').textContent=`Ход: ${player().name}, ${SEASONS[player().currentSeason]}`;renderPanel();renderDecision();}
 function renderInspection(layer){
  let body='',title='';
  if(inspection.kind==='inspect-card'){title=cn(inspection.name);body=cardHtml(inspection.name,inspection);}
  if(inspection.kind==='inspect-event'){const n=inspection.name,e=Event.fromName(n),by=game.players.find(p=>p.playerId===game.eventsMap[n]),can=game.getClaimableEvents().includes(n);title=en(n);body=`<div class="inspected-event"><span class="card-category">${e.type==='BASIC'?'Основное':'Особое'} событие</span><h2>${esc(title)}</h2><p>${esc(EVENT_TEXT[n]??fmt(e.eventDescription))}</p>${e.requiredCards?`<p>${e.requiredCards.map(cn).map(esc).join(' + ')}</p>`:''}<button class="primary" data-command="${command({kind:'input',input:{inputType:GameInputType.CLAIM_EVENT,clientOptions:{event:n}}})}" ${can?'':'disabled'}>${by?esc(by.name):can?'Разместить работника':'Условия не выполнены'}</button></div>`;}
  layer.innerHTML=`<div class="decision-backdrop inspection-backdrop"><section class="inspection-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="inspection-close" data-dialog="inspect-close" aria-label="Закрыть просмотр">×</button>${body}</section></div>`;
 }
 function cardHtml(name,{source,index,played,owner,optionIndex}={}){
  const c=Card.fromName(name),blocked=source==='MEADOW'&&game.gameOptions.solo?.blockedMeadow?.includes(index),playable=!blocked&&source&&game.getPlayableCards().some(x=>x.card===name&&x.source===source&&(x.sourceIdx===undefined||x.sourceIdx===index)),visitable=played&&game.getVisitableDestinationCards().some(x=>same(x,played));
  const association=c.associatedCard?.type==='CARD'?cn(c.associatedCard.cardName):c.associatedCard?.type==='HUSBAND_WIFE'?'Муж или жена':c.associatedCard?.type==='ANY'?'Любое существо':null;
  const action=optionIndex!==undefined?'':source?`<button class="play-card" data-command="${command({kind:'play',name,source,index})}" ${playable&&!game.pendingGameInputs.length?'':'disabled'}>${blocked?'Занято Ругвортом':playable?'Разыграть':'Недоступно сейчас'}</button>`:played&&c.maxWorkerSpots>0?`<button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:played}}})}" ${visitable&&!game.pendingGameInputs.length?'':'disabled'}>${visitable?'Разместить работника':played.workers?.length?'Занято':'Недоступно сейчас'}</button>`:'';
  return `<article class="game-card printed-card ${CATEGORY[c.cardType]??''}" aria-label="${esc(cn(name))}"><div class="card-illustration">${cardArt(name)}<div class="card-cost-medallion" aria-label="Стоимость">${c.isCritter&&association?`<span class="card-building-alternative" title="Бесплатно через ${esc(association)}">${esc(association)}</span><span class="card-cost-or">или</span>`:''}${stock(c.baseCost)||'<span class="card-free">0</span>'}</div><span class="base-points" title="Базовые победные очки" aria-label="${c.baseVP} победных очков"><b>${c.baseVP}</b>${resourceIcon('VP')}</span><div class="card-title-ribbon"><span class="card-sigil" title="${esc(CARD_TYPES[c.cardType])}" aria-label="${esc(CARD_TYPES[c.cardType])}">${cardTypeIcon(c.cardType)}<i title="Копий в колоде">${c.numInDeck}</i></span><h2>${esc(cn(name))}</h2></div></div><div class="card-paper"><div class="card-type-line">${c.isUnique?'Уникальное':'Обычное'} ${c.isCritter?'существо':'сооружение'}</div><div class="card-rules" tabindex="0" aria-label="Эффект: ${esc(cn(name))}"><p class="card-effect">${esc(cardText(name)??fmt(c.cardDescription))}</p>${played?.resources&&Object.values(played.resources).some(Boolean)?`<div class="card-storage">На карте: ${stock(played.resources)}</div>`:''}</div>${association&&!c.isCritter?`<div class="card-association"><span>${c.isCritter?'Бесплатно через':'Принимает'}</span><b>${esc(association)}</b>${!c.isCritter?`<i class="card-door ${played?.usedForCritter?'closed':''}" title="${played?.usedForCritter?'Занято':'Свободное сооружение'}" aria-label="${played?.usedForCritter?'Занято':'Свободное сооружение'}"></i>`:''}</div>`:''}</div>${action?`<div class="card-action">${action}</div>`:''}</article>`;
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
  if(tab==='events')html=Object.entries(game.eventsMap).map(([name,owner])=>{const e=Event.fromName(name),available=game.getClaimableEvents().includes(name),by=game.players.find(p=>p.playerId===owner);return `<article class="game-card prosperity event-card printed-card"><div class="card-illustration">${cardArt(e.requiredCards?.[0]??'Fairgrounds','event-art')}<div class="card-title-ribbon"><h2>${esc(en(name))}</h2></div></div><div class="card-paper"><div class="card-type-line">${e.type==='BASIC'?'Основное':'Особое'} событие</div><div class="card-rules" tabindex="0" aria-label="Условия события"><p class="card-effect">${esc(EVENT_TEXT[name]??fmt(e.eventDescription))}</p></div>${e.requiredCards?`<div class="card-association"><span>Нужны</span><b>${e.requiredCards.map(cn).map(esc).join(' + ')}</b></div>`:''}</div><div class="card-action"><button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.CLAIM_EVENT,clientOptions:{event:name}}})}" ${available&&!game.pendingGameInputs.length?'':'disabled'}>${by?esc(by.name):available?'Разместить работника':'Условия не выполнены'}</button></div></article>`;}).join('');
  if(tab==='places')html=Object.keys(game.locationsMap).map(name=>{const l=Location.fromName(name),available=game.getPlayableLocations().includes(name),count=game.locationsMap[name].length;return `<article class="game-card location place-card printed-card"><div class="card-illustration">${cardArt(placeArt(name),'place-art')}<div class="card-title-ribbon"><h2>${esc(ln(name))}</h2></div></div><div class="card-paper"><div class="card-type-line">${l.type==='FOREST'?'Лес':l.type==='JOURNEY'?'Путешествие':'Место работы'}</div><div class="card-rules" tabindex="0" aria-label="Эффект места"><p class="card-effect">${esc(LOCATION_TEXT[name]??fmt(l.description??l.shortName))}</p></div><div class="card-association"><b>${l.occupancy==='UNLIMITED'?'Общее место':l.occupancy==='EXCLUSIVE_FOUR'&&game.players.length===4?'Два места, по одному на игрока':'Одно место'}</b><span>Занято: ${count}</span></div></div><div class="card-action"><button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.PLACE_WORKER,clientOptions:{location:name}}})}" ${available&&!game.pendingGameInputs.length?'':'disabled'}>${available?'Разместить работника':'Недоступно сейчас'}</button></div></article>`;}).join('');
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
  const layer=$('decision-layer');
  if(menu){layer.innerHTML=`<div class="decision-backdrop"><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="menu-title"><h2 id="menu-title">Новая партия</h2><p>Два игрока за одним компьютером</p><p>Текущая партия будет заменена</p><div class="decision-footer"><button data-dialog="cancel">Отмена</button><button data-dialog="new" class="primary">Начать</button></div></section></div>`;return;}
  if(game.isGameOver()){
   const scores=getScores(game).sort((a,b)=>b.total-a.total||b.eventCount-a.eventCount||b.resources-a.resources);
   const winners=scores.filter(s=>s.total===scores[0].total&&s.eventCount===scores[0].eventCount&&s.resources===scores[0].resources);
   layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal results" role="dialog" aria-modal="true" aria-labelledby="result-title"><h2 id="result-title">${winners.length===1?`Победитель: ${esc(winners[0].name)}`:'Ничья'}</h2><table><thead><tr><th>Игрок</th><th>Карты</th><th>Жетоны</th><th>События</th><th>Путь</th><th>Итого</th></tr></thead><tbody>${scores.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.cards}</td><td>${s.tokens}</td><td>${s.events}</td><td>${s.journey}</td><td><strong>${s.total}</strong></td></tr>`).join('')}</tbody></table><p>При равенстве очков учитываются события, затем оставшиеся ресурсы</p><button data-dialog="menu" class="primary">Новая партия</button></section></div>`;return;
  }
  if(payment){layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><h2 id="payment-title">${esc(cn(payment.name))}: способ оплаты</h2><div class="payment-options">${payment.choices.map((p,i)=>`<button data-payment="${i}">${esc(paymentLabel(p))}</button>`).join('')}</div><button data-dialog="cancel">Назад</button></section></div>`;return;}
  const pending=game.pendingGameInputs;if(!pending.length){if(inspection){renderInspection(layer);return;}layer.innerHTML='';return;}
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
 function click(e){
  const choice=e.target.closest('[data-choice]');if(choice){const i=Number(choice.dataset.choice),info=optionsFor(game.pendingGameInputs[pendingIndex]);promptChoice=info.max===1?[i]:choice.checked?[...promptChoice,i]:promptChoice.filter(n=>n!==i);const count=$('choice-count');if(count)count.textContent=promptChoice.length;for(const el of root.querySelectorAll('.choice-item'))el.classList.toggle('checked',el.querySelector('input').checked);return;}
  const pending=e.target.closest('[data-pending]');if(pending){pendingIndex=Number(pending.dataset.pending);promptChoice=[];promptResources={};renderDecision();return;}
  const pay=e.target.closest('[data-payment]');if(pay){const p=payment;step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:p.name,source:p.source,sourceIdx:p.index,paymentOptions:p.choices[Number(pay.dataset.payment)]}});return;}
  const cmd=e.target.closest('[data-command]');if(cmd){const data=actions.get(cmd.dataset.command);if(!data)return;
   if(data.kind==='play')showPayment(data.name,data.source,data.index);
   if(data.kind==='input')step(data.input);
   if(data.kind==='inspect-card'||data.kind==='inspect-event'){inspection=data;renderDecision();}
   if(data.kind==='place')step({inputType:GameInputType.PLACE_WORKER,clientOptions:{location:data.name}});
   if(data.kind==='panel'){tab=data.tab;cityPlayer=data.owner??null;open=true;renderPanel();$('card-list').scrollLeft=0;}
   if(data.kind==='season')step({inputType:player().currentSeason===Season.AUTUMN?GameInputType.GAME_END:GameInputType.PREPARE_FOR_SEASON});
   if(data.kind==='menu'){menu=true;renderDecision();}return;
  }
  const pane=e.target.closest('[data-tab]');if(pane){tab=pane.dataset.tab;renderPanel();$('card-list').scrollLeft=0;return;}
  const city=e.target.closest('[data-city]');if(city){cityPlayer=city.dataset.city;renderPanel();$('card-list').scrollLeft=0;return;}
  if(e.target.closest('#close-cards')){open=false;renderPanel();}
  const dialog=e.target.closest('[data-dialog]')?.dataset.dialog;
  if(dialog==='cancel'){menu=false;payment=null;renderDecision();}
  if(dialog==='inspect-close'){inspection=null;renderDecision();}
  if(dialog==='menu'){menu=true;renderDecision();}
  if(dialog==='submit')submitPending();
  if(dialog==='undo')step({inputType:GameInputType.UNDO});
  if(dialog==='new'){game=createGame({playerCount:2});menu=false;payment=null;inspection=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;tab='hand';open=false;save();render();}
 }
 function change(e){if(e.target.matches('[data-resource]')){const value=Number(e.target.value);promptResources[e.target.dataset.resource]=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;}}
 function key(e){if(e.key==='Escape'){if(menu||payment||inspection){menu=false;payment=null;inspection=null;renderDecision();}else{open=false;renderPanel();}}}
 root.addEventListener('click',click);root.addEventListener('input',change);window.addEventListener('keydown',key);
 const observer=new ResizeObserver(()=>fitTable($('table-viewport')));observer.observe(root);save();render();
 return()=>{observer.disconnect();clearTimeout(toastTimer);root.removeEventListener('click',click);root.removeEventListener('input',change);window.removeEventListener('keydown',key);};
}
