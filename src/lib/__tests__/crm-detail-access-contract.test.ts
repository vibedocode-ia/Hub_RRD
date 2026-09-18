import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

for (const route of ['src/app/portal/crm/[id]/page.tsx', 'src/app/portal/crm/[id]/editar/page.tsx']) {
  test(`${route} denies CRM reads before database access`, () => {
    const source = readFileSync(path.join(process.cwd(), route), 'utf8')
    const guard = source.indexOf("requireLocalPermission('crm.read')")
    const firstRead = source.indexOf('db.select()')
    assert.ok(guard >= 0, 'crm.read guard must exist')
    assert.ok(firstRead >= 0 && guard < firstRead, 'guard must execute before database reads')
    assert.match(source, /redirect\('\/portal'\)/)
  })
}
