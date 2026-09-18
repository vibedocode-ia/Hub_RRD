import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const source = readFileSync(path.join(process.cwd(), 'src/app/portal/contatos/ContactsClient.tsx'), 'utf8')

test('a linked contact provides a direct navigation path to its CRM profile', () => {
  assert.match(source, /import Link from 'next\/link'/)
  assert.match(source, /item\.clientId\s*&&\s*<div[\s\S]*?<Link href=\{`\/portal\/crm\/\$\{item\.clientId\}`\}/)
  assert.match(source, />Abrir CRM<\/Link>/)
})
