// Orthographic camera calculations shared by zone presets and free-camera bounds
// All world positions are on the XZ ground plane, elevation is Y
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
export const LIVING_CAMERA_BOUNDS={minX:-.5,maxX:60.5,minZ:-.5,maxZ:70.5};

export function fitLivingZone(bounds,viewport,padding={}){
 if(!bounds||!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(bounds[k]))||bounds.maxX<bounds.minX||bounds.maxZ<bounds.minZ)return null;
 const width=Math.max(1,finite(viewport.width,1)),height=Math.max(1,finite(viewport.height,1));
 const yaw=finite(viewport.yaw,0),pitch=clamp(finite(viewport.pitch,.95),.35,1.28),s=Math.sin(pitch),c=Math.cos(pitch),sy=Math.sin(yaw),cy=Math.cos(yaw);
 const left=clamp(finite(padding.left,32),0,width*.35),right=clamp(finite(padding.right,32),0,width*.35),top=clamp(finite(padding.top,100),0,height*.35),bottom=clamp(finite(padding.bottom,230),0,height*.4);
 const xs=[],ys=[];
 for(const x of [bounds.minX,bounds.maxX])for(const y of [finite(bounds.minY,0),finite(bounds.maxY,3)])for(const z of [bounds.minZ,bounds.maxZ]){
  xs.push(cy*x-sy*z);ys.push(-sy*s*x+c*y-cy*s*z);
 }
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const zoom=clamp(Math.min((width-left-right)*26/(height*Math.max(maxX-minX,.1)),(height-top-bottom)*26/(height*Math.max(maxY-minY,.1)))*.94,.25,3.2);
 const pixelsPerUnit=height*zoom/26;
 // Offset the camera target so the subject is centred in the unobscured rectangle
 const horizontal=(minX+maxX)/2-(left-right)/(2*pixelsPerUnit);
 const vertical=(minY+maxY)/2+(top-bottom)/(2*pixelsPerUnit),depth=-vertical/s;
 return{target:{x:cy*horizontal+sy*depth,z:-sy*horizontal+cy*depth},yaw,pitch,zoom};
}

export function groundFootprint({width,height,zoom,yaw=0,pitch=.95,bottomInset=0}){
 const h=Math.max(1,height),halfHeight=13/Math.max(.01,zoom),halfWidth=halfHeight*Math.max(1,width)/h,depth=halfHeight/Math.max(.1,Math.sin(pitch));
 const hiddenBottom=clamp(finite(bottomInset,0),0,h*.8),nearDepth=depth*(1-2*hiddenBottom/h),c=Math.cos(yaw),s=Math.sin(yaw),xs=[],zs=[];
 // The hand obscures the bottom strip: the visible ground rectangle is asymmetric
 for(const right of [-halfWidth,halfWidth])for(const forward of [-depth,nearDepth]){xs.push(c*right+s*forward);zs.push(-s*right+c*forward);}
 const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
 return{x:Math.max(-minX,maxX),z:Math.max(-minZ,maxZ),minX,maxX,minZ,maxZ};
}

function targetLimits(camera,bounds){
 const extent=groundFootprint(camera),minX=bounds.minX-extent.minX,maxX=bounds.maxX-extent.maxX,minZ=bounds.minZ-extent.minZ,maxZ=bounds.maxZ-extent.maxZ;
 return{extent,minX:Math.min((minX+maxX)/2,minX),maxX:Math.max((minX+maxX)/2,maxX),minZ:Math.min((minZ+maxZ)/2,minZ),maxZ:Math.max((minZ+maxZ)/2,maxZ)};
}

export function constrainPresetFrame(frame,viewport,bounds=LIVING_CAMERA_BOUNDS){
 const limits=targetLimits({...viewport,zoom:frame.zoom,yaw:frame.yaw,pitch:frame.pitch},bounds);
 // Horizontal centring prevents edge-city presets pointing mostly beyond the map
 // Preserve UI-aware composition when an overview exceeds a map dimension
 const fitsDepth=limits.extent.maxZ-limits.extent.minZ<=bounds.maxZ-bounds.minZ, fitsWidth=limits.extent.maxX-limits.extent.minX<=bounds.maxX-bounds.minX;
 return{...frame,target:{x:fitsWidth?clamp(frame.target.x,limits.minX,limits.maxX):frame.target.x,z:fitsDepth?clamp(frame.target.z,limits.minZ,limits.maxZ):frame.target.z}};
}

export function livingCameraLimits(camera,bounds=LIVING_CAMERA_BOUNDS){
 const spanX=Math.max(1,bounds.maxX-bounds.minX),spanZ=Math.max(1,bounds.maxZ-bounds.minZ);
 const unit=groundFootprint({...camera,zoom:1});
 // Limit zoom-out by the rotated footprint, not just a fixed scale or target point
 const minZoom=Math.max(.35,(unit.maxX-unit.minX)/spanX,(unit.maxZ-unit.minZ)/spanZ);
 const zoom=clamp(Math.max(finite(camera.zoom,1),minZoom),.35,3.2);
 return{zoom,minZoom,...targetLimits({...camera,zoom},bounds)};
}

export function constrainLivingTarget(target,limits,overshoot=0){
 return{x:clamp(target.x,limits.minX-overshoot,limits.maxX+overshoot),z:clamp(target.z,limits.minZ-overshoot,limits.maxZ+overshoot)};
}
