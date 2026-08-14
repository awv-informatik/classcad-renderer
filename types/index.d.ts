// Type declarations for @classcad/renderer (all entry points share this surface;
// node-only and browser-only helpers are marked in their doc comments).

export type Vec3 = [number, number, number]

/** RGBA pixel result of a raster render. */
export interface RasterResult {
  pixels: Uint8Array
  width: number
  height: number
  /** View frame used — pass back via options.frame to pin later renders. */
  frame: Frame | null
}

/** Pinned/reported view frame: scale + projected-space center. */
export interface Frame {
  scale: number
  midX: number
  midY: number
}

/** Arbitrary orthographic camera (photographic convention, Z-up). */
export type CameraView =
  | 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
  | { azimuth?: number; elevation?: number }
  | { direction: Vec3; up?: Vec3 }

export interface SectionPlane {
  origin: Vec3
  /** Everything on the positive side of the normal is removed (uncapped cut). */
  normal: Vec3
}

export interface Marker {
  position: Vec3
  label?: string
  color?: [number, number, number]
}

export interface OverlayPolyline {
  pts: Vec3[]
  color?: [number, number, number]
  dashed?: boolean
}

/** Options accepted by renderSessionData / renderSession / renderSolidZBuffer. */
export interface RenderOptions {
  width?: number
  height?: number
  view?: CameraView
  zoom?: number
  lookAt?: Vec3
  /** Pin the frame of an earlier render (same view/size) for pixel-comparable output. */
  frame?: Frame
  /** 'native' = the model's own ClassCAD colors (default); 'distinct' = one palette color per body. */
  colors?: 'native' | 'distinct'
  section?: SectionPlane
  /** Ids (container/owner solid/face mesh/edge) rendered in signal color. */
  highlight?: number[]
  markers?: Marker[]
  /** Draw sketch curves in 3D on the solid render (needs execute). */
  sketchOverlay?: boolean
  /** Measurement overlay: extents, axes triad, scale bar. */
  annotate?: boolean
  /** Translucent bodies — hidden geometry shines through. */
  xray?: boolean
  xrayAlpha?: number
  /** Four-view sheet (true = top/iso/front/right, or 4 view names). */
  sheet?: boolean | CameraView[]
}

export interface SessionSource {
  tree: Record<string, unknown>
  graphic?: { containers?: unknown[] } | null
  /** Harness-task-style executor: execute({ 'v1.sketch.getGeometry': [{ id }] }). */
  execute?: (task: Record<string, unknown[]>) => Promise<{ result?: unknown }>
}

export type SessionEntry =
  | ({ type: 'solid' | 'sheet'; kind: 'pixels' } & RasterResult)
  | { type: 'sketch'; kind: 'svg'; svg: string; sketchId: number; name: string }
  | { type: 'curves' | 'workgeo'; kind: 'svg'; svg: string }

/** Pure data-level orchestrator — browser + Node. */
export function renderSessionData(source: SessionSource, options?: RenderOptions): Promise<SessionEntry[]>

export interface DiffResult {
  changed: number
  total: number
  fraction: number
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null
  pixels: Uint8Array
  width: number
  height: number
}

/** Compare two same-size renders (use with a pinned frame). */
export function diffImages(
  a: Pick<RasterResult, 'pixels' | 'width' | 'height'>,
  b: Pick<RasterResult, 'pixels' | 'width' | 'height'>,
  opts?: { tolerance?: number },
): DiffResult

export const VIEW_NAMES: string[]
export const COLOR_MODES: string[]
export function setViewport(opts?: { view?: CameraView; zoom?: number; lookAt?: Vec3; frame?: Frame }): void
export function renderSolidZBuffer(
  graphic: { containers?: unknown[] },
  width?: number,
  height?: number,
  instances?: unknown[] | null,
  opts?: RenderOptions | string,
): RasterResult | null
export function renderSolidSheet(
  graphic: { containers?: unknown[] },
  width?: number,
  height?: number,
  instances?: unknown[] | null,
  opts?: { views?: CameraView[] } & RenderOptions,
): RasterResult | null
export function analyzeSession(tree: Record<string, unknown>): {
  solids: number[]; sketches: number[]; curves: number[]; eifs: number[]; workGeo: number[]
}
export function extractAssemblyInstances(tree: Record<string, unknown>): unknown[] | null
export function fetchSketchData(
  execute: SessionSource['execute'],
  sketchId: number,
  structureTree?: Record<string, unknown>,
): Promise<{ items: unknown[]; posMap: Record<string, unknown> } | null>
export function sketchToOverlays(items: unknown[], sketchNode: unknown): OverlayPolyline[]
export function drawText(
  pixels: Uint8Array, width: number, height: number,
  x: number, y: number, text: string, color?: [number, number, number], scale?: number,
): number
export function measureText(text: string, scale?: number): number

// ── STL path (export verification / graphics-disabled clients) ──
export function parseSTL(buf: Uint8Array): Array<{ normal: Vec3; vertices: Vec3[] }>
export function renderIsometric(
  triangles: Array<{ normal: Vec3; vertices: Vec3[] }>,
  width: number, height: number,
): Uint8Array

// ── Node adapter (@classcad/renderer/node — requires sharp) ──
export interface RenderedFile { type: string; file: string; source?: 'stl'; sketchId?: number; name?: string }
/**
 * Harness-compatible file renderer. THROWS with cause + remedies when the
 * session has solids/curves but no graphic data. Options additionally accept:
 * recalc (default true; false for EIF/direct-modeling sessions),
 * ensureGraphics (default true; sets the graphic database settings so edges
 * are included), source ('graphic' default | 'stl' explicit fallback).
 */
export function renderSession(
  client: { execute: Function; request: Function; getLastGraphic?: Function },
  prefix: string,
  outDir: string,
  options?: RenderOptions & { recalc?: boolean; ensureGraphics?: boolean; source?: 'graphic' | 'stl' },
): Promise<RenderedFile[]>
export function fetchGraphic(client: { execute: Function; getLastGraphic?: Function }, opts?: { recalc?: boolean }): Promise<unknown>
export function pixelsToPng(pixels: Uint8Array, width: number, height: number): Promise<Uint8Array>
export function savePNG(pixels: Uint8Array, width: number, height: number, path: string): Promise<void>
export function svgToPngBuffer(svg: string): Promise<Uint8Array>
export function svgToPng(svg: string, pngPath: string): Promise<void>

// ── Browser adapter (@classcad/renderer/browser — canvas encoding) ──
export function pixelsToPngBase64(pixels: Uint8Array, width: number, height: number): Promise<string>
export function svgToPngBase64(svg: string, width?: number, height?: number): Promise<string>
export function entryToPngBase64(entry: SessionEntry): Promise<string>
