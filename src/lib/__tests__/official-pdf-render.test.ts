import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePdfSnapshot, PDF_LIMITS } from '../official-pdf-render'

test('accept exact self-contained snapshot without rewriting and reject active/external resources', () => {
  const html = '<!doctype html><html><head><style>@page{size:A4;margin:0}body{font-family:Arial}</style></head><body><p>João &amp; Cia</p><img src="data:image/png;base64,aGVsbG8="/></body></html>'
  assert.equal(validatePdfSnapshot(html), html)
  for (const unsafe of ['<script>alert(1)</script>', '<img src="https://x.test/p">', '<img src="/assets/logo.png">', '<style>@import "https://x.test";</style>', '<style>p{background:url(https://x.test)}</style>', '<iframe srcdoc="x"></iframe>', '<base href="https://x.test">', '<img onerror="alert(1)">', '<meta http-equiv="refresh" content="0;url=https://x.test">', '<svg><image href="https://x.test"/></svg>', '<style>p{background:u\\72l(https://x.test)}</style>', '<form action="/send"></form>', '<style>p{background:image-set("https://x.test/p" 1x)}</style>', '<img src="data:image/svg+xml;base64,AAAA">']) assert.throws(() => validatePdfSnapshot(unsafe), /PDF_SNAPSHOT_UNSAFE/)
  assert.throws(() => validatePdfSnapshot('x'.repeat(PDF_LIMITS.htmlBytes + 1)), /PDF_SNAPSHOT_SIZE/)
  assert.throws(() => validatePdfSnapshot(''), /PDF_SNAPSHOT_SIZE/)
})
