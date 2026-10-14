import { build } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve as resolvePath } from 'node:path'

const OUT_DIR = '.guided-ui-build'
const require = createRequire(process.cwd() + '/')
let failures = 0
const check = (label, condition, extra = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}${extra ? ' :: ' + extra : ''}`)
  if (!condition) failures += 1
}

await mkdir(OUT_DIR, { recursive: true })

// Alias mínimo para "@/..." + stub determinístico de módulos de banco (não usados em render).
const aliasPlugin = {
  name: 'guided-ui-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const mapped = resolvePath('src/' + args.path.slice(2))
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(mapped + ext)) return { path: mapped + ext }
      }
      return { path: mapped, namespace: 'stub' }
    })
    build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => {
      if (/([/\\]|^)db$|lib[/\\]actions[/\\]operacional$/.test(args.path)) {
        return { contents: 'module.exports = new Proxy({}, { get: () => () => {} })', loader: 'js' }
      }
      return null
    })
  },
}

// Bundle dos componentes-alvo, exportados por um registry próprio (jsx automático).
await writeFile(
  resolvePath(OUT_DIR, 'registry.tsx'),
  `import React from 'react'
import { OperacionalClient } from '@/components/portal/operacional-client'
import LeadDetailClient from '@/app/portal/leads/[id]/LeadDetailClient'
import EditLeadForm from '@/app/portal/leads/[id]/EditLeadForm'
export const factory = { React, OperacionalClient, LeadDetailClient, EditLeadForm }
`,
)

const bundle = await build({
  entryPoints: [resolvePath(OUT_DIR, 'registry.tsx')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.tsx': 'tsx' },
  define: { 'process.env.NODE_ENV': '"development"' },
  external: ['react', 'react-dom', 'react-dom/client', 'react-dom/server', 'lucide-react', 'swr'],
  packages: 'external',
  plugins: [aliasPlugin],
  logLevel: 'silent',
})
await writeFile(resolvePath(OUT_DIR, 'registry.cjs'), bundle.outputFiles[0].text)

// Shim mínimo do next/navigation: os clientes usam useRouter/usePathname de verdade.
const routerShim = {
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {}, prefetch: () => {}, back: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: () => {},
  notFound: () => {},
}
const Module = require('node:module')
const originalLoad = Module._load
Module._load = function patched(request, parent, isMain) {
  if (request === 'next/navigation') return routerShim
  return originalLoad.call(this, request, parent, isMain)
}

const { factory } = require(resolvePath(OUT_DIR, 'registry.cjs'))
const React = factory.React
const { OperacionalClient, LeadDetailClient, EditLeadForm } = factory

// Avisos/erros de render do React capturados durante todo o teste.
const reactWarnings = []
const originalError = console.error
const originalWarn = console.warn
console.error = (...args) => { reactWarnings.push(String(args[0])); originalError(...args) }
console.warn = (...args) => { reactWarnings.push(String(args[0])); originalWarn(...args) }
const { renderToString } = require('react-dom/server')

const team = { id: 'team-test', name: 'Equipe demonstração', leaderName: 'Líder teste', phone: '0000000000', participants: ['Participante A', 'Participante B'], description: 'Descrição equipe', isActive: true }
const vehicle = { id: 'vehicle-test', name: 'Veículo demonstração', plate: 'TEST000', type: 'Caminhão', teamId: team.id, description: 'Descrição veículo', notes: 'Observação teste', isActive: true }
const closedVehicle = { ...vehicle, id: 'vehicle-closed', isActive: false }
const lead = { id: '00000000-0000-4000-8000-000000000001', name: 'Lead demonstração', phone: '0000000000', status: 'NEW', priority: 'NORMAL', sourceChannel: 'TEST' }
const proposal = { id: 'proposal-test', title: 'Proposta preservada', status: 'DRAFT', totalValue: '100' }

const operationalHtml = renderToString(React.createElement(OperacionalClient, { initialEquipes: [team], initialFrotas: [vehicle, closedVehicle] }))
if (process.env.DUMP_HTML) console.log(String(operationalHtml).replace(/></g, '>\n<'))
const operationalSource = await readFile('src/components/portal/operacional-client.tsx', 'utf8')
check('operacional: bloco de detalhes presente exatamente 1x no componente (sem duplicação)', operationalSource.split('Detalhes {details.kind').length - 1 === 1, `ocorrências=${operationalSource.split('Detalhes {details.kind').length - 1}`)
check('operacional: modal com aria-modal/aria-labelledby e botão Fechar', operationalSource.includes('aria-modal="true" aria-labelledby="operational-detail-title"') && operationalSource.includes('>Fechar<'))
check('operacional: rótulos explícitos PT-BR no modal (equipe + veículo)', ['Nome', 'Líder', 'Telefone', 'Participantes', 'Descrição', 'Situação', 'Placa', 'Tipo/modelo', 'Equipe vinculada', 'Observações'].every((label) => operationalSource.includes(`['${label}'`)))
// Contagem de ações distintas por tipo de cadastro (1 equipe ativa + 1 veículo ativo + 1 veículo arquivado).
const actionCount = (text) => (operationalHtml.match(new RegExp('>' + text + '</button>', 'g')) || []).length
const iconActionCount = (text) => (operationalHtml.match(new RegExp('</svg> ' + text + '</button>', 'g')) || []).length
check('operacional: Ver 1x por cadastro (3 cadastros listados)', actionCount('Ver') === 3, `ver=${actionCount('Ver')}`)
check('operacional: Editar 1x por cadastro e Checklist só em veículo ativo', iconActionCount('Editar') === 3 && iconActionCount('Checklist') === 1, `editar=${iconActionCount('Editar')} checklist=${iconActionCount('Checklist')}`)
check('operacional: Arquivar 2x (equipe ativa + veículo ativo) e nenhuma ação duplicada', iconActionCount('Arquivar') === 2 && iconActionCount('Editar') + iconActionCount('Arquivar') === 5)
check('operacional: situação traduzida (Ativa/Arquivado)', operationalHtml.includes('Ativa') && operationalHtml.includes('Arquivado'))

const leadHtml = renderToString(React.createElement(LeadDetailClient, { lead, address: null, requests: [], proposals: [proposal], audit: [], documents: [] }))
check('lead: ficha renderiza propostas com valor preservado', leadHtml.includes('Proposta preservada') && leadHtml.includes('100'))
check('lead: ficha editável mantém fluxo comercial (Marcar enviada + Nova proposta)', leadHtml.includes('Marcar enviada') && leadHtml.includes('Nova proposta'))
const leadReadOnlyHtml = renderToString(React.createElement(LeadDetailClient, { lead, address: null, requests: [], proposals: [proposal], audit: [], documents: [], readOnly: true }))
check('lead somente leitura: sem editar/criar/mudar status, mas com propostas visíveis', !leadReadOnlyHtml.includes('Editar lead') && !leadReadOnlyHtml.includes('Nova proposta') && !leadReadOnlyHtml.includes('Marcar enviada') && leadReadOnlyHtml.includes('Proposta preservada'))
check('lead: formulário de edição embutido na ficha (page.tsx não substitui mais a ficha)', (await readFile('src/app/portal/leads/[id]/LeadDetailClient.tsx', 'utf8')).includes('EditLeadForm') && !(await readFile('src/app/portal/leads/[id]/page.tsx', 'utf8')).includes('return <EditLeadForm'))
const formHtml = renderToString(React.createElement(EditLeadForm, { lead, onSaved: () => {} }))
check('lead: formulário cobre os campos PT-BR aceitos pelo PATCH', ['Nome', 'Telefone', 'E-mail', 'CPF/CNPJ', 'Origem', 'Status', 'Prioridade', 'Serviço de interesse', 'Problema relatado', 'Observações'].every((label) => formHtml.includes(label)))

// Interação real em DOM via jsdom (quando disponível).
let jsdom = null
try { jsdom = await import('jsdom') } catch { jsdom = null }
if (jsdom) {
  const dom = new jsdom.JSDOM('<!doctype html><html><body></body></html>', { url: 'https://localhost/?test' })
  const { window } = dom
  global.window = window
  global.document = window.document
  global.navigator = window.navigator
  global.HTMLElement = window.HTMLElement
  global.Node = window.Node
  global.IS_REACT_ACT_ENVIRONMENT = true
  global.fetch = async (_url, options) => new window.Response(JSON.stringify({ success: true, lead }), { status: 200, headers: { 'content-type': 'application/json' } })
  const { createRoot } = require('react-dom/client')
  const { act } = require('react')

  const container = window.document.createElement('div')
  window.document.body.appendChild(container)
  const root = createRoot(container)
  let interactionError = null
  try {
    await act(async () => { root.render(React.createElement(OperacionalClient, { initialEquipes: [team], initialFrotas: [vehicle] })) })
    const verTeam = [...container.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Ver')
    await act(async () => { verTeam.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
    const dialogs = container.querySelectorAll('[role="dialog"]')
    check('interação: clique em Ver abre exatamente 1 modal', dialogs.length === 1, `dialogs=${dialogs.length}`)
    const dialogText = dialogs[0]?.textContent || ''
    check('interação: modal mostra valor + rótulo PT-BR', dialogText.includes('Líder') && dialogText.includes('Líder teste') && dialogText.includes('Situação'))
    check('interação: modal não expõe chaves cruas em inglês', !dialogText.includes('isActive') && !dialogText.includes('leaderName') && !dialogText.includes('teamId'))
    const close = [...dialogs[0].querySelectorAll('button')].find((button) => button.textContent.trim() === 'Fechar')
    await act(async () => { close.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
    check('interação: Fechar remove o modal', container.querySelectorAll('[role="dialog"]').length === 0)
  } catch (error) { interactionError = error }
  root.unmount()
  check('interação: sem erro de render no fluxo operacional', !interactionError, interactionError ? String(interactionError) : '')

  const container2 = window.document.createElement('div')
  window.document.body.appendChild(container2)
  const root2 = createRoot(container2)
  let leadError = null
  try {
    await act(async () => { root2.render(React.createElement(LeadDetailClient, { lead, address: null, requests: [], proposals: [proposal], audit: [], documents: [] })) })
    const editToggle = [...container2.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Editar lead')
    await act(async () => { editToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true })) })
    const text = container2.textContent
    check('interação: abrir edição mantém a ficha e as propostas visíveis', text.includes('Editar Lead') && text.includes('Proposta preservada') && text.includes('Marcar enviada'))
    const openedForms = container2.querySelectorAll('form').length
    check('interação: apenas 1 formulário de edição aberto (sem duplicação)', openedForms === 1, `forms=${openedForms}`)
  } catch (error) { leadError = error }
  root2.unmount()
  check('interação: sem erro de render na ficha de lead', !leadError, leadError ? String(leadError) : '')
} else {
  console.log('INFO — jsdom ausente: interação em DOM não executada neste ambiente')
}

const genuineReactErrors = reactWarnings.filter((message) => /Warning:|Invalid|Each child in a list|cannot appear as a|hydration/i.test(message))
check('react: sem avisos/erros de render nos componentes auditados', genuineReactErrors.length === 0, genuineReactErrors.slice(0, 3).join(' | '))

console.log(`\n${failures === 0 ? 'RESULTADO: TODOS OS TESTES GUIADOS PASSARAM' : `RESULTADO: ${failures} teste(s) falharam`}`)
process.exitCode = failures === 0 ? 0 : 1
