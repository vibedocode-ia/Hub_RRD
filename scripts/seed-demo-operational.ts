import { and, eq } from 'drizzle-orm'
import { getDb, clients, clientAddresses, teams, vehicles, equipment, serviceRequests, financeiroLancamentos, insumos, serviceCatalog } from '../src/db'

const db = getDb()
const now = new Date()
const at = (monthsAgo: number, day: number) => new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 10)
const demoClients = [
  ['Condomínio Mirante das Águas', 'CONDOMINIO', 'Icaraí', 'Contrato preventivo de redes e caixas de gordura.'],
  ['Bistrô do Porto', 'PJ', 'São Francisco', 'Manutenção comercial recorrente de caixa de gordura.'],
  ['Residencial Vila do Sol', 'CONDOMINIO', 'Santa Rosa', 'Atendimento de áreas comuns e colunas.'],
  ['Clínica Horizonte Saúde', 'PJ', 'Fonseca', 'Prioridade para atendimento fora do horário clínico.'],
  ['Mercado Bom Vizinho', 'PJ', 'Barreto', 'Limpeza periódica e suporte emergencial.'],
  ['Edifício Costa Azul', 'CONDOMINIO', 'Ingá', 'Revisão trimestral de prumadas e ralos.'],
  ['Restaurante Sabor da Serra', 'PJ', 'Centro', 'Caixa de gordura com acesso pela lateral.'],
  ['Marina Atlântica Serviços', 'PJ', 'Charitas', 'Hidrojateamento e limpeza de drenagem.'],
  ['Casa da Família Nogueira', 'PF', 'Piratininga', 'Cliente recorrente para manutenção residencial.'],
  ['Loja Oficina Central', 'PJ', 'Santa Rosa', 'Drenagem de piso e escoamento de oficina.'],
  ['Condomínio Parque das Palmeiras', 'CONDOMINIO', 'Vital Brasil', 'Chamados preventivos e emergenciais.'],
  ['Pousada Caminho do Mar', 'PJ', 'Itacoatiara', 'Fossa e caixa de gordura em alta temporada.'],
  ['Galeria Comercial Arariboia', 'PJ', 'Centro', 'Contrato de manutenção de banheiros e rede.'],
  ['Residência Almeida', 'PF', 'Pendotiba', 'Atendimento de pia, ralo e caixa de gordura.'],
  ['Instituto Aprender Mais', 'PJ', 'Santa Rosa', 'Atendimento programado após expediente.'],
] as const
const serviceNames = ['Desentupimento residencial', 'Desentupimento de coluna / rede', 'Hidrojateamento', 'Limpeza de caixa de gordura', 'Limpa fossa / sucção']

async function one<T>(query: Promise<T[]>) { const rows = await query; return rows[0] }
async function main() {
  const teamRows = [] as any[]
  for (const [name, leaderName, phone] of [['Equipe Hidrojato Norte', 'Diego Martins', '21990000001'], ['Equipe Sucção Sul', 'Marcos Vinícius', '21990000002'], ['Equipe Atendimento Rápido', 'Paulo Henrique', '21990000003']] as const) {
    let row = await one(db.select().from(teams).where(eq(teams.name, name)).limit(1))
    if (!row) [row] = await db.insert(teams).values({ name, leaderName, phone, isActive: true }).returning()
    teamRows.push(row)
  }
  const vehicleRows = [] as any[]
  for (const [name, type, plate] of [['Caminhão Vacol 690', 'CAMINHAO_VACUO', 'RRD6A90'], ['Strada Hidrojato', 'HIDROJATO', 'RRD2H24'], ['Strada Operacional', 'UTILITARIO', 'RRD7O31']] as const) {
    let row = await one(db.select().from(vehicles).where(eq(vehicles.name, name)).limit(1))
    if (!row) [row] = await db.insert(vehicles).values({ name, type, plate, isActive: true }).returning()
    vehicleRows.push(row)
  }
  for (const [name, code] of [['Hidrojato Compacto 500 bar', 'EQ-HJ-500'], ['Rotor Industrial 30 m', 'EQ-RT-030'], ['Bomba de Sucção 1.200 L', 'EQ-SC-1200'], ['Câmera de Inspeção 30 m', 'EQ-CI-030'], ['Kit NR-33 Espaço Confinado', 'EQ-NR33']] as const) {
    const existing = await one(db.select().from(equipment).where(eq(equipment.code, code)).limit(1))
    if (!existing) await db.insert(equipment).values({ name, code, isActive: true })
  }
  for (const [nome, categoria, quantidade, unidade, nivelCritico] of [['Desengordurante técnico', 'DEDSETIZACAO', '3', 'L', '5'], ['Luvas nitrílicas', 'EPI', '8', 'pares', '10'], ['Mangueira hidrojato 30m', 'HIDROJATO', '2', 'unidades', '2'], ['Máscara PFF2', 'EPI', '4', 'unidades', '10'], ['Saco coletor de resíduos', 'OPERACAO', '40', 'unidades', '20']] as const) {
    const existing = await one(db.select().from(insumos).where(eq(insumos.nome, nome)).limit(1))
    if (!existing) await db.insert(insumos).values({ nome, categoria, quantidade, unidade, nivelCritico })
  }
  const serviceRows = await db.select().from(serviceCatalog)
  for (let index = 0; index < demoClients.length; index++) {
    const [name, type, neighborhood, notes] = demoClients[index]
    const phone = `5521998${String(100000 + index).slice(-6)}`
    let client = await one(db.select().from(clients).where(eq(clients.normalizedPhone, phone)).limit(1))
    if (!client) [client] = await db.insert(clients).values({ type, name, phone: `+${phone}`, normalizedPhone: phone, email: `operacao${index + 1}@demo.rrd.local`, contactPerson: type === 'PF' ? name : 'Responsável operacional', source: index % 3 === 0 ? 'INDICACAO' : 'WHATSAPP_SOFIA', recurrence: index % 3 === 0 ? 'CONTRATO_FIXO' : 'SERVICO_AVULSO', customerSince: at(8 - (index % 6), 5 + index), lastContactAt: at(index % 2, 3 + index), nextVisitAt: index % 3 === 0 ? at(-1, 8 + index) : null, notes }).returning()
    let address = await one(db.select().from(clientAddresses).where(and(eq(clientAddresses.clientId, client.id), eq(clientAddresses.isMain, true))).limit(1))
    if (!address) [address] = await db.insert(clientAddresses).values({ clientId: client.id, street: 'Rua das Acácias', number: String(20 + index), neighborhood, city: 'Niterói', state: 'RJ', propertyType: type === 'CONDOMINIO' ? 'CONDOMINIO' : type === 'PJ' ? 'COMERCIAL' : 'RESIDENCIAL', isMain: true }).returning()
    for (let month = 0; month < 4; month++) {
      const code = `DEMO-${now.getFullYear()}-${String(index + 1).padStart(2, '0')}-${month}`
      const exists = await one(db.select({ id: serviceRequests.id }).from(serviceRequests).where(eq(serviceRequests.code, code)).limit(1))
      const amount = 280 + ((index * 73 + month * 120) % 1250)
      const isPending = month === 0 && index % 4 === 0
      if (!exists) await db.insert(serviceRequests).values({ code, clientId: client.id, addressId: address.id, sourceChannel: 'WHATSAPP_SOFIA', leadStatus: isPending ? 'EM_ORCAMENTO' : 'APROVADO', priority: isPending ? 'URGENTE_24H' : 'NORMAL', serviceType: serviceRows[index % serviceRows.length]?.name ?? serviceNames[index % serviceNames.length], problemReported: isPending ? 'Solicitação aguardando confirmação de agenda e valor.' : 'Manutenção e desobstrução programada.', problemFound: isPending ? null : 'Resíduos acumulados removidos; fluxo normalizado.', status: isPending ? 'PENDING_REVIEW' : 'CONCLUIDO', requestedAt: at(month, 4 + index), scheduledAt: at(month, 6 + index), completedAt: isPending ? null : at(month, 7 + index), assignedTeamId: teamRows[index % teamRows.length].id, vehicleId: vehicleRows[index % vehicleRows.length].id, totalAmount: String(amount), paymentMethod: index % 2 ? 'Pix' : 'Cartão', warrantyDays: 30 })
      const description = `Atendimento ${code} · ${name}`
      const hasEntry = await one(db.select({ id: financeiroLancamentos.id }).from(financeiroLancamentos).where(eq(financeiroLancamentos.descricao, description)).limit(1))
      if (!hasEntry) await db.insert(financeiroLancamentos).values({ tipo: 'RECEITA', valor: String(amount), descricao: description, data: at(month, 9 + index), categoria: 'SERVICOS', clientId: client.id, status: isPending ? 'PENDENTE' : 'EFETIVADO' })
    }
  }
  for (const [description, amount, month, status] of [['Combustível e deslocamentos', '1860', 0, 'EFETIVADO'], ['Manutenção preventiva de frota', '920', 0, 'PENDENTE'], ['EPIs e insumos operacionais', '640', 1, 'EFETIVADO'], ['Descarte licenciado de resíduos', '1180', 1, 'EFETIVADO'], ['Revisão de hidrojato', '1450', 2, 'EFETIVADO']] as const) {
    const key = `[DEMO] ${description} ${month}`
    const exists = await one(db.select({ id: financeiroLancamentos.id }).from(financeiroLancamentos).where(eq(financeiroLancamentos.descricao, key)).limit(1))
    if (!exists) await db.insert(financeiroLancamentos).values({ tipo: 'DESPESA', valor: amount, descricao: key, data: at(month, 12), categoria: 'OPERACIONAL', status })
  }
  console.log(JSON.stringify({ seeded: true, clients: demoClients.length, teams: teamRows.length, vehicles: vehicleRows.length }))
}
main().then(() => process.exit(0)).catch(err => { console.error('Demo seed failed:', err.message); process.exit(1) })
