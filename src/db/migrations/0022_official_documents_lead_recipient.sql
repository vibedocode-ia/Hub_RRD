-- V01403: documentos oficiais podem ter como destinatário um Lead OU um Cliente.
--
-- ADITIVO e retrocompatível: nenhuma linha existente é apagada ou reescrita.
--   * service_request_id passa a ser anulável (chamado operacional é opcional);
--   * client_id passa a ser anulável (destinatário pode ser um Lead);
--   * lead_id entra anulável, referenciando "leads" da tabela de módulo comercial;
--   * supersedes_document_id entra anulável (revisão aponta para o documento original,
--     que permanece congelado: nada é sobrescrito);
--   * CHECK garante EXATAMENTE UM destinatário (lead_id XOR client_id);
--   * lead_proposals.official_document_id espelha o link já existente em proposals,
--     para o orçamento emitido no fluxo comercial de Lead.
--
-- Linhas legadas: todas têm client_id preenchido e lead_id nulo, então satisfazem o
-- XOR sem backfill. O NOT NULL de service_request_id é apenas relaxado.

--> statement-breakpoint
ALTER TABLE "official_documents" ADD COLUMN IF NOT EXISTS "lead_id" uuid;
--> statement-breakpoint
ALTER TABLE "official_documents" ALTER COLUMN "service_request_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "official_documents" ALTER COLUMN "client_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "official_documents" ADD COLUMN IF NOT EXISTS "supersedes_document_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_lead_id_leads_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_supersedes_document_id_official_documents_id_fk"
    FOREIGN KEY ("supersedes_document_id") REFERENCES "official_documents"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_lead_or_client_recipient_check"
    CHECK (("lead_id" IS NULL) <> ("client_id" IS NULL));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD COLUMN IF NOT EXISTS "official_document_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_official_document_id_official_documents_id_fk"
    FOREIGN KEY ("official_document_id") REFERENCES "official_documents"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "official_docs_lead_idx" ON "official_documents" USING btree ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_proposals_official_document_idx" ON "lead_proposals" USING btree ("official_document_id");
