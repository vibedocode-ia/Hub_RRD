import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, serviceRequests, clients, clientAddresses, officialDocuments, DOC_STATUS, DOC_TYPES } from '../../../../db';
import { getSessionUser } from '../../../../lib/auth';
import { renderDocumentHTML } from '../../../../lib/documents/pdf-generator';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { serviceRequestId, docType, amount, paymentMethod, warrantyDays, warrantyTerms, amountInWords, technicalNotes } = body;

    if (!serviceRequestId || !docType) {
      return NextResponse.json({ error: 'Informe o chamado e o tipo de documento.' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Banco de dados indisponível' }, { status: 500 });
    }

    // Busca chamado + cliente + endereço
    const requests = await db
      .select({
        req: serviceRequests,
        cli: clients,
        addr: clientAddresses,
      })
      .from(serviceRequests)
      .innerJoin(clients, eq(serviceRequests.clientId, clients.id))
      .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
      .where(eq(serviceRequests.id, serviceRequestId))
      .limit(1);

    if (requests.length === 0) {
      return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 });
    }

    const { req: sReq, cli, addr } = requests[0];

    const docNumber = docType === 'RECIBO_GARANTIA'
      ? `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`
      : `OS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const dateNow = new Date();
    const formattedDate = dateNow.toLocaleDateString('pt-BR');
    const fullDateText = dateNow.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    let documentPayload: any;

    if (docType === 'RECIBO_GARANTIA') {
      documentPayload = {
        type: 'RECIBO_GARANTIA',
        data: {
          docNumber,
          paymentDate: formattedDate,
          paymentDateExtended: fullDateText,
          amount: amount || sReq.totalAmount || '300,00',
          amountInWords: amountInWords || 'trezentos reais',
          clientName: cli.name,
          clientDoc: cli.document || 'Não informado',
          serviceDescription: sReq.problemReported,
          address: addr ? `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city}/RJ` : 'Niterói/RJ',
          city: addr?.city || 'Niterói',
          paymentMethod: paymentMethod || sReq.paymentMethod || 'Pix',
          issuedAtCity: 'Niterói/RJ',
        },
      };
    } else {
      documentPayload = {
        type: docType,
        data: {
          docNumber,
          executionDate: formattedDate,
          clientName: cli.name,
          clientDoc: cli.document || 'Não informado',
          clientAddress: addr ? `${addr.street}, ${addr.number} ${addr.complement || ''} - ${addr.neighborhood}, ${addr.city}/RJ` : 'Niterói/RJ',
          serviceType: sReq.serviceType,
          serviceDescription: sReq.problemReported,
          items: [
            {
              description: sReq.problemReported,
              quantity: 1,
              unitPrice: amount || sReq.totalAmount || '300,00',
              subtotal: amount || sReq.totalAmount || '300,00',
            },
          ],
          totalAmount: amount || sReq.totalAmount || '300,00',
          paymentMethod: paymentMethod || sReq.paymentMethod || 'Pix',
          technicalNotes: technicalNotes || 'Serviço executado e inspecionado junto ao cliente.',
          technicianName: 'LEONARDO SANTOS',
          warrantyDays: warrantyDays || sReq.warrantyDays || 30,
          warrantyTerms: warrantyTerms || '',
        },
      };
    }

    const htmlSnapshot = renderDocumentHTML(documentPayload);

    const [docRecord] = await db
      .insert(officialDocuments)
      .values({
        docType,
        docNumber,
        serviceRequestId,
        clientId: cli.id,
        templateVersion: 'V1.0',
        totalValue: amount || sReq.totalAmount || '300.00',
        amountInWords: amountInWords || null,
        paymentMethod: paymentMethod || 'Pix',
        hasWarranty: true,
        warrantyDays: warrantyDays || 30,
        warrantyTerms: warrantyTerms || null,
        documentPayloadSnapshot: documentPayload, // SNAPSHOT IMUTÁVEL CONGELADO
        htmlSnapshot,
        status: DOC_STATUS.EMITIDO,
        issuedAt: new Date(),
        createdById: user.id,
      })
      .returning();

    // Atualiza chamado para CONCLUIDO se for recibo
    if (docType === 'RECIBO_GARANTIA') {
      await db.update(serviceRequests).set({ status: 'CONCLUIDO' }).where(eq(serviceRequests.id, serviceRequestId));
    }

    return NextResponse.json({
      success: true,
      documentId: docRecord.id,
      docNumber: docRecord.docNumber,
      previewUrl: `/portal/documentos/preview/${docRecord.id}`,
    });
  } catch (error: any) {
    console.error('Erro ao emitir documento:', error);
    return NextResponse.json({ error: 'Falha interna ao emitir documento.' }, { status: 500 });
  }
}
