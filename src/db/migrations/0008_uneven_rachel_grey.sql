ALTER TABLE "clients" ADD COLUMN "recurrence" text DEFAULT 'SERVICO_AVULSO' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "customer_since" timestamp;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "last_contact_at" timestamp;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "next_visit_at" timestamp;--> statement-breakpoint
-- Initial operational baseline only; the CRM keeps this field explicitly editable for imported legacy clients.
UPDATE "clients" SET "customer_since" = "created_at" WHERE "customer_since" IS NULL;--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "financeiro_lancamentos" ADD CONSTRAINT "financeiro_lancamentos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financeiro_lancamentos_client_id_idx" ON "financeiro_lancamentos" USING btree ("client_id");
