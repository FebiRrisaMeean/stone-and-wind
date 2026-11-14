import {LIVING_CITIES,CITY_FOREST_GATEWAYS} from './living-board-state.js';
// Renderer-owned scenery, outside the shared action clearings
export const CITY_GATEWAY_DECOR={
 forest:[{x:17,z:22.2,radius:2.4},{x:44,z:22.2,radius:2.4}],
 mountains:[{x:9,z:2.5,width:8,height:5,depth:4},{x:17,z:1,width:8,height:6,depth:4},{x:44,z:1,width:9,height:6,depth:4},{x:53,z:2.5,width:8,height:5,depth:4}],
 gateways:CITY_FOREST_GATEWAYS.map(point=>({...point})),
};
const CITY_TYPES=new Set(['city-area','city-card','city-slot','supplies','season']);
const ownerValid=owner=>Number.isInteger(owner)&&owner>=0&&owner<LIVING_CITIES.length;
const point=p=>({x:p.x,z:p.z});
const inside=(p,b)=>p&&b&&p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ;
const cityOwner=clearing=>ownerValid(clearing.owner)?clearing.owner:LIVING_CITIES.findIndex(city=>clearing.x===city.x&&clearing.z===city.z&&clearing.bounds?.minX===city.bounds.minX);
function gatewayHome(owner,number){const g=CITY_FOREST_GATEWAYS[owner],n=Math.max(0,(number??1)-1);return{x:g.x+(n%3-1)*.6,z:g.z+Math.floor(n/3)*.65};}

// Derive a render-only view from the complete canonical drawing on every render
// Never feed the result back to layout reconciliation, saving or engine commands
export function applyCityScene(drawing,viewer,viewedOwner=viewer){
 if(!ownerValid(viewer)||!ownerValid(viewedOwner))throw new TypeError('Invalid city owner');
 if(!drawing||!Array.isArray(drawing.livingObjects)||!Array.isArray(drawing.units))throw new TypeError('Invalid drawing');
 const scene=structuredClone(drawing),hiddenOwners=LIVING_CITIES.map((_,i)=>i).filter(i=>i!==viewedOwner);
 const hiddenObjects=drawing.livingObjects.filter(item=>CITY_TYPES.has(item.type)&&hiddenOwners.includes(item.owner));
 const hiddenIds=new Set(hiddenObjects.map(item=>item.id));
 const sharedIds=new Set((drawing.locations??[]).map(item=>item.id));
 const sharedObjectIds=new Set(drawing.livingObjects.filter(item=>!CITY_TYPES.has(item.type)).map(item=>item.id));
 scene.livingObjects=scene.livingObjects.filter(item=>!hiddenIds.has(item.id));
 scene.livingClearings=(scene.livingClearings??[]).filter(c=>!hiddenOwners.includes(cityOwner(c)));
 const hiddenUnits=[];
 scene.units=scene.units.filter(unit=>{
  const assigned=unit.locationId!=null;
  const destinationHidden=hiddenIds.has(unit.locationId)||assigned&&!sharedIds.has(unit.locationId)&&!sharedObjectIds.has(unit.locationId)&&hiddenObjects.some(o=>o.type==='city-card'&&Math.hypot(o.x-unit.x,o.z+.8-unit.z)<.15);
  if(destinationHidden){hiddenUnits.push(unit.id);return false;}
  if(hiddenOwners.includes(unit.owner)){
   const home=gatewayHome(unit.owner,unit.number);unit.home=home;
   // Assigned shared workers stay at their seats, including their hidden overflow flags
   if(!assigned){unit.x=home.x;unit.z=home.z;unit.roamCenter={...CITY_FOREST_GATEWAYS[unit.owner]};unit.roamRadius=1.3;}
  }
  return true;
 });
 if(scene.placementPreview?.owner!==viewedOwner||viewedOwner!==viewer)scene.placementPreview=null;
 if(scene.lastMove){
  const unit=scene.units.find(u=>u.id===scene.lastMove.id);
  if(!unit)scene.lastMove=null;
  else if(hiddenOwners.includes(unit.owner)&&unit.locationId!=null&&scene.lastMove.path?.length){
   const path=scene.lastMove.path,home=gatewayHome(unit.owner,unit.number);
   // A departure starts at the visible gateway rather than the unseen canonical camp
   if(inside(path[0],LIVING_CITIES[unit.owner].bounds))scene.lastMove.path=[home,...path.filter(p=>!inside(p,LIVING_CITIES[unit.owner].bounds)).map(point)];
  }
 }
 const gatewayArrivals=hiddenObjects.filter(item=>item.type==='city-card'&&item.arrival?.key&&item.arrival?.from).map(item=>({
  ...structuredClone(item),id:'gateway-arrival:'+item.id,type:'gateway-arrival',
  x:CITY_FOREST_GATEWAYS[item.owner].x,z:CITY_FOREST_GATEWAYS[item.owner].z,
  arrival:{...structuredClone(item.arrival),hideOnArrival:true},
  sourceObjectId:item.id,hideOnArrival:true,
 }));
 scene.cityScene={version:1,gatewayArrivals,decor:structuredClone(CITY_GATEWAY_DECOR),viewer,viewedOwner,readOnlyCity:viewedOwner!==viewer,hiddenOwners,hiddenObjectIds:[...hiddenIds],hiddenUnitIds:hiddenUnits,focusBounds:{...LIVING_CITIES[viewedOwner].bounds},key:`${viewer}:${viewedOwner}`};
 return scene;
}
