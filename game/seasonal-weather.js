import * as T from '../vendor/three.module.js'

// One draw call, no textures, no dynamic buffers or per-particle CPU animation
export function weatherSettings(season,search=''){
 const params=new URLSearchParams(search),enabled=params.get('weather')!=='off'
 const kind=String(season).toUpperCase()
 return {style:params.get('weatherStyle')==='classic'?'classic':'woodland',enabled:enabled&&['WINTER','AUTUMN','SPRING','SUMMER'].includes(kind),kind,
  count:!enabled?0:kind==='WINTER'?180:kind==='AUTUMN'?60:kind==='SPRING'||kind==='SUMMER'?38:0}
}
const noise=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)}
export function createSeasonalWeather(season,search=''){
 const config=weatherSettings(season,search);if(!config.enabled)return null
 const winter=config.kind==='WINTER',autumn=config.kind==='AUTUMN',glow=!winter&&!autumn,classic=config.style==='classic'||glow
 const position=new Float32Array(config.count*3),phase=new Float32Array(config.count)
 for(let i=0;i<config.count;i++){
  position[i*3]=6+noise(i+1)*48
  position[i*3+1]=noise(i+301)
  position[i*3+2]=5+noise(i+101)*62
  phase[i]=noise(i+201)*Math.PI*2
 }
 const geometry=new T.BufferGeometry()
 geometry.setAttribute('position',new T.BufferAttribute(position,3))
 geometry.setAttribute('phase',new T.BufferAttribute(phase,1))
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,
  uniforms:{time:{value:0},pixelRatio:{value:1},tint:{value:new T.Color(winter?0xe7f0ed:autumn?0xbf793c:0xffdf99)}},
  vertexShader:classic?`attribute float phase;
   uniform float time; uniform float pixelRatio;
   varying float alpha; varying float rotation;
   void main(){
    vec3 p=position;
    float cycle=fract(position.y+time*${winter?'.045':autumn?'.07':'.025'});
    ${glow?`p.y=.6+position.y*1.7+sin(time*.6+phase)*.23;
      p.x+=sin(time*.24+phase)*.4;p.z+=cos(time*.20+phase)*.3;
      alpha=.25+.65*pow((1.+sin(time*1.3+phase))*.5,2.);`:
    `p.y=.18+(1.-cycle)*${winter?'10.':'7.'};
     p.x+=sin(time*.35+phase)*${winter?'.5':'1.0'}+cycle*.7;
     p.z+=cos(time*.22+phase)*.35;
     alpha=smoothstep(0.,.12,cycle)*smoothstep(0.,.10,1.-cycle)*${winter?'.7':'.85'};`}
    rotation=phase+time*.7;
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(${winter?'2.5':autumn?'5.':'2.2'}*pixelRatio,1.,8.);
   }`:woodlandVertexShader(winter),
  fragmentShader:classic?`uniform vec3 tint;varying float alpha;varying float rotation;
   void main(){vec2 q=gl_PointCoord-.5;
    ${autumn?'q=mat2(cos(rotation),-sin(rotation),sin(rotation),cos(rotation))*q;q.x*=1.7;':''}
    float a=1.-smoothstep(.28,.5,length(q));if(a<.02)discard;
    gl_FragColor=vec4(tint,a*alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`:woodlandFragmentShader(winter)
 })
 const mesh=new T.Points(geometry,material);mesh.name=`weather-${config.kind.toLowerCase()}`
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=1
 mesh.userData.weather={...config,drawCalls:1,triangles:0}
 return {mesh,config,update(time,pixelRatio=1){material.uniforms.time.value=time;material.uniforms.pixelRatio.value=Math.min(1.7,pixelRatio)},dispose(){mesh.removeFromParent();geometry.dispose();material.dispose()}}
}


// Settling is hidden near the ground rather than accumulating particles or geometry
// A fixed budget is spread through the field; projection zoom controls only sprite size
function woodlandVertexShader(winter){return `
 attribute float phase;
 uniform float time; uniform float pixelRatio;
 varying float alpha; varying float rotation; varying float variation; varying float tumble;
 void main(){
  variation=fract(sin(phase*12.73)*43758.5453);
  float speed=${winter?'.026':'.038'}+variation*${winter?'.018':'.025'};
  float cycle=fract(position.y+time*speed);
  float wind=sin(time*.18)*.55+sin(time*.067+1.2)*.35;
  vec3 p=position;
  p.y=.15+(1.-cycle)*${winter?'10.':'7.'};
  p.x+=cycle*(1.2+wind)+sin(time*${winter?'.55':'.95'}+phase)*${winter?'.28':'.6'};
  p.z+=cycle*.4+sin(time*.32+phase*1.7)*${winter?'.2':'.42'};
  ${winter?'':'p.y+=sin(time*1.7+phase)*.12*smoothstep(0.,1.,p.y);'}
  alpha=smoothstep(0.,.10,cycle)*smoothstep(.18,${winter?'1.1':'1.35'},p.y)*${winter?'.78':'.9'};
  rotation=phase+time*(${winter?'.12':'.45'}+variation*${winter?'.24':'.75'})+sin(time*.6+phase)*.25;
  tumble=${winter?'1.':'.3+.7*abs(cos(time*(1.1+variation*.7)+phase))'};
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  float zoom=clamp(projectionMatrix[1][1]*13.,.75,1.6);
  gl_PointSize=clamp((${winter?'2.4+variation*2.':'5.5+variation*2.5'})*pixelRatio*zoom,1.,${winter?'8.':'14.'});
 }
`}
function woodlandFragmentShader(winter){return `
 uniform vec3 tint;
 varying float alpha; varying float rotation; varying float variation; varying float tumble;
 void main(){
  vec2 q=gl_PointCoord-.5;
  q=mat2(cos(rotation),-sin(rotation),sin(rotation),cos(rotation))*q;
  ${winter?`
   float radius=length(q);
   float core=1.-smoothstep(.10,.29,radius);
   // Three crossing axes suggest six branches, still soft enough at 3–6 pixels
   float axis=min(abs(q.x),min(abs(dot(q,vec2(.5,.866025))),abs(dot(q,vec2(.5,-.866025)))));
   float branches=(1.-smoothstep(.018,.065,axis))*(1.-smoothstep(.28,.46,radius));
   float a=max(core*.9,branches*.62);
   vec3 color=mix(tint,vec3(1.),variation*.35);
  `:`
   q.x/=tumble;
   // Pointed, asymmetrical leaf with a warm rim and a readable central vein
   float width=.30*pow(max(0.,1.-abs(q.y)*2.15),.7);
   float edge=width-abs(q.x+q.y*.12);
   float a=smoothstep(-.025,.025,edge)*(1.-smoothstep(.40,.48,abs(q.y)));
   vec3 amber=vec3(.78,.48,.16),rust=vec3(.57,.23,.10),gold=vec3(.91,.67,.27);
   vec3 color=variation<.5?mix(rust,amber,variation*2.):mix(amber,gold,(variation-.5)*2.);
   float vein=1.-smoothstep(.009,.027,abs(q.x+q.y*.12));
   color*=.82+.18*tumble;
   color=mix(color,color*.55,vein*.45);
   color+=vec3(.09,.055,.015)*(1.-smoothstep(.015,.07,edge));
  `}
  if(a*alpha<.015)discard;
  gl_FragColor=vec4(color,a*alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`}
