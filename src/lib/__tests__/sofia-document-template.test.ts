import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SofiaGetDocumentTemplateRequest, SofiaIssueDraftRequest } from '../sofia-actions'
import { publicSofiaDocumentTemplate, unknownDocumentFields } from '../sofia-document-template'
const id = '11111111-1111-4111-8111-111111111111'
const envelope = { centralContactId: id, centralClientId: id, centralHubId: id, centralRole: 'hub_operator', senderPhone: '+5521999999999' }
test('contrato estrito exige envelope e UUID; não admite autoridade pelo modelo', () => {
 const input = { ...envelope, action: 'get_document_template', docType: 'ORCAMENTO', templateId: id }
 assert.equal(SofiaGetDocumentTemplateRequest.safeParse(input).success, true)
 for (const change of [{ centralRole: 'god_admin' }, { templateId: 'invalid' }, { centralHubId: undefined }, { placements: [] }]) assert.equal(SofiaGetDocumentTemplateRequest.safeParse({ ...input, ...change }).success, false)
})
test('documentFields limita keys, quantidade e valores string sem coercão', () => {
 const input = { ...envelope, action: 'issue_service_draft', draftId: id, conversationSummary: 'Emitir documento confirmado', templateId: id, amount: '350', paymentMethod: 'pix' }
 assert.equal(SofiaIssueDraftRequest.safeParse({ ...input, documentFields: { warranty: '' } }).success, true)
 for (const documentFields of [{ warranty: 30 }, { warranty: 'x'.repeat(2001) }, { constructor: 'evil' }, { 'a.b': 'evil' }, Object.fromEntries(Array.from({ length: 81 }, (_, i) => [`field${i}`, 'x']))]) assert.equal(SofiaIssueDraftRequest.safeParse({ ...input, documentFields }).success, false)
})
test('projeção pública exclui PDF, base64 e placements; servidor recusa campo fora do schema', () => {
 const schema = [{ key: 'warranty', label: 'Garantia', type: 'text', required: true, defaultValue: '', placements: [{ page: 0, x: 0.1, y: 0.1, width: 0.2, height: 0.1 }] }]
 const projected = publicSofiaDocumentTemplate({ id, version: 'RR_V1', docType: 'ORCAMENTO', fieldSchema: schema, sourcePdfBase64: 'SECRET' } as any)
 assert.deepEqual(projected.fields, [{ key: 'warranty', label: 'Garantia', type: 'text', required: true, defaultValue: '' }])
 assert.doesNotMatch(JSON.stringify(projected), /SECRET|placements|base64|PDF/)
 assert.deepEqual(unknownDocumentFields(schema, { warranty: '', rogue: 'x' }), ['rogue'])
})
test('rota mantém gate Sofia e documents.issue; selector determinístico e docType fechado', () => {
 const route = readFileSync('src/app/api/sofia/actions/route.ts', 'utf8')
 const selector = readFileSync('src/lib/sofia-document-template.ts', 'utf8')
 assert.match(route, /locallyAuthorizedForSofiaAction/)
 assert.match(route, /permissions.some\(p => p.key === 'documents.issue'\)/)
 assert.match(route, /permissions.some\(p => p.key === SOFIA_LOCAL_PERMISSION\)/)
 assert.match(selector, /eq\(documentTemplates.docType, docType\)/)
 assert.match(selector, /orderBy\(desc\(documentTemplates.updatedAt\), desc\(documentTemplates.id\)\)/)
})
