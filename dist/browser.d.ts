/**
 * browser.mjs — Browser adapter: canvas-based PNG encoding for the portable
 * core. No dependencies; works in any modern browser (uses OffscreenCanvas
 * when available, falls back to a DOM canvas).
 *
 * Typical use (e.g. a deterministic snapshot for buerli-ai):
 *   const entries = await renderSessionData({ tree, graphic, execute }, { view: 'iso' })
 *   const png = await entryToPngBase64(entries[0])   // base64 PNG, no data: prefix
 */
export * from './core.js';
export * from './stl.js';
/** Encode an RGBA pixel buffer (Uint8Array/Buffer) as base64 PNG. */
export declare function pixelsToPngBase64(pixels: any, width: any, height: any): Promise<any>;
/** Rasterize an SVG string to base64 PNG at its declared width/height. */
export declare function svgToPngBase64(svg: any, width?: any, height?: any): Promise<any>;
/** Encode one renderSessionData entry (pixels or svg) as base64 PNG. */
export declare function entryToPngBase64(entry: any): Promise<any>;
//# sourceMappingURL=browser.d.ts.map