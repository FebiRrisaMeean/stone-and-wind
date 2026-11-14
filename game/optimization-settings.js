// Independent escape hatches keep performance changes reversible
export function optimizationSettings(search=''){
 const q=new URLSearchParams(search),all=q.get('optimizations')!=='off'
 return {
  pixelRatio:all&&q.get('renderQuality')!=='original'?1.25:1.7,
  shadowBudget:all&&q.get('shadowBudget')!=='off',
  animationBudget:all&&q.get('animationBudget')!=='off',
  staticBatching:all&&q.get('staticBatching')!=='off'
 }
}
