/** Fixed hit slots stay in place while the selected card grows above them */
export function createHandInteraction(fan,onInspect){
 let active=null,hit=null;
 function clear(){
  active?.classList.remove('is-inspected');active=null;hit?.remove();hit=null;
 }
 function position(){
  if(!active?.isConnected)return clear();
  const face=active.querySelector('.hand-face');
  face.style.setProperty('--inspect-shift','0px');
  let r=face.getBoundingClientRect();
  const dx=Math.max(12-r.left,Math.min(0,innerWidth-12-r.right));
  face.style.setProperty('--inspect-shift',dx+'px');r=face.getBoundingClientRect();
  // The lower strip always belongs to the original slots, even under a raised card
  Object.assign(hit.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:Math.max(0,Math.min(r.bottom,innerHeight-220)-r.top)+'px'});
 }
 function inspect(slot){
  if(!slot||slot===active||fan.classList.contains('placing'))return;
  clear();active=slot;slot.classList.add('is-inspected');
  hit=document.createElement('div');hit.className='hand-preview-hit';hit.dataset.cameraUi='';
  hit.dataset.handIndex=slot.dataset.handIndex;hit.dataset.handName=slot.dataset.handName;
  fan.appendChild(hit);position();onInspect?.();
 }
 const over=e=>{const slot=e.target.closest('.hand-card');if(slot&&fan.contains(slot))inspect(slot);};
 const move=e=>{
  if(!active)return;
  if(e.target.closest('.hand-card,.hand-preview-hit')&&fan.contains(e.target))return;
  clear();
 };
 const focus=e=>{if(e.target.matches('.hand-card'))inspect(e.target);};
 const blur=e=>{if(!fan.contains(e.relatedTarget))clear();};
 const key=e=>{
  if(!e.target.matches('.hand-card')||!['ArrowLeft','ArrowRight',' '].includes(e.key))return;
  e.preventDefault();e.stopPropagation();
  if(e.key===' '){e.target.click();return;}
  const slots=[...fan.querySelectorAll('.hand-card')],i=slots.indexOf(e.target),next=slots[(i+(e.key==='ArrowRight'?1:-1)+slots.length)%slots.length];next?.focus();
 };
 fan.addEventListener('pointerover',over);fan.addEventListener('focusin',focus);fan.addEventListener('focusout',blur);fan.addEventListener('keydown',key);
 document.documentElement.addEventListener('pointerleave',clear);window.addEventListener('pointermove',move);window.addEventListener('blur',clear);window.addEventListener('resize',position);
 return {clear,refresh(){if(active)position();},dispose(){clear();fan.removeEventListener('pointerover',over);fan.removeEventListener('focusin',focus);fan.removeEventListener('focusout',blur);fan.removeEventListener('keydown',key);document.documentElement.removeEventListener('pointerleave',clear);window.removeEventListener('pointermove',move);window.removeEventListener('blur',clear);window.removeEventListener('resize',position);}};
}
