ALTER TABLE access_persons ADD COLUMN identity_revision bigint NOT NULL DEFAULT 1 CHECK(identity_revision>0);
ALTER TABLE access_person_links ADD COLUMN link_revision bigint NOT NULL DEFAULT 0 CHECK(link_revision>=0);
ALTER TABLE access_person_links ADD COLUMN applied_revision bigint NOT NULL DEFAULT 0 CHECK(applied_revision>=0);
ALTER TABLE access_person_links ADD COLUMN evidence_ref text;
ALTER TABLE access_person_links ADD COLUMN desired_status text CHECK(desired_status IN ('active','revoked'));
ALTER TABLE access_person_links ADD COLUMN last_message_id uuid;
ALTER TABLE access_local_identity_proofs ADD COLUMN link_revision bigint NOT NULL DEFAULT 0 CHECK(link_revision>=0);
ALTER TABLE access_local_identity_proofs ADD COLUMN identity_revision bigint NOT NULL DEFAULT 0 CHECK(identity_revision>=0);
ALTER TABLE access_local_identity_proofs ADD COLUMN evidence_ref text;
ALTER TABLE access_local_identity_proofs ADD COLUMN proof_delivered boolean NOT NULL DEFAULT false;
CREATE TABLE access_identity_decisions (
 decision_ref text PRIMARY KEY,
 proposal_ref uuid NOT NULL,
 person_ref uuid NOT NULL,
 hub_id uuid NOT NULL,
 local_user_ref uuid NOT NULL,
 target_ref text NOT NULL,
 status text NOT NULL CHECK(status IN ('active','revoked')),
 identity_revision bigint NOT NULL CHECK(identity_revision>0),
 link_revision bigint NOT NULL CHECK(link_revision>0),
 evidence_ref text NOT NULL,
 message_id uuid NOT NULL UNIQUE,
 UNIQUE(proposal_ref,link_revision)
);
