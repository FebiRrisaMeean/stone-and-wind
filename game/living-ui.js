import {renderIcon} from './original-icons.js';
const resourceIcon=key=>renderIcon(String(key).toLowerCase(),{size:24});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={TWIG:'Ветки',RESIN:'Смола',PEBBLE:'Камушки',BERRY:'Ягоды',VP:'Очки',CARD:'Карты'};
export const lockIcon='<svg class="lock-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="4" y="10" width="16" height="12" rx="3" fill="currentColor"/><path d="M12 14v4" stroke="#f8edcf" stroke-width="2.3" stroke-linecap="round"/></svg>';
export const workerIcon='<svg class="worker-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="4" fill="currentColor"/><path d="M5 22v-7a7 7 0 0 1 14 0v7z" fill="currentColor"/></svg>';
const amount=(n,r)=>`<span class="zone-value">${resourceIcon(r)}<b>${n}</b></span>`;
const plus='<i class="zone-operator">+</i>',arrow='<i class="zone-operator">→</i>';
const basic={ONE_BERRY:[['BERRY',1]],ONE_BERRY_AND_ONE_CARD:[['BERRY',1],['CARD',1]],ONE_RESIN_AND_ONE_CARD:[['RESIN',1],['CARD',1]],ONE_STONE:[['PEBBLE',1]],THREE_TWIGS:[['TWIG',3]],TWO_CARDS_AND_ONE_VP:[['CARD',2],['VP',1]],TWO_RESIN:[['RESIN',2]],TWO_TWIGS_AND_ONE_CARD:[['TWIG',2],['CARD',1]],TWO_BERRY_ONE_CARD:[['BERRY',2],['CARD',1]],TWO_WILD:[['ANY',2]],ONE_PEBBLE_THREE_CARD:[['PEBBLE',1],['CARD',3]],ONE_TWIG_RESIN_BERRY:[['TWIG',1],['RESIN',1],['BERRY',1]],THREE_BERRY:[['BERRY',3]],TWO_RESIN_ONE_TWIG:[['RESIN',2],['TWIG',1]],TWO_CARDS_ONE_WILD:[['CARD',2],['ANY',1]]};
export function zoneRecipe(name,gains={}){
 if(basic[name])return basic[name].map(([r,n])=>amount(n,r)).join('');
 if(name==='HAVEN')return amount(2,'CARD')+arrow+amount(1,'ANY');
 if(name.includes('JOURNEY')){const n={JOURNEY_TWO:2,JOURNEY_THREE:3,JOURNEY_FOUR:4,JOURNEY_FIVE:5}[name];return amount(n,'CARD')+arrow+amount(n,'VP');}
 if(name==='DISCARD_ANY_THEN_DRAW_TWO_PER_CARD')return amount('n','CARD')+arrow+amount('2n','CARD');
 if(name==='DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD')return `<span class="zone-math-limit">n≤3</span>`+amount('n','CARD')+arrow+amount('n','ANY');
 if(name==='COPY_BASIC_ONE_CARD')return '<span class="zone-copy" aria-hidden="true">▦↻</span>'+plus+amount(1,'CARD');
 if(name==='DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS')return `<span class="zone-discount-steps"><span>${amount(2,'CARD')}<span>Возьмите 2 карты с поляны</span></span><span>${amount(1,'CARD')}<span>Разыграйте 1 из них</span></span><span class="zone-discount">${resourceIcon('ANY')}<span>Скидка: 1 любой ресурс</span></span></span>`;
 return Object.entries(gains).filter(([,n])=>n>0).map(([r,n])=>amount(n,r)).join('');
}
export function zoneBadge(location){return location.locked?`<span class="zone-lock" aria-hidden="true">${lockIcon}</span>`:'';}
export function zoneCapacity(location){
 if(location.capacity===null)return '';
 const occupied=location.workers?.length??0,total=location.capacity;
 return `<div class="zone-capacity" aria-label="Занято мест: ${occupied} из ${total}">${resourceIcon('worker')}<b>${occupied} / ${total}</b><span>занято</span></div>`;
}
export function zoneDetail(location){return `<div class="production-tooltip"><h2>${esc(location.name)}</h2><div class="zone-reward">${zoneRecipe(location.actualName,location.rewardIcons)}</div>${zoneCapacity(location)}${location.locked?`<p class="zone-unavailable">${lockIcon}${esc(location.reason)}</p>`:''}</div>`;}
const countWord=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
export function playerSpaceStatus(player){
 const workers=player.numAvailableWorkers,total=player.maxCitySize,occupied=player.getNumOccupiedSpacesInCity(),free=Math.max(0,total-occupied);
 const slots='<svg class="city-slot-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
 return `<div class="supply-spaces"><span title="Свободные рабочие: ${workers}" aria-label="Свободные рабочие: ${workers}">${resourceIcon('worker')}<strong>${workers}</strong><span>${countWord(workers,'рабочий','рабочих','рабочих')} в запасе</span></span><span title="Свободные ячейки города: ${free} из ${total}; занято ${occupied}. Пары и исключения учтены" aria-label="Свободные ячейки города: ${free} из ${total}">${slots}<strong>${free}</strong><span>${countWord(free,'свободная ячейка','свободные ячейки','свободных ячеек')}</span></span></div>`;
}
export function storedResources(resources={}){
 const values=['TWIG','RESIN','PEBBLE','BERRY','VP'].filter(r=>resources[r]>0);
 if(!values.length)return '';
 return `<span class="stored-resources" role="group" aria-label="Запас на карте: ${esc(values.map(r=>`${names[r]}: ${resources[r]}`).join(', '))}">${values.map(r=>`<span class="stored-resource">${resourceIcon(r)}<b>${resources[r]}</b></span>`).join('')}</span>`;
}
export function cityWorkerMarker({name,available,occupied,capacity}){
 return `<span class="city-worker-marker${available?' is-available':''}" aria-hidden="true">${resourceIcon('worker')}</span><span class="city-worker-name">${esc(name)}</span><span class="sr-only">Место рабочего, ${occupied} / ${capacity} занято</span>`;
}
export function cityWorkerDetail({capacity,workers,available,reason,open}){
 return `<div class="city-worker-detail">${zoneCapacity({capacity,workers})}<p>${esc(available?'Нажмите на иконку или здание, чтобы разместить рабочего':reason)}</p>${open?'<small>Открыто для обоих игроков · владелец получает 1 очко за гостя</small>':''}</div>`;
}
export function supplyStatus(player,forecast,active=false){const r={...player.getResources(),CARD:player.numCardsInHand},f=forecast?.resources??{},conditional=forecast?.conditional??[];return `<div class="supply-totals${active?' current':''}">${['TWIG','RESIN','PEBBLE','BERRY','VP','CARD'].map(key=>`<div class="supply-total" title="${names[key]}: ${r[key]??0}${forecast?', следующий сезон: +'+(f[key]??0):''}" aria-label="${names[key]}: ${r[key]??0}${forecast?', прирост в следующем сезоне '+(f[key]??0):''}">${resourceIcon(key)}<strong>${r[key]??0}</strong><small>${forecast?'+'+(f[key]??0):'—'}</small></div>`).join('')}${conditional.length?`<span class="supply-conditional" title="Дополнительный прирост зависит от выбора эффектов" aria-label="Дополнительный прирост зависит от выбора эффектов">+?</span>`:''}</div>${active?playerSpaceStatus(player):''}`;}
export const SPECIES=[{id:1,name:'Белочки',card:'Shopkeeper'},{id:3,name:'Зайцы',card:'Wanderer'},{id:0,name:'Мыши',card:'Husband'},{id:2,name:'Ежи',card:'Peddler'},{id:4,name:'Кроты',card:'Miner Mole'},{id:5,name:'Бобры',card:'Woodcarver'}];
