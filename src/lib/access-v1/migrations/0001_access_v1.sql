-- Opt-in isolated v1 schema. Never run by the legacy migrator or at request startup.
CREATE TABLE IF NOT EXISTS access_accounts (
 user_id uuid PRIMARY KEY REFERENCES users(id), hub_id uuid NOT NULL,
 target_ref text NOT NULL UNIQUE, username text NOT NULL UNIQUE CHECK (username ~ '^[a-z][a-z0-9._-]{2,63}$'),
 email text NOT NULL UNIQUE, phone text NOT NULL UNIQUE,
 status text NOT NULL CHECK(status IN ('onboarding','ready','disabled')),
 email_evidence_ref text, phone_evidence_ref text,
 credential_version integer NOT NULL DEFAULT 0, session_version integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS access_memberships(target_ref text PRIMARY KEY REFERENCES access_accounts(target_ref),state jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS access_sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),
 credential_version integer NOT NULL,session_version integer NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 last_activity_at timestamptz NOT NULL DEFAULT now(),absolute_expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours');
CREATE INDEX IF NOT EXISTS access_sessions_user ON access_sessions(user_id);
CREATE TABLE IF NOT EXISTS access_grants(grant_ref uuid PRIMARY KEY,identity_ref uuid NOT NULL,status text NOT NULL,revision bigint NOT NULL,protected_principal boolean NOT NULL DEFAULT false);
CREATE UNIQUE INDEX IF NOT EXISTS access_active_grant ON access_grants(identity_ref) WHERE status='active';
CREATE TABLE IF NOT EXISTS access_authorizations(authorization_ref text PRIMARY KEY,body jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS access_proofs(proof_id uuid PRIMARY KEY,body jsonb NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS access_request_nonces(peer text NOT NULL,request_id uuid NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(peer,request_id));
CREATE TABLE IF NOT EXISTS access_inbox(message_id uuid PRIMARY KEY,hub_id uuid NOT NULL,issuer text NOT NULL,digest text NOT NULL,command_id uuid UNIQUE,result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS access_outbox(message_id uuid PRIMARY KEY,target_ref text NOT NULL,body jsonb NOT NULL,status text NOT NULL DEFAULT 'pending',attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS access_outbox_pending ON access_outbox(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS access_desired(target_ref text PRIMARY KEY,hub_id uuid NOT NULL,desired jsonb,applied jsonb,status text NOT NULL,last_message_id uuid,last_ack jsonb);
CREATE TABLE IF NOT EXISTS access_audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_ref uuid,action text NOT NULL,target_ref text,version jsonb,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS access_http_idempotency(actor_ref uuid NOT NULL,operation text NOT NULL,key text NOT NULL,digest text NOT NULL,response jsonb NOT NULL,PRIMARY KEY(actor_ref,operation,key));
CREATE TABLE IF NOT EXISTS access_setups(user_id uuid PRIMARY KEY REFERENCES users(id),setup_digest text NOT NULL,email_digest text NOT NULL,phone_digest text NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz);
