/** Reusable source-faithful card layers extracted from the user-supplied PDF
 * Typography stays SVG text, illustrations and decorations remain shared assets
 */
const base = new URL('./assets/cards64/', import.meta.url)
const cache = new Map()
let instance = 0
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export const componentGroups = Object.freeze([
 {id:'illustration',title:'Иллюстрация',parts:['illustration']},
 {id:'frame',title:'Рамка и пергамент',parts:['frame','border']},
 {id:'cost',title:'Стоимость и связь',parts:['cost']},
 {id:'category',title:'Категория и тираж',parts:['category','copies']},
 {id:'title',title:'Лента, название и тип',parts:['ribbon','title','type']},
 {id:'points',title:'Победные очки',parts:['points']},
 {id:'rules',title:'Эффект и пояснения',parts:['rules']},
 {id:'footer',title:'Нижние подписи',parts:['footer']}
])
export async function loadDeck() {
 const response=await fetch(new URL('manifest.json',base))
 if(!response.ok)throw new Error(`Каталог карт: ${response.status}`)
 return response.json()
}
export async function loadSourceCard(id) {
 if(!cache.has(id))cache.set(id,fetch(new URL(`cards/${id}.json`,base)).then(r=>{if(!r.ok)throw new Error(`Карта ${id}: ${r.status}`);return r.json()}).catch(error=>{cache.delete(id);throw error}))
 return cache.get(id)
}
export const sourceReference = id => new URL(`references/${id}.webp`,base).href
const resolveAssets = svg => svg.replace(/(?:xlink:)?href="images\/([^"]+)"/g,(_,path)=>`href="${new URL('images/'+path,base).href}"`)
/** A layer is a reusable vector component, maintaining source painter order */
export function layerComponent(layer) { return `<g data-component="${esc(layer.part)}">${layer.svg}</g>` }
/** Render a standalone part or a complete card through the same renderer */
export function sourceCardComponent(card,{width=344,only=null,hidden=[],guides=false,crop=null}={}) {
 const key=`ed64-${++instance}-`
 const hiddenSet=new Set(hidden)
 const layers=card.layers.filter(layer=>(!only||only.includes(layer.part))&&!hiddenSet.has(layer.part))
 const [x,y,w,h]=crop??[0,0,card.width,card.height]
 let inner=`<defs>${card.defs.replace(/<mask /g,'<mask maskUnits="userSpaceOnUse" x="0" y="0" width="766" height="1044" ')}</defs><g transform="translate(${-card.origin[0]} ${-card.origin[1]})">${layers.map(layerComponent).join('')}</g>`
 // Every instance owns its mask IDs, so the same card can safely appear in several previews
 inner=resolveAssets(inner).replace(/id="([^"]+)"/g,(_,id)=>`id="${key}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${key}${id})`).replace(/(?:xlink:)?href="#([^"]+)"/g,(_,id)=>`href="#${key}${id}"`)
 return `<article class="source-card ${guides?'show-guides':''}" data-source-card="${esc(card.id)}" style="width:${width}px;aspect-ratio:${w}/${h}" aria-label="${esc(card.title)}"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${esc(card.title)}"><title>${esc(card.title)}</title>${inner}</svg></article>`
}
/** Confirm every actual font used in this card loads, including its Cyrillic subset */
export async function loadCardFonts(card) {
 const parsed=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${card.layers.map(x=>x.svg).join('')}</svg>`,'image/svg+xml')
 if(parsed.querySelector('parsererror'))throw new Error('Некорректное описание текстовых слоёв')
 const requests=new Map()
 for(const node of parsed.querySelectorAll('text')){
  const family=node.getAttribute('font-family'),weight=node.getAttribute('font-weight')||'400'
  const key=`${weight} 16px "${family}"`
  requests.set(key,(requests.get(key)||'')+node.textContent)
 }
 const results=await Promise.all([...requests].map(async([font,chars])=>{try{return {font,count:(await document.fonts.load(font,chars)).length,characters:chars.length}}catch(error){throw new Error(font+': '+error.message)}}))
 if(!results.length||results.some(x=>x.count===0))throw new Error('Не загрузился исходный шрифт карточки')
 return results
}

const imageCache=new Map()
export async function preloadCardAssets(card,{reference=true}={}){
 const paths=[...new Set([...card.defs.matchAll(/(?:xlink:)?href="(images\/[^"]+)"/g)].map(m=>new URL(m[1],base).href)),...(reference?[sourceReference(card.id)]:[])]
 await Promise.all(paths.map(src=>{
  if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.decode().then(resolve,reject);image.onerror=()=>reject(new Error('Не загрузился графический слой: '+new URL(src).pathname.split('/').pop()));image.src=src}).catch(error=>{imageCache.delete(src);throw error}))
  return imageCache.get(src)
 }))
 return paths.length
}
