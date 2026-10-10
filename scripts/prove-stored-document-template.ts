import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { renderStoredDocumentTemplate } from '../src/lib/stored-document-template'
import { createCanvas, loadImage } from '@napi-rs/canvas'

async function main() {
  const [sourcePath, outputDirectory, playwrightPath] = process.argv.slice(2)
  if (!sourcePath || !outputDirectory) throw new Error('Use: tsx scripts/prove-stored-document-template.ts source.pdf output-dir [playwright-module]')
  const source = await readFile(sourcePath)
  const sourcePdfBase64 = source.toString('base64')
  const baseline = await renderStoredDocumentTemplate({ sourcePdfBase64, fieldSchema: [], values: {} })
  assert.ok(baseline.ok, baseline.ok ? '' : baseline.error.code)
  // Explicit synthetic proof only; NOT an inferred or production ORC V1 mapping.
  const placement = { page: 0, x: 0.05, y: 0.05, width: 0.3, height: 0.06, background: '#112233', color: '#ffffff', fontSize: 10 }
  const mapped = await renderStoredDocumentTemplate({ sourcePdfBase64, fieldSchema: [{ key: 'proof', required: true, placements: [placement] }], values: { proof: 'PROVA MOTOR\nTEXTO NOVO' } })
  assert.ok(mapped.ok, mapped.ok ? '' : mapped.error.code)
  if (!baseline.ok || !mapped.ok) return
  const images = (html: string) => [...html.matchAll(/src="data:image\/png;base64,([^"]+)"/g)].map(m => Buffer.from(m[1], 'base64'))
  const originalImages = images(baseline.html), mappedImages = images(mapped.html)
  let outsideChanged = 0, insideChanged = 0
  for (let page = 0; page < originalImages.length; page++) {
    const pixels = async (png: Buffer) => { const image = await loadImage(png); const canvas = createCanvas(image.width, image.height); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return { data: ctx.getImageData(0,0,image.width,image.height).data, width:image.width, height:image.height } }
    const a = await pixels(originalImages[page]), b = await pixels(mappedImages[page])
    for (let y=0;y<a.height;y++) for (let x=0;x<a.width;x++) {
      const i = (y*a.width+x)*4
      const changed = a.data.slice(i,i+4).some((v,j)=> v !== b.data[i+j])
      const inside = page === 0 && x >= Math.floor(placement.x*a.width) && x < Math.ceil((placement.x+placement.width)*a.width) && y >= Math.floor(placement.y*a.height) && y < Math.ceil((placement.y+placement.height)*a.height)
      if (changed) { if (inside) insideChanged++; else outsideChanged++ }
    }
  }
  assert.equal(outsideChanged, 0)
  assert.ok(insideChanged > 0)
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(`${outputDirectory}/snapshot.html`, mapped.html, { mode:0o600 })
  await writeFile(`${outputDirectory}/source-page.png`, originalImages[0], { mode:0o600 })
  const report: Record<string, unknown> = { node:process.version, sourceSha256:createHash('sha256').update(source).digest('hex'), pages:mapped.pages, htmlBytes:mapped.bytes, outsideChangedPixels:outsideChanged, insideChangedPixels:insideChanged, productionMapping:false }
  if (playwrightPath) {
    const require = createRequire(import.meta.url)
    const { chromium } = require(playwrightPath)
    const browser = await chromium.launch({ headless:true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox'] })
    try {
      const page = await browser.newPage()
      await page.setContent(mapped.html, { waitUntil:'load' })
      await page.evaluate(() => document.fonts.ready)
      const boxes = await page.locator('.field').evaluateAll((nodes: HTMLElement[]) => nodes.map(n => ({ overflow: n.scrollWidth > n.clientWidth || n.scrollHeight > n.clientHeight })))
      assert.ok(boxes.every((b: {overflow:boolean})=>!b.overflow))
      await page.screenshot({path:`${outputDirectory}/snapshot.png`,fullPage:true})
      const printed = await page.pdf({ path:`${outputDirectory}/snapshot.pdf`, preferCSSPageSize:true, printBackground:true })
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const generated = await pdfjs.getDocument({data:new Uint8Array(printed),verbosity:0}).promise
      const original = await pdfjs.getDocument({data:new Uint8Array(source),verbosity:0}).promise
      let generatedText = '', oldStrings: string[] = []
      for (let n=1;n<=generated.numPages;n++) { const p=await generated.getPage(n); const text=await p.getTextContent(); generatedText += text.items.map(item => 'str' in item ? item.str : '').join(' ') }
      for (let n=1;n<=original.numPages;n++) { const p=await original.getPage(n); const text=await p.getTextContent(); oldStrings.push(...text.items.flatMap(item => 'str' in item && item.str.trim().length >= 8 ? [item.str.trim()] : [])) }
      assert.ok(generatedText.includes('PROVA MOTOR'))
      assert.ok(oldStrings.length > 0)
      const oldExtractable = oldStrings.filter(text=>generatedText.includes(text)).length
      assert.equal(oldExtractable,0)
      assert.equal(generated.numPages,mapped.pages)
      report.printedPages = generated.numPages
      report.oldSourceStringsExtractable = oldExtractable
      report.checkedSourceStrings = oldStrings.length
      report.browserOverflow = false
      await generated.destroy(); await original.destroy()
    } finally { await browser.close() }
  }
  // Never log source text, values, HTML or PDF base64.
  await writeFile(`${outputDirectory}/report.json`, JSON.stringify(report,null,2), { mode:0o600 })
  console.log(JSON.stringify(report))
}
main().catch(() => { console.error('Prova falhou; dados privados omitidos.'); process.exitCode=1 })
