import {Card} from './everdell/engine.js?v=20261112-23';
import {renderIcon} from './original-icons.js';
export const RESOURCE_KEYS=['TWIG','RESIN','PEBBLE','BERRY'];
const NAMES={TWIG:'Ветки',RESIN:'Смола',PEBBLE:'Камушки',BERRY:'Ягоды'};
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const closeIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export const decisionResources=(resources,size=24)=>RESOURCE_KEYS.filter(k=>resources?.[k]>0).map(k=>`<span class="decision-resource">${renderIcon(k.toLowerCase(),{size})}<b>${resources[k]}</b></span>`).join('');
const amount=value=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
export function resourceChoiceModel(input,player,selected={}){
 const paying=input.inputType==='SELECT_PAYMENT_FOR_CARD',cost=paying?Card.fromName(input.card).baseCost:{},inventory=player.getResources();
 const discount=paying?(input.locationContext==='DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS'?1:['Inn','Hotel','Locomotive'].includes(input.cardContext)?3:0):0;
 const max=paying?Math.max(0,Object.values(cost).reduce((n,v)=>n+v,0)-discount):amount(input.maxResources);
 const min=paying?max:Math.min(max,amount(input.minResources));
 const keys=RESOURCE_KEYS.filter(k=>paying?(cost[k]??0)>0:(!input.specificResource||k===input.specificResource)&&k!==input.excludeResource);
 const values=Object.fromEntries(keys.map(k=>[k,amount(selected[k])])),total=Object.values(values).reduce((a,b)=>a+b,0);
 const rows=keys.map(key=>({key,name:NAMES[key],value:values[key],stock:inventory[key]??0,limit:Math.min(max,paying?Math.min(cost[key]??0,inventory[key]??0):input.toSpend?inventory[key]??0:max)}));
 const withinLimits=rows.every(r=>r.value<=r.limit)&&Object.keys(selected).every(k=>keys.includes(k)||!selected[k]);
 const valid=withinLimits&&total>=min&&total<=max&&(!paying||!player.validatePaidResources(values,cost,discount?`ANY ${discount}`:null));
 return{keys,rows,values,total,min,max,paying,cost,discount,valid};
}
export function changeResourceChoice(input,player,selected,key,delta){
 const model=resourceChoiceModel(input,player,selected),row=model.rows.find(r=>r.key===key);if(!row)return {...model.values};
 const direction=Math.sign(delta),value=direction>0?Math.min(row.limit,row.value+Math.max(0,model.max-model.total),row.value+1):Math.max(0,row.value-1);
 return{...model.values,[key]:value};
}
export function resourceChoiceMarkup(model){
 const target=model.min===model.max?`из ${model.max}`:`из ${model.max} · минимум ${model.min}`;
 return `${model.paying?`<div class="decision-cost"><span>Стоимость</span>${decisionResources(model.cost)}${model.discount?`<span class="decision-discount">−${model.discount}${renderIcon('any',{size:22})}</span>`:''}</div>`:''}<div class="resource-picker" style="--resource-columns:${Math.min(4,model.rows.length)}">${model.rows.map(r=>`<section class="resource-tile"><div class="resource-identity">${renderIcon(r.key.toLowerCase(),{size:36})}<h3>${r.name}</h3></div><span class="resource-stock">В запасе ${r.stock}</span><div class="resource-stepper"><button type="button" id="resource-minus-${r.key}" data-resource-step="${r.key}" data-delta="-1" aria-label="Уменьшить: ${r.name}" ${r.value<=0?'disabled':''}>−</button><output id="resource-count-${r.key}" tabindex="0" role="spinbutton" data-resource-counter="${r.key}" aria-label="${r.name}" aria-valuemin="0" aria-valuemax="${r.limit}" aria-valuenow="${r.value}">${r.value}</output><button type="button" id="resource-plus-${r.key}" data-resource-step="${r.key}" data-delta="1" aria-label="Добавить: ${r.name}" ${r.value>=r.limit||model.total>=model.max?'disabled':''}>+</button></div></section>`).join('')}</div><div class="decision-progress ${model.valid?'is-ready':''}" aria-live="polite"><span>Выбрано</span><strong>${model.total}</strong><span>${target}</span></div>`;
}
