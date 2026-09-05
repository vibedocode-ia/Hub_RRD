CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid,
	"client_id" uuid,
	"document_id" uuid,
	"file_type" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"floor_or_unit" text,
	"neighborhood" text NOT NULL,
	"city" text DEFAULT 'Niterói' NOT NULL,
	"state" text DEFAULT 'RJ' NOT NULL,
	"zip_code" text,
	"reference_point" text,
	"service_access_notes" text,
	"property_type" text DEFAULT 'RESIDENCIAL',
	"needs_condominium_authorization" boolean DEFAULT false,
	"is_main" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'PF' NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"phone" text NOT NULL,
	"normalized_phone" text NOT NULL,
	"email" text,
	"contact_person" text,
	"source" text DEFAULT 'WHATSAPP_SOFIA',
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_type" text NOT NULL,
	"doc_number" text NOT NULL,
	"service_request_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"template_version" text DEFAULT 'V1.0' NOT NULL,
	"total_value" numeric(10, 2) NOT NULL,
	"amount_in_words" text,
	"payment_method" text DEFAULT 'Pix' NOT NULL,
	"has_warranty" boolean DEFAULT true NOT NULL,
	"warranty_days" integer DEFAULT 30,
	"warranty_terms" text,
	"technical_notes" text,
	"document_payload_snapshot" jsonb NOT NULL,
	"html_snapshot" text,
	"pdf_storage_path" text,
	"status" text DEFAULT 'RASCUNHO' NOT NULL,
	"issued_at" timestamp,
	"sent_at" timestamp,
	"approved_by_id" uuid,
	"approved_at" timestamp,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "official_documents_doc_number_unique" UNIQUE("doc_number")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"client_id" uuid NOT NULL,
	"address_id" uuid NOT NULL,
	"source_channel" text DEFAULT 'WHATSAPP_SOFIA' NOT NULL,
	"lead_status" text DEFAULT 'NOVO' NOT NULL,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"service_type" text DEFAULT 'DESENTUPIMENTO' NOT NULL,
	"problem_reported" text NOT NULL,
	"problem_found" text,
	"status" text DEFAULT 'PENDING_REVIEW' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"assigned_team_id" uuid,
	"vehicle_id" uuid,
	"equipment_id" uuid,
	"total_amount" numeric(10, 2) DEFAULT '0.00',
	"payment_method" text DEFAULT 'Pix',
	"internal_notes" text,
	"customer_notes" text,
	"warranty_days" integer DEFAULT 30,
	"warranty_until" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_requests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sofia_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_phone" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"intent_detected" text NOT NULL,
	"status" text DEFAULT 'PENDING_REVIEW' NOT NULL,
	"created_request_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sofia_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"leader_name" text NOT NULL,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'ADMIN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plate" text,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_document_id_official_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."official_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_addresses" ADD CONSTRAINT "client_addresses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_documents" ADD CONSTRAINT "official_documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_address_id_client_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."client_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sofia_events" ADD CONSTRAINT "sofia_events_created_request_id_service_requests_id_fk" FOREIGN KEY ("created_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_client_id_idx" ON "client_addresses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "addresses_neighborhood_idx" ON "client_addresses" USING btree ("neighborhood");--> statement-breakpoint
CREATE INDEX "clients_normalized_phone_idx" ON "clients" USING btree ("normalized_phone");--> statement-breakpoint
CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "official_docs_status_idx" ON "official_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "official_docs_doc_number_idx" ON "official_documents" USING btree ("doc_number");--> statement-breakpoint
CREATE INDEX "official_docs_service_request_idx" ON "official_documents" USING btree ("service_request_id");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_client_id_idx" ON "service_requests" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "service_requests_created_at_idx" ON "service_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sofia_events_idempotency_idx" ON "sofia_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "sofia_events_status_idx" ON "sofia_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");