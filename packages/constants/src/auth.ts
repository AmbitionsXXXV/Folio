/**
 * Auth-related constants and type definitions
 * These are shared across web and native platforms
 */

/**
 * User additional fields schema configuration
 * Used for both server-side auth config and client-side inferAdditionalFields
 *
 * @description
 * This configuration defines custom user fields beyond the standard better-auth user schema.
 * It should be used consistently across:
 * - Server auth config (packages/auth/src/index.ts)
 * - Web auth client (apps/web/src/lib/auth-client.ts)
 * - Native auth client (apps/native/lib/auth-client.ts)
 */
export const USER_ADDITIONAL_FIELDS_SCHEMA = {
  /** 用户编号，自动递增，用于展示 */
  no: {
    type: "number" as const,
    required: false as const
  }
} as const

/**
 * Type definition for user additional fields
 */
export interface UserAdditionalFields {
  /** 用户编号，自动递增，用于展示 */
  no: number | null
}
