import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = (p: string) => readFileSync(`src/${p}`, 'utf8')
test('people routes query and return only explicit nonsecret projections', () => {
 for (const p of ['app/api/settings/people/route.ts', 'app/api/settings/people/[id]/route.ts']) {
  const text = source(p)
  assert.doesNotMatch(text, /\.select\(\)|\.returning\(\)/)
  assert.match(text, /personColumns/)
 }
})
test('permissions replacement deletes all and skips empty insert', () => {
 assert.match(source('app/api/settings/people/[id]/route.ts'), /if \(input.permissions.length\) await tx.insert\(userPermissions\)/)
 assert.match(source('app/api/settings/people/route.ts'), /if \(input.permissions.length\) await tx.insert\(userPermissions\)/)
})
test('DELETE protects linked data and own account without cascade', () => {
 const text = source('app/api/settings/people/[id]/route.ts')
 assert.match(text, /export async function DELETE/)
 assert.match(text, /targetId === actor.id/)
 assert.match(text, /23503/)
 assert.match(text, /canDeactivate: true/)
 assert.match(text, /assertPersonRemovalSafe/)
 assert.doesNotMatch(text, /cascade/i)
})
test('UI sends changed fields and visibly offers delete or deactivate', () => {
 const text = source('app/portal/settings/pessoas/PeopleAccessClient.tsx')
 assert.match(text, /buildPeoplePatch\(editing!, form\)/)
 assert.match(text, />Excluir</)
 assert.match(text, /Desativar pessoa/)
 assert.match(text, /method: 'DELETE'/)
})
