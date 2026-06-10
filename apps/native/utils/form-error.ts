import { z } from "zod"
import type { ZodError } from "zod"

// 声明 Expo/React Native 的全局 __DEV__ 变量
declare const __DEV__: boolean

/**
 * Zod 表单错误处理工具
 *
 * 提供三种错误格式化方式：
 * - flattenError: 适合表单字段错误展示
 * - treeifyError: 适合嵌套表单/JSON 编辑器
 * - prettifyError: 适合日志/CLI 输出
 */

/**
 * 扁平化的表单错误类型
 * key 为字段名，value 为错误消息数组
 */
export type FlatFieldErrors = Record<string, string[]>

/**
 * 扁平化错误结构，适合表单字段展示
 */
export interface FlattenedError {
  /** 字段级别的错误 */
  fieldErrors: FlatFieldErrors
  /** 表单级别的错误（非字段特定） */
  formErrors: string[]
}

/**
 * 将 ZodError 转换为扁平化的表单错误结构
 * 适用于：登录/注册表单、React Hook Form、每个字段下显示一行错误文案
 *
 * @example
 * ```ts
 * const result = schema.safeParse(data)
 * if (!result.success) {
 *   const errors = flattenFormErrors(result.error)
 *   // errors.fieldErrors.email -> ["Invalid email"]
 *   // errors.fieldErrors.password -> ["Too short"]
 * }
 * ```
 */
export function flattenFormErrors(error: ZodError): FlattenedError {
  const flattened = z.flattenError(error)
  return {
    formErrors: flattened.formErrors,
    fieldErrors: flattened.fieldErrors as FlatFieldErrors
  }
}

/**
 * 获取指定字段的第一个错误消息
 * 适用于：表单字段下方显示单条错误
 *
 * @example
 * ```ts
 * const emailError = getFieldError(errors, 'email')
 * // emailError -> "Invalid email" | undefined
 * ```
 */
export function getFieldError(
  errors: FlattenedError,
  field: string
): string | undefined {
  return errors.fieldErrors[field]?.[0]
}

/**
 * 获取指定字段的所有错误消息
 * 适用于：需要显示多条错误的场景
 */
export function getFieldErrors(
  errors: FlattenedError,
  field: string
): string[] {
  return errors.fieldErrors[field] ?? []
}

/**
 * 检查是否有任何字段错误
 */
export function hasFieldErrors(errors: FlattenedError): boolean {
  return (
    Object.keys(errors.fieldErrors).length > 0 || errors.formErrors.length > 0
  )
}

/**
 * 将 ZodError 转换为树形结构
 * 适用于：嵌套表单、JSON 编辑器、配置文件校验
 *
 * @example
 * ```ts
 * const tree = treeifyFormErrors(error)
 * // tree.properties?.user?.properties?.profile?.errors
 * ```
 */
export function treeifyFormErrors(error: ZodError) {
  return z.treeifyError(error)
}

/**
 * 将 ZodError 转换为人类可读的字符串
 * 适用于：日志输出、CLI、开发调试
 *
 * @example
 * ```ts
 * console.error(prettifyFormErrors(error))
 * // 输出:
 * // user.profile.age
 * //   Expected number, received negative
 * ```
 */
export function prettifyFormErrors(error: ZodError): string {
  return z.prettifyError(error)
}

/**
 * 在开发环境下打印格式化的错误日志
 * 生产环境下不输出
 */
export function logFormErrors(error: ZodError, context?: string): void {
  if (__DEV__) {
    const prefix = context ? `[${context}] ` : ""
    console.warn(`${prefix}Form validation failed:`)
    console.warn(prettifyFormErrors(error))
  }
}
