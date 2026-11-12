import {Card,Location,Event,GameInputType,CardType,Season,restoreGame,getPaymentOptions} from './everdell/engine.js?v=20261112-23';

const KEYS=['TWIG','RESIN','PEBBLE','BERRY'];
const BASE={TWIG:.9,RESIN:1.25,PEBBLE:1.7,BERRY:1.1};
const SEASONS=[Season.WINTER,Season.SPRING,Season.SUMMER,Season.AUTUMN];
const sum=o=>Object.values(o??{}).reduce((a,b)=>a+(Number(b)||0),0);
const name=o=>typeof o==='string'?o:o?.cardName??o?.card;
const best=(list,score)=>list.map((value,index)=>({value,index,score:score(value)})).sort((a,b)=>b.score-a.score||a.index-b.index)[0]?.value;
const own=(g)=>g.getActivePlayer();

// The policy never receives the opposing hand, deck order, secrets or private logs
// Unknown stack entries preserve only the public stack length for legality queries
// No moves or draw simulations are run on this observation
export function createBotObservation(game,playerId){
 const json=game.toJSON({includePrivate:false,isRoot:false});
 json.gameLog=[];json.gameStateJSONForUndo=null;json.playedGameInputs=[];
 json.players=json.players.map(p=>p.playerId===playerId?game.getPlayer(playerId).toJSON(true):p);
 for(const p of json.players)p.playerSecret='';
 for(const key of ['deck','discardPile'])if(json[key])json[key].cards=Array(json[key].numCards).fill(null);
 json.pendingGameInputs=game.activePlayerId===playerId?structuredClone(game.pendingGameInputs):[];
 return restoreGame(json);
}
function remainingHarvests(g){return [2,1,1,0][Math.max(0,SEASONS.indexOf(own(g).currentSeason))];}
function futureCardValue(g,n){
 if(n==='FROM_DECK')return 3;
 const p=own(g),c=Card.fromName(n),harvest=remainingHarvests(g),city=p.getPlayedCards();
 let v=c.baseVP*2;
 if(c.isUnique&&p.hasCardInCity(n))return -8;
 const gains=c.resourcesToGain??{};
 v+=KEYS.reduce((s,k)=>s+(gains[k]??0)*BASE[k],0)*(1+harvest)*1.15;
 v+=(gains.CARD??0)*(.65+.2*harvest);
 if(c.cardType===CardType.PRODUCTION)v+=1.2+harvest*.8;
 if(c.cardType===CardType.GOVERNANCE)v+=1.2+harvest*1.5;
 if(c.cardType===CardType.DESTINATION)v+=1+harvest*.65;
 if(c.isConstruction)v+=.8;
 switch(n){
  case 'Farm':v+=p.getNumPlayedCard('Husband')+p.getNumPlayedCard('General Store');break;
  case 'Barge Toad':v+=p.getNumPlayedCard('Farm')*1.8*(1+harvest);break;
  case 'General Store':v+=(p.hasCardInCity('Farm')?2:1)*(1+harvest);break;
  case 'Husband':v+=(p.hasCardInCity('Wife')?2:0)+(p.hasCardInCity('Farm')&&p.hasCardInCity('Wife')?3*(1+harvest):0);break;
  case 'Wife':v+=p.getNumPlayedCard('Husband')>p.getNumPlayedCard('Wife')?6:0;break;
  case 'Shopkeeper':case 'Historian':case 'Courthouse':v+=harvest*2.3;break;
  case 'Crane':case 'Innkeeper':case 'Judge':v+=1.6+harvest;break;
  case 'Queen':v+=harvest*3;break;
  case 'Ranger':v+=p.getRecallableWorkers().length?5:0;break;
  case 'Postal Pigeon':v+=4;break;
  case 'Shepherd':v+=3;break;
  case 'Bard':v+=Math.min(p.numCardsInHand,5)*.65;break;
  case 'Teacher':v+=1+harvest;break;
  case 'Chip Sweep':case 'Miner Mole':v+=2*(1+harvest);break;
  case 'Storehouse':v+=1.4*harvest;break;
  case 'Monk':case 'Doctor':case 'Woodcarver':v+=harvest;break;
  case 'Architect':v+=2*Math.min(6,(p.getResources().RESIN??0)+(p.getResources().PEBBLE??0));break;
  case 'King':v+=Object.keys(p.claimedEvents).length*2.5;break;
  case 'Palace':v+=city.filter(x=>{const c=Card.fromName(x.cardName);return c.isUnique&&c.isConstruction;}).length*2;break;
  case 'Castle':v+=city.filter(x=>{const c=Card.fromName(x.cardName);return !c.isUnique&&c.isConstruction;}).length*2;break;
  case 'Theatre':v+=city.filter(x=>{const c=Card.fromName(x.cardName);return c.isUnique&&c.isCritter;}).length*2;break;
  case 'School':v+=city.filter(x=>{const c=Card.fromName(x.cardName);return !c.isUnique&&c.isCritter;}).length*2;break;
  case 'Evertree':v+=city.filter(x=>Card.fromName(x.cardName).cardType===CardType.PROSPERITY).length*2;break;
  case 'Ruins':v=-2;break;
  case 'Fool':v=4.8;break;
 }
 return v;
}
function handValue(g,n){const c=Card.fromName(n),p=own(g);if(c.isUnique&&p.hasCardInCity(n))return -3;const deficit=KEYS.reduce((a,k)=>a+Math.max(0,(c.baseCost[k]??0)-(p.getResources()[k]??0))*BASE[k],0);return futureCardValue(g,n)-deficit*.7;}
function resourceValues(g){
 const p=own(g),stock=p.getResources(),values={...BASE};
 const targets=[...new Set([...p.getCardsInHand(),...g.meadowCards])].filter(n=>Card.fromName(n).canPlayIgnoreCostAndSource(g,false)).map(n=>({n,c:Card.fromName(n),v:handValue(g,n)})).sort((a,b)=>b.v-a.v).slice(0,4);
 for(const k of KEYS){const need=targets.reduce((m,t)=>Math.max(m,Math.max(0,(t.c.baseCost[k]??0)-(stock[k]??0))*(t.v>0?1:0)),0);values[k]*=need>0?1.3+Math.min(3,need)*.18:stock[k]>3?.3:.55;if(p.getNumOccupiedSpacesInCity()>=p.maxCitySize)values[k]*=.35;}
 return values;
}
function resourceGain(g,resources){const v=resourceValues(g),p=own(g),stock=p.getResources();return KEYS.reduce((s,k)=>s+(resources[k]??0)*v[k]/(1+Math.max(0,(stock[k]??0)+(resources[k]??0)-7)*.18),0)+(resources.VP??0)*2+Math.min(resources.CARD??0,Math.max(0,p.maxHandSize-p.numCardsInHand))*.8;}
function costValue(g,payment){const v=resourceValues(g);return KEYS.reduce((s,k)=>s+(payment.resources?.[k]??0)*v[k],0)+(payment.cardToDungeon?Math.max(0,futureCardValue(g,payment.cardToDungeon))*.6:0)+(['Queen','Inn'].includes(payment.cardToUse)?2.8:payment.cardToUse?.length?1:0);}
export function paymentFitsCity(g,n,payment){
 const p=own(g);if(n==='Fool'||n==='Ruins'||p.canAddToCity(n,true))return true;
 const sacrificed=[payment.cardToDungeon,...(['Crane','Innkeeper'].includes(payment.cardToUse)?[payment.cardToUse]:[])].filter(Boolean);
 if(!sacrificed.length)return false;
 const copy=restoreGame(g.toJSON({includePrivate:true,isRoot:false})),player=own(copy);
 for(const card of sacrificed){const played=player.getFirstPlayedCard(card);if(played)player.removeCardFromCity(copy,played,false);}
 return player.canAddToCity(n,true);
}
function locationValue(g,n){
 const l=Location.fromName(n),p=own(g),v=resourceValues(g);let score=resourceGain(g,l.resourcesToGain??{});
 const maxRes=Math.max(...Object.values(v));
 switch(n){
  case 'TWO_WILD':score=maxRes*2;break;
  case 'TWO_CARDS_ONE_WILD':score=maxRes+Math.min(2,p.maxHandSize-p.numCardsInHand)*.8;break;
  case 'COPY_BASIC_ONE_CARD':score=Math.max(...Object.keys(g.locationsMap).filter(n=>Location.fromName(n).type==='BASIC').map(n=>resourceGain(g,Location.fromName(n).resourcesToGain)))+.7;break;
  case 'DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD':score=Math.min(3,Math.max(0,p.numCardsInHand-2))*maxRes*.75;break;
  case 'DISCARD_ANY_THEN_DRAW_TWO_PER_CARD':score=p.numCardsInHand>0&&p.numCardsInHand<6?1.7:.1;break;
  case 'DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS':score=3+Math.max(0,...g.meadowCards.filter(n=>p.canAffordCard(n,null,'ANY 1')&&Card.fromName(n).canPlayIgnoreCostAndSource(g)).map(n=>futureCardValue(g,n)*.5));break;
  case 'HAVEN':score=Math.floor(Math.max(0,p.numCardsInHand-3)/2)*maxRes*.6;break;
 }
 if(n.startsWith('JOURNEY'))score=l.getPoints(p,g)*2-Math.max(0,l.getPoints(p,g)-Math.max(0,p.numCardsInHand-2))*.7;
 return score;
}
function destinationValue(g,played){
 const p=own(g),n=played.cardName,harvest=remainingHarvests(g);
 switch(n){
  case 'Queen':return Math.max(0,...g.getCardsWithSource(true,true).filter(o=>{let c=Card.fromName(o.card);return c.baseVP<=3&&c.canPlayIgnoreCostAndSource(g);}).map(o=>futureCardValue(g,o.card)))-.5;
  case 'Inn':return Math.max(0,...g.meadowCards.filter(n=>p.canAffordCard(n,null,'ANY 3')&&Card.fromName(n).canPlayIgnoreCostAndSource(g)).map(n=>futureCardValue(g,n)*.65))+1;
  case 'Storehouse':return resourceGain(g,played.resources??{});
  case 'Lookout':return Math.max(...Object.keys(g.locationsMap).filter(n=>!n.startsWith('JOURNEY')).map(n=>locationValue(g,n)));
  case 'Chapel':return 2+Math.min(3,p.maxHandSize-p.numCardsInHand)*.75;
  case 'Cemetary':return 5-harvest*.8;
  case 'Monastery':return 6-harvest;
  case 'Post Office':return Math.max(0,7-p.numCardsInHand)*.65+1;
  case 'University':return 1.2;
  default:return 1;
 }
}
function eventValue(g,n){const e=Event.fromName(n);let points=e.baseVP;try{points=e.getPoints(own(g),g);}catch{}return Math.max(3,points)*2+1;}
function spotValue(g,o){return o.location?locationValue(g,o.location):o.event?eventValue(g,o.event):o.playedCard?destinationValue(g,o.playedCard):0;}
function cardOptionValue(g,input,o){
 const n=name(o);if(n==='FROM_DECK')return 1;let v=futureCardValue(g,n);
 const remove=input.cardContext==='Ruins'||input.cardContext==='University'||input.eventContext&&input.inputType==='SELECT_PLAYED_CARDS';
 if(remove){const c=Card.fromName(n);return resourceGain(g,c.baseCost)-Math.max(0,v);}
 if(['Chip Sweep','Miner Mole'].includes(input.cardContext)){const c=Card.fromName(n);v=resourceGain(g,c.resourcesToGain??{});if(n==='General Store')v=resourceGain(g,{BERRY:own(g).hasCardInCity('Farm')?2:1});if(n==='Barge Toad')v=resourceGain(g,{TWIG:2*own(g).getNumPlayedCard('Farm')});if(['Teacher','Chip Sweep','Miner Mole','Peddler'].includes(n))v=1.5;}
 if(input.cardContext==='Post Office'||input.cardContext==='Undertaker'&&input.prevInputType==='PLAY_CARD'||input.eventContext&&input.inputType==='SELECT_CARDS')v=-handValue(g,n);
 return v;
}
function chooseResources(g,input){
 const p=own(g),stock=p.getResources(),v=resourceValues(g),keys=KEYS.filter(k=>(!input.specificResource||k===input.specificResource)&&k!==input.excludeResource),out={};
 let total=0,target=input.maxResources;
 if(input.toSpend){
  target=Math.min(target,keys.reduce((n,k)=>n+(stock[k]??0),0));
  if(input.minResources===0&&input.cardContext==='Peddler')target=Math.min(target,keys.reduce((n,k)=>n+((v[k]??0)<Math.max(...Object.values(v))*.7?(stock[k]??0):0),0));
  else if(input.minResources===0&&!input.eventContext)target=keys.reduce((n,k)=>n+((v[k]??0)<(input.cardContext==='Monk'?3:1.85)?stock[k]??0:0),0);
  target=Math.max(input.minResources??0,Math.min(input.maxResources,target));
 }
 while(total<target){const avail=keys.filter(k=>!input.toSpend||(out[k]??0)<(stock[k]??0));if(!avail.length)break;const key=best(avail,k=>input.toSpend?-v[k]-(out[k]??0)*.05:v[k]/(1+(out[k]??0)*.38));out[key]=(out[key]??0)+1;total++;}
 if(total<(input.minResources??0))throw new Error('Bot cannot satisfy required resource choice');
 return out;
}
function chooseDiscountPayment(g,input){
 const p=own(g),cost=Card.fromName(input.card).baseCost,discount=input.locationContext==='DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'?1:['Inn','Hotel','Locomotive'].includes(input.cardContext)?3:0;
 const stock=p.getResources(),choices=[];
 function enumerate(i,r){if(i===KEYS.length){if(!p.validatePaidResources(r,cost,discount?`ANY ${discount}`:null))choices.push(r);return;}const k=KEYS[i],max=Math.min(stock[k]??0,cost[k]??0);for(let n=0;n<=max;n++)enumerate(i+1,n?{...r,[k]:n}:r);}
 enumerate(0,{});const resources=best(choices,r=>-costValue(g,{resources:r}));if(!resources)throw new Error('Bot cannot satisfy discounted payment');return {...input.clientOptions.paymentOptions,resources};
}
function choosePending(g,input){
 const out=structuredClone(input);out.clientOptions={...out.clientOptions};const p=own(g);
 switch(input.inputType){
  case 'SELECT_RESOURCES':out.clientOptions.resources=chooseResources(g,input);break;
  case 'SELECT_PAYMENT_FOR_CARD':out.clientOptions.paymentOptions=chooseDiscountPayment(g,input);break;
  case 'SELECT_PLAYER':out.clientOptions.selectedPlayer=input.playerOptions.find(id=>id!==p.playerId)??input.playerOptions[0]??null;break;
  case 'SELECT_LOCATION':out.clientOptions.selectedLocation=best(input.locationOptions,n=>locationValue(g,n));break;
  case 'SELECT_WORKER_PLACEMENT':{
   const recalling=input.cardContext==='Ranger'&&input.prevInputType==='PLAY_CARD'||!!input.eventContext;
   const options=input.cardContext==='Clock Tower'?input.options.filter(o=>o.location&&!Location.fromName(o.location).canPlayCheck(g,{inputType:GameInputType.PLACE_WORKER,clientOptions:{location:o.location}})):input.options;
   const picked=best(options,o=>recalling?-spotValue(g,o):spotValue(g,o));
   out.clientOptions.selectedOption=picked??null;break;
  }
  case 'SELECT_OPTION_GENERIC':out.clientOptions.selectedOption=best(input.options,option=>{
   if(option==='Pair')return 100;if(option==='Separate')return 0;
   const match=option.match(/^(?:(\d+) )?(TWIG|RESIN|PEBBLE|BERRY)$/);if(match)return resourceGain(g,{[match[2]]:Number(match[1]??1)});
   if(option==='Deck')return 2;if(option==='Discard Pile')return 1;return 0;
  });break;
  case 'DISCARD_CARDS':{
   let count=input.minCards??0;const c=input.cardContext,l=input.locationContext;
   if(c==='Bard'||input.eventContext)count=Math.min(input.maxCards,p.numCardsInHand);
   else if(l==='DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD')count=Math.min(input.maxCards,Math.max(0,p.numCardsInHand-2));
   else if(l==='HAVEN')count=Math.min(input.maxCards,Math.floor(Math.max(0,p.numCardsInHand-2)/2)*2);
   else if(l==='DISCARD_ANY_THEN_DRAW_TWO_PER_CARD')count=Math.min(input.maxCards,Math.max(1,Math.floor(p.numCardsInHand/2)));
   count=Math.max(input.minCards??0,Math.min(count,p.numCardsInHand,input.maxCards));
   out.clientOptions.cardsToDiscard=p.getCardsInHand().map((n,i)=>({n,i,v:handValue(g,n)})).sort((a,b)=>a.v-b.v||a.i-b.i).slice(0,count).map(x=>x.n);break;
  }
  case 'SELECT_CARDS':case 'SELECT_CARDS_WITH_SOURCE':case 'SELECT_PLAYED_CARDS':{
   let count=input.maxToSelect;const ranked=input.cardOptions.map((o,i)=>({o,i,v:cardOptionValue(g,input,o)})).sort((a,b)=>b.v-a.v||a.i-b.i);
   if(input.cardContext==='Post Office'&&input.minToSelect===0)count=ranked.filter(x=>handValue(g,name(x.o))<3).length;
   if(input.inputType==='SELECT_PLAYED_CARDS'&&input.eventContext&&input.minToSelect===0)count=Math.min(count,ranked.filter(x=>x.v>-5).length);
   const selected=ranked.slice(0,Math.max(input.minToSelect,Math.min(count,ranked.length))).map(x=>x.o);
   // This forest requires at least one affordable chosen card before its second step
   if(input.locationContext==='DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'&&input.prevInputType==='PLACE_WORKER'){
    const affordable=n=>p.canAffordCard(n,null,'ANY 1')&&Card.fromName(n).canPlayIgnoreCostAndSource(g);
    if(!selected.some(affordable)){const candidate=ranked.find(x=>affordable(x.o));if(!candidate)throw new Error('No affordable forest card');selected[0]=candidate.o;}
   }
   out.clientOptions.selectedCards=selected;break;
  }
  default:throw new Error(`Unsupported bot choice: ${input.inputType}`);
 }
 return out;
}

export function chooseBotCommand(game,meta,playerId){
 if(game.isGameOver()||game.activePlayerId!==playerId)return null;
 const g=createBotObservation(game,playerId),p=own(g);
 if(g.pendingGameInputs.length)return {kind:'step',input:choosePending(g,g.pendingGameInputs[0])};
 if(meta?.transition)return null;
 if(meta?.passed?.includes(playerId))return {kind:'pass'};
 const candidates=[];let serial=0;const add=(input,score)=>{if(Number.isFinite(score))candidates.push({input,score,serial:serial++});};
 if(p.numAvailableWorkers>0){
  for(const n of g.getPlayableLocations())add({inputType:GameInputType.PLACE_WORKER,clientOptions:{location:n}},locationValue(g,n));
  for(const playedCard of g.getVisitableDestinationCards())add({inputType:GameInputType.VISIT_DESTINATION_CARD,clientOptions:{playedCard}},destinationValue(g,playedCard));
  for(const event of g.getClaimableEvents())add({inputType:GameInputType.CLAIM_EVENT,clientOptions:{event}},eventValue(g,event));
 }
 for(const source of ['HAND','MEADOW']){
  const names=source==='HAND'?[...new Set(p.getCardsInHand())]:g.meadowCards;
  names.forEach((n,i)=>{
   const payments=getPaymentOptions(g,n,source,source==='MEADOW'?i:undefined).filter(payment=>paymentFitsCity(g,n,payment));
   if(!payments.length)return;
   const payment=best(payments,x=>-costValue(g,x)),c=Card.fromName(n);
   let value=futureCardValue(g,n)-costValue(g,payment)*.75+1.1;
   if(n==='Ruins'){const options=p.getPlayedConstructions();value=Math.max(-5,...options.map(o=>resourceGain(g,Card.fromName(o.cardName).baseCost)-futureCardValue(g,o.cardName)))+.8;}
   if(p.getNumOccupiedSpacesInCity()>=12&&c.cardType===CardType.PRODUCTION&&remainingHarvests(g)===0)value-=1;
   add({inputType:GameInputType.PLAY_CARD,clientOptions:{card:n,source,...(source==='MEADOW'?{sourceIdx:i}:{}),paymentOptions:payment}},value);
  });
 }
 candidates.sort((a,b)=>b.score-a.score||a.serial-b.serial);
 return candidates.length&&candidates[0].score>.2?{kind:'step',input:candidates[0].input}:{kind:'pass'};
}
