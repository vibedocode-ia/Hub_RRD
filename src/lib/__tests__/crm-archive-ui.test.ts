import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('CRM detail presents archive semantics without claiming history deletion', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'src/app/portal/crm/[id]/page.tsx'), 'utf8')
  assert.match(page, /label="Arquivar cliente"/)
  assert.match(page, /confirmText="Arquivar este cliente\? O histórico e os documentos serão preservados\."/)
  assert.doesNotMatch(page, /Excluir este cliente e todo o histórico vinculado/)
})
