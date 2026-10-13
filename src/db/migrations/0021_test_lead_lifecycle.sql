-- Test-data lifecycle: marca leads criados por uma execução de teste.
-- Estritamente aditivo: apenas uma coluna anulável e um índice são adicionados.
ALTER TABLE "leads" ADD COLUMN "test_run_id" uuid NULL;
--> statement-breakpoint
CREATE INDEX "leads_test_run_id_idx" ON "leads" USING btree ("test_run_id");
