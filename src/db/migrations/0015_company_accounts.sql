CREATE TABLE IF NOT EXISTS "company_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "bank_name" text NOT NULL,
  "account_type" text NOT NULL DEFAULT 'CONTA_CORRENTE',
  "agency" text,
  "account_number" text,
  "account_digit" text,
  "pix_key" text,
  "card_last_four" text,
  "notes" text,
  "is_primary" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_accounts_active_idx" ON "company_accounts" USING btree ("is_active");
