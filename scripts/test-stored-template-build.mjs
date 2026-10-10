import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Build real de produção Turbopack e execução HTTP do renderer canônico.
// Sem banco, autenticação, dados de produção ou transpiler apenas de código-fonte.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = await mkdtemp(path.join(root, '.stored-template-build-'))
let server
async function command(args, env = {}) {
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), ...args], {
    cwd: fixture, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let logs = ''
  child.stdout.on('data', b => { logs += b })
  child.stderr.on('data', b => { logs += b })
  return { child, done: new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(logs)))
  }) }
}
function pdf() {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>']
  for (let i = 0; i < 2; i++) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents ${4 + i * 2} 0 R >>`)
    const content = '0.1 0.2 0.3 rg 0 0 595 842 re f\n'
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`)
  }
  let raw = '%PDF-1.4\n'
  const offsets = objects.map((obj, i) => { const offset = raw.length; raw += `${i + 1} 0 obj\n${obj}\nendobj\n`; return offset })
  const start = raw.length
  raw += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(raw).toString('base64')
}
try {
  await mkdir(path.join(fixture, 'app/api/probe'), { recursive: true })
  await writeFile(path.join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  await writeFile(path.join(fixture, 'next.config.mjs'), `export default { serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'], turbopack: { root: ${JSON.stringify(root)} } }`)
  await writeFile(path.join(fixture, 'app/api/probe/route.ts'), `import {renderStoredDocumentTemplate} from '../../../../src/lib/stored-document-template'\nexport async function POST(request: Request) { const result = await renderStoredDocumentTemplate(await request.json()); return Response.json(result.ok ? {ok:true,pages:result.pages,bytes:result.bytes,images:(result.html.match(/data:image\\/png;base64,/g)||[]).length} : result) }`)
  // A rota está em fixture/app/api/probe, relativamente à raiz do repositório.
  const build = await command(['build'])
  await build.done
  const socket = createServer()
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  const started = await command(['start', '-H', '127.0.0.1', '-p', String(port)])
  server = started.child
  started.done.catch(() => {})
  const url = `http://127.0.0.1:${port}/api/probe`
  for (let attempts = 0; ; attempts++) {
    try { await fetch(url); break } catch (error) {
      if (attempts > 100 || server.exitCode !== null) throw error
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  const response = await fetch(url, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({sourcePdfBase64:pdf(),fieldSchema:[],values:{}}) })
  const result = await response.json()
  assert.equal(result.ok, true, `Compiled renderer failed: ${JSON.stringify(result)}`)
  assert.equal(result.pages, 2)
  assert.equal(result.images, 2)
  assert.ok(result.bytes > 0)
  console.log(JSON.stringify({compiledRuntime:true,http:response.status,...result}))
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve))
    server.kill('SIGTERM')
    await exited
  }
  await rm(fixture, { recursive: true, force: true })
}
