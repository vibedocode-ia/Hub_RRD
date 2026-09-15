import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const route = readFileSync(path.join(process.cwd(), 'src/app/api/settings/people/route.ts'), 'utf8')

test('local person creation persists the selected status only in the local users contract', () => {
  assert.match(route, /tx\.insert\(users\)\.values\(\{[\s\S]*?isActive:\s*input\.isActive/)
  assert.match(route, /tx\.insert\(userPermissions\)/)
  assert.doesNotMatch(route, /centralHub|whatsapp|sofia\/actions/i)
})
