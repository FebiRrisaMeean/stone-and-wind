import * as T from '../../vendor/three.module.js'

// Small modelling vocabulary: blended organic masses, curved solid tufts and cloth
// All coordinates are authored in metres; no images, network calls or random generation
const V = p => new T.Vector3(...p)
const materials = new Map()
export function material(kind = 'matte') {
  if (!materials.has(kind)) materials.set(kind, new T.MeshStandardMaterial({
    color: 0xffffff, vertexColors: true, roughness: kind === 'eye' ? .24 : kind === 'brass' ? .43 : .82,
    metalness: kind === 'brass' ? .55 : 0,
    ...(kind === 'glass' ? {transparent: true, opacity: .14, depthWrite: false, roughness: .18} : {})
  }))
  const m=materials.get(kind);m.userData.sharedAsset=true;m.userData.seasonInvariant=true;return m
}
export function part(parent, name, origin = [0, 0, 0]) {
  const g = new T.Group(); g.name = name
  g.userData.origin = origin
  const base = parent.userData.origin || [0, 0, 0]
  g.position.set(...origin.map((n, i) => n - base[i])); parent.add(g)
  return g
}
export function add(parent, geometry, color, kind = 'matte') {
  geometry.translate(...(parent.userData.origin || [0, 0, 0]).map(v => -v))
  const c = new T.Color(color), n = geometry.attributes.position.count, colors = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(colors, i * 3)
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3))
  const mesh = new T.Mesh(geometry, material(kind)); mesh.castShadow = true; mesh.receiveShadow = true
  parent.add(mesh); return mesh
}
export function ell(parent, p, r, color, kind = 'matte', rotation = [0,0,0]) {
  const g = new T.SphereGeometry(1, 18, 12)
  g.scale(...r); g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation))); g.translate(...p)
  return add(parent, g, color, kind)
}
export function tube(parent, points, radius, color, kind = 'matte', segments = 24) {
  const c = new T.CatmullRomCurve3(points.map(V))
  return add(parent, new T.TubeGeometry(c, segments, radius, 7, false), color, kind)
}
// Rounded diamond cross-sections keep quills sculptural, with a ridge, not thin cones
export function leaf(parent, points, width, depth, color, {steps = 12, sides = 8, ridge = .15} = {}) {
  const curve = new T.CatmullRomCurve3(points.map(V)), frame = curve.computeFrenetFrames(steps, false)
  const positions = [], indices = []
  for (let j = 0; j <= steps; j++) {
    const u = j / steps, p = curve.getPoint(u)
    const envelope = Math.max(.006, Math.pow(Math.sin(Math.PI * Math.pow(u, .68)), .85))
    for (let k = 0; k < sides; k++) {
      const a = k / sides * Math.PI * 2
      const q = p.clone().addScaledVector(frame.normals[j], Math.cos(a) * width * envelope)
        .addScaledVector(frame.binormals[j], Math.sin(a) * depth * envelope * (1 + ridge * Math.cos(2*a)))
      positions.push(...q.toArray())
    }
  }
  for (let j=0;j<steps;j++) for(let k=0;k<sides;k++) {
    const a=j*sides+k,b=j*sides+(k+1)%sides,c=a+sides,d=b+sides
    indices.push(a,b,c,b,d,c)
  }
  // Closed root and tip
  for(let k=1;k<sides-1;k++){indices.push(0,k+1,k);const a=steps*sides;indices.push(a,a+k,a+k+1)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals()
  return add(parent,g,color)
}
// Smooth union is used for the silhouette and intermediate anatomy before surface accents
export function sculpt(parent, blobs, color, {step=.045, blend=.08}={}) {
  step *= 1.65
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity]
  for(const b of blobs) for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],b.p[k]-b.r[k]-blend);hi[k]=Math.max(hi[k],b.p[k]+b.r[k]+blend)}
  const field=(x,y,z)=>{
    let d=1e6
    for(const {p,r} of blobs){const q=Math.hypot((x-p[0])/r[0],(y-p[1])/r[1],(z-p[2])/r[2]);const e=(q-1)*Math.min(...r);const h=Math.max(blend-Math.abs(d-e),0)/blend;d=Math.min(d,e)-h*h*blend*.25}
    return d
  }
  const size=hi.map((n,i)=>Math.ceil((n-lo[i])/step)+1),[nx,ny,nz]=size
  const values=new Float32Array(nx*ny*nz), index=(x,y,z)=>(z*ny+y)*nx+x
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++) values[index(x,y,z)]=field(lo[0]+x*step,lo[1]+y*step,lo[2]+z*step)
  const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]]
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]
  const positions=[],indices=[],vertices=new Map()
  const vertex=p=>{const key=p.map(v=>Math.round(v*1e5)).join(',');if(vertices.has(key))return vertices.get(key);const i=positions.length/3;positions.push(...p);vertices.set(key,i);return i}
  function polygon(ps){
    const c=ps.reduce((a,p)=>a.add(V(p)),new T.Vector3()).multiplyScalar(1/ps.length),e=.002
    const normal=new T.Vector3(field(c.x+e,c.y,c.z)-field(c.x-e,c.y,c.z),field(c.x,c.y+e,c.z)-field(c.x,c.y-e,c.z),field(c.x,c.y,c.z+e)-field(c.x,c.y,c.z-e)).normalize()
    const u=V(ps[0]).sub(c).normalize(),v=new T.Vector3().crossVectors(normal,u)
    ps.sort((a,b)=>{const av=V(a).sub(c),bv=V(b).sub(c);return Math.atan2(av.dot(v),av.dot(u))-Math.atan2(bv.dot(v),bv.dot(u))})
    const ids=ps.map(vertex);for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1])
  }
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const ds=corners.map(c=>values[index(x+c[0],y+c[1],z+c[2])]);if(ds.every(v=>v>0)||ds.every(v=>v<=0))continue
    const ps=corners.map(c=>[lo[0]+(x+c[0])*step,lo[1]+(y+c[1])*step,lo[2]+(z+c[2])*step])
    for(const tet of tets){const cross=[];for(const [a,b]of edges){const i=tet[a],j=tet[b];if((ds[i]>0)===(ds[j]>0))continue;const u=ds[i]/(ds[i]-ds[j]);cross.push(ps[i].map((v,k)=>v+(ps[j][k]-v)*u))}if(cross.length>=3)polygon(cross)}
  }
  // Two Taubin passes soften the sampling grid without inflating the silhouette
  const neighbours=Array.from({length:positions.length/3},()=>new Set())
  for(let i=0;i<indices.length;i+=3)for(let k=0;k<3;k++){const a=indices[i+k],b=indices[i+(k+1)%3];neighbours[a].add(b);neighbours[b].add(a)}
  for(const amount of [.38,-.40,.38,-.40]){
    const next=positions.slice()
    for(let i=0;i<neighbours.length;i++)for(let k=0;k<3;k++){
      let avg=0;for(const n of neighbours[i])avg+=positions[n*3+k]
      if(neighbours[i].size)next[i*3+k]+=amount*(avg/neighbours[i].size-positions[i*3+k])
    }
    for(let i=0;i<positions.length;i++)positions[i]=next[i]
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return add(parent,g,color)
}
export function surface(parent, fn, color, nu=48,nv=16) {
  const p=[],ids=[]
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv))
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ids.push(a,c,b,b,c,d)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();return add(parent,g,color)
}
// Merge compatible surfaces inside each moving part; cloned figures share the resulting buffers
export function batch(root) {
  for(const child of [...root.children])if(child.isGroup)batch(child)
  const sets=new Map()
  for(const child of root.children)if(child.isMesh){const key=child.material; if(!sets.has(key))sets.set(key,[]);sets.get(key).push(child)}
  for(const [mat,meshes]of sets){if(meshes.length<2)continue;const pos=[],norm=[],col=[],idx=[];let offset=0
    for(const mesh of meshes){const g=mesh.geometry;pos.push(...g.attributes.position.array);norm.push(...g.attributes.normal.array);col.push(...g.attributes.color.array);if(g.index)for(const i of g.index.array)idx.push(offset+i);else for(let i=0;i<g.attributes.position.count;i++)idx.push(offset+i);offset+=g.attributes.position.count;root.remove(mesh);g.dispose()}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeBoundingSphere()
    const mesh=new T.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=root.name+'-surface';root.add(mesh)
  }
}
