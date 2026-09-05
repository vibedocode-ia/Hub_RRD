import { pgTable, text, timestamp, uuid, numeric, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';

// ==========================================
// CONSTANTES E ENUMS DA OPERAÇÃO RR DESENTUPIDORA
// ==========================================

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  TEAM: 'TEAM',
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
} as const;

export const SOFIA_EVENT_STATUS = {
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
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
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default(USER_ROLES.ADMIN),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_phone_idx').on(table.phone),
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
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdById: uuid('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('clients_normalized_phone_idx').on(table.normalizedPhone),
  index('clients_created_at_idx').on(table.createdAt),
]);

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
