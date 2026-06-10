import { AI_PROVIDER_IDS } from "@folionote/constants"
import { describe, expect, it } from "vite-plus/test"

import { AI_PROVIDERS, PROVIDER_CONFIGS } from "../src/providers/types"

describe("Provider ID consistency", () => {
  it("AI_PROVIDERS should match AI_PROVIDER_IDS from constants", () => {
    expect(AI_PROVIDERS).toEqual(AI_PROVIDER_IDS)
  })

  it("PROVIDER_CONFIGS should have an entry for each provider", () => {
    for (const providerId of AI_PROVIDER_IDS) {
      expect(PROVIDER_CONFIGS[providerId]).toBeDefined()
      expect(PROVIDER_CONFIGS[providerId].id).toBe(providerId)
    }
  })

  it("PROVIDER_CONFIGS should not have extra entries", () => {
    const configKeys = Object.keys(PROVIDER_CONFIGS)
    expect(configKeys.toSorted()).toEqual([...AI_PROVIDER_IDS].toSorted())
  })

  it("each provider config should have required fields", () => {
    for (const providerId of AI_PROVIDER_IDS) {
      const config = PROVIDER_CONFIGS[providerId]
      expect(config.name).toBeTruthy()
      expect(config.defaultBaseUrl).toBeTruthy()
      expect(config.capabilities).toBeInstanceOf(Array)
      expect(config.capabilities.length).toBeGreaterThan(0)
      expect(config.aiSdk.createInstance).toBeDefined()
    }
  })
})
