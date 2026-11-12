import {renderIcon,originalIconNames} from '../game/original-icons.js';
import {cardComponent,costComponent,categoryComponent,titleComponent,pointsComponent,rulesComponent} from '../game/card-components.js';
const icon=(name,size=16)=>renderIcon(name,{size});
const cards={
 court:{name:'Courthouse',title:'Суд',type:'GOVERNANCE',critter:false,unique:true,copies:2,points:2,cost:{TWIG:1,RESIN:1,PEBBLE:2},association:'Судья',rulesHTML:`Получайте либо 1${icon('twig')}, либо 1${icon('resin')},<br>либо 1${icon('pebble')} после того, как вы<br>сыграли сооружение`},
 judge:{name:'Judge',title:'Судья',type:'GOVERNANCE',critter:true,unique:true,copies:2,points:2,cost:{BERRY:3},association:'Суд',rulesHTML:`Разыгрывая существо или<br>сооружение, вы можете заменить<br>1${icon('any-resource')} на 1${icon('any-resource')} другого типа`},
 tower:{name:'Clock Tower',title:'Башня',type:'GOVERNANCE',critter:false,unique:true,copies:3,points:0,cost:{TWIG:3,PEBBLE:1},association:'Историк',dense:true,rulesHTML:`При розыгрыше положите сюда 3${icon('point',14)}<br>Перед новым сезоном можно потратить 1${icon('point',14)} и повторить основную или лесную локацию со своим работником<br>Оставшиеся очки считаются в конце игры`}
};
let selected='court',size=28;
const $=id=>document.getElementById(id);
const crops={cost:[12,18,65,100],category:[20,207,45,49],title:[67,227,172,30],points:[214,210,61,61],rules:[16,254,254,126]};
function referencePart(part){
 if(selected==='tower')return '<span class="no-part-reference">Нет отдельного скана</span>';
 const [x,y,w,h]=selected==='judge'&&part==='cost'?[12,124,65,34]:crops[part];
 return `<div class="reference-part" role="img" aria-label="Фрагмент оригинальной карты" style="width:${w}px;height:${h}px;background-image:url('../game/assets/card-components/${selected}-reference.png');background-position:-${x}px -${y}px"></div>`;
}
function render(){
 const card=cards[selected];$('candidate-card').innerHTML=cardComponent(card,{guides:$('guides').checked});
 $('source-card').innerHTML=selected==='tower'?'<div class="source-placeholder">Проверка длинного текста на том же шаблоне<br>Отдельного скана Башни в этих примерах правил нет</div>':`<img src="../game/assets/card-components/${selected}-reference.png" alt="Оригинальная карта ${card.title} из пользовательских правил">`;
 $('source-caption').textContent=selected==='tower'?'Тест вместимости текста':'Оригинальная карта из правил';
 const parts=[['cost','Стоимость',costComponent(card.cost,true)],['category','Категория',categoryComponent(card.type,card.copies)],['title','Название',titleComponent(card.title,card.type)],['points','Очки',pointsComponent(card.points)],['rules','Текст',rulesComponent(card.rulesHTML,card)]];
 $('parts').innerHTML=parts.map(([key,label,content])=>`<div class="part part-${key}"><h3>${label}</h3><div class="part-row"><span>Оригинал</span><div class="part-demo">${referencePart(key)}</div></div><div class="part-row"><span>Компонент</span><div class="part-demo">${content}</div></div></div>`).join('');
 document.querySelectorAll('[data-card]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.card===selected)));
}
function renderIcons(){
 const names={berry:'Ягода',twig:'Ветка',resin:'Смола',pebble:'Камушек',card:'Карта',point:'Очки','point-one':'Одно очко','any-resource':'Любой ресурс',worker:'Место работника',traveler:'Странствия',production:'Урожай',destination:'Локация',governance:'Управление',prosperity:'Процветание'};
 $('icons').innerHTML=originalIconNames.map(name=>`<div class="icon-cell"><div class="icon-pair"><span>${icon(name,size)}</span><span>${name==='worker'?`<i class="paw-backing">${icon(name,size)}</i>`:icon(name,size)}</span></div><p>${names[name]}</p></div>`).join('');
 document.querySelectorAll('[data-size]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.size)===size)));
}
document.querySelectorAll('[data-card]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.card;render()}));
document.querySelectorAll('[data-size]').forEach(button=>button.addEventListener('click',()=>{size=Number(button.dataset.size);renderIcons()}));
$('guides').addEventListener('change',render);
render();renderIcons();
