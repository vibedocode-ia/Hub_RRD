CREATE TABLE IF NOT EXISTS "proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL REFERENCES "clients"("id"),
  "service_request_id" uuid REFERENCES "service_requests"("id") ON DELETE SET NULL,
  "official_document_id" uuid REFERENCES "official_documents"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "description" text,
  "total_value" numeric(10,2) NOT NULL,
  "status" text NOT NULL DEFAULT 'DRAFT',
  "valid_until" timestamp,
  "sent_at" timestamp,
  "approved_at" timestamp,
  "rejected_at" timestamp,
  "converted_at" timestamp,
  "notes" text,
  "created_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_status_idx" ON "proposals" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_client_idx" ON "proposals" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_created_idx" ON "proposals" USING btree ("created_at");
