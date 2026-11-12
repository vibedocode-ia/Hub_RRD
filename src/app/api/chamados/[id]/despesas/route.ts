import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, serviceRequests, serviceRequestExpenses } from '@/db'
import { requireLocalPermission } from '@/lib/require-local-permission'

type Params = { params: Promise<{ id: string }> }

const text = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null)

export async function POST(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.write')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const description = text(body.description)

  if (!description) {
    return NextResponse.json({ error: 'A descrição da despesa é obrigatória.' }, { status: 400 })
  }

  const category = text(body.category) || 'OUTRO'
  const amount = String(body.amount || '0.00')

  const [expense] = await db
    .insert(serviceRequestExpenses)
    .values({
      serviceRequestId: id,
      category,
      description,
      amount,
    })
    .returning()

  return NextResponse.json({ success: true, expense }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.write')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 })

  const { id } = await params
  const expenseId = new URL(req.url).searchParams.get('expenseId')
  if (!expenseId) return NextResponse.json({ error: 'ID da despesa inválido' }, { status: 400 })

  const [deleted] = await db
    .delete(serviceRequestExpenses)
    .where(and(eq(serviceRequestExpenses.id, expenseId), eq(serviceRequestExpenses.serviceRequestId, id)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
  return NextResponse.json({ success: true, expense: deleted })
}
