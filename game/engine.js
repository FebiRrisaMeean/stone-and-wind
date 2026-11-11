import { FACTIONS,TROOPS,BUILDINGS,PRESETS,GIFTS,FAITH_LEVELS,WORLD,VERSION } from './data.js';
const clone = s => structuredClone(s);
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const count=u=>Math.max(0,Math.ceil(u.hp/TROOPS[u.kind].hp));
export const alive=u=>u.hp>0;
export function rng(seed){ let n=seed>>>0;return()=>{n=(n+0x6D2B79F5)|0;let t=Math.imul(n^(n>>>15),1|n);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
export const gift=id=>GIFTS.find(g=>g.id===id);
export const mod=(p,stat)=>p.gifts.reduce((v,id)=>v+(gift(id)?.stat===stat?gift(id).value:0),0);
export const readyBuilding=(s,p,k)=>s.buildings.some(b=>b.owner===p&&b.kind===k&&b.ready<=s.round);
export const capacity=(s,p)=>18+s.buildings.filter(b=>b.owner===p&&b.kind==='house'&&b.ready<=s.round).length*8;
export const population=(s,p)=>s.players[p].workers+s.units.filter(u=>u.owner===p&&alive(u)&&u.kind!=='worker').reduce((n,u)=>n+count(u),0)+s.players[p].pending.reduce((n,u)=>n+(u.kind==='worker'?1:TROOPS[u.kind].size),0);
export const freeWorkers=(s,p)=>s.players[p].workers-s.sources.filter(x=>x.owner===p).reduce((n,x)=>n+x.workers.length,0)-s.units.filter(u=>u.owner===p&&u.kind==='worker'&&alive(u)).reduce((n,u)=>n+count(u),0);
export const getTile=(s,x,z)=>{x=Math.round(x);z=Math.round(z);if(x<0||z<0||x>=WORLD.width||z>=WORLD.height)return undefined;return s.tiles[z*WORLD.width+x];};
export const unitName=(u)=>u.kind==='hero'?FACTIONS[u.owner]?.hero??'Хранитель':TROOPS[u.kind].name;
export function reveal(s,p){const pl=s.players[p];const points=[{...WORLD.bases[p],r:7.8},...s.units.filter(u=>u.owner===p&&alive(u)&&u.ready<=s.round).map(u=>({...u,r:TROOPS[u.kind].vision+(u.owner===1&&s.units.some(h=>h.owner===p&&h.kind==='hero'&&alive(h)&&distance(h,u)<3.2)?1.8:0)}))];for(const t of s.tiles)if(points.some(c=>distance(c,t)<=c.r))pl.explored[t.z*WORLD.width+t.x]=true;}
export function visible(s,p,pos){return distance(pos,WORLD.bases[p])<=7.8||s.units.some(u=>u.owner===p&&alive(u)&&u.ready<=s.round&&distance(u,pos)<=TROOPS[u.kind].vision+(p===1&&s.units.some(h=>h.owner===p&&h.kind==='hero'&&alive(h)&&distance(h,u)<3.2)?1.8:0));}
export function known(s,p,pos){return !!s.players[p].explored[Math.round(pos.z)*WORLD.width+Math.round(pos.x)];}
export function viewFor(s,p){const v=clone(s);v.units=v.units.filter(u=>u.owner===p||visible(s,p,u));v.sources=v.sources.filter(t=>known(s,p,t));v.buildings=v.buildings.filter(b=>b.owner===p||visible(s,p,b));v.tiles=v.tiles.map(t=>known(s,p,t)?t:{x:t.x,z:t.z,type:'mist',h:0.12});v.giftPairs=v.giftPairs.map((pair,i)=>s.players[p].faith>=FAITH_LEVELS[i]?pair:null);v.log=v.log.filter(e=>e.owner===p||e.owner===null);v.sanitized=true;return v;}
function log(s,text,owner=null,kind='info'){s.log.unshift({id:++s.serial,round:s.round,text,owner,kind});s.log=s.log.slice(0,80);}
function createUnit(s,owner,kind,pos,ready=1,size){const t=TROOPS[kind];const u={id:'u'+(++s.serial),owner,kind,x:pos.x,z:pos.z,hp:(size??t.size)*t.hp,ready,attacked:0};s.units.push(u);return u;}
export function newGame({seed=4811,mode='ai'}={}){
 const random=rng(seed),s={version:VERSION,seed,mode,phase:'setup',round:1,turn:0,initiative:0,serial:0,tiles:[],sources:[],buildings:[],units:[],players:[],giftPairs:[],taken:[[],[],[],[]],point:{owner:null,captured:0,progress:0},log:[],winner:null};
 const center=WORLD.center;
 for(let z=0;z<WORLD.height;z++)for(let x=0;x<WORLD.width;x++){
  const river=Math.round(center.x+Math.sin(z*.22)*1.6),crossings=[center.z,center.z-12,center.z+12],water=x===river&&!crossings.some(c=>Math.abs(z-c)<=1);
  let type=water?'water':random()<.19?'forest':random()<.09?'rock':'plain';
  if(Math.abs(z-center.z)<=1&&!water)type='road';
  if(WORLD.bases.some(b=>distance({x,z},b)<4))type=(x+z)%4===0?'meadow':'plain';
  if(distance({x,z},center)<2.3)type='road';
  s.tiles.push({x,z,type,h:type==='rock'?.32:type==='water'?-.05:.12+random()*.1});
 }
 const sites=[];
 for(let p=0;p<2;p++){
  const b=WORLD.bases[p],sign=p===0?1:-1;
  for(const [dx,dz,resource,owned]of [[2,1,'gold',true],[-1,-3,'wood',true],[3,-2,'stone',true],[6,5,'wood',false],[9,-3,'gold',false],[8,-8,'stone',false],[14,6,'wood',false],[17,-6,'gold',false],[19,10,'stone',false]])sites.push({x:b.x+dx*sign,z:b.z+dz,resource,owner:owned?p:null});
 }
 for(const [dx,dz,resource]of [[-4,-11,'gold'],[4,11,'gold'],[-8,15,'stone'],[8,-15,'stone'],[-3,7,'wood'],[3,-7,'wood']])sites.push({x:center.x+dx,z:center.z+dz,resource,owner:null});
 for(let i=0;i<sites.length;i++){const m={id:'m'+i,...sites[i],slots:3,workers:sites[i].owner===null?[]:[0]};s.sources.push(m);getTile(s,m.x,m.z).type=m.resource==='wood'?'forest':m.resource==='stone'?'rock':'plain';}
 for(let p=0;p<2;p++){s.players.push({id:p,res:{gold:145,wood:100,stone:65},level:1,workers:6,pending:[],upgrades:{},faith:0,gifts:[],passed:false,ap:5,ready:false,explored:Array(WORLD.width*WORLD.height).fill(false)});const b=WORLD.bases[p];s.buildings.push({id:'castle'+p,kind:'castle',owner:p,x:b.x,z:b.z,ready:1});createUnit(s,p,'worker',{x:b.x+(p===0?1:-1),z:b.z+2},1);reveal(s,p);}
 createUnit(s,2,'guard',center,1,5);createUnit(s,2,'bow',{x:center.x+1,z:center.z-1},1,3);
 for(let i=0;i<FAITH_LEVELS.length;i++){const ids=GIFTS.filter(g=>g.id!=='glory').map(g=>g.id);ids.sort(()=>random()-0.5);s.giftPairs.push(i===FAITH_LEVELS.length-1?[ids[0],'glory']:ids.slice(0,2));}
 log(s,'В Пограничье начинается новая история');return s;
}
function assert(test,msg){if(!test)throw new Error(msg);}
function pay(s,p,c){const r=s.players[p].res;assert(r.gold>=c[0]&&r.wood>=c[1]&&r.stone>=c[2],'Недостаточно ресурсов');r.gold-=c[0];r.wood-=c[1];r.stone-=c[2];}
export function troopCost(s,p,kind){const k=p===0?1.07:1;return TROOPS[kind].cost.map(v=>Math.ceil(v*k));}
export function buildingCost(s,p,kind){const c=BUILDINGS[kind].cost.slice();if(p===0&&readyBuilding(s,p,'unique'))c[2]=Math.ceil(c[2]*0.75);return c;}
function nextSpawn(s,p){const b=WORLD.bases[p];for(let r=1;r<=5;r++)for(let z=b.z-r;z<=b.z+r;z++)for(let x=b.x-r;x<=b.x+r;x++){const v={x,z};if(distance(v,b)<1.8||distance(v,b)>r+.2||getTile(s,x,z)?.type==='water'||!getTile(s,x,z))continue;if(!s.units.some(u=>alive(u)&&distance(u,v)<.65)&&!s.buildings.some(q=>distance(q,v)<.8))return v;}throw new Error('Освободите место у замка для новых отрядов');}
export function moveRange(s,u){return TROOPS[u.kind].speed*(u.owner===1?1.06:1)*(1+mod(s.players[u.owner]??{gifts:[]},'speed'));}
const terrainCost=t=>t?.type==='water'?Infinity:t?.type==='forest'?1.5:t?.type==='rock'?1.8:t?.type==='road'?0.8:1;
export function pathTo(s,u,target){
 const start={x:Math.round(u.x),z:Math.round(u.z)},end={x:Math.round(target.x),z:Math.round(target.z)};
 if(end.x<0||end.z<0||end.x>=WORLD.width||end.z>=WORLD.height||terrainCost(getTile(s,end.x,end.z))===Infinity)return null;
 const key=v=>v.x+','+v.z,open=[{...start,g:0,f:distance(start,end)}],best=new Map([[key(start),0]]),from=new Map();
 while(open.length){open.sort((a,b)=>a.f-b.f);const c=open.shift();if(c.x===end.x&&c.z===end.z){let k=key(c),path=[{x:c.x,z:c.z}];while(from.has(k)){const prev=from.get(k);path.unshift(prev);k=key(prev);}return{path,cost:c.g};}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const n={x:c.x+dx,z:c.z+dz};const t=getTile(s,n.x,n.z);if(!t||n.x<0||n.z<0||n.x>=WORLD.width||n.z>=WORLD.height)continue;if(dx&&dz&&(terrainCost(getTile(s,c.x+dx,c.z))===Infinity||terrainCost(getTile(s,c.x,c.z+dz))===Infinity))continue;
   if(s.buildings.some(b=>Math.round(b.x)===n.x&&Math.round(b.z)===n.z))continue;
   if(s.units.some(a=>a.id!==u.id&&alive(a)&&a.owner!==u.owner&&distance(a,n)<0.65))continue;
   const g=c.g+terrainCost(t)*Math.hypot(dx,dz);if(g<(best.get(key(n))??Infinity)){best.set(key(n),g);from.set(key(n),{x:c.x,z:c.z});open.push({...n,g,f:g+distance(n,end)});}
  }
 }
 return null;
}
export function reachableStep(s,u,target){const full=pathTo(s,u,target);if(!full)return null;let cost=0,step=full.path[0],path=[step];for(let i=1;i<full.path.length;i++){const next=full.path[i],last=full.path[i-1];const part=terrainCost(getTile(s,next.x,next.z))*distance(last,next);if(cost+part>moveRange(s,u)+0.01)break;cost+=part;step=next;path.push(step);}return{...step,cost,path,complete:distance(step,target)<0.8};}
function rolesBonus(kind,enemies){const targets={guard:'horse',sword:'guard',bow:'sword',horse:'bow',drum:'guard',hero:'sword'};const total=enemies.reduce((n,u)=>n+count(u),0)||1;return 1+0.12*enemies.filter(u=>u.kind===targets[kind]).reduce((n,u)=>n+count(u),0)/total;}
function power(s,units,enemies,defending=false){return units.reduce((n,u)=>{const p=s.players[u.owner]??{gifts:[],upgrades:{}};let v=count(u)*TROOPS[u.kind].power*rolesBonus(u.kind,enemies)*(1+0.12*(p.upgrades[u.kind]??0)+mod(p,'attack'));
 if(units.some(d=>d.kind==='drum'&&d.id!==u.id&&distance(d,u)<=3))v*=1.12;
 if(defending&&(u.owner===0||units.some(h=>h.owner===0&&h.kind==='hero'&&distance(h,u)<=3.2)))v*=1.13;
 if(defending&&u.kind==='guard')v*=1.16;return n+v;},0);}
export function combatPreview(s,attacker,defender){const origin=attackApproach(s,attacker,defender)??attacker;const attackers=s.units.filter(u=>alive(u)&&!TROOPS[u.kind].noncombat&&u.owner===attacker.owner&&u.ready<=s.round&&(u.id===attacker.id||distance(u,origin)<=WORLD.support)).map(u=>u.id===attacker.id?{...u,x:origin.x,z:origin.z}:u);const defenders=s.units.filter(u=>alive(u)&&u.owner===defender.owner&&u.ready<=s.round&&(u.id===defender.id||!TROOPS[u.kind].noncombat&&distance(u,defender)<=WORLD.support));const a=power(s,attackers,defenders),d=power(s,defenders,attackers,true)*1.04;const win=a>d;const fraction=win?Math.min(0.75,0.22+0.35*d/Math.max(a,1)):Math.min(0.85,0.55+0.2*d/Math.max(a,1));return{attackers,defenders,a,d,win,losses:Math.max(1,Math.round(attackers.reduce((n,u)=>n+count(u),0)*fraction)),ratio:a/Math.max(d,1)};}
export function attackApproach(s,u,target){if(TROOPS[u.kind].noncombat)return null;const reach=TROOPS[u.kind].range;if(distance(u,target)<=reach+0.05)return{x:u.x,z:u.z,path:[],cost:0};let options=[];for(let z=Math.floor(target.z-reach);z<=target.z+reach;z++)for(let x=Math.floor(target.x-reach);x<=target.x+reach;x++){const p={x,z};if(distance(p,target)>reach||distance(p,target)<0.6)continue;const path=pathTo(s,u,p);if(path&&path.cost<=moveRange(s,u)+0.01)options.push({...p,...path});}options.sort((a,b)=>a.cost-b.cost);return options[0]??null;}
function retreat(s,u,enemy){let candidates=[];for(let z=0;z<WORLD.height;z++)for(let x=0;x<WORLD.width;x++){const t=getTile(s,x,z);if(terrainCost(t)===Infinity||distance({x,z},u)>4.2||distance({x,z},enemy)<2.4)continue;if(s.units.some(v=>v.id!==u.id&&alive(v)&&distance(v,{x,z})<0.7))continue;if(s.buildings.some(b=>distance(b,{x,z})<0.7))continue;const base=u.owner===2?{x:WORLD.center.x,z:WORLD.center.z-7}:WORLD.bases[u.owner];candidates.push({x,z,score:distance({x,z},base)-distance({x,z},enemy)*0.4});}candidates.sort((a,b)=>a.score-b.score);if(candidates[0]){u.x=candidates[0].x;u.z=candidates[0].z;}else u.hp=0;}
function combat(s,u,target){const approach=attackApproach(s,u,target);assert(approach,'Цель недостижима за один приказ');u.x=approach.x;u.z=approach.z;const targetPos={x:target.x,z:target.z};const c=combatPreview(s,u,target);const references=units=>units.map(v=>s.units.find(real=>real.id===v.id));const winners=references(c.win?c.attackers:c.defenders),losers=references(c.win?c.defenders:c.attackers);const wp=c.win?c.a:c.d,lp=c.win?c.d:c.a;for(const v of winners)v.hp=Math.max(1,Math.floor(v.hp*(1-Math.min(.65,.18+.32*lp/Math.max(wp,1)))));for(const v of losers){const before=count(v);v.hp=Math.floor(v.hp*.27);if(v.hp<TROOPS[v.kind].hp*.6)v.hp=0;if(alive(v))retreat(s,v,c.win?u:target);if(v.kind==='worker'&&v.owner<2)s.players[v.owner].workers-=before-count(v);}u.attacked=s.round;log(s,`${unitName(u)}: ${c.win?'успешная атака':'атака отражена'} · ${c.losses} потерь`,u.owner,'battle');s.lastBattle={round:s.round,serial:s.serial,win:c.win,a:c.a,d:c.d,losses:c.losses,attacker:u.owner,...targetPos};if(approach.path?.length>1)s.lastMove={id:u.id,path:approach.path,round:s.round,serial:s.serial};s.units=s.units.filter(alive);}
function capture(s){for(const m of s.sources){const forces=s.units.filter(u=>alive(u)&&u.owner<2&&distance(u,m)<0.8);if(forces.length&&forces.every(u=>u.owner===forces[0].owner)){const owner=forces[0].owner;if(m.owner!==owner&&!s.units.some(u=>alive(u)&&u.owner!==owner&&distance(u,m)<1.1)){m.owner=owner;m.workers=[];log(s,'Взят под контроль источник '+({gold:'золота',wood:'дерева',stone:'камня'}[m.resource]),owner);}}}
 const occupant=s.units.find(u=>alive(u)&&u.owner<2&&!TROOPS[u.kind].noncombat&&distance(u,WORLD.center)<0.8);const owner=occupant?.owner??null;if(s.point.owner!==owner){s.point={owner,captured:s.round,progress:0};if(owner!==null)log(s,FACTIONS[owner].name+' захватила ключевую точку',null,'point');}}
function finishRound(s){
 for(let p=0;p<2;p++){const pl=s.players[p];let earned={gold:0,wood:0,stone:0};for(const m of s.sources.filter(m=>m.owner===p)){const n=m.workers.filter(r=>r<s.round).length;const base={gold:10,wood:8,stone:6}[m.resource];earned[m.resource]+=n*(base+mod(pl,m.resource)+(p===1&&m.resource==='wood'&&readyBuilding(s,p,'unique')?2:0));}earned.gold+=mod(pl,'flatGold');for(const k of ['gold','wood','stone'])pl.res[k]+=earned[k];log(s,`Доход: +${earned.gold} золота · +${earned.wood} дерева · +${earned.stone} камня`,p,'income');}
 if(s.point.owner!==null&&s.point.captured<s.round){s.point.progress++;if(s.point.progress>=WORLD.hold){s.winner=s.point.owner;s.phase='finished';log(s,FACTIONS[s.winner].name+' удержала Пограничье',null,'victory');return;}}
 s.round++;s.initiative=1-s.initiative;s.turn=s.initiative;
 for(let p=0;p<2;p++){const pl=s.players[p];pl.ap=4+pl.level;pl.passed=false;for(const u of pl.pending.filter(u=>u.ready<=s.round)){if(u.kind==='worker')pl.workers++;else createUnit(s,p,u.kind,nextSpawn(s,p),s.round);}pl.pending=pl.pending.filter(u=>u.ready>s.round);reveal(s,p);}
 log(s,'Начался раунд '+s.round);
}
function advance(s){const p=s.turn,q=1-p;if(s.players[0].passed&&s.players[1].passed){finishRound(s);return;}s.turn=s.players[q].passed?p:q;}
export function availableGifts(s,p){const pl=s.players[p];const index=FAITH_LEVELS.findIndex((level,i)=>pl.faith>=level&&!pl.giftLevels?.includes(i));if(index<0)return null;const ids=s.giftPairs[index]?.filter(id=>!s.taken[index].includes(id))??[];return ids.length?{index,ids}:null;}
export function reduceAction(state,p,a){const s=clone(state);assert(p===0||p===1,'Неизвестный игрок');const pl=s.players[p];assert(s.phase!=='finished','Партия завершена');
 if(a.type==='setup'){assert(s.phase==='setup'&&!pl.ready,'Поселение уже подготовлено');pl.ready=true;log(s,'Поселение готово: замок и шесть рабочих',p);if(s.players.every(x=>x.ready)){s.phase='playing';s.turn=0;log(s,'Исследуйте окрестности, наладьте добычу и постройте первые казармы');for(let i=0;i<2;i++)reveal(s,i);}return s;}
 assert(s.phase==='playing','Сначала подготовьте поселение');assert(s.turn===p&&!pl.passed,'Сейчас действует соперник');
 if(a.type==='gift'){const choice=availableGifts(s,p);assert(choice&&choice.ids.includes(a.id),'Дар недоступен');pl.gifts.push(a.id);pl.giftLevels??=[];pl.giftLevels.push(choice.index);s.taken[choice.index].push(a.id);log(s,'Получен дар: '+gift(a.id).name,p,'faith');if(!availableGifts(s,p))advance(s);return s;}
 assert(!availableGifts(s,p),'Сначала выберите дар веры');
 if(a.type==='pass'){pl.passed=true;log(s,'Участие в раунде завершено',p);advance(s);return s;}
 assert(pl.ap>0,'Запас действий закончился');
 switch(a.type){
  case 'move':{const u=s.units.find(u=>u.id===a.id&&u.owner===p);assert(u&&u.ready<=s.round,'Отряд недоступен');assert(Number.isFinite(a.x)&&Number.isFinite(a.z),'Укажите место');const step=reachableStep(s,u,{x:a.x,z:a.z});assert(step&&distance(step,u)>0.4,'Нет доступного пути');assert(!s.units.some(v=>v.id!==u.id&&alive(v)&&distance(v,step)<0.65),'Место занято');u.x=step.x;u.z=step.z;log(s,unitName(u)+' сменили позицию',p);s.lastMove={id:u.id,path:step.path,round:s.round,serial:s.serial};break;}
  case 'attack':{const u=s.units.find(u=>u.id===a.id&&u.owner===p),t=s.units.find(u=>u.id===a.target&&u.owner!==p);assert(u&&t,'Отряд или цель недоступны');assert(!TROOPS[u.kind].noncombat,'Рабочие не могут атаковать');assert(u.attacked!==s.round,'Отряд уже атаковал в этом раунде');assert(visible(s,p,t),'Противник вне видимости');combat(s,u,t);break;}
  case 'build':{const b=BUILDINGS[a.kind];assert(b&&pl.level>=b.tier,'Здание откроется на следующем уровне замка');const pos={x:Math.round(a.x),z:Math.round(a.z)},t=getTile(s,pos.x,pos.z);assert(t&&b.terrain.includes(t.type),'Здание не подходит для этого участка');assert(distance(pos,WORLD.bases[p])<=3.6,'Стройте в границах своего владения');assert(!s.buildings.some(v=>distance(v,pos)<0.9)&&!s.sources.some(v=>distance(v,pos)<0.9)&&!s.units.some(v=>alive(v)&&distance(v,pos)<0.65),'Участок занят');assert(a.kind==='house'||!s.buildings.some(v=>v.owner===p&&v.kind===a.kind),'Такое здание уже есть');pay(s,p,buildingCost(s,p,a.kind));s.buildings.push({id:'b'+(++s.serial),owner:p,kind:a.kind,...pos,ready:s.round+1});log(s,'Начато строительство: '+(a.kind==='unique'?FACTIONS[p].unique:b.name),p);break;}
  case 'castle':{assert(pl.level<3,'Замок достиг высшего уровня');pay(s,p,[55*pl.level,25*pl.level,25*pl.level]);pl.level++;log(s,'Замок улучшен до уровня '+pl.level,p);break;}
  case 'hire':{const t=TROOPS[a.kind];assert(t&&!t.noncombat&&pl.level>=t.tier,'Недостаточный уровень замка');assert(t.building==='castle'||readyBuilding(s,p,t.building),'Сначала постройте нужное военное здание');assert(a.kind!=='hero'||!s.units.some(u=>u.owner===p&&u.kind==='hero')&&!pl.pending.some(u=>u.kind==='hero'),'Персонаж уже в армии');assert(population(s,p)+t.size<=capacity(s,p),'Нужно больше жилья');pay(s,p,troopCost(s,p,a.kind));pl.pending.push({kind:a.kind,ready:s.round+1});log(s,'Нанят отряд: '+(a.kind==='hero'?FACTIONS[p].hero:t.name),p);break;}
  case 'expedition':{assert(freeWorkers(s,p)>0,'Нет свободных рабочих');createUnit(s,p,'worker',nextSpawn(s,p),s.round);log(s,'Рабочий отправлен исследовать окрестности',p);break;}
  case 'recall':{const u=s.units.find(u=>u.id===a.id&&u.owner===p&&u.kind==='worker');assert(u&&distance(u,WORLD.bases[p])<=5,'Верните рабочего к замку');s.units=s.units.filter(v=>v.id!==u.id);log(s,'Рабочий вернулся в поселение',p);break;}
  case 'worker':assert(population(s,p)<capacity(s,p),'Нужно больше жилья');pay(s,p,[12,0,0]);pl.pending.push({kind:'worker',ready:s.round+1});log(s,'Нанят новый рабочий',p);break;
  case 'assign':{const m=s.sources.find(x=>x.id===a.id);assert(m&&known(s,p,m),'Источник не исследован');assert(m.owner===p||m.owner===null,'Сначала захватите источник');assert(!s.units.some(u=>alive(u)&&u.owner!==p&&distance(u,m)<1.1),'Источник охраняется противником');if(a.delta>0){assert(freeWorkers(s,p)>0,'Нет свободных рабочих');assert(m.workers.length<m.slots,'Все рабочие места заняты');m.owner=p;m.workers.push(s.round);}else{assert(m.owner===p&&m.workers.length,'На источнике нет рабочих');m.workers.pop();}log(s,'Рабочие переназначены',p);break;}
  case 'faith':assert(readyBuilding(s,p,'temple'),'Нужно действующее святилище');assert(pl.faith<FAITH_LEVELS.at(-1),'Достигнут последний уровень веры');pay(s,p,[15,0,0]);pl.faith+=15;log(s,'Вложено 15 золота в веру',p,'faith');break;
  case 'upgrade':{assert(readyBuilding(s,p,'forge'),'Нужна действующая кузница');assert(TROOPS[a.kind]&&a.kind!=='hero','Выберите тип войск');assert((pl.upgrades[a.kind]??0)<2,'Этот тип полностью улучшен');pay(s,p,[30,12,8]);pl.upgrades[a.kind]=(pl.upgrades[a.kind]??0)+1;log(s,'Улучшен тип: '+TROOPS[a.kind].name,p);break;}
  default:throw new Error('Неизвестное действие');
 }
 pl.ap--;capture(s);for(let i=0;i<2;i++)reveal(s,i);if(!availableGifts(s,p))advance(s);return s;
}
export function aiAction(s,p){
 const pl=s.players[p];if(s.phase==='setup')return{type:'setup'};const g=availableGifts(s,p);if(g)return{type:'gift',id:g.ids.includes('glory')?'glory':g.ids[0]};if(pl.ap<=0)return{type:'pass'};
 const units=s.units.filter(u=>u.owner===p&&alive(u)&&!TROOPS[u.kind].noncombat);const enemies=s.units.filter(u=>u.owner!==p&&alive(u)&&visible(s,p,u));
 const valid=a=>{try{reduceAction(s,p,a);return true;}catch{return false;}};
 const attacks=[];for(const u of units)for(const e of enemies){const approach=attackApproach(s,u,e);if(u.attacked===s.round||!approach)continue;if(s.point.owner===p&&distance(u,WORLD.center)<.8&&distance(approach,WORLD.center)>.8)continue;const c=combatPreview(s,u,e);if(c.ratio>(s.point.owner===p?1.2:1.04))attacks.push({a:{type:'attack',id:u.id,target:e.id},score:c.ratio+(distance(e,WORLD.center)<2?1:0)});}attacks.sort((a,b)=>b.score-a.score);if(attacks[0])return attacks[0].a;
 const assign=s.sources.filter(m=>known(s,p,m)&&(m.owner===p||m.owner===null)&&m.workers.length<2).sort((a,b)=>distance(a,WORLD.bases[p])-distance(b,WORLD.bases[p]));if(freeWorkers(s,p)>0)for(const m of assign){const a={type:'assign',id:m.id,delta:1};if(valid(a))return a;}
 if(population(s,p)+4>capacity(s,p)&&!s.buildings.some(b=>b.owner===p&&b.kind==='house'&&b.ready>s.round)){const a=findBuild(s,p,'house');if(a&&valid(a))return a;}
 if(pl.level<2&&pl.res.gold>80&&pl.res.stone>32&&valid({type:'castle'}))return{type:'castle'};
 for(const kind of ['barracks','range','stable','temple','unique'])if(!s.buildings.some(b=>b.owner===p&&b.kind===kind)&&BUILDINGS[kind].tier<=pl.level&&pl.res.gold>BUILDINGS[kind].cost[0]+12){const a=findBuild(s,p,kind);if(a&&valid(a))return a;}
 if(units.length+pl.pending.filter(u=>u.kind!=='worker').length<5&&pl.res.gold>35){const types=['guard','bow','sword','horse'].sort((a,b)=>units.filter(u=>u.kind===a).length+pl.pending.filter(u=>u.kind===a).length-units.filter(u=>u.kind===b).length-pl.pending.filter(u=>u.kind===b).length);for(const kind of types){const a={type:'hire',kind};if(valid(a))return a;}}
 if(freeWorkers(s,p)<1&&pl.workers<8&&pl.res.gold>28&&valid({type:'worker'}))return{type:'worker'};
 const ordered=units.slice().sort((a,b)=>distance(a,WORLD.center)-distance(b,WORLD.center));for(const u of ordered){if(distance(u,WORLD.center)<.8)continue;
  const positions=[[0,0],[-1,0],[0,-1],[0,1],[1,0],[-1,-1],[1,1],[-2,0],[2,0]].map(([x,z])=>({x:WORLD.center.x+x,z:WORLD.center.z+z})).filter(t=>!s.units.some(v=>v.id!==u.id&&alive(v)&&distance(v,t)<.7));
  if(distance(u,WORLD.center)<2.4&&s.units.some(v=>alive(v)&&distance(v,WORLD.center)<.8))continue;
  for(const target of positions){if(distance(u,target)<.5)continue;const step=reachableStep(s,u,target);if(step&&distance(step,u)>.5){const a={type:'move',id:u.id,x:step.x,z:step.z};if(valid(a))return a;}}
 }
 if(readyBuilding(s,p,'temple')&&pl.res.gold>35&&valid({type:'faith'}))return{type:'faith'};return{type:'pass'};
}
export function findBuild(s,p,kind){const base=WORLD.bases[p],b=BUILDINGS[kind];for(let r=1;r<=3;r++)for(let z=base.z-r;z<=base.z+r;z++)for(let x=base.x-r;x<=base.x+r;x++){const t=getTile(s,x,z);if(t&&b.terrain.includes(t.type)&&distance({x,z},base)<=3.6&&!s.buildings.some(q=>distance(q,{x,z})<.9)&&!s.sources.some(q=>distance(q,{x,z})<.9)&&!s.units.some(u=>alive(u)&&distance(u,{x,z})<.65))return{type:'build',kind,x,z};}return null;}
