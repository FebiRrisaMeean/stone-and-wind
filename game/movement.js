import {TROOPS,WORLD} from './data.js';

const WORKER=TROOPS.worker;
const BASE_VISION=7.8;
const WORKER_NAMES=[
 'Борис','Глеб','Илья','Иван','Еремей','Ефим','Данила','Мирон',
 'Матвей','Тимофей','Савва','Фёдор','Василий','Яков','Григорий','Михайло',
 'Пётр','Степан','Семён','Андрей','Игнат','Прохор','Лукьян','Тихон',
 'Елисей','Назар','Никита','Роман','Кузьма','Терентий','Фрол','Демьян',
 'Лука','Кирилл','Афанасий','Добрыня','Радомир','Любомир','Яромир','Всеволод'
];
const directions=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
const index=(x,z)=>z*WORLD.width+x;
const inside=(x,z)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<WORLD.width&&z<WORLD.height;
const alive=u=>Number.isFinite(u.hp)&&u.hp>0;
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

export const count=u=>Math.max(0,Math.ceil((u?.hp??0)/(TROOPS[u?.kind]?.hp??WORKER.hp)));
export const moveRange=(_state,_unit)=>WORKER.speed;
export function known(state,player,pos){
 if(state.livingBoard&&pos){const x=Math.round(pos.x),z=Math.round(pos.z);return Number.isFinite(x)&&Number.isFinite(z)&&x>=0&&x<WORLD.width&&z>=0&&z<(state.worldHeight??WORLD.height)&&!!state.players[player]?.explored[z*WORLD.width+x];}
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.z)||pos.x<0||pos.z<0||pos.x>=WORLD.width||pos.z>=WORLD.height)return false;
 const x=Math.round(pos.x),z=Math.round(pos.z);
 return inside(x,z)&&!!state.players[player]?.explored[index(x,z)];
}
function visionCenters(state,player){
 return [
  ...state.buildings.filter(b=>b.owner===player&&b.kind==='castle').map(b=>({...b,r:BASE_VISION})),
  ...state.units.filter(u=>u.owner===player&&u.kind==='worker'&&alive(u)&&u.ready<=state.round).map(u=>({...u,r:WORKER.vision}))
 ];
}
export function visible(state,player,pos){
 if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.z)||pos.x<0||pos.z<0||pos.x>=WORLD.width||pos.z>=WORLD.height)return false;
 return visionCenters(state,player).some(c=>(c.x-pos.x)**2+(c.z-pos.z)**2<=c.r*c.r);
}
function revealAt(state,player,pos,radius){
 const explored=state.players[player].explored;
 for(let z=Math.max(0,Math.ceil(pos.z-radius));z<=Math.min(WORLD.height-1,Math.floor(pos.z+radius));z++){
  for(let x=Math.max(0,Math.ceil(pos.x-radius));x<=Math.min(WORLD.width-1,Math.floor(pos.x+radius));x++){
   if((x-pos.x)**2+(z-pos.z)**2<=radius*radius)explored[index(x,z)]=true;
  }
 }
}
function revealCurrent(state,player){for(const c of visionCenters(state,player))revealAt(state,player,c,c.r);}
function randomFor(seed){let n=seed>>>0;return()=>{n=(n+0x6D2B79F5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}


function namesForSeed(seed){
 const names=WORKER_NAMES.slice(),random=randomFor((seed>>>0)^0xA341316C);
 for(let i=names.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
 return names;
}
export function assignWorkerIdentity(state){
 const next=structuredClone(state),workers=next.units.filter(u=>u.owner===0&&u.kind==='worker');
 assert(workers.length===6,'В прогулке должно быть шесть рабочих');
 const usedNames=new Set(),usedPortraits=new Set();
 const existingNames=workers.map(u=>{const name=typeof u.name==='string'?u.name.trim():'';if(!name||/^Рабочий(?:\s*\d+)?$/iu.test(name)||usedNames.has(name.toLowerCase()))return null;usedNames.add(name.toLowerCase());return name;});
 const existingPortraits=workers.map(u=>{if(!Number.isInteger(u.portrait)||u.portrait<0||u.portrait>5||usedPortraits.has(u.portrait))return null;usedPortraits.add(u.portrait);return u.portrait;});
 const names=namesForSeed(next.seed);let cursor=0;
 for(let i=0;i<workers.length;i++){
  const u=workers[i];
  if(existingNames[i])u.name=existingNames[i];
  else{while(usedNames.has(names[cursor].toLowerCase()))cursor++;u.name=names[cursor++];usedNames.add(u.name.toLowerCase());}
  if(existingPortraits[i]!==null)u.portrait=existingPortraits[i];
  else{let portrait=0;while(usedPortraits.has(portrait))portrait++;u.portrait=portrait;usedPortraits.add(portrait);}
  if(!Number.isInteger(u.number)||u.number<1||u.number>6)u.number=i+1;
 }
 return next;
}

export function createMovementWorld({seed=4811}={}){
 const worldSeed=seed>>>0,random=randomFor(worldSeed),base=WORLD.bases[0],center=WORLD.center;
 const state={version:'movement-1',sandbox:true,mode:'movement',seed:worldSeed,round:1,serial:6,tiles:[],units:[],players:[],buildings:[{id:'castle0',kind:'castle',owner:0,x:base.x,z:base.z,ready:1}],sources:[],point:{owner:null,progress:0},lastMove:null};
 const crossings=[center.z-12,center.z,center.z+12];
 for(let z=0;z<WORLD.height;z++)for(let x=0;x<WORLD.width;x++){
  const river=Math.round(center.x+Math.sin(z*.22)*1.6),bridge=crossings.some(c=>Math.abs(z-c)<=1),water=x===river&&!bridge;
  const roll=random();
  let type=water?'water':roll<.19?'forest':roll<.25?'rock':'plain';
  const nearBase=Math.hypot(x-base.x,z-base.z)<6;
  if(nearBase)type=(x+z)%4===0?'meadow':'plain';
  if(!water&&(Math.abs(z-center.z)<=1||bridge&&Math.abs(x-river)<=1))type='road';
  const wave=Math.sin(x*.19)*.09+Math.cos(z*.23)*.07+Math.sin((x+z)*.11)*.06;
  const h=water?-.05:nearBase?.14:.2+wave+random()*.018;
  state.tiles.push({x,z,type,h});
 }
 for(let p=0;p<2;p++)state.players.push({id:p,level:1,workers:p===0?6:0,gifts:[],explored:Array(WORLD.width*WORLD.height).fill(false)});
 const offsets=[[-2,2],[0,2],[2,2],[-2,4],[0,4],[2,4]];
 for(let i=0;i<offsets.length;i++){
  const [dx,dz]=offsets[i];
  state.units.push({id:'worker-'+(i+1),number:i+1,name:'Рабочий '+(i+1),owner:0,kind:'worker',x:base.x+dx,z:base.z+dz,hp:WORKER.hp,ready:1,attacked:0});
 }
 revealCurrent(state,0);
 return assignWorkerIdentity(state);
}

function blockedTiles(state,movingId,reserved=[]){
 const blocked=new Set();
 for(const b of state.buildings){
  const radius=b.kind==='castle'?1:0;
  for(let z=b.z-radius;z<=b.z+radius;z++)for(let x=b.x-radius;x<=b.x+radius;x++)if(inside(x,z))blocked.add(index(x,z));
 }
 for(const u of state.units)if(u.id!==movingId&&alive(u))blocked.add(index(Math.round(u.x),Math.round(u.z)));
 for(const point of reserved)if(point&&inside(point.x,point.z))blocked.add(index(point.x,point.z));
 return blocked;
}
const terrainCost=tile=>tile.type==='road'?.85:tile.type==='forest'?1.3:tile.type==='rock'?1.45:1;
function findPath(state,unit,target,blocked){
 const start=index(unit.x,unit.z),end=index(target.x,target.z),length=WORLD.width*WORLD.height;
 const cost=new Float64Array(length);cost.fill(Infinity);cost[start]=0;
 const previous=new Int32Array(length);previous.fill(-1);
 const closed=new Uint8Array(length),heap=[];
 const heuristic=id=>{const x=id%WORLD.width,z=Math.floor(id/WORLD.width),dx=Math.abs(x-target.x),dz=Math.abs(z-target.z);return(Math.max(dx,dz)+(Math.SQRT2-1)*Math.min(dx,dz))*.85;};
 function push(entry){let i=heap.length;heap.push(entry);while(i>0){const parent=(i-1)>>1;if(heap[parent].score<=entry.score)break;heap[i]=heap[parent];i=parent;}heap[i]=entry;}
 function pop(){const top=heap[0],end=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].score<heap[child].score)child++;if(heap[child].score>=end.score)break;heap[i]=heap[child];i=child;}heap[i]=end;}return top;}
 const walkable=(x,z)=>inside(x,z)&&state.tiles[index(x,z)]?.type!=='water'&&!blocked.has(index(x,z));
 push({id:start,score:heuristic(start)});
 while(heap.length){
  const current=pop().id;if(closed[current])continue;
  if(current===end){const path=[];for(let id=end;id!==-1;id=previous[id])path.push({x:id%WORLD.width,z:Math.floor(id/WORLD.width)});return path.reverse();}
  closed[current]=1;const x=current%WORLD.width,z=Math.floor(current/WORLD.width);
  for(const [dx,dz] of directions){
   const nx=x+dx,nz=z+dz;if(!walkable(nx,nz))continue;
   if(dx&&dz&&(!walkable(x+dx,z)||!walkable(x,z+dz)))continue;
   const next=index(nx,nz);if(closed[next])continue;
   const nextCost=cost[current]+terrainCost(state.tiles[next])*Math.hypot(dx,dz);
   if(nextCost<cost[next]){cost[next]=nextCost;previous[next]=current;push({id:next,score:nextCost+heuristic(next)});}
  }
 }
 return null;
}

export function moveWorker(state,id,target,{reserved=[]}={}){
 const unit=state.units.find(u=>u.id===id&&u.owner===0&&u.kind==='worker'&&alive(u)&&u.ready<=state.round);
 assert(unit,'Рабочий недоступен');
 assert(target&&inside(target.x,target.z),'Выберите участок в пределах карты');
 assert(target.x!==unit.x||target.z!==unit.z,'Рабочий уже находится на этом участке');
 assert(state.tiles[index(target.x,target.z)]?.type!=='water','Вода непроходима — выберите берег или мост');
 const blocked=blockedTiles(state,id,reserved);
 assert(!reserved.some(point=>point&&point.x===target.x&&point.z===target.z),'Участок занят маршрутом другого рабочего');
 assert(!blocked.has(index(target.x,target.z)),'Участок занят замком или другим рабочим');
 const path=findPath(state,unit,target,blocked);
 assert(path,'До участка нет свободного пути');
 const next=structuredClone(state),moved=next.units.find(u=>u.id===id);
 moved.x=target.x;moved.z=target.z;next.serial++;
 next.lastMove={id,path,serial:next.serial,round:1};
 for(const step of path)revealAt(next,0,step,WORKER.vision);
 revealCurrent(next,0);
 return next;
}
