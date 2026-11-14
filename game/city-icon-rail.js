import {SOURCE_CARD_IDS} from './source-card-map.js';
import {renderIcon} from './original-icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// One button per played instance, including residents sharing a city space
export function cityRailEntries(objects,owner){return objects.filter(o=>o.type==='city-card'&&o.owner===owner).map(o=>({id:o.id,name:o.cardName,label:o.label,critter:o.critter,worker:o.workerDestination,available:o.workerInfo?.available,occupied:o.workerInfo?.workers?.length??0,capacity:o.workerInfo?.capacity??0,resources:o.played?.resources??{},pairId:o.played?.pairId??null,ariaLabel:o.ariaLabel??o.label}));}
export function cityRailMarkup(objects,owner,humanOwner){
 const entries=cityRailEntries(objects,owner);
 const tabs=`<div class="city-rail-tabs" role="group" aria-label="Показать карты города"><button type="button" data-city-rail-owner="${humanOwner}" aria-pressed="${owner===humanOwner}">Вы</button><button type="button" data-city-rail-owner="${1-humanOwner}" aria-pressed="${owner!==humanOwner}">Соперник</button></div>`;
 return tabs+`<div class="city-rail-list" aria-label="${owner===humanOwner?'Карты вашего города':'Карты города соперника'}">${entries.length?entries.map(entry=>{
  const id=SOURCE_CARD_IDS[entry.name],image=id?new URL(`./assets/cards64/illustrations/${id}.webp`,import.meta.url).href:null;
  const stored=Object.keys(entry.resources).filter(key=>entry.resources[key]>0),saved=stored.length>0;
  const storedIcon=stored.length===1?stored[0].toLowerCase():'resource';
  return `<button type="button" class="city-rail-card${entry.worker?' is-destination':''}${entry.available?' is-available':''}" data-city-card-id="${esc(entry.id)}"${owner===humanOwner&&!entry.critter?' title="Переместить: правый клик или Shift+Enter" aria-keyshortcuts="Shift+Enter"':''} aria-label="${esc(entry.ariaLabel)}${saved?' — есть запас на карте':''}"${entry.pairId?' data-paired="true"':''}><span class="city-rail-portrait"${image?` style="background-image:url('${image}')"`:''} aria-hidden="true"></span><span class="city-rail-name">${esc(entry.label)}</span>${entry.worker?`<span class="city-rail-worker" aria-hidden="true">${renderIcon('worker',{size:15,label:''})}<b>${entry.occupied}/${entry.capacity}</b></span>`:saved?`<span class="city-rail-stored" aria-hidden="true">${renderIcon(storedIcon,{size:16,label:''})}</span>`:''}</button>`;
 }).join(''):'<span class="city-rail-empty">Город пока пуст</span>'}</div>`;
}
export function bindCityRail(element,{onHover,onLeave,onPick,onOwner,onReposition}){
 const card=target=>target?.closest?.('[data-city-card-id]');
 const show=button=>{if(button)onHover(button.dataset.cityCardId,button.getBoundingClientRect());};
 const over=e=>{const button=card(e.target);if(button&&!button.contains(e.relatedTarget))show(button);};
 const out=e=>{const button=card(e.target);if(button&&!button.contains(e.relatedTarget))onLeave();};
 const focus=e=>show(card(e.target)),blur=()=>onLeave();
 const click=e=>{const owner=e.target.closest('[data-city-rail-owner]');if(owner){onLeave();onOwner(Number(owner.dataset.cityRailOwner));return;}const button=card(e.target);if(button)onPick(button.dataset.cityCardId,button.getBoundingClientRect());};
 const context=e=>{const button=card(e.target);if(button&&onReposition){e.preventDefault();onLeave();onReposition(button.dataset.cityCardId);}};
 const key=e=>{const button=card(e.target);if(button&&e.shiftKey&&e.key==='Enter'&&onReposition){e.preventDefault();onLeave();onReposition(button.dataset.cityCardId);}};
 const scroll=()=>onLeave();
 element.addEventListener('pointerover',over);element.addEventListener('pointermove',over);element.addEventListener('pointerout',out);element.addEventListener('focusin',focus);element.addEventListener('focusout',blur);element.addEventListener('click',click);element.addEventListener('scroll',scroll,true);element.addEventListener('contextmenu',context);element.addEventListener('keydown',key);
 return()=>{element.removeEventListener('pointerover',over);element.removeEventListener('pointermove',over);element.removeEventListener('pointerout',out);element.removeEventListener('focusin',focus);element.removeEventListener('focusout',blur);element.removeEventListener('click',click);element.removeEventListener('scroll',scroll,true);element.removeEventListener('contextmenu',context);element.removeEventListener('keydown',key);};
}
