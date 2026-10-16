import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db, serviceRequests, clients, clientAddresses } from '../../../../db';
import { requireLocalPermission } from '../../../../lib/require-local-permission';
import { selectSofiaDocumentTemplate } from '../../../../lib/sofia-document-template';
import { requiredDocumentDraftFields } from '../../../../lib/sofia-document-draft';
import { resolveDocumentIdentity } from '../../../../lib/document-identity';

/** Request-bound legacy issuance is read-only until wired to the transactional issuer.
 * That issuer alone invokes renderRegisteredTemplate(template, ...) and snapshots
 * templateSourceSha256: template.sourceSha256 from the immutable registered PDF. */
export async function POST(req: NextRequest) {
  const authorized = await requireLocalPermission('documents.issue');
  if (!authorized) return NextResponse.json({ error: 'Permissão insuficiente para emitir documentos.' }, { status: 403 });
  if (!db) return NextResponse.json({ error: 'Banco de dados indisponível.' }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const { serviceRequestId, docType } = body;
  if (!serviceRequestId || !['RECIBO_GARANTIA', 'LAUDO_TECNICO', 'ORCAMENTO', 'ORCAMENTO_TECNICO'].includes(docType)) {
    return NextResponse.json({ error: 'Informe o chamado e um tipo de documento válido.' }, { status: 400 });
  }
  const records = await db.select({ req: serviceRequests, cli: clients, addr: clientAddresses })
    .from(serviceRequests).innerJoin(clients, eq(serviceRequests.clientId, clients.id))
    .leftJoin(clientAddresses, eq(serviceRequests.addressId, clientAddresses.id))
    .where(and(eq(serviceRequests.id, serviceRequestId), isNull(serviceRequests.archivedAt))).limit(1);
  if (!records.length) return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 });
  const { req: request, cli } = records[0];
  const confirmed = {
    customerName: body.customerName ?? cli.name,
    customerDocument: body.customerDocument ?? cli.document,
    amount: body.amount ?? (request.totalAmount === '0.00' ? '' : request.totalAmount),
    documentDate: body.documentDate,
    problemReported: body.problemReported ?? request.problemReported,
  };
  const pendingFields = requiredDocumentDraftFields(confirmed);
  if (pendingFields.length) return NextResponse.json({ error: 'Informe os cinco dados mínimos do documento.', pendingFields }, { status: 422 });
  const identity = resolveDocumentIdentity(confirmed.customerDocument)!;
  if (identity.document.replace(/\D/g, '') !== String(cli.document || '').replace(/\D/g, '') || String(confirmed.customerName).trim().toLocaleLowerCase('pt-BR') !== cli.name.trim().toLocaleLowerCase('pt-BR')) {
    return NextResponse.json({ error: 'Destinatário diverge do cliente vinculado ao chamado.' }, { status: 422 });
  }
  const template = await selectSofiaDocumentTemplate(docType, body.templateId);
  if (!template) return NextResponse.json({ error: 'Não há modelo ativo para este tipo de documento.' }, { status: 422 });
  return NextResponse.json({ error: 'Esta rota legada ainda não integra emissão direta segura. Use o fluxo autorizado de rascunhos da Sofia; nenhum documento foi emitido.' }, { status: 409 });
}
