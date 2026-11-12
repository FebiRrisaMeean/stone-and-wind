import {loadSourceCard,loadCardFonts,preloadCardAssets,sourceCardComponent} from './source-card-components.js';
import {SOURCE_CARD_IDS} from './source-card-map.js';

const ready=new Map(),pending=new Map();
let stylesheet;
function fontsReady(){
 if(!stylesheet)stylesheet=new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./assets/cards64/fonts/fonts.css',import.meta.url).href;
  link.onload=resolve;link.onerror=()=>reject(new Error('Не удалось загрузить шрифты карт'));document.head.appendChild(link);
 });
 return stylesheet;
}
export function prepareGameCard(name){
 if(!pending.has(name))pending.set(name,(async()=>{
  const id=SOURCE_CARD_IDS[name];if(!id)throw new Error('Нет исходной карты: '+name);
  const card=await loadSourceCard(id);await fontsReady();
  await Promise.all([loadCardFonts(card),preloadCardAssets(card,{reference:false})]);
  ready.set(name,card);return card;
 })().catch(error=>{pending.delete(name);throw error;}));
 return pending.get(name);
}
export function gameCardReady(name){return ready.has(name);}
export function gameCardFace(name){
 const card=ready.get(name);
 return card?sourceCardComponent(card,{width:320}):`<div class="source-card-back" aria-label="Загрузка карты" style="background-image:url('${new URL('./assets/board-card-back.webp',import.meta.url).href}')"></div>`;
}
