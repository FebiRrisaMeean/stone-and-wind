// One request per asset name, with bounded concurrency across both libraries
const revisions=new Map()
export function nightAssetRevision(name){return revisions.get(name)??0}
let revision=0
export function nightAssetsRevision(){return revision}
const waiting=[]
let active=0
const concurrency=3
function pump(){
 while(active<concurrency&&waiting.length){
  const {task,resolve,reject}=waiting.shift();active++
  Promise.resolve().then(task).then(resolve,reject).finally(()=>{active--;pump()})
 }
}
function schedule(task){return new Promise((resolve,reject)=>{waiting.push({task,resolve,reject});pump()})}
export function eagerAssetsRequested(search=globalThis.location?.search??''){
 return new URLSearchParams(search).get('lazyAssets')==='off'
}
export function createAssetLibrary(definitions,load){
 const assets=new Map(),pending=new Map()
 const has=name=>Object.hasOwn(definitions,name)
 function request(name){
  if(!has(name))return Promise.resolve(null)
  if(assets.has(name))return Promise.resolve(assets.get(name))
  if(!pending.has(name))pending.set(name,schedule(async()=>{
   const asset=await load(name,definitions[name])
   if(asset){
    assets.set(name,asset);revision++;revisions.set(name,(revisions.get(name)??0)+1)
    if(globalThis.dispatchEvent&&globalThis.CustomEvent)globalThis.dispatchEvent(new CustomEvent('stone-assets-ready',{detail:{name,revision}}))
   }
   return asset??null
  }).catch(error=>{console.warn(`Asset ${name} unavailable; preserving previous model`,error);return null}))
  return pending.get(name)
 }
 return {assets,request,preload:(names=Object.keys(definitions))=>Promise.all([...new Set(names)].map(request))}
}
