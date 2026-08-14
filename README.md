# @classcad/renderer

Deterministic renderer for [ClassCAD](https://classcad.ch)/[buerli](https://buerli.io)
session data. Same input → same image, every time: fixed CAD views, auto-fit framing,
no camera state, no GPU. Built for agents and pipelines that need to *verify* geometry
visually — not for interactive display.

What it renders, auto-detected from the structure tree:

- **Solids** — z-buffer rasterizer from the engine's graphic payload (meshes + edges),
  per-body color palette, back-face culling, edge overlay. **Assemblies** place every
  instance via the composed `coordinateSystem` transforms along the product tree.
- **Sketches** — lines/circles/arcs/points from API queries, construction geometry
  dashed, **dimension annotations** (linear/radial/diameter/angular with extension
  lines and arrowheads) and **constraint badges**, placed by a force-directed
  label de-overlap pass.
- **Curves** — tessellated 2D curve shapes.
- **Work geometry** — planes, axes, points, coordinate-system triads.

Views: `iso` (default), `top`, `bottom`, `front`, `back`, `left`, `right` — plus
`zoom` and `lookAt` for detail shots. Arcs are swept from their signed **bulge**
(`tan(sweep/4)`), so major arcs (> 180°) render correctly.

## Layout

| Entry | Environment | Contents |
| --- | --- | --- |
| `@classcad/renderer` (root) / `./core` | browser + Node, zero deps | all rendering: `renderSessionData`, `renderSolidZBuffer`, `renderSketchSVG`, `renderCurveSVG`, `renderWorkGeoSVG`, extraction helpers, `setViewport`, `VIEW_NAMES` |
| `./node` | Node (needs `sharp`) | PNG encode/save, `svgToPng`, and the harness-compatible `renderSession(client, prefix, outDir, options)` |
| `./browser` | browser, zero deps | canvas PNG encoding: `entryToPngBase64`, `pixelsToPngBase64`, `svgToPngBase64` |
| `./stl` | anywhere | STL-triangle renderer (`parseSTL` + `renderIsometric`) — renders the EXPORTED file, independent of the graphic pipeline; use for export verification or graphics-disabled clients |

The core is **pure data → pixels/SVG**. It needs three things, all injectable:
the structure `tree`, the `graphic` payload (containers with meshes/edges), and —
for sketches only — an `execute(task)` function for the geometry queries.

## Node (MCPs, harnesses, CI)

```js
import { renderSession } from '@classcad/renderer/node'

// client: { execute, request, getLastGraphic } — e.g. the classcad-agent harness client
const files = await renderSession(client, 'my-part', './out', { view: 'iso' })
// → [{ type: 'solid', file: 'my-part-solid.png' }, { type: 'sketch', file: '…' }, …]

// Detail shot: front view, 3× zoom, centered on a point of interest
await renderSession(client, 'detail', './out', { view: 'front', zoom: 3, lookAt: [0, 0, 25] })
```

> `renderSession` recalcs by default to get fresh graphic state. `common.recalc`
> **destroys entity-injection (direct-modeling) bodies** — pass `{ recalc: false }`
> for sessions built with `solid.*`/EIF flows.

> **Edges need database settings.** The engine only includes brep edge data in
> graphic containers after `v1.common.setDatabaseSettings({ isGraphicEnabled: true,
> isCCGraphicEnabled: true, isSketchGraphicEnabled: true, doCurveTessellation: true })`.
> `renderSession` sets this automatically (`ensureGraphics: false` to skip). When
> feeding `renderSessionData` yourself (browser/core), make sure the session had
> these settings before the graphic was produced — otherwise solids render
> without their edge overlay.

Lower-level (no files): `renderSessionData` + `pixelsToPng`/`svgToPngBuffer`.

## Browser (buerli-ai, custom apps)

```js
import { renderSessionData } from '@classcad/renderer'          // pure core
import { entryToPngBase64 } from '@classcad/renderer/browser'   // canvas PNG encode

const entries = await renderSessionData(
  {
    tree,                                  // drawing structure tree
    graphic,                               // graphic payload (containers)
    execute: task => myExecute(task),      // optional — enables sketch renders
  },
  { view: 'iso', width: 1024, height: 768 },
)
const base64Png = await entryToPngBase64(entries[0])
```

This gives an agent a **deterministic snapshot** independent of the user's live
viewport: standard view, whole model in frame, reproducible for before/after
comparison.

## Determinism

- No wall clock, no randomness, no GPU — pure CPU rasterization.
- Same session data + same options ⇒ byte-identical pixel buffers (the smoke test
  asserts this).
- Auto-fit derives framing from the geometry alone; `zoom`/`lookAt` are explicit
  parameters, never state.

## Provenance

Extracted from the `classcad-agent` training harness (`scripts/render.mjs`,
`scripts/render-direct.mjs`), where it was battle-tested across the ClassCAD API
training sessions (solids, constrained sketches with live dimensions, assemblies,
patterns, direct modeling).
