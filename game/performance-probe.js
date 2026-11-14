// Opt in with ?perfProbe=1; no timers, logging or DOM work when disabled
export const performanceProbeEnabled = (search = '') => new URLSearchParams(search).get('perfProbe') === '1';

// Explicit QA surface only; snapshot output is DOM text for accessibility/automation
export function installPerformancePanel(probe, loop) {
 if(!probe.enabled)return null;
 const panel=document.createElement('section');panel.id='performance-probe';panel.setAttribute('aria-label','Performance diagnostics');
 panel.style.cssText='position:fixed;z-index:100000;right:8px;top:8px;width:420px;max-height:70vh;overflow:auto;background:#101820;color:#fff;padding:12px;font:12px monospace;pointer-events:auto';
 const title=document.createElement('div');title.textContent='QA performance probe · 30s capture';panel.append(title);
 const output=document.createElement('pre');output.id='performance-probe-output';output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';
 const snapshot=()=>{output.textContent=JSON.stringify({...probe.snapshot(),renderSuspended:loop.disposed},null,2);};
 const addButton=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='margin:8px 6px 8px 0;color:#101820;background:#fff;padding:6px';b.addEventListener('click',action);panel.append(b);return b;};
 addButton('Snapshot',snapshot);
 const toggle=addButton('Suspend rendering',()=>{if(loop.disposed){loop.disposed=false;loop.invalidate();toggle.textContent='Suspend rendering';}else{loop.dispose();toggle.textContent='Resume rendering';}snapshot();});
 panel.append(output);document.body.append(panel);snapshot();
 return panel;
}

function distribution(values) {
 if (!values.length) return {count:0,mean:null,p50:null,p95:null,max:null};
 const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
 return {count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:at(.5),p95:at(.95),max:sorted.at(-1)};
}

export function createPerformanceProbe(renderer, {enabled=false, durationMs=30000, maxFrames=2400, now=()=>performance.now()}={}) {
 const noop=()=>{},disabled={enabled:false,beginFrame:noop,mark:noop,beginRender:noop,endRender:noop,endFrame:noop,stop:noop,dispose:noop,snapshot:()=>({enabled:false})};
 if (!enabled) return disabled;
 const frames=[],gpuSamples=[],pending=[];
 const gl=renderer.getContext();
 // Three's renderer is WebGL2; unsupported browsers explicitly report no GPU measurement
 const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const gpuSupported=!!ext&&typeof gl.createQuery==='function';
 let started=now(),lastFrame=null,frame=null,activeQuery=null,stopped=false,discardedGpu=0;
 const removeQueries=()=>{for(const q of pending.splice(0))gl.deleteQuery(q);};
 function pollGpu(){
  if(!gpuSupported)return;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){discardedGpu+=pending.length;removeQueries();gpuSamples.length=0;return;}
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const q=pending.shift(),value=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;
   gl.deleteQuery(q);if(Number.isFinite(value))gpuSamples.push(value);
  }
 }
 function stop(){
  if(activeQuery){gl.endQuery(ext.TIME_ELAPSED_EXT);gl.deleteQuery(activeQuery);activeQuery=null;}
  pollGpu();discardedGpu+=pending.length;removeQueries();stopped=true;
 }
 return {
  enabled:true,
  beginFrame(){
   if(stopped)return;
   const t=now();
   if(t-started>=durationMs||frames.length>=maxFrames){stop();return;}
   pollGpu();frame={start:t,mark:t,intervalMs:lastFrame===null?null:t-lastFrame,stages:{}};lastFrame=t;
  },
  mark(name){if(!frame||stopped)return;const t=now();frame.stages[name]=(frame.stages[name]??0)+t-frame.mark;frame.mark=t;},
  beginRender(){
   if(!frame||stopped||!gpuSupported||pending.length>=8||gl.isContextLost())return;
   // Never wait for GPU completion or overlap an external elapsed-time query
   if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))return;
   activeQuery=gl.createQuery();if(activeQuery)gl.beginQuery(ext.TIME_ELAPSED_EXT,activeQuery);
  },
  endRender(){if(activeQuery){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(activeQuery);activeQuery=null;}},
  endFrame(){
   if(!frame||stopped)return;
   const r=renderer.info.render;
   frames.push({cpuMs:now()-frame.start,intervalMs:frame.intervalMs,stages:frame.stages,calls:r.calls,triangles:r.triangles,lines:r.lines,points:r.points});frame=null;
  },
  stop,
  dispose:stop,
  snapshot(){
   pollGpu();const stages={};for(const f of frames)for(const name of Object.keys(f.stages))stages[name]=true;
   const metric=key=>distribution(frames.map(f=>f[key]).filter(Number.isFinite));
   return {enabled:true,stopped,durationMs:Math.min(now()-started,durationMs),frameCount:frames.length,
    cpuFrameMs:metric('cpuMs'),frameIntervalMs:metric('intervalMs'),drawCalls:metric('calls'),triangles:metric('triangles'),
    stagesMs:Object.fromEntries(Object.keys(stages).map(name=>[name,distribution(frames.map(f=>f.stages[name]).filter(Number.isFinite))])),
    gpu:{supported:gpuSupported,renderMs:distribution(gpuSamples),pending:pending.length,discarded:discardedGpu},
    renderer:{pixelRatio:renderer.getPixelRatio(),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},
    limitations:['CPU measures synchronous JavaScript and render submission, excluding GPU completion','GPU timer covers the renderer call, including shadow passes; no total system GPU utilization','Frame interval includes scheduling and any intentional frame cap','No temperature, power or process attribution is inferred from these measurements']};
  }
 };
}
