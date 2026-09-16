import { NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { db, teams, vehicles } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

const text = (value: unknown) => typeof value === 'string' ? value.trim() || null : null
const participants = (value: unknown) => Array.isArray(value) ? value.map(String).map(x => x.trim()).filter(Boolean).slice(0, 100) : []

export async function GET() {
  if (!await requireLocalPermission('operations.read') || !db) return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  return NextResponse.json({ teams: await db.select().from(teams).orderBy(asc(teams.name)) })
}

export async function POST(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  const body = await request.json()
  const name = text(body.name)
  if (!name) return NextResponse.json({ error: 'O nome da equipe é obrigatório.' }, { status: 400 })
  const [team] = await db.insert(teams).values({ name, leaderName: text(body.leaderName), phone: text(body.phone), description: text(body.description), participants: participants(body.participants), isActive: body.isActive !== false }).returning()
  return NextResponse.json({ team }, { status: 201 })
}

export async function PATCH(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  const body = await request.json(); const id = text(body.id)
  if (!id) return NextResponse.json({ error: 'Equipe inválida.' }, { status: 400 })
  const values: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of ['name','leaderName','phone','description'] as const) if (body[key] !== undefined) values[key] = text(body[key])
  if (body.participants !== undefined) values.participants = participants(body.participants)
  if (typeof body.isActive === 'boolean') values.isActive = body.isActive
  if (values.name === null) return NextResponse.json({ error: 'O nome da equipe é obrigatório.' }, { status: 400 })
  const [team] = await db.update(teams).set(values as any).where(eq(teams.id, id)).returning()
  return team ? NextResponse.json({ team }) : NextResponse.json({ error: 'Equipe não encontrada.' }, { status: 404 })
}

export async function DELETE(request: Request) {
  if (!await requireLocalPermission('operations.write') || !db) return NextResponse.json({ error: 'Não autorizado' }, { status: db ? 403 : 503 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Equipe inválida.' }, { status: 400 })
  const [team] = await db.update(teams).set({ isActive: false, updatedAt: new Date() }).where(and(eq(teams.id, id), eq(teams.isActive, true))).returning()
  if (!team) return NextResponse.json({ error: 'Equipe não encontrada ou já arquivada.' }, { status: 404 })
  await db.update(vehicles).set({ teamId: null, updatedAt: new Date() }).where(eq(vehicles.teamId, id))
  return NextResponse.json({ success: true, team })
}
