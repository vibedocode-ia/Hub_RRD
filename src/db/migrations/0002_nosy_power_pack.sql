CREATE TABLE "sofia_drafts" (
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
	"source_event_id" uuid,
	"service_request_id" uuid,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"converted_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sofia_drafts_correlation_id_unique" UNIQUE("correlation_id")
);
--> statement-breakpoint
ALTER TABLE "sofia_drafts" ADD CONSTRAINT "sofia_drafts_source_event_id_sofia_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."sofia_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sofia_drafts" ADD CONSTRAINT "sofia_drafts_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sofia_drafts" ADD CONSTRAINT "sofia_drafts_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sofia_drafts_correlation_idx" ON "sofia_drafts" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "sofia_drafts_status_updated_idx" ON "sofia_drafts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "sofia_drafts_hub_status_idx" ON "sofia_drafts" USING btree ("central_hub_id","status");--> statement-breakpoint
CREATE INDEX "sofia_drafts_sender_created_idx" ON "sofia_drafts" USING btree ("sender_phone","created_at");