CREATE TABLE IF NOT EXISTS "contacts" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "name" text NOT NULL, "phone" text, "email" text, "title" text, "photo_url" text, "client_id" uuid, "notes" text, "is_active" boolean DEFAULT true NOT NULL, "created_by_id" uuid, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_client_idx" ON "contacts" USING btree ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_name_idx" ON "contacts" USING btree ("name");
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_url" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agenda_events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "title" text NOT NULL, "description" text, "starts_at" timestamp NOT NULL, "ends_at" timestamp NOT NULL, "location" text, "status" text DEFAULT 'SCHEDULED' NOT NULL, "contact_id" uuid, "client_id" uuid, "service_request_id" uuid, "created_by_id" uuid, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD CONSTRAINT "agenda_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agenda_events_starts_at_idx" ON "agenda_events" USING btree ("starts_at");
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "google_event_id" text;
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "google_sync_status" text DEFAULT 'NOT_CONNECTED' NOT NULL;
--> statement-breakpoint
ALTER TABLE "agenda_events" ADD COLUMN IF NOT EXISTS "google_synced_at" timestamp;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_integrations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "user_id" uuid NOT NULL UNIQUE, "primary_email" text, "status" text DEFAULT 'DISCONNECTED' NOT NULL, "token_ciphertext" text, "token_iv" text, "token_tag" text, "connected_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "google_integrations" ADD CONSTRAINT "google_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
