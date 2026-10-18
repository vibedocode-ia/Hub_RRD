-- Stage 6 role catalog: local to this database/Hub, never a global grant.
CREATE TABLE access_roles (
 role_ref uuid PRIMARY KEY, hub_id uuid NOT NULL, name text NOT NULL,
 description text NOT NULL, capabilities jsonb NOT NULL, revision bigint NOT NULL CHECK(revision>0),
 active boolean NOT NULL DEFAULT true,
 CHECK(jsonb_typeof(capabilities)='array'), CHECK(length(name) BETWEEN 1 AND 100)
);
CREATE INDEX access_roles_hub ON access_roles(hub_id,active);
