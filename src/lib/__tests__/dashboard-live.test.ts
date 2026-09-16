import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('dashboard exposes real monthly revenue, forecast and growth series', () => {
  const route = read('src/app/api/dashboard/bi/route.ts')
  for (const key of ['previousMonthRevenue', 'currentMonthRevenue', 'currentMonthForecast', 'financialGrowth']) assert.match(route, new RegExp(key))
  assert.match(route, /entry\.status === 'PENDENTE' \|\| entry\.status === 'ATRASADO'/)
})

test('dashboard financial cards link directly to financeiro and CRM card uses CRM route', () => {
  const view = read('src/components/portal/dashboard-client.tsx')
  assert.match(view, /href="\/portal\/financeiro"/)
  assert.match(view, /href="\/portal\/crm"/)
})
