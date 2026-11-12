import {createSharedSeasonState,normalizeSharedGame,stepSharedGame,requestSharedSeason,sharedSeason,canActShared,forecastNextSeason} from './shared-seasons.js?v=20261112-23';
import {zoneBadge,supplyStatus,lockIcon,SPECIES} from './living-ui.js?v=20261112-23';
import {LIVING_CITIES,LIVING_TREE,MARKET_POSITIONS,BASIC_POSITIONS,FOREST_POSITIONS,inCity,cityCardEntries,validCityPosition,reconcileCityLayout} from './living-board-state.js?v=living-2';
import {cardArt,portraitStyle,placeArt,resourceIcon,cardTypeIcon} from './everdell/art.js?v=20261112-23';
import {createGame,stepGame,serializeGame,restoreGame,getPaymentOptions,getScores,Card,Location,Event,CardName,LocationOccupancy,GameInputType,Season,CardType,PlayerStatus} from './everdell/engine.js?v=20261112-23';
import {CARD_NAMES,CARD_TEXT,LOCATION_NAMES,LOCATION_TEXT,EVENT_NAMES,EVENT_TEXT,SEASONS,CARD_TYPES,RESOURCE_NAMES,translateText} from './everdell/locale.js?v=20261112-23';
import {createMovementWorld,moveWorker} from './movement.js?v=20261112-23';
import {WORLD} from './data.js?v=20261112-23';
import {WorldView} from './world.js?v=20261112-23';

const SAVE='stone-wind-everdell-v1',LAYOUT_SAVE='stone-wind-living-layout-v1',SHARED_SAVE='stone-wind-shared-season-v1',TEAMS_SAVE='stone-wind-worker-teams-v1';
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
 let game=createGame({playerCount:2}),drawing=null,selected=null,tab='meadow',open=false,cityPlayer=null,pendingIndex=0,promptChoice=[],promptResources={},payment=null,menu=false,toastTimer,actions=new Map(),actionCounter=0,cityLayout={},placement=null,stagedPosition=null,placementQueue=[],hoverKey=null,hoverTimer=null,sharedMeta=null,teams=[1,3],setupOnly=false,arrivalMap=new Map();
 try{const saved=JSON.parse(localStorage.getItem(SAVE)||'null');if(saved)game=restoreGame(saved);}catch{}
 try{cityLayout=JSON.parse(localStorage.getItem(LAYOUT_SAVE)||'{}');}catch{}
 let sharedSaved=null;try{sharedSaved=JSON.parse(localStorage.getItem(SHARED_SAVE)||'null');}catch{}
 sharedMeta=createSharedSeasonState(game,sharedSaved);({game,meta:sharedMeta}=normalizeSharedGame(game,sharedMeta));
 try{const chosen=JSON.parse(localStorage.getItem(TEAMS_SAVE)||'null');if(chosen?.length===2&&chosen.every(n=>SPECIES.some(s=>s.id===n))&&chosen[0]!==chosen[1])teams=chosen;else{menu=true;setupOnly=true;}}catch{menu=true;setupOnly=true;}
 let teamDraft=teams.slice();
 const baseMap=createMovementWorld({seed:4811}),names=['Данила','Еремей','Ефим','Тихон','Иван','Терентий','Мирон','Савва','Матвей','Яков','Игнат','Пётр','Борис','Глеб','Назар','Лукьян','Прохор','Роман','Семён','Фёдор','Кузьма','Андрей','Степан','Елисей'];
 root.innerHTML=`<div class="game-shell placement-shell everdell-shell living-shell"><div class="world-stage" id="world-stage" aria-label="Живой Эверделл"></div><div class="hand-fan" id="hand-fan" data-camera-ui aria-label="Карты в руке"></div><aside id="object-detail" class="object-detail" data-camera-ui hidden></aside><div id="placement-caption" class="placement-caption" hidden></div><div id="decision-layer"></div><div class="toast" id="toast" role="status"></div><span class="sr-only" id="turn-announcement" aria-live="polite"></span></div>`;
 const $=id=>root.querySelector('#'+id);
 const world=new WorldView($('world-stage'),pick,hover);
 const player=()=>game.getActivePlayer();
 const cardText=name=>name===CardName.FOOL&&game.gameOptions.solo?'В одиночной игре сбросьте шута и выбранную карту из города Ругворта':CARD_TEXT[name];
 const playerIndex=()=>game.players.findIndex(p=>p.playerId===game.activePlayerId);
 function save(){try{localStorage.setItem(SAVE,JSON.stringify(serializeGame(game)));localStorage.setItem(LAYOUT_SAVE,JSON.stringify(cityLayout));localStorage.setItem(SHARED_SAVE,JSON.stringify(sharedMeta));if(!setupOnly)localStorage.setItem(TEAMS_SAVE,JSON.stringify(teams));}catch{}}
 function toast(s){$('toast').textContent=tr(s);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3600);}
 function command(data){const id='a'+(++actionCounter);actions.set(id,data);return id;}
 function labelForWorkerPlace(w){return w.location?ln(w.location):w.event?en(w.event):cn(w.playedCard.cardName);}
 function allowed(type){return game.getPossibleGameInputs().some(i=>i.inputType===type);}
 function activeTemplate(type){return game.getPossibleGameInputs().find(i=>i.inputType===type);}
 function project(){
  const old=drawing,view=structuredClone(baseMap);view.mode='placement';view.livingBoard=true;view.livingTree=LIVING_TREE;view.livingObjects=[];view.buildings=[];view.sources=[];view.sandbox=false;view.seed=481114;view.season=String(sharedSeason(game,sharedMeta)).toUpperCase();view.round=1+game.players.reduce((n,p)=>n+[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN].indexOf(p.currentSeason),0);view.serial=game.gameStateId;view.lastMove=null;view.locations=[];view.units=[];view.currentPlayer=playerIndex();
  view.players=game.players.map((p,i)=>({id:i,level:1,workers:0,gifts:[],explored:Array(WORLD.width*WORLD.height).fill(true)}));
  const availableLocations=new Set(canActShared(game,sharedMeta,game.activePlayerId)?game.getPlayableLocations():[]);
  const locations=Object.keys(game.locationsMap),basics=locations.filter(n=>Location.fromName(n).type==='BASIC'),forests=locations.filter(n=>Location.fromName(n).type==='FOREST');
  const coords=BASIC_POSITIONS,fcoords=FOREST_POSITIONS;
  const locCoords=new Map();basics.forEach((n,i)=>locCoords.set(n,coords[i]));forests.forEach((n,i)=>locCoords.set(n,fcoords[i]));locCoords.set('HAVEN',[17,35.7]);['JOURNEY_TWO','JOURNEY_THREE','JOURNEY_FOUR','JOURNEY_FIVE'].forEach((n,i)=>locCoords.set(n,[24+i*7,35.7]));
  for(const n of locations){const loc=Location.fromName(n),pos=locCoords.get(n);if(!pos)continue;
   const gain=loc.resourcesToGain??{},reward={};for(const r of RESOURCE_KEYS)if(gain[r])reward[r.toLowerCase()]=gain[r];
   let capacity=loc.occupancy==='UNLIMITED'?null:loc.occupancy==='EXCLUSIVE_FOUR'&&game.players.length===4?2:1;
   view.locations.push({id:'ever:'+n,name:n.includes('JOURNEY')?ln(n).replace('Путешествие','Путь'):ln(n),x:pos[0],z:pos[1],capacity,owner:null,workers:[],reward,cost:{},description:LOCATION_TEXT[n]??fmt(loc.description??loc.shortName),kind:n.includes('TWIG')||n.includes('RESIN')?'wood':n.includes('STONE')||n.includes('PEBBLE')?'stone':n==='HAVEN'?'house':'food',effectText:'',actualName:n,rewardIcons:{...gain},locationType:loc.type,available:availableLocations.has(n),season:player().currentSeason});
  }
  const layoutResult=reconcileCityLayout(game,cityLayout,stagedPosition);cityLayout=layoutResult.positions;
  if(old)for(const entry of layoutResult.added){const matched=stagedPosition?.used&&stagedPosition.cardName===entry.cardName&&stagedPosition.owner===entry.owner;arrivalMap.set(entry.key,{key:game.gameStateId+':'+entry.key,from:matched&&stagedPosition.arrivalFrom?stagedPosition.arrivalFrom:{x:LIVING_CITIES[entry.owner].x,z:27.4},style:Card.fromName(entry.cardName).isCritter?'walk':'carry',species:teams[entry.owner]});}
  const objects=view.livingObjects;
  game.players.slice(0,2).forEach((q,owner)=>{
   const center=LIVING_CITIES[owner];
   objects.push({id:'city-area:'+owner,type:'city-area',owner,...center,label:q.name,active:q.playerId===game.activePlayerId});
   const forecast=sharedMeta.transition?null:forecastNextSeason(game,q.playerId,sharedMeta);objects.push({id:'supplies:'+owner,type:'supplies',owner,x:center.x,z:24.5,label:'',ariaLabel:q.name+' — ресурсы и прирост',statusHtml:supplyStatus(q,forecast,q.playerId===game.activePlayerId),resources:q.getResources(),forecast});
   const passed=sharedMeta.passed?.includes(q.playerId),season=sharedSeason(game,sharedMeta);objects.push({id:'season:'+owner,type:'season',owner,x:center.x+4,z:27,label:passed?'Готов ✓':SEASONS[season],active:q.playerId===game.activePlayerId,available:q.playerId===game.activePlayerId&&!passed&&!sharedMeta.transition,locked:passed||q.playerId!==game.activePlayerId,lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' ,passed,reason:passed?'Ожидаем завершения действий соперника':q.playerId!==game.activePlayerId?'Сейчас ход соперника':'Нажмите, чтобы закончить действия в этом сезоне'});
   for(const e of cityCardEntries(q)){const pos=cityLayout[e.key],c=Card.fromName(e.cardName);objects.push({id:e.key,type:'city-card',owner,...pos,cardName:e.cardName,critter:c.isCritter,roamCenter:center,roamRadius:5.8,label:cn(e.cardName),costHtml:'',played:e.played,arrival:arrivalMap.get(e.key),available:!c.maxWorkerSpots||game.getVisitableDestinationCards().some(p=>same(p,e.played)),locked:c.maxWorkerSpots>0&&!game.getVisitableDestinationCards().some(p=>same(p,e.played)),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' });}
  });
  game.meadowCards.forEach((name,index)=>{const c=Card.fromName(name);objects.push({id:'market:'+index,type:'market',...MARKET_POSITIONS[index],owner:0,cardName:name,critter:c.isCritter,label:cn(name),costHtml:stock(c.baseCost)||'0',index,available:canActShared(game,sharedMeta,game.activePlayerId)&&game.getPlayableCards().some(p=>p.card===name&&p.source==='MEADOW'&&(p.sourceIdx===undefined||p.sourceIdx===index)),locked:!canActShared(game,sharedMeta,game.activePlayerId)||!game.getPlayableCards().some(p=>p.card===name&&p.source==='MEADOW'&&(p.sourceIdx===undefined||p.sourceIdx===index)),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' });});
  Object.entries(game.eventsMap).forEach(([name,owner],index)=>{objects.push({id:'event:'+name,type:'event',x:22+index%4*5.2,z:1.5+Math.floor(index/4)*2.7,label:en(name),costHtml:'',eventName:name,available:game.getClaimableEvents().includes(name),locked:!game.getClaimableEvents().includes(name),lockHtml:'<span class="living-object-lock">'+lockIcon+'</span>' ,owner:game.players.findIndex(p=>p.playerId===owner)});});
  view.livingClearings=[...LIVING_CITIES.map(c=>({...c,radius:9.5})),{x:30.5,z:27,radius:10.5},{...LIVING_TREE,radius:5},{x:30,z:3,radius:11}];
  for(const t of view.tiles){const clear=view.livingClearings.some(c=>Math.hypot(t.x-c.x,t.z-c.z)<c.radius)||(t.x>13&&t.x<47&&t.z<37);if(clear)t.type='meadow';}
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
    let x=home.x,z=home.z,locationId=null;
    if(a){const l=a.w.location?view.locations.find(l=>l.actualName===a.w.location):null;locationId=l?.id??a.key;
     if(l){const existing=view.units.filter(u=>u.locationId===l.id).length;x=l.x+(existing%3)-1;z=l.z+1+Math.floor(existing/3);l.workers.push(id);}
     else{const dest=a.w.event?objects.find(o=>o.eventName===a.w.event):objects.find(o=>o.type==='city-card'&&o.cardName===a.w.playedCard?.cardName&&game.players[o.owner]?.playerId===a.w.playedCard?.cardOwnerId);x=dest?.x??30;z=(dest?.z??20)+.8;}
    }
    if(view.tiles[Math.round(z)*WORLD.width+Math.round(x)]?.type==='water')x-=2;
    view.units.push({id,number:num,name:names[pi*6+num-1],portrait:teams[pi]??pi,teamSpecies:teams[pi]??pi,owner:pi,kind:'worker',x,z,home,roamCenter:LIVING_CITIES[pi],roamRadius:5.5,hp:baseMap.units[0].hp,ready:1,attacked:0,locationId,placementKey:a?.key??null});
   }
  }
  if(old){const moved=view.units.find(u=>{const before=old.units.find(v=>v.id===u.id);return before&&u.locationId!==null&&u.placementKey!==before.placementKey;});
   if(moved){const before=old.units.find(u=>u.id===moved.id),temp=structuredClone(view);const v=temp.units.find(u=>u.id===moved.id);v.x=before.x;v.z=before.z;v.owner=0;
    try{const movedState=moveWorker(temp,moved.id,{x:moved.x,z:moved.z},{reserved:view.locations.map(l=>({x:l.x,z:l.z}))});view.lastMove={...movedState.lastMove,serial:game.gameStateId};}catch{}
   }
  }
  for(const l of view.locations){l.freeSpots=l.capacity===null?null:Math.max(0,l.capacity-l.workers.length);l.locked=!l.available;l.reason=l.actualName.includes('JOURNEY')&&view.season!=='AUTUMN'?'Доступно только осенью':l.capacity!==null&&l.freeSpots===0?'Все места заняты':sharedMeta.passed?.includes(game.activePlayerId)?'Вы завершили действия в этом сезоне':game.getActivePlayer().numAvailableWorkers===0?'Все ваши рабочие уже размещены':l.locked?'Сейчас нельзя разместить работника':'';l.badgeOffsetZ=.9;l.badgeHtml=zoneBadge(l);}
  drawing=view;
 }
 function selectAvailable(){const p=playerIndex();if(!drawing.units.some(u=>u.id===selected&&u.owner===p&&u.locationId===null))selected=drawing.units.find(u=>u.owner===p&&u.locationId===null)?.id??drawing.units.find(u=>u.owner===p)?.id??null;}
 function step(input){
  try{const previousKeys=new Set(Object.keys(cityLayout));({game,meta:sharedMeta}=stepSharedGame(game,input,sharedMeta));payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;project();for(const q of game.players.slice(0,2))for(const entry of cityCardEntries(q)){if(!previousKeys.has(entry.key)&&!(stagedPosition?.used&&entry.cardName===stagedPosition.cardName&&cityLayout[entry.key]?.owner===stagedPosition.owner))placementQueue.push({...entry,owner:game.players.indexOf(q)});}stagedPosition=null;selectAvailable();save();render();nextQueuedPlacement();world.cancelFollow();if(game.isGameOver())toast('Партия завершена');}
  catch(e){stagedPosition=null;toast(String(e.message).split('\n')[0]);}
 }
 function pick(obj){
  if(menu||payment||game.pendingGameInputs.length||game.isGameOver())return;
  if(placement){
   if(obj.type!=='ground'&&obj.type!=='city-area')return;
   const x=obj.x,z=obj.z;
   if(!validCityPosition(placement.owner,x,z,cityLayout,placement.existingKey)){toast('Выберите свободное место в городе '+game.players[placement.owner].name);return;}
   const chosen=placement;placement=null;world.setLivingPlacementPreview?.(null);$('placement-caption').hidden=true;
   if(chosen.existingKey){cityLayout[chosen.existingKey]={...cityLayout[chosen.existingKey],x,z};project();save();render();nextQueuedPlacement();return;}
   stagedPosition={owner:chosen.owner,cardName:chosen.name,x,z,arrivalFrom:chosen.arrivalFrom};showPayment(chosen.name,chosen.source,chosen.index);return;
  }
  if(obj.type==='unit'){const u=drawing.units.find(u=>u.id===obj.id);if(u?.owner===playerIndex()&&!u.locationId){selected=u.id;world.cancelFollow();render();}return;}
  const object=drawing.livingObjects.find(o=>o.id===obj.id&&o.type===obj.type);
  if(object?.type==='market'){beginPlacement(object.cardName,'MEADOW',object.index);return;}
  if(object?.type==='city-card'){const c=Card.fromName(object.cardName);if(c.maxWorkerSpots&&game.getVisitableDestinationCards().some(p=>same(p,object.played)))step({inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:object.played}});else hover({...obj,pinned:true});return;}
  if(object?.type==='event'){if(game.getClaimableEvents().includes(object.eventName))step({inputType:GameInputType.CLAIM_EVENT,clientOptions:{event:object.eventName}});else hover({...obj,pinned:true});return;}
  if(object?.type==='season'){if(object.owner!==playerIndex())return;try{({game,meta:sharedMeta}=requestSharedSeason(game,sharedMeta,game.activePlayerId));project();selectAvailable();save();render();}catch(e){toast(e.message);}return;}
  if(object?.type==='supplies')return;
  let l=obj.type==='location'?drawing.locations.find(l=>l.id===obj.id):obj.type==='ground'?drawing.locations.find(l=>Math.hypot(l.x-obj.x,l.z-obj.z)<1.7):null;
  if(!l)return;if(l.locked){hover({...obj,pinned:true});return;}const u=drawing.units.find(u=>u.id===selected);if(!u||u.locationId)selected=drawing.units.find(u=>u.owner===playerIndex()&&!u.locationId)?.id;
  if(!selected){toast('Нет свободных работников');return;}step({inputType:GameInputType.PLACE_WORKER,clientOptions:{location:l.actualName}});
 }
 function beginPlacement(name,source,index){
  if(game.pendingGameInputs.length||menu||payment||placementQueue.length)return;if(!canActShared(game,sharedMeta,game.activePlayerId)){toast('Ожидаем соперника');return;}
  if(!getPaymentOptions(game,name,source,index).length){toast('Недостаточно ресурсов или нет места в городе');return;}
  placement={name,source,index,owner:name===CardName.FOOL?1-playerIndex():playerIndex(),arrivalFrom:source==='MEADOW'?{...MARKET_POSITIONS[index]}:{x:LIVING_CITIES[playerIndex()].x,z:27.4}};hideDetail();$('placement-caption').textContent=cn(name)+' · выберите место в городе '+game.players[placement.owner].name;$('placement-caption').hidden=false;renderHand();
 }
 function nextQueuedPlacement(){if(placement||payment||game.pendingGameInputs.length||!placementQueue.length)return;const e=placementQueue.shift();if(!cityLayout[e.key]){nextQueuedPlacement();return;}placement={name:e.cardName,owner:e.owner,existingKey:e.key};$('placement-caption').textContent=cn(e.cardName)+' · выберите место в городе '+game.players[e.owner].name;$('placement-caption').hidden=false;renderHand();}
 function renderHand(){
  const cards=player().getCardsInHand(),fan=$('hand-fan');fan.classList.toggle('placing',!!placement);fan.innerHTML=cards.map((name,index)=>`<div class="hand-card" data-hand-index="${index}" data-hand-name="${esc(name)}" style="--hand-offset:${index-(cards.length-1)/2};--hand-count:${cards.length}" tabindex="0" role="button" aria-label="${esc(cn(name))} — карта в руке">${cardHtml(name,{source:'HAND',index})}</div>`).join('');
 }
 function hideDetail(){clearTimeout(hoverTimer);hoverTimer=null;$('object-detail').hidden=true;hoverKey=null;}
 function hover(obj){
  if(placement){hideDetail();if(obj?.type==='ground'){world.setLivingPlacementPreview?.({cardName:placement.name,owner:placement.owner,x:obj.x,z:obj.z,valid:validCityPosition(placement.owner,obj.x,obj.z,cityLayout,placement.existingKey)});}return;}
  if(menu||payment||game.pendingGameInputs.length)return;
  const d=$('object-detail');if(!obj||obj.type==='ground'||obj.type==='unit'||obj.type==='city-area'){if(!hoverTimer)hoverTimer=setTimeout(()=>{hoverTimer=null;if(!d.matches(':hover'))hideDetail();},160);return;}
  const key=obj.type+':'+obj.id;if(hoverKey===key){clearTimeout(hoverTimer);hoverTimer=null;return;}
  const object=drawing.livingObjects.find(o=>o.type===obj.type&&o.id===obj.id),location=drawing.locations.find(l=>obj.type==='location'&&l.id===obj.id);let html='';
  if(object?.type==='market')html=cardHtml(object.cardName,{source:'MEADOW',index:object.index});
  else if(object?.type==='city-card')html=cardHtml(object.cardName,{played:object.played,owner:game.players[object.owner]});
  else if(object?.type==='event'){const e=Event.fromName(object.eventName);html=`<div class="world-note"><h2>${esc(en(object.eventName))}</h2><p>${esc(EVENT_TEXT[object.eventName]??fmt(e.eventDescription))}</p>${e.requiredCards?`<p>${e.requiredCards.map(cn).map(esc).join(' + ')}</p>`:''}<p>${object.owner>=0?'Получено: '+esc(game.players[object.owner].name):object.available?'Нажмите, чтобы разместить работника':'Условия пока не выполнены'}</p></div>`;}
  else if(object?.type==='supplies'){hideDetail();return;const q=game.players[object.owner];html=`<div class="world-note"><h2>${esc(q.name)}</h2><div class="world-resources">${stock(q.getResources(),true)}</div><p>${SEASONS[q.currentSeason]} · город ${q.getNumOccupiedSpacesInCity()}/15</p><p>Свободные работники: ${q.toJSON(true).numWorkers-q.toJSON(true).placedWorkers.length}</p></div>`;}
  else if(object?.type==='season'){html=`<div class="world-note"><h2>${esc(SEASONS[sharedSeason(game,sharedMeta)])}</h2><p>${esc(object.reason)}</p><p>Следующий сезон начнётся, когда оба игрока закончат действия</p></div>`;}
  else if(location){if(!location.locked){hideDetail();return;}html=`<div class="world-note locked-note">${lockIcon}<p>${esc(location.reason)}</p></div>`;}

  if(!html){hideDetail();return;}clearTimeout(hoverTimer);hoverTimer=null;hoverKey=key;d.innerHTML=html;d.hidden=false;const x=obj.clientX??world.windowPointer?.x??innerWidth/2,y=obj.clientY??world.windowPointer?.y??innerHeight/2;d.style.left=Math.max(12,Math.min(innerWidth-320,x>innerWidth*.6?x-322:x+24))+'px';d.style.top=Math.max(12,Math.min(innerHeight-d.offsetHeight-16,y-100))+'px';
 }
 function render(){
  actions=new Map();root.querySelector('.living-shell').dataset.player=playerIndex();root.querySelector('.living-shell').dataset.season=drawing.season;world.render(drawing,playerIndex(),{selected,menu:false});
  $('turn-announcement').textContent=`Ход: ${player().name}, ${SEASONS[sharedSeason(game,sharedMeta)]}`;
  hideDetail();renderHand();renderDecision();
 }

 function cardHtml(name,{source,index,played,owner,optionIndex}={}){
  const c=Card.fromName(name),blocked=source==='MEADOW'&&game.gameOptions.solo?.blockedMeadow?.includes(index),playable=!blocked&&source&&game.getPlayableCards().some(x=>x.card===name&&x.source===source&&(x.sourceIdx===undefined||x.sourceIdx===index)),visitable=played&&game.getVisitableDestinationCards().some(x=>same(x,played));
  const target=name===CardName.FOOL?game.players[1-playerIndex()]:player();const lockReason=source&&!playable?(game.pendingGameInputs.length?'Сначала завершите текущий эффект':sharedMeta.passed?.includes(game.activePlayerId)?'Вы закончили действия в этом сезоне':c.isUnique&&target.hasCardInCity(name)?'Этот уникальный объект уже есть в городе':!target.canAddToCity(name,true)?'В городе нет свободной ячейки':'Не хватает ресурсов для оплаты карты'):played&&c.maxWorkerSpots&&!visitable?(played.workers?.length?'Место для работника занято':player().numAvailableWorkers===0?'Нет свободного работника':'Это место сейчас недоступно для посещения'):'';
  const association=c.associatedCard?.type==='CARD'?cn(c.associatedCard.cardName):c.associatedCard?.type==='HUSBAND_WIFE'?'Муж или жена':c.associatedCard?.type==='ANY'?'Любое существо':null;
  const action=optionIndex!==undefined?'':source?`<button class="play-card" data-command="${command({kind:'play',name,source,index})}" ${playable&&!game.pendingGameInputs.length?'':'disabled'}>${blocked?'Занято Ругвортом':playable?'Разыграть':'Недоступно сейчас'}</button>`:played&&c.maxWorkerSpots>0?`<button class="play-card" data-command="${command({kind:'input',input:{inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard:played}}})}" ${visitable&&!game.pendingGameInputs.length?'':'disabled'}>${visitable?'Разместить работника':played.workers?.length?'Занято':'Недоступно сейчас'}</button>`:'';
  return `<article class="game-card printed-card ${CATEGORY[c.cardType]??''}" aria-label="${esc(cn(name))}"><div class="card-illustration">${cardArt(name)}<div class="card-cost-medallion" aria-label="Стоимость">${c.isCritter&&association?`<span class="card-building-alternative" title="Бесплатно через ${esc(association)}">${esc(association)}</span><span class="card-cost-or">или</span>`:''}${stock(c.baseCost)||'<span class="card-free">0</span>'}</div><span class="base-points" title="Базовые победные очки" aria-label="${c.baseVP} победных очков"><b>${c.baseVP}</b>${resourceIcon('VP')}</span><div class="card-title-ribbon"><span class="card-sigil" title="${esc(CARD_TYPES[c.cardType])}" aria-label="${esc(CARD_TYPES[c.cardType])}">${cardTypeIcon(c.cardType)}<i title="Копий в колоде">${c.numInDeck}</i></span><h2>${esc(cn(name))}</h2></div></div><div class="card-paper">${lockReason?`<div class="card-lock-reason">${lockIcon}<span>${esc(lockReason)}</span></div>`:''}<div class="card-type-line">${c.isUnique?'Уникальное':'Обычное'} ${c.isCritter?'существо':'сооружение'}</div><div class="card-rules" tabindex="0" aria-label="Эффект: ${esc(cn(name))}"><p class="card-effect">${esc(cardText(name)??fmt(c.cardDescription))}</p>${played?.resources&&Object.values(played.resources).some(Boolean)?`<div class="card-storage">На карте: ${stock(played.resources)}</div>`:''}</div>${association&&!c.isCritter?`<div class="card-association"><span>${c.isCritter?'Бесплатно через':'Принимает'}</span><b>${esc(association)}</b>${!c.isCritter?`<i class="card-door ${played?.usedForCritter?'closed':''}" title="${played?.usedForCritter?'Занято':'Свободное сооружение'}" aria-label="${played?.usedForCritter?'Занято':'Свободное сооружение'}"></i>`:''}</div>`:''}</div>${action?`<div class="card-action">${action}</div>`:''}</article>`;
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
  if(menu){layer.innerHTML=`<div class="decision-backdrop" data-camera-ui><section class="decision-modal species-setup" role="dialog" aria-modal="true" aria-labelledby="menu-title"><h2 id="menu-title">${setupOnly?'Кто поселится в долине?':'Новая партия'}</h2><div class="species-teams">${[0,1].map(owner=>`<section class="species-team" data-team="${owner}"><h3>${esc(game.players[owner]?.name??'Игрок '+(owner+1))}</h3><div class="species-options">${SPECIES.map(species=>`<button type="button" class="species-option ${teamDraft[owner]===species.id?'selected':''}" data-species="${owner}:${species.id}" aria-pressed="${teamDraft[owner]===species.id}" ${teamDraft[1-owner]===species.id?'disabled':''}>${cardArt(species.card)}<span>${species.name}</span></button>`).join('')}</div></section>`).join('')}</div><div class="decision-footer">${setupOnly?'':'<button data-dialog="cancel">Отмена</button>'}<button data-dialog="${setupOnly?'apply-teams':'new'}" class="primary">${setupOnly?'Продолжить':'Начать новую партию'}</button></div></section></div>`;return;}

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

 function click(e){
  const species=e.target.closest('[data-species]');if(species){const [owner,id]=species.dataset.species.split(':').map(Number);if(teamDraft[1-owner]!==id){teamDraft[owner]=id;renderDecision();}return;}
  if(e.target.closest('[data-dialog="apply-teams"]')){teams=teamDraft.slice();setupOnly=false;menu=false;project();save();render();return;}
  const choice=e.target.closest('[data-choice]');if(choice){const i=Number(choice.dataset.choice),info=optionsFor(game.pendingGameInputs[pendingIndex]);promptChoice=info.max===1?[i]:choice.checked?[...promptChoice,i]:promptChoice.filter(n=>n!==i);const count=$('choice-count');if(count)count.textContent=promptChoice.length;for(const el of root.querySelectorAll('.choice-item'))el.classList.toggle('checked',el.querySelector('input').checked);return;}
  const pending=e.target.closest('[data-pending]');if(pending){pendingIndex=Number(pending.dataset.pending);promptChoice=[];promptResources={};renderDecision();return;}
  const pay=e.target.closest('[data-payment]');if(pay){const p=payment;step({inputType:GameInputType.PLAY_CARD,clientOptions:{card:p.name,source:p.source,sourceIdx:p.index,paymentOptions:p.choices[Number(pay.dataset.payment)]}});return;}
  const cmd=e.target.closest('[data-command]');if(cmd){const data=actions.get(cmd.dataset.command);if(data?.kind==='play')beginPlacement(data.name,data.source,data.index);if(data?.kind==='input')step(data.input);return;}
  const hand=e.target.closest('[data-hand-index]');if(hand&&!e.target.closest('button')){beginPlacement(hand.dataset.handName,'HAND',Number(hand.dataset.handIndex));return;}
  const dialog=e.target.closest('[data-dialog]')?.dataset.dialog;
  if(dialog==='cancel'){menu=false;payment=null;stagedPosition=null;renderDecision();}
  if(dialog==='menu'){teamDraft=teams.slice();menu=true;renderDecision();}
  if(dialog==='submit')submitPending();
  if(dialog==='undo')step({inputType:GameInputType.UNDO});
  if(dialog==='new'){
   try{teams=teamDraft.slice();game=createGame({playerCount:2});sharedMeta=createSharedSeasonState(game);({game,meta:sharedMeta}=normalizeSharedGame(game,sharedMeta));arrivalMap.clear();setupOnly=false;menu=false;payment=null;pendingIndex=0;promptChoice=[];promptResources={};cityPlayer=null;tab='meadow';open=false;clearTimeout(toastTimer);$('toast').classList.remove('show');$('toast').textContent='';drawing=null;cityLayout={};placement=null;stagedPosition=null;placementQueue=[];world.gameSeed=null;project();selectAvailable();save();render();world.focusAt(30,26.5);world.desiredYaw=0;world.desiredPitch=.88;world.desiredZoom=.64;world.target.copy(world.desiredTarget);world.yaw=0;world.pitch=.88;world.zoom=.64;world.updateCamera(1);}catch(e){toast(e.message);}
  }
 }
 function change(e){if(e.target.matches('[data-resource]')){const value=Number(e.target.value);promptResources[e.target.dataset.resource]=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;}}
 function key(e){if(e.altKey||e.metaKey||e.ctrlKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
  if(e.key==='Escape'){hideDetail();if(placement){if(!placement.existingKey){placement=null;stagedPosition=null;world.setLivingPlacementPreview?.(null);$('placement-caption').hidden=true;renderHand();}return;}if(menu||payment){if(setupOnly)return;menu=false;payment=null;stagedPosition=null;renderDecision();}else{teamDraft=teams.slice();menu=true;renderDecision();}return;}
  if(e.key==='Enter'&&e.target.matches('[data-hand-index]')){beginPlacement(e.target.dataset.handName,'HAND',Number(e.target.dataset.handIndex));return;}
  if(/^[1-6]$/.test(e.key)&&!world.inputPaused){const u=drawing.units.filter(u=>u.owner===playerIndex()&&!u.locationId)[Number(e.key)-1];if(u){selected=u.id;render();}}
 }

 root.addEventListener('click',click);root.addEventListener('input',change);window.addEventListener('keydown',key);$('object-detail').addEventListener('mouseenter',()=>{clearTimeout(hoverTimer);hoverTimer=null;});$('object-detail').addEventListener('mouseleave',hideDetail);
 project();selectAvailable();save();render();world.focusAt(30,26.5);world.desiredYaw=0;world.desiredPitch=.88;world.desiredZoom=.64;world.target.copy(world.desiredTarget);world.yaw=0;world.pitch=.88;world.zoom=.64;world.updateCamera(1);
 return()=>{clearTimeout(toastTimer);clearTimeout(hoverTimer);root.removeEventListener('click',click);root.removeEventListener('input',change);window.removeEventListener('keydown',key);world.dispose();};
}
