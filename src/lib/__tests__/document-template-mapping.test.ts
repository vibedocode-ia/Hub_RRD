import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTemplateFields, rectangleFromDrag } from '../document-template-mapping'

test('normalizes legacy JSON fields without losing placements or defaults', () => {
  const fields = [{ key: 'number', label: 'Número', type: 'text', required: true, defaultValue: '42', placements: [{ page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1 }] }]
  assert.deepEqual(normalizeTemplateFields(JSON.stringify(fields)), fields)
  assert.deepEqual(normalizeTemplateFields(fields), fields)
  assert.throws(() => normalizeTemplateFields('{invalid'))
  assert.deepEqual(normalizeTemplateFields('[]'), [])
})

test('converts reverse drags into page-relative rectangles and clamps to canvas', () => {
  assert.deepEqual(rectangleFromDrag(2, { x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 }), { page: 2, x: 0.2, y: 0.1, width: 0.6000000000000001, height: 0.6 })
  assert.deepEqual(rectangleFromDrag(0, { x: -1, y: 0 }, { x: 2, y: 2 }), { page: 0, x: 0, y: 0, width: 1, height: 1 })
  assert.equal(rectangleFromDrag(0, { x: 0.2, y: 0.2 }, { x: 0.2, y: 0.4 }), null)
})
