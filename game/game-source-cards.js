import {loadSourceCard,loadCardFonts,preloadCardAssets,sourceCardComponent} from './source-card-components.js?v=22';
import {SOURCE_CARD_IDS} from './source-card-map.js';

const ready=new Map(),pending=new Map();
// Bound the initial hand + meadow fan-out and retry temporary network/decode failures
let active=0;const queue=[];
function schedule(task){return new Promise((resolve,reject)=>{queue.push({task,resolve,reject});pump();});}
function pump(){while(active<3&&queue.length){const job=queue.shift();active++;job.task().then(job.resolve,job.reject).finally(()=>{active--;pump();});}}
async function retry(task){for(let attempt=0;;attempt++){try{return await task();}catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,350*2**attempt));}}}
let fontDefinitions, fontSerial=Promise.resolve();
const fontFaces=new Map();
async function fontsReady(){
 if(!fontDefinitions)fontDefinitions=fetch(new URL('./assets/cards64/fonts/fonts.css',import.meta.url)).then(async response=>{
  if(!response.ok)throw new Error('Не удалось загрузить описание шрифтов карт');
  const css=await response.text();return [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([,rule])=>{
   const get=key=>rule.match(new RegExp(key+':\\s*([^;]+)'))?.[1].trim();
   return {family:get('font-family').replaceAll('"',''),source:get('src').replace(/url\("([^"\)]+)"\)/,(_,path)=>'url("'+new URL(path,new URL('./assets/cards64/fonts/fonts.css',import.meta.url)).href+'")'),weight:get('font-weight'),unicodeRange:get('unicode-range')};
  });
 }).catch(error=>{fontDefinitions=undefined;throw error});
 const definitions=await fontDefinitions;
 definitions.forEach((d,i)=>{let face=fontFaces.get(i);if(face?.status==='error'){document.fonts.delete(face);face=null}if(!face){face=new FontFace(d.family,d.source,{weight:d.weight,unicodeRange:d.unicodeRange,display:'block'});fontFaces.set(i,face);document.fonts.add(face)}});
}
function prepareFonts(card){const job=fontSerial.catch(()=>{}).then(async()=>{await fontsReady();await loadCardFonts(card)});fontSerial=job;return job;}
export function prepareGameCard(name){
 if(!pending.has(name))pending.set(name,schedule(()=>retry(async()=>{
  const id=SOURCE_CARD_IDS[name];if(!id)throw new Error('Нет исходной карты: '+name);
  const card=await loadSourceCard(id);
  await Promise.all([prepareFonts(card),preloadCardAssets(card,{reference:false})]);
  ready.set(name,card);return card;
 })).catch(error=>{pending.delete(name);throw error;}));
 return pending.get(name);
}
export function gameCardReady(name){return ready.has(name);}
export function gameCardFace(name){
 const card=ready.get(name);
 return card?sourceCardComponent(card,{width:320}):`<div class="source-card-back" aria-label="Загрузка карты" style="background-image:url('${new URL('./assets/board-card-back.webp',import.meta.url).href}')"></div>`;
}
