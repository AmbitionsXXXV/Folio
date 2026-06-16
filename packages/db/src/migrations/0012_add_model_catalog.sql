CREATE TABLE "ai_catalog_sync" (
	"id" text PRIMARY KEY NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_source" text,
	"last_error" text,
	"model_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_models" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"type" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"abilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"context_window_tokens" integer,
	"max_output_tokens" integer,
	"pricing" jsonb,
	"settings" jsonb,
	"released_at" text,
	"knowledge_cutoff" text,
	"legacy" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"doc_url" text,
	"source" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_models_provider_idx" ON "ai_models" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "ai_models_provider_type_idx" ON "ai_models" USING btree ("provider_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_models_provider_model_type_unique" ON "ai_models" USING btree ("provider_id","model_id","type");--> statement-breakpoint
CREATE INDEX "ai_providers_sort_idx" ON "ai_providers" USING btree ("sort");