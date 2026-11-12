// Presentation positions never change engine costs, turns, city capacity or card effects
export const LIVING_CITIES=[{x:10,z:34,radius:8},{x:51,z:34,radius:8}];
export const LIVING_TREE={x:30,z:8};
export const MARKET_POSITIONS=Array.from({length:8},(_,i)=>({x:21.5+(i%4)*6,z:25.3+Math.floor(i/4)*5}));
export const BASIC_POSITIONS=[[21,13.5],[27,13.5],[33,13.5],[39,13.5],[21,19.3],[27,19.3],[33,19.3],[39,19.3]];
export const FOREST_POSITIONS=[[14,14],[14,20],[46,17],[46,23]];
// Shared clearings stay in the central corridor, outside both saved city areas
export const LOCATION_FOOTPRINT_RADIUS=1.95;
export const COMMON_POSITIONS={HAVEN:[22,36],JOURNEY_TWO:[26.25,36],JOURNEY_THREE:[30.5,36],JOURNEY_FOUR:[34.75,36],JOURNEY_FIVE:[39,36]};
export function inCity(owner,x,z){const c=LIVING_CITIES[owner];return !!c&&Number.isFinite(x)&&Number.isFinite(z)&&((x-c.x)/(c.radius-1))**2+((z-c.z)/6)**2<=1;}
export function cityCardEntries(player){const counts={},entries=player.getPlayedCards().map(played=>{const ordinal=counts[played.cardName]??0;counts[played.cardName]=ordinal+1;return{key:player.playerId+'|'+played.cardName+'|'+ordinal,played,cardName:played.cardName};});for(const entry of entries)entry.pairedWith=entry.played.pairId?entries.find(other=>other.key!==entry.key&&other.played.pairId===entry.played.pairId)?.key??null:null;return entries;}
export function freeCityPosition(owner,entries){const c=LIVING_CITIES[owner];for(let row=0;row<4;row++)for(let col=0;col<5;col++){const x=c.x+(col-2)*2.75,z=c.z+(row-1.5)*3;if(inCity(owner,x,z)&&entries.every(p=>Math.hypot(p.x-x,p.z-z)>2.15))return{x,z};}return{x:c.x,z:c.z};}
export function validCityPosition(owner,x,z,positions,ignore=null){return inCity(owner,x,z)&&Object.entries(positions).every(([key,p])=>key===ignore||p.owner!==owner||Math.hypot(p.x-x,p.z-z)>=2.15);}
export function reconcileCityLayout(game,positions,preferred=null){const next={},added=[];game.players.slice(0,2).forEach((player,owner)=>{for(const entry of cityCardEntries(player)){const previous=positions[entry.key],pair=entry.pairedWith?next[entry.pairedWith]:null,chosen=preferred&&preferred.owner===owner&&preferred.cardName===entry.cardName&&!preferred.used;let pos=previous;
 // The paired resident shares the partner's foundation, even in older layouts
 // where a second free placement mistakenly separated the two residents
 if(pair){pos={x:pair.x+.58,z:pair.z+.28};if(chosen)preferred.used=true;}
 else if(!pos){
  if(chosen&&Number.isFinite(preferred.x)&&Number.isFinite(preferred.z)){pos={x:preferred.x,z:preferred.z};preferred.used=true;}
  else pos=freeCityPosition(owner,Object.values(next).filter(p=>p.owner===owner));
 }
 if(!previous)added.push({...entry,owner});
 next[entry.key]={x:pos.x,z:pos.z,owner,pairId:entry.played.pairId??null};}});return{positions:next,added};}

// A resident joining a pair already has its shared place and must not be sent
// through the separate free-slot prompt after the engine resolves Pair
export function queuedCityPlacements(game,previousKeys,preferred=null){return game.players.slice(0,2).flatMap((player,owner)=>cityCardEntries(player).filter(entry=>!previousKeys.has(entry.key)&&!entry.pairedWith&&!(preferred?.used&&preferred.cardName===entry.cardName&&preferred.owner===owner)).map(entry=>({...entry,owner})));}
