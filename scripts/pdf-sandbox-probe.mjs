import { chromium } from 'playwright-core'
if (process.getuid?.() === 0) throw new Error('PDF runtime must not be root')
let browser
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', chromiumSandbox: true, timeout: 15000 })
  const diagnostics = await browser.newPage()
  await diagnostics.goto('chrome://sandbox')
  const status = await diagnostics.locator('body').innerText()
  if (!/Layer 1 Sandbox\s+Namespace/.test(status) || !/PID namespaces\s+Yes/.test(status) || !/Network namespaces\s+Yes/.test(status) || !/Seccomp-BPF sandbox\s+Yes/.test(status)) throw new Error('Chromium did not report namespace and seccomp sandbox active: ' + status)
  await diagnostics.close()
  const page = await browser.newPage({ javaScriptEnabled: false, offline: true })
  await page.route('**/*', route => route.abort())
  await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><style>@page{size:A4;margin:0}</style><p>RRD sandbox proof</p>')
  const pdf = await page.pdf({ format: 'A4' })
  if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid PDF')
  console.log(JSON.stringify({ ok: true, uid: process.getuid(), sandbox: true, namespaceSandbox: true, pidNamespaces: true, networkNamespaces: true, seccompBpf: true, bytes: pdf.length }))
} catch (error) {
  console.error('SANDBOX_RUNTIME_UNAVAILABLE: ' + String(error?.message || error))
  process.exitCode = 1
} finally { await browser?.close() }
