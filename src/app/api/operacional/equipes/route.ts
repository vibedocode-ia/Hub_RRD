import { NextResponse } from 'next/server'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, teams, vehicles, collaborators } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

const text = (value: unknown) => (typeof value === 'string' ? value.trim() || null : null)
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 100)
    : []

export async function GET() {
  if (!await requireLocalPermission('operations.read') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }
  const rows = await db.select().from(teams).orderBy(asc(teams.name))
  return NextResponse.json({ teams: rows })
}

export async function POST(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const body = await request.json().catch(() => ({}))
  const name = text(body.name)
  if (!name) return NextResponse.json({ error: 'O nome da equipe é obrigatório.' }, { status: 400 })

  const leaderId = text(body.leaderId)
  let leaderName = text(body.leaderName)
  const defaultVehicleId = text(body.defaultVehicleId)
  const memberIds = stringList(body.memberIds)
  let participants = stringList(body.participants)

  // Sincronizar nome do líder a partir do colaborador se leaderId foi informado
  if (leaderId && !leaderName) {
    const leaderRow = await db.select({ name: collaborators.name, phone: collaborators.phone }).from(collaborators).where(eq(collaborators.id, leaderId)).limit(1)
    if (leaderRow[0]) {
      leaderName = leaderRow[0].name
      if (!body.phone && leaderRow[0].phone) body.phone = leaderRow[0].phone
    }
  }

  // Sincronizar participantes a partir dos colaboradores se memberIds foi informado
  if (memberIds.length > 0 && participants.length === 0) {
    const memberRows = await db.select({ name: collaborators.name }).from(collaborators).where(inArray(collaborators.id, memberIds))
    participants = memberRows.map((m) => m.name)
  }

  const [team] = await db
    .insert(teams)
    .values({
      name,
      leaderId,
      leaderName,
      phone: text(body.phone),
      description: text(body.description),
      defaultVehicleId,
      memberIds,
      participants,
      isActive: body.isActive !== false,
    })
    .returning()

  // Se um veículo padrão foi selecionado, podemos associá-lo a esta equipe
  if (defaultVehicleId) {
    await db.update(vehicles).set({ teamId: team.id, updatedAt: new Date() }).where(eq(vehicles.id, defaultVehicleId))
  }

  return NextResponse.json({ team }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const body = await request.json().catch(() => ({}))
  const id = text(body.id)
  if (!id) return NextResponse.json({ error: 'Equipe inválida.' }, { status: 400 })

  const values: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ['name', 'leaderId', 'leaderName', 'phone', 'description', 'defaultVehicleId'] as const) {
    if (body[key] !== undefined) values[key] = text(body[key])
  }
  if (body.memberIds !== undefined) values.memberIds = stringList(body.memberIds)
  if (body.participants !== undefined) values.participants = stringList(body.participants)
  if (typeof body.isActive === 'boolean') values.isActive = body.isActive

  if (values.name === null) return NextResponse.json({ error: 'O nome da equipe é obrigatório.' }, { status: 400 })

  // Sincronizar nome do líder caso leaderId tenha sido atualizado
  if (values.leaderId && !values.leaderName) {
    const leaderRow = await db.select({ name: collaborators.name }).from(collaborators).where(eq(collaborators.id, values.leaderId as string)).limit(1)
    if (leaderRow[0]) values.leaderName = leaderRow[0].name
  }

  // Sincronizar lista de participantes se memberIds foi atualizado
  if (Array.isArray(values.memberIds) && values.memberIds.length > 0 && (!values.participants || (values.participants as string[]).length === 0)) {
    const memberRows = await db.select({ name: collaborators.name }).from(collaborators).where(inArray(collaborators.id, values.memberIds as string[]))
    values.participants = memberRows.map((m) => m.name)
  }

  const [team] = await db.update(teams).set(values as any).where(eq(teams.id, id)).returning()
  if (!team) return NextResponse.json({ error: 'Equipe não encontrada.' }, { status: 404 })

  if (values.defaultVehicleId) {
    await db.update(vehicles).set({ teamId: team.id, updatedAt: new Date() }).where(eq(vehicles.id, values.defaultVehicleId as string))
  }

  return NextResponse.json({ team })
}

export async function DELETE(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Equipe inválida.' }, { status: 400 })

  const [team] = await db
    .update(teams)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(teams.id, id), eq(teams.isActive, true)))
    .returning()

  if (!team) return NextResponse.json({ error: 'Equipe não encontrada ou já arquivada.' }, { status: 404 })

  await db.update(vehicles).set({ teamId: null, updatedAt: new Date() }).where(eq(vehicles.teamId, id))
  return NextResponse.json({ success: true, team })
}
