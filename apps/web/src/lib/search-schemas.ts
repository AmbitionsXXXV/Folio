/**
 * TanStack Router Search Params Schemas
 *
 * 使用 Zod schema 定义 URL 搜索参数，提供类型安全和验证。
 * 配合 TanStack Router 的 validateSearch 选项使用。
 *
 * @example
 * ```tsx
 * import { z } from 'zod'
 * import { paginationSchema } from '@/lib/search-schemas'
 *
 * const myPageSchema = paginationSchema.extend({
 *   filter: z.enum(['all', 'active']).catch('all'),
 * })
 *
 * export const Route = createFileRoute('/my-page')({
 *   validateSearch: myPageSchema,
 * })
 * ```
 *
 * @see https://tanstack.com/router/latest/docs/framework/react/guide/search-params
 */

import { z } from "zod"

/**
 * 分页参数 schema
 * - page: 页码，默认 1
 * - limit: 每页数量，默认 20，最大 100
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().catch(1),
  limit: z.number().int().min(1).max(100).catch(20)
})

export type PaginationParams = z.infer<typeof paginationSchema>

/**
 * 游标分页参数 schema
 * - cursor: 分页游标（可选）
 * - limit: 每页数量，默认 20
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).catch(20)
})

export type CursorPaginationParams = z.infer<typeof cursorPaginationSchema>

/**
 * 搜索查询参数 schema
 * - q: 搜索关键词
 */
export const searchQuerySchema = z.object({
  q: z.string().catch("")
})

export type SearchQueryParams = z.infer<typeof searchQuerySchema>

/**
 * 排序参数 schema
 * - sortBy: 排序字段
 * - sortOrder: 排序方向
 */
export const sortingSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).catch("desc")
})

export type SortingParams = z.infer<typeof sortingSchema>

/**
 * 日期范围参数 schema
 * - from: 开始日期（ISO 格式）
 * - to: 结束日期（ISO 格式）
 */
export const dateRangeSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional()
})

export type DateRangeParams = z.infer<typeof dateRangeSchema>
