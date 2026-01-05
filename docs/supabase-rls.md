# Supabase RLS 与 PostgREST 暴露策略

本项目使用 Supabase 托管 PostgreSQL，但认证层使用 Better Auth（而非 Supabase Auth）。

由于 `public` schema 会暴露给 PostgREST，如果表开启了对 `anon / authenticated` 的权限但没有启用 RLS，会导致外部可直接读写表数据。

## 当前线上修复状态

已对 `public` schema 下的以下表启用 RLS（Row Level Security）：

- `account`
- `attachments`
- `daily_logs`
- `entries`
- `entry_review_state`
- `entry_sources`
- `entry_tags`
- `review_events`
- `session`
- `sources`
- `tags`
- `user`
- `verification`

同时，这些表**尚未创建任何 RLS policy**，因此对 PostgREST 来说默认是 **deny all**（除非使用具备 `BYPASSRLS` 的服务端角色）。

## 如果未来需要开放 PostgREST

如果你计划让客户端直接通过 Supabase PostgREST 访问上述表，需要为每张表补齐对应的 RLS policy（例如：按 `user_id` 做行级隔离），并确保 JWT claim 与业务侧用户身份映射一致。

相关文档：

- [Supabase Database Linter - RLS Disabled in Public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
- [Supabase Database Linter - RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
