CREATE TABLE access_knowledge_shares (
 source_ref text NOT NULL,
 source_version bigint NOT NULL CHECK (source_version > 0),
 hub_id uuid NOT NULL,
 active boolean NOT NULL,
 revision bigint NOT NULL CHECK (revision > 0),
 PRIMARY KEY (source_ref, source_version, hub_id)
);
