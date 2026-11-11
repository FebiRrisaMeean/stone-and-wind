// Original woodland illustrations, generated for this prototype
const CRITTERS=['Architect','Bard','Barge Toad','Chip Sweep','Doctor','Fool','Historian','Husband','Innkeeper','Judge','King','Miner Mole','Monk','Peddler','Postal Pigeon','Queen','Ranger','Shepherd','Shopkeeper','Teacher','Undertaker','Wanderer','Wife','Woodcarver'];
const BUILDINGS=['Castle','Cemetary','Chapel','Clock Tower','Courthouse','Crane','Dungeon','Evertree','Fairgrounds','Farm','General Store','Inn','Lookout','Mine','Monastery','Palace','Post Office','Resin Refinery','Ruins','School','Storehouse','Theatre','Twig Barge','University'];
const atlases={critters:new URL('../assets/everdell-critters-v1.webp',import.meta.url).href,buildings:new URL('../assets/everdell-buildings-v1.webp',import.meta.url).href};
export function artStyle(name){let index=CRITTERS.indexOf(name),type='critters';if(index<0){index=BUILDINGS.indexOf(name);type='buildings'}if(index<0)index=7;return `--atlas:url('${atlases[type]}');--art-x:${index%6*20}%;--art-y:${Math.floor(index/6)*100/3}%`;}
export function cardArt(name,cls=''){return `<div class="card-art ${cls}" style="${artStyle(name)}" aria-hidden="true"><span class="art-paint"></span></div>`;}
export function portraitStyle(index){return artStyle(['Husband','Shopkeeper','Peddler','Ranger','Miner Mole','Woodcarver'][index%6]);}
export function placeArt(name){return /RESIN/.test(name)?'Resin Refinery':/TWIG/.test(name)?'Twig Barge':/STONE|PEBBLE/.test(name)?'Mine':/BERRY/.test(name)?'Farm':/JOURNEY/.test(name)?'Wanderer':name==='HAVEN'?'Inn':/DISCARD/.test(name)?'Peddler':/COPY/.test(name)?'Lookout':'Evertree';}
const shapes={
 TWIG:'<path d="m4 17 15-9-2-4L2 13z" fill="#886343" stroke="#4f3928"/><path d="m6 15 10-6M12 10l-2-5" stroke="#c69a60" stroke-width="2"/><ellipse cx="4" cy="15" rx="2.4" ry="2.8" fill="#d9b57b" stroke="#765432"/><path d="M11 6q5-6 7-2-2 4-7 2" fill="#668344"/>',
 RESIN:'<path d="M12 2c-1 4-8 9-8 14 0 8 16 8 16 0 0-5-7-10-8-14" fill="#dfa532" stroke="#a27527"/><path d="M11 7 7 15l2 4 7-2 1-3z" fill="#f5cf69"/><path d="m7 12-1 3" stroke="#fff2b7" stroke-width="2" stroke-linecap="round"/>',
 PEBBLE:'<path d="m3 15 4-9 9-2 6 9-4 7-11 1z" fill="#8f9eaa" stroke="#54656c"/><path d="m7 6 4 10 11-3-6-9z" fill="#c2cace"/><path d="m11 16-4 5-4-6" fill="#697b86"/>',
 BERRY:'<path d="M12 9q-1-8 6-7-1 6-6 7" fill="#657a3d"/><circle cx="9" cy="14" r="6" fill="#925074" stroke="#603954"/><circle cx="16" cy="16" r="5" fill="#b3648b" stroke="#6c3e61"/><path d="m6 12 2-1m6 3 2-1" stroke="#e8a5bd" stroke-width="2" stroke-linecap="round"/>',
 VP:'<circle cx="12" cy="12" r="10" fill="#d8b45a" stroke="#967139"/><circle cx="12" cy="12" r="7" fill="none" stroke="#f4d991"/><path d="m12 5 2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#8e6730"/>',
 CARD:'<path d="M6 3h14v18H6z" fill="#f3dfae" stroke="#836c49"/><path d="M3 6v15h12" fill="none" stroke="#836c49"/><path d="M12 8q8 0 1 8-5-5-1-8" fill="#6d8b4e"/>',
 ANY:'<path d="m12 2 9 10-9 10L3 12z" fill="#cfba8c" stroke="#897249"/><circle cx="12" cy="12" r="3" fill="#f3e6c5"/>'
};
export function resourceIcon(name){return `<svg class="resource-icon" viewBox="0 0 24 24" aria-hidden="true">${shapes[name]??shapes.ANY}</svg>`;}

const cardMarks={
 PRODUCTION:'<path d="M4 18C2 7 13 1 22 3c-1 11-6 18-16 17L18 7M6 20l-2 2"/>',
 GOVERNANCE:'<path d="M7 4h13v15H7c-5 0-5-6 0-6h11M7 4c-5 0-5 6 0 6M10 8h7m-7 4h7"/>',
 DESTINATION:'<ellipse cx="12" cy="16" rx="6" ry="5"/><ellipse cx="4" cy="8" rx="2.5" ry="3.5"/><ellipse cx="10" cy="4" rx="2.5" ry="3.5"/><ellipse cx="17" cy="5" rx="2.5" ry="3.5"/><ellipse cx="22" cy="10" rx="2" ry="3"/>',
 PROSPERITY:'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
 TRAVELER:'<path d="m3 21 17-18M6 5q10-5 12 5-1 6-8 5L6 5z"/>'
};
export function cardTypeIcon(type){return `<svg class="card-type-icon" viewBox="0 0 24 24" aria-hidden="true" fill="${type==='DESTINATION'?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${cardMarks[type]??cardMarks.PRODUCTION}</svg>`;}
