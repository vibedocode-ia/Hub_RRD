-- Incident recovery: deployment f14582b expects these runtime tables.
-- Safe to run against the existing Hub RRD database: it only creates missing objects.

CREATE TABLE IF NOT EXISTS "financeiro_lancamentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tipo" text NOT NULL,
  "valor" numeric(10, 2) NOT NULL,
  "descricao" text NOT NULL,
  "data" timestamp NOT NULL,
  "categoria" text,
  "status" text DEFAULT 'EFETIVADO' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "insumos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "categoria" text NOT NULL,
  "quantidade" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "unidade" text NOT NULL,
  "nivel_critico" numeric(10, 2) DEFAULT '5.00' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sofia_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "correlation_id" text NOT NULL,
  "central_contact_id" uuid NOT NULL,
  "central_client_id" uuid NOT NULL,
  "central_hub_id" uuid NOT NULL,
  "central_role" text NOT NULL,
  "sender_phone" text NOT NULL,
  "intent" text NOT NULL,
  "status" text DEFAULT 'COLLECTING' NOT NULL,
  "draft_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "pending_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "conversation_summary" text,
  "source_event_id" uuid REFERENCES "sofia_events"("id"),
  "service_request_id" uuid REFERENCES "service_requests"("id"),
  "reviewed_by_id" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "converted_at" timestamp,
  "rejection_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "sofia_drafts_correlation_id_unique" UNIQUE("correlation_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "sofia_drafts_correlation_idx" ON "sofia_drafts" USING btree ("correlation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sofia_drafts_status_updated_idx" ON "sofia_drafts" USING btree ("status", "updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sofia_drafts_hub_status_idx" ON "sofia_drafts" USING btree ("central_hub_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sofia_drafts_sender_created_idx" ON "sofia_drafts" USING btree ("sender_phone", "created_at");
--> statement-breakpoint
