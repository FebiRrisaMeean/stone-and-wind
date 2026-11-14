// Reversible scheduling only: ?renderBudget=off restores continuous rendering
export function renderBudgetEnabled(search=''){
 return new URLSearchParams(search).get('renderBudget')!=='off'
}

export class RenderLoop{
 constructor(draw,{enabled=true,fps=60,active=()=>true,hidden=false,onResume=()=>{},request=fn=>requestAnimationFrame(fn),cancel=id=>cancelAnimationFrame(id)}={}){
  this.draw=draw;this.enabled=enabled;this.interval=1000/fps;this.active=active;this.hidden=hidden;this.onResume=onResume;this.request=request;this.cancel=cancel
  this.handle=null;this.last=null;this.dirty=true;this.disposed=false;this.frames=0;this.tick=this.tick.bind(this)
 }
 wake(){if(!this.disposed&&this.handle===null&&(!this.enabled||!this.hidden)){this.onResume();this.handle=this.request(this.tick)}}
 invalidate(){this.dirty=true;this.wake()}
 setHidden(hidden){this.hidden=hidden;if(!this.enabled)return;if(hidden){if(this.handle!==null)this.cancel(this.handle);this.handle=null;this.last=null}else this.invalidate()}
 tick(now){
  this.handle=null;if(this.disposed||(this.enabled&&this.hidden))return
  const animate=!this.enabled||this.active(),due=this.last===null||now-this.last>=this.interval-.1
  if(!this.enabled||this.dirty||(animate&&due)){
   const dt=this.last===null?0:Math.min(.06,Math.max(0,(now-this.last)/1000));this.last=now;this.dirty=false;this.frames++;this.draw(now,dt)
  }
  if(animate||this.dirty)this.handle=this.request(this.tick)
  else this.last=null
 }
 dispose(){this.disposed=true;if(this.handle!==null)this.cancel(this.handle);this.handle=null}
}
