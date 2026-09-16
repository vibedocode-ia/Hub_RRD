import { pgTable, text, timestamp, uuid, numeric, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ==========================================
// CONSTANTES E ENUMS DA OPERAÇÃO RR DESENTUPIDORA
// ==========================================

export const USER_ROLES = {
  OWNER: 'OWNER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  TEAM: 'TEAM',
  FINANCEIRO: 'FINANCEIRO',
  LEITURA: 'LEITURA',
} as const;
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const CLIENT_TYPES = {
  PF: 'PF',
  PJ: 'PJ',
  CONDOMINIO: 'CONDOMINIO',
  RESTAURANTE: 'RESTAURANTE',
  INDUSTRIA: 'INDUSTRIA',
} as const;
export type ClientType = typeof CLIENT_TYPES[keyof typeof CLIENT_TYPES];

export const CLIENT_SOURCES = {
  WHATSAPP_SOFIA: 'WHATSAPP_SOFIA',
  SITE: 'SITE',
  INDICACAO: 'INDICACAO',
  GOOGLE_ADS: 'GOOGLE_ADS',
  TELEFONE: 'TELEFONE',
} as const;

export const SERVICE_TYPES = {
  DESENTUPIMENTO: 'DESENTUPIMENTO',
  HIDROJATEAMENTO: 'HIDROJATEAMENTO',
  CAIXA_GORDURA: 'CAIXA_GORDURA',
  LIMPA_FOSSA: 'LIMPA_FOSSA',
  DEDETIZACAO: 'DEDETIZACAO',
} as const;
export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];

export const REQUEST_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  AGENDADO: 'AGENDADO',
  EM_EXECUCAO: 'EM_EXECUCAO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
} as const;
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const LEAD_STATUS = {
  NOVO: 'NOVO',
  EM_ORCAMENTO: 'EM_ORCAMENTO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
} as const;

export const PRIORITY_LEVELS = {
  NORMAL: 'NORMAL',
  URGENTE_24H: 'URGENTE_24H',
} as const;

export const DOC_TYPES = {
  ORCAMENTO: 'ORCAMENTO',
  RECIBO_GARANTIA: 'RECIBO_GARANTIA',
  LAUDO_TECNICO: 'LAUDO_TECNICO',
} as const;
export type DocType = typeof DOC_TYPES[keyof typeof DOC_TYPES];

export const DOC_STATUS = {
  RASCUNHO: 'RASCUNHO',
  APROVADO: 'APROVADO',
  EMITIDO: 'EMITIDO',
  ENVIADO: 'ENVIADO',
  ARQUIVADO: 'ARQUIVADO',
} as const;

export const SOFIA_EVENT_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const SOFIA_DRAFT_STATUS = {
  COLLECTING: 'COLLECTING',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  CONVERTED: 'CONVERTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;
export type SofiaDraftStatus = typeof SOFIA_DRAFT_STATUS[keyof typeof SOFIA_DRAFT_STATUS];


export const SOFIA_PROFILE_AUDIENCES = {
  RAFAEL_ADMIN: 'RAFAEL_ADMIN',
  PROFESSIONALS: 'PROFESSIONALS',
  LEADS: 'LEADS',
  CLIENTS: 'CLIENTS',
} as const;
export type SofiaProfileAudience = typeof SOFIA_PROFILE_AUDIENCES[keyof typeof SOFIA_PROFILE_AUDIENCES];

export const SERVICE_CATALOG_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

// ==========================================
// TABELAS DO BANCO DE DADOS
// ==========================================

// 1. Usuários & Operadores Master (Rafael + Equipe)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(), // Ex: '5521996699191'
  email: text('email'),
  jobTitle: text('job_title'),
  photoUrl: text('photo_url'),
  company: text('company'),
  city: text('city'),
  state: text('state'),
  instagramUrl: text('instagram_url'),
  websiteUrl: text('website_url'),
  personalNotes: text('personal_notes'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default(USER_ROLES.ADMIN),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_phone_idx').on(table.phone),
]);

// 1b. Permissões locais do Hub RRD. Não criam nem alteram grants/números da Central Sofia.
export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  permissionKey: text('permission_key').notNull(),
  grantedById: uuid('granted_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_permissions_user_permission_unique').on(table.userId, table.permissionKey),
  index('user_permissions_user_idx').on(table.userId),
]);

// 1c. Auditoria local sanitizada para administração e emissão de documentos.
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
  index('audit_events_target_created_idx').on(table.targetType, table.targetId, table.createdAt),
]);

// 2. Sessões Autenticadas (Cookies Server-Side HttpOnly)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
]);

// 2b. Recuperação controlada: o token bruto nunca é persistido.
export const passwordRecoveryTokens = pgTable('password_recovery_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('password_recovery_user_active_idx').on(table.userId, table.expiresAt),
]);

// 3. Clientes (PF / PJ / Condomínios / Restaurantes / Indústrias)
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().default(CLIENT_TYPES.PF),
  name: text('name').notNull(),
  document: text('document'), // CPF ou CNPJ
  phone: text('phone').notNull(), // Telefone formatado (ex: (21) 99669-9191)
  normalizedPhone: text('normalized_phone').notNull(), // Telefone limpo (ex: 5521996699191)
  email: text('email'),
  contactPerson: text('contact_person'),
  source: text('source').default(CLIENT_SOURCES.WHATSAPP_SOFIA),
  recurrence: text('recurrence').notNull().default('SERVICO_AVULSO'),
  customerSince: timestamp('customer_since'),
  lastContactAt: timestamp('last_contact_at'),
  nextVisitAt: timestamp('next_visit_at'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('clients_normalized_phone_idx').on(table.normalizedPhone),
  index('clients_created_at_idx').on(table.createdAt),
]);

// 3b. Contatos são pessoas independentes, opcionalmente vinculadas a um cliente/empresa.
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(), name: text('name').notNull(), phone: text('phone'), email: text('email'), title: text('title'), photoUrl: text('photo_url'), linkedinUrl: text('linkedin_url'), instagramUrl: text('instagram_url'), websiteUrl: text('website_url'), clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }), notes: text('notes'), isActive: boolean('is_active').notNull().default(true), createdById: uuid('created_by_id').references(() => users.id), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [index('contacts_client_idx').on(table.clientId), index('contacts_name_idx').on(table.name)])

// 4. Endereços dos Clientes
export const clientAddresses = pgTable('client_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  floorOrUnit: text('floor_or_unit'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull().default('Niterói'),
  state: text('state').notNull().default('RJ'),
  zipCode: text('zip_code'),
  referencePoint: text('reference_point'),
  serviceAccessNotes: text('service_access_notes'), // Ex: 'Entrada de subsolo 2.1m - Usar VACOL'
  propertyType: text('property_type').default('RESIDENCIAL'),
  needsCondominiumAuthorization: boolean('needs_condominium_authorization').default(false),
  isMain: boolean('is_main').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('addresses_client_id_idx').on(table.clientId),
  index('addresses_neighborhood_idx').on(table.neighborhood),
]);

// 5. Cadastros de Apoio Operacional (Equipes, Veículos e Equipamentos)
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Ex: 'Equipe Alpha (Hidrojato)'
  leaderName: text('leader_name').notNull(),
  phone: text('phone'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Ex: 'Caminhão Vácuo Heavy 01', 'VACOL Compacto 4x4'
  plate: text('plate'),
  type: text('type').notNull(), // 'CAMINHAO_VACUO' | 'VACOL_COMPACTO' | 'VAN_HIDRO'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const equipment = pgTable('equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // Ex: 'Hidrojato 1500 BAR', 'Bomba de Sucção Vácuo 10m³'
  code: text('code'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Chamados / Atendimentos (O Coração da Operação)
export const serviceRequests = pgTable('service_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // Ex: 'OS-2026-0142'
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  addressId: uuid('address_id').references(() => clientAddresses.id).notNull(),
  sourceChannel: text('source_channel').notNull().default(CLIENT_SOURCES.WHATSAPP_SOFIA),
  leadStatus: text('lead_status').notNull().default(LEAD_STATUS.NOVO),
  priority: text('priority').notNull().default(PRIORITY_LEVELS.NORMAL),
  serviceType: text('service_type').notNull().default(SERVICE_TYPES.DESENTUPIMENTO),
  problemReported: text('problem_reported').notNull(),
  problemFound: text('problem_found'),
  status: text('status').notNull().default(REQUEST_STATUS.PENDING_REVIEW),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  scheduledAt: timestamp('scheduled_at'),
  completedAt: timestamp('completed_at'),
  assignedTeamId: uuid('assigned_team_id').references(() => teams.id),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  equipmentId: uuid('equipment_id').references(() => equipment.id),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).default('0.00'),
  paymentMethod: text('payment_method').default('Pix'),
  internalNotes: text('internal_notes'),
  customerNotes: text('customer_notes'),
  warrantyDays: integer('warranty_days').default(30), // Configurável por serviço/documento
  warrantyUntil: timestamp('warranty_until'),
  cancelReason: text('cancel_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('service_requests_status_idx').on(table.status),
  index('service_requests_client_id_idx').on(table.clientId),
  index('service_requests_created_at_idx').on(table.createdAt),
]);

// 6b. Agenda local: fonte de verdade; Google é apenas destino de sincronização opcional.
export const agendaEvents = pgTable('agenda_events', {
  id: uuid('id').primaryKey().defaultRandom(), title: text('title').notNull(), description: text('description'), startsAt: timestamp('starts_at').notNull(), endsAt: timestamp('ends_at').notNull(), location: text('location'), status: text('status').notNull().default('SCHEDULED'), contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }), clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }), serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id, { onDelete: 'set null' }), googleEventId: text('google_event_id'), googleSyncStatus: text('google_sync_status').notNull().default('NOT_CONNECTED'), googleSyncedAt: timestamp('google_synced_at'), createdById: uuid('created_by_id').references(() => users.id), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [index('agenda_events_starts_at_idx').on(table.startsAt), index('agenda_events_contact_idx').on(table.contactId), index('agenda_events_client_idx').on(table.clientId)])

// 7. Documentos Oficiais Gerados (Orçamentos, Recibos e Laudos)
export const officialDocuments = pgTable('official_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  docType: text('doc_type').notNull(), // 'ORCAMENTO' | 'RECIBO_GARANTIA' | 'LAUDO_TECNICO'
  docNumber: text('doc_number').notNull().unique(), // Ex: 'REC-2026-0089'
  serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  templateVersion: text('template_version').notNull().default('V1.0'),
  totalValue: numeric('total_value', { precision: 10, scale: 2 }).notNull(),
  amountInWords: text('amount_in_words'), // Ex: 'trezentos reais'
  paymentMethod: text('payment_method').notNull().default('Pix'),
  hasWarranty: boolean('has_warranty').default(true).notNull(),
  warrantyDays: integer('warranty_days').default(30), // Editável por documento
  warrantyTerms: text('warranty_terms'), // Texto editável das condições específicas de garantia
  technicalNotes: text('technical_notes'),
  documentPayloadSnapshot: jsonb('document_payload_snapshot').notNull(), // SNAPSHOT IMUTÁVEL CONGELADO DO PDF
  htmlSnapshot: text('html_snapshot'),
  pdfStoragePath: text('pdf_storage_path'),
  status: text('status').notNull().default(DOC_STATUS.RASCUNHO),
  issuedAt: timestamp('issued_at'),
  sentAt: timestamp('sent_at'),
  approvedById: uuid('approved_by_id').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('official_docs_status_idx').on(table.status),
  index('official_docs_doc_number_idx').on(table.docNumber),
  index('official_docs_service_request_idx').on(table.serviceRequestId),
]);

// 7a. Pipeline comercial de propostas; documento oficial é um snapshot separado.
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id, { onDelete: 'set null' }),
  officialDocumentId: uuid('official_document_id').references(() => officialDocuments.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  totalValue: numeric('total_value', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('DRAFT'),
  validUntil: timestamp('valid_until'),
  sentAt: timestamp('sent_at'),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  convertedAt: timestamp('converted_at'),
  notes: text('notes'),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [index('proposals_status_idx').on(table.status), index('proposals_client_idx').on(table.clientId), index('proposals_created_idx').on(table.createdAt)]);

// 7b. Modelos canônicos de documentos. O PDF original é preservado no banco para sobreviver ao deploy.
export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  docType: text('doc_type').notNull(),
  version: text('version').notNull(),
  description: text('description'),
  fieldSchema: jsonb('field_schema').notNull().default([]),
  sourcePdfBase64: text('source_pdf_base64').notNull(),
  sourceFilename: text('source_filename').notNull(),
  sourceMime: text('source_mime').notNull().default('application/pdf'),
  sourceSha256: text('source_sha256').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdById: uuid('created_by_id').references(() => users.id),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('document_templates_slug_version_unique').on(table.slug, table.version),
  index('document_templates_doc_type_active_idx').on(table.docType, table.isActive),
]);

// 8. Anexos e Fotos de Campo (Evidências Antes/Depois)
export const attachments = pgTable('attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id),
  documentId: uuid('document_id').references(() => officialDocuments.id),
  fileType: text('file_type').notNull(), // 'BEFORE_PHOTO' | 'AFTER_PHOTO' | 'SIGNATURE' | 'RECEIPT'
  storagePath: text('storage_path').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Eventos e Logs de Auditoria da Sofia (WhatsApp API)
export const sofiaEvents = pgTable('sofia_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderPhone: text('sender_phone').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(), // Previne duplicatas
  rawPayload: jsonb('raw_payload').notNull(),
  intentDetected: text('intent_detected').notNull(),
  status: text('status').notNull().default(SOFIA_EVENT_STATUS.PENDING_REVIEW),
  createdRequestId: uuid('created_request_id').references(() => serviceRequests.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sofia_events_idempotency_idx').on(table.idempotencyKey),
  index('sofia_events_status_idx').on(table.status),
]);

export const sofiaDrafts = pgTable('sofia_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  correlationId: text('correlation_id').notNull().unique(),
  centralContactId: uuid('central_contact_id').notNull(),
  centralClientId: uuid('central_client_id').notNull(),
  centralHubId: uuid('central_hub_id').notNull(),
  centralRole: text('central_role').notNull(),
  senderPhone: text('sender_phone').notNull(),
  intent: text('intent').notNull(),
  status: text('status').notNull().default(SOFIA_DRAFT_STATUS.COLLECTING),
  draftPayload: jsonb('draft_payload').notNull().default({}),
  pendingFields: jsonb('pending_fields').notNull().default([]),
  conversationSummary: text('conversation_summary'),
  sourceEventId: uuid('source_event_id').references(() => sofiaEvents.id),
  serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id),
  reviewedById: uuid('reviewed_by_id').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  convertedAt: timestamp('converted_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sofia_drafts_correlation_idx').on(table.correlationId),
  index('sofia_drafts_status_updated_idx').on(table.status, table.updatedAt),
  index('sofia_drafts_hub_status_idx').on(table.centralHubId, table.status),
  index('sofia_drafts_sender_created_idx').on(table.senderPhone, table.createdAt),
]);


// 10. Perfis de atendimento da Sofia — prompts editáveis por público
export const sofiaResponseProfiles = pgTable('sofia_response_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  audience: text('audience').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  initialLookupFields: text('initial_lookup_fields').notNull().default(''),
  initialContext: text('initial_context').notNull().default(''),
  responsePrompt: text('response_prompt').notNull().default(''),
  allowedData: text('allowed_data').notNull().default(''),
  blockedData: text('blocked_data').notNull().default(''),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('sofia_response_profiles_audience_idx').on(table.audience),
]);

// 10b. Preferência Google e tokens cifrados. Nunca persiste token OAuth em texto puro.
export const googleIntegrations = pgTable('google_integrations', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(), primaryEmail: text('primary_email'), status: text('status').notNull().default('DISCONNECTED'), tokenCiphertext: text('token_ciphertext'), tokenIv: text('token_iv'), tokenTag: text('token_tag'), connectedAt: timestamp('connected_at'), createdAt: timestamp('created_at').defaultNow().notNull(), updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 11. Catálogo editável de serviços RR
export const serviceCatalog = pgTable('service_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category').notNull().default(SERVICE_TYPES.DESENTUPIMENTO),
  description: text('description').notNull().default(''),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).default('0.00'),
  priceNotes: text('price_notes').notNull().default(''),
  warrantyDays: integer('warranty_days').default(30).notNull(),
  defaultDurationMinutes: integer('default_duration_minutes').default(90).notNull(),
  requiresInspection: boolean('requires_inspection').default(false).notNull(),
  isEmergencyEligible: boolean('is_emergency_eligible').default(true).notNull(),
  status: text('status').notNull().default(SERVICE_CATALOG_STATUS.ACTIVE),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('service_catalog_status_idx').on(table.status),
  index('service_catalog_category_idx').on(table.category),
]);

// 12. Insumos (Estoque e Dedetização)
export const insumos = pgTable('insumos', {
  id: uuid('id').primaryKey().defaultRandom(),
  nome: text('nome').notNull(),
  categoria: text('categoria').notNull(),
  quantidade: numeric('quantidade', { precision: 10, scale: 2 }).notNull().default('0.00'),
  unidade: text('unidade').notNull(), // ex: 'Litros', 'Unidades', 'Kg'
  nivelCritico: numeric('nivel_critico', { precision: 10, scale: 2 }).notNull().default('5.00'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. Lançamentos Financeiros (Fluxo de Caixa)
export const financeiroLancamentos = pgTable('financeiro_lancamentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tipo: text('tipo').notNull(), // 'RECEITA' ou 'DESPESA'
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  descricao: text('descricao').notNull(),
  data: timestamp('data').notNull(),
  categoria: text('categoria'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('EFETIVADO'), // 'PENDENTE', 'EFETIVADO', 'CANCELADO'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('financeiro_lancamentos_client_id_idx').on(table.clientId),
]);
