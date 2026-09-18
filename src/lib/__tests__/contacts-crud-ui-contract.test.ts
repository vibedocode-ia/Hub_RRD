import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const source = readFileSync(path.join(process.cwd(), 'src/app/portal/contatos/ContactsClient.tsx'), 'utf8')

test('contacts portal exposes edit and safe archive actions backed by existing API routes', () => {
  assert.match(source, /Editar contato/)
  assert.match(source, /Arquivar contato/)
  assert.match(source, /method:\s*editing \? 'PATCH' : 'POST'/)
  assert.match(source, /`\/api\/contatos\/\$\{editing\.id\}`/)
  assert.match(source, /method:\s*'DELETE'/)
  assert.match(source, /setItems\(current => current\.filter\(item => item\.id !== id\)\)/)
  assert.match(source, /window\.confirm\(/)
})

test('contact mutations recover from transport failures with operator feedback', () => {
  assert.match(source, /async function save[\s\S]*?catch \{[\s\S]*?setError\('Não foi possível salvar o contato\. Verifique a conexão e tente novamente\.'\)/)
  assert.match(source, /async function save[\s\S]*?finally \{\s*setSaving\(false\)/)
  assert.match(source, /async function archive[\s\S]*?catch \{[\s\S]*?setError\('Não foi possível arquivar o contato\. Verifique a conexão e tente novamente\.'\)/)
})
