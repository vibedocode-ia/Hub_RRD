import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('draft actions expose orçamento emission', () => {
 const source=fs.readFileSync(path.join(process.cwd(),'src/app/portal/sofia-drafts/DraftActionButtons.tsx'),'utf8')
 assert.match(source,/handleEmit\('ORCAMENTO'\)/)
 assert.match(source,/Emitir Orçamento/)
})
