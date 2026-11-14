import {cityRailMarkup,bindCityRail} from './city-icon-rail.js';
import {finalScoringPlan,createFinalScoring} from './final-scoring.js?v=pages25-architecture';
import {chooseBotCommand,paymentFitsCity} from './bot-policy.js?v=bot20';
import {BOT_SAVE_KEYS,createBotSession,decisionPlayerId,humanCanAct,humanOwnsDecision,applySessionCommand} from './bot-session.js?v=bot20';
import {cameraControls,cardPreviewPlacement} from './field-ui.js?v=pages25-architecture';
import {renderIcon} from './original-icons.js';
import {captureAction,bindAction,isActionForGame,restoreAction,recoverPendingAction} from './action-checkpoint.js';
import {resourceChoiceModel,changeResourceChoice,resourceChoiceMarkup,decisionResources,decisionValue,closeIcon} from './decision-ui.js?v=field19';
import {prepareGameCard,gameCardReady,gameCardFace} from './game-source-cards.js?v=22';
import {workerSeatPosition} from './production-props.js?v=field19';
import {SOURCE_CARD_NAMES} from './source-card-map.js';
import {createHandInteraction} from './hand-interaction.js';
import {createSharedSeasonState,normalizeSharedGame,stepSharedGame,requestSharedSeason,sharedSeason,canActShared,forecastNextSeason} from './shared-seasons.js?v=20261112-23';
import {zoneBadge,zoneDetail,supplyStatus,storedResources,cityWorkerMarker,cityWorkerDetail,lockIcon,SPECIES} from './living-ui.js?v=pages25-architecture';
import {LIVING_CITIES,LIVING_TREE,MARKET_POSITIONS,BASIC_POSITIONS,FOREST_POSITIONS,COMMON_POSITIONS,inCity,cityCardEntries,queuedCityPlacements,validCityPosition,reconcileCityLayout,freeCityPosition} from './living-board-state.js?v=feedback21';
import {cardArt,portraitStyle,placeArt,resourceIcon,cardTypeIcon} from './everdell/art.js?v=20261112-23';
import {createGame,stepGame,serializeGame,restoreGame,getPaymentOptions as enginePaymentOptions,getScores,Card,Location,Event,CardName,LocationOccupancy,GameInputType,Season,CardType,PlayerStatus} from './everdell/engine.js?v=20261112-23';
import {CARD_NAMES,CARD_TEXT,LOCATION_NAMES,LOCATION_TEXT,EVENT_NAMES,EVENT_TEXT,SEASONS,CARD_TYPES,RESOURCE_NAMES,translateText} from './everdell/locale.js?v=20261112-23';
import {createMovementWorld,moveWorker} from './movement.js?v=20261112-23';
import {WORLD} from './data.js?v=20261112-23';
import {WorldView} from './world.js?v=pages25-architecture';

const getPaymentOptions=(game,name,source,index)=>enginePaymentOptions(game,name,source,index).filter(p=>paymentFitsCity(game,name,p));
const {game:SAVE,layout:LAYOUT_SAVE,shared:SHARED_SAVE,teams:TEAMS_SAVE,action:ACTION_SAVE,session:SESSION_SAVE}=BOT_SAVE_KEYS;
function newBotGame(){const json=serializeGame(createGame({playerCount:2}));json.players[0].name='Вы';json.players[1].name='Соперник';return restoreGame(json);}
const RESOURCE_KEYS=['TWIG','RESIN','PEBBLE','BERRY'];
const SYMBOL={TWIG:'♣',RESIN:'⬟',PEBBLE:'◆',BERRY:'●',VP:'✧',CARD:'▱',ANY:'◇'};
const COLORS={TWIG:'#a6b98b',RESIN:'#e3b77a',PEBBLE:'#c4ced0',BERRY:'#dc9691',VP:'#ecd797'};
const CATEGORY={PRODUCTION:'production',GOVERNANCE:'improvement',DESTINATION:'location',PROSPERITY:'prosperity',TRAVELER:'traveler'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=s=>translateText(s??'').replace(/[.。]+\s*$/,'');
const cn=name=>SOURCE_CARD_NAMES[name]??CARD_NAMES[name]??name;
const ln=name=>LOCATION_NAMES[name]??name;
const en=name=>EVENT_NAMES[name]??name;
const stock=(resources,zero=false)=>[...RESOURCE_KEYS,'VP'].filter(r=>zero? r!=='VP'||resources[r]>0:resources?.[r]>0).map(r=>`<span class="stock-item" title="${esc(RESOURCE_NAMES[r]??r)}">${renderIcon(r.toLowerCase(),{size:20})}<b>${resources?.[r]??0}</b>${zero?`<span>${esc(RESOURCE_NAMES[r]??r)}</span>`:''}</span>`).join('');
const fmt=parts=>tr(parts);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const placeKey=w=>w.location?'l:'+w.location:w.event?'e:'+w.event:'c:'+w.playedCard?.cardOwnerId+':'+w.playedCard?.cardName;

export function mountGame(root){
 let game=newBotGame(),drawing=null,selected=null,tab='meadow',open=false,cityPlayer=null,pendingIndex=0,promptChoice=[],promptResources={},payment=null,menu=false,menuPage='home',toastTimer,actions=new Map(),actionCounter=0,cityLayout={},placement=null,stagedPosition=null,placementQueue=[],hoverKey=null,hoverTimer=null,sharedMeta=null,teams=[1,3],setupOnly=false,arrivalMap=new Map(),actionCheckpoint=null,dialogReturnFocus=null;
 try{const saved=JSON.parse(localStorage.getItem(SAVE)||'null');if(saved)game=restoreGame(saved);}catch{}
 try{const saved=JSON.parse(localStorage.getItem(ACTION_SAVE)||'null');if(saved&&isActionForGame(saved,game)&&game.pendingGameInputs.length)actionCheckpoint=saved;}catch{}
 try{cityLayout=JSON.parse(localStorage.getItem(LAYOUT_SAVE)||'{}');}catch{}
 let sharedSaved=null;try{sharedSaved=JSON.parse(localStorage.getItem(SHARED_SAVE)||'null');}catch{}
 sharedMeta=createSharedSeasonState(game,sharedSaved);({game,meta:sharedMeta}=normalizeSharedGame(game,sharedMeta));
 try{const chosen=JSON.parse(localStorage.getItem(TEAMS_SAVE)||'null');if(chosen?.length===2&&chosen.every(n=>SPECIES.some(s=>s.id===n))&&chosen[0]!==chosen[1])teams=chosen;else{menu=true;setupOnly=true;}}catch{menu=true;setupOnly=true;}
 if(!actionCheckpoint&&game.pendingGameInputs.length)actionCheckpoint=recoverPendingAction({game,meta:sharedMeta,layout:cityLayout,selected,arrivals:arrivalMap});
 let savedSession=null;try{savedSession=JSON.parse(localStorage.getItem(SESSION_SAVE)||'null');}catch{}
 const session=createBotSession(game,savedSession);
 let placementContextCancel=false;
 let cityRailOwner=null;
 let teamDraft=teams.slice(),disposed=false,tooltipExclusion=null,detailOrigin=null,botTimer=null,botError=false,botThinking=false;
 let finalRun=null,finalPlan=null,finalStepId=null,finishedGameSeen=game.isGameOver();
 const requestedCards=new Set(),paymentAvailability=new Map();
 const baseMap=createMovementWorld({seed:4811}),names=['Данила','Еремей','Ефим','Тихон','Иван','Терентий','Мирон','Савва','Матвей','Яков','Игнат','Пётр','Борис','Глеб','Назар','Лукьян','Прохор','Роман','Семён','Фёдор','Кузьма','Андрей','Степан','Елисей'];
 root.innerHTML=`<div class="game-shell placement-shell everdell-shell living-shell"><div class="world-stage" id="world-stage" tabindex="-1" aria-label="Живой Эверделл"></div><aside id="player-stock" class="player-stock" data-camera-ui aria-label="Ваш запас"></aside><aside id="city-icon-rail" class="city-icon-rail" data-camera-ui aria-label="Карты города"></aside><div class="hand-fan" id="hand-fan" data-camera-ui aria-label="Карты в руке"></div><aside id="object-detail" class="object-detail" data-camera-ui hidden></aside><div id="placement-caption" class="placement-caption" hidden></div>${cameraControls()}<button type="button" class="system-menu-toggle" data-system="open" data-camera-ui aria-label="Меню игры" aria-haspopup="dialog">☰ <span>Меню</span></button><div id="final-scoring-panel" class="final-scoring-panel" data-camera-ui hidden></div><div id="decision-layer"></div><aside id="bot-status" class="bot-status" data-camera-ui role="status" hidden></aside><div class="toast" id="toast" role="status"></div><span class="sr-only" id="turn-announcement" aria-live="polite"></span></div>`;
 const $=id=>root.querySelector('#'+id);
 const world=new WorldView($('world-stage'),pick,hover);
 const handInteraction=createHandInteraction($('hand-fan'),hideDetail);
 world.onCameraPresetChange=()=>{hideDetail();if(world.cameraPresetId==='own'||world.cameraPresetId==='opponent'){cityRailOwner=world.cameraPresetId==='own'?playerIndex():1-playerIndex();renderCityRail();}for(const button of root.querySelectorAll('[data-camera-zone]'))button.setAttribute('aria-pressed',String(button.dataset.cameraZone===world.cameraPresetId));};
 const player=()=>game.getPlayer(session.humanPlayerId);
 const humanTurn=()=>humanCanAct(game,sharedMeta,session);
 const humanDecision=()=>humanOwnsDecision(game,session);
 const botTurn=()=>decisionPlayerId(game)===session.botPlayerId&&!game.isGameOver();
 const cardText=name=>name===CardName.FOOL&&game.gameOptions.solo?'В одиночной игре сбросьте шута и выбранную карту из города Ругворта':CARD_TEXT[name];
 const playerIndex=()=>game.players.findIndex(p=>p.playerId===session.humanPlayerId);
 function save(){try{localStorage.setItem(SESSION_SAVE,JSON.stringify(session));if(actionCheckpoint&&game.pendingGameInputs.length)localStorage.setItem(ACTION_SAVE,JSON.stringify(bindAction(actionCheckpoint,game)));else localStorage.removeItem(ACTION_SAVE);localStorage.setItem(SAVE,JSON.stringify(serializeGame(game)));localStorage.setItem(LAYOUT_SAVE,JSON.stringify(cityLayout));localStorage.setItem(SHARED_SAVE,JSON.stringify(sharedMeta));if(!setupOnly)localStorage.setItem(TEAMS_SAVE,JSON.stringify(teams));}catch{}}
 function toast(s){$('toast').textContent=tr(s);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3600);}
 function stopBot(){clearTimeout(botTimer);botTimer=null;}
 function renderBotStatus(){
  const status=$('bot-status');status.hidden=menu||game.isGameOver()||!botTurn();
  status.innerHTML=botError?'Не удалось завершить ход <button type="button" data-bot-retry>Повторить</button>':game.pendingGameInputs.length?'Соперник выбирает эффект':'Ход соперника';
 }
 function scheduleBot(){
  renderBotStatus();
  if(disposed||finalRun?.active||menu||setupOnly||botThinking||botError||payment||placement||placementQueue.length&&!game.pendingGameInputs.length||!botTurn()){stopBot();return;}
  if(botTimer)return;
  const serial=game.gameStateId;
  botTimer=setTimeout(()=>{
   botTimer=null;if(disposed||finalRun?.active||menu||setupOnly||payment||placement||placementQueue.length&&!game.pendingGameInputs.length||!botTurn())return;
   if(serial!==game.gameStateId){scheduleBot();return;}
   botThinking=true;
   try{
    const chosen=chooseBotCommand(game,sharedMeta,session.botPlayerId);
    if(!chosen)throw new Error('Соперник не нашёл допустимого действия');
    let description=null,ok=false;
    if(chosen.kind==='pass'){description='Соперник закончил действия в сезоне';ok=passSeason(session.botPlayerId);}
    else{
     const input=chosen.input,options=input.clientOptions??{};
     if(input.inputType===GameInputType.PLAY_CARD){
      const owner=options.card===CardName.FOOL?playerIndex():1-playerIndex();
      stagedPosition={owner,cardName:options.card,...freeCityPosition(owner,Object.values(cityLayout).filter(p=>p.owner===owner),options.card),arrivalFrom:options.source==='MEADOW'?{...MARKET_POSITIONS[options.sourceIdx??game.meadowCards.indexOf(options.card)]}:{x:LIVING_CITIES[owner].x,z:27.4}};
      description='Соперник разыграл: '+cn(options.card);
     }else if(input.inputType===GameInputType.PLACE_WORKER)description='Соперник отправил рабочего: '+ln(options.location);
     else if(input.inputType===GameInputType.CLAIM_EVENT)description='Соперник получил событие: '+en(options.event);
     else if(input.inputType===GameInputType.VISIT_DESTINATION_CARD)description='Соперник посетил: '+cn(options.playedCard.cardName);
     ok=step(input,session.botPlayerId);
    }
    if(!ok)throw new Error('Движок отклонил действие соперника');
    if(description)toast(description);
   }catch(error){botError=true;stagedPosition=null;console.error('Bot turn failed',error);}
   finally{botThinking=false;scheduleBot();}
  },game.pendingGameInputs.length?650:1150);
 }
 function passSeason(actorId){
  if(actorId===session.humanPlayerId)startAction();
  try{({game,meta:sharedMeta}=applySessionCommand(game,sharedMeta,session,actorId,{kind:'pass',expectedStateId:game.gameStateId}));project();selectAvailable();render();settleAction();save();return true;}
  catch(error){settleAction();if(actorId===session.humanPlayerId)toast(error.message);else console.error(error);return false;}
 }
 function command(data){const id='a'+(++actionCounter);actions.set(id,data);return id;}
 function labelForWorkerPlace(w){return w.location?ln(w.location):w.event?en(w.event):cn(w.playedCard.cardName);}
 function allowed(type){return game.getPossibleGameInputs().some(i=>i.inputType===type);}
 function activeTemplate(type){return game.getPossibleGameInputs().find(i=>i.inputType===type);}
 function project(){
  paymentAvailability.clear();
  const old=drawing,view=structuredClone(baseMap);view.mode='placement';view.livingBoard=true;view.livingTree=LIVING_TREE;view.livingObjects=[];view.buildings=[];view.sources=[];view.sandbox=false;view.seed=481114;view.season=String(sharedSeason(game,sharedMeta)).toUpperCase();view.round=1+game.players.reduce((n,p)=>n+[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN].indexOf(p.currentSeason),0);view.serial=game.gameStateId;view.lastMove=null;view.locations=[];view.units=[];view.currentPlayer=playerIndex();
  view.worldHeight=70;
  for(let z=WORLD.height;z<view.worldHeight;z++)for(let x=0;x<WORLD.width;x++)view.tiles.push({x,z,type:x>22&&x<38&&(x*17+z*31)%29<3?'forest':'meadow',h:0});
  view.players=game.players.map((p,i)=>({id:i,level:1,workers:0,gifts:[],explored:Array(WORLD.width*view.worldHeight).fill(true)}));
  const availableLocations=new Set(humanTurn()?game.getPlayableLocations():[]);
  const locations=Object.keys(game.locationsMap),basics=locations.filter(n=>Location.fromName(n).type==='BASIC'),forests=locations.filter(n=>Location.fromName(n).type==='FOREST');
  const coords=BASIC_POSITIONS,fcoords=FOREST_POSITIONS;
  const locCoords=new Map();basics.forEach((n,i)=>locCoords.set(n,coords[i]));forests.forEach((n,i)=>locCoords.set(n,fcoords[i]));for(const [name,pos] of Object.entries(COMMON_POSITIONS))locCoords.set(name,pos);
  for(const n of locations){const loc=Location.fromName(n),pos=locCoords.get(n);if(!pos)continue;
   const gain=loc.resourcesToGain??{},reward={};for(const r of RESOURCE_KEYS)if(gain[r])reward[r.toLowerCase()]=gain[r];
   let capacity=loc.occupancy==='UNLIMITED'?null:loc.occupancy==='EXCLUSIVE_FOUR'&&game.players.length===4?2:1;
   view.locations.push({id:'ever:'+n,name:n.includes('JOURNEY')?ln(n).replace('Путешествие','Путь'):ln(n),x:pos[0],z:pos[1],capacity,owner:null,workers:[],reward,cost:{},description:LOCATION_TEXT[n]??fmt(loc.description??loc.shortName),kind:n.includes('TWIG')||n.includes('RESIN')?'wood':n.includes('STONE')||n.includes('PEBBLE')?'stone':n==='HAVEN'?'house':'food',effectText:'',actualName:n,rewardIcons:{...gain},locationType:loc.type,available:availableLocations.has(n),season:player().currentSeason});
  }
  const layoutResult=reconcileCityLayout(game,cityLayout,stagedPosition);cityLayout=layoutResult.positions;view.layoutConflicts=layoutResult.conflicts;
  if(old)for(const entry of layoutResult.added){const matched=stagedPosition&&stagedPosition.cardName===entry.cardName&&stagedPosition.owner===entry.owner;arrivalMap.set(entry.key,{key:game.gameStateId+':'+entry.key,from:matched&&stagedPosition.arrivalFrom?stagedPosition.arrivalFrom:{x:LIVING_CITIES[entry.owner].x,z:27.4},style:Card.fromName(entry.cardName).isCritter?'walk':'carry',species:teams[entry.owner]});}
  const objects=view.livingObjects;
  game.players.slice(0,2).forEach((q,owner)=>{
   const center=LIVING_CITIES[owner];
   objects.push({id:'city-area:'+owner,type:'city-area',owner,...center,label:q.name,active:q.playerId===game.activePlayerId});
   const forecast=sharedMeta.transition?null:forecastNextSeason(game,q.playerId,sharedMeta);objects.push({id:'supplies:'+owner,type:'supplies',owner,x:center.x,z:24.5,label:'',ariaLabel:q.name+' — ресурсы и прирост',resources:q.getResources(),forecast});
   const passed=sharedMeta.passed?.includes(q.playerId),season=sharedSeason(game,sharedMeta);objects.push({id:'season:'+owner,type:'season',owner,x:center.x+4,z:27,label:passed?'Готов ✓':SEASONS[season],active:q.playerId===game.activePlayerId,available:q.playerId===session.humanPlayerId&&humanTurn()&&!passed,locked:passed||q.playerId!==session.humanPlayerId||!humanTurn(),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' ,passed,reason:passed?'Ожидаем завершения действий соперника':q.playerId!==session.humanPlayerId?'Сезон соперника':!humanTurn()?'Сейчас ход соперника':'Нажмите, чтобы закончить действия в этом сезоне'});
   for(const e of cityCardEntries(q)){
    const pos=cityLayout[e.key],c=Card.fromName(e.cardName),workerDestination=!!c.maxWorkerSpots&&(q.playerId===session.humanPlayerId||c.isOpenDestination),available=!!c.maxWorkerSpots&&humanTurn()&&game.getVisitableDestinationCards().some(p=>same(p,e.played));
    const capacity=c.maxWorkerSpots?c.getNumWorkerSpotsForPlayer(q):0,occupied=e.played.workers?.length??0;
    const reason=!c.maxWorkerSpots?'':q.playerId!==session.humanPlayerId&&!c.isOpenDestination?'Только для владельца города':occupied>=capacity?'Все места заняты':sharedMeta.passed?.includes(session.humanPlayerId)?'Вы завершили действия в этом сезоне':!humanTurn()?'Сейчас ход соперника':player().numAvailableWorkers===0?'Нет свободного рабочего':tr(c.canPlayCheck(game,{inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:e.played}})||'Это место сейчас недоступно');
    const workerInfo={capacity,workers:e.played.workers??[],available,reason,open:c.isOpenDestination};
    objects.push({id:e.key,type:'city-card',owner,...pos,cardName:e.cardName,critter:c.isCritter,homeCardName:c.associatedCard?.type==='CARD'?c.associatedCard.cardName:null,roamCenter:center,roamRadius:5.8,label:cn(e.cardName),costHtml:'',played:e.played,arrival:arrivalMap.get(e.key),workerDestination,workerInfo,
     statusHtml:workerDestination?cityWorkerMarker({name:cn(e.cardName),available,occupied,capacity})+(e.cardName===CardName.STOREHOUSE?storedResources(e.played.resources):''):undefined,
     ariaLabel:workerDestination?`${cn(e.cardName)} — место рабочего, ${occupied} из ${capacity} занято — ${available?'можно разместить рабочего':reason}`:cn(e.cardName),available:!c.maxWorkerSpots||available,locked:!!c.maxWorkerSpots&&!available,lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>'});
   }
  });
  game.meadowCards.forEach((name,index)=>{const c=Card.fromName(name);objects.push({id:'market:'+index,type:'market',...MARKET_POSITIONS[index],owner:0,cardName:name,critter:c.isCritter,label:cn(name),costHtml:stock(c.baseCost)||'0',index,available:isPlayable(name,'MEADOW',index),locked:!isPlayable(name,'MEADOW',index),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' });});
  Object.entries(game.eventsMap).forEach(([name,owner],index)=>{objects.push({id:'event:'+name,type:'event',x:22+index%4*5.2,z:1.5+Math.floor(index/4)*2.7,label:en(name),costHtml:'',eventName:name,available:humanTurn()&&game.getClaimableEvents().includes(name),locked:!humanTurn()||!game.getClaimableEvents().includes(name),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' ,owner:game.players.findIndex(p=>p.playerId===owner)});});
  view.livingClearings=[...LIVING_CITIES.map(c=>({...c,radius:24,scaleX:.48,scaleZ:1})),{x:30.5,z:27,radius:10.5},{...LIVING_TREE,radius:5},{x:30,z:3,radius:11}];
  for(const t of view.tiles){const clear=view.livingClearings.some(c=>c.bounds?t.x>c.bounds.minX-1&&t.x<c.bounds.maxX+1&&t.z>c.bounds.minZ-1&&t.z<c.bounds.maxZ+1:Math.hypot(t.x-c.x,t.z-c.z)<c.radius)||(t.x>13&&t.x<47&&t.z<37);if(clear)t.type='meadow';}
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
    const id=`e-${pi}-${num}`,a=assignments.find(x=>x.id===id),home={x:(LIVING_CITIES[pi]?.x??30)-1+(num-1)%3,z:28+Math.floor((num-1)/3)};
    let x=home.x,z=home.z,locationId=null,hiddenAtLocation=false,seatHeight=0;
    if(a){const l=a.w.location?view.locations.find(l=>l.actualName===a.w.location):null;locationId=l?.id??a.key;
     if(l){const existing=view.units.filter(u=>u.locationId===l.id).length;const seat=workerSeatPosition(l,existing);x=seat.x;z=seat.z;hiddenAtLocation=seat.hidden;seatHeight=seat.yOffset??0;l.workers.push(id);}
     else{const dest=a.w.event?objects.find(o=>o.eventName===a.w.event):objects.find(o=>o.type==='city-card'&&o.cardName===a.w.playedCard?.cardName&&game.players[o.owner]?.playerId===a.w.playedCard?.cardOwnerId);x=dest?.x??30;z=(dest?.z??20)+.8;}
    }
    if(view.tiles[Math.round(z)*WORLD.width+Math.round(x)]?.type==='water')x-=2;
    view.units.push({id,number:num,name:names[pi*6+num-1],portrait:teams[pi]??pi,teamSpecies:teams[pi]??pi,owner:pi,kind:'worker',x,z,home,roamCenter:LIVING_CITIES[pi],roamRadius:5.5,hp:baseMap.units[0].hp,ready:1,attacked:0,locationId,hiddenAtLocation,seatHeight,placementKey:a?.key??null});
   }
  }
  if(old){const moved=view.units.find(u=>{const before=old.units.find(v=>v.id===u.id);return before&&u.locationId!==null&&u.placementKey!==before.placementKey;});
   if(moved){const before=old.units.find(u=>u.id===moved.id),temp=structuredClone(view);const v=temp.units.find(u=>u.id===moved.id);v.x=before.x;v.z=before.z;v.owner=0;
    try{const movedState=moveWorker(temp,moved.id,{x:moved.x,z:moved.z},{reserved:view.locations.map(l=>({x:l.x,z:l.z}))});view.lastMove={...movedState.lastMove,serial:game.gameStateId};}catch{}
   }
  }
  for(const l of view.locations){l.freeSpots=l.capacity===null?null:Math.max(0,l.capacity-l.workers.length);l.locked=!l.available;l.reason=l.actualName.includes('JOURNEY')&&view.season!=='AUTUMN'?'Доступно только осенью':l.capacity!==null&&l.freeSpots===0?'Все места заняты':sharedMeta.passed?.includes(session.humanPlayerId)?'Вы завершили действия в этом сезоне':!humanTurn()?'Сейчас ход соперника':player().numAvailableWorkers===0?'Все ваши рабочие уже размещены':l.locked?'Сейчас нельзя разместить работника':'';l.ariaLabel=l.name+(l.capacity===null?' — без ограничения мест':` — ${l.workers.length} из ${l.capacity} занято`)+(l.locked?' — '+l.reason:' — можно разместить рабочего');l.badgeOffsetZ=.9;l.badgeHtml=zoneBadge(l);}
  drawing=view;
 }
 function selectAvailable(){const p=playerIndex();if(!drawing.units.some(u=>u.id===selected&&u.owner===p&&u.locationId===null))selected=drawing.units.find(u=>u.owner===p&&u.locationId===null)?.id??drawing.units.find(u=>u.owner===p)?.id??null;}
 function startAction(){if(!actionCheckpoint&&!game.pendingGameInputs.length)actionCheckpoint=captureAction({game,meta:sharedMeta,layout:cityLayout,selected,arrivals:arrivalMap});}
 function settleAction(){if(!game.pendingGameInputs.length&&!payment&&!placement&&!placementQueue.length&&!sharedMeta.transition)actionCheckpoint=null;}
 function cancelAction(){
  if(!actionCheckpoint&&botTurn())return false;
  stopBot();botError=false;
  if(!actionCheckpoint){if(game.pendingGameInputs.length)return false;payment=null;placement=null;stagedPosition=null;}
  else{const restored=restoreAction(actionCheckpoint);game=restored.game;sharedMeta=restored.meta;cityLayout=restored.layout;selected=restored.selected;arrivalMap=restored.arrivals;}
  actionCheckpoint=null;payment=null;placement=null;stagedPosition=null;placementQueue=[];pendingIndex=0;promptChoice=[];promptResources={};menu=false;
  $('placement-caption').hidden=true;world.setLivingPlacementPreview?.(null);world.cancelFollow();project();selectAvailable();render();save();return true;
 }
 function step(input,actorId=session.humanPlayerId){
  if(actorId===session.humanPlayerId)startAction();
  try{const previousKeys=new Set(Object.keys(cityLayout));({game,meta:sharedMeta}=applySessionCommand(game,sharedMeta,session,actorId,{kind:'step',input,expectedStateId:game.gameStateId}));payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;project();
   if(actorId===session.humanPlayerId)placementQueue.push(...queuedCityPlacements(game,previousKeys,stagedPosition));
   const pairedAddition=actorId===session.humanPlayerId?cityCardEntries(player()).find(entry=>!previousKeys.has(entry.key)&&entry.pairedWith):null;
   const stagedAdded=stagedPosition&&game.players.slice(0,2).some((q,owner)=>owner===stagedPosition.owner&&cityCardEntries(q).some(entry=>!previousKeys.has(entry.key)&&entry.cardName===stagedPosition.cardName));
   if(stagedPosition?.used||stagedAdded||!game.pendingGameInputs.length)stagedPosition=null;
   selectAvailable();render();nextQueuedPlacement();settleAction();save();world.cancelFollow();
   if(pairedAddition){focusCamera('own',true);toast(cn(pairedAddition.cardName)+' поселяется в общей ячейке');}
   if(game.isGameOver())toast('Партия завершена');return true;}
  catch(e){const error=$('decision-error');if(error)error.textContent=tr(String(e.message).split('\n')[0]);else toast(String(e.message).split('\n')[0]);settleAction();return false;}
 }
 function pick(obj){
  if(menu||payment||game.pendingGameInputs.length||game.isGameOver()||!humanTurn()&&!placement)return;
  if(placement){
   if(obj.type!=='ground'&&obj.type!=='city-area')return;
   const x=obj.x,z=obj.z;
   if(!validCityPosition(placement.owner,x,z,cityLayout,placement.existingKey,placement.name)){toast('Выберите свободное место в городе '+game.players[placement.owner].name);return;}
   const chosen=placement;placement=null;world.setLivingPlacementPreview?.(null);$('placement-caption').hidden=true;
   if(chosen.existingKey){cityLayout[chosen.existingKey]={...cityLayout[chosen.existingKey],x,z};project();render();nextQueuedPlacement();settleAction();save();return;}
   stagedPosition={owner:chosen.owner,cardName:chosen.name,x,z,arrivalFrom:chosen.arrivalFrom};showPayment(chosen.name,chosen.source,chosen.index);return;
  }
  if(obj.type==='unit'){const u=drawing.units.find(u=>u.id===obj.id);if(u?.owner===playerIndex()&&!u.locationId){selected=u.id;world.cancelFollow();render();}return;}
  const object=drawing.livingObjects.find(o=>o.id===obj.id&&o.type===obj.type);
  if(object?.type==='market'){beginPlacement(object.cardName,'MEADOW',object.index);return;}
  if(object?.type==='city-card'){const c=Card.fromName(object.cardName);if(c.maxWorkerSpots&&game.getVisitableDestinationCards().some(p=>same(p,object.played)))step({inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:object.played}});else hover({...obj,pinned:true});return;}
  if(object?.type==='event'){if(game.getClaimableEvents().includes(object.eventName))step({inputType:GameInputType.CLAIM_EVENT,clientOptions:{event:object.eventName}});else hover({...obj,pinned:true});return;}
  if(object?.type==='season'){if(object.owner!==playerIndex())return;passSeason(session.humanPlayerId);return;}
  if(object?.type==='supplies')return;
  let l=obj.type==='location'?drawing.locations.find(l=>l.id===obj.id):obj.type==='ground'?drawing.locations.find(l=>Math.hypot(l.x-obj.x,l.z-obj.z)<1.7):null;
  if(!l)return;if(l.locked){hover({...obj,pinned:true});return;}const u=drawing.units.find(u=>u.id===selected);if(!u||u.locationId)selected=drawing.units.find(u=>u.owner===playerIndex()&&!u.locationId)?.id;
  if(!selected){toast('Нет свободных работников');return;}step({inputType:GameInputType.PLACE_WORKER,clientOptions:{location:l.actualName}});
 }
 function beginPlacement(name,source,index){
  if(game.pendingGameInputs.length||menu||payment||placementQueue.length)return;if(!humanTurn()){toast('Ожидаем соперника');return;}
  if(!getPaymentOptions(game,name,source,index).length){toast('Недостаточно ресурсов или нет места в городе');return;}
  startAction();const owner=name===CardName.FOOL?1-playerIndex():playerIndex(),arrivalFrom=source==='MEADOW'?{...MARKET_POSITIONS[index]}:{x:LIVING_CITIES[playerIndex()].x,z:27.4};
  focusCamera(owner===playerIndex()?'own':'opponent',true);
  const partner=name===CardName.WIFE?CardName.HUSBAND:name===CardName.HUSBAND?CardName.WIFE:null;
  if(partner&&player().getPlayedCards().some(card=>card.cardName===partner&&!card.pairId)){
   // Decide Pair first: a full city can accept this resident without a free slot
   stagedPosition={owner,cardName:name,arrivalFrom};showPayment(name,source,index);return;
  }
  placement={name,source,index,owner,arrivalFrom};$('placement-caption').textContent=cn(name)+' · выберите место в городе '+game.players[owner].name;$('placement-caption').hidden=false;renderHand();
 }
 function nextQueuedPlacement(){if(placement||payment||game.pendingGameInputs.length||!placementQueue.length)return;const e=placementQueue.shift();if(!cityLayout[e.key]){nextQueuedPlacement();return;}placement={name:e.cardName,owner:e.owner,existingKey:e.key};focusCamera(e.owner===playerIndex()?'own':'opponent',true);$('placement-caption').textContent=cn(e.cardName)+' · выберите место в городе '+game.players[e.owner].name;$('placement-caption').hidden=false;renderHand();}
 function isPlayable(name,source,index){
  if(!humanTurn()||game.pendingGameInputs.length)return false;
  const key=source+':'+index+':'+name;
  if(!paymentAvailability.has(key))paymentAvailability.set(key,getPaymentOptions(game,name,source,index).length>0);
  return paymentAvailability.get(key);
 }
 function requestCard(name){
  if(gameCardReady(name)||requestedCards.has(name))return;
  requestedCards.add(name);
  prepareGameCard(name).then(()=>{
   if(disposed)return;
   for(const node of root.querySelectorAll('[data-game-card-face]'))if(node.dataset.gameCardFace===name){node.innerHTML=gameCardFace(name);node.setAttribute('aria-busy','false');}
   handInteraction.refresh();clampDetail();
  }).catch(error=>{requestedCards.delete(name);console.error(error);if(!disposed)toast('Не удалось загрузить карту — обновите страницу');});
 }
 function renderHand(){
  const cards=player().getCardsInHand(),fan=$('hand-fan');handInteraction.clear();fan.style.setProperty('--hand-count',cards.length);fan.classList.toggle('placing',!!placement);
  fan.innerHTML=cards.map((name,index)=>`<div class="hand-card ${isPlayable(name,'HAND',index)?'is-playable':''}" data-hand-index="${index}" data-hand-name="${esc(name)}" style="--hand-offset:${index-(cards.length-1)/2};--hand-index:${index}" tabindex="0" role="button" aria-label="${esc(cn(name))} — ${isPlayable(name,'HAND',index)?'можно разыграть':'пока недоступно'}"><div class="hand-face">${cardHtml(name,{source:'HAND',index})}</div></div>`).join('');
 }
 function renderCityRail(){
  const rail=$('city-icon-rail');if(!drawing)return;
  if(cityRailOwner===null)cityRailOwner=playerIndex();
  const scroll=rail.querySelector('.city-rail-list')?.scrollTop??0;
  rail.innerHTML=cityRailMarkup(drawing.livingObjects,cityRailOwner,playerIndex());
  rail.querySelector('.city-rail-list').scrollTop=scroll;
  rail.hidden=menu||!!payment||humanDecision()||!!placement;
  positionCityRail();
 }
 function positionCityRail(){const stock=$('player-stock').getBoundingClientRect(),shell=root.querySelector('.living-shell').getBoundingClientRect();$('city-icon-rail').style.top=Math.max(112,stock.bottom-shell.top+12)+'px';}
 const disposeCityRail=bindCityRail($('city-icon-rail'),{
  onHover(id,anchorRect){hover({type:'city-card',id,anchorRect,clientX:anchorRect.right,clientY:anchorRect.top});},
  onLeave:hideDetail,
  onPick(id,anchorRect){const object=drawing?.livingObjects.find(o=>o.type==='city-card'&&o.id===id);if(object?.workerInfo?.available)pick({type:'city-card',id});else hover({type:'city-card',id,anchorRect,clientX:anchorRect.right,clientY:anchorRect.top});},
  onReposition(id){
   const object=drawing?.livingObjects.find(o=>o.type==='city-card'&&o.id===id);
   if(!object||object.critter||object.owner!==playerIndex()||!humanTurn()||placement||payment||game.pendingGameInputs.length||menu)return;
   startAction();placement={name:object.cardName,owner:object.owner,existingKey:id};focusCamera('own',true);
   $('placement-caption').textContent=cn(object.cardName)+' · новое место · правая кнопка — отмена';$('placement-caption').hidden=false;renderHand();
  },
  onOwner(owner){cityRailOwner=owner;renderCityRail();}
 });
 const railResize=()=>{positionCityRail();hideDetail();};window.addEventListener('resize',railResize);
 function hideDetail(){clearTimeout(hoverTimer);hoverTimer=null;$('object-detail').hidden=true;hoverKey=null;detailOrigin=null;}
 function clampDetail(){
  const d=$('object-detail');if(d.hidden)return;
  if(detailOrigin?.card){const label=world.labelMap?.get('living:'+detailOrigin.id)?.el,base=label?.getBoundingClientRect(),price=label?.querySelector('.living-object-cost')?.getBoundingClientRect();const anchor=detailOrigin.anchorRect??(base?{left:Math.min(base.left,price?.left??base.left),right:Math.max(base.right,price?.right??base.right),top:base.top,bottom:Math.max(base.bottom,price?.bottom??base.bottom)}:world.getLivingObjectScreenRect(detailOrigin.type,detailOrigin.id)??{left:detailOrigin.x-20,right:detailOrigin.x+20,top:detailOrigin.y-45,bottom:detailOrigin.y+40});const box=cardPreviewPlacement(anchor,{width:innerWidth,height:innerHeight,extraHeight:d.querySelector('.city-worker-detail')?.offsetHeight??0},[$('player-stock').getBoundingClientRect(),root.querySelector('.camera-zone-controls').getBoundingClientRect(),detailOrigin.anchorRect?$('city-icon-rail').getBoundingClientRect():null]);d.style.width=box.width+'px';d.style.left=box.left+'px';d.style.top=box.top+'px';return;}
  d.style.top=Math.max(12,Math.min(innerHeight-d.offsetHeight-12,parseFloat(d.style.top)||12))+'px';
 }
 function hover(obj){
  if(placement){hideDetail();if(obj?.type==='ground'){world.setLivingPlacementPreview?.({cardName:placement.name,owner:placement.owner,x:obj.x,z:obj.z,valid:validCityPosition(placement.owner,obj.x,obj.z,cityLayout,placement.existingKey,placement.name)});}return;}
  if(menu||payment||humanDecision()){hideDetail();return;}
  const d=$('object-detail'),px=obj?.clientX??world.windowPointer?.x,py=obj?.clientY??world.windowPointer?.y;
  const inside=r=>r&&px>=r.left&&px<=r.right&&py>=r.top&&py<=r.bottom;
  if(tooltipExclusion){if(inside(tooltipExclusion)){hideDetail();return;}tooltipExclusion=null;}
  if(!d.hidden&&inside(d.getBoundingClientRect())){tooltipExclusion=d.getBoundingClientRect();hideDetail();return;}
  if(!obj||['ground','unit','city-area','tree'].includes(obj.type)){hideDetail();return;}
  const key=obj.type+':'+obj.id;if(hoverKey===key){clearTimeout(hoverTimer);hoverTimer=null;clampDetail();return;}
  const object=drawing.livingObjects.find(o=>o.type===obj.type&&o.id===obj.id),location=drawing.locations.find(l=>obj.type==='location'&&l.id===obj.id);let html='';
  if(object?.type==='market')html=cardHtml(object.cardName,{source:'MEADOW',index:object.index});
  else if(object?.type==='city-card')html=(Card.fromName(object.cardName).maxWorkerSpots?cityWorkerDetail(object.workerInfo):'')+cardHtml(object.cardName,{played:object.played,owner:game.players[object.owner]});
  else if(object?.type==='event'){const e=Event.fromName(object.eventName);html=`<div class="world-note"><h2>${esc(en(object.eventName))}</h2><p>${esc(EVENT_TEXT[object.eventName]??fmt(e.eventDescription))}</p>${e.requiredCards?`<p>${e.requiredCards.map(cn).map(esc).join(' + ')}</p>`:''}<p>${object.owner>=0?'Получено: '+esc(game.players[object.owner].name):object.available?'Нажмите, чтобы разместить работника':'Условия пока не выполнены'}</p></div>`;}
  else if(object?.type==='supplies'){if(object.owner===playerIndex()){hideDetail();return;}const q=game.players[object.owner];html=`<div class="supply-tooltip"><h2>${esc(q.name)}</h2>${supplyStatus(q,object.forecast)}</div>`;}
  else if(object?.type==='season'){html=`<div class="world-note"><h2>${esc(SEASONS[sharedSeason(game,sharedMeta)])}</h2><p>${esc(object.reason)}</p><p>Следующий сезон начнётся, когда оба игрока закончат действия</p></div>`;}
  else if(location)html=zoneDetail(location);

  if(!html){hideDetail();return;}clearTimeout(hoverTimer);hoverTimer=null;hoverKey=key;d.innerHTML=html;d.hidden=false;const x=obj.clientX??world.windowPointer?.x??innerWidth/2,y=obj.clientY??world.windowPointer?.y??innerHeight/2;d.style.width=(object?.type==='supplies'?344:location?280:Math.min(320,(innerHeight-180)*.708))+'px';const width=d.offsetWidth;d.style.left=Math.max(12,Math.min(innerWidth-width-12,x>innerWidth*.6?x-width-24:x+24))+'px';d.style.top=(y-100)+'px';detailOrigin={type:obj.type,id:obj.id,x,y,anchorRect:obj.anchorRect,card:['market','city-card'].includes(object?.type)};clampDetail();
 }
 function render(){
  actions=new Map();root.querySelector('.living-shell').dataset.player=playerIndex();root.querySelector('.living-shell').dataset.season=drawing.season;world.render(drawing,playerIndex(),{selected,menu:false});
  $('turn-announcement').textContent=`Ход: ${game.getActivePlayer().name}, ${SEASONS[sharedSeason(game,sharedMeta)]}`;
  $('player-stock').innerHTML=supplyStatus(player(),sharedMeta.transition?null:forecastNextSeason(game,session.humanPlayerId,sharedMeta),true);
  hideDetail();renderHand();renderDecision();renderCityRail();scheduleBot();
 }

 function cardHtml(name,{source,index,played}={}){
  requestCard(name);
  const c=Card.fromName(name),playable=source&&isPlayable(name,source,index),visitable=played&&humanTurn()&&game.getVisitableDestinationCards().some(x=>same(x,played));
  const target=name===CardName.FOOL?game.players[1-playerIndex()]:player();
  const reason=source&&!playable?(humanDecision()?'Сначала завершите текущий эффект':sharedMeta.passed?.includes(session.humanPlayerId)?'Вы закончили действия в этом сезоне':!humanTurn()?'Сейчас ход соперника':c.isUnique&&target.hasCardInCity(name)?'Этот уникальный объект уже есть в городе':!target.canAddToCity(name,true)?'В городе нет свободной ячейки':'Не хватает ресурсов для оплаты карты'):played&&c.maxWorkerSpots&&!visitable?(played.workers?.length?'Место для работника занято':player().numAvailableWorkers===0?'Нет свободного работника':'Это место сейчас недоступно для посещения'):'';
  const counters=played?.resources&&Object.values(played.resources).some(Boolean)?`<span class="card-counters">${storedResources(played.resources)}</span>`:'';
  return `<div class="runtime-card${reason?' is-unavailable':playable?' is-playable':''}" data-card-name="${esc(name)}"${reason?` aria-label="${esc(reason)}"`:''}><div data-game-card-face="${esc(name)}" aria-busy="${!gameCardReady(name)}">${gameCardFace(name)}</div>${counters}</div>`;
 }
 function showPayment(name,source,index){
  try{const choices=getPaymentOptions(game,name,source,index);if(!choices.length){toast('Нет доступного способа оплаты');return;}
   if(choices.length===1){step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:name,source,sourceIdx:index,paymentOptions:choices[0]}});return;}
   payment={name,source,index,choices};renderDecision();
  }catch(e){toast(e.message);}
 }
 function paymentMarkup(p){const methods=[p.useAssociatedCard?'Заселить сооружение':null,p.cardToUse?`Использовать: ${cn(p.cardToUse)}`:null,p.cardToDungeon?`В подземелье: ${cn(p.cardToDungeon)}`:null].filter(Boolean);return `<span class="payment-method">${esc(methods.join(' · ')||'Оплатить ресурсами')}</span><span class="payment-resources">${decisionResources(p.resources)||'<span>Бесплатно</span>'}</span>`;}
 function setDecision(html){
  const layer=$('decision-layer'),previous=layer.querySelector('[role="dialog"]'),focused=layer.contains(document.activeElement)?document.activeElement.id:null,scroll=layer.querySelector('.decision-content')?.scrollTop??0;
  if(!previous&&html)dialogReturnFocus=document.activeElement;
  layer.innerHTML=html;const modal=layer.querySelector('.choice-dialog');
  if(modal){world.keys.clear();const content=modal.querySelector('.decision-content');if(content)content.scrollTop=scroll;let next=focused?modal.querySelector('#'+focused):null;if(next?.disabled&&focused.startsWith('resource-'))next=modal.querySelector('#resource-count-'+focused.split('-').at(-1));(next??modal.querySelector('button:not(:disabled),[tabindex="0"]'))?.focus({preventScroll:true});}
  else if(previous&&!html){(dialogReturnFocus?.isConnected?dialogReturnFocus:$('world-stage'))?.focus({preventScroll:true});dialogReturnFocus=null;}
 }
 function choiceDialog({context,title,body,footer,canCancel=true}){return `<div class="decision-backdrop" data-camera-ui><section class="decision-modal choice-dialog" role="dialog" aria-modal="true" aria-labelledby="effect-title"><header class="decision-heading"><span class="decision-context">${esc(context)}</span><h2 id="effect-title">${esc(title)}</h2>${canCancel?`<button type="button" class="decision-close" data-dialog="cancel-action" aria-label="Отменить действие" title="Отменить действие">${closeIcon}</button>`:''}</header><div class="decision-content">${body}<div id="decision-error" role="alert"></div>${canCancel?'':`<p class="legacy-cancel-note">${sharedMeta.transition?'Завершите получение наград, чтобы перейти к следующему сезону':'Завершите обязательный эффект карты, чтобы продолжить партию'}</p>`}</div><footer class="decision-footer">${canCancel?'<button type="button" data-dialog="cancel-action">Отмена</button>':'<span></span>'}${footer}</footer></section></div>`;}
 function canSubmitDecision(){const input=game.pendingGameInputs[pendingIndex];if(!input)return false;if(['SELECT_RESOURCES','SELECT_PAYMENT_FOR_CARD'].includes(input.inputType))return resourceChoiceModel(input,player(),promptResources).valid;const info=optionsFor(input);return promptChoice.length>=info.min&&promptChoice.length<=info.max;}
 function clearFinalTarget(){for(const label of world.labelMap?.values()??[])label.el.classList.remove('final-score-target');}
 function finalStepPosition(step){
  const target=step?.target,object=target?.type==='location'?drawing.locations.find(item=>item.id===target.id):drawing.livingObjects.find(item=>item.id===target?.id&&item.type===target?.type);
  if(object)return object;
  const owner=game.players.findIndex(p=>p.playerId===step?.playerId);return LIVING_CITIES[owner]??LIVING_CITIES[playerIndex()];
 }
 function focusFinalStep(step){
  const position=finalStepPosition(step),spread=step?.target?3.5:8.8;
  world.focusLivingZone('final-score',{minX:position.x-spread,maxX:position.x+spread,minZ:position.z-spread*.8,maxZ:position.z+spread*.8,minY:0,maxY:3.3},{top:105,bottom:180,left:70,right:80});
 }
 function stopFinalPresentation(){
  finalRun?.dispose();finalRun=null;finalStepId=null;clearFinalTarget();$('final-scoring-panel').hidden=true;root.querySelector('.living-shell').classList.remove('is-final-scoring');
 }
 function startFinalPresentation(){
  if(!game.isGameOver()||disposed)return;
  stopFinalPresentation();stopBot();hideDetail();handInteraction.clear();world.keys.clear();
  try{finalPlan=finalScoringPlan(game);}catch(error){console.error('Final scoring plan failed',error);return;}
  const panel=$('final-scoring-panel');panel.hidden=false;root.querySelector('.living-shell').classList.add('is-final-scoring');
  panel.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="final-scoring-title"><div class="final-scoring-heading"><h2 id="final-scoring-title">Подсчёт очков</h2><button type="button" data-final-skip>Показать итог</button></div><div class="final-scoring-totals">${finalPlan.scores.map(score=>`<div data-final-player="${esc(score.playerId)}"><span>${esc(score.name)}</span>${renderIcon('point',{size:28,label:''})}<strong>0</strong></div>`).join('')}</div><p class="final-scoring-source" aria-live="polite"></p><div class="final-scoring-progress" role="progressbar" aria-label="Ход подсчёта" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></section>`;
  finalRun=createFinalScoring(finalPlan,{
   onFrame(frame){
    if(disposed)return;
    for(const row of panel.querySelectorAll('[data-final-player]')){const score=frame.totals[row.dataset.finalPlayer];row.querySelector('strong').textContent=score;row.classList.toggle('is-counting',frame.step?.playerId===row.dataset.finalPlayer);}
    const progress=panel.querySelector('[role="progressbar"]');progress.setAttribute('aria-valuenow',Math.round(frame.progress*100));progress.firstElementChild.style.width=(frame.progress*100)+'%';
    if(frame.step&&frame.step.id!==finalStepId){
     finalStepId=frame.step.id;clearFinalTarget();
     const step=frame.step,owner=game.getPlayer(step.playerId),name=step.kind==='card'?cn(step.name):step.kind==='event'?en(step.name):step.kind==='location'?ln(step.name):step.name;
     panel.querySelector('.final-scoring-source').textContent=`${owner.name} · ${name} · ${step.points>0?'+':''}${step.points}`;
     const label=world.labelMap?.get((step.target?.type==='location'?'location:':'living:')+step.target?.id);label?.el.classList.add('final-score-target');focusFinalStep(step);
    }else if(frame.step&&world.cameraPresetId!=='final-score')focusFinalStep(frame.step);
   },
   onFinish(){stopFinalPresentation();renderDecision();root.querySelector('[data-final-replay]')?.focus({preventScroll:true});}
  });
  setDecision('');world.inputPaused=true;finalRun.start();panel.querySelector('[data-final-skip]')?.focus({preventScroll:true});
 }
 function renderDecision(){
  const layer=$('decision-layer');world.inputPaused=!!payment||menu||humanDecision()||game.isGameOver();for(const button of root.querySelectorAll('[data-camera-zone]'))button.disabled=world.inputPaused;if(world.inputPaused){handInteraction.clear();hideDetail();}
  if(menu&&!setupOnly&&menuPage==='home'){setDecision(`<div class="decision-backdrop" data-camera-ui><section class="decision-modal system-menu" role="dialog" aria-modal="true" aria-labelledby="system-title"><button class="system-close" data-system="resume" aria-label="Закрыть меню">×</button><p class="system-eyebrow">Эверделл</p><h2 id="system-title">Меню игры</h2><p>Партия сохраняется автоматически в этом браузере</p><div class="system-actions"><button class="primary" data-system="resume">Продолжить игру</button><button data-system="new">Новая игра против бота</button></div><details class="system-help"><summary>Управление</summary><dl><dt>Камера</dt><dd>Перетаскивание или WASD · колесо — масштаб · правая кнопка или Q/E — поворот</dd><dt>Быстрый переход</dt><dd>Кнопки справа — города, производство и рынок</dd><dt>Отмена размещения</dt><dd>Правая кнопка мыши или Esc</dd><dt>Меню</dt><dd>Esc — открыть или закрыть</dd></dl></details></section></div>`);return;}
  if(menu){setDecision(`<div class="decision-backdrop" data-camera-ui><section class="decision-modal species-setup" role="dialog" aria-modal="true" aria-labelledby="menu-title"><h2 id="menu-title">${setupOnly?'Партия против бота':'Новая партия против бота'}</h2>${setupOnly?'':'<p>Новая партия заменит текущее сохранение после нажатия «Начать новую партию»</p>'}<div class="species-teams">${[0,1].map(owner=>`<section class="species-team" data-team="${owner}"><h3>${esc(game.players[owner]?.name??'Игрок '+(owner+1))}</h3><div class="species-options">${SPECIES.map(species=>`<button type="button" class="species-option ${teamDraft[owner]===species.id?'selected':''}" data-species="${owner}:${species.id}" aria-pressed="${teamDraft[owner]===species.id}" ${teamDraft[1-owner]===species.id?'disabled':''}>${cardArt(species.card)}<span>${species.name}</span></button>`).join('')}</div></section>`).join('')}</div><div class="decision-footer">${setupOnly?'':'<button data-dialog="cancel">Отмена</button>'}<button data-dialog="${setupOnly?'apply-teams':'new'}" class="primary">${setupOnly?'Начать партию':'Начать новую партию'}</button></div></section></div>`);return;}

  if(game.isGameOver()){
   if(!finishedGameSeen){finishedGameSeen=true;startFinalPresentation();}
   if(finalRun?.active){setDecision('');return;}
   const scores=getScores(game).sort((a,b)=>b.total-a.total||b.eventCount-a.eventCount||b.resources-a.resources);
   const winners=scores.filter(s=>s.total===scores[0].total&&s.eventCount===scores[0].eventCount&&s.resources===scores[0].resources);
   setDecision(`<div class="decision-backdrop" data-camera-ui><section class="decision-modal results" role="dialog" aria-modal="true" aria-labelledby="result-title"><h2 id="result-title">${winners.length===1?`Победитель: ${esc(winners[0].name)}`:'Ничья'}</h2><table><thead><tr><th>Игрок</th><th>Карты</th><th>Жетоны</th><th>События</th><th>Путь</th><th>Итого</th></tr></thead><tbody>${scores.map(s=>`<tr><td>${esc(s.name)}</td><td>${s.cards}</td><td>${s.tokens}</td><td>${s.events}</td><td>${s.journey}</td><td><strong>${s.total}</strong></td></tr>`).join('')}</tbody></table><p>При равенстве очков учитываются события, затем оставшиеся ресурсы</p><div class="final-results-actions"><button type="button" data-final-replay>Повторить подсчёт</button><button data-dialog="menu" class="primary">Новая партия</button></div></section></div>`);return;
  }
  if(payment){setDecision(choiceDialog({context:cn(payment.name),title:'Как разыграть карту?',body:`<div class="payment-options">${payment.choices.map((p,i)=>`<button type="button" class="payment-option" data-payment="${i}">${paymentMarkup(p)}</button>`).join('')}</div>`,footer:'',canCancel:true}));return;}
  const pending=game.pendingGameInputs;if(!pending.length||!humanDecision()){setDecision('');return;}
  if(pendingIndex>=pending.length)pendingIndex=0;const input=pending[pendingIndex],type=input.inputType,context=input.cardContext?cn(input.cardContext):input.playedCardContext?cn(input.playedCardContext.cardName):input.locationContext?ln(input.locationContext):input.eventContext?en(input.eventContext):'Выбор действия';
  const titles={SELECT_CARDS:'Выберите карты',SELECT_CARDS_WITH_SOURCE:'Выберите карты',SELECT_PLAYED_CARDS:'Выберите карты города',DISCARD_CARDS:'Какие карты сбросить?',SELECT_PLAYER:'Выберите игрока',SELECT_RESOURCES:input.toSpend?'Какие ресурсы потратить?':'Выберите ресурсы',SELECT_PAYMENT_FOR_CARD:cn(input.card),SELECT_OPTION_GENERIC:'Выберите действие',SELECT_WORKER_PLACEMENT:'Выберите работника',SELECT_LOCATION:'Выберите место работы'};
  const info=optionsFor(input);let body='';
  if(type==='SELECT_RESOURCES'||type==='SELECT_PAYMENT_FOR_CARD')body=resourceChoiceMarkup(resourceChoiceModel(input,player(),promptResources));
  else body=`<div class="choice-grid">${info.options.map((option,i)=>`<label class="choice-item ${promptChoice.includes(i)?'checked':''}"><input type="${info.max===1?'radio':'checkbox'}" name="effect-choice" id="effect-choice-${i}" data-choice="${i}" ${promptChoice.includes(i)?'checked':''}><span>${optionHtml(option,type)}</span></label>`).join('')}</div><div class="decision-progress"><span>Выбрано</span><strong id="choice-count">${promptChoice.length}</strong><span>${info.min===info.max?'из '+info.max:'· от '+info.min+' до '+info.max}</span></div>`;
  const tabs=pending.length>1?`<div class="pending-switch">${pending.map((p,i)=>`<button type="button" data-pending="${i}" class="${i===pendingIndex?'active':''}">${esc(p.cardContext?cn(p.cardContext):p.playedCardContext?cn(p.playedCardContext.cardName):'Эффект '+(i+1))}</button>`).join('')}</div>`:'';
  const instruction=input.label?`<p class="effect-instruction">${esc(fmt(input.label)).replace(/\n/g,'<br>')}</p>`:'';
  const optional=!['SELECT_RESOURCES','SELECT_PAYMENT_FOR_CARD'].includes(type)&&info.min===0?'<button type="button" data-dialog="skip">Пропустить</button>':'';
  setDecision(choiceDialog({context,title:titles[type]??'Завершите действие',body:tabs+instruction+body,footer:`${optional}<button type="button" data-dialog="submit" class="primary" ${canSubmitDecision()?'':'disabled'}>${type==='SELECT_PAYMENT_FOR_CARD'?'Оплатить':'Подтвердить'}</button>`,canCancel:!!actionCheckpoint}));
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
  return `<b>${esc(cn(name))}${owner?' · '+esc(owner):''}</b><small>${esc(cardText(name)??'')}</small><span class="choice-meta">${decisionValue('VP',card.baseVP,22)}${decisionResources(card.baseCost,22)}</span>`;
 }
 function submitPending(){
  const input=structuredClone(game.pendingGameInputs[pendingIndex]);if(!input)return;if(!canSubmitDecision()){$('decision-error').textContent='Проверьте количество выбранных ресурсов или карт';return;}
  if(input.inputType==='SELECT_RESOURCES')input.clientOptions.resources={...promptResources};
  else if(input.inputType==='SELECT_PAYMENT_FOR_CARD')input.clientOptions.paymentOptions={...input.clientOptions.paymentOptions,resources:{...promptResources}};
  else{const info=optionsFor(input);if(promptChoice.length<info.min||promptChoice.length>info.max){$('decision-error').textContent=`Выберите от ${info.min} до ${info.max}`;return;}const values=promptChoice.map(i=>info.options[i]);input.clientOptions[info.field]=info.single?(values[0]??null):values;}
  step(input);
 }

 function focusCamera(zone,immediate=false){
  hideDetail();let bounds;
  if(zone==='own'||zone==='opponent'){const owner=zone==='own'?playerIndex():1-playerIndex(),c=LIVING_CITIES[owner];bounds={...(c.bounds??{minX:c.x-8.8,maxX:c.x+8.8,minZ:26.8,maxZ:41.2}),minY:0,maxY:5};}
  else if(zone==='market'){bounds={minX:19.7,maxX:41.3,minZ:23.7,maxZ:32,minY:0,maxY:3};}
  else {const points=drawing.locations.filter(p=>p.actualName!=='HAVEN'&&!p.actualName.includes('JOURNEY'));bounds={minX:Math.min(...points.map(p=>p.x))-2.3,maxX:Math.max(...points.map(p=>p.x))+2.3,minZ:9,maxZ:Math.max(...points.map(p=>p.z))+2.3,minY:0,maxY:3.8};}
  world.focusLivingZone(zone,bounds,{top:120,bottom:230,left:150,right:80});
  if(immediate){world.target.copy(world.desiredTarget);world.yaw=world.desiredYaw;world.pitch=world.desiredPitch;world.zoom=world.desiredZoom;world.updateCamera(1);}
 }
 function click(e){
  const system=e.target.closest('[data-system]')?.dataset.system;
  if(system){if(finalRun?.active)return;if(system==='resume'){menu=false;renderDecision();renderBotStatus();scheduleBot();root.querySelector('.system-menu-toggle')?.focus();}else{stopBot();hideDetail();menu=true;menuPage=system==='new'?'new':'home';teamDraft=teams.slice();renderDecision();renderBotStatus();}return;}

  if(e.target.closest('[data-final-skip]')){finalRun?.skip();return;}
  if(e.target.closest('[data-final-replay]')){startFinalPresentation();return;}
  if(finalRun?.active)return;
  const cameraButton=e.target.closest('[data-camera-zone]');if(cameraButton){if(!world.inputPaused)focusCamera(cameraButton.dataset.cameraZone);return;}
  const resourceStep=e.target.closest('[data-resource-step]');if(resourceStep){const input=game.pendingGameInputs[pendingIndex];if(input){promptResources=changeResourceChoice(input,player(),promptResources,resourceStep.dataset.resourceStep,Number(resourceStep.dataset.delta));renderDecision();}return;}
  const species=e.target.closest('[data-species]');if(species){const [owner,id]=species.dataset.species.split(':').map(Number);if(teamDraft[1-owner]!==id){teamDraft[owner]=id;renderDecision();}return;}
  if(e.target.closest('[data-bot-retry]')){botError=false;scheduleBot();return;}
  if(e.target.closest('[data-dialog="apply-teams"]')){teams=teamDraft.slice();setupOnly=false;menu=false;project();save();render();return;}
  const choice=e.target.closest('[data-choice]');if(choice){const i=Number(choice.dataset.choice),info=optionsFor(game.pendingGameInputs[pendingIndex]);if(info.max!==1&&choice.checked&&promptChoice.length>=info.max){choice.checked=false;return;}promptChoice=info.max===1?[i]:choice.checked?[...new Set([...promptChoice,i])]:promptChoice.filter(n=>n!==i);const count=$('choice-count');if(count)count.textContent=promptChoice.length;for(const el of root.querySelectorAll('.choice-item'))el.classList.toggle('checked',el.querySelector('input').checked);const submit=root.querySelector('[data-dialog="submit"]');if(submit)submit.disabled=!canSubmitDecision();return;}
  const pending=e.target.closest('[data-pending]');if(pending){pendingIndex=Number(pending.dataset.pending);promptChoice=[];promptResources={};renderDecision();return;}
  const pay=e.target.closest('[data-payment]');if(pay){const p=payment;step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:p.name,source:p.source,sourceIdx:p.index,paymentOptions:p.choices[Number(pay.dataset.payment)]}});return;}
  const cmd=e.target.closest('[data-command]');if(cmd){const data=actions.get(cmd.dataset.command);if(data?.kind==='play')beginPlacement(data.name,data.source,data.index);if(data?.kind==='input')step(data.input);return;}
  const hand=e.target.closest('[data-hand-index]');if(hand&&!e.target.closest('button')){beginPlacement(hand.dataset.handName,'HAND',Number(hand.dataset.handIndex));return;}
  const dialog=e.target.closest('[data-dialog]')?.dataset.dialog;
  if(dialog==='cancel-action'){cancelAction();return;}
  if(dialog==='skip'){promptChoice=[];submitPending();const empty=game.pendingGameInputs.length===1?game.pendingGameInputs[0]:null;if(empty?.inputType==='SELECT_RESOURCES'&&empty.minResources===0&&empty.maxResources===0){promptResources={};submitPending();}return;}
  if(dialog==='cancel'){if(menu&&!setupOnly){menuPage='home';renderDecision();return;}menu=false;payment=null;stagedPosition=null;renderDecision();scheduleBot();}
  if(dialog==='menu'){menuPage='new';stopBot();teamDraft=teams.slice();menu=true;renderDecision();renderBotStatus();}
  if(dialog==='submit')submitPending();
  if(dialog==='undo')cancelAction();
  if(dialog==='new'){
   try{stopFinalPresentation();finishedGameSeen=false;stopBot();botError=false;actionCheckpoint=null;teams=teamDraft.slice();game=newBotGame();sharedMeta=createSharedSeasonState(game);({game,meta:sharedMeta}=normalizeSharedGame(game,sharedMeta));arrivalMap.clear();setupOnly=false;menu=false;payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;tab='meadow';open=false;clearTimeout(toastTimer);$('toast').classList.remove('show');$('toast').textContent='';drawing=null;cityLayout={};placement=null;stagedPosition=null;placementQueue=[];world.gameSeed=null;project();selectAvailable();save();render();focusCamera('production',true);}catch(e){toast(e.message);}
  }
 }
 function change(e){if(e.target.matches('[data-resource]')){const value=Number(e.target.value);promptResources[e.target.dataset.resource]=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;}}
 function key(e){
  if(e.altKey||e.metaKey||e.ctrlKey)return;
  const modal=root.querySelector('.choice-dialog,.results,#final-scoring-panel:not([hidden]) [role="dialog"]');
  if(e.key==='Escape'&&finalRun?.active){e.preventDefault();finalRun.skip();return;}
  if(e.key==='Escape'){e.preventDefault();hideDetail();if(!menu&&(payment||humanDecision()||placement)){cancelAction();return;}if(menu){if(setupOnly)return;menu=false;renderDecision();scheduleBot();}else{stopBot();menuPage='home';teamDraft=teams.slice();menu=true;renderDecision();renderBotStatus();}return;}
  if(modal&&e.key==='Tab'){const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"]')],first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(modal&&e.target.matches('[data-resource-counter]')&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();promptResources=changeResourceChoice(game.pendingGameInputs[pendingIndex],player(),promptResources,e.target.dataset.resourceCounter,['ArrowUp','ArrowRight'].includes(e.key)?1:-1);renderDecision();return;}
  if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||modal)return;
  if(e.key==='Enter'&&e.target.matches('[data-hand-index]')){beginPlacement(e.target.dataset.handName,'HAND',Number(e.target.dataset.handIndex));return;}
  if(/^[1-6]$/.test(e.key)&&!world.inputPaused){const u=drawing.units.filter(u=>u.owner===playerIndex()&&!u.locationId)[Number(e.key)-1];if(u){selected=u.id;render();}}
 }

 function placementPointerDown(e){if(e.button!==2||!placement)return;e.preventDefault();e.stopPropagation();placementContextCancel=true;cancelAction();}
 function placementContextMenu(e){if(!placement&&!placementContextCancel)return;e.preventDefault();e.stopPropagation();if(placement)cancelAction();placementContextCancel=false;}
 root.addEventListener('pointerdown',placementPointerDown,true);root.addEventListener('contextmenu',placementContextMenu,true);
 root.addEventListener('click',click);root.addEventListener('input',change);window.addEventListener('keydown',key);
 project();selectAvailable();save();render();focusCamera('production',true);if(drawing.layoutConflicts?.length)toast('Старая застройка сохранена: есть пересечения. Правый клик по иконке здания — переместить');for(const name of game.meadowCards)requestCard(name);
 return()=>{disposed=true;stopFinalPresentation();stopBot();handInteraction.dispose();disposeCityRail();window.removeEventListener('resize',railResize);clearTimeout(toastTimer);clearTimeout(hoverTimer);root.removeEventListener('pointerdown',placementPointerDown,true);root.removeEventListener('contextmenu',placementContextMenu,true);root.removeEventListener('click',click);root.removeEventListener('input',change);window.removeEventListener('keydown',key);world.dispose();};
}
