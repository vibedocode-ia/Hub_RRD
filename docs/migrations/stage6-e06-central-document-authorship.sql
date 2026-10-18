-- PREPARED ONLY. Apply solely to disposable PostgreSQL until E06 accepted.
-- No deletion/backfill of identities; existing drafts retain explicit legacy authorship.
BEGIN;
ALTER TABLE sofia_drafts ADD COLUMN author_kind text NOT NULL DEFAULT 'legacy';
ALTER TABLE sofia_drafts ADD COLUMN central_grant_id uuid;
ALTER TABLE sofia_drafts ALTER COLUMN central_contact_id DROP NOT NULL;
ALTER TABLE sofia_drafts ALTER COLUMN central_client_id DROP NOT NULL;
ALTER TABLE sofia_drafts ADD CONSTRAINT sofia_drafts_author_check CHECK (
 (author_kind = 'legacy' AND central_grant_id IS NULL AND central_contact_id IS NOT NULL AND central_client_id IS NOT NULL)
 OR (author_kind = 'central_sovereign' AND central_grant_id IS NOT NULL AND central_role = 'god_admin' AND central_contact_id IS NULL AND central_client_id IS NULL)
);
-- Existing nullable user FKs remain real FKs; no fake users and no rewriting issued snapshots.
ALTER TABLE official_documents ADD COLUMN external_author jsonb;
ALTER TABLE proposals ADD COLUMN external_author jsonb;
ALTER TABLE lead_proposals ADD COLUMN external_author jsonb;
COMMIT;
