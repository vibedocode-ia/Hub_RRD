import test from 'node:test'
import assert from 'node:assert/strict'
import { renderStoredDocumentTemplate } from '../stored-document-template'
import { createCanvas, loadImage } from '@napi-rs/canvas'

function pdf(pages = 1, noise = false, width = 595, height = 842) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({length:pages}, (_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages} >>`]
  for (let i = 0; i < pages; i++) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << ${noise ? `/XObject << /Noise ${3 + pages * 2} 0 R >>` : ''} >> /Contents ${4 + i * 2} 0 R >>`)
    const content = noise ? 'q 595 0 0 842 0 0 cm /Noise Do Q\n' : '0.1 0.2 0.3 rg 0 0 595 842 re f\n'
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`)
  }
  if (noise) {
    let seed = 42
    const pixels = Buffer.alloc(800 * 800 * 3)
    for (let i = 0; i < pixels.length; i++) { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; pixels[i] = seed >>> 24 }
    objects.push(`<< /Type /XObject /Subtype /Image /Width 800 /Height 800 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${pixels.length} >>\nstream\n${pixels.toString('latin1')}\nendstream`)
  }
  let raw = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, i) => { offsets.push(raw.length); raw += `${i + 1} 0 obj\n${obj}\nendobj\n` })
  const start = raw.length
  raw += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(raw, 'latin1').toString('base64')
}
const placement = { page: 0, x: 0.1, y: 0.1, width: 0.3, height: 0.08 }
const field = { key: 'number', required: true, placements: [placement] }

test('rasterizes actual multipage PDF, masks only placements and embeds escaped repeated values', async () => {
  const baseline = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(2), fieldSchema: [], values: {} })
  const result = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(2), fieldSchema: JSON.stringify([{ ...field, placements: [placement, { ...placement, page: 1, background: '#112233' }] }]), values: { number: '<A&>' } })
  assert.equal(result.ok, true)
  assert.equal(baseline.ok, true)
  if (!result.ok || !baseline.ok) return
  assert.equal(result.pages, 2)
  assert.equal((result.html.match(/&lt;A&amp;&gt;/g) || []).length, 2)
  assert.ok(!result.html.includes('application/pdf'))
  const images = (html: string) => [...html.matchAll(/src="(data:image\/png;base64,[^"]+)"/g)].map(m => m[1])
  const pixels = async (uri: string) => { const img = await loadImage(uri); const canvas = createCanvas(img.width, img.height); const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); return { data: ctx.getImageData(0,0,img.width,img.height).data, width: img.width, height: img.height } }
  const original = await pixels(images(baseline.html)[0])
  const masked = await pixels(images(result.html)[0])
  let outsideChanged = 0
  let insideChanged = 0
  for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
    const offset = (y * original.width + x) * 4
    const changed = original.data.slice(offset,offset+4).some((v,i) => v !== masked.data[offset+i])
    const inside = x >= Math.floor(placement.x * original.width) && x < Math.ceil((placement.x + placement.width) * original.width) && y >= Math.floor(placement.y * original.height) && y < Math.ceil((placement.y + placement.height) * original.height)
    if (changed) { if (inside) insideChanged++; else outsideChanged++ }
  }
  assert.equal(outsideChanged, 0)
  assert.ok(insideChanged > 0)
  const navy = await pixels(images(result.html)[1])
  const at = (Math.round(navy.height * 0.12) * navy.width + Math.round(navy.width * 0.12)) * 4
  assert.deepEqual([...navy.data.slice(at,at+3)], [17,34,51])
})

test('validates schemas, required values, explicit mapping and page bounds fail closed', async () => {
  const cases = [
    { code: 'INVALID_SCHEMA', fieldSchema: 'not json' },
    { code: 'INVALID_SCHEMA', fieldSchema: [{ ...field, placements: [{ ...placement, color: 'red' }] }] },
    { code: 'INVALID_SCHEMA', fieldSchema: [{ ...field, placements: [{ ...placement, background: 'url(evil)' }] }] },
    { code: 'REQUIRED_VALUE', values: {} },
    { code: 'REQUIRED_VALUE', values: { number: '  ' } },
    { code: 'UNMAPPED_VALUE', values: { number: 'A', unknown: 'B' } },
    { code: 'UNMAPPED_VALUE', fieldSchema: [{ ...field, placements: [] }] },
    { code: 'INVALID_VALUE', values: { number: { html: 'bad' } } },
    ...[{ page: 1 }, { page: -1 }, { page: 0.5 }, { x: -0.01 }, { x: 0.9 }, { width: 0 }, { height: Infinity }, { fontSize: -1 }].map(p => ({ code: 'INVALID_PLACEMENT', fieldSchema: [{ ...field, placements: [{ ...placement, ...p }] }] })),
  ]
  for (const { code, ...change } of cases) {
    const result = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(), fieldSchema: [field], values: { number: 'A' }, ...change })
    assert.equal(result.ok, false, code)
    if (!result.ok) assert.equal(result.error.code, code)
  }
})

test('fits multiline with Arial-compatible width and reports useful overflow instead of clipping', async () => {
  const render = (value: string, p = placement) => renderStoredDocumentTemplate({ sourcePdfBase64: pdf(), fieldSchema: [{ ...field, placements: [p] }], values: { number: value } })
  const fits = await render('Linha um\nLinha dois')
  assert.equal(fits.ok, true)
  const wraps = await render('Palavra curta '.repeat(6))
  assert.equal(wraps.ok, true)
  if (wraps.ok) assert.ok(wraps.html.includes('Palavra curta Palavra curta\n'))
  for (const value of ['W'.repeat(300), 'Linha\n'.repeat(40)]) {
    const result = await render(value)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.code, 'TEXT_OVERFLOW')
      assert.equal(result.error.field, 'number')
      assert.equal(result.error.placement, 0)
      assert.ok(result.error.details!.availableHeightPt > 0)
      assert.ok(result.error.details!.requiredHeightPt > 0)
    }
  }
})

test('bounds source size, page count, page pixels and strict base64 decoding', async () => {
  for (const [sourcePdfBase64, code] of [
    [pdf(9), 'LIMIT_EXCEEDED'],
    [Buffer.from('%PDF-' + ' '.repeat(10 * 1024 * 1024)).toString('base64'), 'LIMIT_EXCEEDED'],
    [pdf() + '$$', 'INVALID_PDF'],
    [Buffer.from('%PDF-1.4\ntruncated').toString('base64'), 'INVALID_PDF'],
    [Buffer.from(Buffer.from(pdf(), 'base64').toString().replace('%%EOF', '')).toString('base64'), 'INVALID_PDF'],
    [Buffer.from(Buffer.from(pdf(), 'base64').toString().replace(/startxref\n\d+/, 'startxref\n1')).toString('base64'), 'INVALID_PDF'],
    [pdf(1, false, 20000, 20000), 'LIMIT_EXCEEDED'],
  ]) {
    const result = await renderStoredDocumentTemplate({ sourcePdfBase64, fieldSchema: [], values: {} })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, code)
  }
})

test('rejects oversized raster payload without lossy fallback', async () => {
  const result = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(1, true), fieldSchema: [], values: {} })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'PAYLOAD_TOO_LARGE')
})

test('accepts schema envelopes and legacy keys without inferring any mapping', async () => {
  const result = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(), fieldSchema: {fields: JSON.stringify([field])}, values: {number:'AB'} })
  assert.equal(result.ok, true)
  const legacy = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(), fieldSchema: '["number"]', values: {number:'AB'} })
  assert.equal(legacy.ok, false)
  if (!legacy.ok) assert.equal(legacy.error.code,'UNMAPPED_VALUE')
})

test('empty optional mapped region masks without demanding a line of text', async () => {
  const result = await renderStoredDocumentTemplate({ sourcePdfBase64: pdf(), fieldSchema: [{ ...field, required: false, placements: [{ ...placement, height: 0.001 }] }], values: {} })
  assert.equal(result.ok, true)
})

test('rejects invalid PDF with structured error, not a fallback', async () => {
  const result = await renderStoredDocumentTemplate({ sourcePdfBase64: Buffer.from('not a pdf').toString('base64'), fieldSchema: [], values: {} })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, 'INVALID_PDF')
})
