import test from 'node:test'
import assert from 'node:assert/strict'
import { validateStockAdjustment } from '../inventory'

test('rejects non-finite and non-positive inventory adjustments', () => {
  for (const quantity of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0.001, 0.004]) {
    assert.equal(validateStockAdjustment(quantity).ok, false)
  }
  assert.deepEqual(validateStockAdjustment(0.005), { ok: true, quantity: 0.01 })
  assert.deepEqual(validateStockAdjustment(1.234), { ok: true, quantity: 1.23 })
})

test('rejects an outbound adjustment that exceeds available stock', () => {
  assert.deepEqual(validateStockAdjustment(4, { direction: 'SAIDA', available: 3 }), {
    ok: false,
    error: 'Estoque insuficiente para esta saída.',
  })
})

test('accepts finite positive adjustments within available outbound stock', () => {
  assert.deepEqual(validateStockAdjustment(2.5, { direction: 'SAIDA', available: 3 }), { ok: true, quantity: 2.5 })
  assert.deepEqual(validateStockAdjustment(2.5, { direction: 'ENTRADA', available: 0 }), { ok: true, quantity: 2.5 })
})
