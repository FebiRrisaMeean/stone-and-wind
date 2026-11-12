import {renderIcon} from './original-icons.js';
import {cardArt} from './everdell/art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={GOVERNANCE:'governance',PRODUCTION:'production',TRAVELER:'traveler',DESTINATION:'destination',PROSPERITY:'prosperity'};
const resources={TWIG:'twig',RESIN:'resin',PEBBLE:'pebble',BERRY:'berry'};
export function costComponent(cost={},free=false){
 const entries=Object.entries(cost).filter(([key,n])=>resources[key]&&n>0);
 return `<div class="ev-cost" aria-label="Стоимость">${entries.length?entries.map(([key,n])=>`<span class="ev-cost-plank"><b>${esc(n)}</b>${renderIcon(resources[key],{size:27})}</span>`).join(''):free?'<span class="ev-cost-plank"><b>0</b></span>':''}</div>`;
}
export function categoryComponent(type,copies){return `<div class="ev-category" aria-label="Тип и количество карт в колоде">${renderIcon(categories[type]??'production',{size:45})}<span class="ev-copies" aria-label="${copies} экземпляра">${Array.from({length:Math.min(5,copies)},()=>'<i></i>').join('')}</span></div>`;}
export function pointsComponent(points){return `<div class="ev-points" aria-label="${points} победных очков">${renderIcon('point',{size:61,label:''})}<b>${esc(points)}</b></div>`;}
export function titleComponent(title,type){return `<div class="ev-title ev-${categories[type]??'production'}"><h2>${esc(title)}</h2></div>`;}
export function rulesComponent(text,{type,critter,unique,association,dense=false,flavor}={}){return `<div class="ev-paper ${dense?'ev-dense':''} ${flavor?'ev-with-flavor':''}"><div class="ev-type">${unique?'Уникальное':'Обычное'} ${critter?'существо':'сооружение'}</div><div class="ev-rules" data-rules>${text}</div>${flavor?`<div class="ev-flavor">${esc(flavor)}</div>`:''}${!critter&&association?`<div class="ev-association"><span>${esc(association)}</span><span class="ev-door" aria-label="Свободная дверь"></span></div>`:''}</div>`;}
export function cardComponent(card,{width=286,guides=false}={}){
 const scale=Math.min(400,Math.max(180,width))/286;
 const text=card.rulesHTML??esc(card.text);
 return `<article class="ev-card ${card.critter?'ev-critter':'ev-construction'} ${card.dense?'ev-long-text':''} ${guides?'ev-guides':''}" aria-label="${esc(card.title)}" style="width:${286*scale}px;height:${399*scale}px;--card-scale:${scale}"><div class="ev-face">
  <div class="ev-illustration">${cardArt(card.name)}</div>
  <svg class="ev-branches" viewBox="0 0 286 399" aria-hidden="true"><defs><linearGradient id="bark" x1="0" x2="1"><stop stop-color="#251813"/><stop offset=".4" stop-color="#6b4128"/><stop offset=".7" stop-color="#3b241b"/><stop offset="1" stop-color="#8d5a32"/></linearGradient></defs><path d="M22 0c-7 25 5 47-6 72s9 43 5 70-11 52-5 75 3 37-6 55l12 16 6-22 11-3 20-1 15-11 18 3 10-10-17-7 9-10-19 0-12-12-17 13-15-1c-7-21 3-28 6-44s-5-26 1-43 6-29 0-47 2-29 2-43L43 0Z" fill="url(#bark)" stroke="#291d16" stroke-width="2"/><path d="M26 7c-5 28 3 44-4 66s11 45 7 71-10 51-4 70 5 33-5 49m14-15 16-8 24 4m-45-22 19-8 17-13" fill="none" stroke="#a16d41" stroke-width="2" opacity=".65"/><path d="M35 24q35 2 37-14M34 75q26-2 30 11M31 159q20 1 20-21M29 199q19 3 28-13" fill="none" stroke="#382519" stroke-width="5" stroke-linecap="round"/></svg>
  ${card.critter?`<div class="ev-free-building">${esc(card.association??'')}</div>`:''}
  <div class="ev-cost-position">${costComponent(card.cost,true)}</div>
  ${rulesComponent(text,card)}
  ${titleComponent(card.title,card.type)}
  ${categoryComponent(card.type,card.copies)}
  ${pointsComponent(card.points)}
 </div></article>`;
}
