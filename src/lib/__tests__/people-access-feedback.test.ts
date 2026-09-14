import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const client = readFileSync(path.join(process.cwd(), 'src/app/portal/settings/pessoas/PeopleAccessClient.tsx'), 'utf8')

test('local people form renders field-level validation details returned by the API', () => {
  assert.match(client, /formatPeopleValidationError/)
  assert.match(client, /result\.details/)
  assert.match(client, /phone: 'Telefone'/)
  assert.match(client, /password: 'Senha temporária'/)
})
