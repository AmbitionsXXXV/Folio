-- 添加版本字段用于乐观锁并发控制
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "version" text NOT NULL DEFAULT '1';

