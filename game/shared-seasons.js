import {stepGame,serializeGame,restoreGame,Season,GameInputType,PlayerStatus,Card,CardType,Location} from './everdell/engine.js?v=20261112-21';

// The controller keeps the base rules intact while holding normal turns behind a shared season barrier
const SEASON_ORDER=[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN];
const NON_ACTIONS=new Set([GameInputType.PREPARE_FOR_SEASON,GameInputType.GAME_END,GameInputType.UNDO]);
const RESOURCE_KEYS=['TWIG','RESIN','PEBBLE','BERRY','VP','CARD'];
const cloneMeta=m=>structuredClone(m);
const index=s=>SEASON_ORDER.indexOf(s);
function activeAs(game,id){if(game.activePlayerId===id)return game;const json=serializeGame(game);json.activePlayerId=id;return restoreGame(json);}
function ended(p){return p.getStatus()===PlayerStatus.GAME_ENDED;}
function hasAction(game,id){
 const p=game.players.find(p=>p.playerId===id);if(!p||ended(p))return false;
 return activeAs(game,id).getPossibleGameInputs().some(i=>!NON_ACTIONS.has(i.inputType));
}
export function sharedSeason(game,meta){return meta?.season??game.players[0]?.currentSeason??Season.WINTER;}
export function createSharedSeasonState(game,saved=null){
 const ids=game.players.map(p=>p.playerId),seasons=game.players.map(p=>p.currentSeason),least=SEASON_ORDER[Math.min(...seasons.map(index))],latest=SEASON_ORDER[Math.max(...seasons.map(index))];
 if(saved?.version===1&&SEASON_ORDER.includes(saved.season)){
  const meta=cloneMeta(saved);meta.passed=(meta.passed??[]).filter(id=>ids.includes(id));
  if(meta.transition){meta.transition.queue=(meta.transition.queue??[]).filter(id=>ids.includes(id));if(meta.transition.current&&!ids.includes(meta.transition.current))meta.transition.current=null;}
  return meta;
 }
 const meta={version:1,season:least,passed:game.players.filter(ended).map(p=>p.playerId),transition:null,round:1+index(least)};
 // Older independent-season parties catch up the lagging side without discarding cards or resources
 const preparing=game.players.find(p=>p.getStatus()===PlayerStatus.PREPARING_FOR_SEASON);
 if(preparing&&game.pendingGameInputs.length){const target=SEASON_ORDER[Math.max(index(latest),index(preparing.currentSeason)+1)];meta.transition={kind:'migrate',from:least,to:target,queue:game.players.filter(p=>p.playerId!==preparing.playerId&&index(p.currentSeason)<index(target)&&!ended(p)).map(p=>p.playerId),current:preparing.playerId,startPlayer:ids[0]};}
 else if(least!==latest)meta.transition={kind:'migrate',from:least,to:latest,queue:game.players.filter(p=>index(p.currentSeason)<index(latest)&&!ended(p)).map(p=>p.playerId),current:null,startPlayer:ids[0]};
 return meta;
}
export function canActShared(game,meta,id=game.activePlayerId){return !game.isGameOver()&&!meta?.transition&&!meta?.passed?.includes(id)&&!game.pendingGameInputs.length&&hasAction(game,id);}
function beginTransition(game,meta){
 const from=meta.season,kind=from===Season.AUTUMN?'finish':'advance';
 meta.transition={kind,from,to:kind==='finish'?null:SEASON_ORDER[index(from)+1],queue:game.players.filter(p=>!ended(p)).map(p=>p.playerId),current:null,startPlayer:game.players[0].playerId};
}
function driveTransition(game,meta){
 let safety=0;
 while(meta.transition&&!game.pendingGameInputs.length&&safety++<20){
  const transition=meta.transition;
  if(transition.current){
   const current=game.getPlayer(transition.current);
   if(transition.kind==='migrate'&&index(current.currentSeason)<index(transition.to)&&!ended(current))transition.queue.unshift(current.playerId);
   transition.current=null;
  }
  const id=transition.queue.shift();
  if(!id){
   const to=transition.to;meta.transition=null;meta.passed=[];
   if(to){meta.season=to;meta.round=1+index(to);game=activeAs(game,transition.startPlayer);}
   return{game,meta};
  }
  const p=game.getPlayer(id);
  if(ended(p)||transition.kind!=='finish'&&index(p.currentSeason)>=index(transition.to))continue;
  game=activeAs(game,id);transition.current=id;
  if(transition.kind==='finish')game=stepGame(game,{inputType:GameInputType.GAME_END});
  else{
   // Choosing to pass retires unused workers for this season only. The base transition resets
   // the worker total to 3/4/6, so existing permanent placements and future totals remain exact
   const json=serializeGame(game),jsonPlayer=json.players.find(p=>p.playerId===id);
   jsonPlayer.numWorkers=jsonPlayer.placedWorkers.length;
   game=stepGame(restoreGame(json),{inputType:GameInputType.PREPARE_FOR_SEASON});
  }
 }
 return{game,meta};
}
export function normalizeSharedGame(game,meta=createSharedSeasonState(game)){
 meta=cloneMeta(meta);
 if(meta.transition)return driveTransition(game,meta);
 if(game.isGameOver()||game.pendingGameInputs.length)return{game,meta};
 for(const p of game.players)if(!meta.passed.includes(p.playerId)&&!hasAction(game,p.playerId))meta.passed.push(p.playerId);
 if(game.players.every(p=>meta.passed.includes(p.playerId)||ended(p))){beginTransition(game,meta);return driveTransition(game,meta);}
 if(meta.passed.includes(game.activePlayerId)||ended(game.getActivePlayer())){
  const start=game.players.findIndex(p=>p.playerId===game.activePlayerId);
  for(let i=1;i<=game.players.length;i++){const p=game.players[(start+i)%game.players.length];if(!meta.passed.includes(p.playerId)&&!ended(p)){game=activeAs(game,p.playerId);break;}}
 }
 return{game,meta};
}
export function requestSharedSeason(game,meta,playerId=game.activePlayerId){
 if(game.isGameOver())return{game,meta:cloneMeta(meta)};
 if(game.pendingGameInputs.length||meta.transition)throw new Error('Сначала завершите текущий эффект');
 if(playerId!==game.activePlayerId)throw new Error('Сейчас ход другого игрока');
 meta=cloneMeta(meta);if(!meta.passed.includes(playerId))meta.passed.push(playerId);
 // Pass is an actual user action, so give the UI a fresh serial without changing any card data
 const json=serializeGame(game);json.gameStateId++;game=restoreGame(json);
 return normalizeSharedGame(game,meta);
}
export function stepSharedGame(game,input,meta){
 if(input.inputType===GameInputType.PREPARE_FOR_SEASON||input.inputType===GameInputType.GAME_END)return requestSharedSeason(game,meta);
 if(meta.transition&&!game.pendingGameInputs.length)throw new Error('Дождитесь завершения смены сезона');
 if(!game.pendingGameInputs.length&&meta.passed.includes(game.activePlayerId))throw new Error('Игрок уже закончил действия в этом сезоне');
 return normalizeSharedGame(stepGame(game,input),meta);
}
export function forecastNextSeason(game,playerId=game.activePlayerId,meta=null){
 const p=game.getPlayer(playerId),from=sharedSeason(game,meta),to=SEASON_ORDER[index(from)+1]??null,resources=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,0])),conditional=[];
 const forecast={season:to,resources,conditional,workers:to?({[Season.SPRING]:3,[Season.SUMMER]:4,[Season.AUTUMN]:6})[to]:p.toJSON(true).numWorkers};
 if(!to||ended(p))return forecast;
 const handRoom=Math.max(0,p.maxHandSize-p.numCardsInHand);
 if(from===Season.SPRING){resources.CARD=Math.min(2,handRoom);return forecast;}
 for(const played of p.getPlayedCards()){
  const card=Card.fromName(played.cardName);if(card.cardType!==CardType.PRODUCTION||!card.productionWillActivate(game,p,played))continue;
  const gains=card.resourcesToGain??{};for(const key of RESOURCE_KEYS)resources[key]+=gains[key]??0;
  if(played.cardName==='General Store')resources.BERRY+=p.hasCardInCity('Farm')?2:1;
  else if(played.cardName==='Barge Toad')resources.TWIG+=p.getNumPlayedCard('Farm')*2;
  else if(played.cardName==='Teacher'){resources.CARD+=1;if(handRoom>1)conditional.push(played.cardName);}
  else if(!Object.values(gains).some(Boolean)&&!['General Store','Barge Toad'].includes(played.cardName))conditional.push(played.cardName);
 }
 if(p.hasCardInCity('Clock Tower')&&p.getFirstPlayedCard('Clock Tower').resources?.VP>0&&p.toJSON(true).placedWorkers.some(w=>w.location&&['BASIC','FOREST'].includes(Location.fromName(w.location).type)))conditional.push('Clock Tower');
 resources.CARD=Math.min(resources.CARD,handRoom);
 forecast.conditional=[...new Set(conditional)];
 return forecast;
}
