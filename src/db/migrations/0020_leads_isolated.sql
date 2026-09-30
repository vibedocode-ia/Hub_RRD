-- Leads: módulo comercial estritamente aditivo. Nenhuma tabela legada é alterada.
CREATE TABLE "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "normalized_phone" text NOT NULL,
  "email" text,
  "document" text,
  "normalized_document" text,
  "source_channel" text DEFAULT 'PORTAL_MANUAL' NOT NULL,
  "status" text DEFAULT 'NEW' NOT NULL,
  "priority" text DEFAULT 'NORMAL' NOT NULL,
  "service_type" text,
  "problem_reported" text,
  "notes" text,
  "converted_client_id" uuid,
  "converted_at" timestamp,
  "converted_by_id" uuid REFERENCES "users"("id"),
  "created_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "leads_normalized_phone_unique" ON "leads" USING btree ("normalized_phone");
CREATE UNIQUE INDEX "leads_normalized_document_unique" ON "leads" USING btree ("normalized_document") WHERE "normalized_document" IS NOT NULL;
CREATE INDEX "leads_status_created_idx" ON "leads" USING btree ("status", "created_at");

CREATE TABLE "lead_addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "street" text, "number" text, "complement" text, "floor_or_unit" text, "neighborhood" text,
  "city" text DEFAULT 'Niterói' NOT NULL, "state" text DEFAULT 'RJ' NOT NULL, "zip_code" text,
  "reference_point" text, "service_access_notes" text, "property_type" text,
  "needs_condominium_authorization" boolean DEFAULT false NOT NULL,
  "is_main" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "lead_addresses_lead_idx" ON "lead_addresses" USING btree ("lead_id");
CREATE UNIQUE INDEX "lead_addresses_one_main_per_lead" ON "lead_addresses" USING btree ("lead_id") WHERE "is_main" = true;

CREATE TABLE "lead_service_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "lead_address_id" uuid REFERENCES "lead_addresses"("id") ON DELETE set null,
  "service_type" text NOT NULL, "priority" text DEFAULT 'NORMAL' NOT NULL,
  "problem_reported" text NOT NULL, "problem_found" text, "desired_schedule_at" timestamp,
  "estimated_total" numeric(10,2), "internal_notes" text, "customer_notes" text,
  "status" text DEFAULT 'PENDING_REVIEW' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "lead_service_requests_lead_created_idx" ON "lead_service_requests" USING btree ("lead_id", "created_at");
CREATE INDEX "lead_service_requests_status_created_idx" ON "lead_service_requests" USING btree ("status", "created_at");

CREATE TABLE "lead_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE restrict,
  "lead_service_request_id" uuid REFERENCES "lead_service_requests"("id") ON DELETE set null,
  "title" text NOT NULL, "description" text, "total_value" numeric(10,2) NOT NULL,
  "status" text DEFAULT 'DRAFT' NOT NULL, "valid_until" timestamp, "sent_at" timestamp,
  "approved_at" timestamp, "rejected_at" timestamp, "notes" text,
  "created_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "lead_proposals_lead_status_created_idx" ON "lead_proposals" USING btree ("lead_id", "status", "created_at");
CREATE INDEX "lead_proposals_status_created_idx" ON "lead_proposals" USING btree ("status", "created_at");

CREATE TABLE "lead_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "lead_proposal_id" uuid REFERENCES "lead_proposals"("id") ON DELETE set null,
  "document_type" text NOT NULL, "storage_path" text NOT NULL, "sha256" text NOT NULL,
  "mime_type" text NOT NULL, "file_size" integer, "payload_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_by_id" uuid REFERENCES "users"("id"), "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "lead_documents_proposal_idx" ON "lead_documents" USING btree ("lead_proposal_id");
CREATE INDEX "lead_documents_lead_created_idx" ON "lead_documents" USING btree ("lead_id", "created_at");

CREATE TABLE "lead_audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "actor_user_id" uuid REFERENCES "users"("id"), "action" text NOT NULL,
  "target_type" text NOT NULL, "target_id" uuid, "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX "lead_audit_events_lead_created_idx" ON "lead_audit_events" USING btree ("lead_id", "created_at");
CREATE INDEX "lead_audit_events_target_created_idx" ON "lead_audit_events" USING btree ("target_type", "target_id", "created_at");
