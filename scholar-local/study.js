import * as T from '../vendor/three.module.js'

const host = document.querySelector('#viewport')
const status = document.querySelector('#status')
const buttons = document.querySelector('.controls')
const reference = document.querySelector('#reference')
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
  for (const [id, value] of Object.entries({rotate:turntable, clay, animation:animated, 'game-scale':gameScale, crowd})) {
    document.getElementById(id).setAttribute('aria-pressed', String(value))
  }
  document.body.dataset.crowd = String(crowd)
  document.querySelector('#mode-label').textContent = crowd ? '24 фигурки · общая геометрия' : gameScale ? 'Игровой размер' : 'Студийный вид'
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
    const clone = model.clone(true)
    clone.position.set((index % 6 - 2.5) * 2.35, model.position.y, (Math.floor(index / 6) - 1.5) * 2.4)
    rememberMaterials(clone)
    crowdGroup.add(clone)
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
  if (button.id === 'rotate') { turntable = !turntable; clearView() }
  if (button.id === 'clay') { clay = !clay; setMaterials() }
  if (button.id === 'animation') { animated = !animated; if (!animated) elapsed = 0 }
  if (button.id === 'game-scale') { gameScale = !gameScale; zoom = 1 }
  if (button.id === 'crowd') {
    crowd = !crowd
    if (crowd) {
      // Each copy reuses the same buffers and has independent rigid-part animation
      animateModel(model, 0, {walking:false})
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
  const span = (crowd ? 18 : gameScale ? 12 : 3.15) * zoom
  const aspect = camera.aspect || 1
  const height = span / Math.min(1, aspect)
  camera.left = -height * aspect / 2
  camera.right = height * aspect / 2
  camera.top = height / 2
  camera.bottom = -height / 2
  camera.updateProjectionMatrix()
  const angle = crowd ? Math.max(.42, pitch) : pitch
  const distance = 28
  camera.position.set(Math.sin(yaw) * Math.cos(angle) * distance, target.y + Math.sin(angle) * distance, -Math.cos(yaw) * Math.cos(angle) * distance)
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
  if (!crowd) animateModel(model, elapsed, {walking:false})
  else crowdGroup.children.forEach((figure,index) => animateModel(figure, elapsed+index*.31, {walking:false}))
  updateCamera()
  renderer.render(scene, camera)
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
try {
  const module = await import('../game/local-sculpt/scholar.js')
  animateModel = module.animateLocalScholar
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
  model = module.createLocalScholar()
  rememberMaterials(model)
  scene.add(model)
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
