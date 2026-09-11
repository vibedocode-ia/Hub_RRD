-- Hub RRD: controle local de pessoas, permissões e auditoria.
-- Este arquivo NÃO cria/edita contatos, números ou grants da Central Sofia.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
--> statement-breakpoint

-- O administrador mestre legado vira proprietário local do Hub RRD.
UPDATE "users" SET "role" = 'OWNER', "updated_at" = now() WHERE "role" = 'SUPER_ADMIN';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "permission_key" text NOT NULL,
  "granted_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_permissions_user_permission_unique" UNIQUE("user_id", "permission_key")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_permissions_user_idx"
  ON "user_permissions" USING btree ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" uuid REFERENCES "users"("id"),
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_events_actor_created_idx"
  ON "audit_events" USING btree ("actor_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_target_created_idx"
  ON "audit_events" USING btree ("target_type", "target_id", "created_at");
--> statement-breakpoint

-- Seed idempotente para usuários já existentes. Novas pessoas recebem permissões pela API do painel.
WITH role_permissions(role_name, permission_key) AS (
  VALUES
    ('OWNER', 'people.manage'), ('OWNER', 'crm.read'), ('OWNER', 'crm.write'),
    ('OWNER', 'operations.read'), ('OWNER', 'operations.write'),
    ('OWNER', 'inventory.read'), ('OWNER', 'inventory.write'),
    ('OWNER', 'financial.read'), ('OWNER', 'financial.write'),
    ('OWNER', 'documents.read'), ('OWNER', 'documents.prepare'), ('OWNER', 'documents.approve'),
    ('OWNER', 'documents.issue'), ('OWNER', 'documents.send'), ('OWNER', 'sofia.drafts.review'), ('OWNER', 'settings.manage'),
    ('ADMIN', 'people.manage'), ('ADMIN', 'crm.read'), ('ADMIN', 'crm.write'),
    ('ADMIN', 'operations.read'), ('ADMIN', 'operations.write'),
    ('ADMIN', 'inventory.read'), ('ADMIN', 'inventory.write'),
    ('ADMIN', 'financial.read'), ('ADMIN', 'financial.write'),
    ('ADMIN', 'documents.read'), ('ADMIN', 'documents.prepare'), ('ADMIN', 'documents.approve'),
    ('ADMIN', 'documents.issue'), ('ADMIN', 'sofia.drafts.review'), ('ADMIN', 'settings.manage')
)
INSERT INTO "user_permissions" ("user_id", "permission_key")
SELECT u."id", rp.permission_key
FROM "users" u
JOIN role_permissions rp ON rp.role_name = u."role"
WHERE u."is_active" = true
ON CONFLICT ("user_id", "permission_key") DO NOTHING;
--> statement-breakpoint
