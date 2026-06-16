/**
 * Mastra Memory for the knowledge chat, backed by the existing chat store.
 *
 * `Memory` requires a full `MastraCompositeStore`, so we compose one that routes
 * the `memory` domain to our custom `ChatSessionMemoryStore` (PostgreSQL +
 * Redis, via `ai-chat-store`) while every other domain falls back to an
 * in-memory store. Only conversation persistence touches the database; the
 * unused domains never persist anything.
 *
 * Semantic recall and working memory are disabled: history recall alone matches
 * the previous behavior and avoids needing a separate vector store / embedder.
 */

import { InMemoryStore, MastraCompositeStore } from "@mastra/core/storage"
import { Memory } from "@mastra/memory"

import { ChatSessionMemoryStore } from "./storage/chat-session-memory-store"

/** Upper bound on prior messages recalled into the prompt per turn. */
const MAX_RECALLED_MESSAGES = 100

const storage = new MastraCompositeStore({
  id: "folionote-chat-storage",
  default: new InMemoryStore({ id: "folionote-chat-defaults" }),
  domains: {
    memory: new ChatSessionMemoryStore()
  }
})

export const chatMemory = new Memory({
  storage,
  options: {
    lastMessages: MAX_RECALLED_MESSAGES,
    semanticRecall: false,
    workingMemory: { enabled: false }
  }
})
