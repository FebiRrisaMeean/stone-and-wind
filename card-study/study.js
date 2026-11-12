import {componentGroups,loadDeck,loadSourceCard,sourceReference,sourceCardComponent,loadCardFonts,preloadCardAssets} from '../game/source-card-components.js?v=21'
const $=id=>document.getElementById(id)
let deck,selected,width=344,part='title',filter='all',card,revision=0
const hidden=new Set()
const cropByPart={illustration:[0,0,171.97,135],frame:[0,0,171.97,241.344],cost:[0,0,65,120],category:[6,118,59,50],title:[38,132,124,35],points:[119,124,52,52],rules:[12,164,148,61],footer:[8,214,158,26]}
function showError(error){$('error').hidden=false;$('error').textContent='Не удалось загрузить карту: '+error.message;console.error(error)}
function displayCard(){
 const hiddenParts=componentGroups.filter(x=>hidden.has(x.id)).flatMap(x=>x.parts)
 $('candidate-card').innerHTML=sourceCardComponent(card,{width,hidden:hiddenParts,guides:$('guides').checked})+($('overlay').checked?`<img class="overlay-image" src="${sourceReference(card.id)}" alt="">`:'')
 for(const id of ['source-card','candidate-card'])$(id).style.width=width+'px'
 document.querySelectorAll('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.width)===width)))
}
function displayPart(){
 const crop=cropByPart[part],group=componentGroups.find(x=>x.id===part)
 const pixels=Math.min(344,crop[2]*2),scale=pixels/crop[2],height=crop[3]*scale
 $('part-source').innerHTML=`<div class="part-crop" style="width:${pixels}px;height:${height}px"><img src="${sourceReference(card.id)}" alt="${group.title} — оригинал" style="width:${card.width*scale}px;height:${card.height*scale}px;left:${-crop[0]*scale}px;top:${-crop[1]*scale}px"></div>`
 $('part-assembled').innerHTML=sourceCardComponent(card,{width:pixels,crop})
 $('part-isolated').innerHTML=sourceCardComponent(card,{width:pixels,crop,only:group.parts})
 document.querySelectorAll('[data-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===part)))
}
async function selectCard(id,{scroll=false}={}){
 const request=++revision
 try{
  const loaded=await loadSourceCard(id)
  const [fonts,assets]=await Promise.all([loadCardFonts(loaded),preloadCardAssets(loaded)])
  if(request!==revision)return
  card=loaded;selected=id;document.documentElement.dataset.cardFont='loaded';document.documentElement.dataset.fontFaces=String(fonts.reduce((n,x)=>n+x.count,0));document.documentElement.dataset.assets=String(assets)
  $('error').hidden=true;$('card-select').value=id
  $('selected-title').textContent=card.title
  $('selected-type').textContent=`${card.kind==='legendary'?'Легендарное':card.kind==='unique'?'Уникальное':'Обычное'} ${card.critter?'существо':'сооружение'}`
  $('source-page').textContent=`· лист ${card.page}, карта ${card.cell}`
  $('source-card').innerHTML=`<img src="${sourceReference(id)}" alt="Оригинальная карта ${card.title}">`
  displayCard();displayPart()
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
  if(request!==revision)return
  document.documentElement.dataset.cardId=id
  document.querySelectorAll('[data-card]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.card===id)))
  history.replaceState(null,'','#'+id)
  if(scroll)window.scrollTo({top:0,behavior:'smooth'})
 }catch(error){showError(error)}
}
function filterDeck(){
 const query=$('search').value.trim().toLocaleLowerCase('ru');let count=0
 for(const item of deck.cards){const button=document.querySelector(`[data-card="${item.id}"]`);const show=item.title.toLocaleLowerCase('ru').includes(query)&&(filter==='all'||(filter==='base'?Number(item.id)<=48:Number(item.id)>48));button.hidden=!show;if(show)count++}
 $('deck-count').textContent=`${count} из 64 карт`;$('empty').hidden=count>0
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)))
}
try{
 deck=await loadDeck()
 $('card-select').innerHTML=deck.cards.map(c=>`<option value="${c.id}">${c.id} · ${c.title}</option>`).join('')
 $('layer-controls').innerHTML=componentGroups.map(g=>`<label class="check"><input type="checkbox" data-layer="${g.id}" checked>${g.title}</label>`).join('')
 $('part-switcher').innerHTML=componentGroups.map(g=>`<button data-part="${g.id}">${g.title}</button>`).join('')
 $('deck-grid').innerHTML=deck.cards.map(c=>`<button class="deck-item" data-card="${c.id}" aria-label="Проверить карту ${c.title}"><img src="${sourceReference(c.id)}" alt="" loading="lazy"><span>${c.title}</span></button>`).join('')
 $('card-select').addEventListener('change',e=>selectCard(e.target.value))
 $('previous').addEventListener('click',()=>selectCard(deck.cards[(deck.cards.findIndex(c=>c.id===selected)+63)%64].id))
 $('next').addEventListener('click',()=>selectCard(deck.cards[(deck.cards.findIndex(c=>c.id===selected)+1)%64].id))
 document.querySelectorAll('[data-width]').forEach(b=>b.addEventListener('click',()=>{width=Number(b.dataset.width);displayCard()}))
 document.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>selectCard(b.dataset.card,{scroll:true})))
 document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('change',()=>{b.checked?hidden.delete(b.dataset.layer):hidden.add(b.dataset.layer);displayCard()}))
 document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>{part=b.dataset.part;displayPart()}))
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;filterDeck()}))
 $('search').addEventListener('input',filterDeck)
 for(const id of ['overlay','guides'])$(id).addEventListener('change',displayCard)
 $('restore-layers').addEventListener('click',()=>{hidden.clear();document.querySelectorAll('[data-layer]').forEach(b=>b.checked=true);displayCard()})
 await selectCard(deck.cards.find(c=>'#'+c.id===location.hash)?.id??'22')
}catch(error){showError(error)}
