import {createMovementWorld,moveWorker} from './movement.js';
import {WORLD} from './data.js';

export const RESOURCES=[
 {key:'wood',name:'Древесина',icon:'♣',color:'#88a879'},
 {key:'stone',name:'Камень',icon:'◆',color:'#b7bdc0'},
 {key:'food',name:'Еда',icon:'●',color:'#dfba70'}
];
export const CARDS={
 farm:{name:'Ферма',category:'production',cost:{wood:2,stone:1},income:{food:1},description:'+1 еда сразу и в конце каждого раунда'},
 orchard:{name:'Плодовый сад',category:'production',cost:{wood:3,food:1},income:{food:2},description:'+2 еды сразу и в конце каждого раунда'},
 forester:{name:'Лесничий',category:'improvement',cost:{food:2},unique:true,description:'+1 древесина при размещении рабочего в лесу или на опушке'},
 mason:{name:'Каменотёс',category:'improvement',cost:{food:2,wood:1},unique:true,description:'+1 камень при размещении рабочего в каменоломне'},
 workshop:{name:'Мастерская',category:'location',cost:{wood:2},unique:true,description:'Личное место работы: обмен 1 древесины на 2 камня'}
};

const fail=(ok,message)=>{if(!ok)throw new Error(message);};
const copy=s=>structuredClone(s);
const occupied=s=>new Set(s.units.map(u=>`${u.x},${u.z}`));
const publicLocation=(id,name,x,z,reward,description,capacity=1,draw=0)=>({id,name,x,z,reward,cost:{},description,capacity,draw,owner:null,workers:[]});
function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
function addResources(player,amount){for(const {key}of RESOURCES)player.resources[key]+=(amount?.[key]??0);}
function canAfford(player,cost){return RESOURCES.every(({key})=>player.resources[key]>=(cost?.[key]??0));}
function pay(player,cost){for(const {key}of RESOURCES)player.resources[key]-=(cost?.[key]??0);}
function assertTurn(state){fail(state.mode==='placement'&&state.version==='placement-1','Несовместимая партия');fail(state.currentPlayer===0||state.currentPlayer===1,'Нет активного игрока');fail(!state.players[state.currentPlayer].passed,'Этот игрок уже завершил раунд');}
function nextTurn(state){const other=1-state.currentPlayer;if(!state.players[other].passed)state.currentPlayer=other;}
function drawTo(state,destination,amount){for(let i=0;i<amount&&state.deck.length;i++)destination.push(state.deck.shift());}

export function createPlacementWorld({seed=4811}={}){
 const state=createMovementWorld({seed});
 Object.assign(state,{version:'placement-1',mode:'placement',currentPlayer:0,firstPlayer:0,action:0,lastAction:null,market:[],deck:[]});
 for(let p=0;p<2;p++)Object.assign(state.players[p],{name:`Игрок ${p+1}`,workers:3,resources:{wood:1,stone:0,food:1},passed:false,hand:[],cards:[],explored:Array(WORLD.width*WORLD.height).fill(true)});
 state.units.forEach((u,i)=>{u.owner=i<3?0:1;u.locationId=null;u.home={x:u.x,z:u.z};});
 state.locations=[
  publicLocation('forest','Лес',3,17,{wood:3},'Получить 3 древесины'),
  publicLocation('quarry','Каменоломня',13,17,{stone:2},'Получить 2 камня'),
  publicLocation('farm','Поля',16,25,{food:3},'Получить 3 еды'),
  publicLocation('market','Рынок',13,31,{food:1},'Получить 1 еду и взять 1 карту',1,1),
  publicLocation('common-wood','Опушка',3,30,{wood:1},'Получить 1 древесину',null),
  publicLocation('common-food','Сбор ягод',8,33,{food:1},'Получить 1 еду',null)
 ];
 let n=0;const card=type=>({id:`card-${++n}`,type});
 for(const p of state.players)p.hand=[card('farm'),card('workshop')];
 state.market=['forester','mason','farm','orchard'].map(card);
 state.deck=Array.from({length:8},()=>Object.keys(CARDS)).flat().map(card);
 const random=seeded(seed^0x105adc);
 for(let i=state.deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[state.deck[i],state.deck[j]]=[state.deck[j],state.deck[i]];}
 state.totalCards=n;
 return state;
}

function cardCheck(state,source,id){
 assertTurn(state);fail(source==='hand'||source==='market','Неизвестный источник карты');
 const player=state.players[state.currentPlayer],collection=source==='hand'?player.hand:state.market,instance=collection.find(c=>c.id===id);
 fail(instance,'Карта уже недоступна');const card=CARDS[instance.type];fail(card,'Неизвестная карта');
 fail(!card.unique||!player.cards.some(c=>c.type===instance.type),'Такая карта уже есть в поселении');
 fail(canAfford(player,card.cost),'Недостаточно ресурсов');
 return {player,collection,instance,card};
}
export function getCardError(state,source,id){try{cardCheck(state,source,id);return null;}catch(e){return e.message;}}

export function playCard(state,source,id){
 cardCheck(state,source,id);
 const next=copy(state),{player,collection,instance,card}=cardCheck(next,source,id);
 pay(player,card.cost);collection.splice(collection.findIndex(c=>c.id===id),1);player.cards.push(instance);
 if(source==='market')drawTo(next,next.market,1);
 addResources(player,card.income);
 if(instance.type==='workshop')next.locations.push({id:`workshop-${next.currentPlayer}`,name:'Мастерская',x:18,z:next.currentPlayer===0?20:29,capacity:1,owner:next.currentPlayer,cost:{wood:1},reward:{stone:2},description:'Обменять 1 древесину на 2 камня',draw:0,workers:[]});
 next.serial++;next.action++;next.lastAction={type:'card',player:next.currentPlayer,id,cardType:instance.type};nextTurn(next);return next;
}

function workerCheck(state,workerId,locationId){
 assertTurn(state);
 const player=state.players[state.currentPlayer],worker=state.units.find(u=>u.id===workerId),location=state.locations.find(l=>l.id===locationId);
 fail(worker&&worker.owner===state.currentPlayer,'Выберите рабочего текущего игрока');
 fail(worker.locationId===null,'Рабочий занят до следующего раунда');
 fail(location,'Выберите место работы');
 fail(location.owner===null||location.owner===state.currentPlayer,'Это мастерская соперника');
 fail(location.capacity===null||location.workers.length<location.capacity,'Место уже занято');
 fail(canAfford(player,location.cost),'Для обмена не хватает ресурсов');
 return {worker,location,player};
}
export function getPlacementError(state,workerId,locationId){try{workerCheck(state,workerId,locationId);return null;}catch(e){return e.message;}}

function arrivalCandidates(state,location){
 const used=occupied(state),candidates=[];
 // Separate destination cells around a shared location, never the model's centre
 for(let radius=1;radius<=3;radius++)for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
  const x=location.x+dx,z=location.z+dz;
  if(x<0||z<0||x>=WORLD.width||z>=WORLD.height||used.has(`${x},${z}`)||state.tiles[z*WORLD.width+x]?.type==='water')continue;
  if(state.locations.some(l=>l.x===x&&l.z===z))continue;
  candidates.push({x,z});
 }
 return candidates;
}

export function placeWorker(state,workerId,locationId){
 const {worker,location}=workerCheck(state,workerId,locationId);
 // Reuse terrain-aware movement without exposing movement-only owner restrictions
 const pathState=copy(state);pathState.units.find(u=>u.id===workerId).owner=0;
 let next=null;
 const candidates=arrivalCandidates(state,location).sort((a,b)=>Math.max(Math.abs(a.x-location.x),Math.abs(a.z-location.z))-Math.max(Math.abs(b.x-location.x),Math.abs(b.z-location.z))||Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z));
 const reserved=state.locations.map(({x,z})=>({x,z}));
 for(const target of candidates){try{next=moveWorker(pathState,workerId,target,{reserved});break;}catch{}}
 fail(next,'До места работы нет свободного пути');
 const moved=next.units.find(u=>u.id===workerId);moved.owner=worker.owner;moved.locationId=locationId;
 const destination=next.locations.find(l=>l.id===locationId),player=next.players[next.currentPlayer];destination.workers.push(workerId);
 pay(player,destination.cost);addResources(player,destination.reward);
 if((locationId==='forest'||locationId==='common-wood')&&player.cards.some(c=>c.type==='forester'))player.resources.wood++;
 if(locationId==='quarry'&&player.cards.some(c=>c.type==='mason'))player.resources.stone++;
 drawTo(next,player.hand,destination.draw??0);
 next.lastMove.round=next.round;next.action++;next.lastAction={type:'place',player:next.currentPlayer,workerId,locationId};nextTurn(next);return next;
}

export function passRound(state){
 assertTurn(state);const next=copy(state),player=next.currentPlayer;
 next.players[player].passed=true;next.serial++;next.action++;next.lastAction={type:'pass',player};
 if(next.players.every(p=>p.passed)){
  for(const p of next.players){for(const c of p.cards)addResources(p,CARDS[c.type].income);p.passed=false;}
  for(const u of next.units){u.x=u.home.x;u.z=u.home.z;u.locationId=null;}
  for(const l of next.locations)l.workers=[];
  next.round++;next.firstPlayer=1-next.firstPlayer;next.currentPlayer=next.firstPlayer;next.lastMove=null;next.lastAction={type:'round',round:next.round,player};
 }else nextTurn(next);
 return next;
}

export function isPlacementState(state){
 try{
  if(state?.version!=='placement-1'||state.mode!=='placement'||state.players?.length!==2||state.units?.length!==6||state.tiles?.length!==WORLD.width*WORLD.height||!Array.isArray(state.locations)||!Array.isArray(state.market)||!Array.isArray(state.deck))return false;
  if(!Array.isArray(state.sources)||!Array.isArray(state.buildings)||!state.point||!Number.isSafeInteger(state.serial)||!Number.isSafeInteger(state.action)||!Number.isInteger(state.seed))return false;
  if(state.tiles.some((t,i)=>!t||t.x!==i%WORLD.width||t.z!==Math.floor(i/WORLD.width)||!Number.isFinite(t.h)||!['plain','meadow','forest','rock','road','water'].includes(t.type)))return false;
  if([...state.sources,...state.buildings].some(b=>!b||typeof b.id!=='string'||!Number.isInteger(b.x)||!Number.isInteger(b.z)))return false;
  if(!Number.isInteger(state.round)||state.round<1||![0,1].includes(state.currentPlayer)||![0,1].includes(state.firstPlayer)||state.players[state.currentPlayer].passed)return false;
  const cards=[...state.deck,...state.market,...state.players.flatMap(p=>[...p.hand,...p.cards])];
  if(cards.length!==state.totalCards||new Set(cards.map(c=>c.id)).size!==cards.length||cards.some(c=>!CARDS[c.type]))return false;
  if(state.players.some((p,i)=>p.id!==i||typeof p.name!=='string'||typeof p.passed!=='boolean'||!Array.isArray(p.explored)||p.explored.length!==WORLD.width*WORLD.height||!Array.isArray(p.gifts)||RESOURCES.some(({key})=>!Number.isSafeInteger(p.resources[key])||p.resources[key]<0)))return false;
  if(new Set(state.units.map(u=>u.id)).size!==6||new Set(state.units.map(u=>`${u.x},${u.z}`)).size!==6)return false;
  for(const u of state.units){
   if(![0,1].includes(u.owner)||u.kind!=='worker'||typeof u.name!=='string'||!u.name.trim()||!Number.isInteger(u.portrait)||u.portrait<0||u.portrait>5||!Number.isFinite(u.hp)||u.hp<=0||!Number.isInteger(u.ready)||![u.x,u.z,u.home?.x,u.home?.z].every(Number.isInteger)||u.x<0||u.z<0||u.x>=WORLD.width||u.z>=WORLD.height||u.home.x<0||u.home.z<0||u.home.x>=WORLD.width||u.home.z>=WORLD.height)return false;
   const memberships=state.locations.filter(l=>l.workers.includes(u.id));
   if(u.locationId===null?memberships.length!==0:memberships.length!==1||memberships[0].id!==u.locationId)return false;
  }
  return state.units.filter(u=>u.owner===0).length===3&&state.locations.every(l=>(l.capacity===null||l.workers.length<=l.capacity)&&l.workers.every(id=>state.units.some(u=>u.id===id)));
 }catch{return false;}
}
