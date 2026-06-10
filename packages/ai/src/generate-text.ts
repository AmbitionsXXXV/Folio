/**
 * Generate text helpers (server-side)
 *
 * This module keeps AI execution logic inside `@folionote/ai`, so `@folionote/api`
 * can stay as a thin gateway.
 */

import { generateText } from "ai"

import type { DecryptedCredential } from "./credentials/types"
import type { AiProvider } from "./providers/types"
import { createVercelAiChatModel } from "./vercel-ai"

export interface GenerateTextInput {
  prompt: string
  /**
   * Optional model override.
   * If omitted, falls back to BYOK credential/model defaults.
   */
  model?: string
}

export interface GenerateTextOutput {
  provider: AiProvider
  modelId: string
  text: string
  usage?: unknown
  finishReason?: unknown
}

/**
 * Generate text using a decrypted BYOK credential.
 *
 * This is intended for server-side execution only.
 */
export async function generateTextWithCredential(
  credential: DecryptedCredential,
  input: GenerateTextInput
): Promise<GenerateTextOutput> {
  const model = createVercelAiChatModel(credential, { model: input.model })
  const result = await generateText({
    model,
    prompt: input.prompt
  })

  return {
    provider: credential.provider,
    modelId: model.modelId,
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason
  }
}
