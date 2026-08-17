/**
 * stl.mjs — Isometric renderer for STL triangles.
 *
 * Renders what an EXPORTED STL file actually contains — independent of the
 * engine's graphic pipeline. Two uses:
 *   1. Export verification: render the exported artifact and compare against
 *      the live-session render; a mismatch means the export is wrong.
 *   2. Graphics-disabled clients (no graphic pushes): STL export on demand is
 *      the only render path available.
 * Pure: returns an RGBA pixel buffer; encode/save via node.mjs or browser.mjs.
 */
/**
 * Render an array of STL triangles into an RGBA pixel buffer.
 *
 * @param {{ normal: number[], vertices: number[][] }[]} triangles
 * @param {number} width
 * @param {number} height
 * @returns {Buffer} RGBA pixel buffer
 */
export declare function renderIsometric(triangles: any, width: any, height: any): Buffer<ArrayBuffer> | Uint8Array<ArrayBuffer>;
/**
 * Parse a BINARY STL buffer into { normal, vertices } triangles for
 * renderIsometric. Pure — pass any Uint8Array/Buffer with binary STL bytes
 * (e.g. from v1.common.save({ format: 'STL', encoding: 'base64', stl: { binary: true } })).
 */
export declare function parseSTL(buf: any): {
    normal: number[];
    vertices: number[][];
}[];
//# sourceMappingURL=stl.d.ts.map