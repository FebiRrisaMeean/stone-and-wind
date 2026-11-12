const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlaps=(a,b,gap=0)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});

// The origin is a fixed world footprint, never the pointer or the floating preview
export function cardPreviewPlacement(anchor,viewport,obstacles=[]){
 const margin=12,gap=18,ratio=.708,maxWidth=Math.min(320,viewport.width-24,(viewport.height-24)*ratio);
 const aboveSpace=anchor.top-gap-margin,aboveWidth=Math.min(maxWidth,aboveSpace*ratio);
 const avoid=obstacles.filter(Boolean),candidates=[];
 const add=(x,y,w,priority)=>{const h=w/ratio,r=rect(clamp(x,margin,viewport.width-w-margin),clamp(y,margin,viewport.height-h-margin),w,h);const collision=avoid.reduce((n,o)=>n+(overlaps(r,o,8)?1:0),0)+(overlaps(r,anchor,gap/2)?4:0);candidates.push({r,score:priority+collision*10000});};
 if(aboveWidth>=210){
  const w=aboveWidth,y=anchor.top-gap-w/ratio,cx=(anchor.left+anchor.right)/2;
  add(cx-w/2,y,w,0);
  for(const o of avoid){add(o.right+12,y,w,20);add(o.left-w-12,y,w,20);}
 }
 // Near the top edge, keep a readable card beside the origin instead of covering it
 for(const w of [maxWidth,Math.min(maxWidth,250)]){
  add(anchor.right+gap,anchor.top-w/ratio,w,60);
  add(anchor.left-gap-w,anchor.top-w/ratio,w,60);
  for(const o of avoid){add(o.right+gap,anchor.top-w/ratio,w,80);add(o.left-gap-w,anchor.top-w/ratio,w,80);}
 }
 candidates.sort((a,b)=>a.score-b.score);return candidates[0].r;
}

const symbols={
 own:'<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
 production:'<path d="m12 2-7 9h4l-6 7h7v4h4v-4h7l-6-7h4z"/>',
 market:'<path d="M3 9h18l-2-6H5zM4 9v4q2 3 4 0 2 3 4 0 2 3 4 0 2 3 4 0V9M5 15v6h14v-6M9 21v-5h6v5"/>',
 opponent:'<path d="m3 12 7-7 7 7M5 11v10h10V11M10 2l3-1v5M18 9l3 3v9h-3M8 21v-6h4v6"/>'
};
export const CAMERA_ZONES=[['own','Мой город'],['production','Производство'],['market','Рынок'],['opponent','Город соперника']];
export function cameraControls(){return `<nav class="camera-zone-controls" data-camera-ui aria-label="Области поля">${CAMERA_ZONES.map(([id,name])=>`<button type="button" data-camera-zone="${id}" aria-label="${name}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[id]}</svg><span>${name}</span></button>`).join('')}</nav>`;}
