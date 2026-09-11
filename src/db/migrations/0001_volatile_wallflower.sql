CREATE TABLE "financeiro_lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"descricao" text NOT NULL,
	"data" timestamp NOT NULL,
	"categoria" text,
	"status" text DEFAULT 'EFETIVADO' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"categoria" text NOT NULL,
	"quantidade" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"unidade" text NOT NULL,
	"nivel_critico" numeric(10, 2) DEFAULT '5.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'DESENTUPIMENTO' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"base_price" numeric(10, 2) DEFAULT '0.00',
	"price_notes" text DEFAULT '' NOT NULL,
	"warranty_days" integer DEFAULT 30 NOT NULL,
	"default_duration_minutes" integer DEFAULT 90 NOT NULL,
	"requires_inspection" boolean DEFAULT false NOT NULL,
	"is_emergency_eligible" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sofia_response_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"initial_lookup_fields" text DEFAULT '' NOT NULL,
	"initial_context" text DEFAULT '' NOT NULL,
	"response_prompt" text DEFAULT '' NOT NULL,
	"allowed_data" text DEFAULT '' NOT NULL,
	"blocked_data" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sofia_response_profiles_audience_unique" UNIQUE("audience")
);
--> statement-breakpoint
CREATE INDEX "service_catalog_status_idx" ON "service_catalog" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_catalog_category_idx" ON "service_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "sofia_response_profiles_audience_idx" ON "sofia_response_profiles" USING btree ("audience");