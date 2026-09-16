import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('inventory persists movements and the portal does not render fictional movement entries', () => {
  const schema = read('src/db/schema.ts')
  const migration = read('src/db/migrations/0017_stock_movements.sql')
  const page = read('src/app/portal/estoque/page.tsx')
  const action = read('src/lib/actions/estoque.ts')
  const quickAdjustmentRoute = read('src/app/api/estoque/insumos/route.ts')
  const view = read('src/components/portal/estoque-client.tsx')

  assert.match(schema, /export const stockMovements = pgTable\('stock_movements'/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "stock_movements"/)
  assert.match(page, /stockMovements/)
  assert.match(action, /tx\.insert\(stockMovements\)/)
  assert.match(action, /requireLocalPermission\('inventory\.write'\)/)
  assert.match(quickAdjustmentRoute, /stockMovements/)
  assert.doesNotMatch(view, /Mocked entries|Ações \(Mocked\)|K-Othrine WG|Equipe Alpha/)
  assert.match(view, /Nenhuma movimentação registrada\./)
})
