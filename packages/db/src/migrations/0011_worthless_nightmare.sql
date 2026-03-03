CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "entry_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"embedding_model" text,
	"content_hash" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "embedding_status" text;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "entry_chunks" ADD CONSTRAINT "entry_chunks_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_chunks" ADD CONSTRAINT "entry_chunks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entry_chunks_entry_id_idx" ON "entry_chunks" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entry_chunks_user_id_idx" ON "entry_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entry_chunks_embedding_cosine_idx" ON "entry_chunks" USING hnsw ("embedding" vector_cosine_ops);