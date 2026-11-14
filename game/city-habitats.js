import {stepNavigation} from './city-navigation.js';
// Visual relationships only: never change card occupancy, payments or city slots
export function findCityHabitat(item,objects){
 if(item.type!=='city-card'||!item.critter||!item.homeCardName)return null
 return objects.filter(o=>o.type==='city-card'&&!o.critter&&o.owner===item.owner&&o.cardName===item.homeCardName)
  .sort((a,b)=>Math.hypot(a.x-item.x,a.z-item.z)-Math.hypot(b.x-item.x,b.z-item.z)||String(a.id).localeCompare(String(b.id)))[0]??null
}
export function stepHabitatWalk(position,walk,home,dt,navigation=null){
 if(navigation)return stepNavigatedHabitat(position,walk,home,dt,navigation)
 const radius=2.8,key=home.id+':'+home.x+':'+home.z
 if(walk.homeKey!==key){walk.homeKey=key;walk.angle=Math.atan2(position.z-home.z,position.x-home.x);walk.phase='approach';walk.pause=0;walk.travel=0}
 let tx=home.x+Math.cos(walk.angle)*radius,tz=home.z+Math.sin(walk.angle)*radius
 if(walk.phase==='approach'){
  const dx=tx-position.x,dz=tz-position.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*1.1)
  if(d>.02){position.x+=dx/d*step;position.z+=dz/d*step;return {moving:true,yaw:Math.atan2(-dx,-dz)}}
  walk.phase='orbit'
 }
 if(walk.pause>0){walk.pause-=dt;return {moving:false}}
 // Short arcs keep the resident outside its building instead of taking chords through it
 walk.angle+=dt*.65;walk.travel+=dt
 tx=home.x+Math.cos(walk.angle)*radius;tz=home.z+Math.sin(walk.angle)*radius
 const dx=tx-position.x,dz=tz-position.z;position.x=tx;position.z=tz
 if(walk.travel>3.5){walk.travel=0;walk.pause=2}
 return {moving:true,yaw:Math.atan2(-dx,-dz)}
}

function stepNavigatedHabitat(position,walk,home,dt,nav){
 const obstacle=nav.obstacles.find(o=>o.id===home.id),radius=obstacle?Math.max(2.8,Math.max(...[obstacle.minX,obstacle.maxX].flatMap(x=>[obstacle.minZ,obstacle.maxZ].map(z=>Math.hypot(x-home.x,z-home.z))))+1.05):2.8
 const key=home.id+':'+home.x+':'+home.z+':'+nav.revision
 if(walk.homeKey!==key){walk.homeKey=key;walk.angle=Math.atan2(position.z-home.z,position.x-home.x);walk.pause=0;walk.travel=0;walk.navigation={};walk.target=null}
 if(walk.pause>0){walk.pause-=dt;return{moving:false}}
 if(!walk.target){walk.angle+=.55;walk.target={x:home.x+Math.cos(walk.angle)*radius,z:home.z+Math.sin(walk.angle)*radius};const b=home.roamCenter?.bounds;if(b){walk.target.x=Math.max(b.minX+.9,Math.min(b.maxX-.9,walk.target.x));walk.target.z=Math.max(b.minZ+.9,Math.min(b.maxZ-.9,walk.target.z));}}
 const result=stepNavigation(position,walk.target,walk.navigation,dt,1.1,nav,{radius:.85})
 if(result.reached||result.blocked){walk.target=null;walk.travel++;if(result.blocked||walk.travel>=4){walk.travel=0;walk.pause=2}}
 return result
}
