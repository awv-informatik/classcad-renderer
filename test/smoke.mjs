/**
 * smoke.mjs — offline smoke test with synthetic session data.
 *
 * No ClassCAD server needed: feeds renderSessionData a hand-built structure
 * tree + graphic payload (a unit cube) and a fake execute for a sketch, then
 * checks every render path produces output and that rendering is DETERMINISTIC
 * (two runs → byte-identical pixels).
 */

import { strict as assert } from 'assert'
import { mkdirSync } from 'fs'
import { renderSessionData, renderSolidZBuffer, VIEW_NAMES } from '../src/core.mjs'
import { renderIsometric } from '../src/stl.mjs'

// ── Synthetic cube graphic (12 triangles, 8 vertices, per-vertex normals) ──
function cubeGraphic(size = 10) {
  const s = size
  const V = [
    [0, 0, 0], [s, 0, 0], [s, s, 0], [0, s, 0],
    [0, 0, s], [s, 0, s], [s, s, s], [0, s, s],
  ]
  const quads = [
    [0, 3, 2, 1, [0, 0, -1]], [4, 5, 6, 7, [0, 0, 1]],
    [0, 1, 5, 4, [0, -1, 0]], [2, 3, 7, 6, [0, 1, 0]],
    [1, 2, 6, 5, [1, 0, 0]], [0, 4, 7, 3, [-1, 0, 0]],
  ]
  const vertices = [], normals = [], indices = []
  let vi = 0
  for (const [a, b, c, d, n] of quads) {
    for (const idx of [a, b, c, d]) {
      vertices.push(...V[idx])
      normals.push(...n)
    }
    indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3)
    vi += 4
  }
  return {
    containers: [{
      id: 100, owner: 30, type: 1,
      properties: { material: { color: [0.5, 0.5, 0.5], opacity: 1 }, layer: '0' },
      meshes: [{ id: 1, vertices, normals, indices }],
      edges: [{ id: 2, points: [0, 0, 0, s, 0, 0, s, s, 0, 0, s, 0, 0, 0, 0] }],
    }],
    properties: { version: 9 },
  }
}

const tree = {
  '20': { id: 20, class: 'CC_Part', name: 'Part', parent: null, children: [30, 40] },
  '30': { id: 30, class: 'CC_Solid', name: 'Solid', parent: 20 },
  '40': { id: 40, class: 'CC_Sketch', name: 'TestSketch', parent: 20 },
}

// Fake execute serving one sketch: a 20×10 rectangle line + a circle r=5.
const sketchGeom = { lines: [41], circles: [42], arcs: [], points: [] }
async function fakeExecute(task) {
  const [key, [params]] = Object.entries(task)[0]
  if (key === 'v1.sketch.getGeometry') return { result: sketchGeom }
  if (key === 'v1.sketch.getPositions') {
    if (params.id === 41) return { result: { startPos: { x: 0, y: 0 }, endPos: { x: 20, y: 10 } } }
    if (params.id === 43) return { result: { pos: { x: 30, y: 5 } } }
    return { result: null }
  }
  if (key === 'v1.sketch.getPoints') {
    if (params.id === 41) return { result: { startId: 44, endId: 45 } }
    if (params.id === 42) return { result: { centerId: 43 } }
    return { result: null }
  }
  return { result: null }
}
tree['42'] = { id: 42, class: 'CC_2DCircle', name: 'C1', parent: 40, members: { Radius: { value: 5 } } }

const graphic = cubeGraphic()

// 1. Full orchestrator: solid + sketch entries
const entries = await renderSessionData({ tree, graphic, execute: fakeExecute }, { width: 400, height: 300 })
const types = entries.map(e => e.type).sort()
assert.deepEqual(types, ['sketch', 'solid'], `expected solid+sketch, got ${types}`)
const solid = entries.find(e => e.type === 'solid')
assert.equal(solid.kind, 'pixels')
assert.equal(solid.pixels.length, 400 * 300 * 4)
const sketch = entries.find(e => e.type === 'sketch')
assert.ok(sketch.svg.includes('<svg') && sketch.svg.includes('polyline'), 'sketch SVG has geometry')

// 2. The cube must actually cover pixels (not a blank frame)
let colored = 0
for (let i = 0; i < solid.pixels.length; i += 4) {
  if (solid.pixels[i] !== 255 || solid.pixels[i + 1] !== 255 || solid.pixels[i + 2] !== 255) colored++
}
assert.ok(colored > 5000, `cube covers ${colored} px — expected > 5000`)

// 3. Determinism: run twice, byte-compare
const entries2 = await renderSessionData({ tree, graphic, execute: fakeExecute }, { width: 400, height: 300 })
const solid2 = entries2.find(e => e.type === 'solid')
assert.ok(Buffer.compare(Buffer.from(solid.pixels), Buffer.from(solid2.pixels)) === 0, 'pixel-identical across runs')
assert.equal(sketch.svg, entries2.find(e => e.type === 'sketch').svg, 'SVG identical across runs')

// 4. Every view renders without throwing and stays deterministic
for (const view of VIEW_NAMES) {
  const [a] = await renderSessionData({ tree, graphic }, { width: 200, height: 150, view })
  const [b] = await renderSessionData({ tree, graphic }, { width: 200, height: 150, view })
  assert.ok(a?.pixels?.length === 200 * 150 * 4, `view ${view} renders`)
  assert.ok(Buffer.compare(Buffer.from(a.pixels), Buffer.from(b.pixels)) === 0, `view ${view} deterministic`)
}

// 5. Assembly transforms: two instances of the same part must render twice the coverage region
const asmTree = {
  '10': { id: 10, class: 'CC_AssemblyRoot', name: 'Root', parent: null, children: [11, 12] },
  '11': { id: 11, class: 'CC_ProductReference', name: 'I1', parent: 10, members: { productId: { value: 20 } }, coordinateSystem: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  '12': { id: 12, class: 'CC_ProductReference', name: 'I2', parent: 10, members: { productId: { value: 20 } }, coordinateSystem: [[30, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  '20': { id: 20, class: 'CC_Part', name: 'Part', parent: 10, children: [30] },
  '30': { id: 30, class: 'CC_Solid', name: 'Solid', parent: 20 },
}
const [asm] = await renderSessionData({ tree: asmTree, graphic }, { width: 400, height: 300 })
// Both instances must land in the frame: colored pixels in the LEFT and RIGHT
// quarter of the image (two cubes 30 units apart under auto-fit), which a
// single instance stacked at the template origin could never produce.
const coloredAt = x => {
  for (let y = 0; y < asm.height; y++) {
    const i = (y * asm.width + x) * 4
    if (asm.pixels[i] !== 255 || asm.pixels[i + 1] !== 255 || asm.pixels[i + 2] !== 255) return true
  }
  return false
}
const leftHit = Array.from({ length: 100 }, (_, x) => x).some(coloredAt)
const rightHit = Array.from({ length: 100 }, (_, x) => 300 + x).some(coloredAt)
assert.ok(leftHit && rightHit, `assembly places both instances (left ${leftHit}, right ${rightHit})`)

// 5a. Color modes: native uses the model's material, distinct uses the palette
{
  const redGraphic = cubeGraphic()
  redGraphic.containers[0].properties.material.color = [255, 40, 40]
  // Majority hue over all body pixels (edges share their own dark color — a
  // first-hit sample can land on an edge, so count instead).
  const hueCounts = px => {
    let red = 0, blue = 0
    for (let i = 0; i < px.length; i += 4) {
      const [r, , b] = [px[i], px[i+1], px[i+2]]
      if (r === 255 && px[i+1] === 255 && b === 255) continue
      if (r > b) red++
      else if (b > r) blue++
    }
    return { red, blue }
  }
  const [nat] = await renderSessionData({ tree, graphic: redGraphic }, { width: 200, height: 150 })
  const [dis] = await renderSessionData({ tree, graphic: redGraphic }, { width: 200, height: 150, colors: 'distinct' })
  const nc = hueCounts(nat.pixels), dc = hueCounts(dis.pixels)
  assert.ok(nc.red > nc.blue * 2, `native mode is red-dominant (got ${JSON.stringify(nc)})`)
  assert.ok(dc.blue > dc.red * 2, `distinct mode uses the blue palette (got ${JSON.stringify(dc)})`)
}

// 5b. Generalized camera: named-view equivalences + arbitrary views
{
  const px = async view => (await renderSessionData({ tree, graphic }, { width: 200, height: 150, view }))[0].pixels
  assert.ok(Buffer.compare(Buffer.from(await px('front')), Buffer.from(await px({ azimuth: 0, elevation: 0 }))) === 0,
    '{az:0,el:0} === front')
  assert.ok(Buffer.compare(Buffer.from(await px('front')), Buffer.from(await px({ direction: [0, 1, 0] }))) === 0,
    '{direction:[0,1,0]} === front')
  assert.ok(Buffer.compare(Buffer.from(await px('top')), Buffer.from(await px({ direction: [0, 0, -1] }))) === 0,
    '{direction:[0,0,-1]} === top')
  const oblique1 = await px({ azimuth: 30, elevation: 20 })
  const oblique2 = await px({ azimuth: 30, elevation: 20 })
  assert.ok(Buffer.compare(Buffer.from(oblique1), Buffer.from(oblique2)) === 0, 'oblique camera deterministic')
  assert.ok(Buffer.compare(Buffer.from(oblique1), Buffer.from(await px({ azimuth: 60, elevation: 20 }))) !== 0,
    'different azimuth → different image')
}

// 6. STL export-verification path
const tri = renderIsometric([{ normal: [0, 0, 1], vertices: [[0, 0, 0], [10, 0, 0], [0, 10, 0]] }], 200, 150)
assert.equal(tri.length, 200 * 150 * 4)

// 6b. Explicit failure: session has solids but NO graphic data → renderSession
// throws with cause + remedies (never a silent empty render). Mock client:
// GetTree reports a solid, but no graphic arrives from any source.
try {
  const { renderSession } = await import('../src/node.mjs')
  const mockClient = {
    request: async () => ({ structure: { tree } }),           // tree contains CC_Solid 30
    execute: async () => ({ result: null }),                  // recalc yields nothing
    getLastGraphic: () => null,                               // no cached graphic either
  }
  let threw = null
  try {
    await renderSession(mockClient, 'x', '/tmp', {})
  } catch (e) {
    threw = e
  }
  assert.ok(threw, 'renderSession throws when solids have no graphic')
  assert.ok(/No graphic data/.test(threw.message) && /source: 'stl'/.test(threw.message),
    'error names the cause and the stl remedy')
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') console.log('explicit-failure test: sharp not installed — skipped')
  else throw e
}

// 7. Node adapter: PNG bytes come out (skip silently if sharp is missing)
try {
  const { pixelsToPng, svgToPngBuffer } = await import('../src/node.mjs')
  const png = await pixelsToPng(solid.pixels, solid.width, solid.height)
  assert.ok(png.length > 1000 && png[0] === 0x89 && png[1] === 0x50, 'valid PNG bytes')
  const sk = await svgToPngBuffer(sketch.svg)
  assert.ok(sk.length > 1000 && sk[0] === 0x89, 'sketch SVG → PNG')
  mkdirSync(new URL('./out', import.meta.url).pathname, { recursive: true })
  const { savePNG, svgToPng } = await import('../src/node.mjs')
  await savePNG(solid.pixels, solid.width, solid.height, new URL('./out/cube.png', import.meta.url).pathname)
  await svgToPng(sketch.svg, new URL('./out/sketch.png', import.meta.url).pathname)
  console.log('node adapter: PNGs written to test/out/')
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') console.log('node adapter: sharp not installed — skipped')
  else throw e
}

console.log('SMOKE OK — solid, sketch, all views deterministic, assembly transforms, STL, PNG encode')
