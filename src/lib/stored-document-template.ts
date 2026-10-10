import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

export type TemplateResult = { ok: true; html: string; pages: number; bytes: number } | { ok: false; error: { code: string; message: string; field?: string; placement?: number; details?: Record<string, number> } }
export type TemplatePlacement = { page: number; x: number; y: number; width: number; height: number; fontSize?: number; color?: string; background?: string }
export const TEMPLATE_RENDER_LIMITS = Object.freeze({ sourceBytes: 10 * 1024 * 1024, pages: 8, pagePixels: 8_000_000, totalPixels: 20_000_000, imageBytes: 1_200_000, htmlBytes: 1_800_000, valueCharacters: 20_000 })
type Field = { key: string; required?: boolean; placements?: TemplatePlacement[] }
class TemplateError extends Error {
  constructor(public code: string, message: string, public field?: string, public placement?: number, public details?: Record<string, number>) { super(message) }
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const hex = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
function parseFields(raw: unknown): Field[] {
  try {
    if (typeof raw === 'string') raw = JSON.parse(raw)
    if (record(raw) && 'fields' in raw) raw = typeof raw.fields === 'string' ? JSON.parse(raw.fields) : raw.fields
  } catch { throw new TemplateError('INVALID_SCHEMA', 'JSON de campos inválido.') }
  if (!Array.isArray(raw) || raw.length > 80) throw new TemplateError('INVALID_SCHEMA', 'Esperada lista com até 80 campos.')
  const seen = new Set<string>()
  return raw.map(entry => {
    // Legacy keys remain unmapped; values for them are rejected, never inferred.
    if (typeof entry === 'string') entry = { key: entry }
    if (!record(entry) || typeof entry.key !== 'string' || !/^[a-z][a-zA-Z0-9_]{0,63}$/.test(entry.key) || ['__proto__','constructor','prototype'].includes(entry.key) || seen.has(entry.key) || (entry.required !== undefined && typeof entry.required !== 'boolean') || (entry.placements !== undefined && (!Array.isArray(entry.placements) || entry.placements.length > 20))) throw new TemplateError('INVALID_SCHEMA', 'Definição de campo inválida ou duplicada.')
    seen.add(entry.key)
    for (const [index, p] of ((entry.placements || []) as unknown[]).entries()) {
      if (!record(p) || (p.color !== undefined && !hex(p.color)) || (p.background !== undefined && !hex(p.background))) throw new TemplateError('INVALID_SCHEMA', 'Cor deve usar hexadecimal #RRGGBB.', entry.key, index)
      if (Object.keys(p).some(k => !['page','x','y','width','height','fontSize','color','background'].includes(k)) || !Number.isInteger(p.page) || Number(p.page) < 0 || !['x','y','width','height'].every(k => typeof p[k] === 'number' && Number.isFinite(p[k])) || Number(p.x) < 0 || Number(p.y) < 0 || Number(p.width) <= 0 || Number(p.height) <= 0 || Number(p.x) + Number(p.width) > 1 || Number(p.y) + Number(p.height) > 1 || (p.fontSize !== undefined && (typeof p.fontSize !== 'number' || !Number.isFinite(p.fontSize) || p.fontSize < 4 || p.fontSize > 72))) throw new TemplateError('INVALID_PLACEMENT', 'Retângulo normalizado ou fonte fora dos limites.', entry.key, index)
    }
    return entry as unknown as Field
  })
}
function parseValues(raw: unknown, fields: Field[]): Record<string, string> {
  if (!record(raw)) throw new TemplateError('INVALID_VALUE', 'Esperado objeto de valores.')
  const values: Record<string, string> = Object.create(null)
  for (const [key, value] of Object.entries(raw)) {
    const field = fields.find(f => f.key === key)
    if (!field || !field.placements?.length) throw new TemplateError('UNMAPPED_VALUE', 'Valor fornecido sem mapeamento explícito.', key)
    if (!(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))) throw new TemplateError('INVALID_VALUE', 'Use valor escalar já formatado.', key)
    if (String(value).length > TEMPLATE_RENDER_LIMITS.valueCharacters) throw new TemplateError('LIMIT_EXCEEDED', 'Valor excede 20 mil caracteres.', key)
    values[key] = value === null ? '' : String(value).replace(/\r\n?/g, '\n')
    if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(values[key])) throw new TemplateError('INVALID_VALUE', 'Caracteres de controle não suportados.', key)
  }
  for (const field of fields) if (field.required && !values[field.key]?.trim()) throw new TemplateError('REQUIRED_VALUE', 'Campo obrigatório sem valor.', field.key)
  return values
}
const fontPath = new URL('./assets/LiberationSans-Regular.ttf', import.meta.url)
const font = readFileSync(fontPath).toString('base64')
GlobalFonts.registerFromPath(fontPath.pathname, 'RRDArial')
function layoutText(value: string, p: TemplatePlacement, field: string, index: number): string {
  if (!value) return ''
  const ctx = createCanvas(1, 1).getContext('2d')
  const size = p.fontSize ?? 10
  ctx.font = `${size}px RRDArial`
  const availableWidthPt = p.width * (210 / 25.4 * 72)
  const availableHeightPt = p.height * (297 / 25.4 * 72)
  // Half-point reserve protects against browser/native rounding without shrinking text.
  const width = availableWidthPt - 0.5
  const lines: string[] = []
  let widest = 0
  for (const paragraph of value.replace(/\t/g, '    ').split('\n')) {
    let line = ''
    for (const token of paragraph.match(/\s+|\S+/g) || []) {
      const tokenWidth = ctx.measureText(token).width
      widest = Math.max(widest, tokenWidth)
      if (ctx.measureText(line + token).width > width && line) {
        lines.push(line.trimEnd())
        line = token.trimStart()
      } else line += token
    }
    lines.push(line.trimEnd())
  }
  const requiredHeightPt = lines.length * size * 1.2
  if (widest > width || requiredHeightPt > availableHeightPt - 0.5) throw new TemplateError('TEXT_OVERFLOW', 'Texto excede o retângulo; amplie o mapeamento ou reduza a fonte explicitamente.', field, index, { availableWidthPt, availableHeightPt, requiredWidthPt: widest, requiredHeightPt, lines: lines.length, fontSizePt: size })
  return lines.join('\n')
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!)

export async function renderStoredDocumentTemplate(input: { sourcePdfBase64: unknown; fieldSchema: unknown; values: unknown }): Promise<TemplateResult> {
  let document: Awaited<ReturnType<(typeof import('pdfjs-dist/legacy/build/pdf.mjs'))['getDocument']>['promise']> | undefined
  try {
    if (typeof input.sourcePdfBase64 !== 'string') throw new Error('invalid')
    if (input.sourcePdfBase64.length > Math.ceil(TEMPLATE_RENDER_LIMITS.sourceBytes / 3) * 4) throw new TemplateError('LIMIT_EXCEEDED', 'PDF fonte excede 10 MiB.')
    if (input.sourcePdfBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.sourcePdfBase64)) throw new Error('invalid')
    const bytes = Buffer.from(input.sourcePdfBase64, 'base64')
    if (bytes.length > TEMPLATE_RENDER_LIMITS.sourceBytes) throw new TemplateError('LIMIT_EXCEEDED', 'PDF fonte excede 10 MiB.')
    if (bytes.toString('base64') !== input.sourcePdfBase64) throw new Error('invalid')
    if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('invalid')
    const trailer = bytes.subarray(Math.max(0, bytes.length - 2048)).toString('latin1').match(/startxref\s+(\d+)\s+%%EOF\s*$/)
    if (!trailer) throw new Error('invalid')
    const xref = Number(trailer[1])
    if (!Number.isSafeInteger(xref) || xref < 5 || xref >= bytes.length || !/^(?:xref\b|\d+\s+\d+\s+obj\b)/.test(bytes.subarray(xref, xref + 64).toString('latin1'))) throw new Error('invalid')
    const fields = parseFields(input.fieldSchema)
    const values = parseValues(input.values, fields)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const require = createRequire(import.meta.url)
    const root = require.resolve('pdfjs-dist/package.json').replace(/package\.json$/, '')
    document = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, stopAtErrors: true, useSystemFonts: false, standardFontDataUrl: `${root}standard_fonts/`, cMapUrl: `${root}cmaps/`, cMapPacked: true, wasmUrl: `${root}wasm/`, verbosity: 0 }).promise
    if (document.numPages > TEMPLATE_RENDER_LIMITS.pages) throw new TemplateError('LIMIT_EXCEEDED', 'PDF excede 8 páginas.')
    let totalPixels = 0
    let imagePayloadBytes = 0
    for (const field of fields) for (const [index, p] of (field.placements || []).entries()) if (p.page >= document.numPages) throw new TemplateError('INVALID_PLACEMENT', 'Página não existe no PDF fonte.', field.key, index)
    const pages: string[] = []
    for (let pageNumber = 0; pageNumber < document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber + 1)
      const viewport = page.getViewport({ scale: 2 })
      const pixelCount = Math.ceil(viewport.width) * Math.ceil(viewport.height)
      totalPixels += pixelCount
      if (!Number.isFinite(pixelCount) || pixelCount <= 0 || pixelCount > TEMPLATE_RENDER_LIMITS.pagePixels || totalPixels > TEMPLATE_RENDER_LIMITS.totalPixels) throw new TemplateError('LIMIT_EXCEEDED', 'Dimensões raster excedem limite seguro.')
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      const ctx = canvas.getContext('2d')
      await page.render({ canvas: canvas as never, canvasContext: ctx as never, viewport }).promise
      const overlays: string[] = []
      for (const field of fields) for (const [index, p] of (field.placements || []).entries()) if (p.page === pageNumber) {
        const text = layoutText(values[field.key] ?? '', p, field.key, index)
        ctx.fillStyle = p.background || '#ffffff'
        const x = Math.floor(p.x * canvas.width), y = Math.floor(p.y * canvas.height)
        ctx.fillRect(x, y, Math.ceil((p.x+p.width)*canvas.width)-x, Math.ceil((p.y+p.height)*canvas.height)-y)
        overlays.push(`<div class="field" style="left:${p.x*100}%;top:${p.y*100}%;width:${p.width*100}%;height:${p.height*100}%;font-size:${p.fontSize || 10}pt;color:${p.color || '#000000'}">${escapeHtml(text)}</div>`)
      }
      const png = canvas.toBuffer('image/png')
      imagePayloadBytes += Math.ceil(png.length / 3) * 4
      if (png.length > TEMPLATE_RENDER_LIMITS.imageBytes || imagePayloadBytes > TEMPLATE_RENDER_LIMITS.htmlBytes) throw new TemplateError('PAYLOAD_TOO_LARGE', 'Imagens excedem limite do snapshot; não houve compressão destrutiva.')
      pages.push(`<section class="page"><img alt="" src="data:image/png;base64,${png.toString('base64')}"/>${overlays.join('')}</section>`)
      page.cleanup()
    }
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>@font-face{font-family:RRDArial;src:url(data:font/ttf;base64,${font}) format('truetype')}@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0}.page{position:relative;width:210mm;height:297mm;break-after:page;overflow:hidden}.page:last-child{break-after:auto}.page>img{position:absolute;width:100%;height:100%}.field{position:absolute;font-family:RRDArial,Arial,sans-serif;line-height:1.2;white-space:pre;overflow:hidden}</style></head><body>${pages.join('')}</body></html>`
    const htmlBytes = Buffer.byteLength(html)
    if (htmlBytes > TEMPLATE_RENDER_LIMITS.htmlBytes) throw new TemplateError('PAYLOAD_TOO_LARGE', 'HTML excede 1,8 MB; transporte HVD/bridge exige envelope abaixo de 2 MB.', undefined, undefined, { htmlBytes, maxHtmlBytes: TEMPLATE_RENDER_LIMITS.htmlBytes })
    return { ok: true, html, pages: document.numPages, bytes: htmlBytes }
  } catch (error) {
    if (error instanceof TemplateError) return { ok: false, error: { code: error.code, message: error.message, field: error.field, placement: error.placement, details: error.details } }
    return { ok: false, error: { code: 'INVALID_PDF', message: 'PDF inválido ou não renderizável.' } }
  } finally { await document?.destroy().catch(() => undefined) }
}
