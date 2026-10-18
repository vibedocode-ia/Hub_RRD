CREATE TABLE access_persons (
 person_ref uuid PRIMARY KEY,
 owner_user_ref uuid NOT NULL UNIQUE REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE access_person_links (
 proposal_ref uuid PRIMARY KEY,
 person_ref uuid NOT NULL REFERENCES access_persons(person_ref),
 hub_id uuid NOT NULL,
 local_user_ref uuid,
 target_ref text,
 status text NOT NULL CHECK (status IN ('pending','proved','active','revoked')),
 expires_at timestamptz NOT NULL,
 UNIQUE(hub_id,local_user_ref)
);
CREATE TABLE access_local_identity_proofs (
 proposal_ref uuid PRIMARY KEY,
 local_user_ref uuid NOT NULL REFERENCES users(id),
 target_ref text NOT NULL REFERENCES access_accounts(target_ref),
 person_ref uuid,
 status text NOT NULL CHECK(status IN ('proved','active','revoked'))
);
