import {serializeGame,restoreGame,GameInputType,PlayerStatus} from './everdell/engine.js?v=20261112-23';

const copy=value=>structuredClone(value);
const JSON_ACTION_VERSION=1;
const INITIAL_INPUTS=new Set([GameInputType.PLACE_WORKER,GameInputType.VISIT_DESTINATION_CARD,GameInputType.CLAIM_EVENT,GameInputType.PLAY_CARD]);

// A deterministic content digest binds a saved checkpoint to the exact saved party
// It is an accidental-staleness check, not a security boundary
function stateDigest(state){
 const text=JSON.stringify(state);let a=0x811c9dc5,b=0x9e3779b9;
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,0x01000193);b=Math.imul(b^c,0x85ebca6b);}
 return `${text.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;
}
function valid(checkpoint){return checkpoint?.version===JSON_ACTION_VERSION&&checkpoint.game?.players?.length>=2&&checkpoint.game.players.every(p=>typeof p.playerId==='string')&&Array.isArray(checkpoint.arrivals)&&checkpoint.layout&&typeof checkpoint.layout==='object';}

/** Capture before an initiating action, never between its mandatory choices */
export function captureAction({game,meta,layout={},selected=null,arrivals=new Map()}){
 return {version:JSON_ACTION_VERSION,game:copy(serializeGame(game)),meta:copy(meta),layout:copy(layout),selected,arrivals:copy(arrivals instanceof Map?[...arrivals]:arrivals)};
}

/** Bind immediately before persisting the current game and its checkpoint */
export function bindAction(checkpoint,game){
 if(!valid(checkpoint))throw new Error('Invalid action checkpoint');
 const state=serializeGame(game);
 return {...copy(checkpoint),expectedState:{gameStateId:state.gameStateId,playerIds:state.players.map(p=>p.playerId),stateDigest:stateDigest(state)}};
}

/** A stale checkpoint from another game must never overwrite the current party */
export function isActionForGame(checkpoint,game){
 if(!valid(checkpoint)||!checkpoint.expectedState)return false;
 const state=serializeGame(game),expected=checkpoint.expectedState;
 return expected.gameStateId===state.gameStateId&&JSON.stringify(expected.playerIds)===JSON.stringify(state.players.map(p=>p.playerId))&&expected.stateDigest===stateDigest(state);
}

/** Return detached data so subsequent renders/actions cannot mutate the snapshot */
export function restoreAction(checkpoint){
 if(!valid(checkpoint))throw new Error('Invalid action checkpoint');
 return {game:restoreGame(copy(checkpoint.game)),meta:copy(checkpoint.meta),layout:copy(checkpoint.layout),selected:checkpoint.selected??null,arrivals:new Map(copy(checkpoint.arrivals))};
}

/** Conservative migration of an older mandatory choice with an engine undo chain
 * Base-game saves created before checkpoints normally have allowUndo:false
 * Their prior deck/payment/layout/shared-season state cannot be reconstructed
 */
export function recoverPendingAction({game,meta,layout={},selected=null,arrivals=new Map()}){
 if(!game.pendingGameInputs.length||meta?.transition||game.players.some(p=>p.getStatus()===PlayerStatus.PREPARING_FOR_SEASON))return null;
 const current=serializeGame(game),inputs=current.playedGameInputs??[];
 if(!inputs.length||!INITIAL_INPUTS.has(inputs[0].inputType))return null;
 let cursor=current,limit=100;
 while(cursor.gameStateJSONForUndo&&limit--){
  const previous=cursor.gameStateJSONForUndo;
  if(previous.gameStateId>=cursor.gameStateId||previous.activePlayerId!==current.activePlayerId)return null;
  if(!previous.pendingGameInputs?.length&&!previous.playedGameInputs?.length){
   // Without a prior layout snapshot, reconstruct only when city identities did not change
   // Resource counters and workers on existing cards may differ without changing foundations
   const cityKeys=state=>state.players.map(p=>Object.entries(p.playedCards??{}).map(([name,cards])=>[name,cards.length]).sort(([a],[b])=>a.localeCompare(b)));
   if(JSON.stringify(cityKeys(previous))!==JSON.stringify(cityKeys(current)))return null;
   return captureAction({game:restoreGame(previous),meta,layout,selected,arrivals});
  }
  const previousInputs=previous.playedGameInputs??[];
  if(!previousInputs.length||JSON.stringify(previousInputs[0])!==JSON.stringify(inputs[0]))return null;
  cursor=previous;
 }
 return null;
}
