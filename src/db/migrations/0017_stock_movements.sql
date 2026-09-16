CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "insumo_id" uuid NOT NULL REFERENCES "insumos"("id") ON DELETE RESTRICT,
  "direction" text NOT NULL,
  "quantity" numeric(10, 2) NOT NULL,
  "reason" text,
  "source" text NOT NULL DEFAULT 'MANUAL',
  "created_by_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "stock_movements_direction_check" CHECK ("direction" IN ('ENTRADA', 'SAIDA')),
  CONSTRAINT "stock_movements_positive_quantity_check" CHECK ("quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_insumo_created_idx" ON "stock_movements" USING btree ("insumo_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_created_idx" ON "stock_movements" USING btree ("created_at");
