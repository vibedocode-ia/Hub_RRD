-- Cleanup for prior local-only access rollout.
-- Hub RRD users are local portal identities. Central identifiers live only in sofia_drafts.

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_access_scope_check";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_central_contact_id_unique";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "users_access_scope_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "users_central_contact_id_unique";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "access_scope";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "central_contact_id";
--> statement-breakpoint
