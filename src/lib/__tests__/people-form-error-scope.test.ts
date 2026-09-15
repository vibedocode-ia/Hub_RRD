import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const client = readFileSync(path.join(process.cwd(), 'src/app/portal/settings/pessoas/PeopleAccessClient.tsx'), 'utf8')

test('people page errors and people form errors use separate state', () => {
  assert.match(client, /const \[pageError, setPageError\] = useState\(''\)/)
  assert.match(client, /const \[formError, setFormError\] = useState\(''\)/)
  assert.match(client, /if \(!response\.ok\) setPageError\(/)
  assert.match(client, /if \(!response\.ok\) \{ setFormError\(/)
})

test('form errors render only inside the active people modal', () => {
  assert.match(client, /\{pageError && <p className="rounded-xl border border-red-800/)
  assert.match(client, /\{formError && <p className="mb-4 rounded-xl bg-red-950\/40/)
  assert.doesNotMatch(client, /\{error && <p className="rounded-xl border border-red-800/)
})
