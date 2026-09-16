import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

test('RRD header user block is an explicit accessible shortcut to edit the current profile', () => {
  const layout = read('src/app/portal/layout.tsx')
  assert.match(layout, /href="\/portal\/perfil"/)
  assert.match(layout, /aria-label="Abrir meu perfil para editar"/)
  assert.match(layout, /Editar meu perfil/)
})

test('RRD password controls stay in the personal profile panel', () => {
  const profile = read('src/app/portal/perfil/ProfileClient.tsx')
  assert.match(profile, /Segurança/)
  assert.match(profile, /Senha atual/)
  assert.match(profile, /Alterar senha/)
})
