// Lightweight visual navigation: 2D clearance rectangles, no physics or game-state mutation
const EPS=.025
export function expandedObstacles(obstacles,radius=.45,exclude=null){return obstacles.filter(o=>o.id!==exclude).map(o=>({...o,minX:o.minX-radius,maxX:o.maxX+radius,minZ:o.minZ-radius,maxZ:o.maxZ+radius}))}
export function pointBlocked(p,obstacles){return obstacles.some(o=>p.x>o.minX&&p.x<o.maxX&&p.z>o.minZ&&p.z<o.maxZ)}
export function segmentClear(a,b,obstacles){
 for(const o of obstacles){
  let lo=0,hi=1
  for(const [axis,min,max] of [['x',o.minX,o.maxX],['z',o.minZ,o.maxZ]]){
   const delta=b[axis]-a[axis]
   if(Math.abs(delta)<1e-10){if(a[axis]<=min||a[axis]>=max){lo=2;break}}
   else{let t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2)}
  }
  if(lo<hi&&hi>0&&lo<1)return false
 }
 return true
}
export function nearestFree(p,obstacles){
 if(!pointBlocked(p,obstacles))return{x:p.x,z:p.z}
 const candidates=[]
 for(const o of obstacles){
  const x=Math.max(o.minX-EPS,Math.min(o.maxX+EPS,p.x)),z=Math.max(o.minZ-EPS,Math.min(o.maxZ+EPS,p.z))
  candidates.push({x:o.minX-EPS,z},{x:o.maxX+EPS,z},{x,z:o.minZ-EPS},{x,z:o.maxZ+EPS})
  for(const x of [o.minX-EPS,o.maxX+EPS])for(const z of [o.minZ-EPS,o.maxZ+EPS])candidates.push({x,z})
 }
 return candidates.filter(q=>!pointBlocked(q,obstacles)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]??null
}
const visibilityGraphs=new WeakMap()
function obstacleGraph(obstacles){
 let graph=visibilityGraphs.get(obstacles);if(graph)return graph
 const points=[]
 for(const o of obstacles)for(const x of [o.minX-EPS,o.maxX+EPS])for(const z of [o.minZ-EPS,o.maxZ+EPS]){const p={x,z};if(!pointBlocked(p,obstacles))points.push(p)}
 const edges=points.map(()=>[])
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)if(segmentClear(points[i],points[j],obstacles)){const d=Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z);edges[i].push([j,d]);edges[j].push([i,d])}
 graph={points,edges};visibilityGraphs.set(obstacles,graph);return graph
}
export function planRoute(start,goal,obstacles){
 if(pointBlocked(start,obstacles)||pointBlocked(goal,obstacles))return null
 if(segmentClear(start,goal,obstacles))return[{...goal}]
 // Reuse corner-to-corner visibility for all actors with the same clearance
 const graph=obstacleGraph(obstacles),points=[start,goal,...graph.points],edges=[[],[],...graph.edges.map(row=>row.map(([j,d])=>[j+2,d]))]
 for(let i=0;i<2;i++)for(let j=2;j<points.length;j++)if(segmentClear(points[i],points[j],obstacles)){const d=Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z);edges[i].push([j,d]);edges[j].push([i,d])}
 const d=points.map(()=>Infinity),previous=points.map(()=>-1),visited=new Set();d[0]=0
 for(let round=0;round<points.length;round++){
  let i=-1;for(let j=0;j<points.length;j++)if(!visited.has(j)&&(i<0||d[j]<d[i]))i=j
  if(i<0||!Number.isFinite(d[i]))return null
  if(i===1){const route=[];for(let j=1;j!==0;j=previous[j])route.unshift({...points[j]});return route}
  visited.add(i)
  for(const [j,length] of edges[i])if(!visited.has(j)&&d[i]+length<d[j]){d[j]=d[i]+length;previous[j]=i}
 }
 return null
}
export function createNavigation(obstacles,previous){
 const key=obstacles.map(o=>[o.id,o.minX,o.maxX,o.minZ,o.maxZ].join(':')).join('|')
 return previous?.key===key?previous:{key,obstacles,revision:(previous?.revision??0)+1,expanded:new Map()}
}
function clearance(nav,radius,exclude){const key=radius+':'+exclude;let obstacles=nav.expanded.get(key);if(!obstacles){obstacles=expandedObstacles(nav.obstacles,radius,exclude);nav.expanded.set(key,obstacles)}return obstacles}
export function stepNavigation(position,goal,state,dt,speed,nav,{radius=.45,exclude=null}={}){
 if(!nav)nav=createNavigation([])
 const obstacles=clearance(nav,radius,exclude),key=[goal.x.toFixed(3),goal.z.toFixed(3),nav.revision,radius,exclude].join(':')
 // A newly placed building may cover a resident. Re-home the visual actor at the nearest
 // free boundary once, rather than animate it walking through the new wall
 let displaced=false
 if(pointBlocked(position,obstacles)){const free=nearestFree(position,obstacles);if(!free)return{moving:false,blocked:true};position.x=free.x;position.z=free.z;state.key=null;displaced=true}
 if(state.key!==key){state.key=key;state.destination=nearestFree(goal,obstacles);state.route=state.destination?planRoute(position,state.destination,obstacles):null;state.index=0}
 if(!state.route)return{moving:false,blocked:true,displaced}
 const before={x:position.x,z:position.z};let remaining=Math.max(0,Math.min(dt,.1))*speed
 while(remaining>1e-7&&state.index<state.route.length){
  const target=state.route[state.index],dx=target.x-position.x,dz=target.z-position.z,d=Math.hypot(dx,dz)
  if(d<1e-7){state.index++;continue}
  const step=Math.min(d,remaining),next={x:position.x+dx/d*step,z:position.z+dz/d*step}
  if(!segmentClear(position,next,obstacles)){state.route=null;return{moving:false,blocked:true,displaced}}
  position.x=next.x;position.z=next.z;remaining-=step;if(step===d)state.index++
 }
 const dx=position.x-before.x,dz=position.z-before.z,moving=Math.hypot(dx,dz)>1e-7
 return{moving,reached:state.index>=state.route.length,displaced,yaw:moving?Math.atan2(-dx,-dz):undefined}
}
