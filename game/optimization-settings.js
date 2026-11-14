// Independent escape hatches keep performance changes reversible
export function optimizationSettings(search=''){
 const q=new URLSearchParams(search),all=q.get('optimizations')!=='off'
 return {
  backgroundBudget:all&&q.get('backgroundBudget')!=='off',
  overlayBudget:all&&q.get('overlayBudget')!=='off',
  shadowMapSize:all&&q.get('shadowQuality')!=='original'?1536:2048,
  shadowHz:all&&q.get('shadowBudget')!=='off'?20:60,
  pixelRatio:all&&q.get('renderQuality')!=='original'?1.25:1.7,
  shadowBudget:all&&q.get('shadowBudget')!=='off',
  animationBudget:all&&q.get('animationBudget')!=='off',
  staticBatching:all&&q.get('staticBatching')!=='off'
 }
}
