import * as T from '../vendor/three.module.js'
import {createLocalScholar,animateLocalScholar} from '../game/local-sculpt/scholar.js'
import {createLocalCharacter,animateLocalCharacter} from '../game/local-sculpt/characters.js'
const catalog=await (await fetch('./catalog.json')).json()
let selected='Doctor',walking=false
const castLabels=[]
function createFigure(name){const g=name==='Doctor'?createLocalScholar():createLocalCharacter(name);g.userData.cardName=name;return g}
function animateFigure(g,t,options){if(g.userData.cardName==='Doctor')animateLocalScholar(g,t,options);else animateLocalCharacter(g,t,options)}

const host = document.querySelector('#viewport')
const status = document.querySelector('#status')
const buttons = document.querySelector('.controls')
const reference = document.querySelector('#reference')
reference.addEventListener('load',()=>{reference.dataset.ready='true';reference.style.opacity='1'})
reference.addEventListener('error', () => {
  document.querySelector('#reference-status').textContent = 'Не удалось загрузить reference.png'
})
let yaw = -.48, pitch = .13, zoom = 1
let turntable = false, clay = false, animated = true, gameScale = false, crowd = false
let drag = null, raf, observer, renderer, scene, camera, model, crowdGroup, animateModel
let elapsed = 0, last = performance.now(), fpsStart = last, frameCount = 0
const target = new T.Vector3(0, 1.25, 0)
const originalMaterials = new WeakMap()
const clayMaterial = new T.MeshStandardMaterial({color: '#b2ad9d', roughness: .9, metalness: 0})
const number = new Intl.NumberFormat('ru-RU')

function clearView() {
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', 'false'))
}
function updateControls() {
  for (const [id, value] of Object.entries({rotate:turntable, clay, animation:animated, 'game-scale':gameScale, walk:walking, crowd})) {
    document.getElementById(id).setAttribute('aria-pressed', String(value))
  }
  document.body.dataset.crowd = String(crowd)
  document.querySelector('#model-title').textContent = crowd ? 'Все жители' : catalog.find(c=>c.name===selected).title
  document.querySelector('#mode-label').textContent = crowd ? '24 персонажа' : gameScale ? 'Игровой размер' : 'Студийный вид'
}
function rememberMaterials(root) {
  root.traverse(object => {
    if (!object.isMesh) return
    originalMaterials.set(object, object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
}
function setMaterials() {
  for (const root of [model, crowdGroup]) root?.traverse(object => {
    if (object.isMesh) object.material = clay ? clayMaterial : originalMaterials.get(object)
  })
}
function makeCrowd() {
  if (crowdGroup) return
  // Object3D clones share geometry and materials; no additional mesh buffers
  crowdGroup = new T.Group()
  model.traverse(object => {
    if (object.isMesh) object.material = originalMaterials.get(object)
  })
  for (let index = 0; index < 24; index++) {
    const clone = createFigure(catalog[index].name)
    clone.position.set((index % 8 - 3.5) * 3.0, clone.position.y, (Math.floor(index / 8) - 1) * 4.0)
    rememberMaterials(clone)
    crowdGroup.add(clone)
    const label=document.createElement('button');label.className='cast-name';label.textContent=catalog[index].title;label.addEventListener('click',e=>{e.stopPropagation();document.querySelector('#character').value=catalog[index].name;choose(catalog[index].name)});host.append(label);castLabels.push({label,clone})
  }
  scene.add(crowdGroup)
  setMaterials()
}
buttons.addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button || !model) return
  if (button.dataset.view) {
    yaw = {reference: -.48, front:0, side:-Math.PI / 2, back:Math.PI}[button.dataset.view]
    pitch = button.dataset.view === 'reference' ? .13 : .06
    zoom = 1
    turntable = false
    clearView()
    button.setAttribute('aria-pressed', 'true')
  }
  if (button.id === 'walk') walking=!walking
  if (button.id === 'rotate') { turntable = !turntable; clearView() }
  if (button.id === 'clay') { clay = !clay; setMaterials() }
  if (button.id === 'animation') { animated = !animated; if (!animated) elapsed = 0 }
  if (button.id === 'game-scale') { gameScale = !gameScale; zoom = 1 }
  if (button.id === 'crowd') {
    crowd = !crowd
    if (crowd) {
      yaw=0;pitch=.68;document.querySelector('#model-title').textContent='Все жители'
      // Each copy reuses the same buffers and has independent rigid-part animation
      animateModel(model, 0, {walking})
      makeCrowd()
    }
    model.visible = !crowd
    if (crowdGroup) crowdGroup.visible = crowd
    zoom = 1
  }
  updateControls()
})
function resize() {
  const {width, height} = host.getBoundingClientRect()
  if (!width || !height) return
  renderer.setSize(width, height, false)
  camera.aspect = width / height
}
function updateCamera() {
  const aspect = camera.aspect || 1
  const span = (crowd ? Math.max(10.5,26/aspect) : gameScale ? 12 : 3.15) * zoom
  const height = span / Math.min(1, aspect)
  camera.left = -height * aspect / 2
  camera.right = height * aspect / 2
  camera.top = height / 2
  camera.bottom = -height / 2
  camera.updateProjectionMatrix()
  const angle = crowd ? Math.max(.65, pitch) : pitch
  const cameraYaw = crowd ? 0 : yaw
  const distance = 28
  camera.position.set(Math.sin(cameraYaw) * Math.cos(angle) * distance, target.y + Math.sin(angle) * distance, -Math.cos(cameraYaw) * Math.cos(angle) * distance)
  camera.lookAt(target)
}
host.addEventListener('pointerdown', event => {
  if (event.button !== 0 && event.button !== 2) return
  host.focus({preventScroll:true})
  drag = {x:event.clientX, y:event.clientY}
  host.setPointerCapture(event.pointerId)
  turntable = false
  updateControls()
})
host.addEventListener('pointermove', event => {
  if (!drag) return
  yaw -= (event.clientX - drag.x) * .008
  pitch = T.MathUtils.clamp(pitch + (event.clientY - drag.y) * .005, -.12, 1.0)
  drag = {x:event.clientX, y:event.clientY}
  clearView()
})
function release(event) {
  drag = null
  if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId)
}
host.addEventListener('pointerup', release)
host.addEventListener('pointercancel', release)
host.addEventListener('lostpointercapture', () => {drag = null})
host.addEventListener('contextmenu', event => event.preventDefault())
host.addEventListener('wheel', event => {
  event.preventDefault()
  zoom = T.MathUtils.clamp(zoom * Math.exp(event.deltaY * .001), .5, 2.5)
}, {passive:false})
host.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  yaw += event.key === 'ArrowLeft' ? .15 : -.15
  turntable = false
  clearView()
  updateControls()
})
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000)
  last = now
  if (animated) elapsed += dt
  if (turntable) yaw += dt * .25
  if (!crowd) animateModel(model, elapsed, {walking})
  else crowdGroup.children.forEach((figure,index) => {
    // Inspect every side without rotating the wide grid out of the viewport
    figure.rotation.y=-yaw
    animateModel(figure, elapsed+index*.31, {walking})
  })
  updateCamera()
  renderer.render(scene, camera)
  for(const {label,clone} of castLabels){label.hidden=!crowd;if(crowd){const p=clone.position.clone();p.y=.06;p.project(camera);label.style.left=((p.x*.5+.5)*host.clientWidth)+'px';label.style.top=((-p.y*.5+.5)*host.clientHeight)+'px'}}
  frameCount++
  if (now - fpsStart >= 500) {
    document.querySelector('#triangles').textContent = `${number.format(renderer.info.render.triangles)} треугольников`
    document.querySelector('#draw-calls').textContent = `${renderer.info.render.calls} вызовов`
    document.querySelector('#fps').textContent = `${Math.round(frameCount * 1000 / (now - fpsStart))} FPS`
    fpsStart = now
    frameCount = 0
  }
  raf = requestAnimationFrame(frame)
}
function choose(name){
  selected=name;scene.remove(model);model=createFigure(name);rememberMaterials(model);scene.add(model);crowd=false;if(crowdGroup)crowdGroup.visible=false
  const c=catalog.find(c=>c.name===name);reference.dataset.ready='false';reference.style.opacity='0';reference.src=name==='Doctor'?'../scholar-local/reference.png':`../game/assets/cards64/references/${c.id}.webp`;reference.alt=c.title+' — исходный образ';document.querySelector('#model-title').textContent=c.title;document.querySelector('#reference-status').textContent=name==='Doctor'?'Утверждённый эталон A':'Исходная карточка';yaw=-.48;pitch=.13;zoom=1;setMaterials();updateControls();resize();updateCamera();renderer.render(scene,camera)
}
try {
  animateModel = animateFigure
  scene = new T.Scene()
  scene.background = new T.Color('#d9d6ca')
  camera = new T.OrthographicCamera(-2, 2, 2, -2, .05, 100)
  renderer = new T.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  host.prepend(renderer.domElement)
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    cancelAnimationFrame(raf)
    status.hidden = false
    status.classList.add('error')
    status.textContent = '3D-контекст потерян — обновите страницу'
  })
  scene.add(new T.HemisphereLight('#fff8e8', '#807a68', 1.4))
  const key = new T.DirectionalLight('#fff3dd', 2.4)
  key.position.set(-4, 7, -5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, {left:-11, right:11, top:11, bottom:-11, near:.1, far:40})
  key.shadow.bias = -.00015
  key.shadow.normalBias = .025
  scene.add(key)
  const fill = new T.DirectionalLight('#e7ecf1', .85)
  fill.position.set(5, 4, 2)
  scene.add(fill)
  const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.MeshStandardMaterial({color:'#d2cfc1', roughness:1}))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0
  floor.receiveShadow = true
  scene.add(floor)
  model = createFigure(selected)
  rememberMaterials(model)
  scene.add(model)
  const select=document.querySelector('#character');for(const c of catalog){const option=new Option(c.title,c.name);select.add(option)}select.value=selected;select.addEventListener('change',()=>choose(select.value));choose(selected)
  observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  status.hidden = true
  updateControls()
  raf = requestAnimationFrame(frame)
} catch (error) {
  status.hidden = false
  status.classList.add('error')
  status.textContent = 'Не удалось открыть 3D-модель — проверьте загрузку локального модуля'
  console.error('Scholar local viewer:', error)
}
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  renderer?.dispose()
  const geometries = new Set(), materials = new Set([clayMaterial])
  scene?.traverse(object => {
    if (object.geometry) geometries.add(object.geometry)
    const original = originalMaterials.get(object) || object.material
    if (original) (Array.isArray(original) ? original : [original]).forEach(material => materials.add(material))
  })
  geometries.forEach(geometry => geometry.dispose())
  materials.forEach(material => material.dispose())
}, {once:true})
