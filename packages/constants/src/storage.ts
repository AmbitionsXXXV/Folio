import { z } from "zod"

export const StorageKey = {
  HAS_SEEN_ONBOARDING: "folio_has_seen_onboarding",
  LOCAL_MODE: "folio_local_mode",
  LOCAL_USER_ID: "folio_local_user_id"
} as const

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey]

export const StorageKeySchema = z.enum([
  StorageKey.HAS_SEEN_ONBOARDING,
  StorageKey.LOCAL_MODE,
  StorageKey.LOCAL_USER_ID
])

export type StorageKeyType = z.infer<typeof StorageKeySchema>
