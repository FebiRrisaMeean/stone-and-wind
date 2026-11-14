import * as T from '../vendor/three.module.js'

// One draw call, no textures, no dynamic buffers or per-particle CPU animation
export function weatherSettings(season,search=''){
 const enabled=new URLSearchParams(search).get('weather')!=='off'
 const kind=String(season).toUpperCase()
 return {enabled:enabled&&['WINTER','AUTUMN','SPRING','SUMMER'].includes(kind),kind,
  count:!enabled?0:kind==='WINTER'?180:kind==='AUTUMN'?60:kind==='SPRING'||kind==='SUMMER'?38:0}
}
const noise=i=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)}
export function createSeasonalWeather(season,search=''){
 const config=weatherSettings(season,search);if(!config.enabled)return null
 const winter=config.kind==='WINTER',autumn=config.kind==='AUTUMN',glow=!winter&&!autumn
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
  vertexShader:`attribute float phase;
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
   }`,
  fragmentShader:`uniform vec3 tint;varying float alpha;varying float rotation;
   void main(){vec2 q=gl_PointCoord-.5;
    ${autumn?'q=mat2(cos(rotation),-sin(rotation),sin(rotation),cos(rotation))*q;q.x*=1.7;':''}
    float a=1.-smoothstep(.28,.5,length(q));if(a<.02)discard;
    gl_FragColor=vec4(tint,a*alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 })
 const mesh=new T.Points(geometry,material);mesh.name=`weather-${config.kind.toLowerCase()}`
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=1
 mesh.userData.weather={...config,drawCalls:1,triangles:0}
 return {mesh,config,update(time,pixelRatio=1){material.uniforms.time.value=time;material.uniforms.pixelRatio.value=Math.min(1.7,pixelRatio)},dispose(){mesh.removeFromParent();geometry.dispose();material.dispose()}}
}
