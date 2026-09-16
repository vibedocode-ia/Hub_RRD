ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "archived_by_id" uuid REFERENCES "users"("id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_requests_archived_at_idx" ON "service_requests" USING btree ("archived_at");
