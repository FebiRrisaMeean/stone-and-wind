import {canActShared,stepSharedGame,requestSharedSeason} from './shared-seasons.js';

// A bot party never reads or overwrites the previous local two-player party
export const BOT_SAVE_KEYS=Object.freeze({
 game:'stone-wind-bot-game-v1',
 layout:'stone-wind-bot-layout-v1',
 shared:'stone-wind-bot-shared-season-v1',
 teams:'stone-wind-bot-worker-teams-v1',
 action:'stone-wind-bot-action-checkpoint-v1',
 session:'stone-wind-bot-session-v1'
});

export function createBotSession(game,saved=null){
 if(game.players.length!==2||game.gameOptions?.solo)throw new Error('Нужна обычная партия на двоих игроков');
 const [humanPlayerId,botPlayerId]=game.players.map(p=>p.playerId);
 if(!humanPlayerId||!botPlayerId||humanPlayerId===botPlayerId)throw new Error('Не удалось определить игроков партии');
 if(saved!=null&&(saved.version!==1||saved.mode!=='bot'||saved.humanPlayerId!==humanPlayerId||saved.botPlayerId!==botPlayerId||saved.controllers?.[humanPlayerId]!=='human'||saved.controllers?.[botPlayerId]!=='bot'))throw new Error('Сохранённый режим не соответствует этой партии');
 return Object.freeze({version:1,mode:'bot',humanPlayerId,botPlayerId,controllers:Object.freeze({[humanPlayerId]:'human',[botPlayerId]:'bot'})});
}

// The engine retains the acting player until all their effects finish
// selectedPlayer and cardOwnerId identify recipients or targets, not the chooser
export function decisionPlayerId(game){return game.isGameOver()?null:game.activePlayerId;}

export function humanCanAct(game,meta,session){
 return decisionPlayerId(game)===session.humanPlayerId&&canActShared(game,meta,session.humanPlayerId);
}

export function humanOwnsDecision(game,session){
 return game.pendingGameInputs.length>0&&decisionPlayerId(game)===session.humanPlayerId;
}

// Actor identity comes from the local controller, never from an input payload
// A future room server must bind this identity to its authenticated connection
export function applySessionCommand(game,meta,session,actorId,command){
 createBotSession(game,session);
 if(!Object.hasOwn(session.controllers,actorId))throw new Error('Этот игрок не участвует в партии');
 if(command?.expectedStateId!=null&&command.expectedStateId!==game.gameStateId)throw new Error('Состояние партии изменилось, повторите действие');
 if(game.isGameOver())throw new Error('Партия завершена');
 if(actorId!==decisionPlayerId(game))throw new Error('Сейчас ход другого игрока');
 if(command?.kind==='pass')return requestSharedSeason(game,meta,actorId);
 if(command?.kind!=='step'||!command.input||typeof command.input.inputType!=='string')throw new Error('Неизвестное действие');
 if(command.input.inputType==='UNDO')throw new Error('Используйте отмену текущего действия');
 return stepSharedGame(game,command.input,meta);
}
