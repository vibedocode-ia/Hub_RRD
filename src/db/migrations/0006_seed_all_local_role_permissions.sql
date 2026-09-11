-- Complete idempotent defaults for all existing local Hub RRD roles.
-- This touches only user_permissions in the isolated Hub RRD database.
WITH role_permissions(role_name, permission_key) AS (
  VALUES
    ('OPERATOR', 'crm.read'), ('OPERATOR', 'crm.write'),
    ('OPERATOR', 'operations.read'), ('OPERATOR', 'operations.write'),
    ('OPERATOR', 'inventory.read'), ('OPERATOR', 'documents.read'), ('OPERATOR', 'documents.prepare'), ('OPERATOR', 'sofia.drafts.review'),
    ('TEAM', 'operations.read'), ('TEAM', 'operations.write'), ('TEAM', 'inventory.read'),
    ('FINANCEIRO', 'financial.read'), ('FINANCEIRO', 'financial.write'), ('FINANCEIRO', 'documents.read'), ('FINANCEIRO', 'documents.prepare'),
    ('LEITURA', 'crm.read'), ('LEITURA', 'operations.read'), ('LEITURA', 'inventory.read'), ('LEITURA', 'documents.read')
)
INSERT INTO "user_permissions" ("user_id", "permission_key")
SELECT u."id", rp.permission_key
FROM "users" u
JOIN role_permissions rp ON rp.role_name = u."role"
WHERE u."is_active" = true
ON CONFLICT ("user_id", "permission_key") DO NOTHING;
--> statement-breakpoint
