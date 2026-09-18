import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDocumentIdentity } from '../document-identity'

test('accepts valid CPF/CNPJ and rejects arbitrary or repeated identity values', () => {
  assert.deepEqual(resolveDocumentIdentity('529.982.247-25'), { document: '52998224725', type: 'PF' })
  assert.deepEqual(resolveDocumentIdentity('53.102.506/0001-78'), { document: '53102506000178', type: 'PJ' })
  assert.equal(resolveDocumentIdentity('abc'), null)
  assert.equal(resolveDocumentIdentity('111.111.111-11'), null)
  assert.equal(resolveDocumentIdentity('00.000.000/0000-00'), null)
})
