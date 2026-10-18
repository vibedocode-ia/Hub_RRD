-- Durable prerequisites: no network side effect is needed to commit a command.
CREATE TABLE access_delivery_context(message_id uuid PRIMARY KEY REFERENCES access_outbox(message_id),proof jsonb NOT NULL,decision jsonb NOT NULL);
CREATE TABLE access_provision_intents(intent_ref uuid PRIMARY KEY,actor_ref uuid NOT NULL,request jsonb NOT NULL,proof jsonb NOT NULL,authorization_ref text NOT NULL,status text NOT NULL DEFAULT 'pending',result jsonb,last_error text);
CREATE TABLE access_conflicts(conflict_ref text PRIMARY KEY,target_ref text NOT NULL,message_id uuid NOT NULL,expected jsonb NOT NULL,observed jsonb,desired jsonb NOT NULL,status text NOT NULL,resolution_message_id uuid);
