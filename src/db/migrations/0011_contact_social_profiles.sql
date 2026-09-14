ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "linkedin_url" text;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "instagram_url" text;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "website_url" text;
