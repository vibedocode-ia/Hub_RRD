-- Hub RRD: grants Sofia are controlled locally, without modifying Central Sofia.
-- Existing active owners, administrators and operators receive the explicit local
-- capability. Other roles remain denied until an RRD owner enables it in the UI.
INSERT INTO "user_permissions" ("user_id", "permission_key")
SELECT "id", 'sofia.use'
FROM "users"
WHERE "is_active" = true
  AND "role" IN ('OWNER', 'ADMIN', 'OPERATOR')
ON CONFLICT ("user_id", "permission_key") DO NOTHING;
