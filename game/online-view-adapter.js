import {createMovementWorld} from './movement.js';
import {WORLD} from './data.js';
import {Card,Location} from './everdell/engine.js';
import {LIVING_CITIES,LIVING_TREE,MARKET_POSITIONS,BASIC_POSITIONS,FOREST_POSITIONS,COMMON_POSITIONS,CITY_CAMPS,CITY_FOREST_GATEWAYS,cityCardEntries,reconcileCityLayout} from './living-board-state.js';
import {CARD_NAMES,LOCATION_NAMES,LOCATION_TEXT,EVENT_NAMES,SEASONS} from './everdell/locale.js';
import {cityWorkerMarker,zoneBadge,storedResources} from './living-ui.js';
import {workerSeatPosition} from './production-props.js';
const key=w=>w.location?'l:'+w.location:w.event?'e:'+w.event:'c:'+w.playedCard?.cardOwnerId+':'+w.playedCard?.cardName;
// Reads only a private-per-seat public projection. No engine restore and no invented cards
export function onlineDrawing(view,layout={},previous=null){
 const state=createMovementWorld({seed:4811}),g=view.game,viewer=g.players.findIndex(p=>p.playerId===view.playerId);
 const cards=p=>Object.values(p.playedCards).flat();
 const game={players:g.players.map(p=>({...p,getPlayedCards:()=>cards(p)}))};
 const result=reconcileCityLayout(game,layout);layout=result.positions;
 Object.assign(state,{mode:'placement',livingBoard:true,livingTree:LIVING_TREE,livingObjects:[],buildings:[],sources:[],sandbox:false,seed:481114,season:String(view.shared.season).toUpperCase(),round:view.revision+1,serial:g.gameStateId,lastMove:null,locations:[],units:[],currentPlayer:viewer,worldHeight:70});
 for(let z=WORLD.height;z<70;z++)for(let x=0;x<WORLD.width;x++)state.tiles.push({x,z,type:'meadow',h:0});
 state.players=g.players.map((p,id)=>({id,level:1,workers:0,gifts:[],explored:Array(WORLD.width*70).fill(true)}));
 const offered=type=>view.offers.filter(o=>o.inputType===type),places=new Set(offered('PLACE_WORKER').map(o=>o.clientOptions.location));
 const names=Object.keys(g.locationsMap),coords=new Map();names.filter(n=>Location.fromName(n).type==='BASIC').forEach((n,i)=>coords.set(n,BASIC_POSITIONS[i]));names.filter(n=>Location.fromName(n).type==='FOREST').forEach((n,i)=>coords.set(n,FOREST_POSITIONS[i]));for(const [n,p]of Object.entries(COMMON_POSITIONS))coords.set(n,p);
 for(const n of names){const c=coords.get(n);if(!c)continue;const loc=Location.fromName(n);state.locations.push({id:'ever:'+n,actualName:n,name:LOCATION_NAMES[n]??n,x:c[0],z:c[1],capacity:loc.occupancy==='UNLIMITED'?null:loc.occupancy==='EXCLUSIVE_FOUR'&&g.players.length===4?2:1,owner:null,workers:[],reward:{},rewardIcons:loc.resourcesToGain??{},description:LOCATION_TEXT[n]??'',locationType:loc.type,available:places.has(n),locked:!places.has(n),badgeHtml:'',ariaLabel:LOCATION_NAMES[n]??n});}
 Object.entries(g.eventsMap).forEach(([eventName,owner],index)=>state.livingObjects.push({id:'event:'+eventName,type:'event',eventName,owner:g.players.findIndex(p=>p.playerId===owner),x:22+index%4*5.2,z:1.5+Math.floor(index/4)*2.7,label:EVENT_NAMES[eventName]??eventName,available:offered('CLAIM_EVENT').some(o=>o.clientOptions.event===eventName)}));
 g.players.forEach((p,owner)=>{
  const center=LIVING_CITIES[owner],camp=CITY_CAMPS[owner];
  state.livingObjects.push({id:'city-area:'+owner,type:'city-area',owner,...center,label:p.name},{id:'supplies:'+owner,type:'supplies',owner,x:camp.x-5,z:camp.z,label:p.name,resources:p.resources},{id:'season:'+owner,type:'season',owner,x:camp.x+5,z:camp.z,label:SEASONS[view.shared.season]??view.shared.season,available:owner===viewer&&view.actorId===view.playerId});
  for(const [id,pos]of Object.entries(layout).filter(([,pos])=>pos.owner===owner)){
   const card=Card.fromName(pos.cardName),played=cityCardEntries(game.players[owner]).find(e=>e.key===id)?.played,name=CARD_NAMES[pos.cardName]??pos.cardName;
   const workerDestination=!!card.maxWorkerSpots&&(owner===viewer||card.isOpenDestination),capacity=p.workerSpotsByCard?.[pos.cardName]??card.maxWorkerSpots??0,occupied=played?.workers?.length??0;
   const available=offered('VISIT_DESTINATION_CARD').some(o=>o.clientOptions.playedCard.cardName===pos.cardName&&o.clientOptions.playedCard.cardOwnerId===p.playerId);
   const previousItem=previous?.livingObjects.find(item=>item.id===id&&item.type==='city-card');
   let arrival=previousItem?.arrival?structuredClone(previousItem.arrival):undefined;
   if(previous&&!previousItem){
    const replaced=(previous.livingObjects??[]).filter(item=>item.type==='market'&&item.cardName===pos.cardName&&g.meadowCards[item.index]!==pos.cardName);
    const from=replaced.length===1?{x:replaced[0].x,z:replaced[0].z}:{...(owner===viewer?CITY_CAMPS[owner]:CITY_FOREST_GATEWAYS[owner])};
    arrival={key:`${view.roomId}:${view.revision}:${id}`,from,style:card.isCritter?'walk':'carry',species:owner?3:1};
   }
   const reason=available?'можно разместить рабочего':occupied>=capacity?'Все места заняты':'Это место сейчас недоступно';
   state.livingObjects.push({id,type:'city-card',...pos,cardName:pos.cardName,played,critter:card.isCritter,homeCardName:card.associatedCard?.cardName,roamCenter:center,roamRadius:6,label:name,workerDestination,workerInfo:{capacity,workers:played?.workers??[],available,reason,open:!!card.isOpenDestination},statusHtml:workerDestination?cityWorkerMarker({name,available,occupied,capacity})+(pos.cardName==='Storehouse'?storedResources(played?.resources):''):undefined,ariaLabel:workerDestination?`${name} — место рабочего, ${occupied} из ${capacity} занято — ${reason}`:name,available:!card.maxWorkerSpots||available,arrival});
  }
  for(let number=1;number<=p.numWorkers;number++){
   const placement=p.placedWorkers[number-1],home={x:camp.x-1+(number-1)%3,z:camp.z+Math.floor((number-1)/3)},unit={id:`e-${owner}-${number}`,number,owner,portrait:owner?3:1,teamSpecies:owner?3:1,kind:'worker',name:'Рабочий '+number,x:home.x,z:home.z,home,roamCenter:center,roamRadius:3,hp:1,ready:1,attacked:0,locationId:null,hiddenAtLocation:false,seatHeight:0,placementKey:placement?key(placement):null};
   if(placement){const location=state.locations.find(l=>l.actualName===placement.location),dest=placement.event?state.livingObjects.find(o=>o.eventName===placement.event):state.livingObjects.find(o=>o.type==='city-card'&&o.cardName===placement.playedCard?.cardName&&g.players[o.owner].playerId===placement.playedCard?.cardOwnerId);unit.locationId=location?.id??unit.placementKey;if(location){const seat=workerSeatPosition(location,location.workers.length);Object.assign(unit,{x:seat.x,z:seat.z,seatHeight:seat.yOffset??0,hiddenAtLocation:seat.hidden});location.workers.push(unit.id)}}
   state.units.push(unit);
  }
 });
 // All cities must exist before resolving a worker owned by the other player
 for(const unit of state.units){
  const placement=g.players[unit.owner].placedWorkers[unit.number-1];if(!placement||placement.location)continue;
  const dest=placement.event?state.livingObjects.find(o=>o.eventName===placement.event):state.livingObjects.find(o=>o.type==='city-card'&&o.cardName===placement.playedCard?.cardName&&g.players[o.owner].playerId===placement.playedCard?.cardOwnerId);
  if(dest){unit.x=dest.x;unit.z=dest.z+.8;unit.destinationObjectId=dest.id;}
 }
 for(const location of state.locations){location.freeSpots=location.capacity===null?null:Math.max(0,location.capacity-location.workers.length);location.reason=location.capacity!==null&&location.freeSpots===0?'Все места заняты':location.locked?'Это место сейчас недоступно':'';location.ariaLabel=location.name+(location.capacity===null?' — без ограничения мест':` — ${location.workers.length} из ${location.capacity} занято`);location.badgeHtml=zoneBadge(location);}
 g.meadowCards.forEach((cardName,index)=>state.livingObjects.push({id:'market:'+index,type:'market',owner:0,...MARKET_POSITIONS[index],cardName,index,critter:Card.fromName(cardName).isCritter,label:CARD_NAMES[cardName]??cardName,available:offered('PLAY_CARD').some(o=>o.clientOptions.source==='MEADOW'&&o.clientOptions.sourceIdx===index)}));
 state.livingClearings=[...LIVING_CITIES,{x:30.5,z:27,radius:10.5},{...LIVING_TREE,radius:5},{x:30,z:3,radius:11}];
 return{drawing:state,layout,viewer};
}
