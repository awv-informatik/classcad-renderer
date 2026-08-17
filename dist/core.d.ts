import type { AssemblyInstance, CameraView, DiffResult, Frame, Graphic, OverlayPolyline, RasterResult, RenderOptions, SessionEntry, SessionSource, SolidRenderOptions, Tree, Vec3, RGB } from './types.js';
export declare const VIEW_NAMES: string[];
/**
 * Configure viewport for the next render. Called at the start of renderSession.
 * @param {object} opts
 * @param {string|object} [opts.view='iso'] — one of VIEW_NAMES, or a camera
 *   object: { azimuth, elevation } (degrees) or { direction: [x,y,z], up? }
 * @param {number} [opts.zoom=1] — multiplier on the auto-fit scale
 * @param {[number,number,number]|null} [opts.lookAt=null] — 3D point that lands at screen center
 * @param {{scale:number,midX:number,midY:number}|null} [opts.frame=null] — REUSE a
 *   frame returned by an earlier render (same view + image size): pins scale and
 *   center so renders of different model states are pixel-comparable. Overrides
 *   auto-fit, zoom and lookAt.
 */
export declare function setViewport(opts?: {
    view?: CameraView;
    zoom?: number;
    lookAt?: Vec3;
    frame?: Frame;
}): void;
/**
 * Walk the assembly tree and produce one entry per leaf part instance with the
 * cumulative world transform. Returns null when the drawing has no
 * CC_AssemblyRoot (single-part drawing — caller renders templates flat).
 */
export declare function extractAssemblyInstances(tree: Tree): AssemblyInstance[] | null;
export declare const COLOR_MODES: string[];
/**
 * Z-buffer rasterizer for solid rendering. Eliminates all Z-fighting artifacts.
 * When `instances` is provided (assemblies), each draw applies its world
 * transform before projection; the palette keys per template, so all copies
 * of the same part share a color.
 *
 * The last parameter is either a color-mode string ('native' | 'distinct') or
 * an options object:
 *   colors    — 'native' | 'distinct' (see COLOR_MODES)
 *   section   — { origin, normal } clipping plane (see normalizeSection)
 *   highlight — array of ids to render in SIGNAL ORANGE. Ids match graphic
 *               containers (container.id), their owning solids (container.owner),
 *               individual faces (mesh.id) and edges (edge.id). CAUTION: face
 *               mesh/edge ids are only stable within ONE graphic payload —
 *               re-tessellation reassigns them. Across recalcs/tool boundaries
 *               use highlightAt instead (or body/solid ids, which are tree-stable).
 *   highlightAt — array of world points [[x,y,z],…]: the closest face in THIS
 *               payload is highlighted per point. Geometrically anchored —
 *               robust where raw ids are not.
 *   markers   — [{ position: [x,y,z], label?, color? }] probe markers drawn ON
 *               TOP of everything (no depth test): crosshair + optional label.
 *   xray      — true: render bodies translucent (painter's blend, fixed alpha
 *               ~0.42; xrayAlpha overrides). Hidden bodies and internal far
 *               walls shine through; edges stay fully opaque on top. Back
 *               faces remain culled, so images stay readable.
 *   annotate  — true: draw a measurement overlay — world-space bounding-box
 *               extents (X x Y x Z, model units, bottom right), an RGB axes
 *               triad oriented like the current view (bottom left), and a
 *               scale bar with a round model-unit length (bottom center).
 *   overlays  — [{ pts: [[x,y,z],…], color?, dashed? }] world-space polylines
 *               drawn on top (no depth test), e.g. sketch curves in 3D. Overlay
 *               points participate in auto-fit, and they alone are enough to
 *               produce a render (a sketch-only session renders on white).
 * Returns { pixels, width, height, frame } or null if no geometry.
 */
export declare function renderSolidZBuffer(graphic: Graphic, width?: number, height?: number, instances?: AssemblyInstance[] | null, optsOrColorMode?: SolidRenderOptions | string): RasterResult | null;
export declare function renderSolidSVG(graphic: any, width?: any, height?: any, instances?: any, colorMode?: any): string | null;
/**
 * Extract dimension data from the structure tree for a given sketch.
 * Walks the tree looking for CC_SketchDimensionSet with owner === sketchId,
 * then collects all CC_*FeatureDimension children.
 */
export declare function extractDimensions(tree: any, sketchId: any): any[];
/**
 * Extract constraint data from the structure tree for a given sketch.
 * Skips auto-generated constraints (name starts with "Auto_").
 */
export declare function extractConstraints(tree: any, sketchId: any): any[];
/**
 * Fetch all sketch geometry with positions.
 * @param {Function} execute — execute({ 'v1.xxx': [params] })
 * @param {number} sketchId
 * @param {object} structureTree — for circle radius lookup
 */
export declare function fetchSketchData(execute: any, sketchId: any, structureTree?: any): Promise<{
    items: any[];
    posMap: Record<string, any>;
} | null>;
export declare function renderSketchSVG(items: any, width?: any, height?: any, dimensions?: any, constraints?: any, posMap?: any): string | null;
/**
 * Extract curve geometry from graphic containers of type 2 (curve containers).
 * Renders edges that the server tessellated (lines, polylines).
 * For untessellated curves, falls back to bounding box or skips.
 */
export declare function renderCurveSVG(graphic: any, width?: any, height?: any): string | null;
/**
 * Extract work geometry definitions from the structure tree.
 * Returns arrays of { id, name, ...params } for each type.
 */
export declare function extractWorkGeometry(tree: any): {
    planes: any[];
    axes: {
        id: number;
        name: any;
        pos: any;
        dir: any;
        length: any;
    }[];
    points: {
        id: number;
        name: any;
        pos: any;
    }[];
    csyses: {
        id: number;
        name: any;
        origin: {
            x: any;
            y: any;
            z: any;
        };
        xDir: {
            x: any;
            y: any;
            z: any;
        };
        yDir: {
            x: any;
            y: any;
            z: any;
        };
        zDir: {
            x: any;
            y: any;
            z: any;
        };
        offset: any;
    }[];
};
/**
 * Render work geometry as isometric SVG overlay.
 * @param {object} workGeo — from extractWorkGeometry()
 * @param {number} width
 * @param {number} height
 * @param {Array} [extraPts2d] — additional 2D points for fitting the view (from solid rendering)
 * @returns {string|null} SVG string, or null if nothing to render
 */
export declare function renderWorkGeoSVG(workGeo: any, width?: any, height?: any, extraPts2d?: any): string | null;
/**
 * Analyze structure tree and return content types present.
 * @param {object} tree — structure.tree from GetTree
 * @returns {{ solids: number[], sketches: number[], curves: number[], eifs: number[] }}
 */
/**
 * Adaptive snapshot tessellation (PORTABLE — every host adapter uses this).
 * The engine's default faceting (chordHeightTol 0.1 in MODEL UNITS,
 * worker-global) is far too coarse for small arcs — and catastrophically so
 * for inch models (0.1 in = 2.54 mm can exceed a feature radius entirely, so
 * its faces render as angular polygons while the separately-tessellated brep
 * edges stay smooth and poke out of the silhouette). This scales the chord
 * tolerance to the model size (bbox diagonal / 3000, clamped) and applies it.
 * The CALLER must then re-tessellate (recalc + refetch) and afterwards RESTORE
 * the returned previous parameters — faceting params persist worker-globally
 * across sessions, so leaving a tiny tolerance behind would silently balloon
 * every later session's payloads.
 *
 * @param host — anything with `execute(task) -> envelope` (node client or
 *   browser ScriptSession)
 * @returns the previous params to restore, or null when nothing was changed.
 */
export declare function applyAdaptiveFaceting(host: {
    execute: (task: any) => Promise<any>;
}, probeGraphic: any): Promise<{
    angleTol: number;
    chordHeightTol: number;
} | null>;
export declare function analyzeSession(tree: Tree): {
    solids: number[];
    sketches: number[];
    curves: number[];
    eifs: number[];
    workGeo: number[];
};
/**
 * Draw text into an RGBA buffer with the built-in 5×7 font. Uppercases input;
 * unknown characters render as space. Returns the pixel width drawn.
 */
export declare function drawText(pixels: Uint8Array, width: number, height: number, x: number, y: number, text: string, color?: RGB | number[], scale?: number): number;
/** Measure text width in pixels for the built-in font. */
export declare function measureText(text: string, scale?: number): number;
/**
 * Render four views of the solids into ONE image (quadrants TL, TR, BL, BR).
 * Default layout: top / iso / front / right — third-angle-ish (top above
 * front, right beside front, iso in the free corner). All ORTHO views share a
 * COMMON scale (like a technical drawing), the iso quadrant auto-fits itself.
 * Labels use the built-in font.
 *
 * @param {object} graphic — graphic payload (containers)
 * @param {number} width/height — sheet size
 * @param {Array|null} instances — assembly instances (see renderSolidZBuffer)
 * @param {object} [opts] — { views: [tl,tr,bl,br], colors, section }
 * @returns {{pixels,width,height}|null}
 */
export declare function renderSolidSheet(graphic: Graphic, width?: number, height?: number, instances?: AssemblyInstance[] | null, opts?: SolidRenderOptions & {
    views?: CameraView[];
}): RasterResult | null;
/**
 * Turn one sketch's geometry (fetchSketchData items — WORLD coordinates) into
 * 3D overlay polylines for renderSolidZBuffer. Circles/arcs are tessellated in
 * the sketch plane, taken from the sketch node's coordinateSystem
 * ([origin, xDir, yDir, zDir]); arcs sweep by their signed bulge about the
 * plane normal. Construction geometry renders dashed violet.
 */
export declare function sketchToOverlays(items: any[], sketchNode: any): OverlayPolyline[];
/**
 * Compare two same-size RGBA renders. Meaningful ONLY when both were rendered
 * with the same view/size and a PINNED frame (options.frame) — auto-fit
 * reframes when geometry changes, which would make every pixel "differ".
 *
 * @param {{pixels:Uint8Array|Buffer,width:number,height:number}} a — before
 * @param {{pixels:Uint8Array|Buffer,width:number,height:number}} b — after
 * @param {object} [opts]
 * @param {number} [opts.tolerance=0] — per-channel absolute tolerance
 * @returns {{changed:number,total:number,fraction:number,
 *            bbox:{minX:number,minY:number,maxX:number,maxY:number}|null,
 *            pixels:Uint8Array|Buffer,width:number,height:number}}
 *   `pixels` visualizes the diff: unchanged content faded, changed pixels red.
 */
export declare function diffImages(a: Pick<RasterResult, 'pixels' | 'width' | 'height'>, b: Pick<RasterResult, 'pixels' | 'width' | 'height'>, opts?: {
    tolerance?: number;
}): DiffResult;
/**
 * Render every visible content type from session DATA. This is the portable
 * heart of the renderer: it needs only the structure tree, a graphic payload,
 * and (for sketches) an execute function — no filesystem, no PNG encoder, no
 * WebSocket client. Adapters (node.mjs, browser.mjs) wrap it with encoding/IO.
 *
 * @param {object} source
 * @param {object} source.tree — structure tree (GetTree → structure.tree)
 * @param {object|null} [source.graphic] — graphic payload with containers
 *   (from a recalc response or the client's accumulated last graphic)
 * @param {Function} [source.execute] — async task => response; enables sketch
 *   rendering (getGeometry/getPositions/getPoints queries). Omit to skip sketches.
 * @param {object} [options]
 * @param {number} [options.width=1600]
 * @param {number} [options.height=1200]
 * @param {string} [options.view='iso'] — one of VIEW_NAMES
 * @param {number} [options.zoom=1]
 * @param {[number,number,number]} [options.lookAt]
 * @param {boolean} [options.xray] — translucent bodies (fixed-alpha painter's
 *   blend): hidden bodies and internal far walls shine through, edges stay
 *   opaque. Quick internal check without choosing a section plane.
 * @param {boolean} [options.annotate] — measurement overlay on the solid render:
 *   bounding-box extents (model units), RGB axes triad for the current view,
 *   and a scale bar. A snapshot that answers "how big is this?" by itself.
 * @param {boolean} [options.sketchOverlay] — draw every sketch's curves in 3D
 *   (world space, on the sketch plane) ON TOP of the solid render — verifies a
 *   sketch sits on the intended plane at the intended place. Construction
 *   geometry dashes violet. Needs `execute`. Without solid geometry the
 *   overlay renders standalone.
 * @param {number[]} [options.highlight] — ids rendered in SIGNAL ORANGE/RED:
 *   graphic container ids, owning solid ids (container.owner), face mesh ids,
 *   edge ids. Face/edge ids are payload-local — across recalcs use highlightAt.
 * @param {number[][]} [options.highlightAt] — world points; the closest face in
 *   the rendered payload is highlighted per point (geometrically anchored).
 * @param {Array<{position:number[],label?:string,color?:number[]}>} [options.markers]
 *   — probe markers (crosshair + label) drawn on top of the solid render, e.g.
 *   the probe points of a numeric verification.
 * @param {Array<'solid'|'sketch'|'curves'|'workgeo'>} [options.layers] — content
 *   types to render. Default: all detected. Skipped layers cost nothing (their
 *   queries don't run).
 * @param {boolean|string[]} [options.sheet] — render the solids as a FOUR-VIEW
 *   SHEET (one image, quadrants TL/TR/BL/BR; default top/iso/front/right; the
 *   ortho views share one scale like a technical drawing). Pass an array of 4
 *   view names to pick the quadrants. Entry type becomes 'sheet'.
 * @param {{scale:number,midX:number,midY:number}} [options.frame] — pin the view
 *   frame to one returned by an earlier solid render (same view/size) so
 *   before/after images are pixel-comparable; feed both to diffImages.
 * @param {{origin:number[],normal:number[]}} [options.section] — cut the solids
 *   at a plane: everything on the positive side of `normal` is removed, interior
 *   walls are shown shaded (uncapped). Framing stays that of the uncut model.
 * @param {'native'|'distinct'} [options.colors='native'] — 'native' renders the
 *   model's OWN ClassCAD colors (mesh/container materials); 'distinct' gives
 *   every body its own palette color — use it to tell bodies apart (booleans,
 *   splits, patterns, repeated parts).
 * @returns {Promise<Array>} entries:
 *   { type: 'solid',   kind: 'pixels', pixels, width, height }
 *   { type: 'sketch',  kind: 'svg', svg, sketchId, name }
 *   { type: 'curves',  kind: 'svg', svg }
 *   { type: 'workgeo', kind: 'svg', svg }
 */
export declare function renderSessionData(source: SessionSource, options?: RenderOptions): Promise<SessionEntry[]>;
//# sourceMappingURL=core.d.ts.map