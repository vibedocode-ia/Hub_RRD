import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { financialReadResult } from '../sofia-operational-queries'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('document mutations and Sofia summary respect archived requests and overdue receivables', () => {
  const documentRoute = read('src/app/api/documents/[id]/route.ts')
  const sofiaRoute = read('src/app/api/sofia/actions/route.ts')
  assert.doesNotMatch(documentRoute, /update\(officialDocuments\)/)
  assert.match(read('src/lib/official-document-lifecycle.ts'), /serviceRequests\.archivedAt/)
  // The reducer moved to the shared read helper; verify delegation AND behavior,
  // rather than requiring an inline implementation in the HTTP route.
  assert.match(sofiaRoute, /financialReadResult\(rows, data\)/)
  const result = financialReadResult([
    { id: 'pending', tipo: 'RECEITA', status: 'PENDENTE', valor: '10.00', data: '2026-09-01' },
    { id: 'overdue', tipo: 'RECEITA', status: 'ATRASADO', valor: '20.00', data: '2026-09-01' },
  ], {})
  assert.equal(result.summary.receivable, 30)
  assert.equal(result.summary.overdueReceivable, 20)
  assert.match(sofiaRoute, /isNull\(serviceRequests\.archivedAt\)/)
})
