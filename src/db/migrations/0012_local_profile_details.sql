ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "instagram_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "website_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "personal_notes" text;
