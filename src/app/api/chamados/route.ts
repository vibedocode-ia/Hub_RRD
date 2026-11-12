import { NextRequest, NextResponse } from 'next/server';
import { db, serviceRequests, serviceRequestMaterials, serviceRequestExpenses, REQUEST_STATUS, LEAD_STATUS } from '@/db';
import { requireLocalPermission } from '@/lib/require-local-permission';

const text = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);
const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(String)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];

export async function POST(req: NextRequest) {
  try {
    const authorized = await requireLocalPermission('operations.write');
    if (!authorized) {
      return NextResponse.json({ error: 'Permissão insuficiente para criar chamado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      clientId,
      addressId,
      serviceType,
      priority,
      problemReported,
      totalAmount,
      internalNotes,
      customerNotes,
      assignedTeamId,
      assignedCollaboratorIds,
      vehicleId,
      equipmentId,
      scheduledAt,
      materials,
      expenses,
    } = body;

    if (!clientId || !addressId || !problemReported) {
      return NextResponse.json({ error: 'Informe o cliente, o endereço e a descrição do problema.' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
    }

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const requestCode = `OS-2026-${randomCode}`;

    const newRequest = await db.transaction(async (tx) => {
      const [sr] = await tx
        .insert(serviceRequests)
        .values({
          code: requestCode,
          clientId,
          addressId,
          sourceChannel: 'PORTAL_MANUAL',
          leadStatus: LEAD_STATUS.NOVO,
          priority: priority || 'NORMAL',
          serviceType: serviceType || 'DESENTUPIMENTO',
          problemReported,
          status: REQUEST_STATUS.AGENDADO,
          totalAmount: totalAmount || '0.00',
          internalNotes: text(internalNotes),
          customerNotes: text(customerNotes),
          assignedTeamId: text(assignedTeamId),
          assignedCollaboratorIds: stringList(assignedCollaboratorIds),
          vehicleId: text(vehicleId),
          equipmentId: text(equipmentId),
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        })
        .returning();

      // Inserir materiais consumidos se fornecidos
      if (Array.isArray(materials) && materials.length > 0) {
        for (const item of materials) {
          if (!item.description) continue;
          const qty = String(item.quantity || '1.00');
          const unitCost = String(item.unitCost || '0.00');
          const totalCost = String(item.totalCost || (Number(qty) * Number(unitCost)).toFixed(2));
          await tx.insert(serviceRequestMaterials).values({
            serviceRequestId: sr.id,
            insumoId: text(item.insumoId),
            description: String(item.description).trim(),
            quantity: qty,
            unit: String(item.unit || 'Unidade').trim(),
            unitCost,
            totalCost,
            stockDeducted: false,
          });
        }
      }

      // Inserir despesas operacionais se fornecidas
      if (Array.isArray(expenses) && expenses.length > 0) {
        for (const exp of expenses) {
          if (!exp.description) continue;
          await tx.insert(serviceRequestExpenses).values({
            serviceRequestId: sr.id,
            category: text(exp.category) || 'OUTRO',
            description: String(exp.description).trim(),
            amount: String(exp.amount || '0.00'),
          });
        }
      }

      return sr;
    });

    return NextResponse.json({ success: true, requestId: newRequest.id, code: newRequest.code }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar chamado:', error);
    return NextResponse.json({ error: 'Falha interna ao criar chamado.' }, { status: 500 });
  }
}
