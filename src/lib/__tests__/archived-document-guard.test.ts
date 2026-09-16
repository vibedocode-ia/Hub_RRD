import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('document mutations and Sofia summary respect archived requests and overdue receivables', () => {
  const documentRoute = read('src/app/api/documents/[id]/route.ts')
  const sofiaRoute = read('src/app/api/sofia/actions/route.ts')
  assert.match(documentRoute, /isNull\(serviceRequests\.archivedAt\)/)
  assert.match(sofiaRoute, /row\.status === 'PENDENTE' \|\| row\.status === 'ATRASADO'/)
  assert.match(sofiaRoute, /isNull\(serviceRequests\.archivedAt\)/)
})
