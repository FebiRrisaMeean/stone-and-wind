import {footprintAt,hullsOverlap,footprintFitsBounds,isBuildingFootprint,navigationFootprint,navigationPassageClear} from './city-footprints.js';
// Presentation positions never change engine costs, turns, city capacity or card effects
export const LIVING_CITIES=[{x:10,z:45.5,radius:20.5,scaleX:19/41,scaleZ:1,bounds:{minX:.5,maxX:19.5,minZ:25,maxZ:66}},{x:51,z:45.5,radius:20.5,scaleX:19/41,scaleZ:1,bounds:{minX:41.5,maxX:60.5,minZ:25,maxZ:66}}];
export const LIVING_TREE={x:30,z:8};
export const MARKET_POSITIONS=Array.from({length:8},(_,i)=>({x:22.5+(i%4)*5,z:25.3+Math.floor(i/4)*5}));
export const BASIC_POSITIONS=[[21,13.5],[27,13.5],[33,13.5],[39,13.5],[21,19.3],[27,19.3],[33,19.3],[39,19.3]];
export const FOREST_POSITIONS=[[14,14],[14,20],[46,17],[46,22]];
// Shared clearings stay in the central corridor, outside both saved city areas
export const LOCATION_FOOTPRINT_RADIUS=1.95;
export const COMMON_POSITIONS={HAVEN:[22,36],JOURNEY_TWO:[26.25,36],JOURNEY_THREE:[30.5,36],JOURNEY_FOUR:[34.75,36],JOURNEY_FIVE:[39,36]};
export function inCity(owner,x,z){const c=LIVING_CITIES[owner];return !!c&&Number.isFinite(x)&&Number.isFinite(z)&&x>=c.bounds.minX&&x<=c.bounds.maxX&&z>=c.bounds.minZ&&z<=c.bounds.maxZ;}
export function cityCardEntries(player){const counts={},entries=player.getPlayedCards().map(played=>{const ordinal=counts[played.cardName]??0;counts[played.cardName]=ordinal+1;return{key:player.playerId+'|'+played.cardName+'|'+ordinal,played,cardName:played.cardName};});for(const entry of entries)entry.pairedWith=entry.played.pairId?entries.find(other=>other.key!==entry.key&&other.played.pairId===entry.played.pairId)?.key??null:null;return entries;}
export function cityCampHull(owner){const c=LIVING_CITIES[owner],z=c.z-c.radius*.82;return [[c.x-1.5,z-1.2],[c.x+1.5,z-1.2],[c.x+1.5,z+1.2],[c.x-1.5,z+1.2]];}
const reservesGround=name=>name==null||isBuildingFootprint(name);
export function validCityPosition(owner,x,z,positions,ignore=null,cardName=null){
 const c=LIVING_CITIES[owner];if(!c||!inCity(owner,x,z))return false;
 const hull=footprintAt(cardName,x,z);if(!footprintFitsBounds(hull,c.bounds)||hullsOverlap(hull,cityCampHull(owner)))return false;
 return Object.entries(positions).every(([key,p])=>key===ignore||p.owner!==owner||(!reservesGround(cardName)||!reservesGround(p.cardName??key.split('|')[1]))||(!hullsOverlap(hull,footprintAt(p.cardName??key.split('|')[1],p.x,p.z))&&navigationPassageClear(navigationFootprint(cardName,x,z),navigationFootprint(p.cardName??key.split('|')[1],p.x,p.z))));
}
export function freeCityPosition(owner,entries,cardName=null){
 const c=LIVING_CITIES[owner],positions=Object.fromEntries(entries.map((p,i)=>[String(i),{...p,owner}]));
 // Wide lanes first, then a finer deterministic search for an unusual remaining footprint
 for(const step of [6.6,.5])for(let z=c.bounds.minZ+2.5;z<c.bounds.maxZ-1;z+=step)for(let x=c.bounds.minX+2.5;x<c.bounds.maxX-1;x+=step)if(validCityPosition(owner,x,z,positions,null,cardName))return{x,z};
 return null;
}
export function cityLayoutConflicts(positions){
 const conflicts=[];
 for(const [key,p] of Object.entries(positions))if(!validCityPosition(p.owner,p.x,p.z,positions,key,p.cardName))conflicts.push(key);
 return conflicts;
}
export function reconcileCityLayout(game,positions,preferred=null){const next={},added=[];game.players.slice(0,2).forEach((player,owner)=>{for(const entry of cityCardEntries(player)){const previous=positions[entry.key],pair=entry.pairedWith?next[entry.pairedWith]:null,chosen=preferred&&preferred.owner===owner&&preferred.cardName===entry.cardName&&!preferred.used;let pos=previous;
 // The paired resident shares the partner's foundation, even in older layouts
 // where a second free placement mistakenly separated the two residents
 if(pair){pos={x:pair.x+.58,z:pair.z+.28};if(chosen)preferred.used=true;}
 else if(!pos){
  if(chosen&&Number.isFinite(preferred.x)&&Number.isFinite(preferred.z)){pos={x:preferred.x,z:preferred.z};preferred.used=true;}
  else pos=freeCityPosition(owner,Object.values(next).filter(p=>p.owner===owner),entry.cardName);
  if(!pos)throw new Error('City layout has no legal position for '+entry.cardName);
 }
 if(!previous)added.push({...entry,owner});
 next[entry.key]={x:pos.x,z:pos.z,owner,cardName:entry.cardName,pairId:entry.played.pairId??null};}});return{positions:next,added,conflicts:cityLayoutConflicts(next)};}

// A resident joining a pair already has its shared place and must not be sent
// through the separate free-slot prompt after the engine resolves Pair
export function queuedCityPlacements(game,previousKeys,preferred=null){return game.players.slice(0,2).flatMap((player,owner)=>cityCardEntries(player).filter(entry=>!previousKeys.has(entry.key)&&!entry.pairedWith&&!(preferred?.used&&preferred.cardName===entry.cardName&&preferred.owner===owner)).map(entry=>({...entry,owner})));}
