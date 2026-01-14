CREATE TABLE "user_ai_model_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_ai_model_settings" ADD CONSTRAINT "user_ai_model_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_ai_model_settings_unique_idx" ON "user_ai_model_settings" USING btree ("user_id","provider_id","model_id","type");--> statement-breakpoint
CREATE INDEX "user_ai_model_settings_user_id_idx" ON "user_ai_model_settings" USING btree ("user_id");