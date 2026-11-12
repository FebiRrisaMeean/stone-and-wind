import * as T from '../vendor/three.module.js';

export const SEASON_VISUALS={
 WINTER:{plain:0xe5ece8,meadow:0xf0f1e5,forest:0xd0e0df,road:0xcdd5ce,rock:0xb9c9c9,water:0x8eb8c5,mist:0xa8bcc2,foliage:[0xc7dcdb,0xdce8e4],grass:0xc6d3ca,flower:0xe5ece8,leaves:0xdce8e4},
 SPRING:{plain:0x9eb577,meadow:0xb8c88b,forest:0x769354,road:0xd2c49a,rock:0xaeb29a,water:0x79b8b3,mist:0x859c75,foliage:[0x82a95d,0xa4bd72],grass:0x8baf65,flower:0xefb1bd,leaves:0xa4bd72},
 SUMMER:{plain:0x8fa65b,meadow:0xaebc76,forest:0x638749,road:0xcab988,rock:0x9da186,water:0x79b2a7,mist:0x7f9268,foliage:[0x61894a,0x839f56],grass:0x70924f,flower:0xe5c985,leaves:0xa2b365},
 AUTUMN:{plain:0xb2a064,meadow:0xc4ae76,forest:0xa1804f,road:0xd0b080,rock:0xa5a18b,water:0x84a99a,mist:0x9e976f,foliage:[0xb76f39,0xd4a04d],grass:0xa1964f,flower:0xd5a35e,leaves:0xc57836}
};
export function seasonVisuals(season){return SEASON_VISUALS[String(season).toUpperCase()]??SEASON_VISUALS.SUMMER;}
export function applyObjectSeason(group,season){
 season=String(season).toUpperCase();
 if(group.userData.visualSeason===season)return;group.userData.visualSeason=season;const palette=seasonVisuals(season);
 group.traverse(o=>{if(!o.isMesh||!o.material?.color||o.material.userData.seasonInvariant)return;const m=o.material;if(m.userData.originalColor===undefined)m.userData.originalColor=m.color.getHex();const c=new T.Color(m.userData.originalColor),green=c.g>c.r*1.05&&c.g>c.b*1.08&&c.g>.20;
  if(green){m.color.setHex(palette.foliage[o.id%2]);if(season==='WINTER')m.roughness=1;}else m.color.setHex(m.userData.originalColor);
 });
}
export function addSeasonGroundDetails(view,state){
 const season=String(state.season).toUpperCase(),palette=seasonVisuals(season);if(!season)return;
 const items=[];for(const t of state.tiles){if(t.type==='water')continue;const hash=Math.sin(t.x*97.1+t.z*51.7)*23794.19,seed=hash-Math.floor(hash);if(season==='AUTUMN'&&seed>.60)for(let j=0;j<3;j++)items.push({x:t.x+Math.sin(j*2.4)*.30,z:t.z+Math.cos(j*2.4)*.30,y:view.heightAt(t.x,t.z)+.04,size:.7+seed,r:seed*6+j});if(season==='WINTER'&&seed>.83)items.push({x:t.x,z:t.z,y:view.heightAt(t.x,t.z)+.025,size:.45+seed,r:seed});}
 if(season==='AUTUMN')view.instances(view.detail,new T.SphereGeometry(.12,5,3),view.material(palette.leaves),items,t=>({position:[t.x,t.y,t.z],rotation:[0,t.r,.2],scale:[t.size,.08,t.size*.5]}));
 if(season==='WINTER')view.instances(view.detail,new T.SphereGeometry(.42,9,5),view.material(0xf4f5ec),items,t=>({position:[t.x,t.y,t.z],rotation:[0,t.r,0],scale:[t.size,.1,t.size*.75]}));
 view.seasonGroundDetails={season,count:items.length};
}
