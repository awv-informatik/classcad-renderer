/**
 * node.mjs — Node adapter: PNG encoding (sharp) + file output + the
 * harness-compatible renderSession(client, prefix, outDir, options) entry.
 *
 * Everything portable lives in core.mjs; this file only adds what needs
 * Node (sharp, filesystem).
 */
import { setViewport } from './core.js';
export * from './core.js';
export * from './stl.js';
/** Encode an RGBA pixel buffer as PNG bytes. */
export declare function pixelsToPng(pixels: any, width: any, height: any): Promise<Buffer<ArrayBufferLike>>;
/** Save an RGBA pixel buffer as a PNG file. */
export declare function savePNG(pixels: any, width: any, height: any, path: any): Promise<void>;
/** Rasterize an SVG string to PNG bytes. */
export declare function svgToPngBuffer(svg: any): Promise<Buffer<ArrayBufferLike>>;
/** Rasterize an SVG string to a PNG file. */
export declare function svgToPng(svg: any, pngPath: any): Promise<void>;
/**
 * Fetch the freshest graphic payload from a live harness client: recalc first
 * (cached graphic may be stale/intermediate), fall back to the client's
 * accumulated last graphic.
 *
 * CAVEAT: `common.recalc` DESTROYS entity-injection (EIF/direct-modeling)
 * bodies. Pass `recalc: false` when the session used solid.* / entityInjection
 * flows — the accumulated graphic is used as-is then.
 */
export declare function fetchGraphic(client: any, { recalc }?: {
    recalc?: boolean;
}): Promise<any>;
/**
 * Render all visible content of a live session to PNG files — the drop-in
 * equivalent of the classcad-agent harness renderer.
 *
 * FAILS LOUDLY: if the session contains solids/curves but no graphic data
 * arrived (e.g. the client connected with graphics disabled), this THROWS with
 * the cause and the remedies — it never silently returns an empty render.
 *
 * @param {{ execute: Function, request: Function, getLastGraphic?: Function }} client
 * @param {string} prefix — output file prefix
 * @param {string} outDir — output directory
 * @param {object} [options] — width/height/view/zoom/lookAt (see core.renderSessionData)
 *   plus `graphic` (render this pre-fetched payload instead of fetching —
 *   keeps ids stable for highlights), `colors: 'native' | 'distinct'` ('native' default: the model's own
 *   ClassCAD colors; 'distinct': one palette color per body — use to tell bodies
 *   apart in booleans/splits/patterns), `recalc` (default true; set false for
 *   EIF/direct-modeling sessions) and
 *   `source: 'graphic' | 'stl'` (default 'graphic'; 'stl' renders the STL export
 *   instead — explicit fallback for graphics-disabled clients, marked in the result),
 *   `quality: 'fine' | 'fast'` (default 'fine': adaptive chord tolerance scaled to
 *   the model bbox before the render fetch, previous worker params restored after;
 *   'fast' keeps the session's current tessellation)
 * @returns {Promise<{ type: string, file: string, source?: 'stl' }[]>}
 */
export declare function renderSession(client: any, prefix: any, outDir: any, options?: any): Promise<any[]>;
export { setViewport };
//# sourceMappingURL=node.d.ts.map