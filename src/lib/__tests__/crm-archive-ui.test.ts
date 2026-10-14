import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

test('CRM detail presents archive semantics without claiming history deletion', () => {
  const page = source('src/app/portal/crm/[id]/page.tsx')
  assert.match(page, /label="Arquivar cliente"/)
  assert.match(page, /confirmText="Arquivar este cliente\? O histórico e os documentos serão preservados\."/)
  assert.doesNotMatch(page, /Excluir este cliente e todo o histórico vinculado/)
})

test('CRM detail presents archive semantics without claiming history deletion', () => {
  const page = source('src/app/portal/crm/[id]/page.tsx')
  assert.match(page, /label="Arquivar cliente"/)
  assert.match(page, /confirmText="Arquivar este cliente\? O histórico e os documentos serão preservados\."/)
  assert.doesNotMatch(page, /Excluir este cliente e todo o histórico vinculado/)
})

test('CRM active list offers row-level archive and archived-client filter', () => {
  const dashboard = source('src/components/portal/crm-client-dashboard.tsx')
  assert.match(dashboard, /Arquivar cliente/)
  assert.match(dashboard, /Clientes arquivados/)
  assert.match(dashboard, /restaurar/i)
})

test('Chamados list links to an independent detail route', () => {
  const page = source('src/app/portal/chamados/page.tsx')
  assert.match(page, /Ver chamado/)
  assert.match(page, /\/portal\/chamados\/\$\{req\.id\}/)
})
