import { chromium } from 'playwright-core'
import { parse } from 'parse5'

export const PDF_LIMITS = { htmlBytes: 20 * 1024 * 1024, pdfBytes: 10 * 1024 * 1024, timeoutMs: 20000, pages: 30 } as const
const tags = new Set(['html','head','body','meta','title','style','section','div','span','p','img','b','strong','i','em','br','hr','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','ul','ol','li','header','footer','main','article'])
const dataUrl = (value: string) => /^data:(?:image\/(?:png|jpeg|webp)|font\/(?:ttf|woff2?));base64,[A-Za-z0-9+/=]+$/i.test(value)
function checkCss(css: string) {
  if (/[\\]|\/\*|@import|@namespace|image-set\s*\(|expression\s*\(|behavior\s*:|-moz-binding/i.test(css)) throw new Error('PDF_SNAPSHOT_UNSAFE')
  const rest = css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (_all, _quote, value) => {
    if (!dataUrl(value)) throw new Error('PDF_SNAPSHOT_UNSAFE')
    return ''
  })
  if (/url\s*\(/i.test(rest)) throw new Error('PDF_SNAPSHOT_UNSAFE')
}
/** Validate only: do not reserialize or modify the immutable canonical layout. */
export function validatePdfSnapshot(html: string): string {
  if (!html || Buffer.byteLength(html) > PDF_LIMITS.htmlBytes) throw new Error('PDF_SNAPSHOT_SIZE')
  const walk = (node: any) => {
    if (node.tagName) {
      if (!tags.has(node.tagName) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml') throw new Error('PDF_SNAPSHOT_UNSAFE')
      for (const attr of node.attrs ?? []) {
        if (attr.name.startsWith('on') || ['href','srcset','srcdoc','action','formaction','background','ping','http-equiv'].includes(attr.name)) throw new Error('PDF_SNAPSHOT_UNSAFE')
        if (attr.name === 'src' && (node.tagName !== 'img' || !/^data:image\/(png|jpeg|webp);base64,/i.test(attr.value) || !dataUrl(attr.value))) throw new Error('PDF_SNAPSHOT_UNSAFE')
        if (attr.name === 'style') checkCss(attr.value)
      }
      if (node.tagName === 'style') checkCss((node.childNodes ?? []).map((n: any) => n.value ?? '').join(''))
    }
    for (const child of node.childNodes ?? []) walk(child)
  }
  walk(parse(html))
  return html
}
let active = false
export async function renderOfficialPdf(html: string): Promise<Buffer> {
  validatePdfSnapshot(html)
  if (process.getuid?.() === 0) throw new Error('PDF_RUNTIME_NON_ROOT_REQUIRED')
  if (active) throw new Error('PDF_RUNTIME_BUSY')
  active = true
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      (async () => {
        browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', chromiumSandbox: true, timeout: PDF_LIMITS.timeoutMs })
        const context = await browser.newContext({ javaScriptEnabled: false, offline: true, serviceWorkers: 'block' })
        await context.route('**/*', route => route.abort('blockedbyclient'))
        const page = await context.newPage()
        // The snapshot itself is passed verbatim. Policy is delivered as an intercepted synthetic document header.
        await context.unroute('**/*')
        await context.route('**/*', async route => {
          if (route.request().isNavigationRequest() && route.request().url() === 'http://rrd-snapshot.invalid/' && route.request().frame() === page.mainFrame()) {
            await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': "default-src 'none'; script-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-src 'none'; connect-src 'none'" }, body: html })
          } else await route.abort('blockedbyclient')
        })
        await page.goto('http://rrd-snapshot.invalid/', { waitUntil: 'load', timeout: PDF_LIMITS.timeoutMs })
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(i => i.decode())) })
        const pages = await page.locator('.page').count()
        if (pages > PDF_LIMITS.pages) throw new Error('PDF_PAGE_LIMIT')
        const bytes = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true })
        if (bytes.length > PDF_LIMITS.pdfBytes || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('PDF_OUTPUT_LIMIT')
        return bytes
      })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('PDF_RUNTIME_TIMEOUT')), PDF_LIMITS.timeoutMs) }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
    await browser?.close()
    active = false
  }
}
