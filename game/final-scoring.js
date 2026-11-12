import {Card,Event,Location,getScores} from './everdell/engine.js?v=20261112-23';
import {cityCardEntries} from './living-board-state.js?v=feedback21';

const sum=steps=>steps.reduce((total,step)=>total+step.points,0);
const categories=['cards','events','journey','tokens'];
const labels={cards:'Карты города',events:'События',journey:'Путешествия',tokens:'Жетоны очков'};

// Read-only presentation plan, reconciled with the same engine totals as the result table
export function finalScoringPlan(game){
 const scores=getScores(game),steps=[];
 for(const score of scores){
  const player=game.getPlayer(score.playerId),buckets={cards:[],events:[],journey:[],tokens:[]};
  const add=(category,step)=>{if(step.points)buckets[category].push({...step,playerId:player.playerId,category});};
  const entries=cityCardEntries(player);
  for(const entry of entries)add('cards',{kind:'card',name:entry.cardName,target:{type:'city-card',id:entry.key},points:Card.fromName(entry.cardName).getPoints(player,game)+(entry.played.resources?.VP??0)});
  const pairPoints=3*player.getNumHusbandWifePairs();
  if(pairPoints){const paired=entries.find(entry=>entry.pairedWith);add('cards',{kind:'pairs',name:'Пары жителей',target:paired?{type:'city-card',id:paired.key}:null,points:pairPoints});}
  for(const [name,info] of Object.entries(player.claimedEvents)){
   const event=Event.fromName(name);if(event.type==='WONDER')continue;
   add('events',{kind:'event',name,target:{type:'event',id:'event:'+name},points:event.getPoints(player,game)+(info?.storedResources?.VP??0)});
  }
  for(const worker of player.toJSON(false).placedWorkers??[]){if(worker.location)add('journey',{kind:'location',name:worker.location,target:{type:'location',id:'ever:'+worker.location},points:Location.fromName(worker.location).getPoints(player,game)});}
  add('tokens',{kind:'tokens',name:labels.tokens,target:null,points:score.tokens});
  for(const category of categories){
   // Future rules adapters (and legacy solo saves) may score a category differently
   // Keep that exact aggregate rather than fabricating a residual award
   const bucket=sum(buckets[category])===score[category]?buckets[category]:score[category]?[{playerId:player.playerId,category,kind:'category',name:labels[category],target:null,points:score[category]}]:[];
   steps.push(...bucket.map((step,index)=>({...step,id:player.playerId+':'+category+':'+index})));
  }
 }
 if(scores.some(score=>sum(steps.filter(step=>step.playerId===score.playerId))!==score.total))throw new Error('Итог подсчёта не совпадает с движком');
 return {scores,steps,duration:steps.length?Math.min(24000,Math.max(12000,steps.length*850)):0};
}

// Every frame is derived from elapsed time; skipped or repeated callbacks cannot award twice
export function finalScoringFrame(plan,elapsed){
 const duration=plan.duration,done=!plan.steps.length||elapsed>=duration,position=done?plan.steps.length:Math.max(0,elapsed)/duration*plan.steps.length,index=Math.min(plan.steps.length-1,Math.floor(position));
 const totals=Object.fromEntries(plan.scores.map(score=>[score.playerId,0]));
 for(let i=0;i<plan.steps.length;i++){
  const step=plan.steps[i],fraction=done||i<index?1:i===index?Math.max(0,Math.min(1,(position-index-.25)/.65)):0;
  totals[step.playerId]+=Math.round(step.points*fraction);
 }
 return {totals,index,step:done?null:plan.steps[index],done,progress:done?1:Math.max(0,Math.min(1,elapsed/duration))};
}

export function createFinalScoring(plan,{now=()=>performance.now(),request=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id),onFrame=()=>{},onFinish=()=>{}}={}){
 let active=false,disposed=false,started=0,pending=null,generation=0;
 function finish(){if(!active||disposed)return;active=false;generation++;if(pending!==null)cancel(pending);pending=null;onFrame(finalScoringFrame(plan,plan.duration));onFinish();}
 function tick(token){if(!active||disposed||token!==generation)return;pending=null;const frame=finalScoringFrame(plan,now()-started);if(frame.done){finish();return;}onFrame(frame);if(!active||disposed||token!==generation)return;pending=request(()=>tick(token));}
 return {
  get active(){return active;},
  start(){if(active||disposed)return;active=true;started=now();const token=++generation;tick(token);},
  skip:finish,
  dispose(){if(disposed)return;disposed=true;active=false;generation++;if(pending!==null)cancel(pending);pending=null;}
 };
}
