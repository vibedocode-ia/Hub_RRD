import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { prepareIssueDraft, resolveIssueRecipient, issueDraftDocument } from '../sofia-issue-draft'
import { OPTIONAL_FIELD_CONSENT } from '../sofia-document-draft'
import { db, users, userPermissions, sofiaDrafts, sofiaEvents, clients, leads, officialDocuments, proposals, leadProposals, auditEvents, documentTemplates, conn } from '../../db'
import { eq } from 'drizzle-orm'

const envReady = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_RRD_URL)
const disposable = process.env.RRD_ISSUER_DISPOSABLE_DB === '1'
const id = '11111111-1111-4111-8111-111111111111'
const optionalFieldConsent = Object.fromEntries(['customer.phone', 'address.street', 'address.number', 'address.neighborhood', 'address.city', 'address.complement', 'address.referencePoint', 'service.paymentMethod', 'service.priority'].map(key => [key, OPTIONAL_FIELD_CONSENT]))
const complete = { customerName: 'Ana Exemplo', customerDocument: '529.982.247-25', amount: '350,50', documentDate: '2026-10-15', problemReported: 'Limpeza da caixa', optionalFieldConsent }
const minimalPdf = (() => {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>', '<< /Length 0 >>\nstream\nendstream']
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${obj}\nendobj\n` })
  const start = body.length
  body += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`
  return Buffer.from(body).toString('base64')
})()

test('five required fields and explicit calendar date gate issuance', () => {
  for (const patch of [{ customerName: '' }, { customerDocument: '11111111111' }, { amount: '0' }, { documentDate: '' }, { documentDate: '2026-02-30' }, { problemReported: '' }]) assert.equal(prepareIssueDraft({ ...complete, ...patch }, {}).ok, false)
  const result = prepareIssueDraft(complete, {})
  assert.equal(result.ok, true)
  if (result.ok) { assert.equal(result.date, '15/10/2026'); assert.equal(result.totalValue, '350.50') }
})

test('lead-only payload retains supplied values and does not invent phone, place, payment, warranty', () => {
  const result = prepareIssueDraft({ ...complete, optionalFieldConsent: Object.fromEntries(['customer.phone','address.street','address.number','address.neighborhood','address.city','address.complement','address.referencePoint','service.paymentMethod','service.priority'].map(field => [field, 'Não informado'])) }, {})
  assert.equal(result.ok, true)
  if (!result.ok) return
  const { data } = result.documentPayloadFor('ORCAMENTO_TECNICO', 'ORCT-2026-1234')
  assert.equal(data.issueDate, '15/10/2026')
  assert.equal(data.contractorName, 'Ana Exemplo')
  assert.equal(data.totalAmount, '350,50')
  for (const field of ['paymentMethod', 'issueCity', 'warranty', 'contractorAddress']) assert.equal(data[field], undefined)
  assert.equal(result.paymentMethod, '')
  assert.equal(result.documentPayloadFor('RECIBO_GARANTIA', 'REC-2026-1234').data.paymentDate, '15/10/2026')
  assert.equal(result.documentPayloadFor('LAUDO_TECNICO', 'OS-2026-1234').data.executionDate, '15/10/2026')
  assert.equal(result.documentPayloadFor('ORCAMENTO', 'ORC-2026-1234').data.issueDate, '15/10/2026')
})

test('explicit optional address/payment/warranty survive without sender phone fallback', () => {
  const result = prepareIssueDraft({ ...complete, customerPhone: '+5500000000000', address: { street: 'Rua das Flores', number: '9', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ' }, paymentMethod: 'Transferência', warrantyDays: 12, documentFields: { warranty: '12 dias' } }, {})
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.match(String(result.documentPayloadFor('ORCAMENTO_TECNICO', 'X').data.contractorAddress), /Rua das Flores, 9.*Centro.*Rio de Janeiro/)
  assert.equal(result.documentPayloadFor('ORCAMENTO_TECNICO', 'X').data.warranty, '12 dias')
  assert.equal(result.documentPayloadFor('ORCAMENTO', 'X').data.paymentMethod, 'Transferência')
  assert.equal(result.documentPayloadFor('LAUDO_TECNICO', 'X').data.warrantyDays, 12)
})

test('recipient must match explicit UUID or unique document/phone identity; sender never identifies customer', () => {
  const lead = { id, name: 'Ana Exemplo', normalizedPhone: '5500000000000', normalizedDocument: '52998224725', convertedClientId: null }
  const client = { id: '22222222-2222-4222-8222-222222222222', name: 'Outra', normalizedPhone: '5521888880000', document: '11144477735', isActive: true }
  assert.deepEqual(resolveIssueRecipient({ ...complete, leadId: id }, [lead], []), { kind: 'lead', id })
  assert.deepEqual(resolveIssueRecipient({ ...complete, customerPhone: '+5500000000000' }, [lead], []), { kind: 'lead', id })
  assert.equal(resolveIssueRecipient(complete, [{ ...lead, name: 'Outra' }], []), null)
  assert.equal(resolveIssueRecipient(complete, [lead], [{ ...client, id: lead.id, name: lead.name, document: lead.normalizedDocument, normalizedPhone: lead.normalizedPhone }]), null)
  assert.equal(resolveIssueRecipient({ ...complete, leadId: id }, [{ ...lead, convertedClientId: client.id }], []), null)
  assert.deepEqual(resolveIssueRecipient({ customerName: client.name, customerDocument: client.document, clientId: client.id }, [], [client]), { kind: 'client', id: client.id })
  assert.equal(resolveIssueRecipient({ ...complete, clientId: client.id, leadId: id }, [lead], [client]), null)
})

test('explicit missing-data acknowledgement issues a document with declared absences', () => {
  const acknowledged = { customerName: '', customerDocument: '', amount: '', documentDate: '', problemReported: '', missingDataAcknowledged: true }
  const result = prepareIssueDraft(acknowledged, {})
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.customerName, 'Não informado')
  assert.equal(result.totalValue, '0.00')
  assert.equal(result.amountInWords, 'zero reais')
  const { data } = result.documentPayloadFor('ORCAMENTO_TECNICO', 'ORCT-2026-0001')
  assert.equal(data.contractorName, 'Não informado')
  assert.equal(data.contractorDocument, 'Não informado')
  assert.equal(data.totalAmount, '0,00')
  assert.match(String(data.issueDate), /^\d{2}\/\d{2}\/\d{4}$/)
  // Sem consentimento, os mesmos dados vazios continuam bloqueando a emissão.
  const blocked = prepareIssueDraft({ customerName: '', customerDocument: '', amount: '', documentDate: '', problemReported: '' }, {})
  assert.equal(blocked.ok, false)
})

test('missing-data acknowledgement keeps real values that were supplied', () => {
  const result = prepareIssueDraft({ ...complete, customerDocument: '', missingDataAcknowledged: true }, {})
  assert.equal(result.ok, true)
  if (!result.ok) return
  const { data } = result.documentPayloadFor('ORCAMENTO_TECNICO', 'ORCT-2026-0002')
  assert.equal(data.contractorName, 'Ana Exemplo')
  assert.equal(data.contractorDocument, 'Não informado')
  assert.equal(data.totalAmount, '350,50')
  assert.equal(data.issueDate, '15/10/2026')
})

test('issuer never inserts clients, addresses or requests as a side-effect', () => {
  const source = readFileSync('src/lib/sofia-issue-draft.ts', 'utf8')
  assert.doesNotMatch(source, /\.insert\((?:clients|clientAddresses|serviceRequests|leads|leadAddresses|leadServiceRequests)\)/)
})

// Opt-in only: an isolated, disposable PostgreSQL and RRD_ISSUER_DISPOSABLE_DB=1 are required.
test('disposable DB: lead + client issuance, retries, ownership, invalid input and CRM row invariants', { skip: !(envReady && disposable) }, async () => {
  const marker = `issuer-${randomUUID()}`
  const senderPhone = '+5500000000101'
  const centralHubId = randomUUID(), centralClientId = randomUUID(), centralContactId = randomUUID()
  const operatorId = randomUUID()
  const permissions = ['sofia.drafts.review', 'documents.issue']
  let createdLead: string | undefined, createdClient: string | undefined
  let originalDocumentId: string | undefined
  const createdDrafts: string[] = []
  const templateSlug = marker
  try {
    const [operator] = await db.insert(users).values({ id: operatorId, name: marker, phone: senderPhone.slice(1), passwordHash: 'test-only', role: 'OPERATOR' }).returning()
    await db.insert(documentTemplates).values({ slug: templateSlug, name: marker, docType: 'ORCAMENTO', version: 'V1', fieldSchema: [], sourcePdfBase64: minimalPdf, sourceFilename: 'test.pdf', sourceSha256: createHash('sha256').update(Buffer.from(minimalPdf, 'base64')).digest('hex') })
    await db.insert(userPermissions).values(permissions.map(permissionKey => ({ userId: operator.id, permissionKey })))
    const baseInput = { senderPhone, centralHubId, centralClientId, centralContactId, centralRole: 'hub_operator', correlationId: marker }
    const makeDraft = async (draftPayload: Record<string, unknown>) => {
      const [row] = await db.insert(sofiaDrafts).values({ ...baseInput, correlationId: `${marker}-${createdDrafts.length}`, intent: 'CRIAR_ORCAMENTO', status: 'PENDING_REVIEW', draftPayload }).returning()
      createdDrafts.push(row.id)
      return row.id
    }
    const [lead] = await db.insert(leads).values({ name: complete.customerName, phone: '+5500000000102', normalizedPhone: '5500000000102', document: complete.customerDocument, normalizedDocument: '52998224725' }).returning()
    createdLead = lead.id
    const leadDraftId = await makeDraft({ ...complete, leadId: lead.id, docType: 'ORCAMENTO' })
    const input = { ...baseInput, draftId: leadDraftId }
    const first = await issueDraftDocument(input)
    assert.equal(first.ok, true, JSON.stringify(first))
    if (!first.ok) return
    const [document] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, first.result.documentId))
    assert.equal(document.leadId, lead.id)
    assert.equal(document.clientId, null)
    assert.equal(document.serviceRequestId, null)
    assert.equal(document.totalValue, '350.50')
    assert.equal(document.paymentMethod, '')
    assert.deepEqual((document.documentPayloadSnapshot as any).data.issueDate, '15/10/2026')
    originalDocumentId = document.id
    assert.equal(document.status, 'EMITIDO')
    assert.equal(document.sentAt, null)
    const [issuedProposal] = await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, document.id))
    assert.equal(issuedProposal.status, 'DRAFT', 'issuance is not transmission')
    assert.equal(issuedProposal.sentAt, null)
    const revisionDraftId = await makeDraft({ ...complete, leadId: lead.id, docType: 'ORCAMENTO' })
    const revision = await issueDraftDocument({ ...baseInput, draftId: revisionDraftId, correlationId: `${marker}-revision`, supersedesDocumentId: document.id })
    assert.equal(revision.ok, true, JSON.stringify(revision))
    if (revision.ok) {
      const [replacement] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, revision.result.documentId))
      assert.equal(replacement.supersedesDocumentId, document.id)
      assert.equal(replacement.leadId, lead.id)
      assert.equal(replacement.status, 'EMITIDO')
      assert.equal(replacement.sentAt, null)
      const [revisedProposal] = await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, replacement.id))
      assert.equal(revisedProposal.status, 'DRAFT')
      assert.equal(revisedProposal.sentAt, null)
      const [preserved] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, document.id))
      assert.equal(preserved.status, 'EMITIDO')
      assert.deepEqual(preserved.documentPayloadSnapshot, document.documentPayloadSnapshot)
      assert.equal(preserved.htmlSnapshot, document.htmlSnapshot)
      assert.equal(preserved.docNumber, document.docNumber)
      assert.notEqual(replacement.id, document.id)
      assert.deepEqual(new Set((await db.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.leadId, lead.id))).map(row => row.id)), new Set([document.id, replacement.id]))
      assert.equal((await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, replacement.id))).length, 1)
    }
    const leadLinks = await db.select().from(leadProposals).where(eq(leadProposals.officialDocumentId, document.id))
    assert.equal(leadLinks.length, 1)
    assert.equal((await db.select().from(proposals).where(eq(proposals.officialDocumentId, document.id))).length, 0)
    assert.equal((await issueDraftDocument(input)).ok, false)
    assert.equal((await issueDraftDocument({ ...input, correlationId: `${marker}-retry` })).ok, false)
    assert.equal((await issueDraftDocument({ ...input, centralContactId: randomUUID(), correlationId: `${marker}-wrong-owner` })).ok, false)
    assert.equal((await db.select().from(officialDocuments).where(eq(officialDocuments.leadId, lead.id))).length, 2)
    assert.equal((await db.select().from(clients).where(eq(clients.document, complete.customerDocument))).length, 0)

    const [client] = await db.insert(clients).values({ name: 'Cliente legado', document: '11144477735', phone: '5500000000103', normalizedPhone: '5500000000103' }).returning()
    createdClient = client.id
    const clientDraftId = await makeDraft({ ...complete, customerName: client.name, customerDocument: client.document, clientId: client.id, docType: 'ORCAMENTO' })
    const legacy = await issueDraftDocument({ ...baseInput, correlationId: `${marker}-legacy`, draftId: clientDraftId })
    assert.equal(legacy.ok, true, JSON.stringify(legacy))
    if (legacy.ok) {
      const [row] = await db.select().from(officialDocuments).where(eq(officialDocuments.id, legacy.result.documentId))
      assert.equal(row.clientId, client.id)
      assert.equal(row.leadId, null)
      assert.equal(row.status, 'EMITIDO')
      assert.equal(row.sentAt, null)
      const [clientProposal] = await db.select().from(proposals).where(eq(proposals.officialDocumentId, row.id))
      assert.equal(clientProposal.status, 'DRAFT')
      assert.equal(clientProposal.sentAt, null)
      assert.equal((await db.select().from(proposals).where(eq(proposals.officialDocumentId, row.id))).length, 1)
    }
    const invalidDraft = await makeDraft({ ...complete, customerDocument: '11111111111', leadId: lead.id })
    assert.equal((await issueDraftDocument({ ...baseInput, correlationId: `${marker}-invalid`, draftId: invalidDraft })).ok, false)
    assert.equal((await db.select().from(officialDocuments).where(eq(officialDocuments.leadId, lead.id))).length, 2)
  } finally {
    // Disposable database cleanup is best-effort per table: tests may run against
    // a minimal schema that intentionally omits audit_events. Preserve the
    // original assertion/result while still cleaning every table that exists.
    for (const cleanup of [
      () => db.delete(auditEvents).where(eq(auditEvents.actorUserId, operatorId)),
      () => db.delete(sofiaEvents).where(eq(sofiaEvents.senderPhone, senderPhone)),
      ...createdDrafts.map(draftId => () => db.delete(sofiaDrafts).where(eq(sofiaDrafts.id, draftId))),
    ]) {
      try { await cleanup() } catch { /* table may be absent in the disposable schema */ }
    }
    if (createdLead) {
      for (const cleanup of [
        () => db.delete(leadProposals).where(eq(leadProposals.leadId, createdLead!)),
        async () => {
          if (!originalDocumentId) return
          const [original] = await db.select({ id: officialDocuments.id }).from(officialDocuments).where(eq(officialDocuments.id, originalDocumentId)).limit(1)
          if (original) await db.delete(officialDocuments).where(eq(officialDocuments.supersedesDocumentId, original.id))
        },
        () => db.delete(officialDocuments).where(eq(officialDocuments.leadId, createdLead!)),
        () => db.delete(leads).where(eq(leads.id, createdLead!)),
      ]) { try { await cleanup() } catch { /* continue fixture cleanup */ } }
    }
    if (createdClient) {
      for (const cleanup of [
        () => db.delete(proposals).where(eq(proposals.clientId, createdClient!)),
        () => db.delete(officialDocuments).where(eq(officialDocuments.clientId, createdClient!)),
        () => db.delete(clients).where(eq(clients.id, createdClient!)),
      ]) { try { await cleanup() } catch { /* continue fixture cleanup */ } }
    }
    for (const cleanup of [
      () => db.delete(documentTemplates).where(eq(documentTemplates.slug, templateSlug)),
      () => db.delete(userPermissions).where(eq(userPermissions.userId, operatorId)),
      () => db.delete(users).where(eq(users.id, operatorId)),
    ]) { try { await cleanup() } catch { /* continue fixture cleanup */ } }
    await conn?.end()
  }
})
