-- 修复 Drizzle 迁移状态脚本
-- 当你遇到 "relation already exists" 错误时运行此脚本
-- 
-- 使用方法：
-- 1. 连接到你的 PostgreSQL 数据库
-- 2. 运行此脚本
-- 3. 再次运行 pnpm db:migrate

-- 步骤 1：检查当前迁移状态
-- 注意：Drizzle 使用 drizzle schema
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;

-- 如果上面的查询返回空结果，运行以下 SQL：

-- 步骤 2：插入已执行的迁移记录
-- 注意：只插入你的数据库中已经存在表的迁移
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
    ('0000_eminent_johnny_storm', EXTRACT(EPOCH FROM NOW()) * 1000),
    ('0001_crazy_deathstrike', EXTRACT(EPOCH FROM NOW()) * 1000),
    ('0002_slow_sleepwalker', EXTRACT(EPOCH FROM NOW()) * 1000),
    ('0003_dear_beast', EXTRACT(EPOCH FROM NOW()) * 1000);

-- 验证插入结果
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
