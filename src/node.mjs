/**
 * node.mjs — Node adapter: PNG encoding (sharp) + file output + the
 * harness-compatible renderSession(client, prefix, outDir, options) entry.
 *
 * Everything portable lives in core.mjs; this file only adds what needs
 * Node (sharp, filesystem).
 */

import sharp from 'sharp'
import { renderSessionData, setViewport } from './core.mjs'

export * from './core.mjs'
export * from './stl.mjs'

/** Encode an RGBA pixel buffer as PNG bytes. */
export async function pixelsToPng(pixels, width, height) {
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

/** Save an RGBA pixel buffer as a PNG file. */
export async function savePNG(pixels, width, height, path) {
  await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(path)
}

/** Rasterize an SVG string to PNG bytes. */
export async function svgToPngBuffer(svg) {
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Rasterize an SVG string to a PNG file. */
export async function svgToPng(svg, pngPath) {
  await sharp(Buffer.from(svg)).png().toFile(pngPath)
}

/**
 * Fetch the freshest graphic payload from a live harness client: recalc first
 * (cached graphic may be stale/intermediate), fall back to the client's
 * accumulated last graphic.
 *
 * CAVEAT: `common.recalc` DESTROYS entity-injection (EIF/direct-modeling)
 * bodies. Pass `recalc: false` when the session used solid.* / entityInjection
 * flows — the accumulated graphic is used as-is then.
 */
export async function fetchGraphic(client, { recalc = true } = {}) {
  const { execute, getLastGraphic } = client
  let graphic = null
  if (recalc) {
    try {
      const r = await execute({ 'v1.common.recalc': [{}] })
      if (r.graphic?.containers?.some(c => c.meshes?.length > 0 || c.edges?.length > 0)) {
        graphic = r.graphic
      }
    } catch (e) { /* fall back below */ }
  }
  if (!graphic?.containers?.some(c => c.meshes?.length > 0 || c.edges?.length > 0)) {
    graphic = getLastGraphic?.() ?? graphic
  }
  return graphic
}

/**
 * Render all visible content of a live session to PNG files — the drop-in
 * equivalent of the classcad-agent harness renderer.
 *
 * @param {{ execute: Function, request: Function, getLastGraphic?: Function }} client
 * @param {string} prefix — output file prefix
 * @param {string} outDir — output directory
 * @param {object} [options] — width/height/view/zoom/lookAt (see core.renderSessionData)
 *   plus `recalc` (default true; set false for EIF/direct-modeling sessions)
 * @returns {Promise<{ type: string, file: string }[]>}
 */
export async function renderSession(client, prefix, outDir, options = {}) {
  // Without these database settings the server omits brep EDGE data from the
  // graphic containers — solids then render without their edge overlay. The
  // classcad-agent harness sets this before every snapshot; do the same here
  // so package consumers get the full render by default. (ensureGraphics:
  // false skips it, e.g. when the app manages settings itself.)
  if (options.ensureGraphics !== false) {
    try {
      await client.execute({
        'v1.common.setDatabaseSettings': [
          { isGraphicEnabled: true, isCCGraphicEnabled: true, isSketchGraphicEnabled: true, doCurveTessellation: true },
        ],
      })
    } catch (e) { /* older servers may not support it — render without edges */ }
  }
  const treeResult = await client.request('GetTree')
  const tree = treeResult.structure?.tree || {}
  const graphic = await fetchGraphic(client, { recalc: options.recalc !== false })

  const entries = await renderSessionData(
    { tree, graphic, execute: task => client.execute(task) },
    options,
  )

  const rendered = []
  for (const e of entries) {
    let file
    if (e.type === 'solid') file = `${prefix}-solid.png`
    else if (e.type === 'sketch') file = `${prefix}-sketch-${String(e.name).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
    else if (e.type === 'curves') file = `${prefix}-curves.png`
    else file = `${prefix}-${e.type}.png`

    if (e.kind === 'pixels') await savePNG(e.pixels, e.width, e.height, `${outDir}/${file}`)
    else await svgToPng(e.svg, `${outDir}/${file}`)

    const entry = { type: e.type, file }
    if (e.sketchId != null) { entry.sketchId = e.sketchId; entry.name = e.name }
    rendered.push(entry)
  }
  return rendered
}

// Re-exported under its historical harness name.
export { setViewport }
