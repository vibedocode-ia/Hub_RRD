import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, serviceRequests, serviceRequestMaterials, insumos } from '@/db'
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
    return NextResponse.json({ error: 'A descrição do material é obrigatória.' }, { status: 400 })
  }

  const insumoId = text(body.insumoId)
  const quantity = String(body.quantity || '1.00')
  const unit = text(body.unit) || 'Unidade'
  const unitCost = String(body.unitCost || '0.00')
  const totalCost = String(body.totalCost || (Number(quantity) * Number(unitCost)).toFixed(2))

  const [item] = await db
    .insert(serviceRequestMaterials)
    .values({
      serviceRequestId: id,
      insumoId,
      description,
      quantity,
      unit,
      unitCost,
      totalCost,
      stockDeducted: false,
    })
    .returning()

  return NextResponse.json({ success: true, material: item }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.write')
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
  if (!db) return NextResponse.json({ error: 'Banco indisponível' }, { status: 500 })

  const { id } = await params
  const materialId = new URL(req.url).searchParams.get('materialId')
  if (!materialId) return NextResponse.json({ error: 'ID do material inválido' }, { status: 400 })

  const [deleted] = await db
    .delete(serviceRequestMaterials)
    .where(and(eq(serviceRequestMaterials.id, materialId), eq(serviceRequestMaterials.serviceRequestId, id)))
    .returning()

  if (!deleted) return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true, material: deleted })
}
