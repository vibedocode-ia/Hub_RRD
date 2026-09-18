import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

function arrayDeclaration(source: string, name: string) {
  const match = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\s*\\];`))
  assert.ok(match, `${name} must be declared as an array`)
  return match[1]
}

test('Serviços is reachable from the desktop sidebar and mobile primary navigation', () => {
  const layout = read('src/app/portal/layout.tsx')
  const mobileNavigation = read('src/app/portal/components/MobileBottomNav.tsx')

  const desktopItems = arrayDeclaration(layout, 'navItems')
  const mobilePrimaryItems = arrayDeclaration(mobileNavigation, 'mainItems')

  assert.match(desktopItems, /section: 'Operação', label: 'Serviços', href: '\/portal\/servicos', icon: Wrench/)
  assert.match(mobilePrimaryItems, /label: 'Serviços', href: '\/portal\/servicos', icon: Wrench/)
})

test('the standard unit command includes portal navigation contracts', () => {
  const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

  assert.match(packageJson.scripts?.['test:unit'] ?? '', /tsx --test src\/lib\/__tests__\/\*\.test\.ts/)
})
