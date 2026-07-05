// character-forge — 3D dice overlay (T24). Ported from monster-forge's dice3d.js (real cannon.js physics +
// three.js), distilled to character-forge's single look: dice tinted with the app accent (--accent, arcane
// indigo) and Vecna numerals on the faces (the only place Vecna is used, per the restyle decision).
//
// SAFETY: every THREE / CANNON / WebGL / document touch is LAZY (created on the first real roll) and GUARDED,
// so importing this module in Node (Vitest runs in the `node` environment) or in a browser that never rolls
// runs none of it. `rollDice3D` returns false when THREE/CANNON are absent, WebGL init fails, or the reader
// prefers reduced motion — the caller then shows the 2D result toast instead (see index.ts).
//
// Distilled from the original: cannon pre-roll → paint the predetermined value onto the face that lands up →
// reset & replay the identical fixed-step sim (so the shown value never changes at settle). sRGB colour.
// Physics runs in small units (cannon explodes at pixel scale) scaled to CSS px for rendering.
//
// Deliberately kept close to the original JS (T24 allows this for the physics/paint core): typed via
// engine.d.ts, THREE/CANNON accessed as script-injected globals. Trimmed vs monster-forge: no material
// presets (single indigo stone), no max-face logo, no settings/state reads, no compound-throw staging.

const D3D_SCALE = 48,
  D3D_GRAV = 62,
  D3D_CAP = 20
const D3D_DWELL = 2000,
  D3D_VANISH = 520 // ms — dice linger after settling, then implode
let d3dReady = false,
  d3dDead = false,
  d3dRoll = null,
  d3dLooping = false
let d3dRenderer,
  d3dScene,
  d3dCamera,
  d3dWorld,
  d3dKey,
  d3dGround,
  d3dUP,
  d3dW = 0,
  d3dH = 0
let d3dMatDie,
  d3dMatFloor,
  d3dMatWall,
  d3dWalls = []
let d3dStoneTex = null,
  d3dLive = [],
  d3dLiveMeshes = [],
  d3dCardEl = null,
  d3dHeld = null

// Vendor base (where three.min.js / cannon.min.js / vecna.otf live) — injected by configureDice so the engine
// works under the GitHub Pages sub-path without importing the blobs (keeps them off the boot bundle).
let d3dBase = ''
export function configureDice(opts) {
  if (opts && typeof opts.base === 'string') d3dBase = opts.base
}

// The die colour is the app accent (--accent). Read it once from the document root; fall back to indigo.
let d3dAccent = null
function d3dAccentRGB() {
  if (d3dAccent) return d3dAccent
  let hex = '#7a6fe0'
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (v) hex = v
  } catch {
    /* no DOM (tests) */
  }
  d3dAccent = d3dParseColor(hex)
  return d3dAccent
}
function d3dParseColor(str) {
  const s = String(str).trim()
  let m = /^#([0-9a-f]{6})$/i.exec(s)
  if (m)
    return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]
  m = /^#([0-9a-f]{3})$/i.exec(s)
  if (m) return m[1].split('').map((c) => parseInt(c + c, 16))
  m = /rgba?\(([^)]+)\)/i.exec(s)
  if (m)
    return m[1]
      .split(',')
      .slice(0, 3)
      .map((n) => Math.round(parseFloat(n)))
  return [122, 111, 224]
}

// Lazy-load the vendored physics/render libs (three ~592KB + cannon ~132KB) OFF the boot critical path. On
// desktop, hovering a rollable ([data-roll]) preloads them so the click is 3D; on touch the first roll finds
// them missing, falls back to the 2D toast, and pulls them in for the next roll. Idempotent; returns a promise.
// No-ops in Node (no document / no external-script execution).
let d3dLibsP = null
export function d3dLibsReady() {
  return typeof THREE !== 'undefined' && typeof CANNON !== 'undefined'
}
export function d3dLoadLibs() {
  if (d3dLibsP) return d3dLibsP
  if (d3dLibsReady()) return (d3dLibsP = Promise.resolve(true))
  if (typeof document === 'undefined') return Promise.resolve(false)
  const one = (src) =>
    new Promise((res, rej) => {
      const el = document.createElement('script')
      el.src = src
      el.async = true
      el.onload = res
      el.onerror = rej
      document.head.appendChild(el)
    })
  d3dLibsP = Promise.all([
    one(d3dBase + 'vendor/three.min.js'),
    one(d3dBase + 'vendor/cannon.min.js'),
  ])
    .then(() => true)
    .catch(() => {
      d3dLibsP = null
      return false
    })
  return d3dLibsP
}

// Load the Vecna faces (Pixel Sagas) via the FontFace API so it stays scoped to the dice — never registered as
// an app-wide @font-face (restyle decision: Vecna is dice-only). No-op without document.fonts.
let d3dFontP = null
function d3dLoadFont() {
  if (d3dFontP) return d3dFontP
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined')
    return (d3dFontP = Promise.resolve(false))
  const face = new FontFace('Vecna', `url(${d3dBase}vendor/vecna.otf)`, { weight: '700' })
  d3dFontP = face
    .load()
    .then((f) => {
      document.fonts.add(f)
      return true
    })
    .catch(() => false)
  return d3dFontP
}

const d3dTexCache = new Map()
const d3dDieFont = '"Vecna", "Copperplate", "Luminari", fantasy, serif'
let d3dPX = 0,
  d3dPY = 0,
  d3dPrev = 0
const d3dCl = (v, a, b) => (v < a ? a : v > b ? b : v)

// Track the pointer so dice spawn from where the user clicked, and a held cursor-die follows the pointer. All
// guarded / no-op without THREE+CANNON+WebGL, so safe to attach unconditionally.
if (typeof addEventListener === 'function') {
  addEventListener(
    'pointerdown',
    (e) => {
      d3dPX = e.clientX
      d3dPY = e.clientY
    },
    true,
  )
  addEventListener(
    'pointermove',
    (e) => {
      d3dPX = e.clientX
      d3dPY = e.clientY
    },
    true,
  )
  addEventListener('pointerover', (e) => d3dHoverOver(e), true) // hover a rollable → die rides the cursor
  addEventListener('pointerout', (e) => d3dHoverOut(e), true)
}

// Which indices of `vals` are DROPPED by a keep/drop modifier (kh/kl/dh/dl) — for dimming the unkept dice.
function d3dDroppedSet(vals, kmod) {
  const drop = new Set()
  if (!kmod) return drop
  const mt = kmod.slice(0, 2).toLowerCase(),
    kn = Number(kmod.slice(2) || 1)
  const idx = vals.map((v, i) => i).sort((x, y) => vals[x] - vals[y]) // indices ascending by value
  let keep
  if (mt === 'kh') keep = new Set(idx.slice(-kn))
  else if (mt === 'kl') keep = new Set(idx.slice(0, kn))
  else if (mt === 'dh') keep = new Set(idx.slice(0, Math.max(0, vals.length - kn)))
  else keep = new Set(idx.slice(kn)) // dl
  vals.forEach((v, i) => {
    if (!keep.has(i)) drop.add(i)
  })
  return drop
}
// Parse the roll's parts string into the dice that physically rolled (values, not kept/dropped):
//   "2d6:[3,5]"  "2d20kh1:[15,8]".  Flat mods and d% are ignored (no 3D die).
function d3dParse(parts) {
  const out = []
  const s = String(parts || '')
  let m
  const re = /(\d+)d(\d+)((?:kh|kl|dh|dl)\d*)?:\[([\d,]+)\]/gi
  while ((m = re.exec(s))) {
    const sides = +m[2],
      kmod = m[3] || '',
      vals = m[4].split(',').map(Number),
      dropped = d3dDroppedSet(vals, kmod)
    vals.forEach((v, i) => out.push({ sides, value: v, dropped: dropped.has(i) }))
  }
  return out.slice(0, D3D_CAP)
}

// ---- textures -------------------------------------------------------------------------------------
function d3dNumTex(n, sides) {
  const k = n + ':' + sides
  if (d3dTexCache.has(k)) return d3dTexCache.get(k)
  const s = 160,
    cv = document.createElement('canvas')
  cv.width = cv.height = s
  const g = cv.getContext('2d'),
    str = String(n)
  g.font = '700 118px ' + d3dDieFont
  g.textAlign = 'center'
  g.textBaseline = 'alphabetic'
  const me = g.measureText(str),
    asc = me.actualBoundingBoxAscent || 60,
    desc = me.actualBoundingBoxDescent || 0
  const y = s / 2 + (asc - desc) / 2
  g.lineJoin = 'round'
  g.lineWidth = 13
  g.strokeStyle = 'rgba(24,18,54,0.92)'
  g.strokeText(str, s / 2, y)
  g.fillStyle = '#f4f1ff'
  g.fillText(str, s / 2, y)
  if (n === 6 || n === 9) {
    g.fillRect(s * 0.36, y + desc + 10, s * 0.28, 7)
  }
  const t = new THREE.CanvasTexture(cv)
  t.anisotropy = 4
  t.encoding = THREE.sRGBEncoding
  d3dTexCache.set(k, t)
  return t
}
// Mottled stone texture tinted with the app accent — the die's whole surface. Base colour derived from
// --accent (darkened a touch so the numerals read), then per-pixel noise for the carved-stone grain.
function d3dStoneTexture() {
  if (d3dStoneTex) return d3dStoneTex
  const [r, gg, b] = d3dAccentRGB()
  const base = [Math.round(r * 0.82), Math.round(gg * 0.82), Math.round(b * 0.82)]
  const s = 512,
    c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')
  g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`
  g.fillRect(0, 0, s, s)
  const img = g.getImageData(0, 0, s, s),
    d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const nz = (Math.random() - 0.5) * 26 + (Math.random() < 0.04 ? (Math.random() - 0.5) * 60 : 0)
    d[i] += nz
    d[i + 1] += nz
    d[i + 2] += nz
  }
  g.putImageData(img, 0, 0)
  d3dStoneTex = new THREE.CanvasTexture(c)
  d3dStoneTex.encoding = THREE.sRGBEncoding
  d3dStoneTex.wrapS = d3dStoneTex.wrapT = THREE.RepeatWrapping
  d3dStoneTex.repeat.set(3, 3)
  d3dStoneTex.anisotropy = 8
  return d3dStoneTex
}

// ---- geometry -------------------------------------------------------------------------------------
function d3dRoundedBox(size, radius, seg) {
  const geo = new THREE.BoxGeometry(size, size, size, seg, seg, seg),
    p = geo.attributes.position,
    h = size / 2 - radius
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      cx = d3dCl(x, -h, h),
      cy = d3dCl(y, -h, h),
      cz = d3dCl(z, -h, h)
    let dx = x - cx,
      dy = y - cy,
      dz = z - cz
    const L = Math.hypot(dx, dy, dz) || 1
    p.setXYZ(i, cx + (dx / L) * radius, cy + (dy / L) * radius, cz + (dz / L) * radius)
  }
  geo.computeVertexNormals()
  return geo
}
const d3dIsBox = (sides) => sides === 6 || ![4, 8, 10, 12, 20].includes(sides)
// Merge a triangulated polyhedron into its real flat faces by clustering triangles with near-parallel normals.
function d3dFaceList(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo,
    p = g.attributes.position,
    groups = []
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    n = new THREE.Vector3(),
    cb = new THREE.Vector3(),
    ab = new THREE.Vector3(),
    ctr = new THREE.Vector3()
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i)
    b.fromBufferAttribute(p, i + 1)
    c.fromBufferAttribute(p, i + 2)
    cb.subVectors(c, b)
    ab.subVectors(a, b)
    n.crossVectors(cb, ab).normalize()
    ctr
      .copy(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3)
    if (n.dot(ctr) < 0) n.negate()
    let e = groups.find((gr) => gr.normal.dot(n) > 0.999)
    if (!e) {
      e = { normal: n.clone(), sum: new THREE.Vector3(), c: 0, vert: a.clone() }
      groups.push(e)
    }
    e.sum.add(a).add(b).add(c)
    e.c += 3
  }
  return groups.map((e) => ({
    normal: e.normal,
    centroid: e.sum.clone().multiplyScalar(1 / e.c),
    vert: e.vert,
  }))
}
// Pentagonal trapezohedron — the real d10 shape: 10 kite faces around a zigzag equator between two apexes.
function d3dD10Geo(R) {
  const c5 = Math.cos(Math.PI / 5),
    rr = R * 0.85,
    ye = R * 0.105,
    ap = ye * (1 + (2 * c5) / (1 - c5)),
    V = []
  for (let k = 0; k < 10; k++) {
    const t = (k * Math.PI) / 5
    V.push(new THREE.Vector3(Math.cos(t) * rr, k % 2 === 0 ? ye : -ye, Math.sin(t) * rr))
  }
  const T = new THREE.Vector3(0, ap, 0),
    B = new THREE.Vector3(0, -ap, 0),
    pos = []
  const triOut = (p1, p2, p3) => {
    const nn = new THREE.Vector3().subVectors(p2, p1).cross(new THREE.Vector3().subVectors(p3, p1))
    const cc = new THREE.Vector3()
      .addVectors(p1, p2)
      .add(p3)
      .multiplyScalar(1 / 3)
    if (nn.dot(cc) < 0) {
      const t = p2
      p2 = p3
      p3 = t
    }
    pos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z)
  }
  const kite = (apex, m, f, p) => {
    triOut(apex, m, f)
    triOut(apex, f, p)
  }
  for (let k = 1; k < 10; k += 2) kite(T, V[(k + 9) % 10], V[k], V[(k + 1) % 10])
  for (let k = 0; k < 10; k += 2) kite(B, V[(k + 9) % 10], V[k], V[(k + 1) % 10])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  return geo
}
function d3dBuild(sides, R) {
  if (d3dIsBox(sides)) {
    const size = R * 1.4,
      hs = size / 2
    const faces = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ].map((nn) => {
      const normal = new THREE.Vector3(nn[0], nn[1], nn[2])
      return { normal, centroid: normal.clone().multiplyScalar(hs) }
    })
    return { geo: d3dRoundedBox(size, size * 0.04, 3), faces, box: true } // tiny bevel = sharp edges
  }
  const geo =
    sides === 4
      ? new THREE.TetrahedronGeometry(R)
      : sides === 8
        ? new THREE.OctahedronGeometry(R)
        : sides === 10
          ? d3dD10Geo(R)
          : sides === 12
            ? new THREE.DodecahedronGeometry(R)
            : new THREE.IcosahedronGeometry(R)
  return { geo, faces: d3dFaceList(geo), box: false }
}
function d3dConvex(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo,
    p = g.attributes.position,
    map = new Map(),
    verts = [],
    idx = []
  for (let i = 0; i < p.count; i++) {
    const x = +(p.getX(i) / D3D_SCALE).toFixed(4),
      y = +(p.getY(i) / D3D_SCALE).toFixed(4),
      z = +(p.getZ(i) / D3D_SCALE).toFixed(4),
      k = x + ',' + y + ',' + z
    let id = map.get(k)
    if (id === undefined) {
      id = verts.length
      map.set(k, id)
      verts.push(new CANNON.Vec3(x, y, z))
    }
    idx.push(id)
  }
  const faces = []
  for (let i = 0; i < idx.length; i += 3) faces.push([idx[i], idx[i + 1], idx[i + 2]])
  return new CANNON.ConvexPolyhedron(verts, faces)
}
// One die surface material — indigo stone (baked mottled accent texture + bump). flatShading matches the
// faceted polyhedra; boxes stay smooth.
function d3dDieMat(box) {
  const m = new THREE.MeshStandardMaterial({
    map: d3dStoneTexture(),
    bumpMap: d3dStoneTexture(),
    bumpScale: 0.6,
    metalness: 0.0,
    roughness: 1.0,
  })
  m.flatShading = !box
  return m
}
// Orient a face label so its number reads UPRIGHT (proper basis matrix, no free roll).
function d3dLabelQuat(normal) {
  const z = normal.clone().normalize()
  const yref = Math.abs(z.y) > 0.92 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)
  const x = new THREE.Vector3().crossVectors(yref, z).normalize()
  const y = new THREE.Vector3().crossVectors(z, x).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}
// Per-face orientation frame (tangent,bitangent,normal) — used for the d20 symmetry permutation that shows the
// rolled value while keeping the STANDARD layout intact.
function d3dFrameQuat(f) {
  const z = f.normal.clone().normalize()
  const t = f.vert.clone().sub(f.centroid)
  t.addScaledVector(z, -t.dot(z))
  t.normalize()
  const y = new THREE.Vector3().crossVectors(z, t).normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, y, z))
}
// Standard d20 numbering: opposite faces sum to 21, and 20 is adjacent to 2/8/14.
function d3dD20Layout(faces) {
  const N = faces.length,
    val = new Array(N).fill(0)
  const opp = faces.map((f, i) => {
    let bi = 0,
      bd = 9
    faces.forEach((g, j) => {
      if (j === i) return
      const d = f.normal.clone().add(g.normal).length()
      if (d < bd) {
        bd = d
        bi = j
      }
    })
    return bi
  })
  const adjOf = (i) =>
    faces
      .map((g, j) => ({ j, d: faces[i].normal.dot(g.normal) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => b.d - a.d)
      .slice(0, 3)
      .map((o) => o.j)
  const set = (i, v) => {
    val[i] = v
    val[opp[i]] = 21 - v
  }
  let top = 0
  faces.forEach((f, i) => {
    if (f.centroid.y > faces[top].centroid.y) top = i
  })
  set(top, 20)
  adjOf(top).forEach((fi, k) => set(fi, [2, 8, 14][k]))
  const pairs = [
      [3, 18],
      [4, 17],
      [5, 16],
      [6, 15],
      [9, 12],
      [10, 11],
    ],
    rem = [],
    seen = new Set()
  faces.forEach((f, i) => {
    if (val[i] === 0 && !seen.has(i)) {
      seen.add(i)
      seen.add(opp[i])
      rem.push(i)
    }
  })
  rem.sort(
    (a, b) =>
      Math.atan2(faces[a].centroid.z, faces[a].centroid.x) -
      Math.atan2(faces[b].centroid.z, faces[b].centroid.x),
  )
  rem.forEach((i, k) => {
    const lo = pairs[k % pairs.length][0]
    const hi = faces[i].centroid.y >= faces[opp[i]].centroid.y ? i : opp[i]
    set(hi, lo)
  })
  return val
}
function d3dMakeDie(sides, value, R, dropped) {
  const { geo, faces, box } = d3dBuild(sides, R),
    grp = new THREE.Group()
  const mesh = new THREE.Mesh(geo, d3dDieMat(box))
  mesh.userData.box = box
  mesh.castShadow = true
  grp.add(mesh)
  d3dLiveMeshes.push(mesh)
  const labelSize =
      R *
      (sides === 6
        ? 1.18
        : sides <= 6
          ? 0.92
          : sides <= 8
            ? 0.78
            : sides === 10
              ? 0.6
              : sides <= 12
                ? 0.7
                : 0.58),
    labels = []
  const std = sides === 20,
    layout = std ? d3dD20Layout(faces) : null
  faces.forEach((f, idx) => {
    const v = std ? layout[idx] : idx + 1,
      mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
    mat.map = d3dNumTex(v, sides)
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(labelSize, labelSize), mat)
    pl.position.copy(f.centroid).addScaledVector(f.normal, R * 0.02)
    pl.quaternion.copy(d3dLabelQuat(f.normal))
    grp.add(pl)
    const L = { mat, value: v, sides, normal: f.normal.clone() }
    labels.push(L)
    d3dLive.push(L)
  })
  d3dScene.add(grp)
  const d = {
    grp,
    mesh,
    geo,
    box,
    R,
    value,
    sides,
    labels,
    dropped: !!dropped,
    body: null,
    scale: 0,
    std,
  }
  if (std) {
    d.layout = layout
    d.normals = faces.map((f) => f.normal.clone())
    d.frames = faces.map(d3dFrameQuat)
  }
  return d
}
function d3dAttachBody(d) {
  const hb = (d.R * 0.7) / D3D_SCALE,
    shape = d.box ? new CANNON.Box(new CANNON.Vec3(hb, hb, hb)) : d3dConvex(d.geo)
  const body = new CANNON.Body({ mass: 1, material: d3dMatDie })
  body.addShape(shape)
  body.linearDamping = 0.1
  body.angularDamping = 0.22
  body.allowSleep = true
  body.sleepSpeedLimit = 0.6
  body.sleepTimeLimit = 0.08
  d.body = body
  d3dWorld.addBody(body)
  return body
}

// ---- lazy init ------------------------------------------------------------------------------------
function d3dEnsure() {
  if (d3dReady) return true
  if (d3dDead) return false
  try {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'position:fixed;inset:0;z-index:400;pointer-events:none'
    document.body.appendChild(canvas)
    d3dRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    d3dRenderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    d3dRenderer.shadowMap.enabled = true
    d3dRenderer.shadowMap.type = THREE.PCFSoftShadowMap
    d3dRenderer.outputEncoding = THREE.sRGBEncoding
    d3dScene = new THREE.Scene()
    d3dUP = new THREE.Vector3(0, 1, 0)
    d3dCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000)
    d3dCamera.position.set(0, 2000, 0)
    d3dCamera.up.set(0, 0, -1)
    d3dCamera.lookAt(0, 0, 0)
    d3dScene.add(new THREE.AmbientLight(0xffffff, 0.62))
    d3dKey = new THREE.DirectionalLight(0xffffff, 0.6)
    d3dKey.castShadow = true
    d3dKey.shadow.mapSize.set(2048, 2048)
    d3dKey.shadow.bias = -0.0008
    d3dScene.add(d3dKey)
    d3dScene.add(d3dKey.target)
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.28)
    fill.position.set(-400, 500, -300)
    d3dScene.add(fill)
    // Soft studio environment (image-based light) so the stone reads with a gentle sheen.
    try {
      const ec = document.createElement('canvas')
      ec.width = 256
      ec.height = 128
      const eg = ec.getContext('2d')
      const grd = eg.createLinearGradient(0, 0, 0, 128)
      grd.addColorStop(0, '#7c869c')
      grd.addColorStop(0.55, '#aab1c2')
      grd.addColorStop(1, '#2b303e')
      eg.fillStyle = grd
      eg.fillRect(0, 0, 256, 128)
      const rg = eg.createRadialGradient(80, 26, 2, 80, 26, 80)
      rg.addColorStop(0, '#ffffff')
      rg.addColorStop(1, 'rgba(255,255,255,0)')
      eg.fillStyle = rg
      eg.fillRect(0, 0, 256, 128)
      const et = new THREE.CanvasTexture(ec)
      et.mapping = THREE.EquirectangularReflectionMapping
      const pm = new THREE.PMREMGenerator(d3dRenderer)
      pm.compileEquirectangularShader()
      d3dScene.environment = pm.fromEquirectangular(et).texture
      et.dispose()
    } catch {
      /* environment is a nicety; skip on failure */
    }
    d3dGround = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    )
    d3dGround.rotation.x = -Math.PI / 2
    d3dGround.receiveShadow = true
    d3dScene.add(d3dGround)
    d3dWorld = new CANNON.World()
    d3dWorld.gravity.set(0, -D3D_GRAV, 0)
    d3dWorld.allowSleep = true
    d3dWorld.broadphase = new CANNON.NaiveBroadphase()
    d3dWorld.solver.iterations = 14
    d3dMatDie = new CANNON.Material('d')
    d3dMatFloor = new CANNON.Material('f')
    d3dMatWall = new CANNON.Material('w')
    d3dWorld.addContactMaterial(
      new CANNON.ContactMaterial(d3dMatFloor, d3dMatDie, { friction: 0.45, restitution: 0.18 }),
    )
    d3dWorld.addContactMaterial(
      new CANNON.ContactMaterial(d3dMatWall, d3dMatDie, { friction: 0.0, restitution: 0.45 }),
    )
    d3dWorld.addContactMaterial(
      new CANNON.ContactMaterial(d3dMatDie, d3dMatDie, { friction: 0.06, restitution: 0.16 }),
    )
    const floor = new CANNON.Body({ mass: 0, material: d3dMatFloor, shape: new CANNON.Plane() })
    floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    d3dWorld.addBody(floor)
    const mk = () => {
      const bd = new CANNON.Body({ mass: 0, material: d3dMatWall, shape: new CANNON.Plane() })
      d3dWorld.addBody(bd)
      return bd
    }
    const wL = mk(),
      wR = mk(),
      wF = mk(),
      wB = mk()
    wL.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2)
    wR.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2)
    wF.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI)
    d3dWalls = [wL, wR, wF, wB]
    addEventListener('resize', d3dResize)
    d3dResize()
    // Vecna bakes into the number textures only once it's loaded — re-bake the cache + live labels when ready.
    d3dLoadFont().then((ok) => {
      if (!ok) return
      d3dTexCache.clear()
      d3dLive.forEach((L) => {
        L.mat.map = d3dNumTex(L.value, L.sides)
        L.mat.needsUpdate = true
      })
    })
    d3dBuildCard()
    d3dReady = true
    return true
  } catch {
    d3dDead = true
    return false
  }
}
// The result card — total + label + auto-dismiss timer bar + a ghost reroll button. Hovering pauses the timer.
function d3dBuildCard() {
  const el = document.createElement('div')
  el.id = 'd3dCard'
  el.innerHTML =
    '<div class="d3dc-text"></div>' +
    '<button class="d3dc-rr" title="Reroll" aria-label="Reroll">' +
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>' +
    '<div class="d3dc-bar"></div>'
  document.body.appendChild(el)
  d3dCardEl = el
  el.addEventListener('pointerenter', () => {
    if (d3dRoll) d3dRoll.paused = true
  })
  el.addEventListener('pointerleave', () => {
    if (d3dRoll) d3dRoll.paused = false
  })
  el.querySelector('.d3dc-rr').addEventListener('click', (e) => {
    e.stopPropagation()
    d3dReroll()
  })
}
function d3dShowCard() {
  if (!d3dCardEl || !d3dRoll) return
  const d = d3dRoll.desc || {}
  d3dCardEl.querySelector('.d3dc-text').textContent = d.msg != null ? d.msg : d.label || 'Roll'
  d3dCardEl.querySelector('.d3dc-bar').style.width = '100%'
  d3dCardEl.classList.add('show')
}
function d3dHideCard() {
  if (d3dCardEl) d3dCardEl.classList.remove('show')
}
function d3dReroll() {
  const d = d3dRoll && d3dRoll.desc
  if (!d || typeof d.reroll !== 'function') return
  d3dClear()
  d.reroll()
}
// Dim the dice dropped by advantage/disadvantage so the kept one reads as selected.
function d3dDimDropped() {
  if (!d3dRoll) return
  d3dRoll.dice.forEach((d) => {
    if (!d.dropped) return
    d.mesh.material.transparent = true
    d.mesh.material.opacity = 0.2
    d.mesh.material.depthWrite = false
    d.mesh.material.needsUpdate = true
    d.labels.forEach((L) => {
      L.mat.opacity = 0.28
    })
  })
}
// Crit flourish: a vivid accent bloom + a glossy sheen sweep centred on the die that rolled its max face
// (preferring the d20), plus a snappy scale-pop driven per-frame in the loop. All DOM/CSS, honours reduced
// motion (the 3D layer already no-ops there).
let d3dCritEl = null
function d3dCritFlash() {
  try {
    if (!d3dRoll) return
    let focus = null
    d3dRoll.dice.forEach((d) => {
      if (d.value === d.sides && (!focus || d.sides === 20)) focus = d
    })
    let sx = d3dW / 2,
      sy = d3dH / 2,
      R = Math.min(d3dW, d3dH) / 9
    if (focus) {
      sx = d3dW / 2 + focus.grp.position.x
      sy = d3dH / 2 + focus.grp.position.z
      R = focus.R
    }
    if (!d3dCritEl) {
      d3dCritEl = document.createElement('div')
      d3dCritEl.id = 'd3dCrit'
      d3dCritEl.innerHTML =
        '<div class="d3dcrit-glow"></div><div class="d3dcrit-sheenwrap"><div class="d3dcrit-sheen"></div></div>'
      document.body.appendChild(d3dCritEl)
    }
    const glow = Math.round(R * 3.6),
      face = Math.round(R * 2.0)
    d3dCritEl.style.left = sx + 'px'
    d3dCritEl.style.top = sy + 'px'
    d3dCritEl.style.width = glow + 'px'
    d3dCritEl.style.height = glow + 'px'
    const sw = d3dCritEl.querySelector('.d3dcrit-sheenwrap')
    sw.style.width = face + 'px'
    sw.style.height = face + 'px'
    d3dCritEl.classList.remove('go')
    void d3dCritEl.offsetWidth
    d3dCritEl.classList.add('go')
    d3dRoll.critFocus = focus
    d3dRoll.critPulseT = 0
  } catch {
    /* flourish is cosmetic */
  }
}
function d3dCritEnd() {
  if (d3dCritEl) d3dCritEl.classList.remove('go')
}
function d3dCritPulse(t) {
  const D = 420
  if (t >= D) return 1
  return 1 + 0.22 * Math.sin((t / D) * Math.PI)
}
function d3dResize() {
  d3dW = innerWidth
  d3dH = innerHeight
  d3dRenderer.setSize(d3dW, d3dH)
  d3dCamera.left = -d3dW / 2
  d3dCamera.right = d3dW / 2
  d3dCamera.top = d3dH / 2
  d3dCamera.bottom = -d3dH / 2
  d3dCamera.updateProjectionMatrix()
  d3dGround.scale.set(d3dW * 2, d3dH * 2, 1)
  const span = Math.max(d3dW, d3dH)
  d3dKey.position.set(span * 0.28, span * 0.9, -span * 0.2)
  d3dKey.target.position.set(0, 0, 0)
  const s = d3dKey.shadow.camera
  s.left = -span
  s.right = span
  s.top = span
  s.bottom = -span
  s.near = 1
  s.far = span * 3
  s.updateProjectionMatrix()
  if (d3dWalls.length) {
    d3dWalls[0].position.set(-d3dW / 2 / D3D_SCALE, 0, 0)
    d3dWalls[1].position.set(d3dW / 2 / D3D_SCALE, 0, 0)
    d3dWalls[2].position.set(0, 0, d3dH / 2 / D3D_SCALE)
    d3dWalls[3].position.set(0, 0, -d3dH / 2 / D3D_SCALE)
  }
}
function d3dToWorld(sx, sy) {
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2((sx / d3dW) * 2 - 1, -((sy / d3dH) * 2 - 1)), d3dCamera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    out = new THREE.Vector3()
  ray.ray.intersectPlane(plane, out)
  return out
}

// ---- the roll -------------------------------------------------------------------------------------
function d3dAtRest(d) {
  if (!d.body) return true
  if (d.body.sleepState === CANNON.Body.SLEEPING) return true
  return (
    d.body.position.y < (d.R / D3D_SCALE) * 1.45 &&
    d.body.velocity.lengthSquared() < 0.5 &&
    d.body.angularVelocity.lengthSquared() < 1.0
  )
}
// Require the top face's y-normal to clearly beat the runner-up before accepting a rest; an ambiguous settle
// (die balanced on an edge) gets a small random nudge instead, so what's painted matches what's readable.
function d3dFaceMargin(d) {
  const q = d.body.quaternion,
    tq = new THREE.Quaternion(q.x, q.y, q.z, q.w)
  const normals = d.std ? d.normals : d.labels.map((L) => L.normal)
  let best = -2,
    second = -2
  normals.forEach((nm) => {
    const y = nm.clone().applyQuaternion(tq).y
    if (y > best) {
      second = best
      best = y
    } else if (y > second) second = y
  })
  return best - second
}
function d3dNudge(d) {
  d.body.angularVelocity.x += (Math.random() - 0.5) * 3
  d.body.angularVelocity.y += (Math.random() - 0.5) * 3
  d.body.angularVelocity.z += (Math.random() - 0.5) * 3
  d.body.velocity.y += 0.5 + Math.random() * 0.5
  d.body.wakeUp()
}
function d3dPreSim(dice) {
  const MAX = 900
  let restRun = 0,
    n = 0
  for (; n < MAX; n++) {
    d3dWorld.step(1 / 60)
    if (dice.every(d3dAtRest)) {
      if (++restRun >= 8) {
        const ambiguous = dice.filter((d) => d3dFaceMargin(d) < 0.06)
        if (!ambiguous.length) {
          n++
          break
        }
        ambiguous.forEach(d3dNudge)
        restRun = 0
      }
    } else restRun = 0
  }
  return n
}
function d3dResetBody(b, s) {
  b.position.copy(s.p)
  b.quaternion.copy(s.q)
  b.velocity.copy(s.v)
  b.angularVelocity.copy(s.av)
  ;['previousPosition', 'interpolatedPosition', 'initPosition'].forEach((k) => {
    if (b[k]) b[k].copy(s.p)
  })
  ;['previousQuaternion', 'interpolatedQuaternion', 'initQuaternion'].forEach((k) => {
    if (b[k]) b[k].copy(s.q)
  })
  b.force.set(0, 0, 0)
  b.torque.set(0, 0, 0)
  b.sleepState = 0
  b.timeLastSleepy = 0
}
function d3dUpValueBody(d) {
  const q = d.body.quaternion,
    tq = new THREE.Quaternion(q.x, q.y, q.z, q.w),
    v = new THREE.Vector3()
  let best = -2,
    val = d.labels[0].value
  d.labels.forEach((L) => {
    v.copy(L.normal).applyQuaternion(tq)
    if (v.y > best) {
      best = v.y
      val = L.value
    }
  })
  return val
}
// Paint the rolled value onto the up-facing face after the pre-roll. d20 = symmetry permutation (keeps the
// standard layout intact); other dice = simple value shift (their layout isn't user-scrutinised).
function d3dRelabel(d) {
  if (d.std) {
    const q = d.body.quaternion,
      tq = new THREE.Quaternion(q.x, q.y, q.z, q.w)
    let Fup = 0,
      best = -2
    d.normals.forEach((nm, i) => {
      const y = nm.clone().applyQuaternion(tq).y
      if (y > best) {
        best = y
        Fup = i
      }
    })
    const Ftar = d.layout.indexOf(d.value)
    if (Ftar < 0) return
    const S = d.frames[Ftar].clone().multiply(d.frames[Fup].clone().invert())
    d.labels.forEach((L, i) => {
      const sn = d.normals[i].clone().applyQuaternion(S)
      let bi = i,
        bd = -2
      d.normals.forEach((nm, j) => {
        const dot = sn.dot(nm)
        if (dot > bd) {
          bd = dot
          bi = j
        }
      })
      const nv = d.layout[bi]
      L.value = nv
      L.mat.map = d3dNumTex(nv, d.sides)
      L.mat.needsUpdate = true
    })
  } else {
    const off = d.value - d3dUpValueBody(d)
    d.labels.forEach((L) => {
      const nv = ((((L.value - 1 + off) % d.sides) + d.sides) % d.sides) + 1
      L.value = nv
      L.mat.map = d3dNumTex(nv, d.sides)
      L.mat.needsUpdate = true
    })
  }
}
function d3dClear() {
  if (d3dRoll) {
    d3dRoll.dice.forEach((d) => {
      d3dScene.remove(d.grp)
      if (d.body) d3dWorld.removeBody(d.body)
    })
  }
  d3dRoll = null
  d3dLive = []
  d3dLiveMeshes = []
  d3dHideCard()
  d3dCritEnd()
  if (d3dRenderer) d3dRenderer.clear()
}

// ---- cursor-die pickup (desktop hover) --------------------------------------------------------------
// On hover over a rollable ([data-roll]), one small die rides the cursor. Clicking rolls (the existing path)
// and the dice launch from the cursor. Touch devices have no hover, so they keep spawning from the tap point.
const D3D_HELD_SCALE = 0.4
function d3dPrimaryDie(formula) {
  const m = /d(\d+)/i.exec(String(formula || ''))
  const s = m ? +m[1] : 0
  return s >= 4 && s <= 100 ? s : 0
}
function d3dHoverOK() {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  } catch {
    return false
  }
  try {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return false
  } catch {
    return false
  }
  return true
}
function d3dHoverOver(e) {
  if (d3dDead || d3dRoll) return
  const t = e.target && e.target.closest && e.target.closest('[data-roll]')
  if (!t) return
  const sides = d3dPrimaryDie(t.dataset.roll)
  if (!sides || !d3dHoverOK()) return
  if (!d3dLibsReady()) {
    d3dLoadLibs()
    return
  } // desktop preload: hovering pulls the libs in so the click is 3D
  d3dPX = e.clientX
  d3dPY = e.clientY
  d3dHoldAt(sides)
}
function d3dHoverOut(e) {
  if (!d3dHeld) return
  const t = e.target && e.target.closest && e.target.closest('[data-roll]')
  if (!t) return
  const to = e.relatedTarget
  if (to && to.closest && to.closest('[data-roll]') === t) return
  d3dClearHeld()
}
function d3dHoldAt(sides) {
  if (d3dRoll || !d3dEnsure()) return
  if (d3dHeld && d3dHeld.sides === sides) return
  d3dClearHeld()
  const R = Math.max(20, Math.min(50, Math.round(Math.min(d3dW, d3dH) / 9)))
  const die = d3dMakeDie(sides, sides, R, false)
  die.scale = 0
  die.targetScale = D3D_HELD_SCALE
  const maxL = die.labels.find((L) => L.value === sides) || die.labels[0]
  die.heldQuat = new THREE.Quaternion().setFromUnitVectors(maxL.normal.clone().normalize(), d3dUP)
  d3dHeld = { die, sides, t: 0 }
  document.body.classList.add('dicing')
  if (!d3dLooping) {
    d3dLooping = true
    d3dPrev = performance.now()
    requestAnimationFrame(d3dLoop)
  }
}
function d3dClearHeld() {
  if (d3dHeld) {
    d3dScene.remove(d3dHeld.die.grp)
    d3dLive = d3dLive.filter((L) => d3dHeld.die.labels.indexOf(L) < 0)
    d3dLiveMeshes = d3dLiveMeshes.filter((m) => m !== d3dHeld.die.mesh)
    document.body.classList.remove('dicing')
  }
  d3dHeld = null
}
function d3dRenderHeld(dt) {
  const h = d3dHeld,
    d = h.die
  d.scale += (d.targetScale - d.scale) * Math.min(1, dt * 10)
  const c = d3dToWorld(d3dPX || d3dW / 2, d3dPY || d3dH / 2),
    j = performance.now() * 0.006
  d.grp.position.set(
    c.x + Math.sin(j) * d.R * 0.025,
    d.R * 0.9 + Math.cos(j * 1.2) * d.R * 0.02,
    c.z + Math.cos(j) * d.R * 0.025,
  )
  const wob = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.sin(j * 0.8) * 0.045, Math.sin(j * 0.5) * 0.05, Math.cos(j * 1.1) * 0.045),
  )
  d.grp.quaternion.copy(d.heldQuat).multiply(wob)
  const s = Math.max(0, d.scale)
  d.grp.scale.set(s, s, s)
}
function d3dSyncMeshes() {
  d3dRoll.dice.forEach((d) => {
    if (d.body) {
      const p = d.body.position,
        q = d.body.quaternion
      d.grp.position.set(p.x * D3D_SCALE, p.y * D3D_SCALE, p.z * D3D_SCALE)
      d.grp.quaternion.set(q.x, q.y, q.z, q.w)
    }
  })
}
// Throw the dice (parsed plan): spawn a non-overlapping grid above the cursor, tumble each, deterministically
// pre-roll → paint the value onto the up face → reset for the real-time replay. Returns { dice, N } (N = the
// fixed-step count the loop replays so the shown value never flips at rest).
function d3dLaunchWave(plan, R) {
  const c = d3dToWorld(d3dPX || d3dW / 2, d3dPY || d3dH / 2)
  const dice = plan.map((p) => d3dMakeDie(p.sides, p.value, R, p.dropped))
  const Rp = R / D3D_SCALE,
    cell = Rp * 2.4,
    cols = Math.ceil(Math.sqrt(dice.length)),
    rows = Math.ceil(dice.length / cols)
  const cx = c.x / D3D_SCALE,
    cz = c.z / D3D_SCALE,
    bx = (d3dW / 2 - R) / D3D_SCALE,
    bz = (d3dH / 2 - R) / D3D_SCALE
  dice.forEach((d, i) => {
    d3dAttachBody(d)
    const col = i % cols,
      rw = Math.floor(i / cols),
      gx = (col - (cols - 1) / 2) * cell,
      gz = (rw - (rows - 1) / 2) * cell
    d.body.position.set(
      d3dCl(cx + gx, -bx, bx),
      Rp * 1.7 + rw * Rp * 0.6 + Math.random() * Rp * 0.6,
      d3dCl(cz + gz, -bz, bz),
    )
    d.body.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)
    const ox = gx || Math.random() - 0.5,
      oz = gz || Math.random() - 0.5,
      ol = Math.hypot(ox, oz) || 1,
      sp = 6 + Math.random() * 5
    d.body.velocity.set((ox / ol) * sp, 1.5 + Math.random() * 3, (oz / ol) * sp)
    d.body.angularVelocity.set(
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 22,
      (Math.random() - 0.5) * 22,
    )
    d.body.wakeUp()
    d.init = {
      p: d.body.position.clone(),
      q: d.body.quaternion.clone(),
      v: d.body.velocity.clone(),
      av: d.body.angularVelocity.clone(),
    }
  })
  const N = d3dPreSim(dice)
  dice.forEach((d) => {
    d3dRelabel(d)
    d3dResetBody(d.body, d.init)
  })
  return { dice, N }
}
// Public entry — index.ts calls this with a descriptor {parts,total,label,msg,crit,reroll}. Returns true if it
// took over the notification (the caller then skips its 2D toast); false → the caller shows the toast.
export function rollDice3D(desc) {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  } catch {
    return false // no matchMedia (tests) → no 3D
  }
  const plan = d3dParse(desc && desc.parts)
  if (!plan.length) return false // no dice to render → caller's toast shows
  // Libs not in yet (touch first roll, no hover preload). Pull them in and let the caller show the 2D toast
  // for THIS roll; the next roll finds them ready and is 3D (T24 acceptance).
  if (!d3dLibsReady()) {
    d3dLoadLibs()
    return false
  }
  if (!d3dEnsure()) return false
  d3dClear()
  d3dClearHeld() // the held cursor-die (if any) launches into this roll
  const R = Math.max(
    20,
    Math.min(
      50,
      Math.round(
        Math.min(d3dW, d3dH) /
          (plan.length <= 2 ? 9 : plan.length <= 6 ? 11 : plan.length <= 12 ? 14 : 17),
      ),
    ),
  )
  const w = d3dLaunchWave(plan, R)
  d3dRoll = {
    dice: w.dice,
    state: 'fly',
    t: 0,
    acc: 0,
    replayN: w.N,
    played: 0,
    paused: false,
    desc: desc || {},
    R,
  }
  d3dPrev = performance.now()
  if (!d3dLooping) {
    d3dLooping = true
    requestAnimationFrame(d3dLoop)
  }
  return true
}
function d3dLoop(now) {
  const dt = Math.min(0.033, (now - d3dPrev) / 1000)
  d3dPrev = now
  if (d3dRoll) {
    const r = d3dRoll
    if (r.critPulseT != null) {
      r.critPulseT += dt * 1000
      const pf = d3dCritPulse(r.critPulseT)
      if (r.critFocus) r.critFocus.critPulse = pf
      else r.dice.forEach((d) => (d.critPulse = pf))
    }
    if (r.state === 'fly') {
      r.t += dt * 1000
      r.acc += dt
      while (r.acc >= 1 / 60 && r.played < r.replayN) {
        d3dWorld.step(1 / 60)
        r.acc -= 1 / 60
        r.played++
      }
      r.dice.forEach((d) => (d.scale += (1 - d.scale) * Math.min(1, dt * 12)))
      d3dSyncMeshes()
      if (r.played >= r.replayN) {
        r.dice.forEach((d) => {
          if (d.body) {
            d3dWorld.removeBody(d.body)
            d.body = null
          }
        })
        r.state = 'still'
        r.t = 0
        d3dDimDropped()
        d3dShowCard()
        if (r.desc.crit && !r.critFired) {
          d3dCritFlash()
          r.critFired = true
        }
      }
    } else if (r.state === 'still') {
      if (!r.paused) r.t += dt * 1000
      if (d3dCardEl)
        d3dCardEl.querySelector('.d3dc-bar').style.width =
          100 * (1 - d3dCl(r.t / D3D_DWELL, 0, 1)) + '%'
      if (r.t >= D3D_DWELL) {
        r.state = 'vanish'
        r.t = 0
        d3dHideCard()
      }
    } else if (r.state === 'vanish') {
      r.t += dt * 1000
      const k = d3dCl(r.t / D3D_VANISH, 0, 1)
      r.dice.forEach((d) => {
        if (k < 0.16) {
          d.scale = 1 + 0.1 * (1 - Math.pow(1 - k / 0.16, 3))
        } else {
          const ss = (k - 0.16) / 0.84
          d.scale = 1.1 * (1 - ss * ss * ss * ss)
        }
        const e = new THREE.Euler(0, 4 * dt, 0)
        d.grp.quaternion.multiply(new THREE.Quaternion().setFromEuler(e))
      })
      if (r.t >= D3D_VANISH) {
        d3dClear()
      }
    }
    if (d3dRoll)
      d3dRoll.dice.forEach((d) => {
        const s = Math.max(0, d.scale) * (d.critPulse || 1)
        d.grp.scale.set(s, s, s)
      })
    d3dRenderer.render(d3dScene, d3dCamera)
    requestAnimationFrame(d3dLoop)
  } else if (d3dHeld) {
    d3dRenderHeld(dt)
    d3dRenderer.render(d3dScene, d3dCamera)
    requestAnimationFrame(d3dLoop)
  } else {
    d3dRenderer.render(d3dScene, d3dCamera) // one last clear frame
    d3dLooping = false // idle → stop the loop until the next roll/hover
  }
}
