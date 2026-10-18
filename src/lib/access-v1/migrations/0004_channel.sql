CREATE TABLE access_channel_proposals(
 proposal_ref uuid PRIMARY KEY, code_digest text NOT NULL UNIQUE, phone_digest text NOT NULL,
 chat_digest text NOT NULL,binding jsonb NOT NULL,operation text NOT NULL,payload jsonb NOT NULL,
 expires_at timestamptz NOT NULL,used_at timestamptz
);
