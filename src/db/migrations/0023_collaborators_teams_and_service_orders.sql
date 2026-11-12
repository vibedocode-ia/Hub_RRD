-- 1. Tabela de Colaboradores (Profissionais da RRD)
CREATE TABLE IF NOT EXISTS "collaborators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL,
  "phone" text,
  "document" text,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collaborators_is_active_idx" ON "collaborators" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "collaborators_user_id_idx" ON "collaborators" USING btree ("user_id");

-- 2. Atualizacao de Equipes (Preset dinamico com lider e veiculo padrao)
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "leader_id" uuid REFERENCES "collaborators"("id") ON DELETE SET NULL;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "default_vehicle_id" uuid REFERENCES "vehicles"("id") ON DELETE SET NULL;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "member_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS "teams_leader_id_idx" ON "teams" USING btree ("leader_id");
CREATE INDEX IF NOT EXISTS "teams_default_vehicle_id_idx" ON "teams" USING btree ("default_vehicle_id");

-- 3. Atualizacao de Chamados / Ordens de Servico (Colaboradores designados)
ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "assigned_collaborator_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4. Tabela de Materiais / Insumos Consumidos na OS
CREATE TABLE IF NOT EXISTS "service_request_materials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
  "insumo_id" uuid REFERENCES "insumos"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "quantity" numeric(10, 2) NOT NULL DEFAULT '1.00',
  "unit" text NOT NULL DEFAULT 'Unidade',
  "unit_cost" numeric(10, 2) NOT NULL DEFAULT '0.00',
  "total_cost" numeric(10, 2) NOT NULL DEFAULT '0.00',
  "stock_deducted" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sr_materials_sr_id_idx" ON "service_request_materials" USING btree ("service_request_id");
CREATE INDEX IF NOT EXISTS "sr_materials_insumo_id_idx" ON "service_request_materials" USING btree ("insumo_id");

-- 5. Tabela de Despesas Operacionais da OS (Combustivel, Pedagio, Vazadouro, etc.)
CREATE TABLE IF NOT EXISTS "service_request_expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_request_id" uuid NOT NULL REFERENCES "service_requests"("id") ON DELETE CASCADE,
  "category" text NOT NULL DEFAULT 'OUTRO',
  "description" text NOT NULL,
  "amount" numeric(10, 2) NOT NULL DEFAULT '0.00',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sr_expenses_sr_id_idx" ON "service_request_expenses" USING btree ("service_request_id");
