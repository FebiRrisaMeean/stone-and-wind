// Presentation positions never change engine costs, turns, city capacity or card effects
export const LIVING_CITIES=[{x:10,z:34,radius:8},{x:51,z:34,radius:8}];
export const LIVING_TREE={x:30,z:8};
export const MARKET_POSITIONS=Array.from({length:8},(_,i)=>({x:19.4+(i%4)*7.5,z:25.5+Math.floor(i/4)*4.5}));
export const BASIC_POSITIONS=[[21,13.5],[27,13.5],[33,13.5],[39,13.5],[21,19.3],[27,19.3],[33,19.3],[39,19.3]];
export const FOREST_POSITIONS=[[14,14],[14,20],[46,17],[46,23]];
export function inCity(owner,x,z){const c=LIVING_CITIES[owner];return !!c&&Number.isFinite(x)&&Number.isFinite(z)&&((x-c.x)/(c.radius-1))**2+((z-c.z)/6)**2<=1;}
export function cityCardEntries(player){const counts={};return player.getPlayedCards().map(played=>{const ordinal=counts[played.cardName]??0;counts[played.cardName]=ordinal+1;return{key:player.playerId+'|'+played.cardName+'|'+ordinal,played,cardName:played.cardName};});}
export function freeCityPosition(owner,entries){const c=LIVING_CITIES[owner];for(let row=0;row<4;row++)for(let col=0;col<5;col++){const x=c.x+(col-2)*2.75,z=c.z+(row-1.5)*3;if(inCity(owner,x,z)&&entries.every(p=>Math.hypot(p.x-x,p.z-z)>2.15))return{x,z};}return{x:c.x,z:c.z};}
export function validCityPosition(owner,x,z,positions,ignore=null){return inCity(owner,x,z)&&Object.entries(positions).every(([key,p])=>key===ignore||p.owner!==owner||Math.hypot(p.x-x,p.z-z)>=2.15);}
export function reconcileCityLayout(game,positions,preferred=null){const next={},added=[];game.players.slice(0,2).forEach((player,owner)=>{for(const entry of cityCardEntries(player)){let pos=positions[entry.key];if(!pos){const pair=entry.played.pairId?Object.entries(next).find(([,p])=>p.owner===owner&&p.pairId===entry.played.pairId)?.[1]:null;
 if(preferred&&preferred.owner===owner&&preferred.cardName===entry.cardName&&!preferred.used){pos={x:preferred.x,z:preferred.z};preferred.used=true;}
 else if(pair)pos={x:pair.x+.58,z:pair.z+.28};
 else pos=freeCityPosition(owner,Object.values(next).filter(p=>p.owner===owner));
 added.push({...entry,owner});}
 next[entry.key]={x:pos.x,z:pos.z,owner,pairId:entry.played.pairId??null};}});return{positions:next,added};}
