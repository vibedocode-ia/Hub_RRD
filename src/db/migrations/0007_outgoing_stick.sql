CREATE TABLE "document_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "doc_type" text NOT NULL,
  "version" text NOT NULL,
  "description" text,
  "field_schema" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_pdf_base64" text NOT NULL,
  "source_filename" text NOT NULL,
  "source_mime" text DEFAULT 'application/pdf' NOT NULL,
  "source_sha256" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_id" uuid,
  "archived_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "document_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "document_templates_slug_version_unique" ON "document_templates" USING btree ("slug", "version");
--> statement-breakpoint
CREATE INDEX "document_templates_doc_type_active_idx" ON "document_templates" USING btree ("doc_type", "is_active");
