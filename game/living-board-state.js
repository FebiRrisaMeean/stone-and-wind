import {footprintAt,hullsOverlap,footprintFitsBounds,isBuildingFootprint,navigationFootprint,navigationPassageClear,normalizeCityRotation} from './city-footprints.js?v=pages42-tree-controls';
// Presentation positions never change engine costs, turns, city capacity or card effects
// v2 keeps the accepted single-ring composition and its saved editor positions
// Saved v2 coordinates are authoritative, including deliberate overlap with the crown
export const FIELD_LAYOUT_KEY='stone-wind-field-layout-v2';
let fieldLayout={};
try{fieldLayout=JSON.parse(globalThis.localStorage?.getItem(FIELD_LAYOUT_KEY)??'{}')??{};}catch{}
export function getFieldLayout(){return structuredClone(fieldLayout);}
export function setFieldLayout(value){fieldLayout={};for(const [key,p]of Object.entries(value??{}))if(p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=5&&p.x<=55&&p.z>=5&&p.z<=39)fieldLayout[key]={x:p.x,z:p.z};}
setFieldLayout(fieldLayout);
export function saveFieldLayout(){localStorage.setItem(FIELD_LAYOUT_KEY,JSON.stringify(fieldLayout));}
export function fieldTreePosition(){return fieldLayout.tree??LIVING_TREE;}
export const CITY_LAYOUT_VERSION=2;
// Cities are independent canonical spaces, shown one at a time by applyCityScene
export const LIVING_CITIES=[0,1].map(owner=>({owner,x:30.5,z:55.5,camp:{x:30.5,z:43.7},radius:22.5,scaleX:1,scaleZ:.6,bounds:{minX:8,maxX:53,minZ:42,maxZ:69}}));
export const CITY_CAMPS=LIVING_CITIES.map(c=>({x:c.x,z:43.7}));
export const LIVING_TREE={x:30,z:20};
export const MARKET_POSITIONS=Array.from({length:8},(_,i)=>({x:22.5+(i%4)*5,z:25.3+Math.floor(i/4)*5}));
// Seventeen compact perimeter slots leave a clear central crown, grouped by resource family
export const LOCATION_FOOTPRINT_RADIUS=1.95;
export const ELDER_CANOPY_HALF_EXTENT={x:4.334,z:3.951};
const PRODUCTION_TREE_GAP=2.1,PRODUCTION_SPACING=4.5,RING_RADIUS=12.5,RING_SLOTS=17;
function ringPositions(tree){
 const cx=Math.max(17.5,Math.min(42.5,tree.x)),cz=Math.max(17.5,Math.min(26.5,tree.z));
 return Array.from({length:RING_SLOTS},(_,i)=>{const angle=-Math.PI/2+i*Math.PI*2/RING_SLOTS;return [cx+Math.cos(angle)*RING_RADIUS,cz+Math.sin(angle)*RING_RADIUS];});
}
const defaultRing=ringPositions(LIVING_TREE);
export const BASIC_POSITIONS=defaultRing.slice(0,8);
export const FOREST_POSITIONS=defaultRing.slice(8,12);
export const COMMON_POSITIONS=Object.fromEntries(['HAVEN','JOURNEY_TWO','JOURNEY_THREE','JOURNEY_FOUR','JOURNEY_FIVE'].map((name,i)=>[name,defaultRing[12+i]]));
let productionCoordsCache=null;
// Group the actual forest draw together with permanent sites, not by deck order
export function productionLocationCoords(basics,forests){
 const cacheKey=JSON.stringify([basics,forests,fieldLayout]);
 if(productionCoordsCache?.key===cacheKey)return clearTreeSightline(productionCoordsCache.coords);
 const family=name=>{
  if(['TWO_WILD','ONE_TWIG_RESIN_BERRY','DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD','DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'].includes(name))return 3;
  if(/PEBBLE|STONE/.test(name))return 4;
  if(/BERRY/.test(name))return 0;
  if(/RESIN/.test(name))return 5;
  if(/TWIG/.test(name))return 1;
  return 2;
 };
 const names=[...basics,...forests].sort((a,b)=>family(a)-family(b)||a.localeCompare(b));
 names.push(...Object.keys(COMMON_POSITIONS));
 const tree=fieldTreePosition(),coords=new Map(),occupied=[];
 // Reserve every explicit position first, so default sites cannot silently occupy it
 for(const name of names){const p=fieldLayout[name];if(p){coords.set(name,[p.x,p.z]);occupied.push([p.x,p.z]);}}
 const ring=ringPositions(tree);let candidates=null;
 // Build the fallback grid only if the compact default ring actually needs repair
 const usable=p=>!productionHiddenByTree(...p,tree,PRODUCTION_TREE_GAP)&&occupied.every(q=>Math.hypot(p[0]-q[0],p[1]-q[1])>=PRODUCTION_SPACING);
 for(const [i,name]of names.entries()){
  if(coords.has(name))continue;
  const preferred=ring[i%ring.length];
  let point=usable(preferred)?preferred:null;
  if(!point){if(!candidates){candidates=[...ring];for(let z=5;z<=39;z+=.5)for(let x=5;x<=55;x+=.5)candidates.push([x,z]);}let cost=Infinity;for(const p of candidates){if(!usable(p))continue;const d=(p[0]-preferred[0])**2+(p[1]-preferred[1])**2;if(d<cost){cost=d;point=p;}}}
  // The supported 17-site set fits even with the tree at a boundary
  if(!point)throw new Error('Production layout has no free default position for '+name);
  coords.set(name,point);occupied.push(point);
 }
 const ordered=new Map(names.map(name=>[name,coords.get(name)]));
 productionCoordsCache={key:cacheKey,coords:ordered};
 return clearTreeSightline(ordered);
}
export const PRODUCTION_CLEARING={x:30,z:20,radius:14.5,scaleX:1,scaleZ:1};
export function inCity(owner,x,z){const c=LIVING_CITIES[owner];return !!c&&Number.isFinite(x)&&Number.isFinite(z)&&x>=c.bounds.minX&&x<=c.bounds.maxX&&z>=c.bounds.minZ&&z<=c.bounds.maxZ;}
export function cityCardEntries(player){const counts={},entries=player.getPlayedCards().map(played=>{const ordinal=counts[played.cardName]??0;counts[played.cardName]=ordinal+1;return{key:player.playerId+'|'+played.cardName+'|'+ordinal,played,cardName:played.cardName};});for(const entry of entries)entry.pairedWith=entry.played.pairId?entries.find(other=>other.key!==entry.key&&other.played.pairId===entry.played.pairId)?.key??null:null;return entries;}
export function cityCampHull(owner){const c=CITY_CAMPS[owner],z=c.z;return [[c.x-1.5,z-1.2],[c.x+1.5,z-1.2],[c.x+1.5,z+1.2],[c.x-1.5,z+1.2]];}
const reservesGround=name=>name==null||isBuildingFootprint(name);
export function validCityPosition(owner,x,z,positions,ignore=null,cardName=null,rotation=0){
 const c=LIVING_CITIES[owner];if(!c||!inCity(owner,x,z))return false;
 const hull=footprintAt(cardName,x,z,rotation);if(!footprintFitsBounds(hull,c.bounds)||hullsOverlap(hull,cityCampHull(owner)))return false;
 return Object.entries(positions).every(([key,p])=>key===ignore||p.owner!==owner||(!reservesGround(cardName)||!reservesGround(p.cardName??key.split('|')[1]))||(!hullsOverlap(hull,footprintAt(p.cardName??key.split('|')[1],p.x,p.z,p.rotation??0))&&navigationPassageClear(navigationFootprint(cardName,x,z,1,rotation),navigationFootprint(p.cardName??key.split('|')[1],p.x,p.z,1,p.rotation??0))));
}
export function freeCityPosition(owner,entries,cardName=null,rotation=0){
 const c=LIVING_CITIES[owner],positions=Object.fromEntries(entries.map((p,i)=>[String(i),{...p,owner}]));
 // Wide lanes first, then a finer deterministic search for an unusual remaining footprint
 for(const step of [6.6,.5])for(let z=c.bounds.minZ+2.5;z<c.bounds.maxZ-1;z+=step)for(let x=c.bounds.minX+2.5;x<c.bounds.maxX-1;x+=step)if(validCityPosition(owner,x,z,positions,null,cardName,rotation))return{x,z,rotation:normalizeCityRotation(rotation)};
 return null;
}
export function cityLayoutConflicts(positions){
 const conflicts=[];
 for(const [key,p] of Object.entries(positions))if(!validCityPosition(p.owner,p.x,p.z,positions,key,p.cardName,p.rotation??0))conflicts.push(key);
 return conflicts;
}
function reconcileOwnerLayout(entries,owner,positions,preferred,repack=false){
 const next={},choice=preferred?{...preferred}:null;
 for(const entry of entries){
  const previous=positions[entry.key],pair=entry.pairedWith?next[entry.pairedWith]:null;
  const chosen=choice&&choice.owner===owner&&choice.cardName===entry.cardName&&!choice.used;
  const rotation=normalizeCityRotation(previous?.rotation??(chosen?choice.rotation:0)??0);
  let pos=repack?null:previous;
  // Paired residents share a home; their heading is still independent
  if(pair){pos={x:pair.x+.58,z:pair.z+.28,rotation};if(chosen)choice.used=true;}
  else if(!pos||!validCityPosition(owner,pos.x,pos.z,next,null,entry.cardName,rotation)){
   if(chosen&&validCityPosition(owner,choice.x,choice.z,next,null,entry.cardName,rotation)){pos={x:choice.x,z:choice.z,rotation};choice.used=true;}
   else pos=freeCityPosition(owner,Object.values(next),entry.cardName,rotation);
   if(!pos)return null;
  }
  next[entry.key]={x:pos.x,z:pos.z,rotation:normalizeCityRotation(pos.rotation??rotation),owner,cardName:entry.cardName,pairId:entry.played.pairId??null};
 }
 return {positions:next,preferredUsed:choice?.used??false};
}

// Recover a fragmented city locally, never resetting headings or the other city
// Largest rotated navigation envelopes first leave space for the difficult assets
export function reconcileCityLayout(game,positions={},preferred=null){
 positions=positions??{};const next={},added=[],repackedOwners=[],choice=preferred?{...preferred}:null;
 for(const [owner,player]of game.players.slice(0,2).entries()){
  const entries=cityCardEntries(player);
  // New cards must not take an accepted saved position from a later card
  const hasSavedHome=entry=>!!(positions[entry.key]||(entry.pairedWith&&positions[entry.pairedWith]));
  const savedFirst=[...entries].sort((a,b)=>Number(hasSavedHome(b))-Number(hasSavedHome(a)));
  let result=reconcileOwnerLayout(savedFirst,owner,positions,choice);
  if(!result){
   const dimensions=entry=>{
    const rotation=positions[entry.key]?.rotation??(preferred?.owner===owner&&preferred.cardName===entry.cardName?preferred.rotation:0)??0;
    const bounds=navigationFootprint(entry.cardName,0,0,1,rotation);
    return bounds?{width:bounds.maxX-bounds.minX,depth:bounds.maxZ-bounds.minZ}:{width:0,depth:0};
   };
   for(const metric of ['area','width','depth']){
    const weight=entry=>{const d=dimensions(entry);return metric==='area'?d.width*d.depth:d[metric];};
    const ordered=[...entries].sort((a,b)=>weight(b)-weight(a));
    result=reconcileOwnerLayout(ordered,owner,positions,choice,true);
    if(result)break;
   }
   if(!result)throw new Error('City layout has no legal position while preserving rotations for player '+owner);
   repackedOwners.push(owner);
  }
  Object.assign(next,result.positions);
  if(choice&&result.preferredUsed)choice.used=true;
  for(const entry of entries)if(!positions[entry.key])added.push({...entry,owner});
 }
 if(preferred&&choice.used)preferred.used=true;
 return {positions:next,added,conflicts:cityLayoutConflicts(next),repackedOwners};
}

// A resident joining a pair already has its shared place and must not be sent
// through the separate free-slot prompt after the engine resolves Pair
export function queuedCityPlacements(game,previousKeys,preferred=null){return game.players.slice(0,2).flatMap((player,owner)=>cityCardEntries(player).filter(entry=>!previousKeys.has(entry.key)&&!entry.pairedWith&&!(preferred?.used&&preferred.cardName===entry.cardName&&preferred.owner===owner)).map(entry=>({...entry,owner})));}

// Presentation-only waiting points at the edge of the shared woodland
// Logical homes and saved layouts remain in LIVING_CITIES
export const CITY_FOREST_GATEWAYS=[{x:17,z:24,radius:1.8},{x:44,z:24,radius:1.8}];

// Migrate presentation coordinates only; card identity, pairIds and engine state stay intact
// Accept the saved version separately so existing plain-map layout storage remains compatible
export function migrateCityLayout(game,positions={},version=1){
 const original=positions??{},candidate={};
 for(const [key,p] of Object.entries(original)){
  if(!p||!Number.isInteger(p.owner)||!LIVING_CITIES[p.owner])continue;
  const oldMinX=p.owner===0?.5:41.5;
  candidate[key]={...p,...(version<CITY_LAYOUT_VERSION?{x:8+(p.x-oldMinX)*45/19,z:42+(p.z-25)*27/41}:{})};
 }
 const result=reconcileCityLayout(game,candidate);
 return {...result,version:CITY_LAYOUT_VERSION,migrated:version!==CITY_LAYOUT_VERSION||JSON.stringify(result.positions)!==JSON.stringify(original)};
}

// Measured top-down elder GLB extent after normalization and runtime scaling
export function productionHiddenByTree(x,z,tree,padding=0){return Math.abs(x-tree.x)<ELDER_CANOPY_HALF_EXTENT.x+padding&&Math.abs(z-tree.z)<ELDER_CANOPY_HALF_EXTENT.z+padding;}
// Compatibility helper: presentation must never rewrite an explicit editor position
export function clearTreeSightline(coords){return new Map([...coords].map(([name,p])=>[name,[...p]]));}
