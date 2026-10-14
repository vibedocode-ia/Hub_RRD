import { build } from 'esbuild'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve as resolvePath } from 'node:path'

// Isolamento de teste: NODE_ENV=production evita o cache de conexão em globalThis
// (compartilhado entre o bundle CJS e o ESM do teste) misturar dialetos de driver.
process.env.NODE_ENV = 'production'

const OUT_DIR = '.guided-ui-build-api'
const require = createRequire(process.cwd() + '/')
let failures = 0
const check = (label, condition, extra = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'} — ${label}${extra ? ' :: ' + extra : ''}`)
  if (!condition) failures += 1
}
const fail = (label, error) => check(label, false, String(error).slice(0, 300))

await mkdir(OUT_DIR, { recursive: true })

// Duplo de permissão: o alvo do teste é a validação do PATCH, não a sessão.
await writeFile(
  resolvePath(OUT_DIR, 'auth.ts'),
  `let current = null
export const setAuth = (value) => { current = value }
export const requireLocalPermission = async () => current
export const getCurrentLocalAccess = async () => current
`,
)

const aliasPlugin = {
  name: 'guided-ui-api-alias',
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const mapped = resolvePath('src/' + args.path.slice(2))
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(mapped + ext)) return { path: mapped + ext }
      }
      return { path: mapped, namespace: 'stub' }
    })
    build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'module.exports = new Proxy({}, { get: () => () => {} })', loader: 'js' }))
  },
}

await writeFile(
  resolvePath(OUT_DIR, 'entry.ts'),
  `import { setAuth } from './auth'
import * as leadRoute from '@/app/api/leads/[id]/route'
import * as leadConversion from '@/lib/lead-conversion'
export const registry = { leadRoute, leadConversion, setAuth }
`,
)

const bundle = await build({
  entryPoints: [resolvePath(OUT_DIR, 'entry.ts')],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  packages: 'external',
  plugins: [
    { name: 'auth-override', setup(build) { build.onResolve({ filter: /^@\/lib\/require-local-permission$/ }, () => ({ path: resolvePath(OUT_DIR, 'auth.ts') })) } },
    aliasPlugin,
  ],
  logLevel: 'silent',
})
await writeFile(resolvePath(OUT_DIR, 'entry.cjs'), bundle.outputFiles[0].text)

// Diagnóstico de falha sem dados de linha ou valores do banco.
const originalConsoleError = console.error
console.error = (...args) => {
  if (String(args[0]).includes('Falha ao atualizar Lead')) originalConsoleError('Falha ao atualizar Lead:', args[1]?.code || 'erro sem código')
  else originalConsoleError(...args)
}
const { registry } = require(resolvePath(OUT_DIR, 'entry.cjs'))
const { leadRoute, setAuth } = registry

const owner = { id: '11111111-1111-4111-8111-111111111111', role: 'OWNER', access: { id: '11111111-1111-4111-8111-111111111111', role: 'OWNER', permissions: ['crm.read', 'crm.write'] } }
const patch = (id, body) => leadRoute.PATCH(new Request('http://localhost/api/leads/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })
const get = (id) => leadRoute.GET(new Request('http://localhost/api/leads/' + id), { params: Promise.resolve({ id }) })

const { leads, leadAuditEvents, leadProposals, users } = await import('./../../db/schema.ts')
const { db } = await import('./../../db/index.ts')
const { eq } = await import('drizzle-orm')

// Semente sintética por execução (sem PII real) — removida no final.
const RUN = Date.now().toString().slice(-9)
const PHONE = '21' + RUN
let lead = null
try {
  // Usuário sintético: actor_user_id tem FK para users(id).
  await db.insert(users).values({ id: owner.access.id, name: 'Owner E2E', phone: '21' + RUN + '0', passwordHash: 'scrypt:test', role: 'OWNER', isActive: true }).onConflictDoNothing()
  ;[lead] = await db.insert(leads).values({ name: 'Lead E2E', phone: PHONE, normalizedPhone: PHONE, status: 'NEW', priority: 'NORMAL', sourceChannel: 'WHATSAPP', email: 'e2e@example.com' }).returning()
  const [proposal] = await db.insert(leadProposals).values({ leadId: lead.id, title: 'Proposta E2E', totalValue: '350.00', status: 'DRAFT' }).returning()

  // 1) Leitura autenticada: a ficha mantém o fluxo comercial (propostas + auditoria) na mesma resposta.
  setAuth(owner)
  const before = await get(lead.id)
  const bodyOk = await before.json()
  check('E2E: GET autenticado do lead → 200', before.status === 200, `status=${before.status}`)
  check('E2E: GET devolve a proposta vinculada (fluxo comercial visível na ficha)', Array.isArray(bodyOk.proposals) && bodyOk.proposals.length === 1 && bodyOk.proposals[0].id === proposal.id)
  check('E2E: GET devolve auditoria e documentos', Array.isArray(bodyOk.audit) && Array.isArray(bodyOk.documents))

  // 2) Acesso: sem permissão nada é alterado.
  setAuth(null)
  const noWrite = await patch(lead.id, { name: 'Sem permissão' })
  check('E2E: PATCH sem permissão → 403', noWrite.status === 403, `status=${noWrite.status}`)
  const noRead = await get(lead.id)
  check('E2E: GET sem permissão → 403', noRead.status === 403, `status=${noRead.status}`)

  // 3) Validação do PATCH.
  setAuth(owner)
  const invalidCases = [
    ['id inválido', () => patch('nao-uuid', { name: 'X' })],
    ['corpo vazio', () => patch(lead.id, {})],
    ['nome curto', () => patch(lead.id, { name: 'A' })],
    ['telefone inválido', () => patch(lead.id, { phone: '123' })],
    ['status fora do domínio', () => patch(lead.id, { status: 'PAGO' })],
    ['prioridade inválida', () => patch(lead.id, { priority: 'MAXIMA' })],
    ['e-mail inválido', () => patch(lead.id, { email: 'invalido' })],
    ['campo desconhecido', () => patch(lead.id, { totalValue: '1' })],
    ['campo de conversão', () => patch(lead.id, { convertedClientId: '22222222-2222-4222-8222-222222222222' })],
    ['tipo errado', () => patch(lead.id, { problemReported: 123 })],
  ]
  for (const [label, run] of invalidCases) {
    const response = await run()
    check(`E2E: PATCH rejeita ${label} → 422`, response.status === 422, `status=${response.status}`)
  }

  // 4) Caminho feliz + auditoria.
  const okResponse = await patch(lead.id, { name: 'Lead E2E Editado', priority: 'URGENTE_24H', problemReported: 'Vaso retornando esgoto', notes: 'Aguardando visita' })
  const okBody = await okResponse.json()
  if (okResponse.status !== 200) console.log('Falha no PATCH E2E:', okResponse.status, okBody?.error || 'sem código')
  check('E2E: PATCH válido → 200 com dados atualizados', okResponse.status === 200 && okBody.lead.name === 'Lead E2E Editado' && okBody.lead.priority === 'URGENTE_24H', `status=${okResponse.status}`)
  const auditRows = await db.select().from(leadAuditEvents).where(eq(leadAuditEvents.leadId, lead.id))
  const updatedEvent = auditRows.find((row) => row.action === 'lead.updated')
  check('E2E: PATCH grava evento de auditoria lead.updated', Boolean(updatedEvent))
  check('E2E: auditoria lista só os campos enviados', JSON.stringify(updatedEvent?.metadata?.changed) === JSON.stringify(['name', 'priority', 'problemReported', 'notes']), JSON.stringify(updatedEvent?.metadata))
  check('E2E: auditoria registra o autor', updatedEvent?.actorUserId === owner.access.id)
  const proposalsAfter = await db.select().from(leadProposals).where(eq(leadProposals.leadId, lead.id))
  check('E2E: editar o lead NÃO removeu nem ocultou a proposta', proposalsAfter.length === 1 && proposalsAfter[0].title === 'Proposta E2E')

  // 5) Lead convertido: somente leitura, mas consultável.
  await db.update(leads).set({ convertedAt: new Date(), convertedClientId: '33333333-3333-4333-8333-333333333333' }).where(eq(leads.id, lead.id))
  const afterConversion = await patch(lead.id, { name: 'Tentativa pós-conversão' })
  check('E2E: PATCH em lead convertido → 409', afterConversion.status === 409, `status=${afterConversion.status}`)
  const readResponse = await get(lead.id)
  const readBody = await readResponse.json()
  check('E2E: lead convertido segue consultável com propostas', readResponse.status === 200 && readBody.lead.convertedClientId === '33333333-3333-4333-8333-333333333333' && readBody.proposals.length === 1)

  // 6) Histórico preservado: DELETE não passa com proposta vinculada.
  const deleteResponse = await leadRoute.DELETE(new Request('http://localhost/api/leads/' + lead.id, { method: 'DELETE' }), { params: Promise.resolve({ id: lead.id }) })
  check('E2E: DELETE de lead com proposta vinculada → 409 (histórico preservado)', deleteResponse.status === 409, `status=${deleteResponse.status}`)
} catch (error) {
  fail('E2E: execução sem exceções inesperadas', error)
} finally {
  try {
    if (lead) {
      await db.delete(leadProposals).where(eq(leadProposals.leadId, lead.id))
      await db.delete(leadAuditEvents).where(eq(leadAuditEvents.leadId, lead.id))
      await db.delete(leads).where(eq(leads.id, lead.id))
      await db.delete(users).where(eq(users.id, owner.access.id))
    }
  } catch (error) { console.log('limpeza parcial:', String(error).slice(0, 160)) }
  console.log(`\n${failures === 0 ? 'RESULTADO: TODOS OS TESTES E2E DE API PASSARAM' : `RESULTADO: ${failures} teste(s) falharam`}`)
  process.exit(failures === 0 ? 0 : 1)
}
