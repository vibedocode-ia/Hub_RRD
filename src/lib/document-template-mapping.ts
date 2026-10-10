import type { DocumentTemplatePlacement } from './document-template-contract'
export { normalizeTemplateFields } from './document-template-contract'
export type Point = { x: number; y: number }
const clamp = (n: number) => Math.max(0, Math.min(1, n))

// Origin: top-left of the displayed PDF page, independent of zoom/DPR.
export function rectangleFromDrag(page: number, start: Point, end: Point): DocumentTemplatePlacement | null {
  const x = Math.min(clamp(start.x), clamp(end.x))
  const y = Math.min(clamp(start.y), clamp(end.y))
  const width = Math.abs(clamp(end.x) - clamp(start.x))
  const height = Math.abs(clamp(end.y) - clamp(start.y))
  return width > 0 && height > 0 ? { page, x, y, width, height } : null
}
