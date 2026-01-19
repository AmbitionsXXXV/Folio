CREATE TABLE "ai_chat_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"messages_json" text DEFAULT '[]' NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_preview" text DEFAULT '' NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_chat_sessions" ADD CONSTRAINT "ai_chat_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_user_last_opened_idx" ON "ai_chat_sessions" USING btree ("user_id","last_opened_at");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_user_updated_idx" ON "ai_chat_sessions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_user_id_idx" ON "ai_chat_sessions" USING btree ("user_id");