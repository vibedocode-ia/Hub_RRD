import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import {
  db,
  serviceRequests,
  serviceRequestMaterials,
  serviceRequestExpenses,
  auditEvents,
  clients,
  clientAddresses,
  teams,
  vehicles,
  equipment,
  collaborators,
} from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

type Params = { params: Promise<{ id: string }> };

const text = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

export async function GET(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.read');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para visualizar chamado' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });

  const { id } = await params;
  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, id), isNull(serviceRequests.archivedAt)))
    .limit(1);

  if (!request) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });

  const [clientList, addressList, teamList, vehicleList, equipmentList, materialsList, expensesList] = await Promise.all([
    db.select().from(clients).where(eq(clients.id, request.clientId)).limit(1),
    db.select().from(clientAddresses).where(eq(clientAddresses.id, request.addressId)).limit(1),
    request.assignedTeamId ? db.select().from(teams).where(eq(teams.id, request.assignedTeamId)).limit(1) : Promise.resolve([]),
    request.vehicleId ? db.select().from(vehicles).where(eq(vehicles.id, request.vehicleId)).limit(1) : Promise.resolve([]),
    request.equipmentId ? db.select().from(equipment).where(eq(equipment.id, request.equipmentId)).limit(1) : Promise.resolve([]),
    db.select().from(serviceRequestMaterials).where(eq(serviceRequestMaterials.serviceRequestId, id)),
    db.select().from(serviceRequestExpenses).where(eq(serviceRequestExpenses.serviceRequestId, id)),
  ]);

  return NextResponse.json({
    request,
    client: clientList[0] || null,
    address: addressList[0] || null,
    team: teamList[0] || null,
    vehicle: vehicleList[0] || null,
    equipment: equipmentList[0] || null,
    materials: materialsList,
    expenses: expensesList,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('operations.write');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para editar chamado' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const {
    serviceType,
    priority,
    problemReported,
    problemFound,
    status,
    totalAmount,
    paymentMethod,
    internalNotes,
    customerNotes,
    warrantyDays,
    cancelReason,
    assignedTeamId,
    assignedCollaboratorIds,
    vehicleId,
    equipmentId,
    scheduledAt,
    materials,
    expenses,
  } = body;

  if (problemReported !== undefined && !problemReported) {
    return NextResponse.json({ error: 'Descrição do problema não pode ser vazia.' }, { status: 400 });
  }

  const values: Record<string, any> = { updatedAt: new Date() };
  if (serviceType !== undefined) values.serviceType = serviceType || 'DESENTUPIMENTO';
  if (priority !== undefined) values.priority = priority || 'NORMAL';
  if (problemReported !== undefined) values.problemReported = problemReported;
  if (problemFound !== undefined) values.problemFound = text(problemFound);
  if (status !== undefined) values.status = status || 'AGENDADO';
  if (totalAmount !== undefined) values.totalAmount = totalAmount || '0.00';
  if (paymentMethod !== undefined) values.paymentMethod = paymentMethod || 'Pix';
  if (internalNotes !== undefined) values.internalNotes = text(internalNotes);
  if (customerNotes !== undefined) values.customerNotes = text(customerNotes);
  if (warrantyDays !== undefined) values.warrantyDays = Number(warrantyDays || 30);
  if (cancelReason !== undefined) values.cancelReason = text(cancelReason);
  if (assignedTeamId !== undefined) values.assignedTeamId = text(assignedTeamId);
  if (assignedCollaboratorIds !== undefined) values.assignedCollaboratorIds = stringList(assignedCollaboratorIds);
  if (vehicleId !== undefined) values.vehicleId = text(vehicleId);
  if (equipmentId !== undefined) values.equipmentId = text(equipmentId);
  if (scheduledAt !== undefined) values.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(serviceRequests)
      .set(values)
      .where(and(eq(serviceRequests.id, id), isNull(serviceRequests.archivedAt)))
      .returning();

    if (!updated) return null;

    // Se a lista de materiais foi explicitamente enviada no payload, sincronizar
    if (Array.isArray(materials)) {
      await tx.delete(serviceRequestMaterials).where(eq(serviceRequestMaterials.serviceRequestId, id));
      for (const item of materials) {
        if (!item.description) continue;
        const qty = String(item.quantity || '1.00');
        const unitCost = String(item.unitCost || '0.00');
        const totalCost = String(item.totalCost || (Number(qty) * Number(unitCost)).toFixed(2));
        await tx.insert(serviceRequestMaterials).values({
          serviceRequestId: id,
          insumoId: text(item.insumoId),
          description: String(item.description).trim(),
          quantity: qty,
          unit: String(item.unit || 'Unidade').trim(),
          unitCost,
          totalCost,
          stockDeducted: Boolean(item.stockDeducted),
        });
      }
    }

    // Se a lista de despesas operacionais foi explicitamente enviada no payload, sincronizar
    if (Array.isArray(expenses)) {
      await tx.delete(serviceRequestExpenses).where(eq(serviceRequestExpenses.serviceRequestId, id));
      for (const exp of expenses) {
        if (!exp.description) continue;
        await tx.insert(serviceRequestExpenses).values({
          serviceRequestId: id,
          category: text(exp.category) || 'OUTRO',
          description: String(exp.description).trim(),
          amount: String(exp.amount || '0.00'),
        });
      }
    }

    return updated;
  });

  if (!result) return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, requestId: id, request: result });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authorized = await requireLocalPermission('settings.manage');
  if (!authorized) return NextResponse.json({ error: 'Permissão administrativa obrigatória para arquivar chamado' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 503 });
  const { id } = await params;

  const archiveResult = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: serviceRequests.id,
        status: serviceRequests.status,
        archivedAt: serviceRequests.archivedAt,
      })
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id));
    if (!existing) return { kind: 'missing' as const };
    if (existing.archivedAt) return { kind: 'already_archived' as const };

    const [request] = await tx
      .update(serviceRequests)
      .set({
        archivedAt: new Date(),
        archivedById: authorized.access.id,
        updatedAt: new Date(),
      })
      .where(and(eq(serviceRequests.id, id), isNull(serviceRequests.archivedAt)))
      .returning();
    if (!request) return { kind: 'already_archived' as const };

    await tx.insert(auditEvents).values({
      actorUserId: authorized.access.id,
      action: 'service_request.archived',
      targetType: 'service_request',
      targetId: request.id,
      metadata: { previousStatus: existing.status },
    });
    return { kind: 'archived' as const };
  });

  if (archiveResult.kind === 'missing') return NextResponse.json({ error: 'Chamado não encontrado' }, { status: 404 });
  return NextResponse.json({
    success: true,
    archived: archiveResult.kind === 'archived',
    alreadyArchived: archiveResult.kind === 'already_archived',
  });
}
