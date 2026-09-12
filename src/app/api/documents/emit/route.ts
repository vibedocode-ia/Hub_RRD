import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, serviceRequests, clients, clientAddresses, officialDocuments, documentTemplates, DOC_STATUS } from '../../../../db';
import { requireLocalPermission } from '../../../../lib/require-local-permission';
import { renderDocumentHTML } from '../../../../lib/documents/pdf-generator';
import { moneyToWords } from '../../../../lib/documents/money-to-words';

export async function POST(req: NextRequest) {
  try {
    const authorized = await requireLocalPermission('documents.issue');
    if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para emitir documentos.' }, { status: 403 });
    const user = authorized.access;

    const body = await req.json();
    const { serviceRequestId, docType, amount, paymentMethod, warrantyDays, warrantyTerms, amountInWords, technicalNotes } = body;
    if (!serviceRequestId || !['RECIBO_GARANTIA', 'LAUDO_TECNICO', 'ORCAMENTO'].includes(docType)) {
      return NextResponse.json({ error: 'Informe o chamado e um tipo de documento válido.' }, { status: 400 });
    }
    if (!db) return NextResponse.json({ error: 'Banco de dados indisponível' }, { status: 500 });

    const [template] = await db.select().from(documentTemplates).where(eq(documentTemplates.docType, docType)).limit(1);
    if (!template || !template.isActive) return NextResponse.json({ error: 'Não há modelo ativo para este tipo de documento.' }, { status: 422 });

    const records = await db
      .select({ req: serviceRequests, cli: clients, addr: clientAddresses })
      .from(serviceRequests)
      .innerJoin(clients, eq(serviceRequests.clientId, clients.id))
      .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);
    if (!records.length) return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 });

    const { req: serviceRequest, cli, addr } = records[0];
    const rawAmount = String(amount || serviceRequest.totalAmount || '').trim();
    const numericAmount = Number(rawAmount.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Informe um valor válido antes de emitir o documento.' }, { status: 400 });
    }
    if (!cli.document || !addr) {
      return NextResponse.json({ error: 'Complete CPF/CNPJ e endereço do cliente antes da emissão.' }, { status: 400 });
    }

    const formattedAmount = numericAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amountText = String(amountInWords || moneyToWords(numericAmount)).trim();
    const fullAddress = [
      `${addr.street}, ${addr.number}`,
      addr.complement,
      addr.floorOrUnit,
      `${addr.neighborhood}, ${addr.city}/${addr.state || 'RJ'}`,
      addr.zipCode ? `CEP ${addr.zipCode}` : null,
    ].filter(Boolean).join(' - ');

    const now = new Date();
    const year = now.getFullYear();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const fullDateText = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const docNumber = docType === 'RECIBO_GARANTIA' ? `REC-${year}-${suffix}` : docType === 'LAUDO_TECNICO' ? `OS-${year}-${suffix}` : `ORC-${year}-${suffix}`;
    const resolvedPayment = String(paymentMethod || serviceRequest.paymentMethod || '').trim();
    if (!resolvedPayment) return NextResponse.json({ error: 'Informe a forma de pagamento.' }, { status: 400 });

    const documentPayload = docType === 'RECIBO_GARANTIA'
      ? {
          type: 'RECIBO_GARANTIA' as const,
          data: {
            docNumber,
            paymentDate: formattedDate,
            paymentDateExtended: fullDateText,
            amount: formattedAmount,
            amountInWords: amountText,
            clientName: cli.name,
            clientDoc: cli.document,
            serviceDescription: serviceRequest.problemReported,
            address: fullAddress,
            city: 'Niterói',
            paymentMethod: resolvedPayment,
            issuedAtCity: 'Niterói/RJ',
          },
        }
      : docType === 'LAUDO_TECNICO' ? {
          type: 'LAUDO_TECNICO' as const,
          data: {
            docNumber,
            executionDate: formattedDate,
            clientName: cli.name,
            clientDoc: cli.document,
            clientAddress: fullAddress,
            serviceType: serviceRequest.serviceType,
            serviceDescription: serviceRequest.problemReported,
            items: [{ description: serviceRequest.problemReported, quantity: 1, unitPrice: formattedAmount, subtotal: formattedAmount }],
            totalAmount: formattedAmount,
            paymentMethod: resolvedPayment,
            technicalNotes: String(technicalNotes || serviceRequest.problemFound || '').trim(),
            technicianName: 'LEONARDO SANTOS',
            warrantyDays: Number(warrantyDays || serviceRequest.warrantyDays || 30),
            warrantyTerms: String(warrantyTerms || '').trim(),
          },
        } : {
          type: 'ORCAMENTO' as const,
          data: {
            docNumber, issueDate: formattedDate, contractor: cli.name,
            object: serviceRequest.serviceType, serviceScope: serviceRequest.problemReported,
            totalAmount: formattedAmount, paymentMethod: resolvedPayment,
            validityDays: '15 dias', executionDeadline: 'A combinar',
            guarantees: String(warrantyTerms || (serviceRequest.warrantyDays ? `Garantia de ${serviceRequest.warrantyDays} dias.` : '')).trim(),
          },
        };

    const htmlSnapshot = renderDocumentHTML(documentPayload);
    const [documentRecord] = await db.insert(officialDocuments).values({
      docType,
      docNumber,
      serviceRequestId,
      clientId: cli.id,
      templateVersion: template.version,
      totalValue: numericAmount.toFixed(2),
      amountInWords: amountText,
      paymentMethod: resolvedPayment,
      hasWarranty: true,
      warrantyDays: Number(warrantyDays || serviceRequest.warrantyDays || 30),
      warrantyTerms: warrantyTerms || null,
      technicalNotes: technicalNotes || serviceRequest.problemFound || null,
      documentPayloadSnapshot: documentPayload,
      htmlSnapshot,
      status: DOC_STATUS.EMITIDO,
      issuedAt: now,
      createdById: user.id,
    }).returning();

    if (docType === 'RECIBO_GARANTIA') {
      await db.update(serviceRequests).set({ status: 'CONCLUIDO' }).where(eq(serviceRequests.id, serviceRequestId));
    }

    return NextResponse.json({
      success: true,
      documentId: documentRecord.id,
      docNumber: documentRecord.docNumber,
      previewUrl: `/portal/documentos/preview/${documentRecord.id}`,
    });
  } catch (error) {
    console.error('Erro ao emitir documento:', error);
    return NextResponse.json({ error: 'Falha interna ao emitir documento.' }, { status: 500 });
  }
}
