-- 添加全文搜索 GIN 索引
-- 此迁移为 entries 表添加 PostgreSQL 全文搜索优化

-- 添加生成的 tsvector 列（存储预计算的搜索向量）
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content_text", ''))
  ) STORED;

--> statement-breakpoint

-- GIN 索引用于加速全文搜索查询
CREATE INDEX IF NOT EXISTS "entries_search_vector_idx"
  ON "entries" USING GIN ("search_vector");

--> statement-breakpoint

-- 分页优化索引：用于搜索结果按 updated_at 排序时的性能优化
CREATE INDEX IF NOT EXISTS "entries_user_id_updated_at_not_deleted_idx"
  ON "entries" ("user_id", "updated_at" DESC)
  WHERE "deleted_at" IS NULL;
