import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DocumentTemplateMapper from '../../components/DocumentTemplateMapper'

test('mapper exposes explicit drawing, repeated pages, color controls and removal without guessing coordinates', () => {
  const html = renderToStaticMarkup(createElement(DocumentTemplateMapper, {
    source: '/source.pdf',
    fields: [{ key: 'number', label: 'Número', type: 'text', required: true, placements: [
      { page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1, background: '#003366', color: '#ffffff' },
      { page: 2, x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
    ] }], onChange: () => {},
  }))
  assert.match(html, /Arraste/)
  assert.match(html, /Página 1/)
  assert.match(html, /Página 3/)
  assert.match(html, /Cor do texto/)
  assert.match(html, /Cor do fundo/)
  assert.match(html, /Remover área/)
  assert.match(html, /#003366/)
  assert.match(html, /#ffffff/)
})
